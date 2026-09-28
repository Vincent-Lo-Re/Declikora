// Fichiers des tests de parcours : fabrication (PNG, MP3…), lecture dans la base, nettoyage.

import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"
import { crc32, deflateSync } from "node:zlib"

import { localSupabase } from "./local-supabase.ts"

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/**
 * Une « photo » PNG : un dégradé avec un peu de bruit, comme une vraie photo (le bruit empêche
 * une compression trop facile). Plusieurs Mo pour 2 600 × 1 800.
 */
export function photoPng(width: number, height: number): Buffer {
  const rows: Buffer[] = []
  let seed = 42
  const noise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return (seed % 17) - 8
  }
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3)
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 3
      row[offset] = Math.max(0, Math.min(255, (x * 255) / width + noise()))
      row[offset + 1] = Math.max(0, Math.min(255, (y * 255) / height + noise()))
      row[offset + 2] = Math.max(0, Math.min(255, 128 + noise()))
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // 8 bits par couleur
  header[9] = 2 // RVB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

/** Un « MP3 » de la taille voulue (étiquette ID3 puis du silence) : pour l'envoi reprenable. */
export function fakeMp3(bytes: number): Buffer {
  const file = Buffer.alloc(bytes)
  file.write("ID3", 0, "ascii")
  file[3] = 4
  return file
}

/**
 * Un vrai MP3 de silence, que le navigateur sait lire (sa durée apparaît dans l'admin) : des
 * trames MPEG-1 couche III, mono, 48 kHz, 32 kb/s, de 96 octets chacune (1 152 échantillons,
 * soit 24 ms). Débit constant : le navigateur en déduit la durée sans ambiguïté.
 */
export function silentMp3(seconds: number): Buffer {
  const frameBytes = 96
  const frames = Math.ceil((seconds * 48_000) / 1152)
  const frame = Buffer.alloc(frameBytes)
  // Synchronisation, MPEG-1 couche III sans CRC ; 32 kb/s, 48 kHz ; mono.
  frame.set([0xff, 0xfb, 0x14, 0xc0], 0)
  return Buffer.concat(Array.from({ length: frames }, () => frame))
}

/** Une animation Lottie minimale, valide. */
export function lottieJson(): Buffer {
  return Buffer.from(
    JSON.stringify({
      v: "5.7.4",
      fr: 30,
      ip: 0,
      op: 30,
      w: 120,
      h: 80,
      layers: [
        {
          ty: 1,
          ind: 1,
          ip: 0,
          op: 30,
          st: 0,
          sc: "#ff6600",
          sw: 120,
          sh: 80,
          ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [60, 40, 0] },
            a: { a: 0, k: [60, 40, 0] },
            s: { a: 0, k: [100, 100, 100] },
          },
        },
      ],
    })
  )
}

function database() {
  return postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
}

export type MediaRow = {
  id: string
  name: string
  path: string
  mime: string
  size_bytes: number
  width: number | null
  height: number | null
  status: string
  reject_reason: string | null
  alt: string | null
  cache_control: string | null
}

/** La ligne d'un fichier (par son nom d'origine), avec le cache enregistré par Storage. */
export async function readMedia(name: string): Promise<MediaRow | null> {
  const sql = database()
  try {
    const [row] = await sql<MediaRow[]>`
      select m.id, m.name, m.path, m.mime, m.size_bytes::int as size_bytes, m.width, m.height,
        m.status, m.reject_reason, m.alt, o.metadata ->> 'cacheControl' as cache_control
      from public.media m
      left join storage.objects o
        on o.name = m.path and o.bucket_id in ('files-protected', 'files-public')
      where m.name = ${name}
      order by m.created_at desc
      limit 1`
    return row ?? null
  } finally {
    await sql.end()
  }
}

function secretClient() {
  const { apiUrl, secretKey } = localSupabase()
  return createClient(apiUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Les buckets où Storage a un objet à ce chemin (vide : l'objet n'existe plus). */
export async function storedIn(path: string): Promise<string[]> {
  const sql = database()
  try {
    const rows = await sql<{ bucket_id: string }[]>`
      select bucket_id from storage.objects
      where name = ${path} and bucket_id in ('files-protected', 'files-public')
      order by bucket_id`
    return rows.map((row) => row.bucket_id)
  } finally {
    await sql.end()
  }
}

/** Le contenu d'un objet, lu par l'API de Storage (null s'il n'existe pas). */
export async function downloadObject(
  bucket: string,
  path: string
): Promise<Buffer | null> {
  const { data, error } = await secretClient()
    .storage.from(bucket)
    .download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/** Dimensions d'une image WebP (VP8, VP8L ou VP8X), lues dans son en-tête. */
export function webpSize(file: Buffer): { width: number; height: number } {
  if (
    file.toString("ascii", 0, 4) !== "RIFF" ||
    file.toString("ascii", 8, 12) !== "WEBP"
  ) {
    throw new Error("Ce n'est pas une image WebP")
  }
  const format = file.toString("ascii", 12, 16)
  if (format === "VP8X") {
    return {
      width: file.readUIntLE(24, 3) + 1,
      height: file.readUIntLE(27, 3) + 1,
    }
  }
  if (format === "VP8L") {
    const bits = file.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (format === "VP8 ") {
    return {
      width: file.readUInt16LE(26) & 0x3fff,
      height: file.readUInt16LE(28) & 0x3fff,
    }
  }
  throw new Error(`Format WebP inconnu : ${format}`)
}

/**
 * Envoie un fichier SANS passer par l'admin (donc sans sa préparation), avec la session d'un
 * membre : media_create, envoi dans Storage, media_confirm. Comme le ferait un outil maison
 * ou une admin modifiée : c'est au serveur de refuser ce qui est dangereux.
 */
export async function sendWithoutAdmin(
  token: string,
  file: { kind: string; name: string; mime: string; bytes: Buffer }
): Promise<{ id: string; path: string; status: string }> {
  const { apiUrl, publishableKey } = localSupabase()
  const client = createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const created = await client.rpc("media_create", {
    kind: file.kind,
    name: file.name,
    mime: file.mime,
    size_bytes: file.bytes.length,
  })
  if (created.error) throw new Error(`media_create : ${created.error.message}`)
  const media = created.data as { id: string; path: string }
  const upload = await client.storage
    .from("files-protected")
    .upload(media.path, new Blob([file.bytes], { type: file.mime }), {
      cacheControl: "60",
      upsert: false,
    })
  if (upload.error) throw new Error(`envoi : ${upload.error.message}`)
  const confirmed = await client.rpc("media_confirm", { media_id: media.id })
  if (confirmed.error) {
    throw new Error(`media_confirm : ${confirmed.error.message}`)
  }
  return confirmed.data as { id: string; path: string; status: string }
}

/** Les tâches planifiées actives (pg_cron). */
export async function activeScheduledJobs(): Promise<string[]> {
  const sql = database()
  try {
    const rows = await sql<{ jobname: string }[]>`
      select jobname from cron.job where active order by jobname`
    return rows.map((row) => row.jobname)
  } finally {
    await sql.end()
  }
}

/**
 * Ce que fait la tâche planifiée « fichiers » chaque minute : private.kick_files() appelle la
 * fonction « files » par pg_net (adresse et clé publishable lues dans private.settings, sans
 * session de membre). Sans attendre la minute suivante.
 */
export async function runScheduledKick(): Promise<void> {
  const sql = database()
  try {
    await sql`select private.kick_files()`
  } finally {
    await sql.end()
  }
}

/**
 * Efface les fichiers envoyés par des comptes de test (objets de Storage puis lignes), avant de
 * supprimer ces comptes.
 */
export async function deleteMediaOf(
  where: { emails: string[] } | { domain: string }
) {
  const sql = database()
  try {
    const rows = await sql<{ id: string; path: string }[]>`
      select m.id, m.path
      from public.media m
      join public.profiles p on p.id = m.created_by
      where ${
        "emails" in where
          ? sql`p.email = any(${where.emails})`
          : sql`p.email like ${`%@${where.domain}`}`
      }`
    if (rows.length === 0) return
    const storage = secretClient().storage
    const paths = rows.map((row) => row.path)
    for (const bucket of ["files-protected", "files-public"]) {
      await storage.from(bucket).remove(paths)
    }
    await sql`delete from public.media where id = any(${rows.map((row) => row.id)})`
  } finally {
    await sql.end()
  }
}

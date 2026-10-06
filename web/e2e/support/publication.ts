// Publication (étape 5) : ce que voit l'app (RPC app_* appelées comme un anonyme, avec la clé
// publishable locale) et accès directs à la base locale pour la tâche planifiée.

import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

import { localSupabase } from "./local-supabase.ts"

function database() {
  return postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
}

/** Appelle une RPC comme l'app, sans session (anon). */
async function appRpc<T>(name: string, body: object): Promise<T> {
  const { apiUrl, publishableKey } = localSupabase()
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${name} : ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as T
}

/** Ce que l'app reçoit d'un contenu en ligne (null s'il ne l'est pas). */
type AppContent = {
  id: string
  versionId: string
  kind: string
  title: string
  slug: string | null
  cover: { mediaId: string } | null
  level: { id: string; name: string; rank: number } | null
  locked: boolean
  blocks: { type: string; mediaId?: string }[] | null
  audio: unknown
  files: Record<string, { kind: string; path: string; alt: string | null }>
}

/** La page en ligne à cette adresse (null si aucune). */
export function appPage(slug: string): Promise<AppContent | null> {
  return appRpc("app_page", { slug })
}

/** Le contenu en ligne (null s'il ne l'est pas). */
export function appContent(contentId: string): Promise<AppContent | null> {
  return appRpc("app_content", { content_id: contentId })
}

/** Le texte de la page en ligne (tout le JSON), pour y chercher un mot. */
export async function appPageText(slug: string): Promise<string> {
  return JSON.stringify(await appPage(slug))
}

/** Où l'app doit lire ces fichiers, pour ceux qu'un anonyme a le droit de voir. */
export async function appFileLocations(
  mediaIds: string[]
): Promise<Record<string, string>> {
  const rows = await appRpc<{ media_id: string; location: string }[]>(
    "app_file_locations",
    { media_ids: mediaIds }
  )
  return Object.fromEntries(rows.map((row) => [row.media_id, row.location]))
}

/** Lit un fichier du bucket public, comme l'app : le code HTTP. */
export async function publicFileStatus(path: string): Promise<number> {
  const { apiUrl } = localSupabase()
  const response = await fetch(
    `${apiUrl}/storage/v1/object/public/files-public/${path}`
  )
  await response.arrayBuffer()
  return response.status
}

/** Un anonyme demande un lien temporaire vers un fichier protégé : vrai s'il l'obtient. */
export async function anonCanSignProtected(path: string): Promise<boolean> {
  const { apiUrl, publishableKey } = localSupabase()
  const client = createClient(apiUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.storage
    .from("files-protected")
    .createSignedUrl(path, 60)
  return !error && Boolean(data?.signedUrl)
}

/** L'identifiant du contenu ouvert dans l'éditeur (fin de l'adresse). */
export function contentIdFromUrl(url: string): string {
  const match = /\/([0-9a-f-]{36})$/.exec(new URL(url).pathname)
  if (!match) throw new Error(`Pas d'éditeur ouvert : ${url}`)
  return match[1]
}

/** La programmation d'un contenu, lue dans la base. */
export async function readSchedule(contentId: string): Promise<{
  scheduled_at: Date | null
  schedule_error: string | null
  live_version_id: string | null
}> {
  const sql = database()
  try {
    const [row] = await sql<
      {
        scheduled_at: Date | null
        schedule_error: string | null
        live_version_id: string | null
      }[]
    >`
      select scheduled_at, schedule_error, live_version_id
      from public.contents where id = ${contentId}`
    if (!row) throw new Error(`Contenu ${contentId} introuvable`)
    return row
  } finally {
    await sql.end()
  }
}

/**
 * Fait arriver l'heure programmée sans attendre : scheduled_at recule à « il y a tant de
 * minutes ». Le reste de la programmation (auteur, révision, moment où elle a été posée) ne
 * change pas : c'est la vraie tâche qui décide ensuite.
 */
export async function makeScheduleDue(contentId: string, minutesAgo: number) {
  const sql = database()
  try {
    const rows = await sql`
      update public.contents
      set scheduled_at = now() - make_interval(secs => ${minutesAgo * 60 + 1}::double precision)
      where id = ${contentId} and scheduled_at is not null
      returning id`
    if (rows.length !== 1) throw new Error("Aucune programmation à avancer")
  } finally {
    await sql.end()
  }
}

/**
 * Ce que fait la tâche planifiée « publications » chaque minute, sans attendre la minute
 * suivante (la vraie tâche pg_cron peut aussi passer entre-temps : le résultat est le même).
 */
export async function runDuePublications(): Promise<number> {
  const sql = database()
  try {
    const [row] = await sql<{ published: number }[]>`
      select private.run_due_publications() as published`
    return row.published
  } finally {
    await sql.end()
  }
}

/**
 * Pose l'image de présentation du brouillon (l'écran qui la choisit arrive à l'étape 7), comme
 * un enregistrement : nouvelle révision. À faire éditeur fermé.
 */
export async function setDraftCover(contentId: string, mediaId: string) {
  const sql = database()
  try {
    const rows = await sql`
      update public.contents
      set draft = jsonb_set(draft, '{cover}', jsonb_build_object('mediaId', ${mediaId}::text)),
        draft_rev = draft_rev + 1,
        draft_saved_at = now()
      where id = ${contentId}
      returning id`
    if (rows.length !== 1) throw new Error(`Contenu ${contentId} introuvable`)
  } finally {
    await sql.end()
  }
}

/** Vrai si le contenu existe encore dans la base (corbeille comprise). */
export async function contentExists(contentId: string): Promise<boolean> {
  const sql = database()
  try {
    const [row] = await sql<{ found: boolean }[]>`
      select exists (select 1 from public.contents where id = ${contentId}) as found`
    return row.found
  } finally {
    await sql.end()
  }
}

/**
 * Efface les formules d'un test (nom qui finit par « <id> »), et avant elles les contenus
 * qui s'en servent (leurs versions partent avec eux).
 */
export async function deleteAccessLevels(id: string) {
  const sql = database()
  try {
    const pattern = `% ${id}`
    await sql`
      delete from public.contents c
      where c.access_level_id in (select a.id from public.access_levels a where a.name like ${pattern})
        or exists (
          select 1 from public.versions v
          join public.access_levels a on a.id = v.access_level_id
          where v.content_id = c.id and a.name like ${pattern}
        )`
    await sql`delete from public.access_levels where name like ${pattern}`
  } finally {
    await sql.end()
  }
}

// Tests d'intégration de la médiathèque contre le Supabase LOCAL (npm run db:start) :
// vrais envois vers Storage avec un compte d'équipe en aal2, fonction « files » servie par le
// runtime local, et un vrai passage de la tâche planifiée « fichiers »
// (pg_cron → pg_net → fonction files → vérification et déplacement).
//
// Lancement (à la racine) : npm run functions:integration
// Le fichier ne suit pas le motif *.test.ts : `deno test` seul ne le lance pas (il lui faut
// Supabase).

import { assert, assertEquals } from "@std/assert"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import * as OTPAuth from "otpauth"
import postgres from "postgres"

type Local = { apiUrl: string; publishableKey: string; secretKey: string; dbUrl: string }

type MediaRow = {
  id: string
  path: string
  status: string
  reject_reason: string | null
  is_public: boolean
}

// Adresses et clés du Supabase local (supabase status), comme les tests de parcours.
async function readLocal(): Promise<Local> {
  const [command, ...args] = Deno.env.get("CI") ? ["supabase"] : ["npx", "--no", "supabase"]
  const output = await new Deno.Command(command, {
    args: [...args, "status", "-o", "env"],
    cwd: new URL("../../../../", import.meta.url),
    stdout: "piped",
    stderr: "null",
  }).output()
  if (!output.success) throw new Error("Supabase local introuvable : npm run db:start")
  const values: Record<string, string> = {}
  for (const line of new TextDecoder().decode(output.stdout).split("\n")) {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line.trim())
    if (match) values[match[1]] = match[2]
  }
  const local = {
    apiUrl: values.API_URL,
    publishableKey: values.PUBLISHABLE_KEY,
    secretKey: values.SECRET_KEY,
    dbUrl: values.DB_URL,
  }
  for (const url of [local.apiUrl, local.dbUrl]) {
    const { hostname } = new URL(url.replace(/^postgresql:/, "http:"))
    if (hostname !== "127.0.0.1" && hostname !== "localhost") {
      throw new Error(`${hostname} n'est pas local : ces tests ne tournent qu'en local.`)
    }
  }
  return local
}

const local = await readLocal()
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(local.apiUrl, local.secretKey, clientOptions)
const sql = postgres(local.dbUrl, { max: 2, onnotice: () => {} })

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
)
const encoder = new TextEncoder()
const cleanSvg = await Deno.readFile(
  new URL("../fixtures/svg-nettoyes/illustrator.svg", import.meta.url),
)
const trappedSvg = await Deno.readFile(new URL("../fixtures/svg-bruts/piege.svg", import.meta.url))
const lottie = encoder.encode(JSON.stringify({
  v: "5.12.2",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  layers: [{ ty: 4, ip: 0, op: 60, st: 0, ks: {}, shapes: [] }],
}))
const badLottie = encoder.encode(JSON.stringify({ v: "5", fr: 30, ip: 0, op: 60, w: 0, h: 100 }))
const pdf = encoder.encode("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n")
const mp3 = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0, 0xff, 0xfb, 0x90, 0x64])
const m4a = new Uint8Array([
  0,
  0,
  0,
  0x18,
  0x66,
  0x74,
  0x79,
  0x70,
  0x4d,
  0x34,
  0x41,
  0x20,
  0,
  0,
  0,
  0,
])

const email = `fichiers-${crypto.randomUUID().slice(0, 8)}@integration.test`
const password = `${crypto.randomUUID()}Aa1!`
let userId = ""
const created: string[] = []
const contentIds: string[] = []
const levelIds: string[] = []

// Un membre de l'équipe (éditeur) en aal2 : compte créé avec la clé secrète locale (rôle dans
// app_metadata, comme une invitation), connexion, puis double vérification configurée.
async function signInEditor(): Promise<{ member: SupabaseClient; aal1: SupabaseClient }> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "editor" },
  })
  if (error || !data.user) throw error
  userId = data.user.id

  const member = createClient(local.apiUrl, local.publishableKey, clientOptions)
  const signIn = await member.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error
  const enroll = await member.auth.mfa.enroll({ factorType: "totp" })
  if (enroll.error) throw enroll.error
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(enroll.data.totp.secret) })
  const verify = await member.auth.mfa.challengeAndVerify({
    factorId: enroll.data.id,
    code: totp.generate(),
  })
  if (verify.error) throw verify.error

  // Une seconde session, restée en aal1 (double vérification pas encore faite).
  const aal1 = createClient(local.apiUrl, local.publishableKey, clientOptions)
  const second = await aal1.auth.signInWithPassword({ email, password })
  if (second.error) throw second.error
  return { member, aal1 }
}

async function send(
  member: SupabaseClient,
  kind: string,
  name: string,
  mime: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<MediaRow> {
  const { data: row, error } = await member.rpc("media_create", {
    kind,
    name,
    mime,
    size_bytes: bytes.byteLength,
  })
  if (error) throw error
  created.push(row.id)
  // Blob avec le type normalisé : storage-js ignore contentType pour un Blob ou un File.
  const upload = await member.storage.from("files-protected").upload(
    row.path,
    new Blob([bytes], { type: mime }),
    { cacheControl: "60", upsert: false },
  )
  if (upload.error) throw upload.error
  const confirm = await member.rpc("media_confirm", { media_id: row.id })
  if (confirm.error) throw confirm.error
  return confirm.data as MediaRow
}

async function readRow(id: string): Promise<MediaRow | undefined> {
  const [row] = await sql<MediaRow[]>`
    select id, path, status, reject_reason, is_public from public.media where id = ${id}`
  return row
}

async function callFiles(body: unknown, token?: string): Promise<Response> {
  return await fetch(`${local.apiUrl}/functions/v1/files`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: local.publishableKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function waitFor(label: string, seconds: number, test: () => Promise<boolean>) {
  const end = Date.now() + seconds * 1000
  while (Date.now() < end) {
    if (await test()) return
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`Délai dépassé : ${label}`)
}

Deno.test({
  name: "médiathèque : envois réels, fonction files et tâche planifiée",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn(t) {
    const { member, aal1 } = await signInEditor()
    const token = (await member.auth.getSession()).data.session!.access_token
    const aal1Token = (await aal1.auth.getSession()).data.session!.access_token
    // Heure de la base au début : les contrôles (media_audit) créés pendant le test sont effacés
    // à la fin, pour ne pas fausser les tests pgTAP relancés ensuite sur la même base.
    const [{ startedAt }] = await sql<{ startedAt: Date }[]>`select now() as "startedAt"`
    try {
      await t.step("le compte est membre en aal2", async () => {
        assertEquals((await member.rpc("is_staff")).data, true)
        assertEquals((await aal1.rpc("is_staff")).data, false)
      })

      let image: MediaRow
      await t.step("image, PDF et audios : prêts dès la confirmation", async () => {
        image = await send(member, "image", "Photo du lac.png", "image/png", png)
        assertEquals(image.status, "ready")
        assert(image.path.endsWith("/photo-du-lac.png"))
        const [object] = await sql<{ metadata: Record<string, unknown> }[]>`
          select metadata from storage.objects
          where bucket_id = 'files-protected' and name = ${image.path}`
        assertEquals(object.metadata.cacheControl, "max-age=60")
        assertEquals(object.metadata.mimetype, "image/png")
        assertEquals(
          (await send(member, "pdf", "Guide.pdf", "application/pdf", pdf)).status,
          "ready",
        )
        assertEquals(
          (await send(member, "audio", "Épisode.mp3", "audio/mpeg", mp3)).status,
          "ready",
        )
        assertEquals((await send(member, "audio", "Mémo.m4a", "audio/mp4", m4a)).status, "ready")
      })

      await t.step("envois refusés par Storage", async () => {
        const { data: row } = await member.rpc("media_create", {
          kind: "image",
          name: "a.png",
          mime: "image/png",
          size_bytes: png.byteLength,
        })
        created.push(row.id)
        const folder = row.path.split("/")[0]
        const blob = new Blob([png], { type: "image/png" })
        const other = await member.storage.from("files-protected").upload(
          `${folder}/autre.png`,
          blob,
        )
        assert(other.error, "autre nom dans son dossier : refusé")
        const pub = await member.storage.from("files-public").upload(row.path, blob)
        assert(pub.error, "bucket public : refusé")
        const withoutMfa = await aal1.storage.from("files-protected").upload(row.path, blob)
        assert(withoutMfa.error, "sans double vérification : refusé")
        const wrongType = await member.storage.from("files-protected").upload(
          row.path,
          new Blob([png], { type: "image/gif" }),
        )
        assert(wrongType.error, "type hors liste : refusé par le bucket")

        // Un SVG (type accepté par le bucket, même taille) envoyé à la place de l'image annoncée :
        // media_confirm le refuse, sinon il deviendrait « ready » sans la vérification des SVG.
        const { data: disguisedRow } = await member.rpc("media_create", {
          kind: "image",
          name: "deguise.png",
          mime: "image/png",
          size_bytes: png.byteLength,
        })
        created.push(disguisedRow.id)
        const disguised = encoder.encode(
          '<svg xmlns="http://www.w3.org/2000/svg"/>'.padEnd(png.byteLength, " "),
        )
        assertEquals(disguised.byteLength, png.byteLength)
        const sentSvg = await member.storage.from("files-protected").upload(
          disguisedRow.path,
          new Blob([disguised], { type: "image/svg+xml" }),
          { contentType: "image/svg+xml", cacheControl: "60" },
        )
        assertEquals(sentSvg.error, null)
        const confirmed = await member.rpc("media_confirm", { media_id: disguisedRow.id })
        assertEquals(confirmed.error, null)
        assertEquals(confirmed.data.status, "rejected")
        assertEquals(confirmed.data.reject_reason, "fichier_incoherent")
        // Pas de modification ni d'effacement par un membre : rien n'est effacé.
        const removed = await member.storage.from("files-protected").remove([image.path])
        assertEquals(removed.data ?? [], [])
        assertEquals((await readRow(image.id))?.status, "ready")
      })

      await t.step("SVG et Lottie vérifiés par la fonction files (appel d'un membre)", async () => {
        const trapped = await send(member, "svg", "piege.svg", "image/svg+xml", trappedSvg)
        const clean = await send(member, "svg", "logo.svg", "image/svg+xml", cleanSvg)
        const anim = await send(member, "lottie", "anim.json", "application/json", lottie)
        const bad = await send(member, "lottie", "casse.json", "application/json", badLottie)
        for (const row of [trapped, clean, anim, bad]) assertEquals(row.status, "checking")

        const { data, error } = await member.functions.invoke("files", { body: { mode: "kick" } })
        assertEquals(error, null)
        assert(data.checked >= 4, JSON.stringify(data))
        assertEquals((await readRow(trapped.id))?.reject_reason, "svg_attribut_interdit")
        assertEquals((await readRow(clean.id))?.status, "ready")
        assertEquals((await readRow(anim.id))?.status, "ready")
        assertEquals((await readRow(bad.id))?.reject_reason, "lottie_invalide")
      })

      await t.step("appels refusés et frein anti-abus", async () => {
        const clean = await callFiles({ mode: "clean" })
        assertEquals(clean.status, 401)
        await clean.body?.cancel()
        const notStaff = await callFiles({ mode: "kick" }, aal1Token)
        assertEquals(notStaff.status, 403)
        await notStaff.body?.cancel()
        const invalid = await callFiles({ mode: "tout" }, token)
        assertEquals(invalid.status, 400)
        await invalid.body?.cancel()

        await sql`update private.settings set files_last_kick_at = null, files_last_audit_at = null`
        const first = await callFiles({ mode: "kick" })
        assertEquals(first.status, 200)
        await first.body?.cancel()
        const second = await callFiles({ mode: "kick" })
        assertEquals(second.status, 429)
        assertEquals((await second.json()).error.code, "trop_tot")
        const audit = await callFiles({ mode: "audit" })
        assertEquals(audit.status, 200)
        assertEquals((await audit.json()).mode, "audit")
        const memberClean = await callFiles({ mode: "clean" }, token)
        assertEquals(memberClean.status, 200)
        assertEquals((await memberClean.json()).mode, "clean")
      })

      await t.step("tâche planifiée : pg_cron → pg_net → files (vérifier, déplacer)", async () => {
        // Un SVG envoyé sans appeler la fonction, et un fichier public qui ne doit pas l'être.
        const svg = await send(member, "svg", "cron.svg", "image/svg+xml", cleanSvg)
        assertEquals(svg.status, "checking")
        const moved = await admin.storage.from("files-protected").move(image.path, image.path, {
          destinationBucket: "files-public",
        })
        assertEquals(moved.error, null)
        await sql`update public.media set is_public = true where id = ${image.id}`
        await sql`update private.settings set files_last_kick_at = null`
        const [{ before }] = await sql<{ before: number }[]>`
          select coalesce(max(runid), 0)::int as before from cron.job_run_details`

        await waitFor("passage de la tâche « fichiers »", 90, async () => {
          const [s, i] = [await readRow(svg.id), await readRow(image.id)]
          return s?.status === "ready" && i?.is_public === false
        })
        const [object] = await sql<{ bucket_id: string }[]>`
          select bucket_id from storage.objects where name = ${image.path}`
        assertEquals(object.bucket_id, "files-protected")
        const runs = await sql`
          select d.status from cron.job_run_details d join cron.job j on j.jobid = d.jobid
          where j.jobname = 'fichiers' and d.runid > ${before} and d.status = 'succeeded'`
        assert(runs.length >= 1, "la tâche « fichiers » a tourné")
        const responses = await sql`
          select status_code from net._http_response where status_code = 200
            and content::jsonb ->> 'mode' = 'kick' and created > now() - interval '5 minutes'`
        assert(responses.length >= 1, "pg_net a reçu la réponse de la fonction")
      })

      await t.step("publication : fichiers publics ou protégés (règle de l'étape 5)", async () => {
        const reader = createClient(local.apiUrl, local.publishableKey, clientOptions)
        const cover = await send(member, "image", "Couverture.png", "image/png", png)
        const inside = await send(member, "image", "Dedans.png", "image/png", png)
        const signed = async (path: string) =>
          await reader.storage.from("files-protected").createSignedUrl(path, 60)
        const locations = async (ids: string[]) => {
          const { data, error } = await reader.rpc("app_file_locations", { media_ids: ids })
          assertEquals(error, null)
          return Object.fromEntries(
            (data as { media_id: string; location: string }[]).map((r) => [r.media_id, r.location]),
          )
        }
        const kick = async () => {
          const { data, error } = await member.functions.invoke("files", { body: { mode: "kick" } })
          assertEquals(error, null, JSON.stringify(data))
        }

        const { data: content, error: createError } = await member.rpc("content_create", {
          kind: "article",
          title: "Intégration",
        })
        assertEquals(createError, null)
        contentIds.push(content.id)
        const draft = {
          v: 1,
          title: "Intégration",
          cover: { mediaId: cover.id },
          blocks: [{
            id: crypto.randomUUID(),
            type: "image",
            mediaId: inside.id,
            caption: null,
            alt: null,
          }],
        }
        const save = async (settings: Record<string, unknown>) => {
          const { data: rev } = await member.from("contents").select("draft_rev").eq(
            "id",
            content.id,
          ).single()
          const { data, error } = await member.rpc("save_draft", {
            content_id: content.id,
            base_rev: rev!.draft_rev,
            draft,
            settings,
          }).single<{ draft_rev: number }>()
          assertEquals(error, null)
          return data!.draft_rev
        }
        const publish = async (rev: number) => {
          const { data, error } = await member.rpc("publish", {
            content_id: content.id,
            expected_rev: rev,
          }).single<{ needs_file_sync: boolean }>()
          assertEquals(error, null)
          return data!.needs_file_sync
        }

        // Gratuit : la minute d'attente (encore protégé, lisible par tous), puis public.
        assert(await publish(await save({ access_level_id: null })), "needs_file_sync")
        const waiting = await signed(inside.path)
        assertEquals(waiting.error, null, "anonyme : lien temporaire pendant la minute d'attente")
        const viaLink = await fetch(waiting.data!.signedUrl)
        assertEquals(viaLink.status, 200)
        await viaLink.body?.cancel()
        assertEquals(await locations([cover.id, inside.id]), {
          [cover.id]: "protected",
          [inside.id]: "protected",
        })
        await kick()
        assertEquals((await readRow(cover.id))?.is_public, true)
        assertEquals((await readRow(inside.id))?.is_public, true)
        const publicUrl =
          reader.storage.from("files-public").getPublicUrl(inside.path).data.publicUrl
        const direct = await fetch(publicUrl)
        assertEquals(direct.status, 200, "adresse publique")
        assertEquals(direct.headers.get("cache-control"), "max-age=60")
        await direct.body?.cancel()
        assertEquals(await locations([cover.id, inside.id]), {
          [cover.id]: "public",
          [inside.id]: "public",
        })

        // Réservé : l'image du contenu redevient protégée, la couverture reste publique.
        const [level] = await sql<{ id: string }[]>`
          insert into public.access_levels (name) values (${`Intégration ${userId.slice(0, 8)}`})
          returning id`
        levelIds.push(level.id)
        assert(await publish(await save({ access_level_id: level.id })), "needs_file_sync")
        await kick()
        assertEquals((await readRow(inside.id))?.is_public, false)
        assertEquals((await readRow(cover.id))?.is_public, true)
        assert((await signed(inside.path)).error, "anonyme : plus de lien pour un contenu réservé")
        assertEquals(await locations([cover.id, inside.id]), { [cover.id]: "public" })

        // Retiré de l'app : la couverture redevient protégée.
        const { data: sync, error: unpublishError } = await member.rpc("unpublish", {
          content_id: content.id,
        })
        assertEquals(unpublishError, null)
        assertEquals(sync, true)
        await kick()
        assertEquals((await readRow(cover.id))?.is_public, false)
        assert((await signed(cover.path)).error, "anonyme : plus de lien pour la couverture")
        assertEquals(await locations([cover.id, inside.id]), {})
        const [object] = await sql<{ bucket_id: string }[]>`
          select bucket_id from storage.objects where name = ${cover.path}`
        assertEquals(object.bucket_id, "files-protected")
      })

      await t.step("corbeille vidée : objet et ligne effacés", async () => {
        assertEquals((await member.rpc("media_trash", { media_id: image.id })).error, null)
        const { data: count } = await member.rpc("empty_trash", {
          items: [{ type: "file", id: image.id }],
        })
        assertEquals(count, 1)
        const { error } = await member.functions.invoke("files", { body: { mode: "kick" } })
        assertEquals(error, null)
        assertEquals(await readRow(image.id), undefined)
        const objects = await sql`select 1 from storage.objects where name = ${image.path}`
        assertEquals(objects.length, 0)
      })
    } finally {
      await member.auth.signOut()
      await aal1.auth.signOut()
      // Nettoyage : contenus (leurs versions partent avec eux), formules, objets (clé secrète),
      // lignes, compte.
      await sql`delete from public.contents where id = any(${contentIds})`
      await sql`delete from public.access_levels where id = any(${levelIds})`
      const rows = await sql<{ path: string }[]>`
        select path from public.media where id = any(${created})`
      for (const bucket of ["files-protected", "files-public"]) {
        if (rows.length > 0) await admin.storage.from(bucket).remove(rows.map((r) => r.path))
      }
      await sql`delete from public.media where id = any(${created})`
      await sql`delete from public.media_audit where checked_at >= ${startedAt}`
      if (userId) await admin.auth.admin.deleteUser(userId)
      await sql.end()
    }
  },
})

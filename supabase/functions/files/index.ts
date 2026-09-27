// Fonction serveur « files » : les fichiers de la médiathèque (vérifier les SVG et les Lottie,
// déplacer entre les buckets, effacer, nettoyer, contrôler les orphelins).
// Voir docs/ARCHITECTURE-CONTENUS.md, § 3.7 (contrat complet), et work.ts pour le travail.
//
// Appel : POST, JSON { "mode": "kick" | "audit" | "clean" } (« kick » par défaut).
// Deux sortes d'appelants :
// - SANS session de membre (tâche planifiée « fichiers » par pg_net, avec la clé publishable
//   dans l'en-tête apikey ; ou n'importe qui qui connaît cette adresse publique) : seulement
//   « kick » et « audit », c'est-à-dire le travail DÉCIDÉ PAR LA BASE, idempotent, avec un frein
//   tenu en base (un « kick » toutes les 20 s, un « audit » par heure : sinon 429) ;
// - un MEMBRE de l'équipe (Authorization: Bearer <jeton de sa session>, ce que
//   supabase.functions.invoke ajoute tout seul) : la base vérifie is_staff() avec son jeton
//   (aal2 et session ouverte). Tous les modes, sans frein. « clean » lui est réservé.
// Réponse : 200 avec le résumé du passage, ou { error: { code, message } } avec 4xx/5xx.
//
// La clé secrète est UNIQUEMENT celle que la plateforme injecte (SUPABASE_SECRET_KEYS, repli
// SUPABASE_SERVICE_ROLE_KEY) : aucun secret n'est écrit ici ni rangé dans la base.

import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "./cors.ts"
import { memberToken, parseMode } from "./request.ts"
import {
  type Database,
  type Orphan,
  runAudit,
  runClean,
  runKick,
  type Store,
  type WorkItem,
} from "./work.ts"

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
  }
}

const messages = {
  notSignedIn: "Connecte-toi pour continuer.",
  staffOnly: "Réservé à l'équipe, après la double vérification.",
  tooSoon: "Un passage vient d'avoir lieu. Réessaie dans un instant.",
  invalid: "Demande invalide : mode « kick », « audit » ou « clean » attendu.",
  methodNotAllowed: "Méthode non autorisée.",
  server: "Un problème est survenu. Réessaie dans un instant.",
} as const

// Clés fournies par la plateforme (en ligne et en local) : un dictionnaire JSON { default: "…" }.
// Repli sur les anciennes variables si besoin.
function readKey(dictionaryVariable: string, legacyVariable: string): string {
  const dictionary = Deno.env.get(dictionaryVariable)
  if (dictionary) {
    const key = (JSON.parse(dictionary) as Record<string, string>).default
    if (key) return key
  }
  const legacy = Deno.env.get(legacyVariable)
  if (legacy) return legacy
  throw new Error(`Variable manquante : ${dictionaryVariable}`)
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  })
}

function failure(label: string, error: { message: string } | null): Error {
  return new Error(`${label} : ${error?.message ?? "erreur inconnue"}`)
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const publishableKey = readKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY")
const secretKey = readKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY")
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(supabaseUrl, secretKey, clientOptions)

const db: Database = {
  async worklist(maxItems) {
    const { data, error } = await admin.rpc("files_worklist", { max_items: maxItems })
    if (error) throw failure("liste du travail", error)
    return data as WorkItem[]
  },
  async markChecked(mediaId, accepted, reason) {
    const { data, error } = await admin.rpc("files_mark_checked", {
      media_id: mediaId,
      accepted,
      reason,
    })
    if (error) throw failure("vérification", error)
    return data as string
  },
  async markCheckFailed(mediaId, errorText) {
    const { data, error } = await admin.rpc("files_mark_check_failed", {
      media_id: mediaId,
      error: errorText,
    })
    if (error) throw failure("vérification ratée", error)
    return data as string
  },
  async markMoved(mediaId, isPublic) {
    const { data, error } = await admin.rpc("files_mark_moved", {
      media_id: mediaId,
      is_public: isPublic,
    })
    if (error) throw failure("déplacement", error)
    return data === true
  },
  async markFailed(mediaId, errorText) {
    const { error } = await admin.rpc("files_mark_failed", {
      media_id: mediaId,
      error: errorText,
    })
    if (error) throw failure("échec", error)
  },
  async markErased(mediaId) {
    const { data, error } = await admin.rpc("files_mark_erased", { media_id: mediaId })
    if (error) throw failure("effacement", error)
    return data === true
  },
  async audit() {
    const { data, error } = await admin.rpc("files_audit")
    if (error) throw failure("contrôle", error)
    return data as number
  },
  async orphans() {
    const { data, error } = await admin.rpc("files_orphans")
    if (error) throw failure("orphelins", error)
    return data as Orphan[]
  },
}

const store: Store = {
  async download(bucket, path) {
    const { data, error } = await admin.storage.from(bucket).download(path)
    if (error || !data) throw failure("lecture", error)
    return new Uint8Array(await data.arrayBuffer())
  },
  async move(fromBucket, toBucket, path) {
    const { error } = await admin.storage.from(fromBucket).move(path, path, {
      destinationBucket: toBucket,
    })
    if (error) throw failure("déplacement", error)
  },
  async exists(bucket, path) {
    const { data, error } = await admin.storage.from(bucket).exists(path)
    if (data === false) return false
    if (error) throw failure("présence", error)
    return data === true
  },
  async remove(bucket, paths) {
    const { error } = await admin.storage.from(bucket).remove(paths)
    if (error) throw failure("effacement", error)
  },
}

// Membre de l'équipe ? C'est la base qui décide (is_staff : fiche, aal2, session ouverte).
async function isStaff(token: string): Promise<boolean> {
  const asCaller = createClient(supabaseUrl, publishableKey, {
    ...clientOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await asCaller.rpc("is_staff")
  if (error) throw new HttpError(401, "non_connecte", messages.notSignedIn)
  return data === true
}

async function claimRun(mode: "kick" | "audit"): Promise<boolean> {
  const { data, error } = await admin.rpc("files_claim_run", { run_mode: mode })
  if (error) throw failure("frein", error)
  return data === true
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get("Origin"))
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers })

  try {
    if (request.method !== "POST") {
      throw new HttpError(405, "methode_refusee", messages.methodNotAllowed)
    }
    const text = await request.text()
    let body: unknown
    try {
      body = text.trim() === "" ? undefined : JSON.parse(text)
    } catch {
      throw new HttpError(400, "demande_invalide", messages.invalid)
    }
    const mode = parseMode(body)
    if (!mode) throw new HttpError(400, "demande_invalide", messages.invalid)

    const token = memberToken(request.headers.get("Authorization"))
    if (token) {
      if (!(await isStaff(token))) {
        throw new HttpError(403, "reserve_a_l_equipe", messages.staffOnly)
      }
    } else {
      if (mode === "clean") throw new HttpError(401, "non_connecte", messages.notSignedIn)
      if (!(await claimRun(mode))) throw new HttpError(429, "trop_tot", messages.tooSoon)
    }

    switch (mode) {
      case "kick":
        return json(200, await runKick(db, store), headers)
      case "audit":
        return json(200, await runAudit(db), headers)
      case "clean":
        return json(200, await runClean(db, store), headers)
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, { error: { code: error.code, message: error.message } }, headers)
    }
    // Pas de données personnelles dans les journaux : seulement le message technique.
    console.error("files :", error instanceof Error ? error.message : error)
    return json(500, { error: { code: "erreur_serveur", message: messages.server } }, headers)
  }
})

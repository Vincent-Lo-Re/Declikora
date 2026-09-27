// Appels des contenus et de l'éditeur : table contents, RPC content_create, save_draft et
// lock_*, Realtime sur edit_locks. Contrat : docs/ARCHITECTURE-CONTENUS.md (« Étape 4 »).

import type { PostgrestError } from "@supabase/supabase-js"

import type { Draft } from "@/blocks/types"
import type { Json, Tables } from "@/lib/database.types"
import type { Media } from "@/lib/media/constants"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// ---------------------------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------------------------

export type ContentErrorCode = keyof typeof texts.editor.errors

function isContentErrorCode(code: unknown): code is ContentErrorCode {
  return typeof code === "string" && Object.hasOwn(texts.editor.errors, code)
}

/**
 * Erreur de la base : son code (s'il est connu), la précision de la base, et si l'on peut
 * réessayer plus tard (réseau coupé, serveur indisponible).
 */
export class ContentError extends Error {
  readonly code: ContentErrorCode | null
  readonly detail: string | null
  readonly retryable: boolean

  constructor(
    code: ContentErrorCode | null,
    {
      detail = null,
      retryable = false,
    }: { detail?: string | null; retryable?: boolean } = {}
  ) {
    super(code ? texts.editor.errors[code] : texts.common.unexpected)
    this.name = "ContentError"
    this.code = code
    this.detail = detail
    this.retryable = retryable
  }
}

/**
 * Traduit une erreur de la base. status vaut 0 quand la requête n'est pas partie (hors ligne) :
 * supabase-js le renvoie ainsi au lieu de lever l'erreur de fetch.
 */
export function toContentError(
  error: PostgrestError,
  status: number
): ContentError {
  const code = isContentErrorCode(error.message) ? error.message : null
  const offline = typeof navigator !== "undefined" && navigator.onLine === false
  const retryable =
    code === null &&
    (offline ||
      status === 0 ||
      status === 408 ||
      status === 429 ||
      status >= 500)
  return new ContentError(code, { detail: error.details || null, retryable })
}

/** Vrai si l'erreur montre que la personne n'a plus accès (fiche ou session à relire). */
export function isContentAccessLost(error: unknown): boolean {
  return error instanceof ContentError && error.code === "reserve_a_l_equipe"
}

// ---------------------------------------------------------------------------------------------
// Clés de TanStack Query
// ---------------------------------------------------------------------------------------------

export const contentKeys = {
  all: ["contents"] as const,
  list: (kind: ContentKind) => ["contents", "list", kind] as const,
  detail: (id: string) => ["contents", "detail", id] as const,
  media: (ids: string[]) => ["contents", "media", ids] as const,
}

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

export type ContentKind =
  "article" | "episode" | "method" | "chapter" | "lesson" | "page" | "template"

export type ContentListItem = {
  id: string
  title: string
  draft_saved_at: string
  saved_by_name: string | null
  // Le membre qui écrit en ce moment (verrou actif), s'il y en a un.
  editing_name: string | null
}

type ProfileName = { full_name: string | null; email: string } | null

function nameOf(profile: ProfileName): string | null {
  if (!profile) return null
  return profile.full_name?.trim() || profile.email
}

// Un verrou sans signe de vie depuis 90 s est périmé ([D13]).
const LOCK_TTL_MS = 90_000

/** Les contenus d'une sorte, hors corbeille, les derniers modifiés d'abord. */
export async function listContents(
  kind: ContentKind
): Promise<ContentListItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, title, draft_saved_at, saved_by:profiles!contents_draft_saved_by_fkey(full_name, email), edit_locks(holder_id, heartbeat_at, holder:profiles(full_name, email))"
    )
    .eq("kind", kind)
    .is("deleted_at", null)
    .order("draft_saved_at", { ascending: false })
    .limit(500)
  if (error) throw toContentError(error, status)
  const now = Date.now()
  return data.map((row) => {
    const lock = row.edit_locks as {
      holder_id: string | null
      heartbeat_at: string
      holder: ProfileName
    } | null
    const active =
      lock?.holder_id != null &&
      now - new Date(lock.heartbeat_at).getTime() < LOCK_TTL_MS
    return {
      id: row.id,
      title: row.title ?? "",
      draft_saved_at: row.draft_saved_at,
      saved_by_name: nameOf(row.saved_by as ProfileName),
      editing_name: active
        ? (nameOf(lock.holder) ?? texts.editor.lock.someone)
        : null,
    }
  })
}

export type Content = Pick<
  Tables<"contents">,
  "id" | "kind" | "draft_rev" | "draft_saved_at" | "deleted_at" | "parent_id"
> & { draft: Draft; title: string }

/** Un contenu et son brouillon ; null s'il n'existe pas (ou plus). */
export async function getContent(id: string): Promise<Content | null> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, kind, title, draft, draft_rev, draft_saved_at, deleted_at, parent_id"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw toContentError(error, status)
  if (!data) return null
  return {
    ...data,
    title: data.title ?? "",
    draft: data.draft as unknown as Draft,
  }
}

/** Les fichiers cités par un brouillon (corbeille comprise, pour le signaler). */
export async function getMediaByIds(ids: string[]): Promise<Media[]> {
  if (ids.length === 0) return []
  const { data, error, status } = await supabase
    .from("media")
    .select("*")
    .in("id", ids)
  if (error) throw toContentError(error, status)
  return data as Media[]
}

// ---------------------------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------------------------

/** Crée un contenu ; l'appelant tient aussitôt son verrou. */
export async function createContent(
  kind: ContentKind,
  title = ""
): Promise<Content> {
  const { data, error, status } = await supabase.rpc("content_create", {
    kind,
    title,
  })
  if (error) throw toContentError(error, status)
  return {
    ...data,
    title: data.title ?? "",
    draft: data.draft as unknown as Draft,
  }
}

export type SavedDraft = { rev: number; savedAt: string }

/**
 * Enregistre le brouillon (il faut tenir le verrou depuis cette ouverture de l'éditeur, et
 * partir de la dernière révision).
 */
export async function saveDraft(
  contentId: string,
  baseRev: number,
  draft: Draft,
  session: string
): Promise<SavedDraft> {
  const { data, error, status } = await supabase
    .rpc("save_draft", {
      content_id: contentId,
      base_rev: baseRev,
      draft: draft as unknown as Json,
      editor_session: session,
    })
    .single()
  if (error) throw toContentError(error, status)
  return { rev: data.draft_rev, savedAt: data.draft_saved_at }
}

// ---------------------------------------------------------------------------------------------
// Verrou « un seul à la fois »
// ---------------------------------------------------------------------------------------------

// Chaque ouverture de l'éditeur tire un identifiant (session) : le verrou est tenu par un membre
// ET par cette ouverture. Deux onglets du même membre ne partagent donc pas la main.

/** État du verrou vu par l'appelant (lock_take et lock_status). */
export type LockRow = {
  mine: boolean
  holder_id: string | null
  holder_name: string | null
  taken_at: string | null
  heartbeat_at: string | null
  is_active: boolean
  draft_rev: number
}

export async function lockTake(
  contentId: string,
  force: boolean,
  session: string
): Promise<LockRow> {
  const { data, error, status } = await supabase
    .rpc("lock_take", {
      content_id: contentId,
      force,
      editor_session: session,
    })
    .single()
  if (error) throw toContentError(error, status)
  return data as LockRow
}

export async function lockStatus(
  contentId: string,
  session: string
): Promise<LockRow> {
  const { data, error, status } = await supabase
    .rpc("lock_status", { content_id: contentId, editor_session: session })
    .single()
  if (error) throw toContentError(error, status)
  return data as LockRow
}

/** Signe de vie : faux si l'appelant ne tient plus le verrou. */
export async function lockHeartbeat(
  contentId: string,
  session: string
): Promise<boolean> {
  const { data, error, status } = await supabase.rpc("lock_heartbeat", {
    content_id: contentId,
    editor_session: session,
  })
  if (error) throw toContentError(error, status)
  return data
}

export async function lockRelease(
  contentId: string,
  session: string
): Promise<boolean> {
  const { data, error, status } = await supabase.rpc("lock_release", {
    content_id: contentId,
    editor_session: session,
  })
  if (error) throw toContentError(error, status)
  return data
}

/**
 * Relâche le verrou quand la page se ferme : une requête « keepalive », que le navigateur
 * termine même après la fermeture de l'onglet. Le jeton est lu à l'avance (pas d'attente ici).
 */
export function lockReleaseOnExit(
  contentId: string,
  session: string,
  accessToken: string
) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/lock_release`
  try {
    void fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content_id: contentId, editor_session: session }),
    }).catch(() => undefined)
  } catch {
    // Le verrou expirera tout seul au bout de 90 s.
  }
}

/** Ce que Realtime envoie d'une ligne de edit_locks (sans le nom de la personne). */
export type LockChange = Pick<
  Tables<"edit_locks">,
  "holder_id" | "holder_session" | "heartbeat_at" | "draft_rev" | "taken_at"
>

export type ChannelState =
  "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR"

/**
 * Écoute le verrou d'un contenu (Realtime, Postgres Changes) : seulement les INSERT et UPDATE
 * de sa ligne (les DELETE ne sont ni filtrés ni soumis à la RLS, et le ménage seul en fait).
 */
export function subscribeLock(
  contentId: string,
  onChange: (change: LockChange) => void,
  onState: (state: ChannelState) => void
): () => void {
  // Un nom de canal unique par abonnement : supabase-js renvoie le canal existant pour un
  // même nom, et un canal déjà rejoint n'apprend pas un nouveau filtre (double montage de
  // React en développement, éditeur rouvert aussitôt).
  const channel = supabase
    .channel(`verrou:${contentId}:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "edit_locks",
        filter: `content_id=eq.${contentId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") return
        const row = payload.new as Tables<"edit_locks">
        onChange({
          holder_id: row.holder_id,
          holder_session: row.holder_session,
          heartbeat_at: row.heartbeat_at,
          draft_rev: row.draft_rev,
          taken_at: row.taken_at,
        })
      }
    )

  let removed = false
  // Le jeton de Realtime d'abord : supabase-js ne le met pas à jour après la double
  // vérification (événement MFA_CHALLENGE_VERIFIED), et un jeton « aal1 » ne reçoit rien
  // (la politique de edit_locks exige is_staff(), donc aal2).
  void supabase.realtime
    .setAuth()
    .catch(() => undefined)
    .then(() => {
      if (!removed) channel.subscribe((state) => onState(state as ChannelState))
    })
  return () => {
    removed = true
    void supabase.removeChannel(channel)
  }
}

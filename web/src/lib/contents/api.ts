// Appels des contenus et de l'éditeur : table contents, RPC content_create, save_draft et
// lock_*, Realtime sur edit_locks. Contrat : docs/ARCHITECTURE-CONTENUS.md (« Étape 4 »).
// Publication, historique et corbeille des contenus : lib/contents/publication.ts (étape 5).

import type { PostgrestError } from "@supabase/supabase-js"

import type { Draft } from "@/blocks/types"
import type { Json, Tables } from "@/lib/database.types"
import { isLockAlive } from "@/lib/editor/edit-lock"
import type { Media } from "@/lib/media/constants"
import { displayName, type PersonName } from "@/lib/people"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// ---------------------------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------------------------

type ContentErrorCode = keyof typeof texts.editor.errors

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
  // Complément de la base : le nom de la personne qui écrit (verrou_tenu).
  readonly hint: string | null
  readonly retryable: boolean

  constructor(
    code: ContentErrorCode | null,
    {
      detail = null,
      hint = null,
      retryable = false,
    }: {
      detail?: string | null
      hint?: string | null
      retryable?: boolean
    } = {}
  ) {
    super(code ? texts.editor.errors[code] : texts.common.unexpected)
    this.name = "ContentError"
    this.code = code
    this.detail = detail
    this.hint = hint
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
  return new ContentError(code, {
    detail: error.details || null,
    hint: error.hint || null,
    retryable,
  })
}

/** Le message d'un code d'erreur de la base (texts.editor.errors), ou le message générique. */
function contentErrorText(code: string): string {
  return isContentErrorCode(code)
    ? texts.editor.errors[code]
    : texts.common.unexpected
}

/**
 * Ce qui ferait refuser la publication d'un élément (publish_preview) : la précision de la base
 * (en français, et plus précise : « bloc n° 2 »), sinon le message du code.
 */
export function contentProblemText(
  code: string,
  detail: string | null
): string {
  return detail?.trim() || contentErrorText(code)
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
  lists: ["contents", "list"] as const,
  list: (kind: ContentKind) => ["contents", "list", kind] as const,
  detail: (id: string) => ["contents", "detail", id] as const,
  media: (ids: string[]) => ["contents", "media", ids] as const,
  publication: (id: string) => ["contents", "publication", id] as const,
  versions: (id: string) => ["contents", "versions", id] as const,
}

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

export type ContentKind =
  "article" | "episode" | "method" | "chapter" | "lesson" | "page" | "template"

export type ContentListItem = {
  id: string
  title: string
  // Adresse de la page dans le brouillon (pages seulement).
  slug: string | null
  // Catégories du brouillon (articles et épisodes), dans aucun ordre particulier.
  category_ids: string[]
  draft_rev: number
  draft_saved_at: string
  saved_by_name: string | null
  // Le membre qui écrit en ce moment (verrou actif), s'il y en a un.
  editing_name: string | null
  // Publication : la révision du brouillon publiée (version en ligne), la programmation.
  live_draft_rev: number | null
  first_published_at: string | null
  scheduled_at: string | null
  schedule_error: string | null
  // Niveau d'accès du brouillon (liste des méthodes) : choisi ou non ([D41]), null = Gratuit.
  access_chosen: boolean
  access_level_id: string | null
  // Méthodes : vrai si publier changerait quelque chose dans l'app (publish_preview), faux si
  // rien, absent tant qu'on ne le sait pas (la révision de la fiche ne suffit pas : [D29]).
  pending_changes?: boolean
}

/** Les catégories d'un brouillon (content_categories), triées : l'ordre ne compte pas. */
function categoryIdsOf(
  rows: { category_id: string }[] | null | undefined
): string[] {
  return (rows ?? []).map((row) => row.category_id).sort()
}

/** Les contenus d'une sorte, hors corbeille, les derniers modifiés d'abord. */
export async function listContents(
  kind: ContentKind
): Promise<ContentListItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, title, slug, draft_rev, draft_saved_at, first_published_at, scheduled_at, schedule_error, access_chosen, access_level_id, saved_by:profiles!contents_draft_saved_by_fkey(full_name, email), edit_locks(holder_id, heartbeat_at, holder:profiles(full_name, email)), live:versions!contents_live_version_fkey(draft_rev), content_categories(category_id)"
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
      holder: PersonName | null
    } | null
    const active =
      lock?.holder_id != null && isLockAlive(lock.heartbeat_at, now)
    const live = row.live as { draft_rev: number } | null
    return {
      id: row.id,
      title: row.title ?? "",
      slug: row.slug,
      category_ids: categoryIdsOf(row.content_categories),
      draft_rev: row.draft_rev,
      draft_saved_at: row.draft_saved_at,
      saved_by_name: displayName(row.saved_by as PersonName | null),
      editing_name: active
        ? (displayName(lock.holder) ?? texts.editor.lock.someone)
        : null,
      live_draft_rev: live?.draft_rev ?? null,
      first_published_at: row.first_published_at,
      scheduled_at: row.scheduled_at,
      schedule_error: row.schedule_error,
      access_chosen: row.access_chosen,
      access_level_id: row.access_level_id,
    }
  })
}

export type Content = Pick<
  Tables<"contents">,
  | "id"
  | "kind"
  | "draft_rev"
  | "draft_saved_at"
  | "deleted_at"
  | "parent_id"
  | "access_chosen"
  | "access_level_id"
  | "slug"
  | "template_sort"
  | "template_for"
  | "in_app"
  | "is_free"
> & {
  draft: Draft
  title: string
  // Catégories du brouillon (articles et épisodes), triées.
  category_ids: string[]
}

/** Un contenu et son brouillon ; null s'il n'existe pas (ou plus). */
export async function getContent(id: string): Promise<Content | null> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, kind, title, draft, draft_rev, draft_saved_at, deleted_at, parent_id, access_chosen, access_level_id, slug, template_sort, template_for, in_app, is_free, content_categories(category_id)"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw toContentError(error, status)
  if (!data) return null
  const { content_categories: categories, ...rest } = data
  return {
    ...rest,
    title: data.title ?? "",
    draft: data.draft as unknown as Draft,
    category_ids: categoryIdsOf(categories),
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

/**
 * Crée un contenu ; l'appelant tient aussitôt son verrou. fromTemplateId : un point de départ de
 * cette sorte de contenu, dont les blocs sont recopiés ([D42]). parentId : la méthode d'un
 * chapitre, le chapitre d'une leçon (l'élément naît en fin de liste, « Montrer dans l'app »
 * décoché).
 */
export async function createContent(
  kind: ContentKind,
  title = "",
  fromTemplateId: string | null = null,
  parentId: string | null = null
): Promise<Content> {
  const { data, error, status } = await supabase.rpc("content_create", {
    kind,
    title,
    ...(fromTemplateId && { from_template_id: fromTemplateId }),
    ...(parentId && { parent_id: parentId }),
  })
  if (error) throw toContentError(error, status)
  return {
    ...data,
    title: data.title ?? "",
    draft: data.draft as unknown as Draft,
    // Un contenu neuf n'a pas de catégorie ([D44] : elles sont facultatives).
    category_ids: [],
  }
}

export type SavedDraft = { rev: number; savedAt: string }

// ---------------------------------------------------------------------------------------------
// Réglages du contenu (enregistrés par save_draft, sous le verrou)
// ---------------------------------------------------------------------------------------------

/**
 * Les réglages d'un contenu tels que l'éditeur les montre. accessChosen : « Gratuit » ou une
 * formule a été choisi ([D41] : pas de niveau par défaut). accessLevelId null = Gratuit.
 */
export type ContentSettings = {
  accessChosen: boolean
  accessLevelId: string | null
  slug: string | null
  // Catégories (articles et épisodes), triées : l'ordre ne compte pas ([D44] : facultatives).
  categoryIds: string[]
  // Chapitre ou leçon : « Montrer dans l'app » (à la prochaine publication de la méthode, [D29]).
  inApp: boolean
  // Leçon : « Leçon gratuite » dans une méthode réservée.
  isFree: boolean
}

/** Ce que save_draft reçoit dans settings (seulement les réglages changés). */
export type SettingsPayload = {
  access_level_id?: string | null
  slug?: string | null
  category_ids?: string[]
  in_app?: boolean
  is_free?: boolean
}

export function settingsOf(
  content: Pick<
    Content,
    | "access_chosen"
    | "access_level_id"
    | "slug"
    | "category_ids"
    | "in_app"
    | "is_free"
  >
): ContentSettings {
  return {
    accessChosen: content.access_chosen,
    accessLevelId: content.access_level_id,
    slug: content.slug,
    categoryIds: [...content.category_ids].sort(),
    inApp: content.in_app,
    isFree: content.is_free,
  }
}

/** Vrai si les deux listes contiennent les mêmes catégories (dans n'importe quel ordre). */
export function sameCategories(
  a: readonly string[],
  b: readonly string[]
): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/**
 * Les réglages à envoyer : ceux qui diffèrent de la base. Le niveau n'est envoyé qu'une fois
 * choisi (l'envoyer, même null, le marque comme choisi dans la base).
 */
export function settingsDiff(
  saved: ContentSettings,
  wanted: ContentSettings
): SettingsPayload | null {
  const payload: SettingsPayload = {}
  if (
    wanted.accessChosen &&
    (!saved.accessChosen || saved.accessLevelId !== wanted.accessLevelId)
  ) {
    payload.access_level_id = wanted.accessLevelId
  }
  if (wanted.slug !== saved.slug) payload.slug = wanted.slug
  // La liste remplace celle de la base ([] : aucune catégorie).
  if (!sameCategories(saved.categoryIds, wanted.categoryIds)) {
    payload.category_ids = [...wanted.categoryIds].sort()
  }
  if (wanted.inApp !== saved.inApp) payload.in_app = wanted.inApp
  if (wanted.isFree !== saved.isFree) payload.is_free = wanted.isFree
  return Object.keys(payload).length > 0 ? payload : null
}

/**
 * Enregistre le brouillon (il faut tenir le verrou depuis cette ouverture de l'éditeur, et
 * partir de la dernière révision), avec les réglages changés s'il y en a.
 */
export async function saveDraft(
  contentId: string,
  baseRev: number,
  draft: Draft,
  session: string,
  settings: SettingsPayload | null = null
): Promise<SavedDraft> {
  const { data, error, status } = await supabase
    .rpc("save_draft", {
      content_id: contentId,
      base_rev: baseRev,
      draft: draft as unknown as Json,
      editor_session: session,
      ...(settings && { settings: settings as unknown as Json }),
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

/**
 * Relâche le verrou que content_create donne à son auteur (sans ouverture de l'éditeur) : un
 * chapitre ou une leçon créé depuis le plan de la méthode, qu'on n'ouvre pas tout de suite.
 */
export async function lockReleaseCreated(contentId: string): Promise<boolean> {
  const { data, error, status } = await supabase.rpc("lock_release", {
    content_id: contentId,
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

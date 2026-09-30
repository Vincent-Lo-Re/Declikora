// Appels de la médiathèque et de la corbeille : table media, RPC de la base, Storage et
// fonction serveur « files ». Contrat : docs/ARCHITECTURE-CONTENUS.md (« Étape 3 », § 3.7).

import { FunctionsHttpError, type PostgrestError } from "@supabase/supabase-js"

import type { Json, Tables } from "@/lib/database.types"
import {
  PROTECTED_BUCKET,
  PUBLIC_BUCKET,
  type Media,
  type MediaKind,
} from "@/lib/media/constants"
import type { PreparedFile } from "@/lib/media/prepare"
import { restoreContent } from "@/lib/contents/publication"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// ---------------------------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------------------------

type MediaErrorCode = keyof typeof texts.media.errors

function isMediaErrorCode(code: unknown): code is MediaErrorCode {
  return typeof code === "string" && Object.hasOwn(texts.media.errors, code)
}

/** Erreur de la base ou de la fonction « files » : son code (s'il est connu) et le message. */
export class MediaError extends Error {
  readonly code: MediaErrorCode | null
  // Précision de la base (par exemple la liste des contenus qui utilisent un fichier).
  readonly detail: string | null

  constructor(code: MediaErrorCode | null, detail: string | null = null) {
    super(code ? texts.media.errors[code] : texts.common.unexpected)
    this.name = "MediaError"
    this.code = code
    this.detail = detail
  }
}

/** Mise à la corbeille en masse : un fichier encore utilisé est gardé, avec la liste des contenus. */
export function usedFileDetail(error: unknown): string | null {
  return error instanceof MediaError && error.code === "fichier_utilise"
    ? (error.detail ?? error.message)
    : null
}

/** Traduit une erreur de la base (RPC ou table). */
function toMediaError(error: PostgrestError): MediaError {
  const code = isMediaErrorCode(error.message) ? error.message : null
  return new MediaError(code, error.details || null)
}

/** Vrai si l'erreur montre que la personne n'a plus accès (fiche ou session à relire). */
export function isMediaAccessLost(error: unknown): boolean {
  return (
    error instanceof MediaError &&
    (error.code === "reserve_a_l_equipe" || error.code === "non_connecte")
  )
}

// ---------------------------------------------------------------------------------------------
// Clés de TanStack Query
// ---------------------------------------------------------------------------------------------

export type MediaFilters = {
  kind: MediaKind | "all"
  search: string
  // « Non utilisés » : ni dans un brouillon ni dans une version en ligne (règle de la corbeille).
  unused: boolean
}

export const mediaKeys = {
  all: ["media"] as const,
  list: (filters: MediaFilters) => ["media", "list", filters] as const,
  storage: ["media", "storage"] as const,
  audit: ["media", "audit"] as const,
  urls: (paths: string[]) => ["media", "urls", paths] as const,
  one: (id: string) => ["media", "one", id] as const,
  // Les « Utilisé dans » et « Textes figés » de tous les fichiers (à relire après un geste
  // sur un contenu), puis ceux d'un fichier.
  allUses: ["media", "uses"] as const,
  uses: (id: string) => ["media", "uses", id] as const,
  allOutdated: ["media", "outdated"] as const,
  outdated: (id: string) => ["media", "outdated", id] as const,
  verdicts: (ids: string[]) => ["media", "verdicts", ids] as const,
}

export const trashKey = ["trash"] as const

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

// Au-delà, la page invite à affiner la recherche.
export const MEDIA_LIST_LIMIT = 500

function toMedia(
  row: Omit<Tables<"media">, "media_in_use"> & {
    media_in_use?: boolean | null
  }
): Media {
  return row as Media
}

/** Échappe % et _ pour une recherche « contient ». */
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
}

/** Fichiers hors corbeille, les plus récents d'abord. */
export async function listMedia(filters: MediaFilters): Promise<Media[]> {
  let query = supabase
    .from("media")
    // media_in_use : colonne calculée par la base, pour le badge « Non utilisé » et le filtre.
    .select("*, media_in_use")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(MEDIA_LIST_LIMIT)
  if (filters.kind !== "all") query = query.eq("kind", filters.kind)
  if (filters.unused) query = query.eq("media_in_use", false)
  const search = filters.search.trim()
  if (search !== "") query = query.ilike("name", likePattern(search))
  const { data, error } = await query
  if (error) throw toMediaError(error)
  return data.map(toMedia)
}

/** Un fichier hors corbeille (null s'il n'existe pas ou plus). */
export async function getMedia(id: string): Promise<Media | null> {
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  if (error) throw toMediaError(error)
  return data ? toMedia(data) : null
}

/** Statut actuel d'un fichier (relu après un envoi, le temps de sa vérification). */
export type MediaVerdict = Pick<Media, "id" | "status" | "reject_reason">

/** Statut actuel des fichiers donnés (ceux mis à la corbeille entre-temps compris). */
export async function getMediaVerdicts(ids: string[]): Promise<MediaVerdict[]> {
  const { data, error } = await supabase
    .from("media")
    .select("id, status, reject_reason")
    .in("id", ids)
  if (error) throw toMediaError(error)
  return data as MediaVerdict[]
}

/** Place occupée par les deux buckets, en octets. */
export async function getStorageUsed(): Promise<number> {
  const { data, error } = await supabase.rpc("media_storage_used")
  if (error) throw toMediaError(error)
  return data
}

type MediaAudit = Pick<Tables<"media_audit">, "checked_at" | "orphan_paths">

/** Dernier contrôle des fichiers orphelins (null s'il n'y en a pas encore eu). */
export async function getLatestAudit(): Promise<MediaAudit | null> {
  const { data, error } = await supabase
    .from("media_audit")
    .select("checked_at, orphan_paths")
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw toMediaError(error)
  return data
}

// Durée de validité des liens temporaires d'aperçu : une heure.
export const PREVIEW_URL_SECONDS = 3600
// Les adresses d'aperçu sont relues toutes les 30 minutes (usePreviewUrls).
export const PREVIEW_REFRESH_MS = 30 * 60 * 1000
// Un lien qui expire dans moins de 35 minutes est renouvelé. Cette marge doit rester PLUS
// GRANDE que l'intervalle de relecture : un lien rendu vaut encore au moins 35 minutes, et la
// relecture suivante arrive avant 30 minutes, donc avant son expiration.
const RENEW_BEFORE_MS = PREVIEW_REFRESH_MS + 5 * 60 * 1000

/** Chemin d'aperçu d'un fichier : « <bucket>/<chemin> ». */
export function previewKey(media: Pick<Media, "is_public" | "path">): string {
  return `${media.is_public ? PUBLIC_BUCKET : PROTECTED_BUCKET}/${media.path}`
}

// Liens déjà obtenus : une nouvelle liste ne redemande que ceux qui manquent, et les vignettes
// gardent leur adresse (le navigateur ne les télécharge pas de nouveau).
const previewCache = new Map<string, { url: string; expiresAt: number }>()

export function clearPreviewCache() {
  previewCache.clear()
}

/**
 * Adresses d'aperçu : adresse publique pour un fichier public, lien temporaire (une heure) pour
 * un fichier protégé, obtenus en une seule demande. Renvoie { "<bucket>/<chemin>": adresse }.
 */
export async function getPreviewUrls(
  keys: string[]
): Promise<Record<string, string>> {
  const now = Date.now()
  const urls: Record<string, string> = {}
  const missing: string[] = []
  for (const key of keys) {
    const [bucket, ...rest] = key.split("/")
    const path = rest.join("/")
    const cached = previewCache.get(key)
    if (bucket === PUBLIC_BUCKET) {
      urls[key] = supabase.storage
        .from(PUBLIC_BUCKET)
        .getPublicUrl(path).data.publicUrl
    } else if (cached && cached.expiresAt - now > RENEW_BEFORE_MS) {
      urls[key] = cached.url
    } else {
      missing.push(path)
    }
  }
  if (missing.length > 0) {
    const { data, error } = await supabase.storage
      .from(PROTECTED_BUCKET)
      .createSignedUrls(missing, PREVIEW_URL_SECONDS)
    if (error) throw new MediaError(null)
    const expiresAt = now + PREVIEW_URL_SECONDS * 1000
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) {
        const key = `${PROTECTED_BUCKET}/${item.path}`
        urls[key] = item.signedUrl
        previewCache.set(key, { url: item.signedUrl, expiresAt })
      }
    }
  }
  return urls
}

export type MediaUse = {
  content_id: string
  kind: string
  title: string
  parent_title: string | null
  in_draft: boolean
  in_app: boolean
}

/** Contenus qui utilisent un fichier : brouillons (in_draft) et versions en ligne (in_app). */
export async function getMediaUses(mediaId: string): Promise<MediaUse[]> {
  const { data, error } = await supabase.rpc("media_uses", {
    media_id: mediaId,
  })
  if (error) throw toMediaError(error)
  return data
}

/** Un contenu en ligne dont la version garde un ancien texte de ce fichier ([D30]). */
type MediaOutdated = {
  content_id: string
  kind: string
  title: string
  version_id: string
  version_number: number
  published_at: string
}

/** Les contenus en ligne qui montrent encore un ancien texte alternatif ou transcription. */
export async function getMediaOutdated(
  mediaId: string
): Promise<MediaOutdated[]> {
  const { data, error } = await supabase.rpc("media_outdated", {
    media_id: mediaId,
  })
  if (error) throw toMediaError(error)
  return data
}

/**
 * « Mettre à jour ces N contenus dans l'app » : une nouvelle version de chacun, égale à celle
 * en ligne, avec les textes actuels de ce fichier. Renvoie le nombre de contenus mis à jour.
 */
export async function pushMediaTexts(mediaId: string): Promise<number> {
  const { data, error } = await supabase.rpc("media_push", {
    media_id: mediaId,
  })
  if (error) throw toMediaError(error)
  return data.length
}

export type TrashItem = {
  item_type: "file" | "content"
  id: string
  kind: string
  title: string | null
  parent_title: string | null
  // Contenus : le lot (une méthode et ses chapitres et leçons partent et reviennent ensemble).
  trash_batch: string | null
  // Vrai pour l'élément qu'on a mis à la corbeille (et pour chaque fichier).
  batch_root: boolean
  deleted_at: string
  deleted_by_name: string | null
  purge_at: string
  purge_error: string | null
}

/** Tout ce qui est dans la corbeille, le plus récent d'abord. */
export async function listTrash(): Promise<TrashItem[]> {
  const { data, error } = await supabase
    .from("trash_items")
    .select(
      "item_type, id, kind, title, parent_title, trash_batch, batch_root, deleted_at, deleted_by_name, purge_at, purge_error"
    )
    .order("deleted_at", { ascending: false })
  if (error) throw toMediaError(error)
  return data as TrashItem[]
}

// ---------------------------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------------------------

/** Crée la ligne « pending » d'un envoi : la base renvoie le chemin exact où envoyer. */
export async function createMedia(file: PreparedFile): Promise<Media> {
  const { data, error } = await supabase.rpc("media_create", {
    kind: file.kind,
    name: file.name,
    mime: file.mime,
    size_bytes: file.blob.size,
    width: file.width ?? undefined,
    height: file.height ?? undefined,
    duration_s: file.durationS ?? undefined,
  })
  if (error) throw toMediaError(error)
  return toMedia(data)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Confirme un envoi : la base vérifie l'objet reçu. « fichier_absent » (l'objet n'est pas
 * encore visible) est réessayé quelques fois.
 */
export async function confirmMedia(
  mediaId: string,
  { attempts = 4, delayMs = 1000 } = {}
): Promise<Media> {
  for (let attempt = 1; ; attempt += 1) {
    const { data, error } = await supabase.rpc("media_confirm", {
      media_id: mediaId,
    })
    if (!error) return toMedia(data)
    const mediaError = toMediaError(error)
    if (mediaError.code !== "fichier_absent" || attempt >= attempts) {
      throw mediaError
    }
    await wait(delayMs)
  }
}

export type MediaChanges = {
  name?: string
  alt?: string | null
  transcript?: string | null
}

/** Modifie le nom, le texte alternatif ou la transcription (hors corbeille). */
export async function updateMedia(
  mediaId: string,
  changes: MediaChanges
): Promise<Media> {
  const { data, error } = await supabase
    .from("media")
    .update(changes)
    .eq("id", mediaId)
    .select("*")
    .maybeSingle()
  if (error) throw toMediaError(error)
  // Aucune ligne : le fichier est parti à la corbeille entre-temps (ou l'accès est perdu).
  if (!data) throw new MediaError("fichier_introuvable")
  return toMedia(data)
}

export async function trashMedia(mediaId: string): Promise<Media> {
  const { data, error } = await supabase.rpc("media_trash", {
    media_id: mediaId,
  })
  if (error) throw toMediaError(error)
  return toMedia(data)
}

export async function restoreMedia(mediaId: string): Promise<Media> {
  const { data, error } = await supabase.rpc("media_restore", {
    media_id: mediaId,
  })
  if (error) throw toMediaError(error)
  return toMedia(data)
}

/**
 * Sort un élément de la corbeille : un fichier, ou un contenu avec tout son lot, en brouillon
 * ([D18]). addressRemoved : une page revient sans adresse (une autre l'a prise entre-temps).
 */
export async function restoreTrashItem(
  item: TrashItem
): Promise<{ addressRemoved: boolean }> {
  if (item.item_type === "content") {
    const { addressRemoved } = await restoreContent(item.id)
    return { addressRemoved }
  }
  await restoreMedia(item.id)
  return { addressRemoved: false }
}

/**
 * Efface définitivement les éléments donnés de la corbeille. Renvoie le nombre d'éléments
 * concernés. Toujours une liste explicite : l'admin n'efface que ce que la personne a vu
 * (empty_trash sans liste viderait aussi ce qu'un autre membre vient d'y mettre).
 */
export async function emptyTrash(
  items: { type: TrashItem["item_type"]; id: string }[]
): Promise<number> {
  const { data, error } = await supabase.rpc("empty_trash", {
    items: items as unknown as Json,
  })
  if (error) throw toMediaError(error)
  return data
}

// ---------------------------------------------------------------------------------------------
// Fonction serveur « files »
// ---------------------------------------------------------------------------------------------

type FilesMode = "kick" | "audit" | "clean"

type KickSummary = { mode: "kick"; remaining: number }
type AuditSummary = { mode: "audit"; orphans: number }
type CleanSummary = { mode: "clean"; removed: number; orphans: number }

type FilesSummary<M extends FilesMode> = M extends "kick"
  ? KickSummary
  : M extends "audit"
    ? AuditSummary
    : CleanSummary

/** Appelle la fonction « files » avec la session du membre (effet immédiat, sans frein). */
export async function callFiles<M extends FilesMode>(
  mode: M
): Promise<FilesSummary<M>> {
  const { data, error } = await supabase.functions.invoke<FilesSummary<M>>(
    "files",
    { body: { mode } }
  )
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body: unknown = await (error.context as Response).json()
        const code = (body as { error?: { code?: unknown } } | null)?.error
          ?.code
        if (isMediaErrorCode(code)) throw new MediaError(code)
      } catch (parsed) {
        if (parsed instanceof MediaError) throw parsed
      }
    }
    throw new MediaError(null)
  }
  return data as FilesSummary<M>
}

let kickRunning: Promise<void> | null = null
let kickAgain = false

/**
 * Demande à la fonction « files » de faire tout de suite le travail en attente (vérifier les SVG
 * et Lottie, effacer ce qui a été vidé de la corbeille…). Les demandes rapprochées sont
 * regroupées. Un échec n'est pas grave : la tâche planifiée « fichiers » passe chaque minute.
 */
export function kickFiles(): Promise<void> {
  if (kickRunning) {
    kickAgain = true
    return kickRunning
  }
  kickRunning = callFiles("kick")
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      kickRunning = null
      if (kickAgain) {
        kickAgain = false
        void kickFiles()
      }
    })
  return kickRunning
}

/**
 * Abandonne un envoi (annulé ou en échec) : la ligne passe à la corbeille, son effacement est
 * demandé, et la fonction « files » efface ce qui a pu arriver. Sans effet visible dans la
 * corbeille. En cas d'échec, le nettoyage automatique (24 h) s'en chargera.
 */
export async function discardUpload(mediaId: string): Promise<void> {
  try {
    await trashMedia(mediaId)
    await emptyTrash([{ type: "file", id: mediaId }])
    await kickFiles()
  } catch {
    // Nettoyage automatique au bout de 24 h.
  }
}

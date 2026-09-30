// Publication d'un contenu (étape 5) : état en ligne, publier, programmer, retirer de l'app,
// historique, « Revenir à cette version », corbeille des contenus. Contrat :
// docs/ARCHITECTURE-CONTENUS.md (« Étape 5 », parties n° 1 et n° 2).

import { toContentError, type SavedDraft } from "@/lib/contents/api"
import { displayName, type PersonName } from "@/lib/people"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// ---------------------------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------------------------

/** La version que lit l'app. */
export type LiveVersion = {
  id: string
  number: number
  draft_rev: number
  published_at: string
  published_by_name: string | null
  slug: string | null
  access_level_id: string | null
  // Méthode : le plan figé (chapitres et leçons en ligne, § 1.8), null sinon.
  outline: unknown
}

/** L'état de publication d'un contenu (colonnes de contents et version en ligne). */
export type Publication = {
  id: string
  draft_rev: number
  first_published_at: string | null
  scheduled_at: string | null
  scheduled_by_name: string | null
  schedule_error: string | null
  deleted_at: string | null
  live: LiveVersion | null
}

export async function getPublication(id: string): Promise<Publication | null> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(
      "id, draft_rev, first_published_at, scheduled_at, schedule_error, deleted_at, scheduler:profiles!contents_scheduled_by_fkey(full_name, email), live:versions!contents_live_version_fkey(id, number, draft_rev, published_at, published_by_name, slug, access_level_id, outline)"
    )
    .eq("id", id)
    .maybeSingle()
  if (error) throw toContentError(error, status)
  if (!data) return null
  return {
    id: data.id,
    draft_rev: data.draft_rev,
    first_published_at: data.first_published_at,
    scheduled_at: data.scheduled_at,
    scheduled_by_name: displayName(data.scheduler as PersonName | null),
    schedule_error: data.schedule_error,
    deleted_at: data.deleted_at,
    live: (data.live as LiveVersion | null) ?? null,
  }
}

type VersionOrigin = keyof typeof texts.publication.history.origins

/** Une version de l'historique. */
export type VersionItem = {
  id: string
  number: number
  origin: VersionOrigin | string
  published_at: string
  published_by_name: string | null
  draft_rev: number
  /** Les catégories de la version (article, épisode) ; un identifiant peut ne plus exister. */
  category_ids: string[]
}

/** Le libellé de l'origine d'une version (« Publiée », « Publiée à l'heure programmée »…). */
export function versionOriginLabel(origin: string): string {
  const origins = texts.publication.history.origins
  return Object.hasOwn(origins, origin)
    ? origins[origin as VersionOrigin]
    : origins.manual
}

/** L'historique d'un contenu, la version la plus récente d'abord. */
export async function listVersions(contentId: string): Promise<VersionItem[]> {
  const { data, error, status } = await supabase
    .from("versions")
    .select(
      "id, number, origin, published_at, published_by_name, draft_rev, category_ids"
    )
    .eq("content_id", contentId)
    .order("number", { ascending: false })
    .limit(500)
  if (error) throw toContentError(error, status)
  return data
}

// ---------------------------------------------------------------------------------------------
// État affiché (barre de publication, liste des pages)
// ---------------------------------------------------------------------------------------------

export type LiveState =
  | "draft" // jamais publié
  | "withdrawn" // publié autrefois, retiré de l'app
  | "live" // en ligne, le brouillon n'a pas changé depuis
  | "modified" // en ligne, le brouillon a changé depuis la publication

export type ScheduleState =
  | { kind: "none" }
  // Programmé, l'heure n'est pas encore venue.
  | { kind: "scheduled"; at: string }
  // L'heure est passée. Tant que overdue est faux, la tâche planifiée (chaque minute) n'est
  // peut-être pas encore passée ; ensuite, elle attend que la personne qui écrit ait quitté
  // l'éditeur ([D31]).
  | { kind: "waiting"; at: string; overdue: boolean }
  | { kind: "failed"; code: string }

export type PublicationStatus = { live: LiveState; schedule: ScheduleState }

// La tâche « publications » passe chaque minute : dans les deux minutes qui suivent l'heure
// prévue, une programmation encore là est peut-être seulement en train de partir.
export const SCHEDULE_GRACE_MS = 2 * 60_000

/**
 * L'état de publication : en ligne ou non, modifié depuis la publication (la révision du
 * brouillon n'est plus celle de la version en ligne, ou un changement attend d'être
 * enregistré), et la programmation.
 */
export function publicationStatus(
  publication: {
    live: { draft_rev: number } | null
    first_published_at: string | null
    scheduled_at: string | null
    schedule_error: string | null
  },
  draftRev: number,
  now: number,
  unsaved = false
): PublicationStatus {
  let live: LiveState
  if (!publication.live) {
    live = publication.first_published_at ? "withdrawn" : "draft"
  } else {
    live =
      unsaved || draftRev !== publication.live.draft_rev ? "modified" : "live"
  }
  let schedule: ScheduleState = { kind: "none" }
  if (publication.scheduled_at) {
    schedule =
      new Date(publication.scheduled_at).getTime() > now
        ? { kind: "scheduled", at: publication.scheduled_at }
        : {
            kind: "waiting",
            at: publication.scheduled_at,
            overdue:
              now - new Date(publication.scheduled_at).getTime() >
              SCHEDULE_GRACE_MS,
          }
  } else if (publication.schedule_error) {
    schedule = { kind: "failed", code: publication.schedule_error }
  }
  return { live, schedule }
}

/** La raison d'un échec de programmation, en français (code de schedule_error). */
export function scheduleErrorText(code: string): string {
  const own = texts.publication.scheduleErrors
  if (Object.hasOwn(own, code)) return own[code as keyof typeof own]
  const errors = texts.editor.errors
  if (Object.hasOwn(errors, code)) {
    const text = errors[code as keyof typeof errors]
    // « Choisis l'adresse… » → « choisis l'adresse… » après « Raison : ».
    return text.charAt(0).toLowerCase() + text.slice(1)
  }
  return own.erreur_inattendue
}

// ---------------------------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------------------------

type Published = {
  versionId: string
  versionNumber: number
  publishedAt: string
  // Des fichiers doivent changer d'emplacement : appeler kickFiles().
  needsFileSync: boolean
}

/**
 * Publie le brouillon enregistré à la révision expectedRev (celle que l'éditeur vient
 * d'enregistrer, ou qu'il affiche).
 */
export async function publishContent(
  contentId: string,
  expectedRev: number
): Promise<Published> {
  const { data, error, status } = await supabase
    .rpc("publish", { content_id: contentId, expected_rev: expectedRev })
    .single()
  if (error) throw toContentError(error, status)
  return {
    versionId: data.version_id,
    versionNumber: data.version_number,
    publishedAt: data.published_at,
    needsFileSync: data.needs_file_sync,
  }
}

/** Retire de l'app (l'historique est gardé). Renvoie needs_file_sync. */
export async function unpublishContent(contentId: string): Promise<boolean> {
  const { data, error, status } = await supabase.rpc("unpublish", {
    content_id: contentId,
  })
  if (error) throw toContentError(error, status)
  return data
}

/** Programme la publication à cet instant (remplace une programmation existante). */
export async function scheduleContent(
  contentId: string,
  at: Date
): Promise<string> {
  const { data, error, status } = await supabase.rpc("schedule", {
    content_id: contentId,
    at: at.toISOString(),
  })
  if (error) throw toContentError(error, status)
  return data
}

/** Annule la programmation (ou efface son échec). */
export async function unscheduleContent(contentId: string): Promise<boolean> {
  const { data, error, status } = await supabase.rpc("unschedule", {
    content_id: contentId,
  })
  if (error) throw toContentError(error, status)
  return data
}

type RevertWarning = keyof typeof texts.publication.history.warnings

type Reverted = SavedDraft & { warnings: RevertWarning[] }

/** Recopie une version dans le brouillon (il faut tenir le verrou depuis cette ouverture). */
export async function revertToVersion(
  versionId: string,
  session: string
): Promise<Reverted> {
  const { data, error, status } = await supabase
    .rpc("revert_to_version", {
      version_id: versionId,
      editor_session: session,
    })
    .single()
  if (error) throw toContentError(error, status)
  const known = texts.publication.history.warnings
  return {
    rev: data.draft_rev,
    savedAt: data.draft_saved_at,
    warnings: (data.warnings ?? []).filter(
      (warning): warning is RevertWarning => Object.hasOwn(known, warning)
    ),
  }
}

export type Trashed = {
  batch: string
  trashed: number
  needsFileSync: boolean
}

/** Met un contenu à la corbeille (il sort de l'app, sa programmation est annulée). */
export async function trashContent(contentId: string): Promise<Trashed> {
  const { data, error, status } = await supabase
    .rpc("trash", { content_id: contentId })
    .single()
  if (error) throw toContentError(error, status)
  return {
    batch: data.trash_batch,
    trashed: data.trashed,
    needsFileSync: data.needs_file_sync,
  }
}

type Restored = { restored: number; addressRemoved: boolean }

/** Restaure un contenu (et tout son lot) en brouillon, sans le republier ([D18]). */
export async function restoreContent(contentId: string): Promise<Restored> {
  const { data, error, status } = await supabase
    .rpc("restore", { content_id: contentId })
    .single()
  if (error) throw toContentError(error, status)
  return {
    restored: data.restored,
    addressRemoved: (data.warnings ?? []).includes("adresse_retiree"),
  }
}

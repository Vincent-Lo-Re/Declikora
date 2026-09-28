// Accueil (étape 7) : mes brouillons récents, publications programmées (en attente comprises) et
// programmations échouées. Lecture directe de contents, réservée à l'équipe en aal2 par la RLS
// (contrat : docs/ARCHITECTURE-CONTENUS.md, « Étape 7, partie 7a »).

import { toContentError, type ContentKind } from "@/lib/contents/api"
import { supabase } from "@/lib/supabase"

type ProfileName = { full_name: string | null; email: string } | null

function nameOf(profile: ProfileName): string | null {
  if (!profile) return null
  return profile.full_name?.trim() || profile.email
}

export const homeKeys = {
  all: ["contents", "home"] as const,
  drafts: (userId: string) => ["contents", "home", "drafts", userId] as const,
  scheduled: ["contents", "home", "scheduled"] as const,
  failed: ["contents", "home", "failed"] as const,
}

/** Un contenu de l'Accueil, avec ce qu'il faut pour son état de publication. */
export type HomeItem = {
  id: string
  kind: ContentKind
  title: string
  draft_rev: number
  draft_saved_at: string
  live_draft_rev: number | null
  first_published_at: string | null
  scheduled_at: string | null
  schedule_error: string | null
  scheduled_set_at: string | null
  scheduled_by_name: string | null
  // Un chapitre ou une leçon : le titre de sa méthode (ils n'ont pas d'état propre dans l'app).
  method_title: string | null
}

const COLUMNS =
  "id, kind, title, draft_rev, draft_saved_at, first_published_at, scheduled_at, scheduled_set_at, schedule_error, scheduler:profiles!contents_scheduled_by_fkey(full_name, email), live:versions!contents_live_version_fkey(draft_rev), parent_id"

type Row = {
  id: string
  kind: string
  title: string | null
  draft_rev: number
  draft_saved_at: string
  first_published_at: string | null
  scheduled_at: string | null
  scheduled_set_at: string | null
  schedule_error: string | null
  scheduler: unknown
  live: unknown
  parent_id: string | null
}

function toItem(row: Row): HomeItem {
  const live = row.live as { draft_rev: number } | null
  return {
    id: row.id,
    kind: row.kind as ContentKind,
    title: row.title ?? "",
    draft_rev: row.draft_rev,
    draft_saved_at: row.draft_saved_at,
    live_draft_rev: live?.draft_rev ?? null,
    first_published_at: row.first_published_at,
    scheduled_at: row.scheduled_at,
    scheduled_set_at: row.scheduled_set_at,
    schedule_error: row.schedule_error,
    scheduled_by_name: nameOf(row.scheduler as ProfileName),
    method_title: null,
  }
}

/**
 * Le titre de la méthode de chaque chapitre et de chaque leçon (l'API ne sait pas remonter
 * d'une ligne de contents à son parent : deux petites lectures, par identifiants).
 */
async function withMethodTitles(rows: Row[]): Promise<HomeItem[]> {
  const items = rows.map(toItem)
  const parentIds = new Set(
    rows.flatMap((row) =>
      (row.kind === "chapter" || row.kind === "lesson") && row.parent_id
        ? [row.parent_id]
        : []
    )
  )
  if (parentIds.size === 0) return items
  const parents = new Map<string, { title: string; parent_id: string | null }>()
  const read = async (ids: string[]) => {
    const { data, error, status } = await supabase
      .from("contents")
      .select("id, title, parent_id")
      .in("id", ids)
    if (error) throw toContentError(error, status)
    for (const row of data) {
      parents.set(row.id, { title: row.title ?? "", parent_id: row.parent_id })
    }
  }
  await read([...parentIds])
  // Une leçon : son parent est un chapitre, la méthode est un cran plus haut.
  const methodIds = rows.flatMap((row) =>
    row.kind === "lesson" && row.parent_id
      ? [parents.get(row.parent_id)?.parent_id ?? null].filter(
          (id): id is string => id !== null && !parents.has(id)
        )
      : []
  )
  if (methodIds.length > 0) await read([...new Set(methodIds)])
  return items.map((item, index) => {
    const parentId = rows[index].parent_id
    const parent = parentId ? parents.get(parentId) : undefined
    if (item.kind === "chapter") {
      return { ...item, method_title: parent?.title ?? null }
    }
    if (item.kind === "lesson") {
      const method = parent?.parent_id
        ? parents.get(parent.parent_id)
        : undefined
      return { ...item, method_title: method?.title ?? null }
    }
    return item
  })
}

// Combien de brouillons récents l'Accueil montre.
export const RECENT_DRAFTS = 8

/**
 * Mes brouillons récents : les contenus que j'ai enregistrés en dernier (hors corbeille). Les
 * modèles n'en font pas partie : ce ne sont pas des contenus de l'app.
 */
export async function listMyRecentDrafts(
  userId: string,
  limit = RECENT_DRAFTS
): Promise<HomeItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(COLUMNS)
    .eq("draft_saved_by", userId)
    .is("deleted_at", null)
    .neq("kind", "template")
    .order("draft_saved_at", { ascending: false })
    .limit(limit)
  if (error) throw toContentError(error, status)
  return withMethodTitles(data as Row[])
}

/**
 * Les publications programmées, dans l'ordre où elles partiront. Celles dont l'heure est passée
 * attendent que la personne qui écrit ait quitté l'éditeur ([D31]).
 */
export async function listScheduled(): Promise<HomeItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(COLUMNS)
    .not("scheduled_at", "is", null)
    .is("deleted_at", null)
    .order("scheduled_at")
    .limit(200)
  if (error) throw toContentError(error, status)
  return (data as Row[]).map(toItem)
}

/**
 * Les programmations échouées : « Effacer l'échec » les retire. L'échec efface scheduled_at et
 * scheduled_set_at (private.run_due_publications) : on trie donc sur ce qu'il garde, le dernier
 * brouillon enregistré d'abord, puis l'identifiant, pour un ordre stable d'une relecture à l'autre.
 */
export async function listFailedSchedules(): Promise<HomeItem[]> {
  const { data, error, status } = await supabase
    .from("contents")
    .select(COLUMNS)
    .is("scheduled_at", null)
    .not("schedule_error", "is", null)
    .is("deleted_at", null)
    .order("draft_saved_at", { ascending: false })
    .order("id")
    .limit(200)
  if (error) throw toContentError(error, status)
  return (data as Row[]).map(toItem)
}

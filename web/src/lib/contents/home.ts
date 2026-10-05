// Accueil (étape 7) : mes brouillons récents, publications programmées (en attente comprises) et
// programmations échouées. Lecture directe de contents, réservée à l'équipe en aal2 par la RLS
// (contrat : docs/ARCHITECTURE-CONTENUS.md, « Étape 7, partie 7a »).

import { toContentError, type ContentKind } from "@/lib/contents/api"
import { displayName, type PersonName } from "@/lib/people"
import { supabase } from "@/lib/supabase"

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
    scheduled_by_name: displayName(row.scheduler as PersonName | null),
    method_title: null,
  }
}

// Les sortes qui appartiennent à une méthode.
const METHOD_ELEMENTS = new Set(["chapter", "lesson", "exercise"])

/**
 * Le titre de la méthode de chaque chapitre, leçon et exercice (l'API ne sait pas remonter d'une
 * ligne de contents à son parent : de petites lectures, par identifiants, un cran à la fois ; trois
 * au plus, d'un exercice à sa méthode).
 */
async function withMethodTitles(rows: Row[]): Promise<HomeItem[]> {
  const items = rows.map(toItem)
  const parents = new Map<
    string,
    { kind: string; title: string; parent_id: string | null }
  >()
  let wanted = new Set(
    rows.flatMap((row) =>
      METHOD_ELEMENTS.has(row.kind) && row.parent_id ? [row.parent_id] : []
    )
  )
  while (wanted.size > 0) {
    const { data, error, status } = await supabase
      .from("contents")
      .select("id, kind, title, parent_id")
      .in("id", [...wanted])
    if (error) throw toContentError(error, status)
    for (const row of data) {
      parents.set(row.id, {
        kind: row.kind,
        title: row.title ?? "",
        parent_id: row.parent_id,
      })
    }
    wanted = new Set(
      data.flatMap((row) =>
        row.kind !== "method" && row.parent_id && !parents.has(row.parent_id)
          ? [row.parent_id]
          : []
      )
    )
  }
  return items.map((item, index) => {
    if (!METHOD_ELEMENTS.has(item.kind)) return item
    let parentId = rows[index].parent_id
    let parent = parentId ? parents.get(parentId) : undefined
    while (parent && parent.kind !== "method") {
      parentId = parent.parent_id
      parent = parentId ? parents.get(parentId) : undefined
    }
    return { ...item, method_title: parent?.title ?? null }
  })
}

// Combien de brouillons récents l'Accueil montre.
const RECENT_DRAFTS = 8

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

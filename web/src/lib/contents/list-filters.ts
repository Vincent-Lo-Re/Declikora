// Recherche et filtres des listes de contenus (Pages, Blog, Podcasts), sans React.

import type { ContentListItem } from "@/lib/contents/api"
import {
  publicationStatus,
  type PublicationStatus,
} from "@/lib/contents/publication"

/** Les filtres par état, dans l'ordre du menu. */
export const stateFilters = [
  "all",
  "draft",
  "live",
  "modified",
  "withdrawn",
  "scheduled",
  "failed",
] as const

export type StateFilter = (typeof stateFilters)[number]

export function isStateFilter(value: unknown): value is StateFilter {
  return (
    typeof value === "string" &&
    (stateFilters as readonly string[]).includes(value)
  )
}

/** Le filtre par catégorie : toutes, sans catégorie, ou l'identifiant d'une catégorie. */
export const ALL_CATEGORIES = "all"
export const NO_CATEGORY = "none"

export type ListFilters = {
  search: string
  state: StateFilter
  // ALL_CATEGORIES, NO_CATEGORY ou l'identifiant d'une catégorie.
  category: string
}

export const noFilters: ListFilters = {
  search: "",
  state: "all",
  category: ALL_CATEGORIES,
}

/** L'état de publication d'une ligne de la liste, à l'heure de la lecture (now). */
export function itemStatus(
  item: ContentListItem,
  now: number
): PublicationStatus {
  return publicationStatus(
    {
      live:
        item.live_draft_rev === null
          ? null
          : { draft_rev: item.live_draft_rev },
      first_published_at: item.first_published_at,
      scheduled_at: item.scheduled_at,
      schedule_error: item.schedule_error,
    },
    item.draft_rev,
    now
  )
}

/** Vrai si l'état de publication correspond au filtre. */
function matchesState(status: PublicationStatus, filter: StateFilter): boolean {
  switch (filter) {
    case "all":
      return true
    case "draft":
    case "live":
    case "modified":
    case "withdrawn":
      return status.live === filter
    case "scheduled":
      // Programmé, ou en attente (l'heure est passée, quelqu'un écrit : [D31]).
      return (
        status.schedule.kind === "scheduled" ||
        status.schedule.kind === "waiting"
      )
    case "failed":
      return status.schedule.kind === "failed"
  }
}

/** Minuscules, sans accents : « Été » trouve « ete ». */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

/**
 * Les lignes qui correspondent à la recherche (dans le titre, et dans l'adresse d'une page) et
 * aux filtres. Une catégorie supprimée entre-temps ne compte plus (knownCategories : les
 * catégories qui existent encore, ou undefined tant qu'elles ne sont pas lues).
 */
export function filterContents(
  items: readonly ContentListItem[],
  filters: ListFilters,
  now: number,
  knownCategories?: ReadonlySet<string>
): ContentListItem[] {
  const words = normalizeSearch(filters.search).split(/\s+/).filter(Boolean)
  return items.filter((item) => {
    if (words.length > 0) {
      const haystack = normalizeSearch(`${item.title} ${item.slug ?? ""}`)
      if (!words.every((word) => haystack.includes(word))) return false
    }
    if (!matchesState(itemStatus(item, now), filters.state)) return false
    if (filters.category !== ALL_CATEGORIES) {
      const ids = knownCategories
        ? item.category_ids.filter((id) => knownCategories.has(id))
        : item.category_ids
      if (filters.category === NO_CATEGORY) return ids.length === 0
      return ids.includes(filters.category)
    }
    return true
  })
}

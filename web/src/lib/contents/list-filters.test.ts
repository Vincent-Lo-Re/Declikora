import { describe, expect, it } from "vitest"

import type { ContentListItem } from "@/lib/contents/api"
import {
  ALL_CATEGORIES,
  filterContents,
  NO_CATEGORY,
  noFilters,
  normalizeSearch,
} from "@/lib/contents/list-filters"

const NOW = new Date("2026-09-28T12:00:00Z").getTime()
const SOMMEIL = "00000000-0000-4000-8000-00000000c001"
const STRESS = "00000000-0000-4000-8000-00000000c002"
const SUPPRIMEE = "00000000-0000-4000-8000-00000000c003"

function item(
  id: string,
  title: string,
  changes: Partial<ContentListItem> = {}
): ContentListItem {
  return {
    id,
    title,
    slug: null,
    cover_id: null,
    category_ids: [],
    draft_rev: 3,
    draft_saved_at: "2026-09-27T12:30:00Z",
    saved_by_name: null,
    editing_name: null,
    live_draft_rev: null,
    first_published_at: null,
    scheduled_at: null,
    schedule_error: null,
    access_chosen: false,
    access_level_id: null,
    ...changes,
  }
}

const items = [
  item("brouillon", "Bien dormir en été", { category_ids: [SOMMEIL] }),
  item("en-ligne", "Le stress au travail", {
    category_ids: [STRESS],
    live_draft_rev: 3,
    first_published_at: "2026-09-20T08:00:00Z",
  }),
  item("modifie", "Respirer", {
    category_ids: [SOMMEIL, STRESS],
    live_draft_rev: 2,
    first_published_at: "2026-09-20T08:00:00Z",
  }),
  item("retire", "Ancien article", {
    first_published_at: "2026-09-01T08:00:00Z",
  }),
  item("programme", "À venir", {
    scheduled_at: "2026-09-29T06:00:00Z",
    category_ids: [SUPPRIMEE],
  }),
  item("en-attente", "En attente", {
    scheduled_at: "2026-09-28T10:00:00Z",
  }),
  item("echec", "Échec", { schedule_error: "image_de_presentation_manquante" }),
  item("page", "Mentions légales", { slug: "mentions-legales" }),
]

const ids = (list: ContentListItem[]) => list.map((entry) => entry.id)

describe("recherche", () => {
  it("ignore les majuscules et les accents", () => {
    expect(normalizeSearch("  Été À ")).toBe("ete a")
    expect(
      ids(filterContents(items, { ...noFilters, search: "ETE" }, NOW))
    ).toEqual(["brouillon"])
  })

  it("cherche chaque mot, dans le titre et dans l'adresse d'une page", () => {
    expect(
      ids(
        filterContents(items, { ...noFilters, search: "stress travail" }, NOW)
      )
    ).toEqual(["en-ligne"])
    expect(
      ids(filterContents(items, { ...noFilters, search: "legales" }, NOW))
    ).toEqual(["page"])
    expect(
      ids(filterContents(items, { ...noFilters, search: "mentions-leg" }, NOW))
    ).toEqual(["page"])
  })

  it("sans recherche ni filtre, tout reste", () => {
    expect(filterContents(items, noFilters, NOW)).toHaveLength(items.length)
  })
})

describe("filtre par état", () => {
  const by = (state: (typeof noFilters)["state"]) =>
    ids(filterContents(items, { ...noFilters, state }, NOW))

  it("brouillons, en ligne, modifiés, retirés", () => {
    expect(by("draft")).toEqual([
      "brouillon",
      "programme",
      "en-attente",
      "echec",
      "page",
    ])
    expect(by("live")).toEqual(["en-ligne"])
    expect(by("modified")).toEqual(["modifie"])
    expect(by("withdrawn")).toEqual(["retire"])
  })

  it("programmés (en attente compris, [D31]) et échecs", () => {
    expect(by("scheduled")).toEqual(["programme", "en-attente"])
    expect(by("failed")).toEqual(["echec"])
  })
})

describe("méthodes ([D29])", () => {
  it("« modifié » vient de la liste des changements, pas de la seule fiche", () => {
    const live = {
      live_draft_rev: 3,
      first_published_at: "2026-09-20T08:00:00Z",
    }
    const methods = [
      // La fiche n'a pas changé, mais une leçon oui.
      item("lecon", "Leçon modifiée", { ...live, pending_changes: true }),
      // La fiche a changé puis est revenue à l'identique : rien à publier.
      item("identique", "Rien à publier", {
        ...live,
        draft_rev: 5,
        pending_changes: false,
      }),
      // Pas encore lu : la révision de la fiche.
      item("inconnu", "Pas encore lu", { ...live }),
    ]
    const titles = (state: "live" | "modified") =>
      filterContents(methods, { ...noFilters, state }, NOW).map(
        (entry) => entry.title
      )
    expect(titles("modified")).toEqual(["Leçon modifiée"])
    expect(titles("live")).toEqual(["Rien à publier", "Pas encore lu"])
  })
})

describe("filtre par catégorie", () => {
  it("une catégorie, ou aucune ([D44])", () => {
    expect(
      ids(filterContents(items, { ...noFilters, category: SOMMEIL }, NOW))
    ).toEqual(["brouillon", "modifie"])
    expect(
      ids(filterContents(items, { ...noFilters, category: NO_CATEGORY }, NOW))
      // Sans la liste des catégories, un identifiant inconnu compte encore.
    ).toEqual(["retire", "en-attente", "echec", "page"])
  })

  it("une catégorie supprimée ne compte plus ([D28])", () => {
    const known = new Set([SOMMEIL, STRESS])
    const without = filterContents(
      items,
      { ...noFilters, category: NO_CATEGORY },
      NOW,
      known
    )
    expect(ids(without)).toContain("programme")
    expect(
      ids(
        filterContents(items, { ...noFilters, category: SUPPRIMEE }, NOW, known)
      )
    ).toEqual([])
  })

  it("se combine avec la recherche et l'état", () => {
    expect(
      ids(
        filterContents(
          items,
          {
            search: "respirer",
            state: "modified",
            category: STRESS,
          },
          NOW
        )
      )
    ).toEqual(["modifie"])
    expect(
      filterContents(
        items,
        { search: "respirer", state: "live", category: ALL_CATEGORIES },
        NOW
      )
    ).toEqual([])
  })
})

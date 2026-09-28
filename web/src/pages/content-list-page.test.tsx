import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"

// Listes du Blog, des Podcasts et des Pages (étape 7) : colonnes, recherche, filtres, création
// (vide ou point de départ, [D42]) et corbeille. La base est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    listContents: vi.fn(),
    createContent: vi.fn(),
    getContent: vi.fn(async () => null),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    lockRelease: vi.fn(async () => true),
    lockReleaseOnExit: vi.fn(),
    subscribeLock: vi.fn(() => () => {}),
  }
})

vi.mock("@/lib/contents/publication", async (importOriginal) => {
  const actual = await importOriginal<typeof publicationApi>()
  return {
    ...actual,
    getPublication: vi.fn(async () => null),
    trashContent: vi.fn(),
    restoreContent: vi.fn(),
  }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return { ...actual, listStarters: vi.fn(async () => []) }
})

vi.mock("@/lib/categories", async (importOriginal) => {
  const actual = await importOriginal<typeof categoriesApi>()
  return { ...actual, listCategories: vi.fn() }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return { ...actual, kickFiles: vi.fn(async () => {}) }
})

const labels = texts.contentList
const SOMMEIL = "00000000-0000-4000-8000-00000000c001"
const STRESS = "00000000-0000-4000-8000-00000000c002"
const ARTICLE = "00000000-0000-4000-8000-0000000000a1"
const INTERVIEW = "00000000-0000-4000-8000-0000000000a9"

function row(
  id: string,
  title: string,
  changes: Partial<api.ContentListItem> = {}
): api.ContentListItem {
  return {
    id,
    title,
    slug: null,
    category_ids: [],
    draft_rev: 3,
    draft_saved_at: "2026-09-27T12:30:00Z",
    saved_by_name: "Anne Admin",
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

const articles = [
  row(ARTICLE, "Bien dormir en été", {
    category_ids: [STRESS, SOMMEIL],
    live_draft_rev: 3,
    first_published_at: "2026-09-20T08:00:00Z",
  }),
  row("00000000-0000-4000-8000-0000000000a2", "Le stress au travail", {
    category_ids: [STRESS],
    editing_name: "Claire Martin",
  }),
  row("00000000-0000-4000-8000-0000000000a3", "Sans rangement"),
]

beforeEach(() => {
  vi.mocked(categoriesApi.listCategories).mockResolvedValue([
    { id: SOMMEIL, name: "Sommeil", position: 0, uses: 1 },
    { id: STRESS, name: "Stress", position: 1, uses: 2 },
  ])
})

afterEach(() => vi.clearAllMocks())

/** Les titres des lignes affichées, dans l'ordre. */
function shownTitles(): string[] {
  const table = screen.getByRole("table")
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((line) => within(line).getAllByRole("cell")[0].textContent ?? "")
}

/** Choisit une option d'un filtre (liste déroulante). */
async function pick(filter: string, option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: filter }))
  const choice = await screen.findByRole("option", { name: option })
  // Base UI ne retient un clic de souris que s'il a commencé sur l'option.
  fireEvent.pointerDown(choice, { pointerType: "mouse" })
  fireEvent.click(choice)
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
}

describe("Blog", () => {
  it("liste les articles avec leurs catégories, dans l'ordre de la section", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    renderApp("/blog")

    const link = await screen.findByRole("link", { name: "Bien dormir en été" })
    expect(link).toHaveAttribute("href", `/blog/${ARTICLE}`)
    expect(api.listContents).toHaveBeenCalledWith("article")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    const first = link.closest("tr")!
    await waitFor(() =>
      expect(
        within(first)
          .getAllByText(/Sommeil|Stress/)
          .map((badge) => badge.textContent)
      ).toEqual(["Sommeil", "Stress"])
    )
    expect(within(first).getByText(texts.publication.status.live)).toBeVisible()
    const last = screen
      .getByRole("link", { name: "Sans rangement" })
      .closest("tr")!
    expect(within(last).getByText(labels.noCategory)).toBeVisible()
    expect(
      screen.getByText(labels.beingEdited("Claire Martin"))
    ).toBeInTheDocument()
    expect(screen.getByText(labels.count(3, 3))).toBeVisible()
    // Les catégories se gèrent sur leur propre écran.
    expect(
      screen.getByRole("link", { name: labels.manageCategories })
    ).toHaveAttribute("href", "/blog/categories")
  })

  it("cherche et filtre par état et par catégorie", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    renderApp("/blog")
    await screen.findByRole("link", { name: "Bien dormir en été" })

    fireEvent.change(
      screen.getByRole("searchbox", { name: labels.kinds.article.search }),
      { target: { value: "TRAVAIL" } }
    )
    await waitFor(() => expect(shownTitles()).toEqual(["Le stress au travail"]))
    expect(screen.getByText(labels.count(1, 3))).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: labels.filters.reset }))
    await waitFor(() => expect(shownTitles()).toHaveLength(3))

    await pick(labels.filters.state, labels.filters.states.live)
    await waitFor(() => expect(shownTitles()).toEqual(["Bien dormir en été"]))

    await pick(labels.filters.state, labels.filters.states.all)
    await pick(labels.filters.category, "Stress")
    await waitFor(() =>
      expect(shownTitles()).toEqual([
        "Bien dormir en été",
        "Le stress au travail",
      ])
    )
    // [D44] : un article peut n'avoir aucune catégorie.
    await pick(labels.filters.category, labels.filters.noCategory)
    await waitFor(() => expect(shownTitles()).toEqual(["Sans rangement"]))

    await pick(labels.filters.state, labels.filters.states.draft)
    await pick(labels.filters.category, "Sommeil")
    expect(
      await screen.findByText(labels.kinds.article.noResults)
    ).toBeVisible()
  })

  it("« Nouvel article » propose un article vide ou les points de départ du Blog ([D42])", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    vi.mocked(templatesApi.listStarters).mockResolvedValue([
      { id: INTERVIEW, title: "Interview" },
    ])
    vi.mocked(api.createContent).mockResolvedValue({
      id: ARTICLE,
      kind: "article",
      title: "",
      draft: { v: 1, title: "", blocks: [] },
      draft_rev: 1,
      draft_saved_at: "2026-09-28T08:00:00Z",
      deleted_at: null,
      parent_id: null,
      access_chosen: false,
      access_level_id: null,
      slug: null,
      template_sort: null,
      template_for: null,
      in_app: false,
      is_free: false,
      category_ids: [],
    })
    const { router } = renderApp("/blog")

    expect(
      await screen.findByText(labels.kinds.article.emptyTitle)
    ).toBeVisible()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: labels.kinds.article.create })
      ).toHaveAttribute("aria-haspopup", "menu")
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("article")
    fireEvent.click(
      screen.getByRole("button", { name: labels.kinds.article.create })
    )
    expect(
      await screen.findByRole("menuitem", { name: labels.kinds.article.blank })
    ).toBeVisible()
    fireEvent.click(screen.getByRole("menuitem", { name: "Interview" }))
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith("article", "", INTERVIEW)
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/blog/${ARTICLE}`)
    )
  })

  it("« Supprimer » met l'article à la corbeille, avec « Annuler »", async () => {
    vi.mocked(api.listContents).mockResolvedValue([articles[2]])
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "lot",
      trashed: 1,
      needsFileSync: true,
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    renderApp("/blog")
    fireEvent.click(
      await screen.findByRole("button", {
        name: labels.actions("Sans rangement"),
      })
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: labels.trash }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(labels.kinds.article.confirmTrashTitle)
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.confirmTrash.confirm })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(articles[2].id)
    )
    // L'image de présentation redevient peut-être protégée : tout de suite.
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())
    const toast = await screen.findByText(labels.trashed("Sans rangement"))
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", { name: labels.undo })
    )
    expect(
      await screen.findByText(labels.kinds.article.restored("Sans rangement"))
    ).toBeVisible()
  })
})

describe("Podcasts", () => {
  it("liste les épisodes avec les catégories des Podcasts", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row("00000000-0000-4000-8000-0000000000e1", "Entretien avec Claire"),
    ])
    renderApp("/podcasts")
    expect(
      await screen.findByRole("link", { name: "Entretien avec Claire" })
    ).toHaveAttribute("href", "/podcasts/00000000-0000-4000-8000-0000000000e1")
    expect(api.listContents).toHaveBeenCalledWith("episode")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("podcasts")
    expect(
      screen.getByRole("button", { name: labels.kinds.episode.create })
    ).toBeVisible()
  })
})

describe("Pages", () => {
  it("montre l'adresse de chaque page, sans filtre par catégorie", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row("00000000-0000-4000-8000-0000000000b1", "Mentions légales", {
        slug: "mentions-legales",
      }),
      row("00000000-0000-4000-8000-0000000000b2", "Aide"),
    ])
    renderApp("/pages")
    await screen.findByRole("link", { name: "Mentions légales" })
    expect(
      screen.getByRole("columnheader", { name: labels.columns.address })
    ).toBeVisible()
    expect(screen.getByText("mentions-legales")).toBeVisible()
    expect(screen.getByText(labels.noAddress)).toBeVisible()
    expect(
      screen.queryByRole("combobox", { name: labels.filters.category })
    ).toBeNull()
    expect(categoriesApi.listCategories).not.toHaveBeenCalled()

    // La recherche trouve aussi l'adresse.
    fireEvent.change(
      screen.getByRole("searchbox", { name: labels.kinds.page.search }),
      { target: { value: "legales" } }
    )
    await waitFor(() => expect(shownTitles()).toEqual(["Mentions légales"]))
  })
})

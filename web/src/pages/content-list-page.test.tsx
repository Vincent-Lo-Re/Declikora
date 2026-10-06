import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as levelsApi from "@/lib/access-levels"
import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"

// Listes du Blog, des Podcasts et des Pages (étape 7) : colonnes, recherche, filtres, création
// (vide ou point de départ, [D42]) et corbeille. La base est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    findPageBySlug: vi.fn(async () => null),
    listContents: vi.fn(),
    getMediaByIds: vi.fn(async () => []),
    createContent: vi.fn(),
    getContent: vi.fn(async () => null),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    saveDraft: vi.fn(async () => ({
      rev: 2,
      savedAt: "2026-09-28T08:01:00Z",
    })),
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
  return { ...actual, listCategories: vi.fn(), createCategory: vi.fn() }
})

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return {
    ...actual,
    listAccessLevels: vi.fn(async () => [
      {
        id: "00000000-0000-4000-8000-00000000f001",
        name: "Essentiel",
        rank: 1,
      },
    ]),
  }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return {
    ...actual,
    kickFiles: vi.fn(async () => {}),
    getPreviewUrls: vi.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, `blob:${key}`]))
    ),
  }
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
    cover_id: null,
    list_position: null,
    category_ids: [],
    draft_rev: 3,
    draft_saved_at: "2026-09-27T12:30:00Z",
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
  }),
  row("00000000-0000-4000-8000-0000000000a3", "Sans rangement"),
]

const newArticle: api.Content = {
  id: ARTICLE,
  kind: "article",
  title: "Bien respirer",
  draft: { v: 1, title: "Bien respirer", blocks: [] },
  draft_rev: 1,
  draft_saved_at: "2026-09-28T08:00:00Z",
  deleted_at: null,
  access_chosen: false,
  access_level_id: null,
  slug: null,
  template_sort: null,
  template_for: null,
  category_ids: [],
}

/** L'état d'un verrou : libre par défaut. */
function lockRow(changes: Partial<api.LockRow>): api.LockRow {
  return {
    mine: false,
    holder_id: null,
    holder_name: null,
    taken_at: null,
    heartbeat_at: null,
    is_active: false,
    draft_rev: 1,
    ...changes,
  }
}

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
    .map((line) => within(line).getAllByRole("link")[0].textContent ?? "")
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
    await renderApp("/blog")

    const link = await screen.findByRole("link", { name: "Bien dormir en été" })
    expect(link).toHaveAttribute("href", `/blog/${ARTICLE}`)
    expect(api.listContents).toHaveBeenCalledWith("article")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    const first = link.closest("tr")!
    // La première catégorie de la section, puis « +1 » pour l'autre (nommée pour les lecteurs
    // d'écran).
    await waitFor(() =>
      expect(within(first).getByText("Sommeil")).toBeVisible()
    )
    expect(
      within(first).getByText(labels.otherCategories("Stress"))
    ).toBeInTheDocument()
    expect(first).toHaveTextContent(labels.moreCategories(1))
    expect(within(first).getByText(texts.publication.status.live)).toBeVisible()
    const last = screen
      .getByRole("link", { name: "Sans rangement" })
      .closest("tr")!
    expect(within(last).getByText(labels.noCategory)).toBeVisible()
    expect(screen.getByText(labels.count(3, 3))).toBeVisible()
    // Les catégories se gèrent sur leur propre écran.
    expect(
      screen.getByRole("link", { name: labels.manageCategories })
    ).toHaveAttribute("href", "/blog/categories")
    // La liste est dans une carte blanche, sur le panneau gris de la page (ADMIN § 7).
    expect(
      screen.getByRole("table").closest('[data-slot="list-card"]')
    ).not.toBeNull()
    expect(
      screen.getByRole("table").closest('[data-slot="sidebar-inset"]')
    ).toHaveClass("bg-panel")
  })

  it("montre l'image de présentation de chaque article, sinon l'icône d'une image", async () => {
    const PLAGE = "00000000-0000-4000-8000-0000000000f1"
    vi.mocked(api.listContents).mockResolvedValue([
      row(ARTICLE, "Bien dormir en été", { cover_id: PLAGE }),
      row("00000000-0000-4000-8000-0000000000a3", "Sans image"),
    ])
    vi.mocked(api.getMediaByIds).mockResolvedValue([
      {
        id: PLAGE,
        kind: "image",
        status: "ready",
        deleted_at: null,
        is_public: false,
        path: `${PLAGE}/plage.webp`,
      } as unknown as Media,
    ])
    await renderApp("/blog")

    const withCover = (
      await screen.findByRole("link", { name: "Bien dormir en été" })
    ).closest("tr")!
    await waitFor(() =>
      expect(withCover.querySelector("img")).toHaveAttribute(
        "src",
        `blob:${mediaApi.previewKey({ is_public: false, path: `${PLAGE}/plage.webp` })}`
      )
    )
    expect(api.getMediaByIds).toHaveBeenCalledWith([PLAGE])
    const without = screen
      .getByRole("link", { name: "Sans image" })
      .closest("tr")!
    expect(without.querySelector("img")).toBeNull()
    expect(without.querySelector(".lucide-image")).not.toBeNull()
  })

  it("cherche et filtre par état et par catégorie", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    await renderApp("/blog")
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

  it("la recherche et les filtres sont dans l'adresse ; les changer ne fait pas d'étape au retour (QCM du 05/10/2026)", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    const { router } = await renderApp("/blog?recherche=travail&etat=brouillon")
    await waitFor(() => expect(shownTitles()).toEqual(["Le stress au travail"]))
    expect(
      screen.getByRole("searchbox", { name: labels.kinds.article.search })
    ).toHaveValue("travail")
    expect(
      screen.getByRole("combobox", { name: labels.filters.state })
    ).toHaveTextContent(labels.filters.states.draft)

    await pick(labels.filters.category, "Stress")
    expect(router.state.historyAction).toBe("REPLACE")
    expect(
      new URLSearchParams(router.state.location.search).get("categorie")
    ).toBe(STRESS)
    fireEvent.click(screen.getByRole("button", { name: labels.filters.reset }))
    await waitFor(() => expect(router.state.location.search).toBe(""))
  })

  it("en revenant d'un éditeur, la liste retrouve sa place et la ligne de l'article s'allume", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    vi.mocked(api.getContent).mockResolvedValue(newArticle)
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    vi.mocked(api.lockStatus).mockResolvedValue(lockRow({ mine: true }))
    await renderApp("/blog?etat=en-ligne")
    const link = await screen.findByRole("link", { name: "Bien dormir en été" })
    window.scrollTo(0, 420)
    fireEvent.scroll(window)

    fireEvent.click(link)
    // Un éditeur ouvert en avançant commence en haut.
    expect(
      await screen.findByLabelText(texts.editor.title.label)
    ).toBeInTheDocument()
    expect(window.scrollY).toBe(0)

    fireEvent.click(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    )
    await waitFor(() => expect(shownTitles()).toEqual(["Bien dormir en été"]))
    // Le filtre est gardé, la place retrouvée, et la ligne s'allume.
    expect(window.scrollY).toBe(420)
    await waitFor(() =>
      expect(
        document.querySelector(`[data-content-row="${ARTICLE}"]`)
      ).toHaveAttribute("data-returned")
    )
  })

  it("une liste ouverte depuis le menu commence en haut", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    await renderApp("/blog")
    await screen.findByRole("link", { name: "Bien dormir en été" })
    window.scrollTo(0, 300)
    fireEvent.scroll(window)
    fireEvent.click(
      screen.getByRole("link", { name: texts.sections.podcasts.title })
    )
    await waitFor(() => expect(window.scrollY).toBe(0))
  })

  it("la liste reste à l'écran pendant que l'éditeur se prépare ; au bout de 2 s, il s'affiche avec ses lignes grises", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    // Un brouillon qui n'arrive pas.
    vi.mocked(api.getContent).mockReturnValue(new Promise(() => {}))
    const { router } = await renderApp("/blog")
    fireEvent.click(
      await screen.findByRole("link", { name: "Bien dormir en été" })
    )

    // La liste reste nette ; la barre du haut n'apparaît qu'après un instant.
    expect(
      screen.queryByRole("progressbar", { name: texts.nav.pageLoading })
    ).toBeNull()
    expect(
      await screen.findByRole("progressbar", { name: texts.nav.pageLoading })
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe("/blog")
    expect(shownTitles()).toHaveLength(3)

    // Au bout de 2 secondes, l'éditeur quand même, avec des lignes grises à la place du brouillon :
    // l'écran a déjà sa forme (le plan, le téléphone, les cartes), le menu reste caché, et le
    // retour marche.
    const waiting = await screen.findByLabelText(
      texts.editor.loading,
      undefined,
      {
        timeout: 3000,
      }
    )
    expect(router.state.location.pathname).toBe(`/blog/${ARTICLE}`)
    expect(
      waiting.querySelector(".blocks-device .blocks-screen")
    ).not.toBeNull()
    expect(document.querySelectorAll("aside")).toHaveLength(2)
    expect(
      screen.queryByRole("navigation", { name: texts.nav.label })
    ).toBeNull()
    expect(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    ).toHaveAttribute("href", "/blog")
    expect(
      screen.queryByRole("progressbar", { name: texts.nav.pageLoading })
    ).toBeNull()
  })

  it("un article survolé est lu à l'avance ; ouvert, l'éditeur arrive avec son brouillon, sans lignes grises", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    vi.mocked(api.getContent).mockResolvedValue(newArticle)
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    vi.mocked(api.lockStatus).mockResolvedValue(lockRow({ mine: true }))
    await renderApp("/blog")
    const link = await screen.findByRole("link", { name: "Bien dormir en été" })

    // Survolé un instant (pas seulement traversé) : son brouillon est lu.
    fireEvent.pointerOver(link)
    await vi.waitFor(() => expect(api.getContent).toHaveBeenCalledWith(ARTICLE))

    // Les lignes grises de l'éditeur ne s'affichent jamais.
    let sawLoading = false
    const watch = new MutationObserver(() => {
      if (screen.queryByLabelText(texts.editor.loading)) sawLoading = true
    })
    watch.observe(document.body, { childList: true, subtree: true })
    fireEvent.click(link)
    expect(await screen.findByLabelText(texts.editor.title.label)).toHaveValue(
      "Bien respirer"
    )
    watch.disconnect()
    expect(sawLoading).toBe(false)
    // Lu une seule fois : au survol.
    expect(api.getContent).toHaveBeenCalledTimes(1)
  })

  it("d'une liste à l'autre, le menu ne bouge pas : le contenu s'ouvre à neuf, en fondu, sans la recherche de l'autre", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    const { router } = await renderApp("/blog?recherche=dormir")
    await waitFor(() => expect(shownTitles()).toEqual(["Bien dormir en été"]))
    const menu = screen.getByRole("navigation", { name: texts.nav.label })
    const content = screen
      .getByRole("heading", { level: 1 })
      .closest("[data-page-fade]")

    fireEvent.click(
      within(menu).getByRole("link", { name: texts.sections.podcasts.title })
    )
    await screen.findByRole("heading", {
      level: 1,
      name: texts.sections.podcasts.title,
    })
    // Le menu est le même ; le contenu est nouveau, et apparaît en fondu (index.css).
    expect(screen.getByRole("navigation", { name: texts.nav.label })).toBe(menu)
    const next = screen
      .getByRole("heading", { level: 1 })
      .closest("[data-page-fade]")
    expect(next).not.toBeNull()
    expect(next).not.toBe(content)
    // La recherche du Fil ne passe pas dans Radio Éclaircies.
    expect(router.state.location.search).toBe("")
    expect(await screen.findByRole("searchbox")).toHaveValue("")
    await waitFor(() => expect(shownTitles()).toHaveLength(3))
  })

  it("d'une liste à un éditeur, et retour : toute la page s'ouvre à neuf, en fondu", async () => {
    vi.mocked(api.listContents).mockResolvedValue(articles)
    vi.mocked(api.getContent).mockResolvedValue(newArticle)
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    vi.mocked(api.lockStatus).mockResolvedValue(lockRow({ mine: true }))
    await renderApp("/blog")
    const page = () => document.querySelector("[data-page-fade]")
    const list = page()

    fireEvent.click(
      await screen.findByRole("link", { name: "Bien dormir en été" })
    )
    await screen.findByLabelText(texts.editor.title.label)
    const editor = page()
    expect(editor).not.toBe(list)
    expect(editor).toContainElement(
      screen.getByLabelText(texts.editor.title.label)
    )
    // Le menu reste caché dans l'éditeur.
    expect(
      screen.queryByRole("navigation", { name: texts.nav.label })
    ).toBeNull()

    fireEvent.click(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    )
    await screen.findByRole("navigation", { name: texts.nav.label })
    expect(page()).not.toBe(editor)
  })

  it("« Nouvel article » : une fenêtre (titre, point de départ, catégories), puis l'éditeur", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    vi.mocked(templatesApi.listStarters).mockResolvedValue([
      { id: INTERVIEW, title: "Interview" },
    ])
    vi.mocked(api.createContent).mockResolvedValue(newArticle)
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    const { router } = await renderApp("/blog")

    expect(
      await screen.findByText(labels.kinds.article.emptyTitle)
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole("button", { name: labels.kinds.article.create })
    )
    const dialog = await screen.findByRole("dialog", {
      name: labels.kinds.article.create,
    })

    // Le titre est obligatoire.
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.kinds.article.submit })
    )
    expect(
      await within(dialog).findByText(texts.publication.settings.titleRequired)
    ).toBeVisible()
    expect(api.createContent).not.toHaveBeenCalled()

    fireEvent.change(
      within(dialog).getByLabelText(texts.publication.settings.titleLabel),
      { target: { value: "Bien respirer" } }
    )
    await pick(labels.newContent.starter, "Interview")
    fireEvent.click(
      await within(dialog).findByRole("checkbox", { name: "Sommeil" })
    )
    // Pas de niveau d'accès : il se règle ensuite.
    expect(
      within(dialog).queryByRole("radio", { name: /Essentiel/ })
    ).toBeNull()
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.kinds.article.submit })
    )

    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "article",
        "Bien respirer",
        INTERVIEW
      )
    )
    // Les réglages partent aussitôt, sous le verrou donné à la création, puis il est rendu.
    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith(
        ARTICLE,
        1,
        newArticle.draft,
        expect.any(String),
        { category_ids: [SOMMEIL] }
      )
    )
    expect(api.lockRelease).toHaveBeenCalledWith(ARTICLE, expect.any(String))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/blog/${ARTICLE}`)
    )
  })

  it("« Nouvel article » : une catégorie se crée dans la fenêtre, et elle est cochée", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    const created = {
      id: "00000000-0000-4000-8000-00000000c009",
      name: "Respiration",
      position: 2,
      uses: 0,
    }
    // Créée dans la base : la relecture de la liste la contient.
    vi.mocked(categoriesApi.createCategory).mockImplementation(async () => {
      vi.mocked(categoriesApi.listCategories).mockResolvedValue([
        { id: SOMMEIL, name: "Sommeil", position: 0, uses: 1 },
        { id: STRESS, name: "Stress", position: 1, uses: 2 },
        created,
      ])
      return created
    })
    await renderApp("/blog")
    fireEvent.click(
      await screen.findByRole("button", { name: labels.kinds.article.create })
    )
    const dialog = await screen.findByRole("dialog", {
      name: labels.kinds.article.create,
    })
    const name = await within(dialog).findByLabelText(texts.categories.name)
    fireEvent.change(name, { target: { value: "Respiration" } })
    // Entrée ajoute la catégorie, sans envoyer la fenêtre.
    fireEvent.keyDown(name, { key: "Enter" })
    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenCalledWith(
        "blog",
        "Respiration"
      )
    )
    expect(
      await within(dialog).findByRole("checkbox", { name: "Respiration" })
    ).toBeChecked()
    expect(api.createContent).not.toHaveBeenCalled()
  })

  it("« Réglages » depuis la liste : le titre et les réglages, enregistrés d'un coup", async () => {
    vi.mocked(api.listContents).mockResolvedValue([articles[2]])
    vi.mocked(api.lockStatus).mockResolvedValue(lockRow({}))
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    vi.mocked(api.getContent).mockResolvedValue({
      ...newArticle,
      id: articles[2].id,
      title: "Sans rangement",
      draft: { v: 1, title: "Sans rangement", blocks: [] },
      draft_rev: 3,
    })
    await renderApp("/blog")

    fireEvent.click(
      await screen.findByRole("button", {
        name: labels.actions("Sans rangement"),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: labels.settings.action })
    )
    const sheet = await screen.findByRole("dialog", {
      name: texts.publication.settings.title,
    })
    const save = within(sheet).getByRole("button", {
      name: labels.settings.save,
    })
    await waitFor(() => expect(save).toBeEnabled())
    fireEvent.change(
      within(sheet).getByLabelText(texts.publication.settings.titleLabel),
      { target: { value: "Rangé enfin" } }
    )
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Stress" }))
    fireEvent.click(save)

    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith(
        articles[2].id,
        3,
        { v: 1, title: "Rangé enfin", blocks: [] },
        expect.any(String),
        { category_ids: [STRESS] }
      )
    )
    expect(
      await screen.findByText(labels.settings.saved("Rangé enfin"))
    ).toBeVisible()
    expect(api.lockRelease).toHaveBeenCalledWith(
      articles[2].id,
      expect.any(String)
    )
  })

  it("« Réglages » d'un contenu que quelqu'un écrit : en lecture seule, avec son nom", async () => {
    vi.mocked(api.listContents).mockResolvedValue([articles[2]])
    vi.mocked(api.lockStatus).mockResolvedValue(
      lockRow({
        holder_id: "autre",
        holder_name: "Claire Martin",
        is_active: true,
      })
    )
    await renderApp("/blog")

    fireEvent.click(
      await screen.findByRole("button", {
        name: labels.actions("Sans rangement"),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: labels.settings.action })
    )
    const sheet = await screen.findByRole("dialog", {
      name: texts.publication.settings.title,
    })
    expect(
      await within(sheet).findByText(labels.settings.heldBy("Claire Martin"))
    ).toBeVisible()
    expect(
      within(sheet).getByRole("button", { name: labels.settings.save })
    ).toBeDisabled()
    expect(
      within(sheet).getByLabelText(texts.publication.settings.titleLabel)
    ).toHaveAttribute("readonly")
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
    await renderApp("/blog")
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

  it("« Tout sélectionner » met les articles affichés à la corbeille, et garde celui qu'on écrit", async () => {
    const article = labels.kinds.article
    const writing = "Claire Martin écrit ce brouillon."
    vi.mocked(api.listContents).mockResolvedValue(articles)
    vi.mocked(publicationApi.trashContent).mockImplementation(async (id) => {
      if (id === articles[1].id) {
        throw new api.ContentError("verrou_tenu", { detail: writing })
      }
      return { batch: "lot", trashed: 1, needsFileSync: false }
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    await renderApp("/blog")

    // Une case par article, puis « Tout sélectionner ».
    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: texts.selection.select("Sans rangement"),
      })
    )
    expect(
      screen.getByRole("button", { name: texts.selection.trash(1) })
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole("checkbox", { name: texts.selection.selectAll })
    )
    expect(
      screen.getByRole("button", { name: texts.selection.trash(3) })
    ).toBeVisible()

    fireEvent.click(
      screen.getByRole("button", { name: texts.selection.trash(3) })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(article.confirmTrashManyTitle(3))
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.confirmTrash.confirm })
    )

    // Deux partent ; celui que Claire écrit est gardé, coché, et listé.
    expect(await screen.findByText(article.trashedMany(2))).toBeVisible()
    expect(publicationApi.trashContent).toHaveBeenCalledTimes(3)
    expect(screen.getByText(article.keptTitle(1))).toBeVisible()
    expect(
      screen.getByText(
        texts.selection.keptItem("Le stress au travail", writing)
      )
    ).toBeVisible()
    expect(
      screen.getByRole("button", { name: texts.selection.trash(1) })
    ).toBeVisible()

    // « Annuler » : les deux reviennent en brouillon.
    fireEvent.click(
      within(screen.getByText(article.trashedMany(2)).closest("li")!).getByRole(
        "button",
        { name: labels.undo }
      )
    )
    expect(await screen.findByText(article.restoredMany(2))).toBeVisible()
    expect(publicationApi.restoreContent).toHaveBeenCalledWith(articles[0].id)
    expect(publicationApi.restoreContent).toHaveBeenCalledWith(articles[2].id)
  })
})

describe("Podcasts", () => {
  it("liste les épisodes avec les catégories des Podcasts", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row("00000000-0000-4000-8000-0000000000e1", "Entretien avec Claire"),
    ])
    await renderApp("/podcasts")
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
  it("« Nouvelle page » : l'adresse vient du titre, et une adresse déjà prise bloque la création", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    vi.mocked(api.findPageBySlug).mockImplementation(async (slug) =>
      slug === "accueil" ? { id: "autre", title: "Accueil" } : null
    )
    vi.mocked(api.createContent).mockResolvedValue({
      ...newArticle,
      kind: "page",
      title: "Été serein",
      draft: { v: 1, title: "Été serein", blocks: [] },
    })
    vi.mocked(api.lockTake).mockResolvedValue(lockRow({ mine: true }))
    await renderApp("/pages")
    fireEvent.click(
      await screen.findByRole("button", { name: labels.kinds.page.create })
    )
    const dialog = await screen.findByRole("dialog", {
      name: labels.kinds.page.create,
    })
    const title = within(dialog).getByLabelText(
      texts.publication.settings.titleLabel
    )
    const submit = within(dialog).getByRole("button", {
      name: labels.kinds.page.submit,
    })
    // Pas de champ d'adresse : elle se lit sous le titre.
    expect(
      within(dialog).queryByLabelText(texts.publication.settings.slug.label)
    ).toBeNull()

    fireEvent.change(title, { target: { value: "Accueil" } })
    expect(
      await within(dialog).findByText(labels.newContent.addressTaken("Accueil"))
    ).toBeVisible()
    expect(submit).toBeDisabled()

    fireEvent.change(title, { target: { value: "Été serein" } })
    expect(
      await within(dialog).findByText(labels.newContent.address("ete-serein"))
    ).toBeVisible()
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)
    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith(
        ARTICLE,
        1,
        { v: 1, title: "Été serein", blocks: [] },
        expect.any(String),
        { slug: "ete-serein" }
      )
    )
    expect(api.createContent).toHaveBeenCalledWith("page", "Été serein", null)
  })

  it("liste les pages sans colonne Adresse ni filtre par catégorie", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row("00000000-0000-4000-8000-0000000000b1", "Mentions légales", {
        slug: "mentions-legales",
      }),
      row("00000000-0000-4000-8000-0000000000b2", "Aide"),
    ])
    await renderApp("/pages")
    await screen.findByRole("link", { name: "Mentions légales" })
    expect(screen.queryByText("mentions-legales")).toBeNull()
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

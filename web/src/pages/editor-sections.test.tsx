import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Doc, Draft } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// L'éditeur d'un article et d'un épisode (étape 7) : image de présentation, résumé, catégories,
// audio et sa durée, [D45] (ce qui manque pour publier) et [D46] (transcription conseillée). La
// base, Realtime et Storage sont simulés.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    getContent: vi.fn(),
    getMediaByIds: vi.fn(async () => []),
    saveDraft: vi.fn(),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    lockHeartbeat: vi.fn(async () => true),
    lockRelease: vi.fn(async () => true),
    lockReleaseOnExit: vi.fn(),
    subscribeLock: vi.fn(() => () => {}),
  }
})

vi.mock("@/lib/contents/publication", async (importOriginal) => {
  const actual = await importOriginal<typeof publicationApi>()
  return {
    ...actual,
    getPublication: vi.fn(),
    listVersions: vi.fn(async () => []),
    publishContent: vi.fn(),
    scheduleContent: vi.fn(),
  }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return {
    ...actual,
    getTemplatesByIds: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
  }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return {
    ...actual,
    kickFiles: vi.fn(async () => {}),
    listMedia: vi.fn(async () => []),
    getPreviewUrls: vi.fn(async () => ({})),
  }
})

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return { ...actual, listAccessLevels: vi.fn(async () => []) }
})

vi.mock("@/lib/categories", async (importOriginal) => {
  const actual = await importOriginal<typeof categoriesApi>()
  return { ...actual, listCategories: vi.fn() }
})

const words = texts.editor.presentation
const requirements = texts.publication.requirements

const ARTICLE = "00000000-0000-4000-8000-0000000000a1"
const EPISODE = "00000000-0000-4000-8000-0000000000e1"
const PLAGE = "00000000-0000-4000-8000-0000000000f1"
const SON = "00000000-0000-4000-8000-0000000000f2"
const SOMMEIL = "00000000-0000-4000-8000-00000000c001"
const STRESS = "00000000-0000-4000-8000-00000000c002"

function media(id: string, fields: Partial<Media>): Media {
  return {
    id,
    status: "ready",
    deleted_at: null,
    alt: null,
    transcript: null,
    width: null,
    height: null,
    duration_s: null,
    is_public: false,
    path: `${id}/fichier`,
    ...fields,
  } as unknown as Media
}

const plage = media(PLAGE, {
  kind: "image",
  name: "plage.png",
  mime: "image/png",
  alt: "Une plage au coucher du soleil",
  width: 800,
  height: 500,
})
const son = media(SON, {
  kind: "audio",
  name: "entretien.mp3",
  mime: "audio/mpeg",
  duration_s: 185,
})

function contentOf(
  id: string,
  kind: "article" | "episode",
  draft: Partial<Draft> = {},
  changes: Partial<api.Content> = {}
): api.Content {
  const full: Draft = {
    v: 1,
    title: kind === "article" ? "Bien dormir" : "Entretien",
    summary: null,
    cover: null,
    audio: null,
    blocks: [],
    ...draft,
  }
  return {
    id,
    kind,
    title: full.title,
    draft: full,
    draft_rev: 4,
    draft_saved_at: "2026-09-27T12:30:00Z",
    deleted_at: null,
    parent_id: null,
    access_chosen: true,
    access_level_id: null,
    slug: null,
    template_sort: null,
    template_for: null,
    in_app: false,
    is_free: false,
    category_ids: [],
    ...changes,
  }
}

const mine: api.LockRow = {
  mine: true,
  holder_id: testProfile.id,
  holder_name: testProfile.full_name,
  taken_at: "2026-09-27T12:30:00Z",
  heartbeat_at: "2026-09-27T12:30:00Z",
  is_active: true,
  draft_rev: 4,
}

beforeEach(() => {
  vi.mocked(api.lockTake).mockResolvedValue(mine)
  vi.mocked(api.lockStatus).mockResolvedValue(mine)
  vi.mocked(api.saveDraft).mockResolvedValue({
    rev: 5,
    savedAt: "2026-09-27T12:31:00Z",
  })
  vi.mocked(publicationApi.getPublication).mockImplementation(async (id) => ({
    id,
    draft_rev: 4,
    first_published_at: null,
    scheduled_at: null,
    scheduled_by_name: null,
    schedule_error: null,
    deleted_at: null,
    live: null,
  }))
  vi.mocked(categoriesApi.listCategories).mockImplementation(async (section) =>
    section === "blog"
      ? [
          { id: SOMMEIL, name: "Sommeil", position: 0, uses: 0 },
          { id: STRESS, name: "Stress", position: 1, uses: 0 },
        ]
      : []
  )
  vi.mocked(api.getMediaByIds).mockImplementation(async (ids) =>
    [plage, son].filter((file) => ids.includes(file.id))
  )
})

afterEach(() => vi.clearAllMocks())

/** Attend que l'éditeur ait pris la main (le titre devient modifiable). */
async function editable() {
  const title = await screen.findByLabelText(texts.editor.title.label)
  await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
  return title
}

/** Le panneau de droite : « Présentation de… » quand aucun bloc n'est choisi. */
function panel() {
  return screen
    .getAllByRole("region")
    .find((region) => region.hasAttribute("data-side-panel"))!
}

const columns = texts.editor.columns
const article = texts.editor.article
const preview = texts.editor.preview
const outline = texts.editor.outline

/** L'onglet « Article » de la colonne de droite (éditeur du Fil). */
function articleTab() {
  return screen.getByRole("tabpanel", { name: columns.article })
}

/** Choisit une option d'une liste (Base UI ne retient un clic que s'il commence sur l'option). */
async function pick(list: HTMLElement, option: string) {
  fireEvent.click(list)
  const choice = await screen.findByRole("option", { name: option })
  fireEvent.pointerDown(choice, { pointerType: "mouse" })
  fireEvent.click(choice)
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
}

describe("éditeur d'un article (Le Fil)", () => {
  it("s'ouvre à /blog/<id> avec le plan à gauche et l'onglet « Article » à droite", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    expect(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    ).toHaveAttribute("href", "/blog")
    // Colonne de gauche ouverte d'office, sur le plan.
    expect(screen.getByRole("tab", { name: columns.plan })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(screen.getByRole("tab", { name: columns.blocks })).toBeVisible()
    // Tout ce qui concerne l'article est à droite : ni « Réglages » ni « Ajouter un bloc » en haut.
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.settings })
    ).toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.editor.add.label })
    ).toBeNull()
    expect(
      within(articleTab()).getByRole("heading", { name: article.ready.title })
    ).toBeVisible()
    expect(
      within(articleTab()).getByRole("button", {
        name: article.ready.todo(article.ready.items.cover),
      })
    ).toBeVisible()
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    // Un article n'a pas d'audio, et son résumé n'est pas dans l'aperçu.
    expect(screen.queryByText(words.audio.label)).toBeNull()
    expect(screen.queryByPlaceholderText(words.summary.placeholder)).toBeNull()
  })

  it("choisit l'image de présentation dans l'aperçu, puis écrit le résumé de la carte", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(mediaApi.listMedia).mockResolvedValue([plage])
    renderApp(`/blog/${ARTICLE}`)
    await editable()

    // Dans l'aperçu, comme l'app la montrera, en tête de l'article.
    const preview = document.querySelector<HTMLElement>(
      '[data-presentation="cover"]'
    )!
    fireEvent.click(
      within(preview).getByRole("button", { name: words.cover.choose })
    )
    const dialog = await screen.findByRole("dialog")
    expect(mediaApi.listMedia).toHaveBeenCalledWith({
      kind: "image",
      search: "",
      unused: false,
    })
    fireEvent.click(
      await within(dialog).findByRole("button", {
        name: texts.editor.picker.choose("plage.png"),
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(
      within(articleTab()).getByText(
        words.cover.alt("Une plage au coucher du soleil")
      )
    ).toBeVisible()
    expect(
      within(articleTab()).getByRole("button", {
        name: article.ready.done(article.ready.items.cover),
      })
    ).toBeVisible()

    const summary = within(articleTab()).getByLabelText(/^Résumé/)
    expect(summary).toHaveAttribute("maxlength", "200")
    fireEvent.change(summary, { target: { value: "Cinq gestes\npour l'été" } })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const saved = vi.mocked(api.saveDraft).mock.calls.at(-1)![2]
    expect(saved.cover).toEqual({ mediaId: PLAGE })
    // Texte simple, sur une ligne, montré dans la carte de la liste du Fil.
    expect(saved.summary).toBe("Cinq gestes pour l'été")
    expect(
      within(articleTab()).getByText(article.summary.count(22, 200))
    ).toBeVisible()
    expect(
      within(articleTab()).getAllByText("Cinq gestes pour l'été")
    ).not.toHaveLength(0)
  }, 10_000)

  it("« Retirer l'image » la retire, avec « Annuler »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", { cover: { mediaId: PLAGE } })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(
      await within(articleTab()).findByRole("button", {
        name: words.cover.remove,
      })
    )
    // « Retirer l'image » a disparu : le focus passe à la vignette, pour en choisir une.
    expect(
      within(articleTab()).getByRole("button", {
        name: article.feed.chooseLabel,
      })
    ).toHaveFocus()
    const toast = await screen.findByText(words.cover.removed)
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", {
        name: texts.editor.settings.undo,
      })
    )
    expect(
      await within(articleTab()).findByRole("button", {
        name: article.feed.replaceLabel,
      })
    ).toBeVisible()
  })

  it("après un choix depuis l'aperçu, le focus va à la vignette de la carte", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(mediaApi.listMedia).mockResolvedValue([plage])
    // Chaque vignette a son adresse : l'image remplace le bouton dans l'aperçu.
    vi.mocked(mediaApi.getPreviewUrls).mockImplementation(async (keys) =>
      Object.fromEntries(keys.map((key) => [key, `blob:${key}`]))
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const preview = document.querySelector<HTMLElement>(
      '[data-presentation="cover"]'
    )!
    const choose = within(preview).getByRole("button", {
      name: words.cover.choose,
    })
    choose.focus()
    fireEvent.click(choose)
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      await within(dialog).findByRole("button", {
        name: texts.editor.picker.choose("plage.png"),
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(preview.querySelector("img")).not.toBeNull())
    await waitFor(() =>
      expect(
        within(articleTab()).getByRole("button", {
          name: article.feed.replaceLabel,
        })
      ).toHaveFocus()
    )
  })

  it("l'onglet de droite suit le clic : un bloc ouvre « Bloc choisi », le titre revient à « Article »", async () => {
    const BLOCK = "00000000-0000-4000-8000-0000000000d1"
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: BLOCK,
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    const title = await editable()
    fireEvent.pointerDown(
      document.querySelector<HTMLElement>(`[data-block-id="${BLOCK}"]`)!
    )
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: columns.block })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    )
    expect(panel()).toHaveAccessibleName(texts.editor.settings.label)
    // On peut revenir à « Article » à la main, sans perdre le bloc choisi.
    fireEvent.click(screen.getByRole("tab", { name: columns.article }))
    expect(articleTab()).toBeVisible()
    fireEvent.focus(title)
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: columns.article })
      ).toHaveAttribute("aria-selected", "true")
    )
  })

  it("l'aperçu : la Lecture montre l'article comme dans l'app, sans ses blocs pour une personne sans la formule", async () => {
    // jsdom n'a pas scrollIntoView (le bloc choisi dans le plan est montré).
    Element.prototype.scrollIntoView = vi.fn()
    const TEXT = "00000000-0000-4000-8000-0000000000d2"
    const LEVEL = "00000000-0000-4000-8000-0000000000b1"
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Respire lentement." }],
        },
      ],
    } as Doc
    vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([
      { id: LEVEL, name: "Essentiel", rank: 1 },
    ])
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(
        ARTICLE,
        "article",
        { blocks: [{ id: TEXT, type: "text", doc }] },
        { access_level_id: LEVEL, category_ids: [SOMMEIL] }
      )
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    expect(
      screen.getByRole("toolbar", { name: texts.editor.toolbar.label })
    ).toHaveAttribute("aria-orientation", "vertical")

    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    expect(
      within(phone).getByRole("heading", { level: 1, name: "Bien dormir" })
    ).toBeVisible()
    expect(screen.queryByLabelText(texts.editor.title.label)).toBeNull()
    expect(within(phone).getByText("Respire lentement.")).toBeVisible()
    expect(
      await within(phone).findByText(`Sommeil · ${preview.minutes(1)}`)
    ).toBeVisible()

    // Comme une personne sans la formule : l'app ne reçoit pas les blocs.
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.reader.visitor })
    )
    expect(
      await within(phone).findByText(preview.locked.text("Essentiel"))
    ).toBeVisible()
    expect(within(phone).queryByText("Respire lentement.")).toBeNull()

    // Sombre, Android, Grand texte : le téléphone change, l'article reste le même.
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.theme.dark })
    )
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.device.android })
    )
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.largeText })
    )
    const android = screen.getByRole("region", { name: preview.screen.android })
    expect(android).toHaveAttribute("data-blocks-theme", "dark")
    expect(android).toHaveAttribute("data-large-text")

    // Un bloc choisi dans le plan ramène en Édition.
    fireEvent.click(
      within(screen.getByRole("tabpanel", { name: columns.plan })).getByRole(
        "button",
        { name: /^Aller à Texte/ }
      )
    )
    expect(await screen.findByLabelText(texts.editor.title.label)).toBeVisible()
    expect(
      within(tools).queryByRole("button", { name: preview.reader.visitor })
    ).toBeNull()
  })

  it("le plan : image de présentation, points à vérifier, encadré replié, survol partagé avec l'aperçu", async () => {
    const BOX = "00000000-0000-4000-8000-0000000000d3"
    const IMAGE = "00000000-0000-4000-8000-0000000000d4"
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: BOX,
            type: "box",
            look: "fill",
            blocks: [
              {
                id: IMAGE,
                type: "image",
                mediaId: null,
                caption: null,
                alt: null,
              },
            ],
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    expect(within(plan).getByText(outline.count(2))).toBeVisible()
    expect(
      within(plan).getByRole("img", { name: outline.warnings.coverMissing })
    ).toBeVisible()
    expect(
      within(plan).getByRole("img", { name: outline.warnings.noFile })
    ).toBeVisible()
    expect(within(plan).getByText(outline.warnings.count(2))).toBeVisible()

    // L'encadré se replie : son image ne se voit plus dans le plan.
    const boxLabel = texts.editor.blockLabel.box(1)
    const imageRow = within(plan).getByRole("button", {
      name: outline.select(texts.editor.blockLabel.image("")),
    })
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.collapse(boxLabel) })
    )
    expect(imageRow).not.toBeInTheDocument()
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.expand(boxLabel) })
    )

    // Survoler une ligne du plan montre le bloc dans l'aperçu, et inversement.
    const boxRow = within(plan).getByRole("button", {
      name: outline.select(boxLabel),
    })
    const boxInPhone = document.querySelector(`[data-block-id="${BOX}"]`)!
    fireEvent.pointerEnter(boxRow.closest("li")!)
    await waitFor(() => expect(boxInPhone).toHaveAttribute("data-hovered"))
    fireEvent.pointerLeave(boxRow.closest("li")!)
    await waitFor(() => expect(boxInPhone).not.toHaveAttribute("data-hovered"))
    fireEvent.pointerOver(document.querySelector(`[data-block-id="${IMAGE}"]`)!)
    await waitFor(() =>
      expect(
        within(plan)
          .getByRole("button", {
            name: outline.select(texts.editor.blockLabel.image("")),
          })
          .closest("div")
      ).toHaveClass("bg-accent/60")
    )

    // « … » : Enregistrer dans Mes blocs pour un bloc de premier niveau seulement.
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.actions(boxLabel) })
    )
    expect(
      await screen.findByRole("menuitem", { name: outline.saveToMine })
    ).toBeVisible()
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  })

  it("Concentration : le raccourci cache les deux colonnes, Échap les ramène", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const left = screen.getByRole("complementary", { name: columns.left })
    const button = screen.getByRole("button", {
      name: new RegExp(`^${texts.editor.focusMode.label}`),
    })
    expect(button).toHaveAttribute("aria-pressed", "false")
    // jsdom n'est pas un Mac : Ctrl + .
    fireEvent.keyDown(window, { key: ".", ctrlKey: true })
    expect(button).toHaveAttribute("aria-pressed", "true")
    expect(left).toHaveClass("hidden")
    expect(screen.getByText(texts.editor.focusMode.on)).toBeInTheDocument()
    fireEvent.keyDown(window, { key: "Escape" })
    expect(left).not.toHaveClass("hidden")
  })

  it("niveau d'accès et catégories en pastilles : ils partent avec le brouillon ([D41], [D44])", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(
        ARTICLE,
        "article",
        {},
        { access_chosen: false, category_ids: [STRESS] }
      )
    )
    vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-0000000000b1",
        name: "Essentiel",
        rank: 1,
      },
    ])
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const tab = articleTab()
    expect(
      await within(tab).findByRole("button", { name: "Stress" })
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      within(tab).getByRole("button", { name: "Sommeil" })
    ).toHaveAttribute("aria-pressed", "false")
    expect(
      within(tab).getByText(texts.publication.settings.access.notChosen)
    ).toBeVisible()

    await pick(within(tab).getByRole("combobox"), "Essentiel")
    fireEvent.click(within(tab).getByRole("button", { name: "Sommeil" }))
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls.at(-1)![4]).toEqual({
      access_level_id: "00000000-0000-4000-8000-0000000000b1",
      category_ids: [SOMMEIL, STRESS].sort(),
    })
    expect(
      within(tab).getByRole("button", {
        name: article.ready.done(article.ready.items.access),
      })
    ).toBeVisible()
  }, 10_000)

  it("aucune catégorie : c'est permis ([D44])", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {}, { category_ids: [SOMMEIL, STRESS] })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const tab = articleTab()
    fireEvent.click(await within(tab).findByRole("button", { name: "Sommeil" }))
    fireEvent.click(within(tab).getByRole("button", { name: "Stress" }))
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      category_ids: [],
    })
  }, 10_000)

  it("« Blocs » ajoute un texte, et « Mes blocs » insère un bloc enregistré", async () => {
    // Le nouveau bloc défile jusqu'à l'écran (jsdom ne sait pas faire défiler).
    Element.prototype.scrollIntoView = vi.fn()
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(templatesApi.listTemplates).mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-0000000000c9",
        title: "À retenir",
        sort: "style",
        templateFor: null,
        draft: {
          v: 1,
          title: "À retenir",
          blocks: [
            {
              id: "00000000-0000-4000-8000-0000000000ca",
              type: "text",
              doc: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Retiens bien ceci." }],
                  },
                ],
              } as unknown as Doc,
            },
          ],
        },
        draft_saved_at: "2026-09-30T10:00:00Z",
      },
    ])
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(screen.getByRole("tab", { name: columns.blocks }))
    const library = screen.getByRole("tabpanel", { name: columns.blocks })
    fireEvent.click(
      within(library).getByRole("button", {
        name: texts.editor.library.addLabel(texts.editor.blocks.text),
      })
    )
    // Le nouveau bloc est choisi : « Bloc choisi » s'ouvre à droite.
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: columns.block })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    )
    fireEvent.click(
      await within(library).findByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    )
    const mine = await within(library).findByRole("region", {
      name: texts.editor.library.mine.title,
    })
    expect(
      within(mine).getByLabelText(texts.editor.library.mine.searchLabel)
    ).toHaveFocus()
    fireEvent.click(
      await within(mine).findByRole("button", {
        name: texts.editor.library.mine.insertLabel("À retenir"),
      })
    )
    expect(
      await screen.findByText(texts.templates.insert.inserted("À retenir"))
    ).toBeInTheDocument()
    // Dans l'aperçu réduit de « Mes blocs », et dans l'article.
    await waitFor(() =>
      expect(screen.getAllByText("Retiens bien ceci.")).toHaveLength(2)
    )
  })

  it("l'historique montre les catégories de chaque version, dont celles supprimées ([D28])", async () => {
    const history = texts.publication.history
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {}, { category_ids: [SOMMEIL] })
    )
    vi.mocked(publicationApi.listVersions).mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-0000000000b2",
        number: 2,
        origin: "manual",
        published_at: "2026-09-27T13:00:00Z",
        published_by_name: "Anne Admin",
        draft_rev: 4,
        category_ids: [],
      },
      {
        id: "00000000-0000-4000-8000-0000000000b1",
        number: 1,
        origin: "manual",
        published_at: "2026-09-27T12:00:00Z",
        published_by_name: "Anne Admin",
        draft_rev: 2,
        // Dans l'ordre d'enregistrement, dont une catégorie supprimée depuis.
        category_ids: [STRESS, "00000000-0000-4000-8000-00000000c0ff", SOMMEIL],
      },
    ])
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.history })
    )
    const list = await screen.findByRole("list", { name: history.title })
    const [second, first] = within(list).getAllByRole("listitem")
    expect(
      await within(first).findByText(
        history.categories(["Sommeil", "Stress", history.deletedCategories(1)])
      )
    ).toBeVisible()
    expect(within(second).getByText(history.noCategory)).toBeVisible()

    // La confirmation dit ce qui sera remplacé pour un article : pas d'adresse.
    fireEvent.click(
      within(first).getByRole("button", { name: history.revertItem(1) })
    )
    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent(history.confirm.description("article"))
    expect(confirm).not.toHaveTextContent(/adresse/)
  })

  it("« Publier » explique qu'il manque l'image de présentation ([D45])", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(mediaApi.listMedia).mockResolvedValue([plage])
    renderApp(`/blog/${ARTICLE}`)
    await editable()

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.publication.actions.publish,
      })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(requirements.publishTitle)
    expect(dialog).toHaveTextContent(requirements.cover)
    expect(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    ).toBeDisabled()

    // « Choisir l'image » ouvre le choix, et la fenêtre de publication se ferme.
    fireEvent.click(
      within(dialog).getByRole("button", { name: requirements.chooseCover })
    )
    const picker = await screen.findByRole("dialog", {
      name: texts.editor.picker.title,
    })
    fireEvent.click(
      await within(picker).findByRole("button", {
        name: texts.editor.picker.choose("plage.png"),
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    // L'image choisie, « Publier » est possible (le résumé reste facultatif).
    vi.mocked(publicationApi.publishContent).mockResolvedValue({
      versionId: "v1",
      versionNumber: 1,
      publishedAt: "2026-09-27T12:32:00Z",
      needsFileSync: true,
    })
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const again = await screen.findByRole("dialog")
    expect(again).not.toHaveTextContent(requirements.publishTitle)
    fireEvent.click(
      within(again).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.publishContent).toHaveBeenCalledWith(ARTICLE, 5)
    )
    // L'image de présentation devient publique tout de suite.
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())
  })

  it("[D49] : sans titre, « Prêt à publier ? » et « Publier » le demandent, et y mènent", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", { title: "  " })
    )
    renderApp(`/blog/${ARTICLE}`)
    const title = await editable()
    const todo = within(articleTab()).getByRole("button", {
      name: article.ready.todo(article.ready.items.title),
    })
    // Le niveau est déjà choisi : seuls le titre et l'image manquent.
    expect(within(articleTab()).getByText("1 / 3")).toBeVisible()
    fireEvent.click(todo)
    await waitFor(() => expect(title).toHaveFocus())

    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(requirements.title)
    fireEvent.click(
      within(dialog).getByRole("button", { name: requirements.writeTitle })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(() => expect(title).toHaveFocus())

    fireEvent.change(title, { target: { value: "Bien dormir" } })
    expect(
      within(articleTab()).getByRole("button", {
        name: article.ready.done(article.ready.items.title),
      })
    ).toBeVisible()
  })

  it("un refus de la base (titre_manquant) met le curseur dans le titre", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", { cover: { mediaId: PLAGE } })
    )
    vi.mocked(publicationApi.publishContent).mockRejectedValue(
      new api.ContentError("titre_manquant")
    )
    renderApp(`/blog/${ARTICLE}`)
    const title = await editable()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    )
    await waitFor(() => expect(title).toHaveFocus())
  })

  it("un refus de la base (image_de_presentation_manquante) ouvre le choix de l'image", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      // Une image que l'éditeur n'arrive pas à lire : la base tranche.
      contentOf(ARTICLE, "article", { cover: { mediaId: PLAGE } })
    )
    vi.mocked(api.getMediaByIds).mockRejectedValue(new Error("réseau"))
    vi.mocked(publicationApi.publishContent).mockRejectedValue(
      new api.ContentError("image_de_presentation_manquante")
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.publication.actions.publish,
      })
    )
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    )
    expect(
      await screen.findByText(
        texts.editor.errors.image_de_presentation_manquante
      )
    ).toBeVisible()
    expect(
      await screen.findByRole("dialog", { name: texts.editor.picker.title })
    ).toBeVisible()
  })

  it("un article ne s'ouvre pas dans l'éditeur des Podcasts", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/podcasts/${ARTICLE}`)
    expect(await screen.findByText(texts.editor.notFound.title)).toBeVisible()
  })
})

describe("éditeur d'un épisode", () => {
  it("« Voir la présentation » donne le focus au titre du panneau", async () => {
    const BLOCK = "00000000-0000-4000-8000-0000000000d1"
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", {
        blocks: [
          {
            id: BLOCK,
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    fireEvent.pointerDown(
      document.querySelector<HTMLElement>(`[data-block-id="${BLOCK}"]`)!
    )
    await waitFor(() =>
      expect(panel()).toHaveAccessibleName(texts.editor.settings.label)
    )
    fireEvent.click(within(panel()).getByRole("button", { name: words.show }))
    const title = await within(panel()).findByRole("heading", {
      name: words.panelTitle.episode,
    })
    await waitFor(() => expect(title).toHaveFocus())
    expect(panel()).toHaveAccessibleName(words.panelTitle.episode)
  })

  it("choisit l'audio parmi les audios de la médiathèque et montre sa durée", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", { cover: { mediaId: PLAGE } })
    )
    vi.mocked(mediaApi.listMedia).mockResolvedValue([son])
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    expect(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.podcasts.title),
      })
    ).toHaveAttribute("href", "/podcasts")
    expect(within(panel()).getByText(words.audio.none)).toBeVisible()

    fireEvent.click(
      within(panel()).getByRole("button", { name: words.audio.choose })
    )
    const dialog = await screen.findByRole("dialog", {
      name: texts.editor.audioPicker.title,
    })
    expect(mediaApi.listMedia).toHaveBeenCalledWith({
      kind: "audio",
      search: "",
      unused: false,
    })
    const choice = await within(dialog).findByRole("button", {
      name: texts.editor.audioPicker.choose("entretien.mp3"),
    })
    expect(choice).toHaveTextContent("3 min 05 s")
    expect(choice).toHaveTextContent(texts.editor.audioPicker.noTranscript)
    fireEvent.click(choice)
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    // Dans l'aperçu et dans le panneau : la durée.
    const preview = document.querySelector<HTMLElement>(
      '[data-presentation="audio"]'
    )!
    expect(preview).toHaveTextContent(words.audio.duration("3 min 05 s"))
    expect(within(panel()).getByText("entretien.mp3")).toBeVisible()
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls.at(-1)![2].audio).toEqual({
      mediaId: SON,
    })
  }, 10_000)

  it("[D46] : avertit quand l'audio n'a pas de transcription, avec un lien vers sa fiche", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", {
        cover: { mediaId: PLAGE },
        audio: { mediaId: SON },
      })
    )
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    const warnings = await screen.findAllByText(words.audio.transcriptMissing)
    // Dans l'aperçu et dans le panneau.
    expect(warnings).toHaveLength(2)
    const link = within(panel()).getByRole("link", {
      name: new RegExp(words.audio.openFile),
    })
    expect(link).toHaveAttribute("href", `/mediatheque?fichier=${SON}`)
    expect(link).toHaveAttribute("target", "_blank")

    // Conseillée, pas obligatoire : « Publier » reste possible, avec le conseil.
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(requirements.transcript)
    expect(dialog).not.toHaveTextContent(requirements.publishTitle)
    expect(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    ).toBeEnabled()
  })

  it("avec une transcription, pas d'avertissement", async () => {
    vi.mocked(api.getMediaByIds).mockResolvedValue([
      plage,
      { ...son, transcript: "Bonjour et bienvenue." },
    ])
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", {
        cover: { mediaId: PLAGE },
        audio: { mediaId: SON },
      })
    )
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    expect(
      await within(panel()).findByText(words.audio.transcriptOk)
    ).toBeVisible()
    expect(screen.queryByText(words.audio.transcriptMissing)).toBeNull()
  })

  it("« Publier » et « Programmer » demandent l'image et l'audio qui manquent", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(EPISODE, "episode"))
    renderApp(`/podcasts/${EPISODE}`)
    await editable()

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.publication.actions.publish,
      })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(requirements.cover)
    expect(dialog).toHaveTextContent(requirements.audio)
    expect(
      within(dialog).getByRole("button", { name: requirements.chooseAudio })
    ).toBeVisible()
    fireEvent.click(
      within(dialog).getByRole("button", { name: texts.common.cancel })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())

    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.more })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.schedule,
      })
    )
    const schedule = await screen.findByRole("dialog")
    expect(schedule).toHaveTextContent(requirements.scheduleTitle)
    expect(
      within(schedule).getByRole("button", {
        name: texts.publication.scheduleDialog.confirm,
      })
    ).toBeDisabled()
  })

  it("un refus son_manquant ouvre le choix de l'audio", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", {
        cover: { mediaId: PLAGE },
        audio: { mediaId: SON },
      })
    )
    vi.mocked(publicationApi.publishContent).mockRejectedValue(
      new api.ContentError("son_manquant")
    )
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    await within(panel()).findByText("entretien.mp3")
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    )
    expect(
      await screen.findByRole("dialog", {
        name: texts.editor.audioPicker.title,
      })
    ).toBeVisible()
  })
})

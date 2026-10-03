import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
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

// L'éditeur d'un article et d'un épisode (étape 7) : image de présentation, catégories,
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
    // Chaque fichier a son adresse d'aperçu.
    getPreviewUrls: vi.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map((key) => [key, `blob:${key}`]))
    ),
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

/** L'Article, dans la colonne de droite (éditeur du Fil). */
function articleTab() {
  return screen.getByRole("region", { name: columns.article })
}

/** Les Blocs, en glissière par-dessus le Plan (éditeur du Fil). */
function blocksPanel() {
  return screen.getByRole("region", { name: columns.blocks })
}

/** Ouvre les Blocs par « Ajouter un bloc », en bas de la colonne de gauche. */
function openBlocks() {
  fireEvent.click(document.getElementById("colonne-gauche-ajouter")!)
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
  it("s'ouvre à /blog/<id> avec le plan à gauche et l'Article à droite", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    expect(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    ).toHaveAttribute("href", "/blog")
    // Colonne de gauche ouverte d'office, sur le plan, sans onglets ; les Blocs sont fermés.
    expect(
      screen.getByRole("navigation", { name: outline.title })
    ).toBeVisible()
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.queryByRole("region", { name: columns.blocks })).toBeNull()
    // Tout ce qui concerne l'article est à droite : pas de « Réglages » en haut. Sans bloc, le
    // téléphone et le plan n'ont qu'un bouton « Ajouter un bloc », comme le bas de la colonne de
    // gauche (avec le retour, au-dessus).
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.settings })
    ).toBeNull()
    expect(
      screen.getAllByRole("button", { name: texts.editor.add.label })
    ).toHaveLength(3)
    const left = screen.getByRole("complementary", { name: columns.left })
    expect(
      within(left).getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    ).toBeVisible()
    expect(
      screen.queryByRole("button", { name: texts.templates.insert.menu })
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
    // Un article n'a pas d'audio, ni de résumé (03/10/2026).
    expect(screen.queryByText(words.audio.label)).toBeNull()
    expect(screen.queryByLabelText(/Résumé/)).toBeNull()
  })

  it("choisit l'image de présentation dans l'aperçu ; la carte du Fil n'a pas de résumé", async () => {
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

    // La carte montre l'image et le titre, sans résumé.
    expect(within(articleTab()).queryByLabelText(/Résumé/)).toBeNull()
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const saved = vi.mocked(api.saveDraft).mock.calls.at(-1)![2]
    expect(saved.cover).toEqual({ mediaId: PLAGE })
    expect(saved).not.toHaveProperty("summary")
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

  it("un bloc choisi ouvre ses réglages en glissière par-dessus l'Article ; ×, Échap ou le titre la ferment", async () => {
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
    const right = screen.getByRole("complementary", { name: columns.right })
    // Pas d'onglets : en tête, le titre de l'article.
    expect(within(right).queryByRole("tablist")).toBeNull()
    expect(
      within(right).getByRole("heading", { name: "Bien dormir" })
    ).toBeVisible()
    const choose = () =>
      fireEvent.pointerDown(
        document.querySelector<HTMLElement>(`[data-block-id="${BLOCK}"]`)!
      )

    choose()
    await waitFor(() =>
      expect(panel()).toHaveAccessibleName(texts.editor.settings.label)
    )
    // L'Article reste dessous, hors du clavier ; « Publier » reste visible en bas.
    expect(articleTab()).toHaveAttribute("inert")
    expect(
      within(panel()).getByRole("heading", { name: "Image" })
    ).toBeVisible()
    expect(
      within(right).getByRole("button", {
        name: texts.publication.actions.publish,
      })
    ).toBeVisible()

    // × : plus de bloc choisi, le focus au titre de la colonne.
    fireEvent.click(
      within(panel()).getByRole("button", { name: texts.common.close })
    )
    expect(
      screen.queryByRole("button", { name: texts.common.close })
    ).toBeNull()
    expect(articleTab()).not.toHaveAttribute("inert")
    await waitFor(() =>
      expect(
        within(right).getByRole("heading", { name: "Bien dormir" })
      ).toHaveFocus()
    )

    // Échap, depuis la glissière.
    choose()
    const close = await within(panel()).findByRole("button", {
      name: texts.common.close,
    })
    fireEvent.keyDown(close, { key: "Escape" })
    expect(
      screen.queryByRole("button", { name: texts.common.close })
    ).toBeNull()

    // Le titre (dans l'aperçu) revient aussi à l'Article.
    choose()
    await within(panel()).findByRole("button", {
      name: texts.common.close,
    })
    fireEvent.focus(title)
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: texts.common.close })
      ).toBeNull()
    )
  })

  it("un clic sur le fond autour du téléphone remet l'éditeur à son état de base", async () => {
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
    await editable()
    fireEvent.pointerDown(
      document.querySelector<HTMLElement>(`[data-block-id="${BLOCK}"]`)!
    )
    openBlocks()
    await within(panel()).findByRole("button", {
      name: texts.common.close,
    })
    expect(blocksPanel()).toBeVisible()
    // Le fond autour du téléphone : le Plan, plus de bloc choisi.
    fireEvent.click(document.querySelector("main")!)
    expect(screen.queryByRole("region", { name: columns.blocks })).toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.common.close })
    ).toBeNull()
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
        {
          blocks: [
            { id: TEXT, type: "text", doc },
            // Une image : la Lecture la montre sans planter (02/10/2026).
            {
              id: "00000000-0000-4000-8000-0000000000d5",
              type: "image",
              mediaId: PLAGE,
              caption: null,
              alt: null,
            },
          ],
        },
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
    // L'image du bloc (son adresse d'aperçu n'est pas lue ici) : affichée, sans planter.
    expect(phone.querySelectorAll(".blocks-read .blocks-image")).toHaveLength(2)
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
      within(screen.getByRole("navigation", { name: outline.title })).getByRole(
        "button",
        { name: /^Aller à Texte/ }
      )
    )
    expect(await screen.findByLabelText(texts.editor.title.label)).toBeVisible()
    expect(
      within(tools).queryByRole("button", { name: preview.reader.visitor })
    ).toBeNull()
  })

  it("le plan montre le contenu : l'intertitre qui ouvre un texte (sans les suivants), le fichier d'une image, le bloc partagé", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000e1",
            type: "text",
            doc: {
              type: "doc",
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [{ type: "text", text: "Les bons réflexes" }],
                },
                {
                  type: "heading",
                  attrs: { level: 3 },
                  content: [{ type: "text", text: "Le soir" }],
                },
              ],
            },
          },
          {
            id: "00000000-0000-4000-8000-0000000000e2",
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
          {
            id: "00000000-0000-4000-8000-0000000000e3",
            type: "linked",
            templateId: "00000000-0000-4000-8000-0000000000e4",
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    // Le contenu plutôt que le type : « Texte « … » » reste le nom lu par les lecteurs d'écran.
    expect(within(plan).getByText("Les bons réflexes")).toBeVisible()
    // Ses autres intertitres n'apparaissent pas dans le plan.
    expect(within(plan).queryByText("Le soir")).toBeNull()
    expect(await within(plan).findByText("plage.png")).toBeVisible()
    // Le bloc partagé : son nom, sans pastille « Partagé » (« Bloc choisi » le dit, 03/10/2026).
    expect(
      within(plan).getByRole("button", {
        name: outline.select(texts.editor.blockLabel.linked(null)),
      })
    ).toBeVisible()
    expect(within(plan).queryByText("Partagé")).toBeNull()
    // Le modèle n'existe plus : écrit en clair.
    expect(
      await within(plan).findByText(outline.warnings.missingTemplate)
    ).toBeVisible()
  })

  it("une image sans texte alternatif n'est plus signalée, et une image n'a plus de légende", async () => {
    vi.mocked(api.getMediaByIds).mockResolvedValue([{ ...plage, alt: null }])
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        cover: { mediaId: PLAGE },
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000f5",
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    expect(await within(plan).findByText("plage.png")).toBeVisible()
    expect(within(plan).queryByText(outline.warnings.noFile)).toBeNull()
    const image = document.querySelector('[data-block-type="image"]')!
    expect(within(image as HTMLElement).queryByRole("textbox")).toBeNull()
    expect(screen.queryByText(/texte alternatif/i)).toBeNull()
  })

  it("le plan : sans l'image de présentation, points à vérifier, encadré replié, survol partagé avec l'aperçu", async () => {
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
    // Les blocs du premier niveau : la section (son image est comptée par elle).
    expect(within(plan).getByText(outline.count(1))).toBeVisible()
    // L'image de présentation n'est pas dans le plan : elle se règle dans la colonne de droite.
    expect(
      within(plan).queryByText(texts.editor.article.ready.items.cover)
    ).toBeNull()
    // Ce qui manque : une icône devant le libellé (le détail dans l'infobulle), qui décrit la
    // ligne ; le haut du plan ne compte que les blocs.
    expect(
      within(plan).getByRole("button", {
        name: outline.select(texts.editor.blockLabel.image),
      })
    ).toHaveAccessibleDescription(outline.warnings.noFile)
    expect(within(plan).queryByText(/point à vérifier/)).toBeNull()
    expect(within(plan).getByText(outline.box.fill)).toBeVisible()

    // L'encadré se replie : son image ne se voit plus dans le plan.
    const boxLabel = texts.editor.blockLabel.box(outline.box.fill, 1)
    const imageRow = within(plan).getByRole("button", {
      name: outline.select(texts.editor.blockLabel.image),
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
    fireEvent.pointerEnter(boxRow.parentElement!)
    await waitFor(() => expect(boxInPhone).toHaveAttribute("data-hovered"))
    fireEvent.pointerLeave(boxRow.parentElement!)
    await waitFor(() => expect(boxInPhone).not.toHaveAttribute("data-hovered"))
    fireEvent.pointerOver(document.querySelector(`[data-block-id="${IMAGE}"]`)!)
    await waitFor(() =>
      expect(
        within(plan)
          .getByRole("button", {
            name: outline.select(texts.editor.blockLabel.image),
          })
          .closest("div")
      ).toHaveClass("bg-accent/60")
    )

    // « … » : Enregistrer dans Mes blocs pour un bloc de premier niveau seulement.
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.actions(boxLabel) })
    )
    expect(
      await screen.findByRole("menuitem", {
        name: texts.templates.saveAs.action,
      })
    ).toBeVisible()
    fireEvent.keyDown(document.activeElement!, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
  })

  it("un bloc choisi dans le plan monte en haut de l'écran du téléphone", async () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const BLOCK = "00000000-0000-4000-8000-0000000000f8"
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: BLOCK,
            type: "image",
            mediaId: null,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    fireEvent.click(
      within(plan).getByRole("button", {
        name: outline.select(texts.editor.blockLabel.image),
      })
    )
    await waitFor(() =>
      expect(scroll).toHaveBeenCalledWith({
        block: "start",
        behavior: "smooth",
      })
    )
    expect(scroll.mock.contexts.at(-1)).toBe(
      document.querySelector(`[data-block-id="${BLOCK}"]`)
    )
  })

  it("« Bloc choisi » : les actions en icônes, dans une barre en bas de l'onglet", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000f7",
            type: "box",
            look: "fill",
            blocks: [],
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    fireEvent.click(
      within(plan).getByRole("button", {
        name: outline.select(texts.editor.blockLabel.box(outline.box.fill, 0)),
      })
    )
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    const names = within(bar)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"))
    expect(names).toEqual([
      texts.editor.settings.moveUp,
      texts.editor.settings.moveDown,
      outline.duplicate,
      texts.templates.saveAs.action,
      texts.editor.settings.remove,
    ])
    // Des icônes seules : leur nom est dans l'infobulle.
    expect(bar).not.toHaveTextContent(texts.editor.settings.remove)
    // Le plan dit « Section » (anciennement « Encadré »).
    expect(within(plan).getByText(/Section avec fond/)).toBeVisible()
  })

  it("une section choisie dans le plan reste choisie (pas son premier texte), et « Dupliquer » la copie", async () => {
    Element.prototype.scrollIntoView = vi.fn()
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000f9",
            type: "box",
            look: "border",
            blocks: [
              {
                id: "00000000-0000-4000-8000-0000000000fa",
                type: "text",
                doc: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Dans la section" }],
                    },
                  ],
                },
              },
            ],
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    const section = texts.editor.blockLabel.box(outline.box.border, 1)
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.select(section) })
    )
    expect(
      await screen.findByText(texts.editor.settings.title(section))
    ).toBeVisible()
    const bar = screen.getByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    expect(
      within(bar).getByRole("button", { name: texts.templates.saveAs.action })
    ).toBeInTheDocument()
    fireEvent.click(
      within(bar).getByRole("button", { name: outline.duplicate })
    )
    await waitFor(() =>
      expect(within(plan).getByText(outline.count(2))).toBeVisible()
    )
  })

  it("l'aperçu n'a pas de poignée : c'est le plan qui range les blocs", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000f6",
            type: "image",
            mediaId: null,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    const name = texts.editor.blockLabel.image
    // Une seule poignée pour ce bloc : celle du plan (le téléphone n'en a pas).
    const handles = screen.getAllByRole("button", {
      name: texts.editor.handle(name),
    })
    expect(handles).toHaveLength(1)
    expect(plan).toContainElement(handles[0])
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

  it("l'écran entier n'existe qu'en Lecture, réduit d'après la hauteur disponible", async () => {
    // jsdom n'a pas ResizeObserver : la hauteur mesurée est 0, l'écran descend à 40 %.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        callback: () => void
        constructor(callback: () => void) {
          this.callback = callback
        }
        observe() {
          this.callback()
        }
        disconnect() {}
      }
    )
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    expect(
      within(tools).queryByRole("button", { name: preview.fit.full })
    ).toBeNull()

    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.fit.full })
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    expect(phone).toHaveAttribute("data-fit", "full")
    // « 40 % » à l'écran, la phrase entière pour les lecteurs d'écran.
    expect(within(tools).getByText(preview.fit.scale(40))).toBeVisible()
    expect(
      within(tools).getByText(preview.fit.scaleLabel(40))
    ).toBeInTheDocument()

    // En Édition, l'écran reprend sa vraie largeur.
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.edit })
    )
    expect(phone).not.toHaveAttribute("data-fit")
    vi.unstubAllGlobals()
  })

  it("« Ajouter un bloc » ouvre les Blocs par-dessus le Plan, le curseur sur le premier ; × les referme", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    // Celui du téléphone (le plan vide a le même).
    fireEvent.click(
      within(
        screen.getByRole("region", { name: preview.screen.ios })
      ).getByRole("button", { name: texts.editor.add.label })
    )
    expect(blocksPanel()).toBeVisible()
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: texts.editor.library.addLabel(texts.editor.blocks.text),
        })
      ).toHaveFocus()
    )
    // Pas de bandeau : le bloc s'ajoutera à la fin.
    expect(screen.queryByText(texts.editor.library.target.box)).toBeNull()
    expect(screen.queryByRole("dialog")).toBeNull()
    // Le Plan, dessous, est hors du clavier ; × referme les Blocs, le focus va à « Ajouter un
    // bloc » en bas de la colonne.
    fireEvent.click(
      within(blocksPanel()).getByRole("button", {
        name: texts.editor.library.close,
      })
    )
    expect(screen.queryByRole("region", { name: columns.blocks })).toBeNull()
    await waitFor(() =>
      expect(document.getElementById("colonne-gauche-ajouter")).toHaveFocus()
    )
  })

  it("« Ajouter dans la section » : les Blocs ajoutent à la fin de la section, sans section ni bloc enregistré", async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const BOX = "00000000-0000-4000-8000-0000000000e1"
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [{ id: BOX, type: "box", look: "fill", blocks: [] }],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    // Le téléphone et le plan ont chacun le bouton ; celui du téléphone.
    expect(
      screen.getAllByRole("button", { name: texts.editor.add.inBox })
    ).toHaveLength(2)
    fireEvent.click(
      within(
        screen.getByRole("region", { name: preview.screen.ios })
      ).getByRole("button", { name: texts.editor.add.inBox })
    )
    const library = blocksPanel()
    expect(
      within(library).getByText(texts.editor.library.target.box)
    ).toBeVisible()
    // La section est le bloc choisi : ses réglages sont à droite.
    expect(panel()).toHaveAccessibleName(texts.editor.settings.label)
    expect(
      within(library).getByRole("button", {
        name: texts.editor.library.addLabel(texts.editor.blocks.box),
      })
    ).toBeDisabled()
    expect(
      within(library).getByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    ).toBeDisabled()

    fireEvent.click(
      within(library).getByRole("button", {
        name: texts.editor.library.addLabel(texts.editor.blocks.text),
      })
    )
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const saved = vi.mocked(api.saveDraft).mock.calls.at(-1)![2]
    expect(saved.blocks).toHaveLength(1)
    expect(saved.blocks[0]).toMatchObject({
      id: BOX,
      blocks: [{ type: "text" }],
    })
    // Le bandeau s'en va une fois le bloc ajouté.
    expect(
      within(library).queryByText(texts.editor.library.target.box)
    ).toBeNull()
  }, 10_000)

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
    // Pas encore choisi : la liste le dit elle-même, sans phrase orange dessous.
    expect(within(tab).getByRole("combobox")).toHaveTextContent(
      texts.publication.settings.access.notChosenShort
    )
    expect(
      within(tab).queryByText(texts.publication.settings.access.notChosen)
    ).toBeNull()

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
    openBlocks()
    const library = blocksPanel()
    fireEvent.click(
      within(library).getByRole("button", {
        name: texts.editor.library.addLabel(texts.editor.blocks.text),
      })
    )
    // Le nouveau bloc est choisi : ses réglages glissent à droite.
    expect(
      await screen.findByRole("button", { name: texts.common.close })
    ).toBeVisible()
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
    // « Gérer dans Modèles de bloc » s'ouvre dans un nouvel onglet : l'éditeur reste ouvert.
    expect(
      within(mine).getByRole("link", {
        name: new RegExp(texts.editor.library.mine.manage),
      })
    ).toHaveAttribute("target", "_blank")
    fireEvent.click(
      await within(mine).findByRole("button", {
        name: texts.editor.library.mine.insertLabel("À retenir"),
      })
    )
    expect(
      await screen.findByText(texts.editor.library.mine.added("À retenir"))
    ).toBeInTheDocument()
    // Dans l'aperçu réduit de « Mes blocs », dans l'article, et dans le Plan (sous les Blocs).
    await waitFor(() =>
      expect(screen.getAllByText("Retiens bien ceci.")).toHaveLength(3)
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
    // L'historique s'ouvre depuis le menu de « Publier ».
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.more })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.history,
      })
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

    // L'image choisie, « Publier » est possible.
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
    // Le champ du titre s'allume : c'est là qu'il faut agir.
    expect(title).toHaveAttribute("data-highlight")

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

describe("éditeur du Fil : en-têtes des colonnes et lecture seule", () => {
  const CLAIRE = "00000000-0000-4000-8000-00000000c1a1"
  const claire: api.LockRow = {
    ...mine,
    mine: false,
    holder_id: CLAIRE,
    holder_name: "Claire Martin",
  }
  const dialog = texts.editor.lock.dialog

  it("pas de barre du haut : le retour et « Ajouter un bloc » en bas à gauche ; l'enregistrement, Publier et son état à droite", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    expect(screen.queryByRole("banner")).toBeNull()
    const left = screen.getByRole("complementary", { name: columns.left })
    expect(
      within(left).getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    ).toBeInTheDocument()
    const right = screen.getByRole("complementary", { name: columns.right })
    expect(within(right).getByText(texts.editor.save.saved)).toBeInTheDocument()
    for (const name of [
      texts.publication.actions.publish,
      texts.publication.actions.more,
    ]) {
      expect(within(right).getByRole("button", { name })).toBeInTheDocument()
    }
    // Historique est dans le menu de « Publier », pas à côté.
    expect(
      within(right).queryByRole("button", {
        name: texts.publication.actions.history,
      })
    ).toBeNull()
    fireEvent.click(
      within(right).getByRole("button", {
        name: texts.publication.actions.more,
      })
    )
    expect(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.history,
      })
    ).toBeVisible()
    // Concentration est dans la barre de l'aperçu, sous Édition et Lecture.
    expect(
      within(right).queryByRole("button", {
        name: texts.editor.focusMode.label,
      })
    ).toBeNull()
    expect(
      within(
        screen.getByRole("toolbar", { name: texts.editor.preview.tools })
      ).getByRole("button", { name: texts.editor.focusMode.label })
    ).toBeInTheDocument()
    expect(
      await within(right).findByText(texts.publication.status.draft)
    ).toBeInTheDocument()
    // Pas de cadenas quand on écrit.
    expect(
      within(right).queryByRole("button", { name: texts.editor.lock.button })
    ).toBeNull()
  })

  it("une programmation : « Programmé » à côté de « Publier », et son bandeau au-dessus du téléphone", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(publicationApi.getPublication).mockResolvedValue({
      id: ARTICLE,
      draft_rev: 4,
      first_published_at: null,
      scheduled_at: "2099-10-25T06:00:00Z",
      scheduled_by_name: null,
      schedule_error: null,
      deleted_at: null,
      live: null,
    })
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const right = screen.getByRole("complementary", { name: columns.right })
    // Une pastille courte à côté de « Publier », la phrase entière pour les lecteurs d'écran (et
    // dans l'infobulle).
    const badge = await within(right).findByText(
      texts.publication.short.scheduled
    )
    expect(badge.closest("[data-publication]")).toHaveTextContent(
      /Brouillon · Programmé le 25 oct\. 2099/
    )
    const banner = document.querySelector("[data-schedule-banner]")!
    expect(banner).toBeInTheDocument()
    expect(screen.getByRole("main")).toContainElement(banner as HTMLElement)
  })

  it("l'état de publication illisible : « État inconnu » (jamais « Brouillon »), « Publier » grisé, un clic le relit", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(publicationApi.getPublication).mockRejectedValueOnce(
      new Error("réseau")
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const right = screen.getByRole("complementary", { name: columns.right })
    const unknown = await within(right).findByRole("button", {
      name: texts.publication.status.unknownHint,
    })
    expect(within(right).queryByText(texts.publication.short.draft)).toBeNull()
    expect(
      within(right).getByRole("button", {
        name: texts.publication.actions.publish,
      })
    ).toBeDisabled()
    fireEvent.click(unknown)
    expect(
      await within(right).findByText(texts.publication.short.draft)
    ).toBeInTheDocument()
    expect(
      within(right).getByRole("button", {
        name: texts.publication.actions.publish,
      })
    ).toBeEnabled()
  })

  it("quelqu'un écrit déjà à l'ouverture : pas de fenêtre, le cadenas l'ouvre et « Prendre la main » agit sans seconde confirmation", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    vi.mocked(api.lockTake).mockResolvedValueOnce(claire)
    vi.mocked(api.lockStatus).mockResolvedValue(claire)
    renderApp(`/blog/${ARTICLE}`)
    const lock = await screen.findByRole("button", {
      name: texts.editor.lock.button,
    })
    expect(screen.queryByRole("alertdialog")).toBeNull()
    // Le bandeau des autres éditeurs n'est pas là.
    expect(
      screen.queryByText(texts.editor.lock.readOnly("Claire Martin"))
    ).toBeNull()

    fireEvent.click(lock)
    const window = await screen.findByRole("alertdialog")
    expect(
      within(window).getByText(dialog.title.readOnly("Claire Martin"))
    ).toBeInTheDocument()
    expect(
      within(window).getByText(dialog.note.other("Claire Martin"))
    ).toBeInTheDocument()
    // Quelqu'un d'autre écrit : « Rester en lecture seule » est le bouton principal (le dernier).
    const buttons = within(window).getAllByRole("button")
    expect(buttons.at(-1)).toHaveTextContent(dialog.stay)

    vi.mocked(api.lockStatus).mockResolvedValue(mine)
    fireEvent.click(
      within(window).getByRole("button", { name: dialog.take.readOnly })
    )
    await waitFor(() =>
      expect(api.lockTake).toHaveBeenLastCalledWith(
        ARTICLE,
        true,
        expect.any(String)
      )
    )
    await editable()
    expect(
      screen.queryByRole("button", { name: texts.editor.lock.button })
    ).toBeNull()
  })

  it("perdre la main ouvre la fenêtre une fois ; Échap y laisse le cadenas, qui la rouvre", async () => {
    let emit: (change: api.LockChange) => void = () => {}
    vi.mocked(api.subscribeLock).mockImplementation((_id, onChange) => {
      emit = onChange
      return () => {}
    })
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()

    vi.mocked(api.lockStatus).mockResolvedValue(claire)
    act(() =>
      emit({
        holder_id: CLAIRE,
        holder_session: null,
        heartbeat_at: new Date().toISOString(),
        draft_rev: 4,
        taken_at: new Date().toISOString(),
      })
    )
    const window = await screen.findByRole("alertdialog")
    expect(
      await within(window).findByText(dialog.title.lost("Claire Martin"))
    ).toBeInTheDocument()
    expect(
      within(window).getByRole("button", { name: dialog.take.lost })
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    // Elle ne se rouvre pas d'elle-même ; le cadenas la rouvre.
    const lock = screen.getByRole("button", { name: texts.editor.lock.button })
    fireEvent.click(lock)
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument()
  })

  it("Concentration : une pastille garde l'enregistrement et « Quitter la Concentration »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    expect(
      screen.queryByRole("button", { name: texts.editor.focusMode.exit })
    ).toBeNull()
    fireEvent.click(
      screen.getByRole("button", { name: texts.editor.focusMode.label })
    )
    fireEvent.click(
      screen.getByRole("button", { name: texts.editor.focusMode.exit })
    )
    expect(
      screen.getByRole("complementary", { name: columns.left })
    ).not.toHaveClass("hidden")
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

describe("éditeur du Fil : le builder relu sur un article complet (03/10/2026)", () => {
  const TEXT = "00000000-0000-4000-8000-0000000000d1"
  const IMAGE = "00000000-0000-4000-8000-0000000000d2"
  const BOX = "00000000-0000-4000-8000-0000000000d3"
  const INNER = "00000000-0000-4000-8000-0000000000d4"
  const LAST = "00000000-0000-4000-8000-0000000000d5"
  const EMPTY = "00000000-0000-4000-8000-0000000000d6"
  const LINKED = "00000000-0000-4000-8000-0000000000d7"
  const TEMPLATE = "00000000-0000-4000-8000-0000000000d8"
  const paragraph = (text: string) => ({
    type: "paragraph" as const,
    content: [{ type: "text" as const, text }],
  })
  const textBlock = (id: string, ...content: Doc["content"]) => ({
    id,
    type: "text" as const,
    doc: { type: "doc" as const, content } as Doc,
  })

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          textBlock(TEXT, {
            type: "heading",
            attrs: { level: 3 },
            content: [{ type: "text", text: "Trois gestes" }],
          }),
          {
            id: IMAGE,
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
          {
            id: BOX,
            type: "box",
            look: "border",
            blocks: [
              textBlock(INNER, paragraph("Astuce"), paragraph("Prépare tout")),
              textBlock(LAST, paragraph("Une question ?")),
            ],
          },
          { id: EMPTY, type: "box", look: "fill", blocks: [] },
          { id: LINKED, type: "linked", templateId: TEMPLATE },
        ],
      })
    )
    vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
      {
        id: TEMPLATE,
        title: "Besoin d'aide ?",
        sort: "shared",
        inTrash: false,
        draft: {
          v: 1,
          title: "Besoin d'aide ?",
          blocks: [textBlock(LAST, paragraph("Écris-nous."))],
        },
      },
    ])
  })

  /** Choisit une ligne du plan d'après le nom du bloc. */
  function choose(label: string) {
    const plan = screen.getByRole("navigation", { name: outline.title })
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.select(label) })
    )
  }

  it("la barre de mise en forme suit le bloc choisi : grisée pour une image ou un bloc partagé", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const toolbar = screen.getByRole("toolbar", {
      name: texts.editor.toolbar.label,
    })
    const h3 = within(toolbar).getByRole("button", {
      name: texts.editor.toolbar.h3,
    })
    choose(texts.editor.blockLabel.text("Trois gestes"))
    await waitFor(() => expect(h3).toHaveAttribute("aria-pressed", "true"))
    // Sans mots sélectionnés, « Lien » n'aurait rien sur quoi se poser.
    expect(
      within(toolbar).getByRole("button", { name: texts.editor.toolbar.link })
    ).toBeDisabled()
    choose(texts.editor.blockLabel.image)
    await waitFor(() => expect(h3).toBeDisabled())
    choose(texts.editor.blockLabel.linked("Besoin d'aide ?"))
    await waitFor(() => expect(h3).toBeDisabled())
  })

  it("une section vide est signalée dans le plan et dans « Prêt à publier ? », qui y mène", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    expect(within(plan).getByText(outline.warnings.emptyBox)).toBeVisible()
    // Les blocs du premier niveau seulement.
    expect(within(plan).getByText(outline.count(5))).toBeVisible()
    fireEvent.click(
      within(articleTab()).getByRole("button", {
        name: article.ready.warnings(1),
      })
    )
    expect(
      await screen.findByText(
        texts.editor.settings.title(
          texts.editor.blockLabel.box(outline.box.fill, 0)
        )
      )
    ).toBeVisible()
    // Sa ligne s'allume dans le plan.
    await waitFor(() =>
      expect(
        within(plan).getByRole("button", {
          name: outline.select(
            texts.editor.blockLabel.box(outline.box.fill, 0)
          ),
        })
      ).toHaveAttribute("data-highlight")
    )
  })

  it("« Prêt à publier ? » : la carte à régler s'allume, et le curseur va sur son réglage", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(
      within(articleTab()).getByRole("button", {
        name: article.ready.todo(article.ready.items.cover),
      })
    )
    const card = within(articleTab()).getByRole("region", {
      name: article.feed.title,
    })
    expect(card).toHaveAttribute("data-highlight")
    await waitFor(() =>
      expect(document.getElementById("article-image")).toHaveFocus()
    )
  })

  it("colonne de droite : le titre en tête, et en bas la lecture, l'état et « Publier » ; l'image a son icône Info", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const right = screen.getByRole("complementary", { name: columns.right })
    // « Publier » et l'état sont après l'Article : dans la section du bas.
    const publish = within(right).getByRole("button", {
      name: texts.publication.actions.publish,
    })
    expect(
      articleTab().compareDocumentPosition(publish) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(within(right).getByText(/min · \d+ mots?$/)).toBeVisible()
    // L'état de l'enregistrement est en bas à droite, plus à gauche.
    expect(right.querySelector("[data-save-status]")).not.toBeNull()
    expect(
      screen
        .getByRole("complementary", { name: columns.left })
        .querySelector("[data-save-status]")
    ).toBeNull()

    // La phrase de l'image est dans l'infobulle de l'icône Info.
    expect(
      within(articleTab()).getByRole("button", { name: article.feed.hint })
    ).toBeVisible()
    // Plus de résumé, donc plus de glissière.
    expect(within(articleTab()).queryByRole("meter")).toBeNull()
  })

  it("un texte se résume par sa première ligne, dans le plan comme dans « Bloc choisi »", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    expect(within(plan).getByText("Astuce")).toBeVisible()
    expect(within(plan).queryByText(/Astuce Prépare/)).toBeNull()
    choose(texts.editor.blockLabel.text("Astuce"))
    expect(
      await screen.findByText(
        texts.editor.settings.title(texts.editor.blockLabel.text("Astuce"))
      )
    ).toBeVisible()
  })

  it("un bloc sort de sa section : « Monter hors de la section », et « Sortir de la section » du plan", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    choose(texts.editor.blockLabel.text("Astuce"))
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    fireEvent.click(
      within(bar).getByRole("button", {
        name: texts.editor.settings.moveUpOut,
      })
    )
    // Sorti, juste au-dessus de la section : 3e bloc de la page sur 6.
    expect(
      await screen.findByText(
        texts.editor.settings.moved(3, 6, texts.editor.dnd.page)
      )
    ).toBeInTheDocument()

    const plan = screen.getByRole("navigation", { name: outline.title })
    const label = texts.editor.blockLabel.text("Une question ?")
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.actions(label) })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.leaveBox })
    )
    expect(await screen.findByText(outline.left(label))).toBeInTheDocument()
    expect(within(plan).getByText(outline.count(7))).toBeVisible()
  })

  it("« Mes blocs » montre les images d'un bloc enregistré, pas leur icône", async () => {
    vi.mocked(mediaApi.getPreviewUrls).mockResolvedValue({
      [mediaApi.previewKey(plage)]: "blob:plage",
    })
    vi.mocked(templatesApi.listTemplates).mockResolvedValue([
      {
        id: TEMPLATE,
        title: "Besoin d'aide ?",
        sort: "shared",
        templateFor: null,
        draft: {
          v: 1,
          title: "Besoin d'aide ?",
          blocks: [
            {
              id: BOX,
              type: "box",
              look: "fill",
              blocks: [
                {
                  id: IMAGE,
                  type: "image",
                  mediaId: PLAGE,
                  caption: null,
                  alt: null,
                },
              ],
            },
          ],
        },
        draft_saved_at: "2026-09-30T10:00:00Z",
      },
    ])
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    openBlocks()
    const library = blocksPanel()
    fireEvent.click(
      await within(library).findByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    )
    const mine = await within(library).findByRole("region", {
      name: texts.editor.library.mine.title,
    })
    await waitFor(() =>
      expect(mine.querySelector('img[src="blob:plage"]')).not.toBeNull()
    )
  })

  it("une image : sa vignette et sa fiche dans la Médiathèque", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    choose(texts.editor.blockLabel.image)
    // Le lien dit aussi qu'il ouvre un nouvel onglet (lecteurs d'écran).
    const link = await screen.findByRole("link", {
      name: `${texts.editor.settings.image.openInLibrary} ${texts.editor.presentation.openFileHint}`,
    })
    expect(link).toHaveAttribute("href", `/mediatheque?fichier=${PLAGE}`)
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("un bloc partagé : pas de barre dans l'aperçu ; deux points courts et ses actions en icônes dans « Bloc choisi »", async () => {
    const name = "Besoin d'aide ?"
    const linked = texts.templates.linked
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    // Le bloc du modèle s'affiche, sans « Bloc partagé « … » » au-dessus.
    expect(await screen.findByText("Écris-nous.")).toBeInTheDocument()
    expect(screen.queryByText(linked.label(name))).toBeNull()

    choose(texts.editor.blockLabel.linked(name))
    expect(await screen.findByText(linked.settings(name))).toBeVisible()
    expect(screen.getByText(linked.detachHint)).toBeVisible()
    const bar = screen.getByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    expect(
      within(bar).getByRole("link", { name: linked.editLabel(name) })
    ).toHaveAttribute("href", `/modeles/${TEMPLATE}`)
    // Des icônes seules, leur nom dans l'infobulle.
    expect(bar).not.toHaveTextContent(linked.detach)
    fireEvent.click(
      within(bar).getByRole("button", { name: linked.detachLabel(name) })
    )
    expect(await screen.findByText(linked.detached(name))).toBeInTheDocument()
    // Le bouton « Détacher » a disparu : le focus va à la ligne du bloc dans le plan.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-outline-id="${LINKED}"]`)
      )
    )
  })

  it("le plan : une section a son icône, comme les autres lignes (l'icône dit le type)", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    for (const id of [TEXT, IMAGE, BOX, EMPTY, LINKED]) {
      const row = document.querySelector(`[data-outline-id="${id}"]`)!
      // Une image a sa vignette ; les autres, l'icône de leur type.
      expect(row.querySelector("svg, img, span[aria-hidden]")).not.toBeNull()
    }
    const box = document.querySelector(`[data-outline-id="${BOX}"]`)!
    expect(box.firstElementChild?.tagName.toLowerCase()).toBe("svg")
  })

  it("supprimer un bloc (barre du bas ou menu ⋮ du plan) : le focus va à la ligne de son voisin", async () => {
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    choose(texts.editor.blockLabel.image)
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    fireEvent.click(
      within(bar).getByRole("button", { name: texts.editor.settings.remove })
    )
    // L'aperçu du Fil n'a pas de poignée : c'est la ligne du plan du bloc suivant.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-outline-id="${BOX}"]`)
      )
    )

    const plan = screen.getByRole("navigation", { name: outline.title })
    const label = texts.editor.blockLabel.text("Astuce")
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.actions(label) })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.remove })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-outline-id="${LAST}"]`)
      )
    )
  })
})

describe("éditeur du Fil : une adresse d'aperçu qui ne vient pas", () => {
  it("l'image le dit, avec « Réessayer », au lieu de « Chargement… » sans fin", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000ea",
            type: "image",
            mediaId: PLAGE,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    vi.mocked(mediaApi.getPreviewUrls).mockRejectedValueOnce(
      new Error("réseau")
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    expect(
      await within(phone).findByText(texts.editor.image.loadFailed)
    ).toBeVisible()
    fireEvent.click(
      within(phone).getByRole("button", { name: texts.common.retry })
    )
    await waitFor(() =>
      expect(
        within(phone).queryByText(texts.editor.image.loadFailed)
      ).toBeNull()
    )
    expect(phone.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("blob:")
    )
  })
})

describe("éditeur du Fil : un brouillon changé ailleurs qui ne se relit pas", () => {
  it("le dit au-dessus du téléphone, puis le relit au nouvel essai", async () => {
    // Quelqu'un a écrit entre l'ouverture et la prise du verrou (révision 6) : à relire.
    vi.mocked(api.getContent)
      .mockResolvedValueOnce(contentOf(ARTICLE, "article"))
      .mockRejectedValueOnce(new Error("réseau"))
      .mockResolvedValue(
        contentOf(ARTICLE, "article", { title: "Relu" }, { draft_rev: 6 })
      )
    vi.mocked(api.lockTake).mockResolvedValue({ ...mine, draft_rev: 6 })
    vi.mocked(api.lockStatus).mockResolvedValue({ ...mine, draft_rev: 6 })
    renderApp(`/blog/${ARTICLE}`)
    expect(
      await screen.findByText(texts.editor.save.rereadFailed)
    ).toBeInTheDocument()
    await waitFor(
      () =>
        expect(screen.queryByText(texts.editor.save.rereadFailed)).toBeNull(),
      { timeout: 5000 }
    )
    expect(await screen.findByDisplayValue("Relu")).not.toHaveAttribute(
      "readonly"
    )
  }, 10_000)
})

describe("éditeur du Fil : le dernier bloc supprimé", () => {
  it("le focus va à « Ajouter un bloc », en bas de la colonne de gauche ; son « Annuler » part avec l'éditeur", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {
        blocks: [
          {
            id: "00000000-0000-4000-8000-0000000000e9",
            type: "image",
            mediaId: null,
            caption: null,
            alt: null,
          },
        ],
      })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    const plan = screen.getByRole("navigation", { name: outline.title })
    fireEvent.click(
      within(plan).getByRole("button", {
        name: outline.select(texts.editor.blockLabel.image),
      })
    )
    const bar = await screen.findByRole("toolbar", {
      name: texts.editor.settings.actions,
    })
    fireEvent.click(
      within(bar).getByRole("button", { name: texts.editor.settings.remove })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById("colonne-gauche-ajouter")
      )
    )
    // Son « Annuler » part avec l'éditeur : après la fermeture, il ne ferait plus rien.
    const removed = texts.editor.settings.removed(texts.editor.blockLabel.image)
    expect(await screen.findByText(removed)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("link", {
        name: texts.editor.back(texts.sections.blog.title),
      })
    )
    await waitFor(() => expect(screen.queryByText(removed)).toBeNull())
  })
})

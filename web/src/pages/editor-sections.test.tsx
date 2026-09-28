import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
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

describe("éditeur d'un article", () => {
  it("s'ouvre à /blog/<id>, avec « ← Blog » et la présentation à droite", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf(ARTICLE, "article"))
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    expect(
      screen.getByRole("link", { name: texts.editor.back("Blog") })
    ).toHaveAttribute("href", "/blog")
    expect(
      within(panel()).getByRole("heading", { name: words.panelTitle.article })
    ).toBeVisible()
    // Le nom du panneau suit ce qu'il montre.
    expect(panel()).toHaveAccessibleName(words.panelTitle.article)
    expect(within(panel()).getByText(words.cover.none)).toBeVisible()
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    // Un article n'a pas d'audio.
    expect(within(panel()).queryByText(words.audio.label)).toBeNull()
  })

  it("choisit l'image de présentation dans la médiathèque et écrit le résumé", async () => {
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
    expect(dialog).toHaveTextContent(texts.editor.picker.title)
    expect(mediaApi.listMedia).toHaveBeenCalledWith({
      kind: "image",
      search: "",
    })
    fireEvent.click(
      await within(dialog).findByRole("button", {
        name: texts.editor.picker.choose("plage.png"),
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(within(panel()).getByText("plage.png")).toBeVisible()
    expect(
      within(panel()).getByText(
        words.cover.alt("Une plage au coucher du soleil")
      )
    ).toBeVisible()

    fireEvent.change(screen.getByLabelText(words.summary.label), {
      target: { value: "Cinq gestes\npour l'été" },
    })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    const saved = vi.mocked(api.saveDraft).mock.calls.at(-1)![2]
    expect(saved.cover).toEqual({ mediaId: PLAGE })
    // Texte simple, sur une ligne.
    expect(saved.summary).toBe("Cinq gestes pour l'été")
    expect(within(panel()).getByText(words.summary.count("22"))).toBeVisible()
  }, 10_000)

  it("« Retirer l'image » la retire, avec « Annuler »", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", { cover: { mediaId: PLAGE } })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    fireEvent.click(
      await within(panel()).findByRole("button", { name: words.cover.remove })
    )
    expect(within(panel()).getByText(words.cover.none)).toBeVisible()
    // « Retirer l'image » a disparu : le focus passe à « Choisir l'image », à côté.
    expect(
      within(panel()).getByRole("button", { name: words.cover.choose })
    ).toHaveFocus()
    const toast = await screen.findByText(words.cover.removed)
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", {
        name: texts.editor.settings.undo,
      })
    )
    expect(await within(panel()).findByText("plage.png")).toBeVisible()
  })

  it("après un choix depuis l'aperçu, le focus va à « Changer d'image » du panneau", async () => {
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
    // Le bouton de l'aperçu a laissé place à l'image.
    await waitFor(() => expect(preview.querySelector("img")).not.toBeNull())
    expect(within(preview).queryByRole("button")).toBeNull()
    await waitFor(() =>
      expect(
        within(panel()).getByRole("button", { name: words.cover.replace })
      ).toHaveFocus()
    )
  })

  it("« Voir la présentation » donne le focus au titre du panneau", async () => {
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
    await waitFor(() =>
      expect(panel()).toHaveAccessibleName(texts.editor.settings.label)
    )
    fireEvent.click(within(panel()).getByRole("button", { name: words.show }))
    const title = await within(panel()).findByRole("heading", {
      name: words.panelTitle.article,
    })
    await waitFor(() => expect(title).toHaveFocus())
    expect(panel()).toHaveAccessibleName(words.panelTitle.article)
  })

  it("choisit les catégories dans les réglages : elles partent avec le brouillon ([D44])", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {}, { category_ids: [STRESS] })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    await within(panel()).findByText("Stress")

    fireEvent.click(
      within(panel()).getByRole("button", { name: words.categories.edit })
    )
    const sheet = await screen.findByRole("dialog")
    const sommeil = within(sheet).getByRole("checkbox", { name: "Sommeil" })
    expect(sommeil).not.toBeChecked()
    expect(
      within(sheet).getByRole("checkbox", { name: "Stress" })
    ).toBeChecked()
    expect(
      within(sheet).getByRole("link", {
        name: texts.publication.settings.categories.manage,
      })
    ).toHaveAttribute("href", "/blog/categories")

    fireEvent.click(sommeil)
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      category_ids: [SOMMEIL, STRESS].sort(),
    })
    // Un seul délai réel de l'enregistrement automatique (1,5 s) ; la marge couvre une
    // machine lente (garde-fous GitHub).
  }, 10_000)

  it("aucune catégorie : c'est permis ([D44])", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(ARTICLE, "article", {}, { category_ids: [SOMMEIL, STRESS] })
    )
    renderApp(`/blog/${ARTICLE}`)
    await editable()
    await within(panel()).findByText(/Stress/)

    fireEvent.click(
      within(panel()).getByRole("button", { name: words.categories.edit })
    )
    const sheet = await screen.findByRole("dialog")
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Sommeil" }))
    fireEvent.click(within(sheet).getByRole("checkbox", { name: "Stress" }))
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(api.saveDraft).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      category_ids: [],
    })
  }, 10_000)

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
  it("choisit l'audio parmi les audios de la médiathèque et montre sa durée", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf(EPISODE, "episode", { cover: { mediaId: PLAGE } })
    )
    vi.mocked(mediaApi.listMedia).mockResolvedValue([son])
    renderApp(`/podcasts/${EPISODE}`)
    await editable()
    expect(
      screen.getByRole("link", { name: texts.editor.back("Podcasts") })
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

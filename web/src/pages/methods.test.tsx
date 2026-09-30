import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as api from "@/lib/contents/api"
import * as methodsApi from "@/lib/contents/methods"
import type {
  MethodTree,
  OutlineChapter,
  OutlineElement,
  PreviewRow,
} from "@/lib/contents/outline"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import * as mediaApi from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { createFromDialog } from "@/test/new-content"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// La section Méthodes (étape 7, partie 7b) : la liste, l'écran d'une méthode (sa fiche et son
// plan), la publication d'un seul geste avec la liste de ce qui change ([D29]), et les éditeurs
// d'un chapitre et d'une leçon. La base, Realtime et Storage sont simulés.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    findPageBySlug: vi.fn(async () => null),
    listContents: vi.fn(),
    createContent: vi.fn(),
    getContent: vi.fn(),
    getMediaByIds: vi.fn(async () => []),
    saveDraft: vi.fn(),
    lockTake: vi.fn(),
    lockStatus: vi.fn(),
    lockHeartbeat: vi.fn(async () => true),
    lockRelease: vi.fn(async () => true),
    lockReleaseCreated: vi.fn(async () => true),
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
    unpublishContent: vi.fn(),
    trashContent: vi.fn(),
    restoreContent: vi.fn(),
  }
})

vi.mock("@/lib/contents/methods", async (importOriginal) => {
  const actual = await importOriginal<typeof methodsApi>()
  return {
    ...actual,
    getMethodTree: vi.fn(),
    getMethodPreview: vi.fn(),
    reorderOutline: vi.fn(async () => {}),
    setElementFlags: vi.fn(async () => {}),
    getElementContext: vi.fn(),
  }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return {
    ...actual,
    getTemplatesByIds: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    listStarters: vi.fn(async () => []),
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
  return { ...actual, listAccessLevels: vi.fn() }
})

const outline = texts.methods.outline
const changes = texts.methods.changes

const METHOD = "00000000-0000-4000-8000-0000000000d1"
const BASES = "00000000-0000-4000-8000-0000000000c1"
const LOIN = "00000000-0000-4000-8000-0000000000c2"
const SOUFFLE = "00000000-0000-4000-8000-0000000000e1"
const CARREE = "00000000-0000-4000-8000-0000000000e2"
const EXPIRER = "00000000-0000-4000-8000-0000000000e3"
const COVER = "00000000-0000-4000-8000-0000000000f1"
const LEVEL = "00000000-0000-4000-8000-0000000000b1"
const STARTER = "00000000-0000-4000-8000-0000000000a9"
const NEW_ID = "00000000-0000-4000-8000-0000000000aa"

const cover = {
  id: COVER,
  kind: "image",
  name: "respirer.png",
  mime: "image/png",
  status: "ready",
  deleted_at: null,
  alt: "Un ciel bleu",
  transcript: null,
  width: 800,
  height: 500,
  duration_s: null,
  is_public: true,
  path: `${COVER}/respirer.png`,
} as unknown as Media

function contentOf(
  id: string,
  kind: api.ContentKind,
  title: string,
  changes: Partial<api.Content> = {}
): api.Content {
  const draft: Draft = {
    v: 1,
    title,
    summary: null,
    cover: kind === "method" ? { mediaId: COVER } : null,
    audio: null,
    blocks: [],
  }
  return {
    id,
    kind,
    title,
    draft,
    draft_rev: 4,
    draft_saved_at: "2026-09-28T12:30:00Z",
    deleted_at: null,
    parent_id: null,
    access_chosen: kind === "method",
    access_level_id: kind === "method" ? LEVEL : null,
    slug: null,
    template_sort: null,
    template_for: null,
    in_app: false,
    is_free: false,
    category_ids: [],
    ...changes,
  }
}

function element(
  id: string,
  kind: "chapter" | "lesson",
  title: string,
  changes: Partial<OutlineElement> = {}
): OutlineElement {
  return {
    id,
    kind,
    title,
    inApp: false,
    isFree: false,
    draftSavedAt: "2026-09-28T12:00:00Z",
    savedByName: "Anne Admin",
    editingId: null,
    editingName: null,
    published: false,
    ...changes,
  }
}

function chapterOf(
  base: OutlineElement,
  lessons: OutlineElement[]
): OutlineChapter {
  return { ...base, kind: "chapter", lessons }
}

// « Les bases » (en ligne) : « Le souffle » (en ligne, gratuite), « Respiration carrée »
// (cochée, pas encore en ligne). « Aller plus loin » (décoché) : « Expirer lentement » (cochée).
const tree: MethodTree = [
  chapterOf(
    element(BASES, "chapter", "Les bases", { inApp: true, published: true }),
    [
      element(SOUFFLE, "lesson", "Le souffle", {
        inApp: true,
        isFree: true,
        published: true,
      }),
      element(CARREE, "lesson", "Respiration carrée", { inApp: true }),
    ]
  ),
  chapterOf(element(LOIN, "chapter", "Aller plus loin"), [
    element(EXPIRER, "lesson", "Expirer lentement", { inApp: true }),
  ]),
]

const liveOutline = [
  {
    chapterId: BASES,
    versionId: "v-bases",
    lessons: [{ lessonId: SOUFFLE, versionId: "v-souffle" }],
  },
]

function previewRow(
  elementId: string,
  kind: PreviewRow["kind"],
  title: string,
  change: PreviewRow["change"],
  fields: Partial<PreviewRow> = {}
): PreviewRow {
  return {
    elementId,
    kind,
    title,
    chapterId: null,
    chapterTitle: null,
    change,
    problem: null,
    problemDetail: null,
    savedAt: "2026-09-28T12:00:00Z",
    savedByName: "Claire Martin",
    ...fields,
  }
}

// Publier maintenant : le plan est rangé autrement, « Le souffle » a changé, « Respiration
// carrée » arrive.
const preview: PreviewRow[] = [
  previewRow(METHOD, "method", "Mieux respirer", "reordered"),
  previewRow(SOUFFLE, "lesson", "Le souffle", "modified", {
    chapterId: BASES,
    chapterTitle: "Les bases",
  }),
  previewRow(CARREE, "lesson", "Respiration carrée", "new", {
    chapterId: BASES,
    chapterTitle: "Les bases",
  }),
]

const mine: api.LockRow = {
  mine: true,
  holder_id: testProfile.id,
  holder_name: testProfile.full_name,
  taken_at: "2026-09-28T12:30:00Z",
  heartbeat_at: "2026-09-28T12:30:00Z",
  is_active: true,
  draft_rev: 4,
}

beforeEach(() => {
  vi.mocked(api.lockTake).mockResolvedValue(mine)
  vi.mocked(api.lockStatus).mockResolvedValue(mine)
  vi.mocked(api.getMediaByIds).mockImplementation(async (ids) =>
    ids.includes(COVER) ? [cover] : []
  )
  vi.mocked(api.getContent).mockImplementation(async (id) => {
    if (id === METHOD) return contentOf(METHOD, "method", "Mieux respirer")
    if (id === SOUFFLE) {
      return contentOf(SOUFFLE, "lesson", "Le souffle", {
        parent_id: BASES,
        in_app: true,
        is_free: true,
      })
    }
    if (id === BASES) {
      return contentOf(BASES, "chapter", "Les bases", {
        parent_id: METHOD,
        in_app: true,
      })
    }
    return null
  })
  vi.mocked(publicationApi.getPublication).mockImplementation(async (id) => ({
    id,
    draft_rev: 4,
    first_published_at: "2026-09-27T08:00:00Z",
    scheduled_at: null,
    scheduled_by_name: null,
    schedule_error: null,
    deleted_at: null,
    live: {
      id: "v-methode",
      number: 1,
      draft_rev: 4,
      published_at: "2026-09-27T08:00:00Z",
      published_by_name: "Anne Admin",
      slug: null,
      access_level_id: LEVEL,
      outline: liveOutline,
    },
  }))
  vi.mocked(methodsApi.getMethodTree).mockResolvedValue(tree)
  vi.mocked(methodsApi.getMethodPreview).mockResolvedValue(preview)
  vi.mocked(methodsApi.getElementContext).mockResolvedValue({
    method: { id: METHOD, title: "Mieux respirer", deleted: false },
    chapter: { id: BASES, title: "Les bases" },
  })
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([
    { id: LEVEL, name: "Essentiel", rank: 1 },
  ])
})

afterEach(() => vi.clearAllMocks())

/** Attend que l'éditeur ait pris la main (le titre devient modifiable). */
async function editable() {
  const title = await screen.findByLabelText(texts.editor.title.label)
  await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
  return title
}

/** Une ligne du plan (chapitre ou leçon). */
function row(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-outline-id="${id}"]`)
  if (!found) throw new Error(`ligne ${id} introuvable`)
  return found
}

/** L'état affiché d'une ligne (sans celui des leçons d'un chapitre). */
function stateOf(id: string): string | null {
  return (
    row(id)
      .querySelector(":scope > div [data-element-state]")
      ?.getAttribute("data-element-state") ?? null
  )
}

/** Ouvre le plan d'une méthode et attend ses lignes. */
async function openMethod() {
  renderApp(`/methodes/${METHOD}`)
  await editable()
  await screen.findByRole("link", { name: "Respiration carrée" })
  // La liste des changements est lue : les états en tiennent compte.
  await waitFor(() => expect(stateOf(CARREE)).toBe("new"))
}

describe("liste des méthodes", () => {
  it("montre le niveau d'accès et « modifié » d'après les changements", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      {
        id: METHOD,
        title: "Mieux respirer",
        slug: null,
        cover_id: null,
        category_ids: [],
        draft_rev: 4,
        draft_saved_at: "2026-09-28T12:30:00Z",
        // La fiche n'a pas changé depuis la publication…
        live_draft_rev: 4,
        first_published_at: "2026-09-27T08:00:00Z",
        scheduled_at: null,
        schedule_error: null,
        access_chosen: true,
        access_level_id: LEVEL,
      },
    ])
    renderApp("/methodes")
    const link = await screen.findByRole("link", { name: "Mieux respirer" })
    expect(link).toHaveAttribute("href", `/methodes/${METHOD}`)
    expect(await screen.findByText("Essentiel")).toBeVisible()
    // … mais une leçon a changé : publish_preview n'est pas vide.
    expect(
      await screen.findByText(texts.publication.status.modified)
    ).toBeVisible()
    expect(methodsApi.getMethodPreview).toHaveBeenCalledWith(METHOD)
  })

  it("« Nouvelle méthode » crée la méthode et ouvre sa fiche et son plan", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(METHOD, "method", "")
    )
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue([])
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([])
    renderApp("/methodes")
    await createFromDialog("method", "Mieux respirer")
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "method",
        "Mieux respirer",
        null
      )
    )
    expect(await screen.findByText(outline.emptyTitle)).toBeVisible()
    expect(
      screen.getByRole("link", { name: texts.editor.back("Méthodes") })
    ).toHaveAttribute("href", "/methodes")
  })
})

describe("écran d'une méthode", () => {
  it("montre la fiche, puis le plan avec l'état de chaque élément dans l'app", async () => {
    await openMethod()
    expect(
      screen.getByRole("heading", {
        name: texts.editor.presentation.panelTitle.method,
      })
    ).toBeVisible()
    // Pas de blocs pour une méthode ([D4]).
    expect(
      screen.queryByRole("button", { name: texts.editor.add.label })
    ).toBeNull()
    expect(stateOf(BASES)).toBe("live")
    expect(stateOf(SOUFFLE)).toBe("modified")
    expect(stateOf(CARREE)).toBe("new")
    expect(stateOf(LOIN)).toBe("hidden")
    // Cochée, mais dans un chapitre caché : elle ne part pas.
    expect(stateOf(EXPIRER)).toBe("blocked")
    expect(within(row(SOUFFLE)).getByText(outline.free)).toBeVisible()
    // Chaque élément s'ouvre dans son éditeur.
    expect(screen.getByRole("link", { name: "Le souffle" })).toHaveAttribute(
      "href",
      `/methodes/lecons/${SOUFFLE}`
    )
    expect(screen.getByRole("link", { name: "Les bases" })).toHaveAttribute(
      "href",
      `/methodes/chapitres/${BASES}`
    )
    // La méthode a des changements à publier (une leçon modifiée ne change pas sa fiche).
    expect(document.querySelector("header [data-publication]")).toHaveAttribute(
      "data-publication",
      "modified"
    )
  })

  it("coche « Montrer dans l'app » et « Leçon gratuite » sous le verrou de l'élément", async () => {
    await openMethod()
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: outline.inAppFor(outline.chapterLabel(2, "Aller plus loin")),
      })
    )
    await waitFor(() =>
      expect(methodsApi.setElementFlags).toHaveBeenCalledWith(
        LOIN,
        { in_app: true },
        testProfile.id
      )
    )
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: outline.isFreeFor(outline.lessonLabel(2, "Respiration carrée")),
      })
    )
    await waitFor(() =>
      expect(methodsApi.setElementFlags).toHaveBeenCalledWith(
        CARREE,
        { is_free: true },
        testProfile.id
      )
    )
    // Le plan et la liste des changements sont relus.
    await waitFor(() =>
      expect(methodsApi.getMethodTree).toHaveBeenCalledTimes(3)
    )
  })

  it("refuse une case quand quelqu'un écrit l'élément, en le nommant", async () => {
    vi.mocked(methodsApi.setElementFlags).mockRejectedValueOnce(
      new api.ContentError("verrou_tenu", {
        hint: "Claire Martin",
        detail: outline.heldBy("Claire Martin"),
      })
    )
    await openMethod()
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: outline.inAppFor(outline.lessonLabel(1, "Le souffle")),
      })
    )
    expect(
      await screen.findByText(outline.heldBy("Claire Martin"))
    ).toBeVisible()
  })

  it("« Monter » et « Descendre » rangent le plan (une leçon change de chapitre), avec une annonce", async () => {
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.actions(outline.lessonLabel(1, "Expirer lentement")),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.moveUp })
    )
    await waitFor(() =>
      expect(methodsApi.reorderOutline).toHaveBeenCalledWith(
        METHOD,
        [
          chapterOf(tree[0], [...tree[0].lessons, tree[1].lessons[0]]),
          chapterOf(tree[1], []),
        ],
        expect.any(String)
      )
    )
    expect(
      screen.getByText(
        outline.moved(
          outline.lessonLabel(1, "Expirer lentement"),
          outline.lessonPlace(3, 3, outline.chapterLabel(1, "Les bases"))
        )
      )
    ).toBeInTheDocument()
    // Le premier chapitre ne monte pas plus haut.
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.actions(outline.chapterLabel(1, "Les bases")),
      })
    )
    expect(
      await screen.findByRole("menuitem", { name: outline.moveUp })
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("le plan se prend au clavier par la poignée, avec des annonces en français", async () => {
    await openMethod()
    const heard: string[] = []
    const observer = new MutationObserver(() => {
      for (const region of document.querySelectorAll('[id^="DndLiveRegion"]')) {
        if (region.textContent && heard.at(-1) !== region.textContent) {
          heard.push(region.textContent)
        }
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    })
    const label = outline.lessonLabel(2, "Respiration carrée")
    const handle = screen.getByRole("button", { name: outline.handle(label) })
    expect(handle).toHaveAttribute(
      "aria-roledescription",
      texts.methods.dnd.roleDescription
    )
    expect(screen.getByText(texts.methods.dnd.instructions)).toBeInTheDocument()
    handle.focus()
    await act(async () => {
      fireEvent.keyDown(handle, { code: "Space", key: " " })
    })
    // La leçon est prise (jsdom ne mesure rien : la cible annoncée ensuite varie).
    await waitFor(() =>
      expect(heard.join(" | ")).toMatch(/leçon 2 « Respiration carrée »/)
    )
    await act(async () => {
      fireEvent.keyDown(handle, { code: "Escape", key: "Escape" })
    })
    await waitFor(() =>
      expect(heard.join(" | ")).toContain(texts.methods.dnd.cancel(label))
    )
    observer.disconnect()
    expect(methodsApi.reorderOutline).not.toHaveBeenCalled()
  })

  it("« Nouveau chapitre » demande un titre, puis le crée à la fin du plan", async () => {
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(NEW_ID, "chapter", "Pour finir", { parent_id: METHOD })
    )
    await openMethod()
    fireEvent.click(screen.getByRole("button", { name: outline.newChapter }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(
      within(dialog).getByRole("button", { name: texts.methods.create.submit })
    )
    expect(
      await within(dialog).findByText(texts.methods.create.nameRequired)
    ).toBeVisible()
    fireEvent.change(within(dialog).getByLabelText(texts.methods.create.name), {
      target: { value: "Pour finir" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: texts.methods.create.submit })
    )
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "chapter",
        "Pour finir",
        null,
        METHOD
      )
    )
    // On reste sur le plan : le verrou donné à la création est rendu.
    await waitFor(() =>
      expect(api.lockReleaseCreated).toHaveBeenCalledWith(NEW_ID)
    )
    expect(
      await screen.findByText(
        texts.methods.create.created.chapter("Pour finir")
      )
    ).toBeVisible()
  })

  it("« Nouvelle leçon » propose les points de départ des leçons ([D42]) et peut l'ouvrir", async () => {
    vi.mocked(templatesApi.listStarters).mockImplementation(async (kind) =>
      kind === "lesson" ? [{ id: STARTER, title: "Exercice guidé" }] : []
    )
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(NEW_ID, "lesson", "Pause", { parent_id: LOIN })
    )
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.newLessonIn(outline.chapterLabel(2, "Aller plus loin")),
      })
    )
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toHaveTextContent(
      texts.methods.create.lessonDescription(
        outline.chapterLabel(2, "Aller plus loin")
      )
    )
    fireEvent.change(within(dialog).getByLabelText(texts.methods.create.name), {
      target: { value: "Pause" },
    })
    fireEvent.click(
      await within(dialog).findByRole("radio", { name: "Exercice guidé" })
    )
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.methods.create.openAfter,
      })
    )
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "lesson",
        "Pause",
        STARTER,
        LOIN
      )
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("lesson")
    // « Créer et ouvrir » garde le verrou et ouvre l'éditeur de la leçon.
    expect(api.lockReleaseCreated).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(
        document.querySelector(`[data-element-banner="lesson"]`)
      ).not.toBeNull()
    )
  })

  it("retire une leçon de l'app ([D26]), puis en supprime une autre et l'annule", async () => {
    vi.mocked(publicationApi.unpublishContent).mockResolvedValue(true)
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "lot",
      trashed: 1,
      needsFileSync: false,
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    await openMethod()
    const souffle = outline.lessonLabel(1, "Le souffle")
    fireEvent.click(
      screen.getByRole("button", { name: outline.actions(souffle) })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.unpublish })
    )
    const confirm = await screen.findByRole("alertdialog")
    expect(confirm).toHaveTextContent(outline.confirmUnpublish.lesson)
    fireEvent.click(
      within(confirm).getByRole("button", {
        name: outline.confirmUnpublish.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.unpublishContent).toHaveBeenCalledWith(SOUFFLE)
    )
    // Les fichiers changent peut-être d'emplacement : tout de suite.
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())

    // Une leçon qui n'est pas en ligne n'a pas « Retirer de l'app ».
    const carree = outline.lessonLabel(2, "Respiration carrée")
    fireEvent.click(
      screen.getByRole("button", { name: outline.actions(carree) })
    )
    expect(
      screen.queryByRole("menuitem", { name: outline.unpublish })
    ).toBeNull()
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.trash })
    )
    const trash = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(trash).getByRole("button", { name: outline.confirmTrash.confirm })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(CARREE)
    )
    fireEvent.click(await screen.findByRole("button", { name: outline.undo }))
    await waitFor(() =>
      expect(publicationApi.restoreContent).toHaveBeenCalledWith(CARREE)
    )
  })
})

describe("plan d'une méthode : focus et explications", () => {
  it("« Créer » : le focus va au titre du nouvel élément, une fois la fenêtre fermée", async () => {
    const created = contentOf(NEW_ID, "chapter", "Pour finir", {
      parent_id: METHOD,
    })
    vi.mocked(api.createContent).mockImplementation(async () => {
      vi.mocked(methodsApi.getMethodTree).mockResolvedValue([
        ...tree,
        chapterOf(element(NEW_ID, "chapter", "Pour finir"), []),
      ])
      return created
    })
    await openMethod()
    fireEvent.click(screen.getByRole("button", { name: outline.newChapter }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.change(within(dialog).getByLabelText(texts.methods.create.name), {
      target: { value: "Pour finir" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: texts.methods.create.submit })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    await waitFor(
      () =>
        expect(screen.getByRole("link", { name: "Pour finir" })).toHaveFocus(),
      { timeout: 3000 }
    )
  })

  it("« Supprimer » : le focus va à l'élément voisin, une fois la fenêtre fermée", async () => {
    vi.mocked(publicationApi.trashContent).mockImplementation(async () => {
      vi.mocked(methodsApi.getMethodTree).mockResolvedValue([
        chapterOf(tree[0], [tree[0].lessons[0]]),
        tree[1],
      ])
      return { batch: "lot", trashed: 1, needsFileSync: false }
    })
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.actions(outline.lessonLabel(2, "Respiration carrée")),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.trash })
    )
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: outline.confirmTrash.confirm,
      })
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())
    // Plus de leçon suivante : la précédente.
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", {
            name: outline.actions(outline.lessonLabel(1, "Le souffle")),
          })
        ).toHaveFocus(),
      { timeout: 3000 }
    )
  })

  it("« Monter » vers un autre chapitre : le focus suit la leçon", async () => {
    const moved: MethodTree = [
      chapterOf(tree[0], [...tree[0].lessons, tree[1].lessons[0]]),
      chapterOf(tree[1], []),
    ]
    vi.mocked(methodsApi.reorderOutline).mockImplementation(async () => {
      vi.mocked(methodsApi.getMethodTree).mockResolvedValue(moved)
    })
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.actions(outline.lessonLabel(1, "Expirer lentement")),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.moveUp })
    )
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    await waitFor(
      () =>
        expect(
          within(row(BASES)).getByRole("button", {
            name: outline.actions(outline.lessonLabel(3, "Expirer lentement")),
          })
        ).toHaveFocus(),
      { timeout: 3000 }
    )
  })

  it("l'explication de chaque état est dans la page, écrite quand il faut un geste", async () => {
    await openMethod()
    // « Caché de l'app » et « Caché avec son chapitre » : ce qu'il faut faire est écrit.
    expect(
      within(row(LOIN)).getAllByText(outline.stateHints.hidden)[0]
    ).toBeVisible()
    expect(
      within(row(EXPIRER)).getByText(outline.stateHints.blocked)
    ).toBeVisible()
    // Les autres états : lue par les lecteurs d'écran, juste après le badge.
    const hint = row(CARREE).querySelector('[data-element-state-hint="new"]')
    expect(hint).toHaveTextContent(outline.stateHints.new)
    expect(hint).toHaveClass("sr-only")
  })
})

describe("publier une méthode d'un seul geste ([D29])", () => {
  it("montre ce qui va changer dans l'app, puis publie", async () => {
    vi.mocked(publicationApi.publishContent).mockResolvedValue({
      versionId: "v2",
      versionNumber: 2,
      publishedAt: "2026-09-28T12:40:00Z",
      needsFileSync: true,
    })
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    // La liste est relue à l'ouverture.
    await waitFor(() =>
      expect(methodsApi.getMethodPreview).toHaveBeenCalledTimes(2)
    )
    const list = within(dialog).getByRole("region", { name: changes.title })
    expect(list).toHaveTextContent(changes.method.reordered)
    expect(list).toHaveTextContent("Leçon « Le souffle »")
    expect(list).toHaveTextContent(changes.inChapter("Les bases"))
    expect(list).toHaveTextContent("Claire Martin")
    expect(list.querySelector(`[data-element-id="${CARREE}"]`)).toHaveAttribute(
      "data-change",
      "new"
    )
    expect(within(dialog).getByText("Essentiel")).toBeVisible()
    const confirm = within(dialog).getByRole("button", {
      name: texts.publication.publishDialog.confirm,
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(publicationApi.publishContent).toHaveBeenCalledWith(METHOD, 4)
    )
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())
  })

  it("ne publie pas tant qu'un élément ferait refuser la publication, et mène à lui", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      previewRow(SOUFFLE, "lesson", "Le souffle", "modified", {
        problem: "image_sans_fichier",
        problemDetail: "Une image n'a pas de fichier : bloc n° 2.",
      }),
    ])
    await openMethod().catch(() => undefined)
    await screen.findByRole("link", { name: "Le souffle" })
    // Le plan le signale déjà.
    expect(
      await within(row(SOUFFLE)).findByText(
        "Une image n'a pas de fichier : bloc n° 2."
      )
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    expect(await within(dialog).findByText(changes.blocked)).toBeVisible()
    expect(
      within(dialog).getByRole("button", {
        name: texts.publication.publishDialog.confirm,
      })
    ).toBeDisabled()
    expect(
      within(dialog).getByRole("link", {
        name: changes.open("Leçon « Le souffle »"),
      })
    ).toHaveAttribute("href", `/methodes/lecons/${SOUFFLE}`)
  })

  it("rien à publier : « Publier » est grisé", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([])
    renderApp(`/methodes/${METHOD}`)
    await editable()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: texts.publication.actions.publish })
      ).toBeDisabled()
    )
    expect(document.querySelector("header [data-publication]")).toHaveAttribute(
      "data-publication",
      "live"
    )
  })

  it("programmer montre aussi la liste de ce qui changerait", async () => {
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.more })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.schedule,
      })
    )
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(changes.scheduleNote)).toBeVisible()
    expect(
      within(dialog).getByRole("region", { name: changes.title })
    ).toHaveTextContent("Respiration carrée")
  })

  it("quelqu'un écrit une leçon ([D14]) : la fenêtre le dit, sans « Reprendre la main »", async () => {
    vi.mocked(publicationApi.publishContent).mockRejectedValue(
      new api.ContentError("verrou_tenu", { hint: "Claire Martin" })
    )
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    const confirm = within(dialog).getByRole("button", {
      name: texts.publication.publishDialog.confirm,
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)
    const held = await screen.findByRole("alertdialog")
    expect(held).toHaveTextContent(
      texts.publication.lockHeld.elementDescription("Claire Martin")
    )
    expect(
      within(held).queryByRole("button", {
        name: texts.publication.lockHeld.take,
      })
    ).toBeNull()
  })

  it("programmation en attente ([D31]) : elle peut venir de la fiche, d'un chapitre ou d'une leçon", async () => {
    const past = new Date(Date.now() - 600_000).toISOString()
    vi.mocked(publicationApi.getPublication).mockImplementation(async (id) => ({
      id,
      draft_rev: 4,
      first_published_at: "2026-09-27T08:00:00Z",
      scheduled_at: past,
      scheduled_by_name: "Anne Admin",
      schedule_error: null,
      deleted_at: null,
      live: null,
    }))
    await openMethod().catch(() => undefined)
    const words = texts.publication.banner.method
    expect(
      await screen.findByText(words.waitingMine(formatDateTime(past)))
    ).toBeVisible()
    const banner = document.querySelector<HTMLElement>(
      "[data-schedule-banner]"
    )!
    expect(banner).toHaveTextContent(words.waitingMineHint)
    expect(banner).not.toHaveTextContent(
      texts.publication.banner.waitingMineHint
    )
  })

  it("l'historique rappelle que « Revenir à cette version » ne ramène que la fiche ([D17])", async () => {
    vi.mocked(publicationApi.listVersions).mockResolvedValue([
      {
        id: "v-methode",
        number: 1,
        origin: "manual",
        published_at: "2026-09-27T08:00:00Z",
        published_by_name: "Anne Admin",
        draft_rev: 4,
        category_ids: [],
      },
    ])
    await openMethod()
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.history })
    )
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.publication.history.revertItem(1),
      })
    )
    expect(
      await screen.findByText(
        texts.publication.history.confirm.description("method")
      )
    ).toBeVisible()
  })
})

describe("éditeur d'une leçon", () => {
  it("« ← nom de la méthode », un rappel au lieu de la barre de publication", async () => {
    renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const back = await screen.findByRole("link", {
      name: texts.methods.element.back("Mieux respirer"),
    })
    expect(back).toHaveAttribute("href", `/methodes/${METHOD}`)
    const banner = document.querySelector<HTMLElement>(
      '[data-element-banner="lesson"]'
    )!
    expect(banner).toHaveTextContent(texts.methods.element.reminder.lesson)
    expect(banner).toHaveTextContent(
      texts.methods.element.inChapter("Les bases")
    )
    expect(
      within(banner).getByRole("link", {
        name: texts.methods.element.openMethod,
      })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
    // Son état dans l'app vient de la liste des changements de la méthode.
    await waitFor(() =>
      expect(banner.querySelector("[data-element-state]")).toHaveAttribute(
        "data-element-state",
        "modified"
      )
    )
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.publish })
    ).toBeNull()
    // Les blocs s'écrivent ici, comme dans une page.
    expect(
      screen.getByRole("button", { name: texts.editor.add.label })
    ).toBeEnabled()
  })

  it("ses réglages : « Montrer dans l'app » et « Leçon gratuite », sans niveau d'accès", async () => {
    renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const header = document.querySelector<HTMLElement>(
      '[data-element-banner="lesson"]'
    )!
    fireEvent.click(
      within(header).getByRole("button", {
        name: texts.methods.element.settings,
      })
    )
    const sheet = await screen.findByRole("dialog")
    const words = texts.publication.settings.element
    expect(
      within(sheet).queryByText(texts.publication.settings.access.label)
    ).toBeNull()
    const inApp = within(sheet).getByRole("checkbox", { name: words.inApp })
    const isFree = within(sheet).getByRole("checkbox", { name: words.isFree })
    expect(inApp).toBeChecked()
    expect(isFree).toBeChecked()
    fireEvent.click(isFree)
    await waitFor(() => expect(isFree).not.toBeChecked())
    // Le rappel suit aussitôt ce qui est à l'écran (l'enregistrement part ensuite).
    const banner = document.querySelector<HTMLElement>(
      '[data-element-banner="lesson"]'
    )!
    expect(within(banner).queryByText(texts.methods.outline.free)).toBeNull()
  })

  it("un chapitre : son introduction en blocs, « ← méthode »", async () => {
    vi.mocked(methodsApi.getElementContext).mockResolvedValue({
      method: { id: METHOD, title: "Mieux respirer", deleted: false },
      chapter: null,
    })
    renderApp(`/methodes/chapitres/${BASES}`)
    await editable()
    expect(
      await screen.findByRole("link", {
        name: texts.methods.element.back("Mieux respirer"),
      })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
    expect(
      document.querySelector('[data-element-banner="chapter"]')
    ).toHaveTextContent(texts.methods.element.reminder.chapter)
  })

  it("rouverte, une leçon montre les cases enregistrées ; son état est relu après l'enregistrement", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-28T12:35:00Z",
    })
    const { router, queryClient } = renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const words = texts.publication.settings.element
    const banner = () =>
      document.querySelector<HTMLElement>('[data-element-banner="lesson"]')!
    fireEvent.click(
      within(banner()).getByRole("button", {
        name: texts.methods.element.settings,
      })
    )
    const isFree = within(await screen.findByRole("dialog")).getByRole(
      "checkbox",
      { name: words.isFree }
    )
    fireEvent.click(isFree)
    await waitFor(() => expect(isFree).not.toBeChecked())
    // « ← méthode » : ce qui attendait part tout de suite.
    await act(() => router.navigate(`/methodes/${METHOD}`))
    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith(
        SOUFFLE,
        4,
        expect.anything(),
        expect.any(String),
        { is_free: false }
      )
    )
    // L'état de l'élément et ce qui ferait refuser la publication sont relus.
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: [...methodsApi.methodKeys.all, "preview"],
      })
    )
    await screen.findByRole("link", { name: "Respiration carrée" })

    // Rouverte (la base n'est pas relue) : la case enregistrée, pas l'ancienne.
    await act(() => router.navigate(`/methodes/lecons/${SOUFFLE}`))
    await editable()
    fireEvent.click(
      within(banner()).getByRole("button", {
        name: texts.methods.element.settings,
      })
    )
    const sheet = await screen.findByRole("dialog")
    expect(
      within(sheet).getByRole("checkbox", { name: words.isFree })
    ).not.toBeChecked()
    expect(
      within(sheet).getByRole("checkbox", { name: words.inApp })
    ).toBeChecked()
  })

  it("retirée de l'app depuis le plan, une leçon rouverte n'est plus cochée", async () => {
    vi.mocked(publicationApi.unpublishContent).mockImplementation(async () => {
      // unpublish décoche « Montrer dans l'app » sans changer la révision du brouillon.
      vi.mocked(api.getContent).mockImplementation(async (id) =>
        id === SOUFFLE
          ? contentOf(SOUFFLE, "lesson", "Le souffle", {
              parent_id: BASES,
              in_app: false,
              is_free: true,
            })
          : null
      )
      return false
    })
    const { router } = renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    await act(() => router.navigate(`/methodes/${METHOD}`))
    await screen.findByRole("link", { name: "Respiration carrée" })
    fireEvent.click(
      screen.getByRole("button", {
        name: outline.actions(outline.lessonLabel(1, "Le souffle")),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.unpublish })
    )
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: outline.confirmUnpublish.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.unpublishContent).toHaveBeenCalledWith(SOUFFLE)
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull())

    await act(() => router.navigate(`/methodes/lecons/${SOUFFLE}`))
    await editable()
    const banner = document.querySelector<HTMLElement>(
      '[data-element-banner="lesson"]'
    )!
    fireEvent.click(
      within(banner).getByRole("button", {
        name: texts.methods.element.settings,
      })
    )
    expect(
      within(await screen.findByRole("dialog")).getByRole("checkbox", {
        name: texts.publication.settings.element.inApp,
      })
    ).not.toBeChecked()
  })

  it("méthode programmée ([D31]) : ce qui part à l'heure dite, puis l'attente et « Quitter l'éditeur »", async () => {
    const soon = new Date(Date.now() + 3_600_000).toISOString()
    const past = new Date(Date.now() - 600_000).toISOString()
    let scheduledAt = soon
    vi.mocked(publicationApi.getPublication).mockImplementation(async (id) => ({
      id,
      draft_rev: 4,
      first_published_at: "2026-09-27T08:00:00Z",
      scheduled_at: scheduledAt,
      scheduled_by_name: "Anne Admin",
      schedule_error: null,
      deleted_at: null,
      live: null,
    }))
    const words = texts.methods.element.schedule
    const { queryClient } = renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const banner = document.querySelector<HTMLElement>(
      '[data-element-banner="lesson"]'
    )!
    expect(
      await within(banner).findByText(words.scheduled(formatDateTime(soon)))
    ).toBeVisible()
    expect(banner).toHaveTextContent(words.scheduledHint)

    // L'heure est passée, la méthode n'est pas partie : on tient la main sur cette leçon.
    scheduledAt = past
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: api.contentKeys.publication(METHOD),
      })
    )
    expect(
      await within(banner).findByText(words.waitingMine(formatDateTime(past)))
    ).toBeVisible()
    expect(banner).toHaveTextContent(words.waitingMineHint)
    expect(
      within(banner).getByRole("link", { name: words.leave })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
  })

  it("une leçon ne s'ouvre pas à l'adresse d'un chapitre", async () => {
    renderApp(`/methodes/chapitres/${SOUFFLE}`)
    expect(await screen.findByText(texts.editor.notFound.title)).toBeVisible()
  })
})

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
  OutlineLesson,
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
  kind: OutlineElement["kind"],
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

function lessonOf(
  base: OutlineElement,
  exercises: OutlineElement[] = []
): OutlineLesson {
  return { ...base, kind: "lesson", exercises }
}

function chapterOf(
  base: OutlineElement,
  lessons: OutlineElement[]
): OutlineChapter {
  return {
    ...base,
    kind: "chapter",
    lessons: lessons.map((lesson) =>
      "exercises" in lesson ? (lesson as OutlineLesson) : lessonOf(lesson)
    ),
  }
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
    lessonId: null,
    lessonTitle: null,
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

// La méthode vue depuis une leçon ou un chapitre : réservée à « Essentiel ».
const methodOfElement = {
  id: METHOD,
  title: "Mieux respirer",
  deleted: false,
  access: { accessChosen: true, accessLevelId: LEVEL },
}

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
    method: methodOfElement,
    chapter: { id: BASES, title: "Les bases" },
    lesson: null,
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

/** La colonne de gauche de l'écran d'une méthode : son plan. */
function planColumn(): Promise<HTMLElement> {
  return screen.findByRole("complementary", { name: outline.title })
}

/** Coche ou décoche une case du menu ⋯ d'une ligne du plan. */
async function flag(label: string, name: string) {
  fireEvent.click(
    within(await planColumn()).getByRole("button", {
      name: outline.actions(label),
    })
  )
  fireEvent.click(await screen.findByRole("menuitemcheckbox", { name }))
}

/** Ouvre le plan d'une méthode et attend ses lignes. */
async function openMethod() {
  await renderApp(`/methodes/${METHOD}`)
  await editable()
  await within(await planColumn()).findByRole("link", {
    name: "Respiration carrée",
  })
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
        list_position: null,
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
    await renderApp("/methodes")
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
    await renderApp("/methodes")
    await createFromDialog("method", "Mieux respirer")
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "method",
        "Mieux respirer",
        null
      )
    )
    expect(await screen.findByText(outline.empty)).toBeVisible()
    const back = screen.getByRole("link", {
      name: texts.editor.back("Méthodes"),
    })
    expect(back).toHaveAttribute("href", "/methodes")
    // Dans l'en-tête du plan, en haut ; « Nouveau chapitre » reste en bas.
    expect(back.parentElement).toHaveTextContent(outline.title)
    expect(back.parentElement).not.toHaveTextContent(outline.newChapter)
  })
})

describe("écran d'une méthode", () => {
  it("la mise en page du Fil : le plan à gauche, la méthode comme dans l'app au centre, sa publication à droite", async () => {
    await openMethod()
    // Pas de blocs pour une méthode ([D4]), ni de barre du haut.
    expect(
      screen.queryByRole("button", { name: texts.editor.add.label })
    ).toBeNull()
    expect(
      screen.queryByRole("toolbar", { name: texts.editor.toolbar.label })
    ).toBeNull()
    expect(document.querySelector("header")).toBeNull()
    const plan = await planColumn()
    expect(
      within(plan).getByRole("button", { name: outline.newChapter })
    ).toBeEnabled()
    expect(plan).toHaveTextContent(outline.count(2, 3))

    // Au centre, ce que l'app montrera : « Les bases » (montré) et ses deux leçons montrées ;
    // « Aller plus loin » est caché. Un élément y ouvre son éditeur.
    const phone = screen.getByRole("region", {
      name: texts.editor.preview.screen.ios,
    })
    expect(within(phone).getByText(outline.count(1, 2))).toBeVisible()
    expect(
      within(phone).getByRole("link", {
        name: texts.methods.preview.chapter(1, "Les bases"),
      })
    ).toHaveAttribute("href", `/methodes/chapitres/${BASES}`)
    expect(
      within(phone).getByRole("link", { name: /Respiration carrée/ })
    ).toHaveAttribute("href", `/methodes/lecons/${CARREE}`)
    expect(within(phone).queryByText(/Aller plus loin/)).toBeNull()
    // « Le souffle » est gratuite dans une méthode réservée.
    expect(
      within(phone).getByRole("link", { name: /Le souffle/ })
    ).toHaveTextContent(texts.methods.preview.free)

    // À droite : « Prêt à publier ? », la carte de la liste, le niveau d'accès et ce qui
    // changera dans l'app.
    const right = screen.getByRole("complementary", {
      name: texts.editor.columns.right.method,
    })
    expect(
      within(right).getByRole("region", {
        name: texts.editor.article.feed.title.method,
      })
    ).toBeVisible()
    const changesCard = within(right).getByRole("region", {
      name: changes.cardTitle,
    })
    await waitFor(() =>
      expect(
        changesCard.querySelector(`[data-element-id="${CARREE}"]`)
      ).toHaveAttribute("data-change", "new")
    )
    // En bas, la taille du plan au lieu du temps de lecture.
    expect(right).toHaveTextContent(texts.editor.article.stats.lessons(3))

    expect(stateOf(BASES)).toBe("live")
    expect(stateOf(SOUFFLE)).toBe("modified")
    expect(stateOf(CARREE)).toBe("new")
    expect(stateOf(LOIN)).toBe("hidden")
    // Cochée, mais dans un chapitre caché : elle ne part pas.
    expect(stateOf(EXPIRER)).toBe("blocked")
    expect(within(row(SOUFFLE)).getByText(outline.free)).toBeInTheDocument()
    // Chaque élément s'ouvre dans son éditeur.
    expect(
      within(plan).getByRole("link", { name: "Le souffle" })
    ).toHaveAttribute("href", `/methodes/lecons/${SOUFFLE}`)
    expect(
      within(plan).getByRole("link", { name: "Les bases" })
    ).toHaveAttribute("href", `/methodes/chapitres/${BASES}`)
    // La méthode a des changements à publier (une leçon modifiée ne change pas sa fiche).
    expect(document.querySelector("[data-publication]")).toHaveAttribute(
      "data-publication",
      "modified"
    )
  })

  it("en Lecture, « sans la formule » : les leçons réservées ont un cadenas, pas la leçon gratuite", async () => {
    await openMethod()
    const preview = texts.editor.preview
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    // Comme un abonné : rien de réservé.
    expect(within(phone).queryByText(texts.methods.preview.locked)).toBeNull()
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.reader.visitor })
    )
    const carree = within(phone).getByText("Respiration carrée").parentElement!
    expect(carree).toHaveTextContent(texts.methods.preview.locked)
    const souffle = within(phone).getByText("Le souffle").parentElement!
    expect(souffle).not.toHaveTextContent(texts.methods.preview.locked)
    // En Lecture, chaque leçon s'ouvre en Lecture, comme dans l'app (QCM du 04/10/2026).
    expect(
      within(phone).getByRole("link", { name: /Respiration carrée/ })
    ).toHaveAttribute(
      "href",
      `/methodes/lecons/${CARREE}?mode=lecture&lecteur=sans-formule`
    )
  })

  it("coche « Montrer dans l'app » et « Leçon gratuite » (menu ⋯) sous le verrou de l'élément", async () => {
    await openMethod()
    const reads = vi.mocked(methodsApi.getMethodTree).mock.calls.length
    const loin = outline.chapterLabel(2, "Aller plus loin")
    await flag(loin, outline.inAppFor(loin))
    await waitFor(() =>
      expect(methodsApi.setElementFlags).toHaveBeenCalledWith(
        LOIN,
        { in_app: true },
        testProfile.id
      )
    )
    const carree = outline.lessonLabel(2, "Respiration carrée")
    await flag(carree, outline.isFreeFor(carree))
    await waitFor(() =>
      expect(methodsApi.setElementFlags).toHaveBeenCalledWith(
        CARREE,
        { is_free: true },
        testProfile.id
      )
    )
    // Le plan et la liste des changements sont relus.
    await waitFor(() =>
      expect(
        vi.mocked(methodsApi.getMethodTree).mock.calls.length
      ).toBeGreaterThan(reads)
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
    const souffle = outline.lessonLabel(1, "Le souffle")
    await flag(souffle, outline.inAppFor(souffle))
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
        document.querySelector(`[data-element-card="lesson"]`)
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

  it("la pastille d'un élément porte son état et son explication, pour les lecteurs d'écran", async () => {
    await openMethod()
    const said = (id: string) =>
      row(id).querySelector(":scope > div [data-element-state]")
    expect(said(LOIN)).toHaveTextContent(
      `${outline.states.hidden} : ${outline.stateHints.hidden}`
    )
    expect(said(EXPIRER)).toHaveTextContent(
      `${outline.states.blocked} : ${outline.stateHints.blocked}`
    )
    expect(said(CARREE)).toHaveTextContent(
      `${outline.states.new} : ${outline.stateHints.new}`
    )
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
    // Les chapitres et les leçons, par sorte de changement.
    expect(
      within(list).getByRole("region", {
        name: changes.groupTitle(changes.groups.modified, 1),
      })
    ).toHaveTextContent("Leçon « Le souffle »")
    expect(
      within(list).getByRole("region", {
        name: changes.groupTitle(changes.groups.new, 1),
      })
    ).toHaveTextContent("Leçon « Respiration carrée »")
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

  it("la méthode entre dans l'app : un résumé au lieu d'une ligne par élément, dans la carte et la fenêtre", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      previewRow(METHOD, "method", "Mieux respirer", "new"),
      previewRow(BASES, "chapter", "Les bases", "new"),
      previewRow(SOUFFLE, "lesson", "Le souffle", "new", {
        chapterId: BASES,
        chapterTitle: "Les bases",
      }),
      previewRow(CARREE, "lesson", "Respiration carrée", "new", {
        chapterId: BASES,
        chapterTitle: "Les bases",
      }),
    ])
    await openMethod()
    const card = screen.getByRole("region", { name: changes.cardTitle })
    await waitFor(() => expect(card).toHaveTextContent(changes.entry(1, 2)))
    expect(card.querySelector("[data-change]")).toBeNull()

    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    const list = within(dialog).getByRole("region", { name: changes.title })
    await waitFor(() => expect(list).toHaveTextContent(changes.entry(1, 2)))
    expect(list.querySelector("[data-change]")).toBeNull()
    // Pas de nombre de changements : le résumé dit ce qui arrive.
    expect(list).not.toHaveTextContent(changes.count(4))
  })

  it("un groupe long montre ses cinq premières lignes, puis « Voir tout » et « Voir moins »", async () => {
    const lessons = Array.from({ length: 7 }, (_, index) =>
      previewRow(`lecon-${index}`, "lesson", `Leçon ${index + 1}`, "modified", {
        chapterId: BASES,
        chapterTitle: "Les bases",
      })
    )
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      previewRow(METHOD, "method", "Mieux respirer", "reordered"),
      ...lessons,
    ])
    await renderApp(`/methodes/${METHOD}`)
    await editable()
    const card = screen.getByRole("region", { name: changes.cardTitle })
    const group = await within(card).findByRole("region", {
      name: changes.groupTitle(changes.groups.modified, 7),
    })
    const shown = () => group.querySelectorAll("[data-change]").length
    expect(shown()).toBe(5)
    fireEvent.click(
      within(group).getByRole("button", { name: changes.showAll(7) })
    )
    expect(shown()).toBe(7)
    fireEvent.click(
      within(group).getByRole("button", { name: changes.showLess })
    )
    expect(shown()).toBe(5)
  })

  it("ne publie pas tant qu'un élément ferait refuser la publication, et mène à lui", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      previewRow(SOUFFLE, "lesson", "Le souffle", "modified", {
        problem: "image_sans_fichier",
        problemDetail: "Une image n'a pas de fichier : bloc n° 2.",
      }),
    ])
    await openMethod().catch(() => undefined)
    await within(await planColumn()).findByRole("link", { name: "Le souffle" })
    // Le plan le signale déjà, et la carte « Ce qui changera dans l'app » aussi.
    expect(
      await within(row(SOUFFLE)).findByText(
        "Une image n'a pas de fichier : bloc n° 2.",
        { exact: false }
      )
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: changes.cardTitle })).getByText(
        changes.blocked
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
    await renderApp(`/methodes/${METHOD}`)
    await editable()
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: texts.publication.actions.publish })
      ).toBeDisabled()
    )
    expect(document.querySelector("[data-publication]")).toHaveAttribute(
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
      screen.getByRole("button", { name: texts.publication.actions.more })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.history,
      })
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

describe("éditeur d'une leçon ou d'un chapitre (éditeur du Fil)", () => {
  const element = texts.methods.element
  const preview = texts.editor.preview

  /** La carte « Dans la méthode », en tête de la colonne de droite. */
  function placeCard(kind: "chapter" | "lesson" = "lesson"): HTMLElement {
    const found = document.querySelector<HTMLElement>(
      `[data-element-card="${kind}"]`
    )
    if (!found) throw new Error("carte « Dans la méthode » introuvable")
    return found
  }

  function rightColumn(kind: "chapter" | "lesson" = "lesson") {
    return screen.getByRole("complementary", {
      name: texts.editor.columns.right[kind],
    })
  }

  it("la mise en page du Fil : le retour à la méthode, « Dans la méthode » en tête, « Ouvrir la méthode » au lieu de « Publier »", async () => {
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const left = screen.getByRole("complementary", {
      name: texts.editor.columns.left,
    })
    expect(
      await within(left).findByRole("link", {
        name: element.back("Mieux respirer"),
      })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
    // Pas de barre du haut : tout est dans la colonne de droite.
    expect(document.querySelector("header")).toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.publish })
    ).toBeNull()

    // Sa place dans la méthode, puis son état dans l'app (d'après la liste des changements).
    const card = placeCard()
    expect(within(card).getByRole("heading", { name: element.card }))
    const place = card.querySelector("[data-element-place]")!
    await waitFor(() =>
      expect(place).toHaveTextContent(
        `${element.place.label} : Mieux respirer, ${element.place.chapterOf(1, "Les bases")}, ${element.place.lesson(1)}`
      )
    )
    await waitFor(() =>
      expect(card.querySelector("[data-element-state]")).toHaveAttribute(
        "data-element-state",
        "modified"
      )
    )
    expect(card).toHaveTextContent(outline.stateHints.modified)

    // En bas : l'état, puis « Ouvrir la méthode », d'où elle se publie ([D29]) ; son menu donne
    // l'Historique.
    const right = rightColumn()
    expect(
      within(right).getByRole("link", { name: element.openMethod })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
    fireEvent.click(within(right).getByRole("button", { name: element.more }))
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: texts.publication.actions.history,
      })
    )
    expect(
      await screen.findByRole("dialog", {
        name: texts.publication.history.title,
      })
    ).toBeVisible()
    // Les blocs s'écrivent ici, comme dans le Fil.
    expect(document.getElementById("colonne-gauche-ajouter")).toBeEnabled()
  })

  it("« Montrer dans l'app » et « Leçon gratuite » partent avec le brouillon ; le niveau d'accès est celui de la méthode, en lecture", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-28T12:35:00Z",
    })
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const right = rightColumn()
    const inApp = within(right).getByRole("switch", { name: element.inApp })
    const isFree = within(right).getByRole("switch", { name: element.isFree })
    expect(inApp).toBeChecked()
    expect(isFree).toBeChecked()
    expect(
      await within(right).findByText(element.access.method("Essentiel"))
    ).toBeVisible()
    // Pas de liste des niveaux : il se choisit dans l'écran de la méthode.
    expect(within(right).queryByRole("combobox")).toBeNull()

    fireEvent.click(isFree)
    await waitFor(() => expect(isFree).not.toBeChecked())
    await waitFor(
      () =>
        expect(api.saveDraft).toHaveBeenCalledWith(
          SOUFFLE,
          4,
          expect.anything(),
          expect.any(String),
          { is_free: false }
        ),
      { timeout: 4000 }
    )
  })

  it("en Lecture, « sans la formule » suit le niveau de la méthode et « Leçon gratuite »", async () => {
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.reader.visitor })
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    // Une leçon gratuite se lit en entier, même sans la formule ; la barre de l'app nomme la
    // méthode. Son image est facultative : sans elle, rien à sa place.
    expect(await within(phone).findByText("Mieux respirer")).toBeVisible()
    expect(within(phone).queryByText(preview.locked.title)).toBeNull()
    expect(
      within(phone).queryByText(texts.editor.presentation.cover.none)
    ).toBeNull()

    fireEvent.click(
      within(rightColumn()).getByRole("switch", { name: element.isFree })
    )
    expect(
      await within(phone).findByText(preview.locked.text.lesson("Essentiel"))
    ).toBeVisible()
  })

  it("un chapitre : sa place, sans « Leçon gratuite » ; son introduction est gratuite si une de ses leçons l'est ([D43])", async () => {
    vi.mocked(methodsApi.getElementContext).mockResolvedValue({
      method: methodOfElement,
      chapter: null,
      lesson: null,
    })
    vi.mocked(api.getContent).mockImplementation(async (id) =>
      id === LOIN
        ? contentOf(LOIN, "chapter", "Aller plus loin", { parent_id: METHOD })
        : null
    )
    await renderApp(`/methodes/chapitres/${LOIN}`)
    await editable()
    const card = placeCard("chapter")
    await waitFor(() =>
      expect(card.querySelector("[data-element-place]")).toHaveTextContent(
        `${element.place.label} : Mieux respirer, ${element.place.chapter(2)}`
      )
    )
    const right = rightColumn("chapter")
    expect(
      within(right).queryByRole("switch", { name: element.isFree })
    ).toBeNull()
    expect(within(right).getByText(element.access.chapterHint)).toBeVisible()
    expect(
      within(right).getByText(element.chapterInAppHint, { exact: false })
    ).toBeVisible()

    // « Aller plus loin » n'a pas de leçon gratuite : réservé ; « Les bases » en a une.
    const tools = screen.getByRole("toolbar", { name: preview.tools })
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.reader.visitor })
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    expect(
      await within(phone).findByText(preview.locked.text.chapter("Essentiel"))
    ).toBeVisible()
  })

  it("lecture seule : quelqu'un écrit la leçon, les réglages sont grisés et le cadenas propose de prendre la main", async () => {
    vi.mocked(api.lockTake).mockResolvedValueOnce({
      ...mine,
      mine: false,
      holder_id: "00000000-0000-4000-8000-00000000c1a1",
      holder_name: "Claire Martin",
    })
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    const lock = await screen.findByRole("button", {
      name: texts.editor.lock.button,
    })
    expect(screen.getByLabelText(texts.editor.title.label)).toHaveAttribute(
      "readonly"
    )
    const right = rightColumn()
    expect(
      within(right).getByRole("switch", { name: element.inApp })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      within(right).getByRole("switch", { name: element.isFree })
    ).toHaveAttribute("aria-disabled", "true")
    expect(document.getElementById("colonne-gauche-ajouter")).toBeDisabled()
    fireEvent.click(lock)
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Claire Martin"
    )
  })

  it("« Mes blocs » propose les mises en forme, pas les points de départ", async () => {
    const item = (
      id: string,
      title: string,
      sort: templatesApi.TemplateSort
    ): templatesApi.TemplateItem => ({
      id,
      title,
      sort,
      templateFor: sort === "starter" ? "lesson" : null,
      draft: {
        v: 1,
        title,
        cover: null,
        audio: null,
        blocks: [
          {
            id: `${id.slice(0, -2)}ff`,
            type: "text",
            doc: { type: "doc", content: [{ type: "paragraph" }] },
          },
        ],
      },
      draft_saved_at: "2026-09-28T12:30:00Z",
    })
    vi.mocked(templatesApi.listTemplates).mockResolvedValue([
      item("00000000-0000-4000-8000-00000000a501", "À retenir", "style"),
      item("00000000-0000-4000-8000-00000000a504", "Interview", "starter"),
    ])
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    fireEvent.click(document.getElementById("colonne-gauche-ajouter")!)
    const library = screen.getByRole("region", {
      name: texts.editor.columns.blocks,
    })
    fireEvent.click(
      await within(library).findByRole("button", {
        name: new RegExp(texts.editor.library.mine.title),
      })
    )
    const saved = await within(library).findByRole("region", {
      name: texts.editor.library.mine.title,
    })
    expect(
      await within(saved).findByRole("button", {
        name: texts.editor.library.mine.insertLabel("À retenir"),
      })
    ).toBeEnabled()
    expect(within(saved).queryByText("Interview")).toBeNull()
  })

  it("rouverte, une leçon montre les cases enregistrées ; son état est relu après l'enregistrement", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-28T12:35:00Z",
    })
    const { router, queryClient } = await renderApp(
      `/methodes/lecons/${SOUFFLE}`
    )
    await editable()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const isFree = within(rightColumn()).getByRole("switch", {
      name: element.isFree,
    })
    fireEvent.click(isFree)
    await waitFor(() => expect(isFree).not.toBeChecked())
    // Le retour à la méthode : ce qui attendait part tout de suite.
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
    await within(await planColumn()).findByRole("link", {
      name: "Respiration carrée",
    })

    // Rouverte (la base n'est pas relue) : la case enregistrée, pas l'ancienne.
    await act(() => router.navigate(`/methodes/lecons/${SOUFFLE}`))
    await editable()
    expect(
      within(rightColumn()).getByRole("switch", { name: element.isFree })
    ).not.toBeChecked()
    expect(
      within(rightColumn()).getByRole("switch", { name: element.inApp })
    ).toBeChecked()
  })

  it("retirée de l'app depuis le plan, une leçon rouverte n'est plus montrée dans l'app", async () => {
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
    const { router } = await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    await act(() => router.navigate(`/methodes/${METHOD}`))
    await within(await planColumn()).findByRole("link", {
      name: "Respiration carrée",
    })
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
    expect(
      within(rightColumn()).getByRole("switch", { name: element.inApp })
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
    const words = element.schedule
    const { queryClient } = await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const card = placeCard()
    expect(
      await within(card).findByText(words.scheduled(formatDateTime(soon)))
    ).toBeVisible()
    expect(card).toHaveTextContent(words.scheduledHint)

    // L'heure est passée, la méthode n'est pas partie : on tient la main sur cette leçon.
    scheduledAt = past
    await act(() =>
      queryClient.invalidateQueries({
        queryKey: api.contentKeys.publication(METHOD),
      })
    )
    expect(
      await within(card).findByText(words.waitingMine(formatDateTime(past)))
    ).toBeVisible()
    expect(card).toHaveTextContent(words.waitingMineHint)
    expect(
      within(rightColumn()).getByRole("link", { name: words.leave })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
  })

  it("une leçon ne s'ouvre pas à l'adresse d'un chapitre", async () => {
    await renderApp(`/methodes/chapitres/${SOUFFLE}`)
    expect(await screen.findByText(texts.editor.notFound.title)).toBeVisible()
  })
})

describe("les exercices d'une leçon (04/10/2026)", () => {
  const INSPIRER = "00000000-0000-4000-8000-0000000000e4"
  const RETENIR = "00000000-0000-4000-8000-0000000000e5"
  const SOUFFLER = "00000000-0000-4000-8000-0000000000e6"
  const words = texts.methods.element

  // « Le souffle » : « Inspirer » (coché) et « Retenir » (décoché) ; « Expirer lentement » :
  // « Souffler » (coché, mais son chapitre est caché).
  const withExercises: MethodTree = [
    chapterOf(tree[0], [
      lessonOf(tree[0].lessons[0], [
        element_(INSPIRER, "Inspirer", { inApp: true }),
        element_(RETENIR, "Retenir"),
      ]),
      tree[0].lessons[1],
    ]),
    chapterOf(tree[1], [
      lessonOf(tree[1].lessons[0], [
        element_(SOUFFLER, "Souffler", { inApp: true }),
      ]),
    ]),
  ]

  function element_(
    id: string,
    title: string,
    changes: Partial<OutlineElement> = {}
  ): OutlineElement {
    return element(id, "exercise", title, changes)
  }

  beforeEach(() => {
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue(withExercises)
  })

  it("le plan montre les exercices sous leur leçon ; une flèche les replie", async () => {
    await openMethod()
    const plan = await planColumn()
    expect(plan).toHaveTextContent(outline.count(2, 3, 3))
    expect(
      within(plan).getByRole("link", { name: "Inspirer" })
    ).toHaveAttribute("href", `/methodes/exercices/${INSPIRER}`)
    expect(stateOf(INSPIRER)).toBe("new")
    expect(stateOf(RETENIR)).toBe("hidden")
    // Coché, mais son chapitre est caché : il ne part pas.
    expect(stateOf(SOUFFLER)).toBe("blocked")
    // Le dernier exercice de la dernière leçon ne descend plus.
    fireEvent.click(
      within(plan).getByRole("button", {
        name: outline.actions(outline.exerciseLabel(1, "Souffler")),
      })
    )
    expect(
      await screen.findByRole("menuitem", { name: outline.moveDown })
    ).toHaveAttribute("aria-disabled", "true")
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull())
    // Une leçon sans exercice n'a pas de flèche.
    expect(
      within(row(CARREE)).queryByRole("button", {
        name: outline.fold(outline.lessonLabel(2, "Respiration carrée")),
      })
    ).toBeNull()

    const lesson = outline.lessonLabel(1, "Le souffle")
    const fold = within(plan).getByRole("button", {
      name: outline.fold(lesson),
    })
    expect(fold).toHaveAttribute("aria-expanded", "true")
    fireEvent.click(fold)
    expect(within(plan).queryByRole("link", { name: "Inspirer" })).toBeNull()
    const unfold = within(plan).getByRole("button", {
      name: outline.unfold(lesson),
    })
    expect(unfold).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(unfold)
    expect(
      within(plan).getByRole("link", { name: "Inspirer" })
    ).toBeInTheDocument()
  })

  it("« Nouvel exercice », dans le menu ⋯ d'une leçon, le crée dans cette leçon", async () => {
    vi.mocked(templatesApi.listStarters).mockResolvedValue([])
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(NEW_ID, "exercise", "Compter", { parent_id: SOUFFLE })
    )
    await openMethod()
    const lesson = outline.lessonLabel(1, "Le souffle")
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.actions(lesson),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.newExercise })
    )
    const dialog = await screen.findByRole("dialog", {
      name: texts.methods.create.exerciseTitle,
    })
    expect(dialog).toHaveTextContent(
      texts.methods.create.exerciseDescription(lesson)
    )
    fireEvent.change(within(dialog).getByLabelText(texts.methods.create.name), {
      target: { value: "Compter" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: texts.methods.create.submit })
    )
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "exercise",
        "Compter",
        null,
        SOUFFLE
      )
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("exercise")
    expect(
      await screen.findByText(texts.methods.create.created.exercise("Compter"))
    ).toBeInTheDocument()
  })

  it("« Descendre » : un exercice en fin de leçon passe en tête de la suivante, avec une annonce", async () => {
    await openMethod()
    const label = outline.exerciseLabel(2, "Retenir")
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.actions(label),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.moveDown })
    )
    const [souffle, carree] = withExercises[0].lessons
    await waitFor(() =>
      expect(methodsApi.reorderOutline).toHaveBeenCalledWith(
        METHOD,
        [
          chapterOf(withExercises[0], [
            lessonOf(souffle, [souffle.exercises[0]]),
            lessonOf(carree, [souffle.exercises[1]]),
          ]),
          withExercises[1],
        ],
        expect.any(String)
      )
    )
    expect(
      screen.getByText(
        outline.moved(
          label,
          outline.exercisePlace(
            1,
            1,
            outline.lessonLabel(2, "Respiration carrée")
          )
        )
      )
    ).toBeInTheDocument()
  })

  it("le dernier exercice du plan descend encore dans une leçon vide qui le suit, pas plus loin", async () => {
    // Seule « Le souffle » a des exercices ; « Respiration carrée » et « Expirer lentement »,
    // après elle, n'en ont pas.
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue([
      chapterOf(tree[0], [withExercises[0].lessons[0], tree[0].lessons[1]]),
      tree[1],
    ])
    await openMethod()
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.actions(outline.exerciseLabel(2, "Retenir")),
      })
    )
    expect(
      await screen.findByRole("menuitem", { name: outline.moveDown })
    ).not.toHaveAttribute("aria-disabled", "true")
  })

  it("le téléphone de la méthode donne le nombre d'exercices montrés d'une leçon, pas leur liste", async () => {
    await openMethod()
    const phone = screen.getByRole("region", {
      name: texts.editor.preview.screen.ios,
    })
    expect(
      within(phone).getByRole("link", { name: /Le souffle/ })
    ).toHaveTextContent(texts.methods.preview.exercises(1))
    expect(within(phone).queryByText("Inspirer")).toBeNull()
    expect(within(phone).getByText(outline.count(1, 2, 1))).toBeVisible()
  })

  it("la liste des changements nomme la leçon et le chapitre d'un exercice", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      ...preview,
      previewRow(INSPIRER, "exercise", "Inspirer", "new", {
        chapterId: BASES,
        chapterTitle: "Les bases",
        lessonId: SOUFFLE,
        lessonTitle: "Le souffle",
      }),
    ])
    await openMethod()
    const changesCard = within(
      screen.getByRole("complementary", {
        name: texts.editor.columns.right.method,
      })
    ).getByRole("region", { name: changes.cardTitle })
    await waitFor(() =>
      expect(
        changesCard.querySelector(`[data-element-id="${INSPIRER}"]`)
      ).toHaveTextContent(
        `${changes.row(changes.kinds.exercise, "Inspirer")} ${changes.inLesson("Le souffle", "Les bases")}`
      )
    )
  })

  it("une leçon montre ses exercices en bas du téléphone, comme dans l'app", async () => {
    await renderApp(`/methodes/lecons/${SOUFFLE}`)
    await editable()
    const phone = screen.getByRole("region", {
      name: texts.editor.preview.screen.ios,
    })
    const list = await within(phone).findByRole("region", {
      name: texts.methods.preview.lessonExercises,
    })
    expect(
      within(list).getByRole("link", { name: /Inspirer/ })
    ).toHaveAttribute("href", `/methodes/exercices/${INSPIRER}`)
    // Seulement les exercices montrés dans l'app.
    expect(within(list).queryByText("Retenir")).toBeNull()
  })

  it("l'éditeur d'un exercice : sa place jusqu'à sa leçon, et l'accès de sa leçon", async () => {
    vi.mocked(api.getContent).mockImplementation(async (id) =>
      id === INSPIRER
        ? contentOf(INSPIRER, "exercise", "Inspirer", {
            parent_id: SOUFFLE,
            in_app: true,
          })
        : null
    )
    vi.mocked(methodsApi.getElementContext).mockResolvedValue({
      method: methodOfElement,
      chapter: { id: BASES, title: "Les bases" },
      lesson: { id: SOUFFLE, title: "Le souffle", isFree: true },
    })
    await renderApp(`/methodes/exercices/${INSPIRER}`)
    await editable()
    expect(
      await screen.findByRole("link", { name: words.back("Mieux respirer") })
    ).toHaveAttribute("href", `/methodes/${METHOD}`)
    const card = document.querySelector<HTMLElement>(
      '[data-element-card="exercise"]'
    )!
    await waitFor(() =>
      expect(card.querySelector("[data-element-place]")).toHaveTextContent(
        `${words.place.label} : Mieux respirer, ${words.place.chapterOf(1, "Les bases")}, ${words.place.lessonOf(1, "Le souffle")}, ${words.place.exercise(1)}`
      )
    )
    await waitFor(() =>
      expect(card.querySelector("[data-element-state]")).toHaveAttribute(
        "data-element-state",
        "new"
      )
    )
    // Sa leçon est gratuite : lui aussi ; pas de case « Gratuit » à lui.
    expect(document.querySelector("[data-element-access]")).toHaveTextContent(
      words.access.lessonFree
    )
    expect(screen.queryByLabelText(words.isFree)).toBeNull()
  })
})

describe("la Lecture, comme dans l'app (QCM du 04/10/2026)", () => {
  const preview = texts.editor.preview
  const words = texts.methods.preview
  const INSPIRER = "00000000-0000-4000-8000-0000000000e4"
  // Personne ne tient le verrou : en Lecture, on le suit sans le prendre.
  const free: api.LockRow = {
    ...mine,
    mine: false,
    holder_id: null,
    holder_name: null,
    taken_at: null,
    is_active: false,
  }

  beforeEach(() => {
    vi.mocked(api.lockStatus).mockResolvedValue(free)
  })

  function phone(): HTMLElement {
    return screen.getByRole("region", { name: preview.screen.ios })
  }

  it("le téléphone d'une méthode ouvre une leçon en Lecture, sans prendre la main ; sa flèche ramène à la méthode", async () => {
    const reading = "?mode=lecture&lecteur=sans-formule"
    const { router } = await renderApp(`/methodes/${METHOD}${reading}`)
    const souffle = await within(
      await screen.findByRole("region", { name: preview.screen.ios })
    ).findByRole("link", { name: /Le souffle/ })
    expect(souffle).toHaveAttribute(
      "href",
      `/methodes/lecons/${SOUFFLE}${reading}`
    )
    // Le plan de gauche mène aussi aux éléments en Lecture.
    expect(
      within(await planColumn()).getByRole("link", { name: "Le souffle" })
    ).toHaveAttribute("href", `/methodes/lecons/${SOUFFLE}${reading}`)

    fireEvent.click(souffle)
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/methodes/lecons/${SOUFFLE}`)
    )
    expect(router.state.location.search).toBe(reading)
    // Le téléphone de la leçon (celui de la méthode a pu rester un instant à l'écran).
    const lessonTitle = await screen.findByRole("heading", {
      level: 1,
      name: "Le souffle",
    })
    expect(lessonTitle).toBeVisible()
    expect(
      lessonTitle.closest('[role="region"]')?.getAttribute("aria-label")
    ).toBe(preview.screen.ios)
    expect(screen.queryByLabelText(texts.editor.title.label)).toBeNull()
    await waitFor(() =>
      expect(api.lockStatus).toHaveBeenCalledWith(SOUFFLE, expect.any(String))
    )
    expect(api.lockTake).not.toHaveBeenCalled()
    // La flèche du téléphone : la méthode, toujours en Lecture.
    expect(
      await within(phone()).findByRole("link", {
        name: preview.back("Mieux respirer"),
      })
    ).toHaveAttribute("href", `/methodes/${METHOD}${reading}`)
    // « Suivant » : la leçon d'après, réservée à qui n'a pas la formule.
    const next = within(phone()).getByRole("navigation", { name: words.next })
    expect(within(next).getByRole("link")).toHaveAttribute(
      "href",
      `/methodes/lecons/${CARREE}${reading}`
    )
    expect(next).toHaveTextContent(`Respiration carrée${words.locked}`)
  })

  it("« Édition » prend la main, « Lecture » la rend ; l'adresse suit", async () => {
    const { router } = await renderApp(
      `/methodes/lecons/${SOUFFLE}?mode=lecture`
    )
    const tools = await screen.findByRole("toolbar", { name: preview.tools })
    expect(await screen.findByText(preview.reading)).toBeInTheDocument()
    await waitFor(() => expect(api.lockStatus).toHaveBeenCalled())
    expect(api.lockTake).not.toHaveBeenCalled()

    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.edit })
    )
    await editable()
    expect(api.lockTake).toHaveBeenCalledWith(
      SOUFFLE,
      false,
      expect.any(String)
    )
    expect(router.state.location.search).toBe("")

    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    await waitFor(() =>
      expect(api.lockRelease).toHaveBeenCalledWith(SOUFFLE, expect.any(String))
    )
    expect(router.state.location.search).toBe("?mode=lecture")
  })

  it("un chapitre montre ses leçons sous son introduction, puis « Suivant »", async () => {
    await renderApp(`/methodes/chapitres/${BASES}`)
    await editable()
    const list = await within(phone()).findByRole("region", {
      name: words.chapterLessons,
    })
    expect(
      within(list).getByRole("link", { name: /Le souffle/ })
    ).toHaveAttribute("href", `/methodes/lecons/${SOUFFLE}`)
    // En Édition, ce qui est réservé l'est comme pour une personne sans la formule.
    expect(
      within(list).getByRole("link", { name: /Respiration carrée/ })
    ).toHaveTextContent(words.locked)
    const next = within(phone()).getByRole("navigation", { name: words.next })
    expect(within(next).getByRole("link")).toHaveAttribute(
      "href",
      `/methodes/lecons/${SOUFFLE}`
    )
    expect(next).toHaveTextContent("Le souffle")
  })

  it("un exercice : la flèche ramène à sa leçon, et pas de « Suivant »", async () => {
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue([
      chapterOf(tree[0], [
        lessonOf(tree[0].lessons[0], [
          element(INSPIRER, "exercise", "Inspirer", { inApp: true }),
        ]),
        tree[0].lessons[1],
      ]),
      tree[1],
    ])
    vi.mocked(api.getContent).mockImplementation(async (id) =>
      id === INSPIRER
        ? contentOf(INSPIRER, "exercise", "Inspirer", {
            parent_id: SOUFFLE,
            in_app: true,
          })
        : null
    )
    vi.mocked(methodsApi.getElementContext).mockResolvedValue({
      method: methodOfElement,
      chapter: { id: BASES, title: "Les bases" },
      lesson: { id: SOUFFLE, title: "Le souffle", isFree: true },
    })
    await renderApp(`/methodes/exercices/${INSPIRER}?mode=lecture`)
    expect(
      await screen.findByRole("link", { name: preview.back("Le souffle") })
    ).toHaveAttribute("href", `/methodes/lecons/${SOUFFLE}?mode=lecture`)
    expect(
      within(phone()).queryByRole("navigation", { name: words.next })
    ).toBeNull()
  })

  it("un élément qui ne sera pas dans l'app se lit, avec un bandeau, et sans « Suivant »", async () => {
    vi.mocked(api.getContent).mockImplementation(async (id) =>
      id === EXPIRER
        ? contentOf(EXPIRER, "lesson", "Expirer lentement", {
            parent_id: LOIN,
            in_app: true,
          })
        : null
    )
    vi.mocked(methodsApi.getElementContext).mockResolvedValue({
      method: methodOfElement,
      chapter: { id: LOIN, title: "Aller plus loin" },
      lesson: null,
    })
    await renderApp(`/methodes/lecons/${EXPIRER}?mode=lecture`)
    expect(
      await screen.findByText(preview.notInApp.chapter)
    ).toBeInTheDocument()
    expect(
      within(phone()).queryByRole("navigation", { name: words.next })
    ).toBeNull()
  })

  it("le plan de gauche d'une méthode, en Lecture : il ouvre, mais ne modifie rien", async () => {
    await renderApp(`/methodes/${METHOD}?mode=lecture`)
    const plan = await planColumn()
    expect(await within(plan).findByText(outline.reading)).toBeInTheDocument()
    const souffle = outline.lessonLabel(1, "Le souffle")
    fireEvent.click(
      await within(plan).findByRole("button", {
        name: outline.actions(souffle),
      })
    )
    expect(
      await screen.findByRole("menuitemcheckbox", {
        name: outline.inAppFor(souffle),
      })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByRole("menuitem", { name: outline.trash })
    ).toHaveAttribute("aria-disabled", "true")
    expect(
      screen.getByRole("menuitem", { name: outline.open })
    ).not.toHaveAttribute("aria-disabled")
  })
})

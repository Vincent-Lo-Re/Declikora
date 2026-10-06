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

// La section Méthodes : la liste, et la page d'une méthode (ADMIN § 4, « Une méthode sur une
// seule page ») : sa fiche puis ses chapitres, leçons et exercices à la suite, écrits sur place
// sous un seul verrou ; le plan qui mène aux parties ; la colonne de la partie en cours ; la
// publication d'un seul geste ([D29]) ; la Lecture, écran par écran. La base, Realtime et Storage
// sont simulés.

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
    getMethodParts: vi.fn(),
    getMethodPreview: vi.fn(),
    reorderOutline: vi.fn(async () => {}),
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
const page = texts.methods.page
const element = texts.methods.element
const preview = texts.editor.preview

const METHOD = "00000000-0000-4000-8000-0000000000d1"
const BASES = "00000000-0000-4000-8000-0000000000c1"
const LOIN = "00000000-0000-4000-8000-0000000000c2"
const SOUFFLE = "00000000-0000-4000-8000-0000000000e1"
const CARREE = "00000000-0000-4000-8000-0000000000e2"
const EXPIRER = "00000000-0000-4000-8000-0000000000e3"
const INSPIRER = "00000000-0000-4000-8000-0000000000e4"
const RETENIR = "00000000-0000-4000-8000-0000000000e5"
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

function outlineElement(
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
    outlineElement(BASES, "chapter", "Les bases", {
      inApp: true,
      published: true,
    }),
    [
      outlineElement(SOUFFLE, "lesson", "Le souffle", {
        inApp: true,
        isFree: true,
        published: true,
      }),
      outlineElement(CARREE, "lesson", "Respiration carrée", { inApp: true }),
    ]
  ),
  chapterOf(outlineElement(LOIN, "chapter", "Aller plus loin"), [
    outlineElement(EXPIRER, "lesson", "Expirer lentement", { inApp: true }),
  ]),
]

// Les brouillons de ces parties, comme la page les lit.
const parts: api.Content[] = [
  contentOf(BASES, "chapter", "Les bases", { parent_id: METHOD, in_app: true }),
  contentOf(SOUFFLE, "lesson", "Le souffle", {
    parent_id: BASES,
    in_app: true,
    is_free: true,
  }),
  contentOf(CARREE, "lesson", "Respiration carrée", {
    parent_id: BASES,
    in_app: true,
  }),
  contentOf(LOIN, "chapter", "Aller plus loin", { parent_id: METHOD }),
  contentOf(EXPIRER, "lesson", "Expirer lentement", {
    parent_id: LOIN,
    in_app: true,
  }),
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
const changeRows: PreviewRow[] = [
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

function publicationWith(scheduledAt: string | null = null) {
  return async (id: string) => ({
    id,
    draft_rev: 4,
    first_published_at: "2026-09-27T08:00:00Z",
    scheduled_at: scheduledAt,
    scheduled_by_name: scheduledAt ? "Anne Admin" : null,
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
  })
}

beforeEach(() => {
  vi.mocked(api.lockTake).mockResolvedValue(mine)
  vi.mocked(api.lockStatus).mockResolvedValue(mine)
  vi.mocked(api.saveDraft).mockResolvedValue({
    rev: 5,
    savedAt: "2026-09-28T12:35:00Z",
  })
  vi.mocked(api.getMediaByIds).mockImplementation(async (ids) =>
    ids.includes(COVER) ? [cover] : []
  )
  vi.mocked(api.getContent).mockImplementation(async (id) =>
    id === METHOD
      ? contentOf(METHOD, "method", "Mieux respirer")
      : (parts.find((part) => part.id === id) ?? null)
  )
  vi.mocked(publicationApi.getPublication).mockImplementation(publicationWith())
  vi.mocked(methodsApi.getMethodTree).mockResolvedValue(tree)
  vi.mocked(methodsApi.getMethodParts).mockResolvedValue(parts)
  vi.mocked(methodsApi.getMethodPreview).mockResolvedValue(changeRows)
  vi.mocked(methodsApi.getElementContext).mockResolvedValue({
    method: {
      id: METHOD,
      title: "Mieux respirer",
      deleted: false,
      access: { accessChosen: true, accessLevelId: LEVEL },
    },
    chapter: { id: BASES, title: "Les bases" },
    lesson: null,
  })
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([
    { id: LEVEL, name: "Essentiel", rank: 1 },
  ])
})

afterEach(() => vi.clearAllMocks())

/** Attend que la page ait pris la main (le titre de la fiche devient modifiable). */
async function editable() {
  const title = await screen.findByLabelText(texts.editor.title.label)
  await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
  return title
}

/** Une ligne du plan (chapitre, leçon ou exercice). */
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

/** La colonne de gauche : le plan de la méthode. */
function planColumn(): Promise<HTMLElement> {
  return screen.findByRole("complementary", { name: outline.title })
}

/** La colonne de droite : celle de la partie en cours. */
function rightColumn(): HTMLElement {
  return screen.getByRole("complementary", {
    name: texts.editor.columns.right.method,
  })
}

function phone(): HTMLElement {
  return screen.getByRole("region", { name: preview.screen.ios })
}

/** Le téléphone, une fois la page affichée. */
function findPhone(): Promise<HTMLElement> {
  return screen.findByRole("region", { name: preview.screen.ios })
}

/** Une partie du téléphone, par son nom complet. */
function partSection(path: string, title: string): HTMLElement {
  return within(phone()).getByRole("region", { name: page.part(path, title) })
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

/** Ouvre la page d'une méthode et attend son plan et ses états. */
async function openMethod(path = `/methodes/${METHOD}`) {
  const rendered = await renderApp(path)
  await editable()
  await within(await planColumn()).findByRole("button", {
    name: "Respiration carrée",
  })
  // La liste des changements est lue : les états en tiennent compte.
  await waitFor(() => expect(stateOf(CARREE)).toBe("new"))
  return rendered
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

  it("« Nouvelle méthode » crée la méthode et ouvre sa page", async () => {
    vi.mocked(api.listContents).mockResolvedValue([])
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(METHOD, "method", "")
    )
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue([])
    vi.mocked(methodsApi.getMethodParts).mockResolvedValue([])
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

describe("la page d'une méthode", () => {
  it("toute la méthode à la suite : la fiche, puis chaque chapitre et ses leçons, chacun avec sa place", async () => {
    await openMethod()
    const parts = within(phone())
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-label"))
    expect(parts).toEqual([
      page.fiche,
      page.part("Chapitre 1", "Les bases"),
      page.part("Chapitre 1, leçon 1", "Le souffle"),
      page.part("Chapitre 1, leçon 2", "Respiration carrée"),
      page.part("Chapitre 2", "Aller plus loin"),
      page.part("Chapitre 2, leçon 1", "Expirer lentement"),
    ])
    // Chaque partie commence par sa place, puis son titre, écrit sur place.
    const souffle = partSection("Chapitre 1, leçon 1", "Le souffle")
    expect(souffle).toHaveTextContent(element.place.lesson(1))
    expect(
      within(souffle).getByLabelText(page.titleOf("Chapitre 1, leçon 1"))
    ).toHaveValue("Le souffle")
    expect(
      within(souffle).getByRole("button", {
        name: page.addBlockIn("Chapitre 1, leçon 1"),
      })
    ).toBeEnabled()
    // Au fil de la page : « Nouvel exercice », « Nouvelle leçon », « Nouveau chapitre ».
    expect(
      within(phone()).getByRole("button", {
        name: page.newExerciseIn(1, "Le souffle"),
      })
    ).toBeEnabled()
    expect(
      within(phone()).getByRole("button", {
        name: outline.newLessonIn(outline.chapterLabel(2, "Aller plus loin")),
      })
    ).toBeEnabled()
    expect(
      within(phone()).getByRole("button", { name: outline.newChapter })
    ).toBeEnabled()
    // Les listes de l'app et « Suivant » ne sont qu'en Lecture.
    expect(
      within(phone()).queryByRole("navigation", {
        name: texts.methods.preview.next,
      })
    ).toBeNull()

    // Le plan : la fiche, puis les éléments avec leur état ; la fiche est la partie en cours.
    const plan = await planColumn()
    expect(plan).toHaveTextContent(outline.count(2, 3))
    expect(
      within(plan).getByRole("button", { name: "Mieux respirer" })
    ).toHaveAttribute("aria-current", "true")
    expect(stateOf(BASES)).toBe("live")
    expect(stateOf(SOUFFLE)).toBe("modified")
    expect(stateOf(CARREE)).toBe("new")
    expect(stateOf(LOIN)).toBe("hidden")
    // Cochée, mais dans un chapitre caché : elle ne part pas.
    expect(stateOf(EXPIRER)).toBe("blocked")
    expect(within(row(SOUFFLE)).getByText(outline.free)).toBeInTheDocument()

    // À droite, la fiche : « Prêt à publier ? », la carte de la liste, ce qui changera dans
    // l'app ; en bas, la taille du plan, l'état de la méthode et « Publier ».
    const right = rightColumn()
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
    expect(right).toHaveTextContent(texts.editor.article.stats.lessons(3))
    expect(document.querySelector("[data-publication]")).toHaveAttribute(
      "data-publication",
      "modified"
    )
    // Un seul verrou : celui de la méthode.
    expect(api.lockTake).toHaveBeenCalledTimes(1)
    expect(api.lockTake).toHaveBeenCalledWith(METHOD, false, expect.any(String))
  })

  it("un clic dans le plan mène à la partie : sa ligne allumée, ses blocs dessous, sa colonne à droite, l'adresse", async () => {
    const { router } = await openMethod()
    const plan = await planColumn()
    fireEvent.click(within(plan).getByRole("button", { name: "Le souffle" }))
    expect(
      within(plan).getByRole("button", { name: "Le souffle" })
    ).toHaveAttribute("aria-current", "true")
    // Ses blocs se déplient sous sa ligne (aucun pour l'instant).
    expect(
      await within(row(SOUFFLE)).findByText(texts.editor.outline.empty)
    ).toBeVisible()
    // À droite : sa place dans la méthode, son état, ses cases.
    const right = rightColumn()
    expect(
      within(right).getByRole("heading", { name: element.card })
    ).toBeVisible()
    expect(right).toHaveTextContent(page.part("Leçon 1", "Le souffle"))
    expect(right.querySelector("[data-element-place]")).toHaveTextContent(
      `${element.place.label} : Mieux respirer, ${element.place.chapterOf(1, "Les bases")}, ${element.place.lesson(1)}`
    )
    expect(
      within(right).getByRole("switch", { name: element.inApp })
    ).toBeChecked()
    await waitFor(() =>
      expect(router.state.location.search).toBe(`?partie=${SOUFFLE}`)
    )
  })

  it("rechargée, la page revient à la partie de l'adresse", async () => {
    await openMethod(`/methodes/${METHOD}?partie=${CARREE}`)
    expect(
      within(await planColumn()).getByRole("button", {
        name: "Respiration carrée",
      })
    ).toHaveAttribute("aria-current", "true")
    expect(rightColumn()).toHaveTextContent(
      page.part("Leçon 2", "Respiration carrée")
    )
  })

  it("une leçon ouverte d'ailleurs : la page de sa méthode, sur elle, en gardant la Lecture", async () => {
    const { router } = await renderApp(
      `/methodes/lecons/${SOUFFLE}?mode=lecture`
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/methodes/${METHOD}`)
    )
    expect(router.state.location.search).toBe(`?mode=lecture&partie=${SOUFFLE}`)
    expect(
      await within(await findPhone()).findByRole("heading", {
        level: 1,
        name: "Le souffle",
      })
    ).toBeVisible()
  })

  it("une leçon s'écrit sur place, enregistrée sous le verrou de la méthode", async () => {
    await openMethod()
    const title = screen.getByLabelText(page.titleOf("Chapitre 1, leçon 2"))
    fireEvent.change(title, { target: { value: "Respiration en carré" } })
    // Le plan montre aussitôt le nouveau titre.
    expect(
      within(await planColumn()).getByRole("button", {
        name: "Respiration en carré",
      })
    ).toBeVisible()
    await waitFor(
      () =>
        expect(api.saveDraft).toHaveBeenCalledWith(
          CARREE,
          4,
          expect.objectContaining({ title: "Respiration en carré" }),
          vi.mocked(api.lockTake).mock.calls[0][2],
          null
        ),
      { timeout: 4000 }
    )
    expect(api.lockTake).toHaveBeenCalledTimes(1)
  })

  it("les cases du menu ⋯ sont des réglages de la partie, enregistrés avec elle", async () => {
    await openMethod()
    const loin = outline.chapterLabel(2, "Aller plus loin")
    await flag(loin, outline.inAppFor(loin))
    // Aussitôt : le chapitre est montré, et sa leçon cochée part avec lui.
    await waitFor(() => expect(stateOf(LOIN)).toBe("new"))
    expect(stateOf(EXPIRER)).toBe("new")
    await waitFor(
      () =>
        expect(api.saveDraft).toHaveBeenCalledWith(
          LOIN,
          4,
          expect.anything(),
          expect.any(String),
          { in_app: true }
        ),
      { timeout: 4000 }
    )
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
    handle.focus()
    await act(async () => {
      fireEvent.keyDown(handle, { code: "Space", key: " " })
    })
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

  it("« Nouveau chapitre » : créé aussitôt, à sa place, le curseur dans son titre", async () => {
    vi.mocked(api.createContent).mockImplementation(async () => {
      vi.mocked(methodsApi.getMethodTree).mockResolvedValue([
        ...tree,
        chapterOf(outlineElement(NEW_ID, "chapter", ""), []),
      ])
      vi.mocked(methodsApi.getMethodParts).mockResolvedValue([
        ...parts,
        contentOf(NEW_ID, "chapter", "", { parent_id: METHOD }),
      ])
      return contentOf(NEW_ID, "chapter", "", { parent_id: METHOD })
    })
    await openMethod()
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.newChapter,
      })
    )
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "chapter",
        "",
        null,
        METHOD
      )
    )
    await waitFor(
      () =>
        expect(screen.getByLabelText(page.titleOf("Chapitre 3"))).toHaveFocus(),
      { timeout: 3000 }
    )
    expect(
      within(await planColumn()).getByRole("button", {
        name: texts.common.untitled,
      })
    ).toHaveAttribute("aria-current", "true")
    expect(screen.getByText(page.added.chapter)).toBeInTheDocument()
  })

  it("« Nouvelle leçon » propose les points de départ des leçons ([D42])", async () => {
    vi.mocked(templatesApi.listStarters).mockImplementation(async (kind) =>
      kind === "lesson" ? [{ id: STARTER, title: "Exercice guidé" }] : []
    )
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(NEW_ID, "lesson", "", { parent_id: LOIN })
    )
    await openMethod()
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.newLessonIn(outline.chapterLabel(2, "Aller plus loin")),
      })
    )
    expect(
      await screen.findByRole("menuitem", {
        name: texts.methods.create.blank.lesson,
      })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("menuitem", { name: "Exercice guidé" }))
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "lesson",
        "",
        STARTER,
        LOIN
      )
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("lesson")
  })

  it("retire une leçon de l'app ([D26]), puis en met une autre à la corbeille et l'annule", async () => {
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

  it("« Mettre à la corbeille » : le focus va à l'élément voisin, une fois la fenêtre fermée", async () => {
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
  })
})

describe("la colonne d'un chapitre, d'une leçon ou d'un exercice", () => {
  it("« Montrer dans l'app » et « Leçon gratuite » partent avec le brouillon ; le niveau d'accès est celui de la méthode, en lecture", async () => {
    await openMethod(`/methodes/${METHOD}?partie=${SOUFFLE}`)
    const right = rightColumn()
    const inApp = within(right).getByRole("switch", { name: element.inApp })
    const isFree = within(right).getByRole("switch", { name: element.isFree })
    expect(inApp).toBeChecked()
    expect(isFree).toBeChecked()
    expect(
      await within(right).findByText(element.access.method("Essentiel"))
    ).toBeVisible()
    expect(within(right).queryByRole("combobox")).toBeNull()

    fireEvent.click(isFree)
    await waitFor(() => expect(isFree).not.toBeChecked())
    // Le plan le montre aussitôt.
    expect(within(row(SOUFFLE)).queryByText(outline.free)).toBeNull()
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

  it("un chapitre : sa place, sans « Leçon gratuite » ; l'historique de la partie", async () => {
    await openMethod(`/methodes/${METHOD}?partie=${LOIN}`)
    const right = rightColumn()
    expect(right.querySelector("[data-element-place]")).toHaveTextContent(
      `${element.place.label} : Mieux respirer, ${element.place.chapter(2)}`
    )
    expect(
      within(right).queryByRole("switch", { name: element.isFree })
    ).toBeNull()
    expect(within(right).getByText(element.access.chapterHint)).toBeVisible()
    fireEvent.click(
      within(right).getByRole("button", {
        name: texts.publication.actions.history,
      })
    )
    expect(
      await screen.findByRole("dialog", {
        name: texts.publication.history.title,
      })
    ).toBeVisible()
    expect(publicationApi.listVersions).toHaveBeenCalledWith(LOIN)
  })

  it("lecture seule : quelqu'un écrit la méthode, rien ne se modifie et le cadenas propose de prendre la main", async () => {
    vi.mocked(api.lockTake).mockResolvedValue({
      ...mine,
      mine: false,
      holder_id: "00000000-0000-4000-8000-00000000c1a1",
      holder_name: "Claire Martin",
    })
    vi.mocked(api.lockStatus).mockResolvedValue({
      ...mine,
      mine: false,
      holder_id: "00000000-0000-4000-8000-00000000c1a1",
      holder_name: "Claire Martin",
    })
    await renderApp(`/methodes/${METHOD}?partie=${SOUFFLE}`)
    const lock = await screen.findByRole("button", {
      name: texts.editor.lock.button,
    })
    expect(screen.getByLabelText(texts.editor.title.label)).toHaveAttribute(
      "readonly"
    )
    expect(
      screen.getByLabelText(page.titleOf("Chapitre 1, leçon 1"))
    ).toHaveAttribute("readonly")
    expect(
      within(rightColumn()).getByRole("switch", { name: element.inApp })
    ).toHaveAttribute("aria-disabled", "true")
    // Ni ajout ni rangement.
    expect(
      within(phone()).queryByRole("button", { name: outline.newChapter })
    ).toBeNull()
    expect(
      within(await planColumn()).getByRole("button", {
        name: outline.newChapter,
      })
    ).toBeDisabled()
    fireEvent.click(lock)
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(
      "Claire Martin"
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
    const list = within(dialog).getByRole("region", { name: changes.title })
    expect(list).toHaveTextContent(changes.method.reordered)
    expect(list).toHaveTextContent("Leçon « Le souffle »")
    expect(list.querySelector(`[data-element-id="${CARREE}"]`)).toHaveAttribute(
      "data-change",
      "new"
    )
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

  it("une partie modifiée part d'abord à l'enregistrement, puis la méthode se publie", async () => {
    vi.mocked(publicationApi.publishContent).mockResolvedValue({
      versionId: "v2",
      versionNumber: 2,
      publishedAt: "2026-09-28T12:40:00Z",
      needsFileSync: false,
    })
    await openMethod()
    fireEvent.change(screen.getByLabelText(page.titleOf("Chapitre 2")), {
      target: { value: "Plus loin" },
    })
    fireEvent.click(
      screen.getByRole("button", { name: texts.publication.actions.publish })
    )
    const dialog = await screen.findByRole("dialog")
    const confirm = within(dialog).getByRole("button", {
      name: texts.publication.publishDialog.confirm,
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(publicationApi.publishContent).toHaveBeenCalled()
    )
    // Le chapitre est enregistré avant la publication.
    expect(api.saveDraft).toHaveBeenCalledWith(
      LOIN,
      4,
      expect.objectContaining({ title: "Plus loin" }),
      expect.any(String),
      null
    )
    expect(vi.mocked(api.saveDraft).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(publicationApi.publishContent).mock.invocationCallOrder[0]
    )
  })

  it("ne publie pas tant qu'un élément ferait refuser la publication, et mène à lui", async () => {
    vi.mocked(methodsApi.getMethodPreview).mockResolvedValue([
      previewRow(SOUFFLE, "lesson", "Le souffle", "modified", {
        problem: "image_sans_fichier",
        problemDetail: "Une image n'a pas de fichier : bloc n° 2.",
      }),
    ])
    await renderApp(`/methodes/${METHOD}`)
    await editable()
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
    // « Ouvrir » ferme la fenêtre et mène à la leçon, sur place.
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: changes.open("Leçon « Le souffle »"),
      })
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(
      within(await planColumn()).getByRole("button", { name: "Le souffle" })
    ).toHaveAttribute("aria-current", "true")
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
  })

  it("programmation en attente ([D31]) : on tient la main sur la méthode", async () => {
    const past = new Date(Date.now() - 600_000).toISOString()
    vi.mocked(publicationApi.getPublication).mockImplementation(
      publicationWith(past)
    )
    await renderApp(`/methodes/${METHOD}`)
    await editable()
    const words = texts.publication.banner.method
    expect(
      await screen.findByText(words.waitingMine(formatDateTime(past)))
    ).toBeVisible()
    expect(
      document.querySelector<HTMLElement>("[data-schedule-banner]")
    ).toHaveTextContent(words.waitingMineHint)
  })
})

describe("les exercices d'une leçon", () => {
  const withExercises: MethodTree = [
    chapterOf(tree[0], [
      lessonOf(tree[0].lessons[0], [
        outlineElement(INSPIRER, "exercise", "Inspirer", { inApp: true }),
        outlineElement(RETENIR, "exercise", "Retenir"),
      ]),
      tree[0].lessons[1],
    ]),
    tree[1],
  ]

  beforeEach(() => {
    vi.mocked(methodsApi.getMethodTree).mockResolvedValue(withExercises)
    vi.mocked(methodsApi.getMethodParts).mockResolvedValue([
      ...parts,
      contentOf(INSPIRER, "exercise", "Inspirer", {
        parent_id: SOUFFLE,
        in_app: true,
      }),
      contentOf(RETENIR, "exercise", "Retenir", { parent_id: SOUFFLE }),
    ])
  })

  it("chaque exercice suit sa leçon, dans le téléphone comme dans le plan (une flèche les replie)", async () => {
    await openMethod()
    expect(
      partSection("Chapitre 1, leçon 1, exercice 1", "Inspirer")
    ).toHaveTextContent(element.place.exercise(1))
    const plan = await planColumn()
    expect(plan).toHaveTextContent(outline.count(2, 3, 2))
    expect(stateOf(INSPIRER)).toBe("new")
    expect(stateOf(RETENIR)).toBe("hidden")
    const lesson = outline.lessonLabel(1, "Le souffle")
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.fold(lesson) })
    )
    expect(within(plan).queryByRole("button", { name: "Inspirer" })).toBeNull()
    fireEvent.click(
      within(plan).getByRole("button", { name: outline.unfold(lesson) })
    )
    expect(
      within(plan).getByRole("button", { name: "Inspirer" })
    ).toBeInTheDocument()
  })

  it("« Nouvel exercice », dans le menu ⋯ d'une leçon, le crée dans cette leçon", async () => {
    vi.mocked(api.createContent).mockResolvedValue(
      contentOf(NEW_ID, "exercise", "", { parent_id: SOUFFLE })
    )
    await openMethod()
    fireEvent.click(
      within(await planColumn()).getByRole("button", {
        name: outline.actions(outline.lessonLabel(1, "Le souffle")),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: outline.newExercise })
    )
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "exercise",
        "",
        null,
        SOUFFLE
      )
    )
  })

  it("la colonne d'un exercice : sa place jusqu'à sa leçon, et l'accès de sa leçon", async () => {
    await openMethod(`/methodes/${METHOD}?partie=${INSPIRER}`)
    const right = rightColumn()
    expect(right.querySelector("[data-element-place]")).toHaveTextContent(
      `${element.place.label} : Mieux respirer, ${element.place.chapterOf(1, "Les bases")}, ${element.place.lessonOf(1, "Le souffle")}, ${element.place.exercise(1)}`
    )
    // Sa leçon est gratuite : lui aussi ; pas de case « Gratuit » à lui.
    expect(
      await within(right).findByText(element.access.lessonFree)
    ).toBeVisible()
    expect(within(right).queryByLabelText(element.isFree)).toBeNull()
  })
})

describe("la Lecture : les écrans de l'app, dans le téléphone", () => {
  const words = texts.methods.preview
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

  it("l'écran de la méthode, puis celui d'une leçon, sans quitter la page ni prendre la main", async () => {
    const { router } = await renderApp(
      `/methodes/${METHOD}?mode=lecture&lecteur=sans-formule`
    )
    const souffle = await within(await findPhone()).findByRole("button", {
      name: /Le souffle/,
    })
    // « Respiration carrée » est réservée à qui n'a pas la formule.
    expect(
      within(phone()).getByRole("button", { name: /Respiration carrée/ })
    ).toHaveTextContent(words.locked)
    fireEvent.click(souffle)
    expect(
      await within(phone()).findByRole("heading", {
        level: 1,
        name: "Le souffle",
      })
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(`/methodes/${METHOD}`)
    await waitFor(() =>
      expect(router.state.location.search).toContain(`partie=${SOUFFLE}`)
    )
    // Le plan suit l'écran.
    expect(
      within(await planColumn()).getByRole("button", { name: "Le souffle" })
    ).toHaveAttribute("aria-current", "true")
    expect(api.lockTake).not.toHaveBeenCalled()

    // « Suivant » : la leçon d'après ; la flèche : la méthode.
    const next = within(phone()).getByRole("navigation", { name: words.next })
    fireEvent.click(within(next).getByRole("button"))
    expect(
      await within(phone()).findByRole("heading", {
        level: 1,
        name: "Respiration carrée",
      })
    ).toBeVisible()
    fireEvent.click(
      within(phone()).getByRole("button", {
        name: preview.back("Mieux respirer"),
      })
    )
    expect(
      await within(phone()).findByRole("heading", {
        level: 1,
        name: "Mieux respirer",
      })
    ).toBeVisible()
  })

  it("« Édition » prend la main sur la méthode, « Lecture » la rend", async () => {
    const { router } = await renderApp(`/methodes/${METHOD}?mode=lecture`)
    const tools = await screen.findByRole("toolbar", { name: preview.tools })
    await waitFor(() => expect(api.lockStatus).toHaveBeenCalled())
    expect(api.lockTake).not.toHaveBeenCalled()
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.edit })
    )
    await editable()
    expect(api.lockTake).toHaveBeenCalledWith(METHOD, false, expect.any(String))
    expect(router.state.location.search).toBe("")
    fireEvent.click(
      within(tools).getByRole("button", { name: preview.mode.read })
    )
    await waitFor(() =>
      expect(api.lockRelease).toHaveBeenCalledWith(METHOD, expect.any(String))
    )
  })

  it("une leçon qui ne sera pas dans l'app se lit, avec un bandeau, et sans « Suivant »", async () => {
    await renderApp(`/methodes/${METHOD}?mode=lecture&partie=${EXPIRER}`)
    expect(
      await screen.findByText(preview.notInApp.chapter)
    ).toBeInTheDocument()
    expect(
      within(phone()).queryByRole("navigation", { name: words.next })
    ).toBeNull()
  })

  it("le plan, en Lecture : il mène aux écrans, mais ne modifie rien", async () => {
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
  })
})

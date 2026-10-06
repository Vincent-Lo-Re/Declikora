import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as homeApi from "@/lib/contents/home"
import * as methodsApi from "@/lib/contents/methods"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import { PUBLIC_BUCKET, type Media } from "@/lib/media/constants"
import {
  prepareContentList,
  prepareEditor,
  prepareHome,
  prepareMedia,
  prepareMethodElement,
  prepareMethodPage,
  prepareTeam,
} from "@/lib/page-preparations"
import type { Member } from "@/lib/preparation"
import { contentRead, mediaByIdsRead, previewUrlsRead } from "@/lib/reads"
import * as teamApi from "@/lib/team"

// Ce que chaque page lit avant d'être montrée : les mêmes lectures que la page (lib/reads.ts),
// les images comprises. La base est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  getContent: vi.fn(),
  getMediaByIds: vi.fn(),
  listContents: vi.fn(),
}))
vi.mock("@/lib/contents/templates", async (importOriginal) => ({
  ...(await importOriginal<typeof templatesApi>()),
  getTemplatesByIds: vi.fn(),
  listStarters: vi.fn(async () => []),
  listTemplateUses: vi.fn(async () => []),
  getTemplateOutdated: vi.fn(async () => []),
}))
vi.mock("@/lib/contents/publication", async (importOriginal) => ({
  ...(await importOriginal<typeof publicationApi>()),
  getPublication: vi.fn(async () => null),
}))
vi.mock("@/lib/contents/methods", async (importOriginal) => ({
  ...(await importOriginal<typeof methodsApi>()),
  getElementContext: vi.fn(),
  getMethodParts: vi.fn(async () => []),
  getMethodPreview: vi.fn(async () => []),
  getMethodTree: vi.fn(async () => []),
}))
vi.mock("@/lib/contents/home", async (importOriginal) => ({
  ...(await importOriginal<typeof homeApi>()),
  listMyRecentDrafts: vi.fn(),
  listScheduled: vi.fn(async () => []),
  listFailedSchedules: vi.fn(async () => []),
}))
vi.mock("@/lib/media/api", async (importOriginal) => ({
  ...(await importOriginal<typeof mediaApi>()),
  getPreviewUrls: vi.fn(async (keys: string[]) =>
    Object.fromEntries(keys.map((key) => [key, `https://fichiers/${key}`]))
  ),
  listMedia: vi.fn(async () => []),
  getMedia: vi.fn(async () => null),
  getStorageUsed: vi.fn(async () => 0),
  getLatestAudit: vi.fn(async () => null),
}))
vi.mock("@/lib/access-levels", async (importOriginal) => ({
  ...(await importOriginal<typeof levelsApi>()),
  listAccessLevels: vi.fn(async () => []),
}))
vi.mock("@/lib/categories", async (importOriginal) => ({
  ...(await importOriginal<typeof categoriesApi>()),
  listCategories: vi.fn(async () => []),
}))
vi.mock("@/lib/team", async (importOriginal) => ({
  ...(await importOriginal<typeof teamApi>()),
  listMembers: vi.fn(async () => []),
}))

const ARTICLE = "00000000-0000-4000-8000-0000000000a1"
const TEMPLATE = "00000000-0000-4000-8000-0000000000b1"
const PHOTO = "00000000-0000-4000-8000-0000000000c1"
const COVER = "00000000-0000-4000-8000-0000000000c2"
const SHARED_PHOTO = "00000000-0000-4000-8000-0000000000c3"
const SOUND = "00000000-0000-4000-8000-0000000000c4"
const LESSON = "00000000-0000-4000-8000-0000000000d1"
const METHOD = "00000000-0000-4000-8000-0000000000d2"

const editor: Member = { id: "membre-1", role: "editor" }

function file(id: string, kind: Media["kind"] = "image"): Media {
  return {
    id,
    kind,
    status: "ready",
    deleted_at: null,
    is_public: true,
    path: `${id}.webp`,
  } as Media
}

function imageBlock(id: string, mediaId: string) {
  return { id, type: "image", mediaId, caption: null, alt: null }
}

const draft = {
  title: "Bien dormir",
  blocks: [
    imageBlock("00000000-0000-4000-8000-0000000000e1", PHOTO),
    {
      id: "00000000-0000-4000-8000-0000000000e2",
      type: "linked",
      templateId: TEMPLATE,
    },
  ],
  cover: { mediaId: COVER },
  audio: { mediaId: SOUND },
} as unknown as Draft

function contentOf(kind: api.ContentKind, changes: Partial<api.Content> = {}) {
  return {
    id: ARTICLE,
    kind,
    draft,
    deleted_at: null,
    template_sort: null,
    ...changes,
  } as api.Content
}

// Les images téléchargées d'avance.
let loaded: string[] = []

let queryClient: QueryClient
const args = (
  params: Record<string, string> = {},
  search = "",
  member = editor
) => ({
  queryClient,
  member,
  params,
  search: new URLSearchParams(search),
})

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  loaded = []
  vi.stubGlobal(
    "Image",
    class {
      set src(url: string) {
        loaded.push(url)
      }
    }
  )
  vi.mocked(templatesApi.getTemplatesByIds).mockResolvedValue([
    {
      id: TEMPLATE,
      title: "Respirer",
      sort: "shared",
      inTrash: false,
      draft: {
        blocks: [
          imageBlock("00000000-0000-4000-8000-0000000000e3", SHARED_PHOTO),
        ],
      } as unknown as Draft,
    },
  ])
  vi.mocked(api.getMediaByIds).mockImplementation(async (ids) =>
    ids.map((id) => file(id, id === SOUND ? "audio" : "image"))
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("l'éditeur arrive avec son brouillon, ses cartes et ses images", () => {
  it("un article : brouillon, formules, catégories, publication, blocs partagés et fichiers", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf("article"))

    await prepareEditor("article")(args({ contentId: ARTICLE }))

    expect(queryClient.getQueryData(contentRead(ARTICLE).queryKey)).toEqual(
      contentOf("article")
    )
    expect(levelsApi.listAccessLevels).toHaveBeenCalled()
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    expect(publicationApi.getPublication).toHaveBeenCalledWith(ARTICLE)
    expect(templatesApi.getTemplatesByIds).toHaveBeenCalledWith([TEMPLATE])
    // Les fichiers du brouillon et de son bloc partagé, sous la clé que lit l'éditeur.
    const ids = [COVER, PHOTO, SHARED_PHOTO, SOUND].sort()
    expect(api.getMediaByIds).toHaveBeenCalledWith(ids)
    expect(queryClient.getQueryData(mediaByIdsRead(ids).queryKey)).toHaveLength(
      4
    )
    const keys = ids.map((id) => `${PUBLIC_BUCKET}/${id}.webp`).sort()
    expect(
      queryClient.getQueryData(previewUrlsRead(keys).queryKey)
    ).toBeDefined()
    // Les images (pas l'audio), téléchargées d'avance.
    expect(loaded.sort()).toEqual(
      [COVER, PHOTO, SHARED_PHOTO]
        .sort()
        .map((id) => `https://fichiers/${PUBLIC_BUCKET}/${id}.webp`)
    )
    // Pas une méthode ni l'un de ses éléments.
    expect(methodsApi.getElementContext).not.toHaveBeenCalled()
  })

  it("la page d'une méthode : sa fiche, son plan, toutes ses parties et leurs fichiers, ses changements, sa publication, les points de départ", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf("method", {
        id: METHOD,
        draft: {
          v: 1,
          title: "Respirer",
          blocks: [],
          cover: { mediaId: COVER },
        } as unknown as Draft,
      })
    )
    vi.mocked(methodsApi.getMethodParts).mockResolvedValue([
      contentOf("lesson", {
        id: LESSON,
        draft: {
          v: 1,
          title: "Le souffle",
          blocks: [imageBlock("00000000-0000-4000-8000-0000000000e3", PHOTO)],
        } as unknown as Draft,
      }),
    ])
    vi.mocked(api.getMediaByIds).mockImplementation(async (ids) =>
      ids.map((id) => file(id))
    )

    await prepareMethodPage(args({ contentId: METHOD }))

    expect(methodsApi.getMethodParts).toHaveBeenCalledWith(METHOD)
    expect(methodsApi.getMethodTree).toHaveBeenCalledWith(METHOD)
    expect(methodsApi.getMethodPreview).toHaveBeenCalledWith(METHOD)
    expect(publicationApi.getPublication).toHaveBeenCalledWith(METHOD)
    for (const kind of ["chapter", "lesson", "exercise"]) {
      expect(templatesApi.listStarters).toHaveBeenCalledWith(kind)
    }
    // Les fichiers de la fiche et ceux de chaque partie, chacun avec sa propre lecture.
    expect(api.getMediaByIds).toHaveBeenCalledWith([COVER])
    expect(api.getMediaByIds).toHaveBeenCalledWith([PHOTO])
    expect(loaded.sort()).toEqual(
      [COVER, PHOTO]
        .sort()
        .map((id) => `https://fichiers/${PUBLIC_BUCKET}/${id}.webp`)
    )
  })

  it("une méthode introuvable, ou un autre contenu : rien de plus à lire", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf("article"))
    await prepareMethodPage(args({ contentId: ARTICLE }))
    expect(methodsApi.getMethodParts).not.toHaveBeenCalled()
    expect(publicationApi.getPublication).not.toHaveBeenCalled()
  })

  it("une leçon ouverte d'ailleurs : sa méthode, où elle mène", async () => {
    vi.mocked(methodsApi.getElementContext).mockResolvedValue(null)
    await prepareMethodElement(args({ contentId: LESSON }))
    expect(methodsApi.getElementContext).toHaveBeenCalledWith(LESSON)
  })

  it("un contenu introuvable, à la corbeille ou d'une autre sorte : rien de plus à lire", async () => {
    vi.mocked(api.getContent).mockResolvedValue(contentOf("page"))
    await prepareEditor("article")(args({ contentId: ARTICLE }))
    vi.mocked(api.getContent).mockResolvedValue(
      contentOf("article", { id: "autre", deleted_at: "2026-10-05T10:00:00Z" })
    )
    await prepareEditor("article")(args({ contentId: "autre" }))

    expect(api.getContent).toHaveBeenCalledTimes(2)
    expect(api.getMediaByIds).not.toHaveBeenCalled()
    expect(publicationApi.getPublication).not.toHaveBeenCalled()
  })

  it("un brouillon lu il y a peu n'est pas relu ; plus ancien, il l'est", async () => {
    vi.useFakeTimers()
    vi.mocked(api.getContent).mockResolvedValue(contentOf("article"))
    await prepareEditor("article")(args({ contentId: ARTICLE }))
    await prepareEditor("article")(args({ contentId: ARTICLE }))
    expect(api.getContent).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(31_000)
    await prepareEditor("article")(args({ contentId: ARTICLE }))
    expect(api.getContent).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe("les listes", () => {
  it("Le Fil : les articles, leurs catégories, les formules et les images du premier écran", async () => {
    vi.mocked(api.listContents).mockResolvedValue(
      Array.from({ length: 30 }, (_, index) => ({
        id: `article-${index}`,
        cover_id: `image-${String(index).padStart(2, "0")}`,
      })) as api.ContentListItem[]
    )

    await prepareContentList("article")(args())

    expect(api.listContents).toHaveBeenCalledWith("article")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    expect(levelsApi.listAccessLevels).toHaveBeenCalled()
    // Toutes les images de la liste en une demande ; les 24 premières téléchargées d'avance.
    expect(vi.mocked(api.getMediaByIds).mock.calls[0][0]).toHaveLength(30)
    expect(loaded).toHaveLength(24)
  })

  it("la Médiathèque : les filtres de l'adresse, et la fiche demandée", async () => {
    await prepareMedia(args({}, `type=image&recherche=plage&fichier=${PHOTO}`))
    expect(mediaApi.listMedia).toHaveBeenCalledWith({
      kind: "image",
      search: "plage",
      unused: false,
    })
    expect(mediaApi.getMedia).toHaveBeenCalledWith(PHOTO)
    expect(mediaApi.getStorageUsed).toHaveBeenCalled()
    expect(mediaApi.getLatestAudit).toHaveBeenCalled()
  })

  it("l'Accueil : mes brouillons, et ce qu'il y a à publier dans mes méthodes en ligne", async () => {
    vi.mocked(homeApi.listMyRecentDrafts).mockResolvedValue([
      { id: METHOD, kind: "method", live_draft_rev: 3 },
      { id: ARTICLE, kind: "article", live_draft_rev: 2 },
    ] as homeApi.HomeItem[])

    await prepareHome(args())

    expect(homeApi.listMyRecentDrafts).toHaveBeenCalledWith(editor.id)
    expect(methodsApi.getMethodPreview).toHaveBeenCalledTimes(1)
    expect(methodsApi.getMethodPreview).toHaveBeenCalledWith(METHOD)
  })

  it("l'Équipe n'est lue que pour un admin", async () => {
    await prepareTeam(args())
    expect(teamApi.listMembers).not.toHaveBeenCalled()
    await prepareTeam(args({}, "", { id: "admin-1", role: "admin" }))
    expect(teamApi.listMembers).toHaveBeenCalled()
  })
})

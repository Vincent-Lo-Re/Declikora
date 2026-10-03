import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft, ImageBlock, TextBlock } from "@/blocks/types"
import * as levelsApi from "@/lib/access-levels"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { createFromDialog } from "@/test/new-content"
import { renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

// La base et Realtime sont simulés.
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
    unscheduleContent: vi.fn(),
    unpublishContent: vi.fn(),
    revertToVersion: vi.fn(),
    trashContent: vi.fn(),
    restoreContent: vi.fn(),
  }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return {
    ...actual,
    listTemplates: vi.fn(async () => []),
    listTemplateUses: vi.fn(async () => []),
    getTemplatesByIds: vi.fn(async () => []),
    listStarters: vi.fn(async () => []),
    getTemplateOutdated: vi.fn(async () => []),
    createTemplate: vi.fn(),
    createTemplateFrom: vi.fn(),
    pushTemplate: vi.fn(),
    detachTemplateEverywhere: vi.fn(),
  }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return { ...actual, kickFiles: vi.fn(async () => {}) }
})

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return { ...actual, listAccessLevels: vi.fn(async () => []) }
})

const PAGE_ID = "00000000-0000-4000-8000-0000000000aa"
const BLOCK_ID = "00000000-0000-4000-8000-0000000000bb"
const CLAIRE = "00000000-0000-4000-8000-0000000000cc"

const draft: Draft = {
  v: 1,
  title: "Mentions légales",
  summary: null,
  cover: null,
  audio: null,
  blocks: [
    {
      id: BLOCK_ID,
      type: "text",
      doc: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Bonjour" }] },
        ],
      },
    },
  ],
}

const content: api.Content = {
  id: PAGE_ID,
  kind: "page",
  title: "Mentions légales",
  draft,
  draft_rev: 4,
  draft_saved_at: "2026-09-27T12:30:00Z",
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
}

const mineRow: api.LockRow = {
  mine: true,
  holder_id: testProfile.id,
  holder_name: testProfile.full_name,
  taken_at: "2026-09-27T12:30:00Z",
  heartbeat_at: "2026-09-27T12:30:00Z",
  is_active: true,
  draft_rev: 4,
}

const claireRow: api.LockRow = {
  ...mineRow,
  mine: false,
  holder_id: CLAIRE,
  holder_name: "Claire Martin",
}

// Le faux Realtime : envoie un changement de la ligne de verrou à l'éditeur ouvert.
let emitLock: (change: api.LockChange) => void = () => {}

function lockChange(
  holder: string | null,
  rev: number,
  session: string | null = null
): api.LockChange {
  return {
    holder_id: holder,
    holder_session: session,
    heartbeat_at: new Date().toISOString(),
    draft_rev: rev,
    taken_at: holder ? new Date().toISOString() : null,
  }
}

/** Le même brouillon, dans un modèle de bloc (mise en forme) : l'ancien éditeur, son bandeau. */
const template: api.Content = {
  ...content,
  kind: "template",
  template_sort: "style",
  template_for: null,
}

/** L'ouverture de l'éditeur (session) passée à lock_take. */
function editorSession(): string {
  return vi.mocked(api.lockTake).mock.calls[0][2]
}

function textBlock(id: string, text: string): TextBlock {
  return {
    id,
    type: "text",
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
  }
}

function imageBlock(id: string, mediaId: string): ImageBlock {
  return { id, type: "image", mediaId, caption: null, alt: null }
}

function withDraft(changes: Partial<Draft>, rev = 4): api.Content {
  const next = { ...draft, ...changes }
  return { ...content, draft: next, title: next.title, draft_rev: rev }
}

function media(id: string): Media {
  return {
    id,
    name: `${id}.jpg`,
    status: "pending",
    deleted_at: null,
    alt: null,
  } as unknown as Media
}

/** Lecture seule : Claire écrit (prise de main et relectures). */
function claireWrites() {
  vi.mocked(api.lockTake).mockResolvedValue(claireRow)
  vi.mocked(api.lockStatus).mockResolvedValue(claireRow)
}

beforeEach(() => {
  vi.mocked(api.getContent).mockResolvedValue(content)
  vi.mocked(publicationApi.getPublication).mockResolvedValue({
    id: PAGE_ID,
    draft_rev: 4,
    first_published_at: null,
    scheduled_at: null,
    scheduled_by_name: null,
    schedule_error: null,
    deleted_at: null,
    live: null,
  })
  vi.mocked(api.lockTake).mockResolvedValue(mineRow)
  vi.mocked(api.lockStatus).mockResolvedValue(mineRow)
  vi.mocked(api.subscribeLock).mockImplementation((_id, onChange) => {
    emitLock = onChange
    return () => {}
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("liste des pages", () => {
  it("liste les pages et en crée une nouvelle, ouverte dans l'éditeur plein écran", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      {
        id: PAGE_ID,
        title: "Mentions légales",
        slug: "mentions-legales",
        cover_id: null,
        list_position: null,
        category_ids: [],
        draft_rev: 4,
        draft_saved_at: "2026-09-27T12:30:00Z",
        live_draft_rev: null,
        first_published_at: null,
        scheduled_at: null,
        schedule_error: null,
        access_chosen: false,
        access_level_id: null,
      },
    ])
    vi.mocked(api.createContent).mockResolvedValue(content)
    const { router } = renderApp("/pages")

    const link = await screen.findByRole("link", { name: "Mentions légales" })
    expect(link).toHaveAttribute("href", `/pages/${PAGE_ID}`)
    // La date seulement : ni qui a modifié, ni qui écrit en ce moment.
    expect(screen.getByText("27 sept. 2026 à 14h30")).toBeInTheDocument()

    await createFromDialog("page", "Mentions légales")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/pages/${PAGE_ID}`)
    )
    expect(api.createContent).toHaveBeenCalledWith(
      "page",
      "Mentions légales",
      null
    )
    // Plein écran : le menu de l'admin est caché, « ← Pages » ramène à la liste.
    expect(
      await screen.findByRole("link", { name: texts.editor.back("Pages") })
    ).toHaveAttribute("href", "/pages")
    expect(
      screen.queryByRole("navigation", { name: texts.nav.label })
    ).toBeNull()
  })
})

describe("liste des pages : publication et corbeille", () => {
  const row = (changes: Partial<api.ContentListItem>): api.ContentListItem => ({
    id: PAGE_ID,
    title: "Mentions légales",
    slug: null,
    cover_id: null,
    list_position: null,
    category_ids: [],
    draft_rev: 4,
    draft_saved_at: "2026-09-27T12:30:00Z",
    live_draft_rev: null,
    first_published_at: null,
    scheduled_at: null,
    schedule_error: null,
    access_chosen: false,
    access_level_id: null,
    ...changes,
  })

  it("montre l'état de chaque page : brouillon, en ligne, modifiée, programmée, échec", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row({ id: "p1", title: "Brouillon seul" }),
      row({
        id: "p2",
        title: "En ligne",
        live_draft_rev: 4,
        first_published_at: "2026-09-01T08:00:00Z",
      }),
      row({
        id: "p3",
        title: "Modifiée",
        draft_rev: 6,
        live_draft_rev: 4,
        first_published_at: "2026-09-01T08:00:00Z",
        scheduled_at: "2099-10-03T06:00:00Z",
      }),
      row({ id: "p4", title: "Échouée", schedule_error: "auteur_parti" }),
    ])
    renderApp("/pages")
    const cells = async (title: string) =>
      (await screen.findByRole("link", { name: title })).closest("tr")!
    const labels = texts.publication.status
    expect(await cells("Brouillon seul")).toHaveTextContent(labels.draft)
    expect(await cells("En ligne")).toHaveTextContent(labels.live)
    const modified = await cells("Modifiée")
    expect(modified).toHaveTextContent(labels.modified)
    expect(modified).toHaveTextContent(labels.scheduled("3 oct. 2099 à 08h00"))
    expect(await cells("Échouée")).toHaveTextContent(labels.failed)
  })

  it("« Supprimer » met la page à la corbeille après confirmation, avec « Annuler »", async () => {
    vi.mocked(api.listContents).mockResolvedValue([row({})])
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "00000000-0000-4000-8000-0000000000b1",
      trashed: 1,
      needsFileSync: false,
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    renderApp("/pages")
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.contentList.actions("Mentions légales"),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: texts.contentList.trash })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(publicationApi.trashContent).not.toHaveBeenCalled()
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.contentList.confirmTrash.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(PAGE_ID)
    )
    // Aucun fichier à déplacer : pas d'appel à la fonction « files ».
    expect(mediaApi.kickFiles).not.toHaveBeenCalled()
    const toast = await screen.findByText(
      texts.contentList.trashed("Mentions légales")
    )
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", {
        name: texts.contentList.undo,
      })
    )
    await waitFor(() =>
      expect(publicationApi.restoreContent).toHaveBeenCalledWith(PAGE_ID)
    )
  })

  it("une page en ligne mise à la corbeille : la fonction « files » tout de suite", async () => {
    vi.mocked(api.listContents).mockResolvedValue([
      row({ live_draft_rev: 4, first_published_at: "2026-09-01T08:00:00Z" }),
    ])
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "00000000-0000-4000-8000-0000000000b1",
      trashed: 1,
      needsFileSync: true,
    })
    renderApp("/pages")
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.contentList.actions("Mentions légales"),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: texts.contentList.trash })
    )
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: texts.contentList.confirmTrash.confirm,
      })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(PAGE_ID)
    )
    await waitFor(() => expect(mediaApi.kickFiles).toHaveBeenCalled())
  })

  it("refuse la corbeille quand quelqu'un d'autre écrit, en le nommant", async () => {
    vi.mocked(api.listContents).mockResolvedValue([row({})])
    vi.mocked(publicationApi.trashContent).mockRejectedValue(
      new api.ContentError("verrou_tenu", {
        detail: "Claire Martin écrit ce brouillon.",
      })
    )
    renderApp("/pages")
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.contentList.actions("Mentions légales"),
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitem", { name: texts.contentList.trash })
    )
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: texts.contentList.confirmTrash.confirm,
      })
    )
    expect(
      await screen.findByText(texts.editor.errors.verrou_tenu)
    ).toBeVisible()
    expect(screen.getByText("Claire Martin écrit ce brouillon.")).toBeVisible()
  })
})

describe("éditeur", () => {
  it("prend le verrou, écrit dans l'aperçu et enregistre tout seul", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    renderApp(`/pages/${PAGE_ID}`)

    const title = await screen.findByLabelText(texts.editor.title.label)
    await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
    expect(api.lockTake).toHaveBeenCalledWith(
      PAGE_ID,
      false,
      expect.any(String)
    )
    // Éditeur du Fil : le plan est ouvert d'office, avec la première ligne de chaque texte.
    expect(
      screen.getByRole("navigation", { name: texts.editor.outline.title })
    ).toHaveTextContent("Bonjour")

    fireEvent.change(title, { target: { value: "Mentions légales 2026" } })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(1), {
      timeout: 4000,
    })
    const [id, baseRev, saved, session] = vi.mocked(api.saveDraft).mock.calls[0]
    expect(id).toBe(PAGE_ID)
    expect(baseRev).toBe(4)
    // Enregistré depuis la même ouverture de l'éditeur que celle qui tient le verrou.
    expect(session).toBe(editorSession())
    expect(saved.title).toBe("Mentions légales 2026")
    expect(await screen.findByText(texts.editor.save.saved)).toBeInTheDocument()
  })

  it("montre le brouillon en lecture seule quand un autre membre écrit : le cadenas, rien de modifiable", async () => {
    vi.mocked(api.lockTake).mockResolvedValue(claireRow)
    renderApp(`/pages/${PAGE_ID}`)

    expect(
      await screen.findByRole("button", { name: texts.editor.lock.button })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(texts.editor.title.label)).toHaveAttribute(
      "readonly"
    )
    for (const add of screen.getAllByRole("button", {
      name: texts.editor.add.label,
    })) {
      expect(add).toBeDisabled()
    }
  })

  it("ancien éditeur (un modèle de bloc) : le bandeau dit qui écrit ; « Reprendre la main » demande confirmation, puis force la prise du verrou", async () => {
    vi.mocked(api.getContent).mockResolvedValue(template)
    vi.mocked(api.lockTake)
      .mockResolvedValueOnce(claireRow)
      .mockResolvedValue(mineRow)
    renderApp(`/modeles/${PAGE_ID}`)

    expect(
      await screen.findByText(texts.editor.lock.readOnly("Claire Martin"))
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: texts.editor.add.label })
    ).toBeDisabled()
    fireEvent.click(
      await screen.findByRole("button", { name: texts.editor.lock.forceTake })
    )
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.editor.lock.confirmForce.confirm,
      })
    )
    await waitFor(() =>
      expect(api.lockTake).toHaveBeenLastCalledWith(
        PAGE_ID,
        true,
        editorSession()
      )
    )
    await waitFor(() =>
      expect(
        screen.getByLabelText(texts.templates.editor.nameLabel)
      ).not.toHaveAttribute("readonly")
    )
  })

  it("notre enregistrement vu par Realtime avant sa réponse ne bloque pas l'écriture", async () => {
    let answer: (saved: api.SavedDraft) => void = () => {}
    vi.mocked(api.saveDraft).mockImplementation(
      () => new Promise((resolve) => (answer = resolve))
    )
    renderApp(`/pages/${PAGE_ID}`)
    const title = await screen.findByLabelText(texts.editor.title.label)
    await waitFor(() => expect(title).not.toHaveAttribute("readonly"))

    fireEvent.change(title, { target: { value: "Mentions" } })
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledTimes(1), {
      timeout: 4000,
    })
    // La base a enregistré (révision 5) : Realtime le dit avant la réponse de save_draft.
    act(() => emitLock(lockChange(testProfile.id, 5, editorSession())))
    expect(title).not.toHaveAttribute("readonly")
    await act(async () => answer({ rev: 5, savedAt: "2026-09-27T12:31:00Z" }))
    expect(title).not.toHaveAttribute("readonly")
    expect(api.getContent).toHaveBeenCalledTimes(1)
  })

  it("une relecture du brouillon qui échoue ne ferme pas l'éditeur, et elle est retentée", async () => {
    claireWrites()
    vi.mocked(api.getContent)
      .mockResolvedValueOnce(content)
      .mockRejectedValueOnce(new api.ContentError(null, { retryable: true }))
      .mockResolvedValue(withDraft({ title: "Titre de Claire" }, 5))
    renderApp(`/pages/${PAGE_ID}`)
    await screen.findByRole("button", { name: texts.editor.lock.button })

    act(() => emitLock(lockChange(CLAIRE, 5)))
    await waitFor(() => expect(api.getContent).toHaveBeenCalledTimes(2))
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(screen.queryByText(texts.editor.notFound.title)).toBeNull()
    const title = screen.getByLabelText(texts.editor.title.label)
    expect(title).toHaveValue("Mentions légales")

    await waitFor(() => expect(title).toHaveValue("Titre de Claire"), {
      timeout: 5000,
    })
    expect(api.getContent).toHaveBeenCalledTimes(3)
  }, 10_000)

  it("relit la dernière révision, pas une relecture plus ancienne encore en cours", async () => {
    claireWrites()
    const reads: ((value: api.Content) => void)[] = []
    vi.mocked(api.getContent)
      .mockResolvedValueOnce(content)
      .mockImplementation(() => new Promise((resolve) => reads.push(resolve)))
    renderApp(`/pages/${PAGE_ID}`)
    await screen.findByRole("button", { name: texts.editor.lock.button })

    act(() => emitLock(lockChange(CLAIRE, 5)))
    await waitFor(() => expect(reads).toHaveLength(1))
    act(() => emitLock(lockChange(CLAIRE, 6)))
    await waitFor(() => expect(reads).toHaveLength(2))
    await act(async () => reads[1](withDraft({ title: "Révision 6" }, 6)))
    await act(async () => reads[0](withDraft({ title: "Révision 5" }, 5)))
    expect(screen.getByLabelText(texts.editor.title.label)).toHaveValue(
      "Révision 6"
    )
  })

  it("relit encore si la lecture rend une révision en retard", async () => {
    claireWrites()
    vi.mocked(api.getContent)
      .mockResolvedValueOnce(content)
      .mockResolvedValueOnce(withDraft({ title: "Révision 5" }, 5))
      .mockResolvedValue(withDraft({ title: "Révision 6" }, 6))
    renderApp(`/pages/${PAGE_ID}`)
    await screen.findByRole("button", { name: texts.editor.lock.button })

    act(() => emitLock(lockChange(CLAIRE, 6)))
    await waitFor(() =>
      expect(screen.getByLabelText(texts.editor.title.label)).toHaveValue(
        "Révision 6"
      )
    )
    expect(api.getContent).toHaveBeenCalledTimes(3)
  })

  it("un autre onglet du même membre a la main : lecture seule, sans nommer quelqu'un d'autre", async () => {
    const otherTab = { ...mineRow, mine: false }
    vi.mocked(api.lockTake).mockResolvedValue(otherTab)
    vi.mocked(api.lockStatus).mockResolvedValue(otherTab)
    renderApp(`/pages/${PAGE_ID}`)
    fireEvent.click(
      await screen.findByRole("button", { name: texts.editor.lock.button })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(texts.editor.lock.dialog.title.readOnlySelf)
    ).toBeInTheDocument()
    expect(within(dialog).queryByText(/Claire/)).toBeNull()
    expect(screen.getByLabelText(texts.editor.title.label)).toHaveAttribute(
      "readonly"
    )
  })

  it("n'ouvre pas un contenu d'une autre sorte", async () => {
    vi.mocked(api.getContent).mockResolvedValue({ ...content, kind: "article" })
    renderApp(`/pages/${PAGE_ID}`)
    expect(
      await screen.findByText(texts.editor.notFound.title)
    ).toBeInTheDocument()
  })
})

describe("éditeur d'une page (éditeur du Fil)", () => {
  const columns = texts.editor.columns
  const ready = texts.editor.article.ready
  const slug = texts.publication.settings.slug

  /** La carte « Adresse de la page » et son champ. */
  function addressCard() {
    return screen.getByRole("region", { name: slug.label })
  }
  function addressField() {
    return within(addressCard()).getByRole("textbox", { name: slug.label })
  }

  async function editable() {
    const title = await screen.findByLabelText(texts.editor.title.label)
    await waitFor(() => expect(title).not.toHaveAttribute("readonly"))
  }

  it("la colonne « Page » : titre, adresse et niveau d'accès ; ni image, ni catégories, ni carte de liste", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    renderApp(`/pages/${PAGE_ID}`)
    await editable()
    expect(screen.queryByRole("banner")).toBeNull()
    expect(
      within(
        screen.getByRole("complementary", { name: columns.left })
      ).getByRole("link", {
        name: texts.editor.back(texts.sections.pages.title),
      })
    ).toHaveAttribute("href", "/pages")
    const panel = screen.getByRole("region", { name: columns.content.page })
    const todo = within(panel)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"))
      .filter((label) => label?.endsWith(" : à régler"))
    expect(todo).toEqual([
      ready.todo(ready.items.address),
      ready.todo(ready.items.access),
    ])
    expect(
      within(panel).queryByText(texts.publication.settings.categories.label)
    ).toBeNull()
    expect(
      within(panel).queryByRole("region", {
        name: texts.editor.article.feed.title.article,
      })
    ).toBeNull()
    // Le téléphone commence par le titre : pas d'image de présentation.
    expect(document.querySelector('[data-presentation="cover"]')).toBeNull()
    expect(
      screen.queryByRole("button", { name: texts.publication.actions.settings })
    ).toBeNull()
  })

  it("l'adresse, vérifiée en tapant : « Libre », puis elle part avec le brouillon", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    fireEvent.change(addressField(), { target: { value: "Contact !" } })
    expect(within(addressCard()).getByText(slug.invalid)).toBeVisible()
    expect(api.findPageBySlug).not.toHaveBeenCalled()

    fireEvent.change(addressField(), { target: { value: "contact" } })
    expect(within(addressCard()).getByText(slug.checking)).toBeVisible()
    expect(await within(addressCard()).findByText(slug.free)).toBeVisible()
    expect(api.findPageBySlug).toHaveBeenCalledWith("contact", PAGE_ID)
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      slug: "contact",
    })
    // « Prêt à publier ? » : l'adresse est faite.
    expect(
      screen.getByRole("button", {
        name: ready.done(ready.items.address),
      })
    ).toBeVisible()
  })

  it("une adresse déjà prise est refusée en tapant, avec le nom de la page ; « Reprendre le titre » propose l'adresse du titre", async () => {
    vi.mocked(api.findPageBySlug).mockImplementation(async (value) =>
      value === "accueil" ? { id: "autre", title: "Accueil" } : null
    )
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    renderApp(`/pages/${PAGE_ID}`)
    await editable()

    fireEvent.change(addressField(), { target: { value: "accueil" } })
    expect(
      await within(addressCard()).findByText(slug.taken("Accueil"))
    ).toBeVisible()
    expect(addressField()).toHaveAttribute("aria-invalid", "true")

    fireEvent.click(
      within(addressCard()).getByRole("button", { name: slug.fromTitle })
    )
    expect(addressField()).toHaveValue("mentions-legales")
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalled(), {
      timeout: 4000,
    })
    expect(vi.mocked(api.saveDraft).mock.calls[0][4]).toEqual({
      slug: "mentions-legales",
    })
  })

  it("« Adresse de la page » dans « Prêt à publier ? » allume la carte et met le curseur dans le champ", async () => {
    Element.prototype.scrollIntoView = vi.fn()
    renderApp(`/pages/${PAGE_ID}`)
    await editable()
    fireEvent.click(
      screen.getByRole("button", { name: ready.todo(ready.items.address) })
    )
    await waitFor(() => expect(addressField()).toHaveFocus())
    expect(addressCard()).toHaveAttribute("data-highlight")
  })

  it("en Lecture : le titre, puis les blocs, sans image ni ligne sous le titre", async () => {
    renderApp(`/pages/${PAGE_ID}`)
    await editable()
    const preview = texts.editor.preview
    fireEvent.click(
      within(screen.getByRole("toolbar", { name: preview.tools })).getByRole(
        "button",
        { name: preview.mode.read }
      )
    )
    const phone = screen.getByRole("region", { name: preview.screen.ios })
    expect(
      within(phone).getByRole("heading", { level: 1, name: "Mentions légales" })
    ).toBeVisible()
    expect(within(phone).getByText("Bonjour")).toBeVisible()
    expect(phone.querySelector(".blocks-cover")).toBeNull()
    expect(phone.querySelector(".blocks-meta")).toBeNull()
  })
})

describe("éditeur : images", () => {
  const IMAGE_A = "00000000-0000-4000-8000-0000000000a1"
  const IMAGE_B = "00000000-0000-4000-8000-0000000000b1"
  const MEDIA_A = "00000000-0000-4000-8000-0000000000a2"
  const MEDIA_B = "00000000-0000-4000-8000-0000000000b2"

  it("une lecture des fichiers qui échoue n'est pas un fichier supprimé : on peut réessayer", async () => {
    vi.mocked(api.getContent).mockResolvedValue(
      withDraft({ blocks: [imageBlock(IMAGE_A, MEDIA_A)] })
    )
    vi.mocked(api.getMediaByIds)
      .mockRejectedValueOnce(new api.ContentError(null, { retryable: true }))
      .mockResolvedValue([media(MEDIA_A)])
    renderApp(`/pages/${PAGE_ID}`)

    expect(
      await screen.findByText(texts.editor.image.loadFailed)
    ).toBeInTheDocument()
    expect(screen.queryByText(texts.editor.image.missing)).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: texts.common.retry }))
    expect(
      await screen.findByText(texts.editor.image.notReady)
    ).toBeInTheDocument()
    expect(api.getMediaByIds).toHaveBeenCalledTimes(2)
  })

  it("une image ajoutée ailleurs s'affiche « en chargement », pas « supprimée », le temps de la lire", async () => {
    claireWrites()
    vi.mocked(api.getContent)
      .mockResolvedValueOnce(
        withDraft({ blocks: [imageBlock(IMAGE_A, MEDIA_A)] })
      )
      .mockResolvedValue(
        withDraft(
          {
            blocks: [
              imageBlock(IMAGE_A, MEDIA_A),
              imageBlock(IMAGE_B, MEDIA_B),
            ],
          },
          5
        )
      )
    let answer: (value: Media[]) => void = () => {}
    vi.mocked(api.getMediaByIds)
      .mockResolvedValueOnce([media(MEDIA_A)])
      .mockImplementation(() => new Promise((resolve) => (answer = resolve)))
    renderApp(`/pages/${PAGE_ID}`)
    await screen.findByText(texts.editor.image.notReady)

    act(() => emitLock(lockChange(CLAIRE, 5)))
    const second = await waitFor(() => {
      const element = document.querySelector(`[data-block-id="${IMAGE_B}"]`)
      expect(element).not.toBeNull()
      return element as HTMLElement
    })
    expect(second).toHaveTextContent(texts.common.loading)
    expect(second).not.toHaveTextContent(texts.editor.image.missing)

    await act(async () => answer([media(MEDIA_A), media(MEDIA_B)]))
    await waitFor(() =>
      expect(
        document.querySelector(`[data-block-id="${IMAGE_B}"]`)
      ).toHaveTextContent(texts.editor.image.notReady)
    )
  })
})

describe("éditeur : clavier", () => {
  const ONE = "00000000-0000-4000-8000-0000000000d1"
  const TWO = "00000000-0000-4000-8000-0000000000d2"

  it("« Monter » garde le focus et annonce la place ; « Supprimer » donne le focus au voisin, puis à « Ajouter un bloc »", async () => {
    vi.mocked(api.saveDraft).mockResolvedValue({
      rev: 5,
      savedAt: "2026-09-27T12:31:00Z",
    })
    vi.mocked(api.getContent).mockResolvedValue(
      withDraft({ blocks: [textBlock(ONE, "Un"), textBlock(TWO, "Deux")] })
    )
    renderApp(`/pages/${PAGE_ID}`)
    const labels = texts.editor.settings
    const title = await screen.findByLabelText(texts.editor.title.label)
    await waitFor(() => expect(title).not.toHaveAttribute("readonly"))

    // Le second bloc est choisi dans le plan : ses réglages glissent par-dessus la colonne de
    // droite, avec la barre d'actions en bas.
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.editor.outline.select("Texte « Deux »"),
      })
    )
    const bar = await screen.findByRole("toolbar", { name: labels.actions })
    const moveUp = within(bar).getByRole("button", { name: labels.moveUp })
    act(() => moveUp.focus())
    fireEvent.click(moveUp)

    // Arrivé en haut : « Monter » est désactivé, mais garde le focus.
    await waitFor(() => expect(moveUp).toHaveAttribute("aria-disabled", "true"))
    expect(moveUp).not.toHaveAttribute("disabled")
    expect(moveUp).toHaveFocus()
    expect(
      screen.getByText(labels.moved(1, 2, texts.editor.dnd.page))
    ).toBeInTheDocument()

    // Supprimer : le focus va à la ligne du bloc suivant, dans le plan.
    fireEvent.click(within(bar).getByRole("button", { name: labels.remove }))
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector(`[data-outline-id="${ONE}"]`)
      )
    )

    // Plus aucun bloc : le focus va à « Ajouter un bloc », en bas de la colonne de gauche.
    fireEvent.click(
      screen.getByRole("button", {
        name: texts.editor.outline.select("Texte « Un »"),
      })
    )
    fireEvent.click(
      within(
        await screen.findByRole("toolbar", { name: labels.actions })
      ).getByRole("button", { name: labels.remove })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.getElementById("colonne-gauche-ajouter")
      )
    )
  })
})

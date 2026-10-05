import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { Draft } from "@/blocks/types"
import * as api from "@/lib/contents/api"
import * as publicationApi from "@/lib/contents/publication"
import * as templatesApi from "@/lib/contents/templates"
import * as mediaApi from "@/lib/media/api"
import { createFromDialog } from "@/test/new-content"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"

// La section Modèles (étape 6) et « Nouvelle page » avec les points de départ ([D42]). La base
// est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    findPageBySlug: vi.fn(async () => null),
    listContents: vi.fn(async () => []),
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
  return {
    ...actual,
    listTemplates: vi.fn(),
    listTemplateUses: vi.fn(async () => []),
    getTemplatesByIds: vi.fn(async () => []),
    listStarters: vi.fn(async () => []),
    getTemplateOutdated: vi.fn(async () => []),
    createTemplate: vi.fn(),
    detachTemplateEverywhere: vi.fn(),
  }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof mediaApi>()
  return { ...actual, kickFiles: vi.fn(async () => {}) }
})

const CONTACT = "00000000-0000-4000-8000-0000000000c1"
const RETENIR = "00000000-0000-4000-8000-0000000000c2"
const INTERVIEW = "00000000-0000-4000-8000-0000000000c3"
const PAGE_ID = "00000000-0000-4000-8000-0000000000aa"

function draftOf(title: string): Draft {
  return { v: 1, title, blocks: [] }
}

function item(
  id: string,
  title: string,
  sort: templatesApi.TemplateSort,
  changes: Partial<templatesApi.TemplateItem> = {}
): templatesApi.TemplateItem {
  return {
    id,
    title,
    sort,
    templateFor: sort === "starter" ? "page" : null,
    draft: draftOf(title),
    draft_saved_at: "2026-09-27T12:30:00Z",
    ...changes,
  }
}

function use(
  id: string,
  title: string,
  templateIds: string[],
  inTrash = false
): templatesApi.TemplateUse {
  return { id, kind: "page", title, inTrash, templateIds }
}

const created: api.Content = {
  id: CONTACT,
  kind: "template",
  title: "Contact",
  draft: { ...draftOf("Contact"), cover: null, audio: null },
  draft_rev: 1,
  draft_saved_at: "2026-09-27T12:30:00Z",
  deleted_at: null,
  parent_id: null,
  access_chosen: false,
  access_level_id: null,
  slug: null,
  template_sort: "shared",
  template_for: null,
  in_app: false,
  is_free: false,
  category_ids: [],
}

beforeEach(() => {
  vi.mocked(templatesApi.listTemplates).mockResolvedValue([
    item(RETENIR, "À retenir", "style"),
    item(CONTACT, "Contact", "shared"),
    item(INTERVIEW, "Interview", "starter"),
  ])
  vi.mocked(templatesApi.listTemplateUses).mockImplementation(async (ids) =>
    ids
      ? []
      : [
          use(PAGE_ID, "Accueil", [CONTACT]),
          use("p2", "Ancienne", [CONTACT], true),
        ]
  )
})

afterEach(() => {
  vi.clearAllMocks()
})

const labels = texts.templates.list

describe("section Modèles", () => {
  it("montre tous les modèles avec leur type, puis un onglet par sorte", async () => {
    const sorts = texts.templates.sorts
    renderApp("/modeles")

    // « Tous les blocs » : chaque modèle, avec sa sorte, et la date seule.
    expect(
      await screen.findByRole("tab", { name: labels.tabs.all, selected: true })
    ).toBeInTheDocument()
    const row = screen.getByRole("link", { name: "Contact" }).closest("tr")!
    expect(row).toHaveTextContent(sorts.shared.title)
    expect(row).toHaveTextContent("27 sept. 2026 à 14h30")
    expect(row).not.toHaveTextContent("Anne Admin")
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      `/modeles/${CONTACT}`
    )
    expect(
      screen.getAllByRole("link", { name: /À retenir|Interview/ })
    ).toHaveLength(2)

    // Un onglet par sorte : ses modèles seulement, sans la colonne Type.
    fireEvent.click(screen.getByRole("tab", { name: sorts.starter.tab }))
    const panel = await screen.findByRole("tabpanel")
    expect(
      within(panel).getByText(sorts.starter.description, { exact: false })
    ).toBeVisible()
    expect(within(panel).getByRole("link", { name: "Interview" })).toBeVisible()
    expect(within(panel).queryByRole("link", { name: "Contact" })).toBeNull()
    expect(
      within(panel).queryByRole("columnheader", { name: labels.columns.type })
    ).toBeNull()
  })

  it("« Nouveau modèle » : nom et sorte, puis l'éditeur du modèle s'ouvre", async () => {
    vi.mocked(templatesApi.createTemplate).mockResolvedValue(created)
    const { router } = renderApp("/modeles")
    fireEvent.click(await screen.findByRole("button", { name: labels.create }))
    const dialog = await screen.findByRole("dialog", {
      name: texts.templates.create.title,
    })
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "  Contact  " },
      }
    )
    fireEvent.click(
      within(dialog).getByRole("radio", {
        name: new RegExp(texts.templates.sorts.shared.title),
      })
    )
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.templates.create.submit,
      })
    )
    await waitFor(() =>
      expect(templatesApi.createTemplate).toHaveBeenCalledWith({
        name: "Contact",
        sort: "shared",
        templateFor: null,
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/modeles/${CONTACT}`)
    )
  })

  it("un point de départ a une section (Pages par défaut)", async () => {
    vi.mocked(templatesApi.createTemplate).mockResolvedValue({
      ...created,
      template_sort: "starter",
      template_for: "page",
    })
    renderApp("/modeles")
    fireEvent.click(await screen.findByRole("button", { name: labels.create }))
    const dialog = await screen.findByRole("dialog", {
      name: texts.templates.create.title,
    })
    expect(
      within(dialog).queryByLabelText(texts.templates.create.section)
    ).toBeNull()
    fireEvent.change(
      within(dialog).getByLabelText(texts.templates.create.name),
      {
        target: { value: "Interview" },
      }
    )
    fireEvent.click(
      within(dialog).getByRole("radio", {
        name: new RegExp(texts.templates.sorts.starter.title),
      })
    )
    expect(
      await within(dialog).findByText(texts.templates.create.sectionHint)
    ).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.templates.create.submit,
      })
    )
    await waitFor(() =>
      expect(templatesApi.createTemplate).toHaveBeenCalledWith({
        name: "Interview",
        sort: "starter",
        templateFor: "page",
      })
    )
  })

  it("un bloc identique partout utilisé : ses brouillons, « Détacher partout », puis la corbeille", async () => {
    let detached = false
    vi.mocked(templatesApi.listTemplateUses).mockImplementation(async (ids) =>
      ids && !detached
        ? [
            use(PAGE_ID, "Accueil", [CONTACT]),
            use("p2", "Ancienne", [CONTACT], true),
          ]
        : []
    )
    vi.mocked(templatesApi.detachTemplateEverywhere).mockImplementation(
      async () => {
        detached = true
        return 2
      }
    )
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "00000000-0000-4000-8000-0000000000b1",
      trashed: 1,
      needsFileSync: false,
    })
    renderApp("/modeles")
    fireEvent.click(
      await screen.findByRole("button", { name: labels.actions("Contact") })
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: labels.trash }))

    const dialog = await screen.findByRole("alertdialog", {
      name: labels.used.title,
    })
    expect(
      within(dialog).getByRole("link", { name: "Accueil" })
    ).toHaveAttribute("href", `/pages/${PAGE_ID}`)
    // Dans la corbeille : pas de lien, mais nommé.
    expect(within(dialog).getByText(/Ancienne/)).toHaveTextContent(
      labels.used.inTrash
    )
    expect(
      within(dialog).queryByRole("button", {
        name: labels.confirmTrash.confirm,
      })
    ).toBeNull()
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.used.detachAll })
    )
    await waitFor(() =>
      expect(templatesApi.detachTemplateEverywhere).toHaveBeenCalledWith(
        CONTACT
      )
    )
    expect(await screen.findByText(labels.used.detached(2))).toBeInTheDocument()

    const confirm = await screen.findByRole("alertdialog", {
      name: labels.confirmTrash.title,
    })
    fireEvent.click(
      within(confirm).getByRole("button", { name: labels.confirmTrash.confirm })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(CONTACT)
    )
    expect(await screen.findByText(labels.trashed("Contact"))).toBeVisible()
  })

  it("une mise en forme se supprime après une simple confirmation, avec « Annuler »", async () => {
    vi.mocked(publicationApi.trashContent).mockResolvedValue({
      batch: "00000000-0000-4000-8000-0000000000b1",
      trashed: 1,
      needsFileSync: false,
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    renderApp("/modeles")
    fireEvent.click(
      await screen.findByRole("button", { name: labels.actions("À retenir") })
    )
    fireEvent.click(await screen.findByRole("menuitem", { name: labels.trash }))
    const dialog = await screen.findByRole("alertdialog", {
      name: labels.confirmTrash.title,
    })
    expect(dialog).toHaveTextContent(
      labels.confirmTrash.description("À retenir")
    )
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.confirmTrash.confirm })
    )
    await waitFor(() =>
      expect(publicationApi.trashContent).toHaveBeenCalledWith(RETENIR)
    )
    // Seul un bloc identique partout a besoin de la liste de ses brouillons.
    expect(templatesApi.listTemplateUses).not.toHaveBeenCalledWith([RETENIR])
    const toast = await screen.findByText(labels.trashed("À retenir"))
    fireEvent.click(
      within(toast.closest("li")!).getByRole("button", { name: labels.undo })
    )
    await waitFor(() =>
      expect(publicationApi.restoreContent).toHaveBeenCalledWith(RETENIR)
    )
  })

  it("« Tout sélectionner » met les modèles à la corbeille, et garde un bloc identique partout utilisé", async () => {
    const used = "Ce modèle est utilisé dans : Accueil."
    vi.mocked(publicationApi.trashContent).mockImplementation(async (id) => {
      if (id === CONTACT) {
        throw new api.ContentError("modele_utilise", { detail: used })
      }
      return { batch: "lot", trashed: 1, needsFileSync: false }
    })
    vi.mocked(publicationApi.restoreContent).mockResolvedValue({
      restored: 1,
      addressRemoved: false,
    })
    renderApp("/modeles")

    fireEvent.click(
      await screen.findByRole("checkbox", { name: texts.selection.selectAll })
    )
    expect(
      screen.getByRole("button", { name: texts.selection.trash(3) })
    ).toBeVisible()
    fireEvent.click(
      screen.getByRole("button", { name: texts.selection.trash(3) })
    )
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(labels.confirmTrashManyTitle(3))
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.confirmTrash.confirm })
    )

    expect(await screen.findByText(labels.trashedMany(2))).toBeVisible()
    expect(screen.getByText(labels.keptTitle(1))).toBeVisible()
    expect(
      screen.getByText(texts.selection.keptItem("Contact", used))
    ).toBeVisible()
    expect(
      screen.getByRole("checkbox", { name: texts.selection.select("Contact") })
    ).toBeChecked()

    fireEvent.click(
      within(screen.getByText(labels.trashedMany(2)).closest("li")!).getByRole(
        "button",
        { name: labels.undo }
      )
    )
    expect(await screen.findByText(labels.restoredMany(2))).toBeVisible()
  })
})

describe("« Nouvelle page » et les points de départ ([D42])", () => {
  it("la fenêtre propose « Page vide » ou un point de départ des Pages", async () => {
    vi.mocked(templatesApi.listStarters).mockResolvedValue([
      { id: INTERVIEW, title: "Interview" },
    ])
    vi.mocked(api.createContent).mockResolvedValue({
      ...created,
      id: PAGE_ID,
      kind: "page",
      template_sort: null,
    })
    const { router } = renderApp("/pages")
    // Les points de départ lus, la fenêtre de « Nouvelle page » propose « Page vide » ou l'un
    // d'eux.
    await waitFor(() =>
      expect(templatesApi.listStarters).toHaveBeenCalledWith("page")
    )
    await createFromDialog("page", "Rencontre", "Interview")
    await waitFor(() =>
      expect(api.createContent).toHaveBeenCalledWith(
        "page",
        "Rencontre",
        INTERVIEW
      )
    )
    expect(templatesApi.listStarters).toHaveBeenCalledWith("page")
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/pages/${PAGE_ID}`)
    )
  })
})

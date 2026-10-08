import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as contentsApi from "@/lib/contents/api"
import * as api from "@/lib/media/api"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

// « Ouvrir » un contenu restauré : son éditeur le lit.
vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof contentsApi>()
  return { ...actual, getContent: vi.fn(async () => null) }
})

vi.mock("@/lib/media/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return {
    ...actual,
    listTrash: vi.fn(),
    restoreTrashItem: vi.fn(),
    emptyTrash: vi.fn(),
    kickFiles: vi.fn(),
  }
})

const photo: api.TrashItem = {
  item_type: "file",
  id: "00000000-0000-4000-8000-00000000000a",
  kind: "image",
  title: "photo.jpg",
  trash_batch: null,
  batch_root: true,
  deleted_at: "2026-09-27T12:30:00Z",
  deleted_by_name: "Anne Admin",
  purge_at: "2026-10-27T13:30:00Z",
  purge_error: null,
}

const photoName = "photo.jpg"
const usedName = "logo.svg"

const stillUsed: api.TrashItem = {
  ...photo,
  id: "00000000-0000-4000-8000-00000000000b",
  kind: "svg",
  title: "logo.svg",
  purge_error: "fichier_utilise",
}

beforeEach(() => {
  vi.mocked(api.listTrash).mockResolvedValue([photo, stillUsed])
  vi.mocked(api.kickFiles).mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

describe("Corbeille", () => {
  it("liste ce qui a été supprimé, avec la date d'effacement automatique", async () => {
    await renderApp("/trash", fakeAuth({ role: "editor" }))

    const row = (await screen.findByText(photoName)).closest("tr")!
    expect(within(row).getByText("Fichier · Image")).toBeVisible()
    expect(within(row).getByText("27 sept. 2026 à 14h30")).toBeVisible()
    expect(
      within(row).getByText(texts.trash.deletedBy("Anne Admin"))
    ).toBeVisible()
    expect(
      within(row).getByText(texts.trash.purgeOn("27 oct. 2026"))
    ).toBeVisible()
  })

  it("signale un effacement refusé parce que le fichier est encore utilisé", async () => {
    await renderApp("/trash")

    const row = (await screen.findByText(usedName)).closest("tr")!
    expect(within(row).getByText(texts.trash.purgeRefused)).toBeVisible()
  })

  it("filtre par type", async () => {
    await renderApp("/trash")
    await screen.findByText(photoName)

    fireEvent.click(
      screen.getByRole("button", { name: texts.trash.filters.file })
    )
    expect(screen.getByText(photoName)).toBeVisible()
  })

  it("le filtre est dans l'adresse (QCM du 05/10/2026)", async () => {
    const { router } = await renderApp("/trash?type=file")
    await screen.findByText(photoName)
    expect(
      screen.getByRole("button", { name: texts.trash.filters.file })
    ).toHaveAttribute("aria-pressed", "true")
    fireEvent.click(
      screen.getByRole("button", { name: texts.trash.filters.all })
    )
    await waitFor(() => expect(router.state.location.search).toBe(""))
  })

  it("restaure un fichier", async () => {
    vi.mocked(api.restoreTrashItem).mockResolvedValue({
      addressRemoved: false,
    })
    await renderApp("/trash")

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.restoreItem(photoName),
      })
    )

    expect(
      await screen.findByText(texts.trash.restored(photoName))
    ).toBeVisible()
    expect(vi.mocked(api.restoreTrashItem).mock.calls[0][0]).toEqual(photo)
  })

  it("vide la corbeille après confirmation, puis appelle la fonction « files »", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(2)
    await renderApp("/trash", fakeAuth({ role: "editor" }))
    await screen.findByText(photoName)

    fireEvent.click(screen.getByRole("button", { name: texts.trash.empty }))
    const dialog = await screen.findByRole("alertdialog")
    expect(
      within(dialog).getByText(texts.trash.confirmEmpty.description(2))
    ).toBeVisible()
    expect(api.emptyTrash).not.toHaveBeenCalled()
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.trash.confirmEmpty.confirm,
      })
    )

    expect(await screen.findByText(texts.trash.emptied(2))).toBeVisible()
    // La liste affichée, jamais « tout ce qu'il y a » côté serveur.
    expect(api.emptyTrash).toHaveBeenCalledWith([
      { type: "file", id: photo.id },
      { type: "file", id: stillUsed.id },
    ])
    await waitFor(() => expect(api.kickFiles).toHaveBeenCalled())
  })

  it("n'attend pas la fonction « files » pour fermer la fenêtre", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(2)
    // La fonction « files » ne répond pas (démarrage à froid, vérifications en cours…).
    vi.mocked(api.kickFiles).mockReturnValue(new Promise(() => {}))
    await renderApp("/trash")
    await screen.findByText(photoName)

    fireEvent.click(screen.getByRole("button", { name: texts.trash.empty }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.trash.confirmEmpty.confirm,
      })
    )

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    )
    expect(api.kickFiles).toHaveBeenCalled()
    expect(
      screen.getByRole("button", {
        name: texts.trash.restoreItem(photoName),
      })
    ).toBeEnabled()
  })

  it("efface un seul élément après confirmation", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(1)
    await renderApp("/trash")

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.eraseItem(photoName),
      })
    )
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.trash.confirmErase.confirm,
      })
    )

    await waitFor(() =>
      expect(api.emptyTrash).toHaveBeenCalledWith([
        { type: "file", id: photo.id },
      ])
    )
  })

  it("dit quand la corbeille est vide", async () => {
    vi.mocked(api.listTrash).mockResolvedValue([])
    await renderApp("/trash")

    expect(await screen.findByText(texts.trash.emptyState.title)).toBeVisible()
    expect(
      screen.getByRole("button", { name: texts.trash.empty })
    ).toBeDisabled()
  })
})

describe("Corbeille : contenus", () => {
  const page: api.TrashItem = {
    ...photo,
    item_type: "content",
    id: "00000000-0000-4000-8000-00000000000c",
    kind: "page",
    title: "Mentions légales",
    trash_batch: "00000000-0000-4000-8000-0000000000b1",
  }
  const article: api.TrashItem = {
    ...page,
    id: "00000000-0000-4000-8000-00000000000d",
    kind: "article",
    title: "Bien respirer",
    trash_batch: "00000000-0000-4000-8000-0000000000b2",
  }
  // Parti avec l'article (même lot) : restauré ou effacé avec lui.
  const withArticle: api.TrashItem = {
    ...article,
    id: "00000000-0000-4000-8000-00000000000e",
    title: "Suite",
    batch_root: false,
  }

  beforeEach(() => {
    vi.mocked(api.listTrash).mockResolvedValue([
      page,
      photo,
      article,
      withArticle,
    ])
  })

  it("filtre par type, avec les seuls types présents ; un lot reste sous sa tête", async () => {
    await renderApp("/trash")
    await screen.findByText(page.title!)
    const filters = screen.getByRole("group", {
      name: texts.trash.filters.label,
    })
    expect(
      within(filters)
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(["Tout", "Blog", "Pages", "Médiathèque"])
    // Ce qui est parti avec l'article n'a pas sa propre ligne.
    expect(screen.getAllByRole("row")).toHaveLength(4)
    expect(screen.getByText(texts.trash.batch(1))).toBeVisible()

    fireEvent.click(
      within(filters).getByRole("button", { name: texts.trash.filters.article })
    )
    expect(screen.getByText(article.title!)).toBeVisible()
    expect(screen.queryByText(page.title!)).toBeNull()
    expect(screen.queryByText(photoName)).toBeNull()
  })

  it("restaure un article, et « Ouvrir » dans le message mène à son éditeur", async () => {
    vi.mocked(api.restoreTrashItem).mockResolvedValue({ addressRemoved: false })
    const { router } = await renderApp("/trash")
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.restoreItem(article.title!),
      })
    )
    expect(
      await screen.findByText(texts.trash.restored(article.title!))
    ).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: texts.trash.open }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/blog/${article.id}`)
    )
  })

  it("restaure une page en brouillon, et prévient quand son adresse a été reprise", async () => {
    vi.mocked(api.restoreTrashItem).mockResolvedValue({ addressRemoved: true })
    await renderApp("/trash")
    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.restoreItem(page.title!),
      })
    )
    expect(
      await screen.findByText(texts.trash.restoredWithoutAddress(page.title!))
    ).toBeVisible()
    expect(vi.mocked(api.restoreTrashItem).mock.calls[0][0]).toEqual(page)
  })

  it("efface la sélection, et seulement elle (têtes de lot)", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(3)
    await renderApp("/trash")
    await screen.findByText(page.title!)
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: texts.selection.select(page.title!),
      })
    )
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: texts.selection.select(article.title!),
      })
    )
    const erase = screen.getByRole("button", {
      name: texts.trash.eraseSelection(2),
    })
    // Le bouton « destructif » de Nova (fond rouge pâle), pas un contour au texte rouge (ADMIN § 7).
    expect(erase).toHaveClass("bg-destructive/10")
    fireEvent.click(erase)
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(
      texts.trash.confirmSelection.description(2)
    )
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.trash.confirmSelection.confirm,
      })
    )
    await waitFor(() =>
      expect(api.emptyTrash).toHaveBeenCalledWith([
        { type: "content", id: page.id },
        { type: "content", id: article.id },
      ])
    )
  })

  it("« Vider » envoie la liste explicite de tout ce qui est affiché", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(4)
    await renderApp("/trash")
    await screen.findByText(page.title!)
    fireEvent.click(screen.getByRole("button", { name: texts.trash.empty }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: texts.trash.confirmEmpty.confirm,
      })
    )
    await waitFor(() =>
      expect(api.emptyTrash).toHaveBeenCalledWith([
        { type: "content", id: page.id },
        { type: "file", id: photo.id },
        { type: "content", id: article.id },
      ])
    )
  })
})

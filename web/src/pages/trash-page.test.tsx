import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as api from "@/lib/media/api"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

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
  parent_title: null,
  deleted_at: "2026-09-27T12:30:00Z",
  deleted_by_name: "Anne Admin",
  purge_at: "2026-10-27T13:30:00Z",
  purge_error: null,
}

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
    renderApp("/corbeille", fakeAuth({ role: "editor" }))

    const row = (await screen.findByText(photo.title)).closest("tr")!
    expect(within(row).getByText("Fichier · Image")).toBeVisible()
    expect(within(row).getByText("27 sept. 2026 à 14:30")).toBeVisible()
    expect(
      within(row).getByText(texts.trash.deletedBy("Anne Admin"))
    ).toBeVisible()
    expect(
      within(row).getByText(texts.trash.purgeOn("27 oct. 2026 à 14:30"))
    ).toBeVisible()
  })

  it("signale un effacement refusé parce que le fichier est encore utilisé", async () => {
    renderApp("/corbeille")

    const row = (await screen.findByText(stillUsed.title)).closest("tr")!
    expect(within(row).getByText(texts.trash.purgeRefused)).toBeVisible()
  })

  it("filtre par type", async () => {
    renderApp("/corbeille")
    await screen.findByText(photo.title)

    fireEvent.click(
      screen.getByRole("button", { name: texts.trash.filters.file })
    )
    expect(screen.getByText(photo.title)).toBeVisible()
  })

  it("restaure un fichier", async () => {
    vi.mocked(api.restoreTrashItem).mockResolvedValue()
    renderApp("/corbeille")

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.restoreItem(photo.title),
      })
    )

    expect(
      await screen.findByText(texts.trash.restored(photo.title))
    ).toBeVisible()
    expect(vi.mocked(api.restoreTrashItem).mock.calls[0][0]).toEqual(photo)
  })

  it("vide la corbeille après confirmation, puis appelle la fonction « files »", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(2)
    renderApp("/corbeille", fakeAuth({ role: "editor" }))
    await screen.findByText(photo.title)

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
    renderApp("/corbeille")
    await screen.findByText(photo.title)

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
        name: texts.trash.restoreItem(photo.title),
      })
    ).toBeEnabled()
  })

  it("efface un seul élément après confirmation", async () => {
    vi.mocked(api.emptyTrash).mockResolvedValue(1)
    renderApp("/corbeille")

    fireEvent.click(
      await screen.findByRole("button", {
        name: texts.trash.eraseItem(photo.title),
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
    renderApp("/corbeille")

    expect(await screen.findByText(texts.trash.emptyState.title)).toBeVisible()
    expect(
      screen.getByRole("button", { name: texts.trash.empty })
    ).toBeDisabled()
  })
})

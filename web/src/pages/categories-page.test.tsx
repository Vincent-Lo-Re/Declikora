import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as categoriesApi from "@/lib/categories"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"

// Écran des catégories du Blog et des Podcasts (étape 7) : ajouter, renommer, supprimer
// (définitif, [D28]). Le rangement au clavier et à la souris est vérifié par Playwright
// (web/e2e/sections.spec.ts). La base est simulée.

vi.mock("@/lib/categories", async (importOriginal) => {
  const actual = await importOriginal<typeof categoriesApi>()
  return {
    ...actual,
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    reorderCategories: vi.fn(),
  }
})

const labels = texts.categories

/** Ouvre le menu « … » d'une ligne et choisit une action (Renommer, Supprimer). */
async function chooseAction(name: string, action: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: labels.actions(name) })
  )
  fireEvent.click(await screen.findByRole("menuitem", { name: action }))
}
const sommeil = { id: "c1", name: "Sommeil", position: 0, uses: 3 }
const stress = { id: "c2", name: "Stress", position: 1, uses: 0 }

beforeEach(() => {
  vi.mocked(categoriesApi.listCategories).mockResolvedValue([sommeil, stress])
})

afterEach(() => vi.clearAllMocks())

describe("Catégories du Blog", () => {
  it("les liste dans l'ordre de l'app, avec le nombre de brouillons qui les citent", async () => {
    renderApp("/blog/categories")
    const list = await screen.findByRole("list", {
      name: labels.listLabel(texts.sections.blog.title),
    })
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-item"))
    ).toEqual(["Sommeil", "Stress"])
    expect(
      within(list).getByRole("img", { name: labels.uses(3) })
    ).toBeVisible()
    expect(
      within(list).getByRole("img", { name: labels.uses(0) })
    ).toBeVisible()
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: labels.title(texts.sections.blog.title),
      })
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: labels.back(texts.sections.blog.title) })
    ).toHaveAttribute("href", "/blog")
    // Une poignée par catégorie, pour les ranger à la souris ou au clavier.
    expect(
      screen.getByRole("button", { name: labels.handle("Stress") })
    ).toHaveAttribute("aria-roledescription", labels.dnd.roleDescription)
  })

  it("ajoute une catégorie, et refuse un nom en double", async () => {
    vi.mocked(categoriesApi.createCategory)
      .mockRejectedValueOnce(new categoriesApi.CategoryError("nom_en_double"))
      .mockResolvedValueOnce({
        id: "c3",
        name: "Nutrition",
        position: 2,
        uses: 0,
      })
    renderApp("/blog/categories")
    const input = await screen.findByLabelText(labels.name)

    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: labels.add }))
    expect(await screen.findByText(labels.nameRequired)).toBeVisible()
    expect(categoriesApi.createCategory).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "stress" } })
    fireEvent.click(screen.getByRole("button", { name: labels.add }))
    expect(await screen.findByText(labels.errors.nom_en_double)).toBeVisible()

    fireEvent.change(input, { target: { value: "  Nutrition " } })
    fireEvent.click(screen.getByRole("button", { name: labels.add }))
    await waitFor(() =>
      expect(categoriesApi.createCategory).toHaveBeenLastCalledWith(
        "blog",
        "Nutrition"
      )
    )
    expect(await screen.findByText(labels.added("Nutrition"))).toBeVisible()
  })

  it("renomme une catégorie sur place", async () => {
    vi.mocked(categoriesApi.renameCategory).mockResolvedValue({
      ...stress,
      name: "Anxiété",
    })
    renderApp("/blog/categories")
    await chooseAction("Stress", labels.rename)
    const field = screen.getByLabelText(labels.renameLabel("Stress"))
    fireEvent.change(field, { target: { value: "Anxiété" } })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))
    await waitFor(() =>
      expect(categoriesApi.renameCategory).toHaveBeenCalledWith("c2", "Anxiété")
    )
    expect(await screen.findByText(labels.renamed)).toBeVisible()
  })

  it("supprime après une confirmation qui dit que c'est définitif ([D28])", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue()
    renderApp("/blog/categories")
    await chooseAction("Sommeil", labels.remove)
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(
      labels.confirmRemove.description("Sommeil")
    )
    expect(dialog).toHaveTextContent(labels.confirmRemove.uses(3))
    expect(categoriesApi.deleteCategory).not.toHaveBeenCalled()
    const confirm = within(dialog).getByRole("button", {
      name: labels.confirmRemove.confirm,
    })
    // Le temps de relire le nombre de brouillons, la confirmation attend.
    await waitFor(() => expect(confirm).toBeEnabled())
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(categoriesApi.deleteCategory).toHaveBeenCalledWith("c1")
    )
    expect(await screen.findByText(labels.removed("Sommeil"))).toBeVisible()
  })

  it("relit le nombre de brouillons qui la perdent avant de confirmer ([D28])", async () => {
    // La liste a été lue avant qu'un article prenne la catégorie dans l'éditeur.
    let release: (value: (typeof sommeil)[]) => void = () => {}
    vi.mocked(categoriesApi.listCategories)
      .mockResolvedValueOnce([{ ...sommeil, uses: 0 }, stress])
      .mockImplementationOnce(
        () => new Promise((resolve) => (release = resolve))
      )
    renderApp("/blog/categories")
    await chooseAction("Sommeil", labels.remove)
    const dialog = await screen.findByRole("alertdialog")
    const confirm = within(dialog).getByRole("button", {
      name: labels.confirmRemove.confirm,
    })
    expect(confirm).toBeDisabled()
    release([{ ...sommeil, uses: 1 }, stress])
    await waitFor(() =>
      expect(dialog).toHaveTextContent(labels.confirmRemove.uses(1))
    )
    expect(confirm).toBeEnabled()
    expect(categoriesApi.listCategories).toHaveBeenCalledTimes(2)
  })
})

describe("Catégories des Podcasts", () => {
  it("lit les catégories de la section Podcasts", async () => {
    vi.mocked(categoriesApi.listCategories).mockResolvedValue([])
    renderApp("/podcasts/categories")
    expect(await screen.findByText(labels.empty)).toBeVisible()
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("podcasts")
    expect(screen.getByText(labels.description.podcasts)).toBeVisible()
  })
})

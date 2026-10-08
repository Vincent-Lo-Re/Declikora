import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as templatesApi from "@/lib/contents/templates"
import { renderApp } from "@/test/render"
import { texts } from "@/texts"

// L'onglet « Catégories » du Blog et des Podcasts : liste comme celle des contenus, fenêtre pour
// créer ou modifier, suppression définitive ([D28]), une à une ou cochées. Le rangement au clavier
// et à la souris est vérifié par Playwright (web/e2e/sections.spec.ts). La base est simulée.

vi.mock("@/lib/contents/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>()
  return { ...actual, listContents: vi.fn(async () => []) }
})

vi.mock("@/lib/contents/templates", async (importOriginal) => {
  const actual = await importOriginal<typeof templatesApi>()
  return { ...actual, listStarters: vi.fn(async () => []) }
})

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
const created_at = "2026-09-27T12:30:00Z"
const sommeil = { id: "c1", name: "Sommeil", position: 0, created_at, uses: 3 }
const stress = { id: "c2", name: "Stress", position: 1, created_at, uses: 0 }

/** Ouvre le menu « … » d'une ligne et choisit une action. */
async function chooseAction(name: string, action: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: labels.actions(name) })
  )
  fireEvent.click(await screen.findByRole("menuitem", { name: action }))
}

beforeEach(() => {
  vi.mocked(categoriesApi.listCategories).mockResolvedValue([sommeil, stress])
})

afterEach(() => vi.clearAllMocks())

describe("Blog : l'onglet Catégories", () => {
  it("un onglet de la page Blog, dans l'adresse, avec ses colonnes et le bouton « Nouvelle catégorie »", async () => {
    const { router } = await renderApp("/blog")
    fireEvent.click(await screen.findByRole("tab", { name: labels.tab }))

    const table = await screen.findByRole("table")
    expect(router.state.location.search).toBe("?tab=categories")
    expect(categoriesApi.listCategories).toHaveBeenCalledWith("blog")
    const rows = within(table).getAllByRole("row").slice(1)
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[2].textContent)
    ).toEqual(["Sommeil", "Stress"])
    // « Utilisée dans » : un lien et le nombre, ou un lien coupé.
    expect(
      within(rows[0]).getByRole("img", { name: labels.usesCount(3) })
    ).toHaveTextContent("3")
    expect(
      within(rows[1]).getByRole("img", { name: labels.usesCount(0) })
    ).toBeVisible()
    expect(within(rows[0]).getByText("27 sept. 2026 à 14h30")).toBeVisible()
    expect(screen.getByRole("button", { name: labels.create })).toBeVisible()
    expect(
      screen.queryByRole("button", {
        name: texts.contentList.kinds.article.create,
      })
    ).toBeNull()
    expect(screen.getByText(labels.description.blog)).toBeVisible()
  })

  it("« Nouvelle catégorie » : la fenêtre se ferme à l'enregistrement, la catégorie arrive dans la liste", async () => {
    const respiration = {
      ...stress,
      id: "c3",
      name: "Respiration",
      position: 2,
    }
    vi.mocked(categoriesApi.createCategory).mockImplementation(async () => {
      vi.mocked(categoriesApi.listCategories).mockResolvedValue([
        sommeil,
        stress,
        respiration,
      ])
      return respiration
    })
    await renderApp("/blog?tab=categories")

    fireEvent.click(await screen.findByRole("button", { name: labels.create }))
    const dialog = await screen.findByRole("dialog", {
      name: labels.dialog.createTitle,
    })
    // Un nom vide est refusé sans rien envoyer.
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.dialog.save })
    )
    expect(await within(dialog).findByText(labels.nameRequired)).toBeVisible()
    expect(categoriesApi.createCategory).not.toHaveBeenCalled()

    fireEvent.change(within(dialog).getByLabelText(labels.name), {
      target: { value: "Respiration" },
    })
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.dialog.save })
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(categoriesApi.createCategory).toHaveBeenCalledWith(
      "blog",
      "Respiration"
    )
    expect(await screen.findByText(labels.added("Respiration"))).toBeVisible()
    expect(
      await screen.findByRole("button", { name: "Respiration" })
    ).toBeVisible()
  })

  it("« Modifier » ouvre la même fenêtre, avec le nom", async () => {
    vi.mocked(categoriesApi.renameCategory).mockResolvedValue({
      ...sommeil,
      name: "Bien dormir",
    })
    await renderApp("/blog?tab=categories")

    await chooseAction("Sommeil", labels.edit)
    const dialog = await screen.findByRole("dialog", {
      name: labels.dialog.editTitle,
    })
    const name = within(dialog).getByLabelText(labels.name)
    expect(name).toHaveValue("Sommeil")
    fireEvent.change(name, { target: { value: "Bien dormir" } })
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.dialog.save })
    )

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(categoriesApi.renameCategory).toHaveBeenCalledWith(
      "c1",
      "Bien dormir"
    )
    expect(await screen.findByText(labels.renamed)).toBeVisible()
  })

  it("supprime définitivement une catégorie, après une confirmation qui dit combien de brouillons la perdent", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue()
    await renderApp("/blog?tab=categories")

    await chooseAction("Sommeil", labels.remove)
    const confirm = await screen.findByRole("alertdialog", {
      name: labels.confirmRemove.title,
    })
    expect(confirm).toHaveTextContent(labels.confirmRemove.uses(3))
    fireEvent.click(
      within(confirm).getByRole("button", {
        name: labels.confirmRemove.confirm,
      })
    )

    await waitFor(() =>
      expect(categoriesApi.deleteCategory).toHaveBeenCalledWith("c1")
    )
    expect(await screen.findByText(labels.removed("Sommeil"))).toBeVisible()
  })

  it("cochées : « Supprimer définitivement (n) », une à une", async () => {
    vi.mocked(categoriesApi.deleteCategory).mockResolvedValue()
    await renderApp("/blog?tab=categories")

    fireEvent.click(
      await screen.findByRole("checkbox", {
        name: texts.selection.select("Sommeil"),
      })
    )
    fireEvent.click(
      screen.getByRole("checkbox", { name: texts.selection.select("Stress") })
    )
    fireEvent.click(screen.getByRole("button", { name: labels.removeMany(2) }))
    const confirm = await screen.findByRole("alertdialog", {
      name: labels.confirmRemoveMany.title(2),
    })
    fireEvent.click(
      within(confirm).getByRole("button", {
        name: labels.confirmRemove.confirm,
      })
    )

    await waitFor(() =>
      expect(categoriesApi.deleteCategory).toHaveBeenCalledTimes(2)
    )
    expect(await screen.findByText(labels.removedMany(2))).toBeVisible()
  })

  it("le filtre par état : utilisées ou non", async () => {
    await renderApp("/blog?tab=categories")

    fireEvent.click(
      await screen.findByRole("combobox", { name: labels.filters.label })
    )
    const unused = await screen.findByRole("option", {
      name: labels.filters.unused,
    })
    fireEvent.pointerDown(unused, { pointerType: "mouse" })
    fireEvent.click(unused)

    expect(await screen.findByRole("button", { name: "Stress" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Sommeil" })).toBeNull()
    expect(screen.getByText(labels.count(1, 2))).toBeVisible()
  })

  it("une recherche filtre les catégories et interdit de ranger", async () => {
    await renderApp("/blog?tab=categories")

    fireEvent.change(
      await screen.findByRole("searchbox", { name: labels.search }),
      {
        target: { value: "som" },
      }
    )

    expect(await screen.findByText(labels.orderFiltering)).toBeVisible()
    expect(screen.getByRole("button", { name: "Sommeil" })).toBeVisible()
    expect(screen.queryByRole("button", { name: "Stress" })).toBeNull()
  })
})

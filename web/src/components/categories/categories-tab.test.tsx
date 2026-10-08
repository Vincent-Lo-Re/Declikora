import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as categoriesApi from "@/lib/categories"
import * as api from "@/lib/contents/api"
import * as settingsApi from "@/lib/contents/settings"
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

vi.mock("@/lib/contents/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof settingsApi>()
  return { ...actual, removeCategory: vi.fn() }
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
    getCategoryUses: vi.fn(),
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
    // « État » : un lien (le nombre dans l'infobulle), ou un lien coupé.
    expect(
      within(rows[0]).getByRole("button", {
        name: labels.uses.open("Sommeil"),
      })
    ).toBeVisible()
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

  it("« État » ouvre la liste des contenus qui utilisent la catégorie, avec son export", async () => {
    vi.mocked(categoriesApi.getCategoryUses).mockResolvedValue([
      {
        content_id: "a1",
        kind: "article",
        title: "Bien dormir",
        in_draft: true,
        in_app: true,
        in_trash: false,
        live_state: "live",
        scheduled: false,
        writer: null,
      },
      {
        content_id: "a2",
        kind: "article",
        title: "Ancien article",
        in_draft: true,
        in_app: false,
        in_trash: true,
        live_state: "withdrawn",
        scheduled: false,
        writer: null,
      },
    ])
    await renderApp("/blog?tab=categories")

    fireEvent.click(
      await screen.findByRole("button", { name: labels.uses.open("Sommeil") })
    )
    const dialog = await screen.findByRole("dialog", {
      name: labels.uses.title,
    })
    expect(categoriesApi.getCategoryUses).toHaveBeenCalledWith("c1")
    expect(
      await within(dialog).findByRole("link", { name: "Bien dormir" })
    ).toHaveAttribute("href", "/blog/a1")
    const trashed = within(dialog).getByRole("row", { name: /Ancien article/ })
    expect(within(trashed).getByText(labels.uses.states.trash)).toBeVisible()
    expect(
      within(dialog).getByRole("button", { name: texts.uses.export })
    ).toBeEnabled()
  })

  it("« Retirer » suit l'état de chaque contenu : republié, brouillon seulement, ou indisponible", async () => {
    const use = {
      kind: "article",
      in_draft: true,
      in_app: true,
      in_trash: false,
      scheduled: false,
      writer: null,
    }
    vi.mocked(categoriesApi.getCategoryUses).mockResolvedValue([
      { ...use, content_id: "a1", title: "En ligne", live_state: "live" },
      { ...use, content_id: "a2", title: "Modifié", live_state: "modified" },
      {
        ...use,
        content_id: "a3",
        title: "Programmé",
        live_state: "live",
        scheduled: true,
      },
      {
        ...use,
        content_id: "a4",
        title: "Écrit",
        live_state: "draft",
        in_app: false,
        writer: { id: "u2", name: "Marie" },
      },
    ])
    vi.mocked(settingsApi.removeCategory)
      .mockResolvedValueOnce({ result: "republished" })
      .mockResolvedValueOnce({ result: "draftOnly", publishError: null })
    await renderApp("/blog?tab=categories")

    fireEvent.click(
      await screen.findByRole("button", { name: labels.uses.open("Sommeil") })
    )
    const dialog = await screen.findByRole("dialog", {
      name: labels.uses.title,
    })
    const row = (title: string) =>
      within(dialog).getByRole("row", { name: new RegExp(title) })
    await within(dialog).findByRole("link", { name: "En ligne" })
    // L'état, avec ce que fera « Retirer » pour les lecteurs d'écran.
    expect(row("Programmé")).toHaveTextContent(labels.uses.states.scheduled)
    expect(row("Écrit")).toHaveTextContent(labels.uses.tips.writing("Marie"))
    expect(
      within(row("Programmé")).getByRole("button", {
        name: labels.uses.removeFrom("Programmé"),
      })
    ).toBeDisabled()
    expect(
      within(row("Écrit")).getByRole("checkbox", {
        name: texts.selection.select("Écrit"),
      })
    ).toHaveAttribute("aria-disabled", "true")

    // Tout cocher ne coche que ce qu'on peut retirer.
    fireEvent.click(
      within(dialog).getByRole("checkbox", { name: texts.selection.selectAll })
    )
    fireEvent.click(
      within(dialog).getByRole("button", { name: labels.uses.removeMany(2) })
    )
    const confirm = await screen.findByRole("alertdialog", {
      name: labels.uses.confirm.title(2),
    })
    expect(confirm).toHaveTextContent(labels.uses.confirm.republish(1))
    expect(confirm).toHaveTextContent(labels.uses.confirm.draftOnly(1))
    fireEvent.click(
      within(confirm).getByRole("button", {
        name: labels.uses.confirm.confirm,
      })
    )

    await waitFor(() =>
      expect(settingsApi.removeCategory).toHaveBeenCalledTimes(2)
    )
    expect(vi.mocked(settingsApi.removeCategory).mock.calls[0][0]).toBe("a1")
    expect(vi.mocked(settingsApi.removeCategory).mock.calls[0][1]).toBe("c1")
    expect(
      await screen.findByText(
        [
          labels.uses.done.removed(2),
          labels.uses.done.republished(1),
          labels.uses.done.toRepublish(1),
        ].join(" · ")
      )
    ).toBeVisible()
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

import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as levelsApi from "@/lib/access-levels"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

vi.mock("@/lib/access-levels", async (importOriginal) => {
  const actual = await importOriginal<typeof levelsApi>()
  return {
    ...actual,
    listAccessLevels: vi.fn(),
    createAccessLevel: vi.fn(),
    renameAccessLevel: vi.fn(),
    deleteAccessLevel: vi.fn(),
    reorderAccessLevels: vi.fn(),
  }
})

const labels = texts.settings.accessLevels

/** Ouvre le menu « … » d'une ligne et choisit une action (Renommer, Supprimer). */
async function chooseAction(name: string, action: string) {
  fireEvent.click(
    await screen.findByRole("button", { name: labels.actions(name) })
  )
  fireEvent.click(await screen.findByRole("menuitem", { name: action }))
}
const essentiel = {
  id: "00000000-0000-4000-8000-0000000000e1",
  name: "Essentiel",
  rank: 1,
}
const premium = {
  id: "00000000-0000-4000-8000-0000000000e2",
  name: "Premium",
  rank: 2,
}

beforeEach(() => {
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([essentiel, premium])
})

afterEach(() => vi.clearAllMocks())

describe("Paramètres : formules d'abonnement", () => {
  it("liste les formules de la moins complète à la plus complète", async () => {
    await renderApp("/parametres")
    const list = await screen.findByRole("list", { name: labels.listLabel })
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-item"))
    ).toEqual(["Essentiel", "Premium"])
    expect(within(list).getByText(labels.rank(1))).toBeVisible()
    // Chaque formule a sa poignée, pour la souris et le clavier.
    expect(
      screen.getByRole("button", { name: labels.handle("Premium") })
    ).toHaveAttribute("aria-roledescription", labels.dnd.roleDescription)
  })

  it("ajoute une formule ; un nom vide ou en double est refusé", async () => {
    vi.mocked(levelsApi.createAccessLevel)
      .mockRejectedValueOnce(new levelsApi.AccessLevelError("nom_en_double"))
      .mockResolvedValue({ id: "n", name: "Intégral", rank: 3 })
    await renderApp("/parametres")
    await screen.findByRole("list", { name: labels.listLabel })
    const name = screen.getByLabelText(labels.name)
    const add = screen.getByRole("button", { name: labels.add })

    fireEvent.change(name, { target: { value: "   " } })
    fireEvent.click(add)
    expect(await screen.findByText(labels.nameRequired)).toBeVisible()
    expect(levelsApi.createAccessLevel).not.toHaveBeenCalled()

    fireEvent.change(name, { target: { value: "premium" } })
    fireEvent.click(add)
    expect(await screen.findByText(labels.errors.nom_en_double)).toBeVisible()

    fireEvent.change(name, { target: { value: "  Intégral " } })
    fireEvent.click(add)
    await waitFor(() =>
      expect(levelsApi.createAccessLevel).toHaveBeenLastCalledWith("Intégral")
    )
    expect(await screen.findByText(labels.added("Intégral"))).toBeVisible()
    expect(name).toHaveValue("")
  })

  it("renomme une formule", async () => {
    vi.mocked(levelsApi.renameAccessLevel).mockResolvedValue({
      ...premium,
      name: "Premium+",
    })
    await renderApp("/parametres")
    await chooseAction("Premium", labels.rename)
    const input = screen.getByLabelText(labels.renameLabel("Premium"))
    fireEvent.change(input, { target: { value: "Premium+" } })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))
    await waitFor(() =>
      expect(levelsApi.renameAccessLevel).toHaveBeenCalledWith(
        premium.id,
        "Premium+"
      )
    )
    expect(await screen.findByText(labels.renamed)).toBeVisible()
  })

  it("après un renommage (Entrée ou Échap), le focus revient sur « Renommer »", async () => {
    vi.mocked(levelsApi.renameAccessLevel).mockResolvedValue({
      ...premium,
      name: "Premium+",
    })
    await renderApp("/parametres")
    await chooseAction("Premium", labels.rename)
    const input = screen.getByLabelText(labels.renameLabel("Premium"))
    fireEvent.keyDown(input, { key: "Escape" })
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: labels.actions("Premium") })
        ).toHaveFocus(),
      { timeout: 3000 }
    )

    await chooseAction("Premium", labels.rename)
    const again = screen.getByLabelText(labels.renameLabel("Premium"))
    fireEvent.change(again, { target: { value: "Premium+" } })
    fireEvent.submit(again.closest("form")!)
    expect(await screen.findByText(labels.renamed)).toBeVisible()
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: labels.actions("Premium") })
        ).toHaveFocus(),
      { timeout: 3000 }
    )
  })

  it("après une suppression, le focus va à la formule suivante, puis au champ du nom", async () => {
    vi.mocked(levelsApi.deleteAccessLevel).mockResolvedValue(undefined)
    await renderApp("/parametres")
    await chooseAction("Essentiel", labels.remove)
    vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([premium])
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: labels.confirmRemove.confirm,
      })
    )
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: labels.actions("Premium") })
        ).toHaveFocus(),
      { timeout: 3000 }
    )

    await chooseAction("Premium", labels.remove)
    vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([])
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: labels.confirmRemove.confirm,
      })
    )
    await waitFor(
      () => expect(screen.getByLabelText(labels.name)).toHaveFocus(),
      { timeout: 3000 }
    )
  })

  it("ne supprime pas une formule utilisée, et le dit", async () => {
    vi.mocked(levelsApi.deleteAccessLevel).mockRejectedValue(
      new levelsApi.AccessLevelError("formule_utilisee")
    )
    await renderApp("/parametres")
    await chooseAction("Essentiel", labels.remove)
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent(
      labels.confirmRemove.description("Essentiel")
    )
    fireEvent.click(
      within(dialog).getByRole("button", {
        name: labels.confirmRemove.confirm,
      })
    )
    expect(
      await screen.findByText(labels.errors.formule_utilisee)
    ).toBeVisible()
    expect(levelsApi.deleteAccessLevel).toHaveBeenCalledWith(essentiel.id)
  })

  it("reste réservé aux admins", async () => {
    await renderApp("/parametres", fakeAuth({ role: "editor" }))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.adminOnly.title
    )
    expect(levelsApi.listAccessLevels).not.toHaveBeenCalled()
  })
})

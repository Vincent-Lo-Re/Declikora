import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as levelsApi from "@/lib/access-levels"
import * as identityApi from "@/lib/admin-identity"
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

vi.mock("@/lib/admin-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof identityApi>()
  return {
    ...actual,
    getAdminBrand: vi.fn(),
    saveAdminName: vi.fn(),
    saveBrandFile: vi.fn(),
    saveBrandVariants: vi.fn(),
    removeBrandFile: vi.fn(),
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

/** Une identité sans fichier, avec ce nom. */
const brand = (name: string | null): identityApi.AdminBrand => ({
  name,
  "logotype-light": null,
  "logotype-dark": null,
  "monogram-light": null,
  "monogram-dark": null,
  variants: {},
})

beforeEach(() => {
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([essentiel, premium])
  vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand(null))
  vi.mocked(identityApi.saveAdminName).mockResolvedValue()
  vi.mocked(identityApi.saveBrandFile).mockResolvedValue()
  vi.mocked(identityApi.saveBrandVariants).mockResolvedValue()
  vi.mocked(identityApi.removeBrandFile).mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

describe("Paramètres : les onglets", () => {
  it("quatre onglets ; le premier s'ouvre au départ, l'onglet choisi va dans l'adresse", async () => {
    const { router } = await renderApp("/parametres")

    const tabs = await screen.findByRole("tablist", {
      name: texts.settings.tabs.label,
    })
    expect(
      within(tabs)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual([
      texts.settings.tabs.admin,
      texts.settings.tabs.app,
      texts.settings.tabs.plans,
      texts.settings.tabs.advanced,
    ])
    expect(
      within(tabs).getByRole("tab", { name: texts.settings.tabs.admin })
    ).toHaveAttribute("aria-selected", "true")
    // Le premier onglet : le nom de la marque.
    expect(
      screen.getByRole("heading", { name: texts.settings.adminIdentity.title })
    ).toBeVisible()

    fireEvent.click(
      within(tabs).getByRole("tab", { name: texts.settings.tabs.plans })
    )
    expect(await screen.findByText(labels.title)).toBeVisible()
    await waitFor(() =>
      expect(router.state.location.search).toBe("?onglet=formules")
    )
  })
})

describe("Paramètres : le nom de la marque", () => {
  const identity = texts.settings.adminIdentity
  const sidebar = () =>
    document.querySelector('[data-slot="sidebar-header"]') as HTMLElement

  it("par défaut « Ruche » ; un admin le change, et le menu comme l'onglet le prennent", async () => {
    await renderApp("/parametres")
    const field = await screen.findByLabelText(identity.name)
    expect(field).toHaveValue("")
    expect(field).toHaveAttribute("placeholder", "Ruche")
    // Ruche, sans logo ni nom de marque : son logotype, décliné pour la palette du membre.
    const ruche = sidebar().querySelector("img")
    expect(ruche).toHaveAttribute("alt", "Ruche")
    expect(ruche?.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/)
    expect(document.title).toBe(`${texts.sections.settings.title} — Ruche`)

    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand("Essaim"))
    fireEvent.change(field, { target: { value: "  Essaim " } })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))

    // Sans les espaces autour ; puis relu pour toute l'admin.
    await waitFor(() =>
      expect(identityApi.saveAdminName).toHaveBeenCalledWith("Essaim")
    )
    expect(await screen.findByText(identity.saved)).toBeVisible()
    // Une autre marque sans logo : son nom en texte, plus le logotype de Ruche.
    await waitFor(() => expect(sidebar()).toHaveTextContent("Essaim"))
    expect(sidebar().querySelector("img")).toBeNull()
    expect(document.title).toBe(`${texts.sections.settings.title} — Essaim`)
  })

  it("vide revient à « Ruche » ; un nom trop long est refusé sans rien envoyer", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand("Essaim"))
    await renderApp("/parametres")
    const field = await screen.findByLabelText(identity.name)
    expect(field).toHaveValue("Essaim")

    fireEvent.change(field, { target: { value: "a".repeat(41) } })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))
    expect(await screen.findByText(identity.nameTooLong)).toBeVisible()
    expect(identityApi.saveAdminName).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: "   " } })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))
    await waitFor(() =>
      expect(identityApi.saveAdminName).toHaveBeenCalledWith(null)
    )
  })
})

describe("Paramètres : le logotype et le monogramme", () => {
  const files = texts.settings.adminIdentity.files
  const logo = {
    path: "logotype-sombre/a.svg",
    url: "https://cdn.test/logo.svg",
  }

  it("une carte par fichier ; le logotype remplace le nom en haut du menu", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand("Essaim"),
      "logotype-dark": logo,
    })
    await renderApp("/parametres")
    const light = files.label(files.logotype.title, files.light)
    const dark = files.label(files.logotype.title, files.dark)
    const cardOf = (label: string) =>
      screen.getByText(label).closest('[data-slot="card"]') as HTMLElement
    await screen.findByText(light)

    // Le fond sombre a son fichier (« Remplacer », « Retirer ») ; le fond clair n'en a pas.
    expect(
      within(cardOf(dark)).getByRole("img", { name: dark })
    ).toHaveAttribute("src", logo.url)
    expect(within(cardOf(dark)).getByText(files.replace)).toBeVisible()
    expect(within(cardOf(light)).queryByRole("img")).toBeNull()
    expect(within(cardOf(light)).getByText(files.choose)).toBeVisible()

    // Le menu est sombre : son logotype, avec le nom de la marque pour les lecteurs d'écran.
    const header = document.querySelector('[data-slot="sidebar-header"]')
    expect(header?.querySelector("img")).toHaveAttribute("src", logo.url)
    expect(header?.querySelector("img")).toHaveAttribute("alt", "Essaim")

    // Envoyer pour le fond clair ; retirer celui du fond sombre.
    const chosen = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" })
    fireEvent.change(screen.getByLabelText(light), {
      target: { files: [chosen] },
    })
    // Sans couleur à changer : enregistré tel quel, sans question.
    await waitFor(() =>
      expect(identityApi.saveBrandFile).toHaveBeenCalledWith(
        "logotype-light",
        expect.objectContaining({ mime: "image/svg+xml", svg: null }),
        null
      )
    )
    expect(identityApi.saveBrandVariants).not.toHaveBeenCalled()
    fireEvent.click(
      within(cardOf(dark)).getByRole("button", { name: files.remove })
    )
    await waitFor(() =>
      expect(identityApi.removeBrandFile).toHaveBeenCalledWith(
        "logotype-dark",
        logo.path,
        // Le dernier fichier du logotype : ses déclinaisons partent avec lui.
        true
      )
    )
  })
})

describe("Paramètres : déposer un fichier de la marque", () => {
  const files = texts.settings.adminIdentity.files

  it("un fichier glissé sur une carte l'allume, puis part comme s'il avait été choisi", async () => {
    await renderApp("/parametres")
    const label = files.label(files.monogram.title, files.dark)
    const card = (await screen.findByText(label)).closest(
      '[data-slot="card"]'
    ) as HTMLElement
    const png = new File(["x"], "monogramme.png", { type: "image/png" })
    const dataTransfer = { types: ["Files"], files: [png], dropEffect: "" }

    fireEvent.dragEnter(card, { dataTransfer })
    expect(within(card).getByText(files.drop)).toBeVisible()
    fireEvent.drop(card, { dataTransfer })

    await waitFor(() =>
      expect(identityApi.saveBrandFile).toHaveBeenCalledWith(
        "monogram-dark",
        expect.objectContaining({ mime: "image/png" }),
        null
      )
    )
    expect(within(card).queryByText(files.drop)).toBeNull()
  })
})

describe("Paramètres : décliner un logo aux couleurs des palettes", () => {
  const files = texts.settings.adminIdentity.files

  it("un SVG aux couleurs modifiables demande s'il faut le décliner", async () => {
    await renderApp("/parametres")
    const light = files.label(files.monogram.title, files.light)
    const logo = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect fill="#f59e0b" width="4" height="4"/><path fill="#111111" d="M5 0h1v4H5z"/></svg>',
      ],
      "logo.svg",
      { type: "image/svg+xml" }
    )
    fireEvent.change(await screen.findByLabelText(light), {
      target: { files: [logo] },
    })

    const dialog = await screen.findByRole("dialog", {
      name: files.variants.title,
    })
    // Les onze palettes, chacune avec son nom.
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(11)
    expect(
      within(dialog).getByText(texts.colors.presets.names["zinc-blue"])
    ).toBeVisible()

    fireEvent.click(
      within(dialog).getByRole("button", { name: files.variants.confirm(11) })
    )
    await waitFor(() =>
      expect(identityApi.saveBrandVariants).toHaveBeenCalledWith(
        "monogram",
        expect.objectContaining({
          colors: { main: "#111111", accent: "#f59e0b" },
        }),
        // La carte du fond sombre est vide : elle reçoit sa version.
        "monogram-dark"
      )
    )
    expect(identityApi.saveBrandFile).toHaveBeenCalledWith(
      "monogram-light",
      expect.anything(),
      null
    )
    expect(await screen.findByText(files.variants.done)).toBeVisible()
  })
})

describe("Paramètres : formules d'abonnement", () => {
  it("liste les formules de la moins complète à la plus complète", async () => {
    await renderApp("/parametres?onglet=formules")
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
    await renderApp("/parametres?onglet=formules")
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
    await renderApp("/parametres?onglet=formules")
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
    await renderApp("/parametres?onglet=formules")
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
    await renderApp("/parametres?onglet=formules")
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
    await renderApp("/parametres?onglet=formules")
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

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
    saveBrandDetails: vi.fn(),
    saveBrandFile: vi.fn(),
    saveBrandVariants: vi.fn(),
    removeBrandFile: vi.fn(),
    prepareLoginImage: vi.fn(),
    saveLoginImage: vi.fn(),
    removeLoginImage: vi.fn(),
    saveMonogramMotion: vi.fn(),
    saveMonogramMotions: vi.fn(),
    saveAdminLanguage: vi.fn(),
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
  loginImage: null,
  monogramMotion: true,
  monogramMotions: ["trace", "glint", "breathe"],
  contactEmail: null,
  language: "en",
  variants: {},
})

beforeEach(() => {
  vi.mocked(levelsApi.listAccessLevels).mockResolvedValue([essentiel, premium])
  vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand(null))
  vi.mocked(identityApi.saveBrandDetails).mockResolvedValue()
  vi.mocked(identityApi.saveBrandFile).mockResolvedValue()
  vi.mocked(identityApi.saveBrandVariants).mockResolvedValue()
  vi.mocked(identityApi.removeBrandFile).mockResolvedValue()
  vi.mocked(identityApi.saveLoginImage).mockResolvedValue()
  vi.mocked(identityApi.removeLoginImage).mockResolvedValue()
  vi.mocked(identityApi.saveMonogramMotion).mockResolvedValue()
  vi.mocked(identityApi.saveMonogramMotions).mockResolvedValue()
  vi.mocked(identityApi.saveAdminLanguage).mockResolvedValue()
})

afterEach(() => vi.clearAllMocks())

describe("Paramètres : la langue de l'admin (Avancé)", () => {
  it("un admin choisit la langue de toute l'admin, l'identité est relue", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand(null),
      language: "fr",
    })
    await renderApp("/settings?tab=advanced")
    const words = texts.settings.advanced.language

    expect(
      await screen.findByRole("heading", { name: words.title })
    ).toBeVisible()
    const choice = await screen.findByRole("combobox", { name: words.label })
    expect(choice).toHaveTextContent(texts.languages.fr)

    fireEvent.click(choice)
    const english = await screen.findByRole("option", {
      name: texts.languages.en,
    })
    // Base UI ne retient un clic de souris que s'il a commencé sur l'option.
    fireEvent.pointerDown(english, { pointerType: "mouse" })
    fireEvent.click(english)

    await waitFor(() =>
      expect(identityApi.saveAdminLanguage).toHaveBeenCalledWith("en")
    )
    expect(await screen.findByText(words.saved)).toBeVisible()
    await waitFor(() =>
      expect(
        vi.mocked(identityApi.getAdminBrand).mock.calls.length
      ).toBeGreaterThan(1)
    )
  })
})

describe("Paramètres : les onglets", () => {
  it("quatre onglets ; le premier s'ouvre au départ, l'onglet choisi va dans l'adresse", async () => {
    const { router } = await renderApp("/settings")

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
    await waitFor(() => expect(router.state.location.search).toBe("?tab=plans"))
  })
})

describe("Paramètres : le nom de la marque", () => {
  const identity = texts.settings.adminIdentity
  const sidebar = () =>
    document.querySelector('[data-slot="sidebar-header"]') as HTMLElement

  it("par défaut « Ruche » ; un admin le change, et le menu comme l'onglet le prennent", async () => {
    await renderApp("/settings")
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
    fireEvent.click(
      screen.getByRole("button", { name: texts.settings.adminIdentity.save })
    )

    // Sans les espaces autour ; puis relu pour toute l'admin.
    await waitFor(() =>
      expect(identityApi.saveBrandDetails).toHaveBeenCalledWith("Essaim", null)
    )
    expect(await screen.findByText(identity.saved)).toBeVisible()
    // Une autre marque sans logo : son nom en texte, plus le logotype de Ruche.
    await waitFor(() => expect(sidebar()).toHaveTextContent("Essaim"))
    expect(sidebar().querySelector("img")).toBeNull()
    expect(document.title).toBe(`${texts.sections.settings.title} — Essaim`)
  })

  it("vide revient à « Ruche » ; un nom trop long est refusé sans rien envoyer", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand("Essaim"))
    await renderApp("/settings")
    const field = await screen.findByLabelText(identity.name)
    expect(field).toHaveValue("Essaim")

    fireEvent.change(field, { target: { value: "a".repeat(41) } })
    fireEvent.click(
      screen.getByRole("button", { name: texts.settings.adminIdentity.save })
    )
    expect(await screen.findByText(identity.nameTooLong)).toBeVisible()
    expect(identityApi.saveBrandDetails).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: "   " } })
    fireEvent.click(
      screen.getByRole("button", { name: texts.settings.adminIdentity.save })
    )
    await waitFor(() =>
      expect(identityApi.saveBrandDetails).toHaveBeenCalledWith(null, null)
    )
  })
})

describe("Paramètres : l'adresse de contact de la marque", () => {
  const identity = texts.settings.adminIdentity

  it("une adresse mal écrite est refusée ; une bonne part avec le nom", async () => {
    await renderApp("/settings")
    const field = await screen.findByLabelText(identity.email)
    fireEvent.change(field, { target: { value: "pas-une-adresse" } })
    fireEvent.click(
      screen.getByRole("button", { name: texts.settings.adminIdentity.save })
    )
    expect(await screen.findByText(identity.invalidEmail)).toBeVisible()
    expect(identityApi.saveBrandDetails).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: "aide@exemple.fr" } })
    fireEvent.click(
      screen.getByRole("button", { name: texts.settings.adminIdentity.save })
    )
    await waitFor(() =>
      expect(identityApi.saveBrandDetails).toHaveBeenCalledWith(
        null,
        "aide@exemple.fr"
      )
    )
  })
})

describe("Paramètres : le logotype et le monogramme", () => {
  const files = texts.settings.adminIdentity.files
  const logo = {
    path: "logotype-sombre/a.svg",
    url: "https://cdn.test/logo.svg",
  }

  it("une case par fichier ; le logotype remplace le nom en haut du menu", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand("Essaim"),
      "logotype-dark": logo,
    })
    await renderApp("/settings")
    const light = files.label(files.logotype.title, files.light)
    const dark = files.label(files.logotype.title, files.dark)
    const cardOf = (label: string) =>
      document.querySelector(`[data-file-slot="${label}"]`) as HTMLElement
    await screen.findByLabelText(light)

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
    await renderApp("/settings")
    const label = files.label(files.monogram.title, files.dark)
    await screen.findByLabelText(label)
    const card = document.querySelector(
      `[data-file-slot="${label}"]`
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
    await renderApp("/settings")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings?tab=plans")
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
    await renderApp("/settings", fakeAuth({ role: "editor" }))
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.adminOnly.title
    )
    expect(levelsApi.listAccessLevels).not.toHaveBeenCalled()
  })
})

describe("Paramètres : l'image de l'écran de connexion", () => {
  const files = texts.settings.adminIdentity.files

  it("une photo choisie est réduite puis envoyée ; l'image enregistrée se retire", async () => {
    const image = {
      path: "connexion/00000000-0000-4000-8000-000000000006.webp",
      url: "https://exemple.test/marque/connexion/photo.webp",
    }
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand(null),
      loginImage: image,
    })
    const reduced = new Blob(["x"], { type: "image/webp" })
    vi.mocked(identityApi.prepareLoginImage).mockResolvedValue(reduced)
    await renderApp("/settings")

    // L'aperçu montre l'image choisie, sous le voile et le monogramme.
    const preview = await screen.findByRole("img", {
      name: files.loginScreen.preview,
    })
    const card = preview.closest('[data-slot="card"]') as HTMLElement
    await waitFor(() =>
      expect(preview.querySelector('img[alt=""]')).toHaveAttribute(
        "src",
        image.url
      )
    )
    expect(
      within(card).getByText(files.loginImage.formats, { exact: false })
    ).toBeVisible()

    const photo = new File(["x"], "photo.jpg", { type: "image/jpeg" })
    fireEvent.change(screen.getByLabelText(files.loginScreen.title), {
      target: { files: [photo] },
    })
    await waitFor(() =>
      expect(identityApi.saveLoginImage).toHaveBeenCalledWith(
        reduced,
        image.path
      )
    )
    expect(identityApi.prepareLoginImage).toHaveBeenCalledWith(photo)

    fireEvent.click(within(card).getByRole("button", { name: files.remove }))
    await waitFor(() =>
      expect(identityApi.removeLoginImage).toHaveBeenCalledWith(image.path)
    )
  })
})

describe("Paramètres : le monogramme animé de l'écran de connexion", () => {
  const motion = texts.settings.adminIdentity.files.monogramMotion

  it("l'interrupteur l'active ou le désactive pour toute l'équipe", async () => {
    await renderApp("/settings")
    const toggle = await screen.findByRole("switch", { name: motion.toggle })
    expect(toggle).toHaveAttribute("aria-checked", "true")
    fireEvent.click(toggle)
    await waitFor(() =>
      expect(identityApi.saveMonogramMotion).toHaveBeenCalledWith(false)
    )
    expect(await screen.findByText(motion.off)).toBeVisible()
  })

  it("ses animations se cochent, dans l'ordre fixe, une au moins", async () => {
    await renderApp("/settings")
    const group = await screen.findByRole("list", { name: motion.group })
    fireEvent.click(
      within(group).getByRole("checkbox", { name: motion.motions.shine })
    )
    await waitFor(() =>
      expect(identityApi.saveMonogramMotions).toHaveBeenCalledWith([
        "trace",
        "glint",
        "shine",
        "breathe",
      ])
    )
    expect(await screen.findByText(motion.saved)).toBeVisible()
  })

  it("grise, avec la raison, les animations que le monogramme ne permet pas", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand(null),
      "monogram-dark": { path: "m.png", url: "https://exemple.fr/m.png" },
    })
    await renderApp("/settings")
    const group = await screen.findByRole("list", { name: motion.group })
    await waitFor(() =>
      expect(
        within(group).getByRole("checkbox", { name: motion.motions.trace })
      ).toHaveAttribute("aria-disabled", "true")
    )
    expect(
      within(group).getByRole("checkbox", { name: motion.motions.shine })
    ).not.toHaveAttribute("aria-disabled")
    expect(
      within(group).getAllByRole("button", { name: motion.blocked.svg })
    ).toHaveLength(3)
  })

  it("la dernière animation cochée ne se décoche pas", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue({
      ...brand(null),
      monogramMotions: ["sway"],
    })
    await renderApp("/settings")
    const group = await screen.findByRole("list", { name: motion.group })
    expect(
      within(group).getByRole("checkbox", { name: motion.motions.sway })
    ).toHaveAttribute("aria-disabled", "true")
  })
})

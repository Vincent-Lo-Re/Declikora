import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

// Par défaut : un admin connecté, double vérification faite.
const renderAt = (path: string) => renderApp(path)

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("menu", () => {
  it("range les sections par groupes, avec l'équipe et le compte en bas", () => {
    renderAt("/")

    const main = screen.getByRole("navigation", { name: texts.nav.label })
    expect(within(main).getByText(texts.nav.groups.contents)).toBeVisible()
    expect(within(main).getByText(texts.nav.groups.tools)).toBeVisible()
    expect(
      within(main)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual([
      "Accueil",
      "Blog",
      "Podcasts",
      "Méthodes",
      "Pages",
      "Modèles",
      "Médiathèque",
      "Corbeille",
    ])

    const footer = screen.getByRole("navigation", {
      name: texts.nav.footerLabel,
    })
    // Par leur nom (celui des lecteurs d'écran) : « Mon compte » montre aussi des initiales.
    expect(within(footer).getAllByRole("link")).toEqual(
      ["Équipe", "Paramètres", "Mon compte"].map((name) =>
        within(footer).getByRole("link", { name })
      )
    )
  })

  it("mène aux adresses en français", () => {
    renderAt("/")

    expect(screen.getByRole("link", { name: "Médiathèque" })).toHaveAttribute(
      "href",
      "/mediatheque"
    )
    expect(screen.getByRole("link", { name: "Mon compte" })).toHaveAttribute(
      "href",
      "/mon-compte"
    )
  })

  it("ouvre la section demandée et marque son lien comme actif", () => {
    renderAt("/blog")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Blog")
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute(
      "aria-current"
    )
  })
})

describe("pages", () => {
  it("affiche « Page introuvable » pour une adresse inconnue", () => {
    renderAt("/nimporte-quoi")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.notFound.title
    )
  })
})

describe("thème", () => {
  it("passe en sombre et garde le choix", () => {
    renderAt("/mon-compte")

    fireEvent.click(screen.getByRole("button", { name: texts.theme.dark }))

    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem("declikora-theme")).toBe("dark")
  })
})

describe("accès", () => {
  it("envoie vers la connexion sans session, en gardant la page demandée", () => {
    const { router } = renderApp("/blog?page=2", fakeAuth("signed-out"))

    expect(router.state.location.pathname).toBe("/connexion")
    expect(router.state.location.state).toEqual({ from: "/blog?page=2" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.signIn.title
    )
    // Les pages de connexion n'ont pas le menu.
    expect(
      screen.queryByRole("navigation", { name: texts.nav.label })
    ).not.toBeInTheDocument()
  })

  it("demande le code de l'app après le code reçu par e-mail", () => {
    const { router } = renderApp("/mon-compte", fakeAuth({ level: "aal1" }))

    expect(router.state.location.pathname).toBe("/double-verification")
    expect(router.state.location.state).toEqual({ from: "/mon-compte" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.mfa.verifyTitle
    )
  })

  it("ramène à la page demandée quand la double vérification est faite", () => {
    const { router } = renderApp("/double-verification")

    expect(router.state.location.pathname).toBe("/")
  })

  it("ne rouvre pas la connexion quand on est déjà connecté", () => {
    const { router } = renderApp("/connexion")

    expect(router.state.location.pathname).toBe("/")
  })
})

describe("déconnexion", () => {
  it("ouvre la connexion sans garder la page d'où l'on vient", () => {
    const { router } = renderApp("/deconnexion", fakeAuth("signed-out"))

    expect(router.state.location.pathname).toBe("/connexion")
    expect(router.state.location.state).toBeNull()
  })
})

describe("rôles", () => {
  it("cache Équipe et Paramètres dans le menu d'un éditeur", () => {
    renderApp("/", fakeAuth({ role: "editor" }))

    const footer = screen.getByRole("navigation", {
      name: texts.nav.footerLabel,
    })
    expect(within(footer).getAllByRole("link")).toEqual([
      within(footer).getByRole("link", { name: "Mon compte" }),
    ])
  })

  it.each(["/equipe", "/parametres"])(
    "affiche « Réservé aux admins » à un éditeur sur %s",
    (path) => {
      renderApp(path, fakeAuth({ role: "editor" }))

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        texts.adminOnly.title
      )
    }
  )

  it("ouvre les Paramètres à un admin", () => {
    renderApp("/parametres")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.sections.settings.title
    )
  })
})

describe("éditeurs", () => {
  it("chaque sorte de contenu s'ouvre dans l'éditeur de sa section", async () => {
    const { contentEditorPath, categoriesPath, mediaFilePath } =
      await import("@/navigation")
    expect(contentEditorPath("article", "a")).toBe("/blog/a")
    expect(contentEditorPath("episode", "e")).toBe("/podcasts/e")
    expect(contentEditorPath("page", "p")).toBe("/pages/p")
    expect(contentEditorPath("template", "t")).toBe("/modeles/t")
    // Une méthode, et ses chapitres et ses leçons (partie 7b).
    expect(contentEditorPath("method", "m")).toBe("/methodes/m")
    expect(contentEditorPath("chapter", "c")).toBe("/methodes/chapitres/c")
    expect(contentEditorPath("lesson", "l")).toBe("/methodes/lecons/l")
    expect(contentEditorPath("inconnu", "x")).toBeNull()
    expect(categoriesPath("podcasts")).toBe("/podcasts/categories")
    expect(mediaFilePath("f")).toBe("/mediatheque?fichier=f")
  })
})

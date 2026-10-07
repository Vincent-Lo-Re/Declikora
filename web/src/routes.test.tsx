import { fireEvent, screen, within } from "@testing-library/react"
import type { RouteObject } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import type { PageHandle } from "@/lib/preparation"
import { routes } from "@/routes"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

// Par défaut : un admin connecté, double vérification faite.
const renderAt = (path: string) => renderApp(path)

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("menu", () => {
  it("range les sections par groupes, avec l'équipe et le compte en bas", async () => {
    await renderAt("/")

    const main = screen.getByRole("navigation", { name: texts.nav.label })
    expect(within(main).getByText(texts.nav.groups.contents)).toBeVisible()
    expect(within(main).getByText(texts.nav.groups.tools)).toBeVisible()
    expect(
      within(main)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual([
      "Tableau de bord",
      "Blog",
      "Podcasts",
      "Pages",
      "Modèles de bloc",
      "Médiathèque",
      "Corbeille",
    ])

    // Le compte, l'équipe et les paramètres sont dans le header, après « Site web ».
    const header = screen.getByRole("navigation", { name: texts.header.label })
    expect(
      within(header)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual([
      `${texts.header.website} ${texts.header.newTab}`,
      "Mon compte",
      "Équipe",
      "Paramètres",
    ])
  })

  it("mène aux adresses en français", async () => {
    await renderAt("/")

    expect(screen.getByRole("link", { name: "Médiathèque" })).toHaveAttribute(
      "href",
      "/media"
    )
  })

  it("ouvre la section demandée et marque son lien comme actif", async () => {
    await renderAt("/blog")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Blog")
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(
      screen.getByRole("link", { name: "Tableau de bord" })
    ).not.toHaveAttribute("aria-current")
  })
})

describe("pages", () => {
  it("affiche « Page introuvable » pour une adresse inconnue", async () => {
    await renderAt("/nimporte-quoi")

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.notFound.title
    )
  })
})

describe("thème", () => {
  it("passe en sombre et garde le choix", async () => {
    await renderAt("/account")

    fireEvent.click(screen.getByRole("button", { name: texts.theme.dark }))

    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem("declikora-theme")).toBe("dark")
  })
})

describe("accès", () => {
  it("envoie vers la connexion sans session, en gardant la page demandée", async () => {
    const { router } = await renderApp("/blog?page=2", fakeAuth("signed-out"))

    expect(router.state.location.pathname).toBe("/sign-in")
    expect(router.state.location.state).toEqual({ from: "/blog?page=2" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.signIn.title
    )
    // Les pages de connexion n'ont pas le menu.
    expect(
      screen.queryByRole("navigation", { name: texts.nav.label })
    ).not.toBeInTheDocument()
  })

  it("demande le code de l'app après le code reçu par e-mail", async () => {
    const { router } = await renderApp("/account", fakeAuth({ level: "aal1" }))

    // La connexion reprend à son étape de double vérification (AuthSlides).
    expect(router.state.location.pathname).toBe("/sign-in")
    expect(router.state.location.state).toEqual({ from: "/account" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      texts.mfa.verifyTitle
    )
  })

  it("ne rouvre pas la connexion quand on est déjà connecté", async () => {
    const { router } = await renderApp("/sign-in")

    expect(router.state.location.pathname).toBe("/")
  })
})

describe("déconnexion", () => {
  it("ouvre la connexion sans garder la page d'où l'on vient", async () => {
    const { router } = await renderApp("/sign-out", fakeAuth("signed-out"))

    expect(router.state.location.pathname).toBe("/sign-in")
    expect(router.state.location.state).toBeNull()
  })
})

describe("rôles", () => {
  it("cache Équipe et Paramètres dans le menu d'un éditeur", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))

    // Le header garde « Site web » et Mon compte.
    const header = screen.getByRole("navigation", { name: texts.header.label })
    expect(
      within(header)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual([`${texts.header.website} ${texts.header.newTab}`, "Mon compte"])
    expect(screen.queryByRole("link", { name: "Équipe" })).toBeNull()
  })

  it.each(["/team", "/settings"])(
    "affiche « Réservé aux admins » à un éditeur sur %s",
    async (path) => {
      await renderApp(path, fakeAuth({ role: "editor" }))

      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        texts.adminOnly.title
      )
    }
  )

  it("ouvre les Paramètres à un admin", async () => {
    await renderApp("/settings")

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
    expect(contentEditorPath("template", "t")).toBe("/templates/t")
    // Une sorte sans éditeur (les anciennes méthodes, en cours de refonte).
    expect(contentEditorPath("method", "m")).toBeNull()
    expect(contentEditorPath("inconnu", "x")).toBeNull()
    expect(categoriesPath("podcasts")).toBe("/podcasts/categories")
    expect(mediaFilePath("f")).toBe("/media?file=f")
  })
})

describe("pages chargées à part et préparées (ADMIN § 7)", () => {
  /** Toutes les routes qui ont une adresse, avec la page de connexion ou non. */
  function pages(list: RouteObject[], auth = false): [RouteObject, boolean][] {
    return list.flatMap((route) => [
      ...(route.path ? [[route, auth] as [RouteObject, boolean]] : []),
      ...pages(
        route.children ?? [],
        auth || route.children?.some((child) => child.path === "/sign-in")
      ),
    ])
  }

  it("chaque page est chargée à part et dit ce qu'elle prépare : une nouvelle page aussi", () => {
    const found = pages(routes)
    expect(found.length).toBeGreaterThanOrEqual(20)
    for (const [route, auth] of found) {
      const handle = route.handle as PageHandle | undefined
      expect(route.lazy, route.path).toBeTypeOf("function")
      expect(handle?.code, route.path).toBeTypeOf("function")
      // Ce qu'elle lit en arrivant (null : rien), préparé par son loader.
      expect(handle && "prepare" in handle, route.path).toBe(true)
      if (!auth) expect(route.loader, route.path).toBeTypeOf("function")
    }
  })
})

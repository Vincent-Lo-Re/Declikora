import { fireEvent, render, screen, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { afterEach, describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routes } from "@/routes"
import { texts } from "@/texts"

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  )
}

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
    expect(
      within(footer)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["Équipe", "Paramètres", "Mon compte"])
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

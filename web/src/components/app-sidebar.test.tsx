import { fireEvent, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("menu", () => {
  it("les icônes Lucide ont un trait d'un pixel, qui ne change pas avec leur taille", async () => {
    await renderApp("/mon-compte", fakeAuth({ role: "editor" }))

    const blog = await screen.findByRole("link", {
      name: texts.sections.blog.title,
    })
    const icon = blog.querySelector("svg")
    expect(icon).toHaveAttribute("stroke-width", "1")
    expect(icon?.querySelector("[vector-effect]")).toHaveAttribute(
      "vector-effect",
      "non-scaling-stroke"
    )
  })

  it("l'avatar est en bas du menu : sous Équipe et Paramètres, après un trait", async () => {
    await renderApp("/mon-compte", fakeAuth({ role: "admin" }))

    const avatar = await screen.findByRole("button", {
      name: new RegExp(`${texts.accountMenu.open}$`),
    })
    const bottom = screen.getByRole("navigation", {
      name: texts.nav.footerLabel,
    })
    const footer = bottom.closest<HTMLElement>('[data-sidebar="footer"]')
    expect(footer).toContainElement(avatar)
    // Dans l'ordre : Équipe et Paramètres, le trait, l'avatar.
    const line = within(footer!).getByRole("separator")
    const after = Node.DOCUMENT_POSITION_FOLLOWING
    expect(bottom.compareDocumentPosition(line) & after).toBeTruthy()
    expect(line.compareDocumentPosition(avatar) & after).toBeTruthy()
  })

  it("sans Équipe ni Paramètres (éditeur), l'avatar est seul en bas du menu, sans trait", async () => {
    await renderApp("/mon-compte", fakeAuth({ role: "editor" }))

    const avatar = await screen.findByRole("button", {
      name: new RegExp(`${texts.accountMenu.open}$`),
    })
    const footer = avatar.closest<HTMLElement>('[data-sidebar="footer"]')
    expect(footer).not.toBeNull()
    expect(
      screen.queryByRole("navigation", { name: texts.nav.footerLabel })
    ).toBeNull()
    expect(within(footer!).queryByRole("separator")).toBeNull()
  })

  it("toujours ouvert : ni barre du haut, ni bouton, ni raccourci pour le replier", async () => {
    await renderApp("/mon-compte", fakeAuth({ role: "editor" }))
    const link = await screen.findByRole("link", {
      name: texts.sections.blog.title,
    })

    // La page garde son titre (PageHeader), mais l'admin n'a plus de barre au-dessus.
    expect(
      document.querySelector('[data-slot="sidebar-inset"] > header')
    ).toBeNull()
    expect(
      document.querySelector('[data-sidebar="trigger"], [data-sidebar="rail"]')
    ).toBeNull()
    // Ctrl + B ne fait rien : le menu garde ses noms.
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(link).toHaveTextContent(texts.sections.blog.title)
    expect(document.querySelector('[data-slot="sidebar"]')).not.toHaveAttribute(
      "data-state"
    )
  })
})

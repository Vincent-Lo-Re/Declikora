import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("Tableau de bord", () => {
  it("son titre avec son icône, et « Bienvenue » dessous, rien d'autre (06/10/2026)", async () => {
    await renderApp("/", fakeAuth({ role: "editor" }))

    const title = await screen.findByRole("heading", {
      level: 1,
      name: texts.sections.home.title,
    })
    expect(title.querySelector("svg")).not.toBeNull()
    expect(screen.getByText(texts.sections.home.description)).toBeVisible()
    const page = title.closest("[data-page-fade]")!
    expect(page.querySelectorAll('[data-slot="card"]')).toHaveLength(0)
    expect(page.querySelectorAll("ul, ol")).toHaveLength(0)
  })
})

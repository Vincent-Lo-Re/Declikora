import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("menu", () => {
  it("« Mon compte » montre les initiales du membre, dessinées comme une icône", async () => {
    // Anne Admin (fakeAuth) : « AA ».
    renderApp("/mon-compte", fakeAuth({ role: "editor" }))

    const account = await screen.findByRole("link", {
      name: texts.sections.account.title,
    })
    // Dessinées comme une icône : les lettres seules, dans un SVG.
    const letters = within(account).getByText("AA")
    expect(letters.tagName).toBe("text")
    expect(letters.closest("svg")).toHaveAttribute("viewBox", "0 0 24 24")
  })

  it("les icônes Lucide ont un trait d'un pixel, qui ne change pas avec leur taille", async () => {
    renderApp("/mon-compte", fakeAuth({ role: "editor" }))

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
})

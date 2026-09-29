import { screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

describe("menu", () => {
  it("« Mon compte » montre les initiales du membre à la place d'une icône", async () => {
    // Anne Admin (fakeAuth) : « AA ».
    renderApp("/mon-compte", fakeAuth({ role: "editor" }))

    const account = await screen.findByRole("link", {
      name: texts.sections.account.title,
    })
    expect(within(account).getByText("AA")).toBeVisible()
    expect(account.querySelector("svg")).toBeNull()
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

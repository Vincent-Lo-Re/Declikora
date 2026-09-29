import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("menu de l'avatar", () => {
  const openMenu = async () => {
    const trigger = screen.getByRole("button", {
      name: texts.accountMenu.open,
    })
    fireEvent.click(trigger)
    return screen.findByRole("menu")
  }

  it("montre l'initiale du prénom, puis le nom et l'e-mail du membre", async () => {
    // Anne Admin (fakeAuth) : « A ».
    renderApp("/", fakeAuth({ role: "editor" }))

    const trigger = screen.getByRole("button", {
      name: texts.accountMenu.open,
    })
    expect(trigger).toHaveTextContent("A")

    const menu = await openMenu()
    expect(within(menu).getByText("Anne Admin")).toBeVisible()
    expect(within(menu).getByText("anne@exemple.test")).toBeVisible()
  })

  it("mène à Mon compte, et « Se déconnecter » ferme la session", async () => {
    const { router } = renderApp("/", fakeAuth({ role: "editor" }))

    fireEvent.click(
      within(await openMenu()).getByRole("menuitem", {
        name: texts.sections.account.title,
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/mon-compte")
    )

    fireEvent.click(
      within(await openMenu()).getByRole("menuitem", {
        name: texts.common.signOut,
      })
    )
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/deconnexion")
    )
  })

  it("change le thème", async () => {
    renderApp("/", fakeAuth({ role: "editor" }))

    fireEvent.click(
      within(await openMenu()).getByRole("menuitem", {
        name: texts.theme.title,
      })
    )
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: texts.theme.dark })
    )
    await waitFor(() => expect(document.documentElement).toHaveClass("dark"))
  })
})

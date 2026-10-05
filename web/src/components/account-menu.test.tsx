import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("menu de l'avatar", () => {
  // Le bouton se lit par ce qu'il montre (nom, e-mail), puis par ce qu'il fait.
  const trigger = () =>
    screen.getByRole("button", {
      name: new RegExp(`${texts.accountMenu.open}$`),
    })
  const openMenu = async () => {
    fireEvent.click(trigger())
    return screen.findByRole("menu")
  }

  it("montre l'initiale du prénom, le nom et, dessous, le rôle ; un clic sur le nom ouvre le menu", async () => {
    // Anne Admin (fakeAuth) : « A ».
    await renderApp("/", fakeAuth({ role: "editor" }))

    expect(trigger()).toHaveAccessibleName(
      `Anne Admin ${texts.roles.editor} ${texts.accountMenu.open}`
    )
    expect(within(trigger()).getByText("A")).toBeVisible()
    const name = within(trigger()).getByText("Anne Admin")
    expect(name.nextElementSibling).toHaveTextContent(texts.roles.editor)
    expect(within(trigger()).queryByText("anne@exemple.test")).toBeNull()

    fireEvent.click(name)
    const menu = await screen.findByRole("menu")
    expect(within(menu).getByText("Anne Admin")).toBeVisible()
    expect(within(menu).getByText("anne@exemple.test")).toBeVisible()
  })

  it("mène à Mon compte, et « Se déconnecter » ferme la session", async () => {
    const { router } = await renderApp("/", fakeAuth({ role: "editor" }))

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
    await renderApp("/", fakeAuth({ role: "editor" }))

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

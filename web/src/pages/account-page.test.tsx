import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { supabase } from "@/lib/supabase"
import { fakeAuth, renderApp, testProfile } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("Mon compte", () => {
  it("montre le profil et la date de la double vérification", () => {
    renderApp("/mon-compte", fakeAuth({ role: "editor" }))

    expect(screen.getByLabelText(texts.account.profile.name)).toHaveValue(
      testProfile.full_name
    )
    // Dans la page : le menu de gauche montre aussi le rôle, à côté de l'avatar.
    const page = within(screen.getByRole("main"))
    expect(page.getByText(testProfile.email)).toBeVisible()
    expect(page.getByText(texts.roles.editor)).toBeVisible()
    expect(
      screen.getByText(texts.account.mfa.configuredOn("27 sept. 2026 à 14h30"))
    ).toBeVisible()
  })

  it("refuse un nom trop long sans rien envoyer", async () => {
    const from = vi.spyOn(supabase, "from")
    renderApp("/mon-compte")

    fireEvent.change(screen.getByLabelText(texts.account.profile.name), {
      target: { value: "a".repeat(101) },
    })
    fireEvent.click(screen.getByRole("button", { name: texts.common.save }))

    expect(
      await screen.findByText(texts.account.profile.nameTooLong)
    ).toBeVisible()
    expect(from).not.toHaveBeenCalled()
  })

  it("ferme la session sur ce navigateur seulement", async () => {
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null })
    const { router } = renderApp("/mon-compte")

    fireEvent.click(screen.getByRole("link", { name: texts.common.signOut }))

    expect(router.state.location.pathname).toBe("/deconnexion")
    await vi.waitFor(() =>
      expect(signOut).toHaveBeenCalledWith({ scope: "local" })
    )
  })
})

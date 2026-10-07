import { AuthApiError } from "@supabase/supabase-js"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { savePendingSignIn } from "@/auth/pending-sign-in"
import { supabase } from "@/lib/supabase"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

async function askCode(email: string) {
  await renderApp("/connexion", fakeAuth("signed-out"))
  fireEvent.change(screen.getByLabelText(texts.signIn.email), {
    target: { value: email },
  })
  fireEvent.click(screen.getByRole("button", { name: texts.signIn.sendCode }))
}

const noSession = { user: null, session: null, messageId: null }

describe("connexion", () => {
  it("garde le bouton inactif tant que l'adresse est mal écrite", async () => {
    const signIn = vi.spyOn(supabase.auth, "signInWithOtp")
    await renderApp("/connexion", fakeAuth("signed-out"))
    const field = screen.getByLabelText(texts.signIn.email)
    const button = screen.getByRole("button", { name: texts.signIn.sendCode })
    expect(button).toBeDisabled()

    fireEvent.change(field, { target: { value: "pas-une-adresse" } })
    expect(button).toBeDisabled()
    // En quittant le champ : la notification, et le champ en rouge.
    fireEvent.blur(field)
    expect(await screen.findByText(texts.signIn.invalidEmail)).toBeVisible()
    await waitFor(() => expect(field).toHaveAttribute("aria-invalid", "true"))

    fireEvent.change(field, { target: { value: "anne@exemple.test" } })
    expect(button).toBeEnabled()
    expect(signIn).not.toHaveBeenCalled()
  })

  it("demande un code sans créer de compte", async () => {
    const signIn = vi
      .spyOn(supabase.auth, "signInWithOtp")
      .mockResolvedValue({ data: noSession, error: null })

    await askCode("  Anne@Exemple.test ")

    expect(
      await screen.findByText(texts.signIn.codeSent("anne@exemple.test"))
    ).toBeVisible()
    expect(signIn).toHaveBeenCalledWith({
      email: "anne@exemple.test",
      options: { shouldCreateUser: false },
    })
  })

  it("répond pareil pour une adresse qui ne fait pas partie de l'équipe", async () => {
    vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: noSession,
      error: new AuthApiError(
        "Signups not allowed for otp",
        422,
        "otp_disabled"
      ),
    })

    await askCode("inconnu@exemple.test")

    expect(
      await screen.findByText(texts.signIn.codeSent("inconnu@exemple.test"))
    ).toBeVisible()
  })

  it("passe au code déjà envoyé si la demande est trop rapprochée", async () => {
    vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: noSession,
      error: new AuthApiError("Too many", 429, "over_email_send_rate_limit"),
    })

    await askCode("anne@exemple.test")

    expect(
      await screen.findByText(texts.signIn.codeAlreadySent("anne@exemple.test"))
    ).toBeVisible()
    expect(screen.getByLabelText(texts.signIn.code)).toBeVisible()
  })

  it("reprend à l'étape du code après un rechargement", async () => {
    const signIn = vi.spyOn(supabase.auth, "signInWithOtp")
    savePendingSignIn("anne@exemple.test")

    await renderApp("/connexion", fakeAuth("signed-out"))

    expect(
      screen.getByText(texts.signIn.codeStillValid("anne@exemple.test"))
    ).toBeVisible()
    expect(screen.getByLabelText(texts.signIn.code)).toBeVisible()
    expect(signIn).not.toHaveBeenCalled()

    // « Changer d'adresse » oublie la demande en cours.
    fireEvent.click(
      screen.getByRole("button", { name: texts.signIn.otherEmail })
    )
    expect(screen.getByLabelText(texts.signIn.email)).toBeVisible()
    expect(sessionStorage.length).toBe(0)
  })

  it("oublie une demande de plus de 10 minutes", async () => {
    savePendingSignIn("anne@exemple.test", Date.now() - 11 * 60 * 1000)

    await renderApp("/connexion", fakeAuth("signed-out"))

    expect(screen.getByLabelText(texts.signIn.email)).toBeVisible()
  })

  it("indique quoi faire à une personne invitée", async () => {
    vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: noSession,
      error: new AuthApiError(
        "Signups not allowed for this instance",
        422,
        "signup_disabled"
      ),
    })

    await askCode("invitee@exemple.test")

    expect(await screen.findByText(texts.signIn.invitedHint.text)).toBeVisible()
  })

  it("se connecte dès le 6e chiffre, puis signale un code faux ou expiré", async () => {
    vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: noSession,
      error: null,
    })
    const verify = vi.spyOn(supabase.auth, "verifyOtp").mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError(
        "Token has expired or is invalid",
        403,
        "otp_expired"
      ),
    })
    await askCode("anne@exemple.test")

    const code = await screen.findByLabelText(texts.signIn.code)
    // Pas de clic : le 6e chiffre lance la connexion ; le bouton attend, grisé, avec ses points.
    fireEvent.change(code, { target: { value: "123456" } })
    const button = screen.getByRole("button", { name: texts.common.loading })
    expect(button).toBeDisabled()

    // La vérification dure au moins une seconde (CODE_CHECK_MIN_MS).
    expect(
      await screen.findByText(texts.signIn.wrongCode, {}, { timeout: 3000 })
    ).toBeVisible()
    // Refusé : les cases se vident, et le bouton revient, inactif jusqu'au prochain code.
    expect(code).toHaveValue("")
    expect(
      screen.getByRole("button", { name: texts.signIn.submitCode })
    ).toBeDisabled()
    expect(verify).toHaveBeenCalledTimes(1)
    expect(verify).toHaveBeenCalledWith({
      email: "anne@exemple.test",
      token: "123456",
      type: "email",
    })
  })

  it("garde « Se connecter » inactif tant que le code est incomplet", async () => {
    vi.spyOn(supabase.auth, "signInWithOtp").mockResolvedValue({
      data: noSession,
      error: null,
    })
    const verify = vi.spyOn(supabase.auth, "verifyOtp")
    await askCode("anne@exemple.test")

    const code = await screen.findByLabelText(texts.signIn.code)
    const button = screen.getByRole("button", { name: texts.signIn.submitCode })
    expect(button).toBeDisabled()
    fireEvent.change(code, { target: { value: "123" } })
    expect(button).toBeDisabled()
    expect(verify).not.toHaveBeenCalled()
  })
})

describe("invitation", () => {
  it("n'accepte l'invitation qu'au clic, puis passe à la double vérification", async () => {
    const verify = vi.spyOn(supabase.auth, "verifyOtp").mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    const { router } = await renderApp(
      "/invitation?token_hash=abc&type=invite",
      fakeAuth("signed-out")
    )

    expect(verify).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole("button", { name: texts.invitation.accept })
    )

    await waitFor(() =>
      expect(verify).toHaveBeenCalledWith({
        token_hash: "abc",
        type: "invite",
      })
    )
    // La double vérification glisse sur la même page (la session simulée, elle, ne change pas).
    expect(router.state.location.pathname).toBe("/invitation")
  })

  it("explique quoi faire si le lien a expiré", async () => {
    vi.spyOn(supabase.auth, "verifyOtp").mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError(
        "Token has expired or is invalid",
        403,
        "otp_expired"
      ),
    })
    await renderApp(
      "/invitation?token_hash=abc&type=invite",
      fakeAuth("signed-out")
    )

    fireEvent.click(
      screen.getByRole("button", { name: texts.invitation.accept })
    )

    expect(await screen.findByText(texts.invitation.expired)).toBeVisible()
  })

  it("signale un lien incomplet", async () => {
    await renderApp("/invitation", fakeAuth("signed-out"))

    expect(screen.getByText(texts.invitation.incomplete)).toBeVisible()
  })
})

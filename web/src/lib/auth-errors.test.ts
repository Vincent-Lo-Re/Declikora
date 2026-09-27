import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  authErrorMessage,
  isNotAMemberError,
  isRateLimitError,
} from "@/lib/auth-errors"
import { texts } from "@/texts"

const apiError = (status: number, code: string) =>
  new AuthApiError("message de Supabase", status, code)

describe("erreurs de connexion", () => {
  it("reconnaît une adresse qui ne fait pas partie de l'équipe", () => {
    expect(isNotAMemberError(apiError(422, "otp_disabled"))).toBe(true)
    expect(isNotAMemberError(apiError(422, "signup_disabled"))).toBe(true)
    expect(isNotAMemberError(apiError(429, "over_email_send_rate_limit"))).toBe(
      false
    )
    expect(isNotAMemberError(new Error("otp_disabled"))).toBe(false)
  })

  it("reconnaît un excès d'essais", () => {
    expect(isRateLimitError(apiError(429, "over_request_rate_limit"))).toBe(
      true
    )
    expect(isRateLimitError(apiError(400, "over_email_send_rate_limit"))).toBe(
      true
    )
    expect(isRateLimitError(apiError(403, "otp_expired"))).toBe(false)
  })

  it("donne un message adapté à chaque étape", () => {
    const expired = apiError(403, "otp_expired")
    expect(authErrorMessage(expired, "emailCode")).toBe(texts.signIn.wrongCode)
    expect(authErrorMessage(expired, "invitation")).toBe(
      texts.invitation.expired
    )
    expect(
      authErrorMessage(apiError(422, "mfa_verification_failed"), "mfaCode")
    ).toBe(texts.mfa.wrongCode)
    expect(
      authErrorMessage(apiError(429, "over_request_rate_limit"), "mfaCode")
    ).toBe(texts.common.tooManyAttempts)
  })

  it("donne un message général pour une panne", () => {
    expect(
      authErrorMessage(new AuthRetryableFetchError("réseau", 0), "email")
    ).toBe(texts.common.unexpected)
    expect(
      authErrorMessage(apiError(500, "unexpected_failure"), "emailCode")
    ).toBe(texts.common.unexpected)
  })
})

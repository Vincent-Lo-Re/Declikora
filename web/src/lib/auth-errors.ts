import { isAuthApiError } from "@supabase/supabase-js"

import { texts } from "@/texts"

// Réponses de Supabase Auth à une adresse qui ne fait pas partie de l'équipe
// (inscriptions fermées), ou à une invitation pas encore acceptée (« signup_disabled » :
// la page de connexion invite alors à ouvrir plutôt le lien de l'invitation).
const notAMemberCodes = new Set([
  "otp_disabled",
  "signup_disabled",
  "user_not_found",
])

/**
 * Vrai si l'adresse n'est pas celle d'un membre. L'interface affiche alors le
 * même message que pour un membre. L'API de Supabase Auth, elle, répond
 * différemment selon l'adresse : ce n'est pas une protection contre qui l'appelle
 * directement.
 */
export function isNotAMemberError(error: unknown): boolean {
  return isAuthApiError(error) && notAMemberCodes.has(error.code ?? "")
}

export function isRateLimitError(error: unknown): boolean {
  return (
    isAuthApiError(error) &&
    (error.status === 429 || (error.code ?? "").startsWith("over_"))
  )
}

// Codes d'une vérification refusée (code faux, expiré, ou lien déjà utilisé).
const rejectedCodes = new Set([
  "otp_expired",
  "mfa_verification_failed",
  "mfa_challenge_expired",
  "invalid_credentials",
])

function isRejected(error: unknown): boolean {
  return (
    isAuthApiError(error) &&
    (rejectedCodes.has(error.code ?? "") ||
      error.status === 401 ||
      error.status === 403)
  )
}

/** Message à afficher pour une erreur, selon l'étape de la connexion. */
export function authErrorMessage(
  error: unknown,
  step: "email" | "emailCode" | "mfaCode" | "invitation"
): string {
  if (isRateLimitError(error)) return texts.common.tooManyAttempts
  if (isRejected(error)) {
    if (step === "emailCode") return texts.signIn.wrongCode
    if (step === "mfaCode") return texts.mfa.wrongCode
    if (step === "invitation") return texts.invitation.expired
  }
  return texts.common.unexpected
}

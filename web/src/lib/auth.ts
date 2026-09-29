// Les appels de Supabase Auth faits par les pages de connexion, d'invitation, de double
// vérification et du compte. Les pages n'appellent pas Supabase elles-mêmes.

import {
  authErrorMessage,
  isNotAMemberError,
  isRateLimitError,
} from "@/lib/auth-errors"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

// « Code envoyé », « code déjà envoyé il y a moins d'une minute » (le code précédent reste
// valable), ou message d'erreur à afficher.
type SendResult = "sent" | "recentlySent" | { error: string }

/**
 * Demande un code de connexion.
 * Une adresse inconnue est traitée comme une adresse connue : l'interface ne dit
 * pas qui fait partie de l'équipe. Attention, l'API de Supabase Auth, appelable
 * directement avec la clé publique, répond elle différemment (limite connue de
 * Supabase) : ce masquage évite seulement de l'afficher.
 */
export async function sendSignInCode(email: string): Promise<SendResult> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  if (!error || isNotAMemberError(error)) return "sent"
  if (isRateLimitError(error)) return "recentlySent"
  return { error: authErrorMessage(error, "email") }
}

/** Vérifie le code reçu par e-mail. Renvoie le message d'erreur à afficher, sinon null. */
export async function verifySignInCode(
  email: string,
  code: string
): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  })
  return error ? authErrorMessage(error, "emailCode") : null
}

/** Accepte une invitation (lien de l'e-mail). Renvoie le message d'erreur, sinon null. */
export async function acceptInvitation(
  tokenHash: string
): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  })
  return error ? authErrorMessage(error, "invitation") : null
}

type Enrollment = { factorId: string; qrCode: string; secret: string }

export const mfaEnrollmentKey = (userId: string) =>
  ["mfa-enrollment", userId] as const

/** Prépare une nouvelle app : les essais abandonnés (non vérifiés) sont d'abord retirés. */
export async function startMfaEnrollment(): Promise<Enrollment> {
  const { data: factors, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  for (const factor of factors.all) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      })
      if (error) throw error
    }
  }

  const { data, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: texts.app.name,
  })
  if (enrollError) throw enrollError
  // qr_code est déjà une image (data:image/svg+xml…), affichable telle quelle.
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

/** Vérifie un code de l'app d'authentification. Renvoie le message d'erreur, sinon null. */
export async function verifyMfaCode(
  factorId: string,
  code: string
): Promise<string | null> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  })
  return error ? authErrorMessage(error, "mfaCode") : null
}

/**
 * Ferme la session sur ce navigateur seulement : les autres appareils restent connectés.
 */
export async function signOutHere(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" })
}

/** Enregistre le nom du membre (la base n'autorise que le nom, sur sa propre fiche). */
export async function saveFullName(
  profileId: string,
  fullName: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName || null })
    .eq("id", profileId)
    .select("id")
    .single()
  if (error) throw error
}

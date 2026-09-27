import type { Factor, Session } from "@supabase/supabase-js"

import { authPaths } from "@/navigation"

// « aal1 » après le code reçu par e-mail, « aal2 » après la double vérification.
export type AssuranceLevel = "aal1" | "aal2"

/**
 * Lit le contenu du jeton de session, sans vérifier sa signature : c'est la base
 * qui la vérifie. Sert seulement à savoir quelle page afficher.
 */
export function readTokenClaims(accessToken: string): Record<string, unknown> {
  try {
    const payload = accessToken.split(".")[1] ?? ""
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof claims === "object" && claims !== null
      ? (claims as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export function assuranceLevel(session: Session): AssuranceLevel {
  return readTokenClaims(session.access_token).aal === "aal2" ? "aal2" : "aal1"
}

/** L'app de double vérification déjà configurée, s'il y en a une. */
export function verifiedTotpFactor(session: Session): Factor | null {
  return (
    session.user.factors?.find(
      (factor) => factor.factor_type === "totp" && factor.status === "verified"
    ) ?? null
  )
}

// Page demandée avant la connexion, gardée dans l'état de la navigation.
export type RedirectState = { from?: string }

/**
 * Page où revenir après la connexion. Seules les adresses internes à l'admin
 * sont acceptées, et jamais une page de connexion.
 */
export function redirectTarget(state: unknown): string {
  const from = (state as RedirectState | null)?.from
  // « //site » ou « /\site » mèneraient vers un autre site.
  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    from.includes("\\")
  )
    return "/"
  const isAuthPage = Object.values(authPaths).some(
    (path) => from === path || from.startsWith(`${path}?`)
  )
  return isAuthPage ? "/" : from
}

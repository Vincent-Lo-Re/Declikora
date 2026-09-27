// Lecture d'une demande faite à la fonction « files » (sans dépendance, testée à part).

export type Mode = "kick" | "audit" | "clean"

/** Lit le mode demandé ({} ou corps vide : « kick »). */
export function parseMode(body: unknown): Mode | null {
  if (body === undefined || body === null) return "kick"
  if (typeof body !== "object" || Array.isArray(body)) return null
  const mode = (body as Record<string, unknown>).mode ?? "kick"
  return mode === "kick" || mode === "audit" || mode === "clean" ? mode : null
}

/** Jeton de session d'un membre, s'il y en a un (un JWT, pas une clé sb_). */
export function memberToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i)
  if (!match) return null
  return match[1].split(".").length === 3 ? match[1] : null
}

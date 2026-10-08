// La langue de l'admin, choisie une fois au chargement : les textes (`@/texts`), les dates et
// les nombres la lisent. En changer recharge la page (ADMIN § 7, « En anglais et en français »).

export const LANGUAGES = ["en", "fr"] as const
export type Language = (typeof LANGUAGES)[number]

// L'anglais au départ, tant que le membre n'a rien choisi dans Mon compte (les parcours
// Playwright construisent l'admin en français : VITE_DEFAULT_LANGUAGE).
const DEFAULT_LANGUAGE: Language = isLanguage(
  import.meta.env.VITE_DEFAULT_LANGUAGE
)
  ? import.meta.env.VITE_DEFAULT_LANGUAGE
  : "en"

const LANGUAGE_STORAGE_KEY = "declikora-langue"

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

/** La langue gardée sur ce navigateur (celle du membre, retenue à sa dernière visite). */
function readLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Stockage indisponible : la langue de départ.
  }
  return DEFAULT_LANGUAGE
}

export const language: Language = readLanguage()

/** Pour Intl : les dates et les nombres de la langue (« 1 000 », « 1,000 »). */
export const locale = language === "fr" ? "fr-FR" : "en-US"

/** La langue choisie par le membre dans Mon compte, rangée sur son compte ; null s'il n'a rien choisi. */
export function memberLanguage(
  metadata: Record<string, unknown> | undefined
): Language | null {
  const chosen = metadata?.language
  return isLanguage(chosen) ? chosen : null
}

/**
 * Garde la langue sur ce navigateur et recharge la page si elle change : tous les textes,
 * même ceux lus au chargement d'un module, passent dans la nouvelle langue.
 */
export function applyLanguage(next: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
  } catch {
    // Le choix ne survivra pas au rechargement ; il reste enregistré sur le compte.
  }
  if (next !== language) window.location.reload()
}

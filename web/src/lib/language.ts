// La langue de l'admin, choisie une fois au chargement : les textes (`@/texts`), les dates et
// les nombres la lisent. En changer recharge la page (ADMIN § 7, « En anglais et en français »).
// Celle du membre (Mon compte) passe avant celle de toute l'admin (Paramètres › Avancé) ; les deux
// sont gardées sur ce navigateur pour être connues dès le chargement, connexion comprise.

export const LANGUAGES = ["en", "fr"] as const
export type Language = (typeof LANGUAGES)[number]

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

// L'anglais au départ, tant que rien n'est choisi (les parcours Playwright construisent l'admin
// en français : VITE_DEFAULT_LANGUAGE).
const DEFAULT_LANGUAGE: Language = isLanguage(
  import.meta.env.VITE_DEFAULT_LANGUAGE
)
  ? import.meta.env.VITE_DEFAULT_LANGUAGE
  : "en"

// La langue choisie par le membre, et celle de toute l'admin, retenues à la dernière visite.
const MEMBER_KEY = "declikora-langue"
const ADMIN_KEY = "declikora-langue-admin"

function read(key: string): Language | null {
  try {
    const stored = localStorage.getItem(key)
    return isLanguage(stored) ? stored : null
  } catch {
    // Stockage indisponible.
    return null
  }
}

function write(key: string, value: Language | null): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Le choix vaut pour cette visite ; il reste enregistré sur le compte ou dans la base.
  }
}

function effectiveLanguage(): Language {
  return read(MEMBER_KEY) ?? read(ADMIN_KEY) ?? DEFAULT_LANGUAGE
}

export const language: Language = effectiveLanguage()

/** Pour Intl : les dates et les nombres de la langue (« 1 000 », « 1,000 »). */
export const locale = language === "fr" ? "fr-FR" : "en-US"

/** La langue choisie par le membre dans Mon compte, rangée sur son compte ; null s'il suit l'admin. */
export function memberLanguage(
  metadata: Record<string, unknown> | undefined
): Language | null {
  const chosen = metadata?.language
  return isLanguage(chosen) ? chosen : null
}

// Recharge la page si la langue qui s'applique a changé : tous les textes, même ceux lus au
// chargement d'un module, passent dans la nouvelle langue.
function reloadIfChanged(): void {
  if (effectiveLanguage() !== language) window.location.reload()
}

/** La langue du membre (null : celle de l'admin), gardée sur ce navigateur. */
export function applyMemberLanguage(next: Language | null): void {
  write(MEMBER_KEY, next)
  reloadIfChanged()
}

/** La langue de toute l'admin (Paramètres › Avancé), gardée sur ce navigateur. */
export function applyAdminLanguage(next: Language): void {
  write(ADMIN_KEY, next)
  reloadIfChanged()
}

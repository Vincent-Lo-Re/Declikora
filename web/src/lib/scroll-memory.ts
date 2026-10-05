/**
 * Retrouver sa place en revenant à une liste (ADMIN § 7, « Une navigation sans à-coups ») : la
 * position de défilement et les réglages (l'adresse) de chaque page, par son chemin, et le dernier
 * contenu ouvert dans un
 * éditeur, dont la ligne s'allume un instant au retour. Une page ouverte en avançant (le menu,
 * un lien) commence en haut. Sans React.
 */

const positions = new Map<string, number>()
const searches = new Map<string, string>()
let opened: string | null = null

/** Les réglages de la page de ce chemin (« ?etat=brouillon »), relevés à chaque changement. */
export function rememberSearch(path: string, search: string) {
  searches.set(path, search)
}

/** Où mène un lien de retour vers une liste : elle, avec ses derniers réglages. */
export function returnAddress(path: string): string {
  return `${path}${searches.get(path) ?? ""}`
}

/** Où en est la page de ce chemin (relevé à chaque défilement). */
export function rememberScroll(path: string, top: number) {
  positions.set(path, top)
}

/** La dernière position connue de la page de ce chemin (0 : jamais vue). */
export function scrollOf(path: string): number {
  return positions.get(path) ?? 0
}

/** Un éditeur vient de s'ouvrir sur ce contenu. */
export function rememberOpened(contentId: string) {
  opened = contentId
}

/** Le dernier contenu ouvert dans un éditeur, oublié une fois lu. */
export function takeOpened(): string | null {
  const id = opened
  opened = null
  return id
}

/** L'état d'un lien qui revient sur ses pas (« ← Le Fil » d'un éditeur, par exemple). */
export const RETURN_STATE = { retour: true } as const

/** Une arrivée qui revient sur ses pas : le retour du navigateur, ou un lien de retour. */
export function isReturn(state: unknown, navigationType: string): boolean {
  return (
    navigationType === "POP" ||
    (state !== null &&
      typeof state === "object" &&
      "retour" in state &&
      state.retour === true)
  )
}

// Le temps qu'on laisse à une page pour grandir (ses lignes lues) avant d'abandonner.
const PATIENCE_MS = 1500

/** Ramène la fenêtre à une position, en réessayant tant que la page n'est pas assez haute. */
export function scrollWindowBackTo(
  top: number,
  until = performance.now() + PATIENCE_MS
) {
  window.scrollTo(0, top)
  if (window.scrollY < top - 1 && performance.now() < until) {
    requestAnimationFrame(() => scrollWindowBackTo(top, until))
  }
}

/** Allume un instant la ligne d'un contenu (data-content-row) dès qu'elle apparaît. */
export function lightRowSoon(
  contentId: string,
  until = performance.now() + PATIENCE_MS
) {
  const row = document.querySelector<HTMLElement>(
    `[data-content-row="${contentId}"]`
  )
  if (!row) {
    if (performance.now() < until) {
      requestAnimationFrame(() => lightRowSoon(contentId, until))
    }
    return
  }
  row.scrollIntoView({ block: "nearest" })
  row.removeAttribute("data-returned")
  // Lire une mesure fait repartir l'animation de zéro.
  void row.offsetWidth
  row.setAttribute("data-returned", "")
  row.addEventListener(
    "animationend",
    () => row.removeAttribute("data-returned"),
    {
      once: true,
    }
  )
}

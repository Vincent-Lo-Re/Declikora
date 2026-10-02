/**
 * Le mode Concentration de l'éditeur du Fil (docs/ADMINISTRATION.md, § 4) : ⌘ . sur Mac,
 * Ctrl + . ailleurs, le met ou l'enlève ; Échap l'enlève. Sans React.
 */

/** Vrai sur un Mac (et un iPad) : le raccourci passe par ⌘. */
export function isApple(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform)
}

/** Le raccourci qui met ou enlève le mode Concentration. */
export function isFocusShortcut(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">,
  apple: boolean
): boolean {
  return (
    event.key === "." &&
    !event.altKey &&
    (apple ? event.metaKey : event.ctrlKey && !event.metaKey)
  )
}

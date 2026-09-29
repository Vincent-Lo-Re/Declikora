// Temps laissé à un élément pour pouvoir prendre le focus : sur une machine lente, une fenêtre
// de confirmation peut mettre plus d'une demi-seconde à se refermer.
const FOCUS_PATIENCE_MS = 2000

/**
 * Met le focus sur un élément dès qu'il peut le prendre : aucune fenêtre ni aucun menu n'est
 * ouvert (tant qu'ils sont là, ils gardent le focus pour eux et le reprendraient), l'élément
 * existe et n'est plus grisé. Réessaie à chaque image, pendant FOCUS_PATIENCE_MS au plus.
 */
export function focusSoon(
  find: () => HTMLElement | null,
  until = performance.now() + FOCUS_PATIENCE_MS
) {
  if (
    !document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"]'
    )
  ) {
    const element = find()
    element?.focus()
    if (element && document.activeElement === element) return
  }
  if (performance.now() < until) {
    requestAnimationFrame(() => focusSoon(find, until))
  }
}

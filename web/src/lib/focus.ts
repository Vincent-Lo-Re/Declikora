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
  until = performance.now() + FOCUS_PATIENCE_MS,
  // preventScroll : l'élément est déjà amené sous les yeux (highlightSoon).
  options?: FocusOptions
) {
  if (
    !document.querySelector(
      '[role="dialog"], [role="alertdialog"], [role="menu"]'
    )
  ) {
    const element = find()
    element?.focus(options)
    if (element && document.activeElement === element) return
  }
  if (performance.now() < until) {
    requestAnimationFrame(() => focusSoon(find, until, options))
  }
}

/**
 * Montre une zone à régler dès qu'elle existe : elle vient sous les yeux, et sa bordure s'allume
 * deux fois (index.css, [data-highlight]). Un second appel relance l'animation. Réessaie à
 * chaque image, pendant FOCUS_PATIENCE_MS au plus (le temps qu'un onglet s'ouvre).
 */
export function highlightSoon(
  find: () => HTMLElement | null,
  until = performance.now() + FOCUS_PATIENCE_MS
) {
  const element = find()
  if (!element) {
    if (performance.now() < until) {
      requestAnimationFrame(() => highlightSoon(find, until))
    }
    return
  }
  element.scrollIntoView({ block: "nearest", behavior: "smooth" })
  element.removeAttribute("data-highlight")
  // Lire une mesure fait repartir l'animation de zéro.
  void element.offsetWidth
  element.setAttribute("data-highlight", "")
  element.addEventListener(
    "animationend",
    () => element.removeAttribute("data-highlight"),
    { once: true }
  )
}

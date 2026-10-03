// Où va le focus dans l'éditeur de blocs, après un geste : des recherches dans la page (les
// blocs et les lignes du plan portent leur identifiant). Sans React.

/**
 * Met le focus sur un élément dès qu'il apparaît (dans les prochains rendus), même si un panneau
 * est ouvert : contrairement à focusSoon (lib/focus.ts), qui attend qu'aucune fenêtre ne le soit.
 */
export function focusOnceShown(find: () => HTMLElement | null, attempts = 20) {
  const element = find()
  if (element) {
    element.focus()
    return
  }
  if (attempts > 0) {
    requestAnimationFrame(() => focusOnceShown(find, attempts - 1))
  }
}

/**
 * Où va le focus après un geste sur un bloc (voisin d'un bloc supprimé, bloc détaché, modèle
 * inséré) : sa poignée dans l'aperçu (et non celle d'un bloc de sa section) ; dans l'éditeur du
 * Fil, dont l'aperçu n'a pas de poignée, sa ligne du plan.
 */
export function blockAnchor(id: string, feed: boolean): HTMLElement | null {
  if (feed) {
    return document.querySelector<HTMLElement>(`[data-outline-id="${id}"]`)
  }
  return (
    document
      .querySelector(`[data-block-id="${id}"]`)
      ?.querySelector<HTMLElement>(
        ":scope > .blocks-handle-rail [data-block-handle]"
      ) ?? null
  )
}

/**
 * Met le curseur dans un bloc qui vient d'apparaître (l'éditeur Tiptap se crée juste après).
 * `top` : le bloc monte en haut de l'écran du téléphone (choisi dans le plan du Fil) ; sinon,
 * l'écran ne défile que s'il le faut.
 */
export function focusBlockSoon(id: string, attempts = 20, top = false) {
  const element = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
  const found = element?.querySelector<HTMLElement>('[contenteditable="true"]')
  // Le texte du bloc lui-même : pas celui d'un bloc de sa section, qui deviendrait le bloc
  // choisi en recevant le curseur.
  const editable =
    found && found.closest("[data-block-id]") === element ? found : null
  const scroll = () =>
    element?.scrollIntoView({
      block: top ? "start" : "nearest",
      behavior: "smooth",
    })
  if (editable) {
    // D'abord le curseur, puis le défilement : le navigateur ramène l'écran au curseur quand il
    // le pose, ce qui interromprait un défilement déjà commencé.
    editable.focus({ preventScroll: true })
    requestAnimationFrame(scroll)
    return
  }
  scroll()
  if (attempts > 0) {
    requestAnimationFrame(() => focusBlockSoon(id, attempts - 1, top))
  }
}

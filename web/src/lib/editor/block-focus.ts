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
 * Où va le focus après un geste sur un bloc (voisin d'un bloc supprimé, bloc détaché) : sa ligne
 * du plan, l'aperçu n'ayant pas de poignée.
 */
export function blockAnchor(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-outline-id="${id}"]`)
}

/** Le plus long qu'on attende la fin d'un défilement doux avant de poser le curseur. */
export const SCROLL_WAIT_MS = 1000

/** Le premier ancêtre qui défile (l'écran du téléphone). */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === "auto" || overflowY === "scroll") return node
  }
  return null
}

/**
 * Appelle `then` quand le défilement qui commence dans `scroller` s'arrête : tout de suite s'il
 * ne bouge pas, au plus tard après SCROLL_WAIT_MS.
 */
function afterScroll(scroller: HTMLElement | null, then: () => void) {
  if (!scroller) {
    then()
    return
  }
  const start = scroller.scrollTop
  let timer = 0
  let done = false
  const finish = () => {
    if (done) return
    done = true
    scroller.removeEventListener("scrollend", finish)
    window.clearTimeout(timer)
    then()
  }
  scroller.addEventListener("scrollend", finish)
  timer = window.setTimeout(finish, SCROLL_WAIT_MS)
  // Le bloc est déjà à sa place : rien n'a bougé après deux images, pas d'attente.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (scroller.scrollTop === start) finish()
    })
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
  if (editable && element && top) {
    // D'abord le défilement, puis le curseur une fois arrivé : au premier focus, l'éditeur replace
    // sa sélection un instant après, et le navigateur ramène alors l'écran au curseur, ce qui
    // couperait le défilement. Si le focus est allé ailleurs entre-temps, il y reste.
    const before = document.activeElement
    afterScroll(scrollParent(element), () => {
      const now = document.activeElement
      if (!editable.isConnected || (now !== before && now !== document.body)) {
        return
      }
      editable.focus({ preventScroll: true })
    })
    scroll()
    return
  }
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

/**
 * En Lecture, un bloc choisi dans le plan monte en haut de l'écran du téléphone, sans être choisi
 * (QCM du 04/10/2026) ; rien s'il n'est pas montré (section vide, contenu réservé).
 */
export function scrollToReadBlock(id: string) {
  document
    .querySelector<HTMLElement>(`[data-read-block="${id}"]`)
    ?.scrollIntoView({ block: "start", behavior: "smooth" })
}

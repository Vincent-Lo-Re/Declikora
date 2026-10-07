import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// Chaque test repart d'une page vide.
afterEach(() => cleanup())

// jsdom ne connaît pas matchMedia, utilisé par le thème et le menu.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom ne connaît pas non plus elementFromPoint, utilisé par la saisie des codes (input-otp).
if (!document.elementFromPoint) {
  document.elementFromPoint = () => null
}

// jsdom ne mesure rien : ProseMirror (Tiptap) demande la position du curseur pour faire défiler.
if (!Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}
if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => [] as unknown as DOMRectList
}

// jsdom ne fait pas défiler : le plan amène sous les yeux la ligne du bloc choisi.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom ne connaît pas ResizeObserver, utilisé par la recherche de l'aide (Command de shadcn, cmdk).
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom ne fait pas défiler la fenêtre (window.scrollTo n'y est qu'annoncé) : la position demandée
// est retenue dans scrollY, pour vérifier qu'une liste retrouve sa place (useScrollMemory).
window.scrollTo = ((first?: number | ScrollToOptions, second?: number) => {
  const top =
    typeof first === "number" ? (second ?? 0) : (first?.top ?? window.scrollY)
  Object.defineProperty(window, "scrollY", { value: top, configurable: true })
}) as typeof window.scrollTo

// jsdom n'observe ni la taille ni la visibilité des éléments : le carrousel des étapes de la
// connexion (Embla, components/auth/auth-slides.tsx) s'en sert.
class SilentObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (!("IntersectionObserver" in window)) {
  Object.assign(window, { IntersectionObserver: SilentObserver })
}
if (!("ResizeObserver" in window)) {
  Object.assign(window, { ResizeObserver: SilentObserver })
}

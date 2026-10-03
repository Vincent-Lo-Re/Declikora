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

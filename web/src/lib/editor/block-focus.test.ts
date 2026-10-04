import { afterEach, describe, expect, it, vi } from "vitest"

import { blockAnchor, focusBlockSoon } from "@/lib/editor/block-focus"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("où va le focus après un geste sur un bloc", () => {
  it("la ligne du plan du bloc (l'aperçu n'a pas de poignée)", () => {
    document.body.innerHTML = `
      <button data-outline-id="b1">ligne</button>
      <div data-block-id="b1"></div>`
    expect(blockAnchor("b1")?.textContent).toBe("ligne")
    expect(blockAnchor("absent")).toBeNull()
  })

  it("le curseur va dans le texte du bloc lui-même, pas dans celui d'un bloc de sa section", () => {
    Element.prototype.scrollIntoView = vi.fn()
    document.body.innerHTML = `
      <div data-block-id="section">
        <div data-block-id="texte"><div contenteditable="true">intérieur</div></div>
      </div>
      <div data-block-id="seul"><div contenteditable="true">seul</div></div>`
    focusBlockSoon("section", 0)
    expect(document.activeElement).toBe(document.body)
    focusBlockSoon("seul", 0)
    expect(document.activeElement?.textContent).toBe("seul")
  })
})

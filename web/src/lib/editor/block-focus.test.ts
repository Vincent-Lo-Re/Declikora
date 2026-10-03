import { afterEach, describe, expect, it, vi } from "vitest"

import { blockAnchor, focusBlockSoon } from "@/lib/editor/block-focus"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("où va le focus après un geste sur un bloc", () => {
  it("éditeur du Fil : la ligne du plan ; ailleurs : la poignée du bloc, pas celle d'un bloc de sa section", () => {
    document.body.innerHTML = `
      <button data-outline-id="b1">ligne</button>
      <div data-block-id="b1">
        <span class="blocks-handle-rail"><button data-block-handle>poignée</button></span>
        <div data-block-id="b2">
          <span class="blocks-handle-rail"><button data-block-handle>intérieure</button></span>
        </div>
      </div>`
    expect(blockAnchor("b1", true)?.textContent).toBe("ligne")
    expect(blockAnchor("b1", false)?.textContent).toBe("poignée")
    expect(blockAnchor("absent", true)).toBeNull()
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

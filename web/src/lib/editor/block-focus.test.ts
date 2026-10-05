import { afterEach, describe, expect, it, vi } from "vitest"

import {
  blockAnchor,
  focusBlockSoon,
  SCROLL_WAIT_MS,
} from "@/lib/editor/block-focus"

afterEach(() => {
  document.body.innerHTML = ""
  vi.useRealTimers()
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

  describe("un bloc choisi dans le plan (il monte en haut de l'écran)", () => {
    /** L'écran du téléphone, qui défile, avec un bloc dedans et la ligne du plan cliquée. */
    function phone() {
      document.body.innerHTML = `
        <button data-outline-id="b1">ligne</button>
        <div id="ecran" style="overflow-y: auto">
          <div data-block-id="b1"><div contenteditable="true">texte</div></div>
        </div>
        <input id="ailleurs" />`
      document.querySelector<HTMLElement>("[data-outline-id]")?.focus()
      const screen = document.getElementById("ecran") as HTMLElement
      const text = document.querySelector<HTMLElement>("[contenteditable]")
      return { screen, text }
    }

    /** Le défilement doux : l'écran bouge, puis « scrollend » quand il s'arrête. */
    function scrolling(screen: HTMLElement) {
      Element.prototype.scrollIntoView = vi.fn(() => {
        screen.scrollTop = 300
      })
    }

    it("le curseur attend la fin du défilement", () => {
      vi.useFakeTimers()
      const { screen, text } = phone()
      scrolling(screen)
      focusBlockSoon("b1", 0, true)
      vi.advanceTimersToNextFrame()
      vi.advanceTimersToNextFrame()
      expect(document.activeElement).not.toBe(text)
      screen.dispatchEvent(new Event("scrollend"))
      expect(document.activeElement).toBe(text)
    })

    it("sans défilement à faire, le curseur se pose tout de suite", () => {
      vi.useFakeTimers()
      const { text } = phone()
      Element.prototype.scrollIntoView = vi.fn()
      focusBlockSoon("b1", 0, true)
      vi.advanceTimersToNextFrame()
      vi.advanceTimersToNextFrame()
      expect(document.activeElement).toBe(text)
    })

    it("sans « scrollend », le curseur se pose quand même, au plus tard", () => {
      vi.useFakeTimers()
      const { screen, text } = phone()
      scrolling(screen)
      focusBlockSoon("b1", 0, true)
      vi.advanceTimersByTime(SCROLL_WAIT_MS - 50)
      expect(document.activeElement).not.toBe(text)
      vi.advanceTimersByTime(50)
      expect(document.activeElement).toBe(text)
    })

    it("un focus mis ailleurs pendant le défilement y reste", () => {
      vi.useFakeTimers()
      const { screen } = phone()
      scrolling(screen)
      focusBlockSoon("b1", 0, true)
      const elsewhere = document.getElementById("ailleurs") as HTMLElement
      elsewhere.focus()
      screen.dispatchEvent(new Event("scrollend"))
      expect(document.activeElement).toBe(elsewhere)
    })
  })
})

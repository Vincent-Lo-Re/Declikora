import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import {
  BlocksEditorContext,
  type BlocksEditorValue,
} from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import { texts } from "@/texts"

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

const draft: Draft = {
  v: 1,
  title: "Essai",
  blocks: [
    {
      id: id(1),
      type: "text",
      doc: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Bonjour" }] },
        ],
      },
    },
    { id: id(2), type: "box", look: "fill", blocks: [] },
  ],
}

function renderCanvas(onChange = vi.fn()) {
  const value: BlocksEditorValue = {
    editable: true,
    selectedId: null,
    selectBlock: () => {},
    updateBlock: () => {},
    setActiveText: () => {},
    mediaFor: () => ({ state: "none" }),
    openPicker: () => {},
    addToBox: () => {},
    templateFor: () => ({ state: "missing" }),
    detachBlock: () => {},
  }
  function Harness() {
    const [current, setCurrent] = useState(draft)
    return (
      <BlocksEditorContext value={value}>
        <BlockCanvas
          draft={current}
          onChange={(update) => {
            onChange()
            setCurrent(update)
          }}
        />
      </BlocksEditorContext>
    )
  }
  render(<Harness />)
  return onChange
}

/** Tout ce que la région « live » de dnd-kit annonce aux lecteurs d'écran. */
function recordAnnouncements(): () => string {
  const heard: string[] = []
  const observer = new MutationObserver(() => {
    for (const region of document.querySelectorAll('[id^="DndLiveRegion"]')) {
      if (region.textContent && heard.at(-1) !== region.textContent) {
        heard.push(region.textContent)
      }
    }
  })
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  return () => heard.join(" | ")
}

describe("glisser-déposer par la poignée", () => {
  it("Espace et Entrée tapés dans un bloc Texte ne déplacent pas le bloc", async () => {
    const onChange = renderCanvas()
    const announcements = recordAnnouncements()
    const text = await waitFor(() => {
      const element = document.querySelector<HTMLElement>(".ProseMirror")
      expect(element).not.toBeNull()
      return element!
    })
    text.focus()
    for (const [code, key] of [
      ["Space", " "],
      ["Enter", "Enter"],
    ]) {
      fireEvent.keyDown(text, { code, key })
      fireEvent.keyUp(text, { code, key })
    }
    expect(announcements()).not.toContain("Tu as pris")
    expect(onChange).not.toHaveBeenCalled()
    for (const handle of screen.getAllByRole("button", { name: /Déplacer/ })) {
      expect(handle).not.toHaveAttribute("aria-pressed", "true")
    }
  })

  it("la poignée se prend au clavier (Espace), avec les annonces en français", async () => {
    renderCanvas()
    const announcements = recordAnnouncements()
    const handle = screen.getByRole("button", {
      name: texts.editor.handle("Texte « Bonjour »"),
    })
    expect(handle).toHaveAttribute(
      "aria-roledescription",
      texts.editor.dnd.roleDescription
    )
    handle.focus()
    await act(async () => {
      fireEvent.keyDown(handle, { code: "Space", key: " " })
    })
    await waitFor(() =>
      expect(announcements()).toContain(
        texts.editor.dnd.start("Texte « Bonjour »")
      )
    )
    await act(async () => {
      fireEvent.keyDown(handle, { code: "Escape", key: "Escape" })
    })
    await waitFor(() =>
      expect(announcements()).toContain(
        texts.editor.dnd.cancel("Texte « Bonjour »")
      )
    )
  })

  it("donne des consignes en français aux lecteurs d'écran", () => {
    renderCanvas()
    expect(screen.getByText(texts.editor.dnd.instructions)).toBeInTheDocument()
  })
})

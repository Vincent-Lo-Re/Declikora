import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import { StaticBlock } from "@/blocks/components/static-block"
import {
  BlocksEditorContext,
  type BlocksEditorValue,
} from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import type { Media } from "@/lib/media/constants"
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

function renderCanvas(changes: Partial<BlocksEditorValue> = {}) {
  const value: BlocksEditorValue = {
    editable: true,
    selectedId: null,
    selectBlock: () => {},
    updateBlock: () => {},
    setActiveText: () => {},
    mediaFor: () => ({ state: "none" }),
    openPicker: () => {},
    templateFor: () => ({ state: "missing" }),
    ...changes,
  }
  render(
    <BlocksEditorContext value={value}>
      <BlockCanvas draft={draft} />
    </BlocksEditorContext>
  )
}

describe("le téléphone en Édition", () => {
  it("pas de poignée (les blocs se rangent dans le plan) ; un clic choisit le bloc", async () => {
    const selectBlock = vi.fn()
    renderCanvas({ selectBlock, selectedId: id(2) })
    await waitFor(() =>
      expect(document.querySelector(".ProseMirror")).not.toBeNull()
    )
    expect(screen.queryByRole("button", { name: /Déplacer/ })).toBeNull()
    fireEvent.pointerDown(document.querySelector(".ProseMirror")!)
    expect(selectBlock).toHaveBeenCalledWith(id(1))
    expect(
      document.querySelector(`[data-block-id="${id(2)}"]`)
    ).toHaveAttribute("data-selected")
  })

  it("une section vide le dit ; « Ajouter dans la section » ouvre les Blocs pour elle", () => {
    const onAddInBox = vi.fn()
    renderCanvas({ onAddInBox })
    expect(screen.getByText(texts.editor.emptyBox)).toBeVisible()
    fireEvent.click(
      screen.getByRole("button", { name: texts.editor.add.inBox })
    )
    expect(onAddInBox).toHaveBeenCalledWith(id(2))
  })
})

describe("aperçu tel quel (Lecture, bloc d'un modèle)", () => {
  const value: BlocksEditorValue = {
    editable: false,
    selectedId: null,
    selectBlock: () => {},
    updateBlock: () => {},
    setActiveText: () => {},
    mediaFor: (mediaId) =>
      mediaId
        ? {
            state: "ready",
            media: { kind: "svg", width: 120, height: 120 } as Media,
            url: "blob:logo",
          }
        : { state: "none" },
    openPicker: () => {},
    templateFor: () => ({ state: "missing" }),
  }

  it("une section vide ne s'affiche pas, comme dans l'app", () => {
    const { container } = render(
      <BlocksEditorContext value={value}>
        <StaticBlock
          block={{ id: id(3), type: "box", look: "border", blocks: [] }}
        />
      </BlocksEditorContext>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("un SVG garde sa taille réelle, sans dépasser la largeur", () => {
    render(
      <BlocksEditorContext value={value}>
        <StaticBlock
          block={{
            id: id(4),
            type: "image",
            mediaId: id(5),
            caption: null,
            alt: "Logo",
          }}
        />
      </BlocksEditorContext>
    )
    const logo = screen.getByRole("img", { name: "Logo" })
    expect(logo).toHaveAttribute("data-natural")
    expect(logo.style.maxWidth).toBe("120px")
  })
})

import { describe, expect, it } from "vitest"

import { createBlock } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import { isEmptyText, replaceBlock, slashChoices } from "@/lib/editor/slash"

function draftOf(blocks: Draft["blocks"]): Draft {
  return { v: 1, title: "", summary: null, cover: null, audio: null, blocks }
}

describe("« / »", () => {
  const first = createBlock("text")
  const inner = createBlock("text")
  const box = { ...createBlock("box"), blocks: [inner] }
  const draft = draftOf([first, box])

  it("propose l'encadré et Mes blocs au premier niveau, pas dans un encadré", () => {
    expect(slashChoices(draft, first.id)).toEqual([
      "text",
      "image",
      "box",
      "mine",
    ])
    expect(slashChoices(draft, inner.id)).toEqual(["text", "image"])
  })

  it("remplace le texte par le bloc choisi, à la même place", () => {
    const image = createBlock("image")
    const next = replaceBlock(draft, first.id, image)!
    expect(next.blocks.map((block) => block.id)).toEqual([image.id, box.id])
    const inBox = replaceBlock(draft, inner.id, image)!
    const updated = inBox.blocks[1]
    expect(updated.type === "box" && updated.blocks[0].id).toBe(image.id)
    // Un encadré ne va pas dans un encadré.
    expect(replaceBlock(draft, inner.id, createBlock("box"))).toBeNull()
    expect(replaceBlock(draft, "inconnu", image)).toBeNull()
  })

  it("reconnaît un texte vide", () => {
    expect(isEmptyText(draft, first.id)).toBe(true)
    expect(isEmptyText(draft, box.id)).toBe(false)
    const written = {
      ...first,
      doc: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Bonjour" }] },
        ],
      },
    } as Draft["blocks"][number]
    expect(isEmptyText(draftOf([written]), first.id)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import { createBlock } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import { liveBoxTarget } from "@/lib/editor/library-target"

function draftOf(blocks: Draft["blocks"]): Draft {
  return { v: 1, title: "", cover: null, audio: null, blocks }
}

describe("« Ajouter dans la section »", () => {
  const text = createBlock("text")
  const box = createBlock("box")
  const draft = draftOf([text, box])

  it("garde la section tant qu'elle est le bloc choisi", () => {
    expect(liveBoxTarget(draft, box.id, box.id)).toBe(box.id)
    // Un autre bloc choisi, un bloc qui n'est pas une section, une section disparue : plus de cible.
    expect(liveBoxTarget(draft, box.id, text.id)).toBeNull()
    expect(liveBoxTarget(draft, text.id, text.id)).toBeNull()
    expect(liveBoxTarget(draftOf([text]), box.id, box.id)).toBeNull()
    expect(liveBoxTarget(draft, null, box.id)).toBeNull()
  })
})

import { describe, expect, it } from "vitest"

import { canDropOn, moveOnDrop, moveOver, zoneId } from "@/blocks/dnd"
import {
  canDropInto,
  createBlock,
  findBlock,
  insertionPoint,
  moveBlock,
  prepareDraft,
  removeBlock,
  shiftBlock,
} from "@/blocks/draft"
import { ROOT, type BoxBlock, type Draft } from "@/blocks/types"

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

// La page : T1, I2, Encadré 3 (T4, I5), T6, Encadré 7 (vide).
function sample(): Draft {
  return {
    v: 1,
    title: "Essai",
    blocks: [
      {
        id: id(1),
        type: "text",
        doc: { type: "doc", content: [{ type: "paragraph" }] },
      },
      { id: id(2), type: "image", mediaId: null, caption: null, alt: null },
      {
        id: id(3),
        type: "box",
        look: "fill",
        blocks: [
          {
            id: id(4),
            type: "text",
            doc: { type: "doc", content: [{ type: "paragraph" }] },
          },
          { id: id(5), type: "image", mediaId: null, caption: null, alt: null },
        ],
      },
      {
        id: id(6),
        type: "text",
        doc: { type: "doc", content: [{ type: "paragraph" }] },
      },
      { id: id(7), type: "box", look: "border", blocks: [] },
    ],
  }
}

const order = (draft: Draft) =>
  draft.blocks.map((block) =>
    block.type === "box"
      ? `${block.id.slice(-1)}[${block.blocks.map((child) => child.id.slice(-1)).join(",")}]`
      : block.id.slice(-1)
  )

describe("règle de dépôt dans un encadré", () => {
  it("un Texte ou une Image vont dans un encadré, pas un encadré ni un bloc lié", () => {
    expect(canDropInto("text", id(3))).toBe(true)
    expect(canDropInto("image", id(3))).toBe(true)
    expect(canDropInto("box", id(3))).toBe(false)
    expect(canDropInto("linked", id(3))).toBe(false)
    expect(canDropInto("box", ROOT)).toBe(true)
  })

  it("refuse un encadré au-dessus d'un bloc d'encadré ou de la zone d'un encadré", () => {
    const draft = sample()
    expect(canDropOn(draft, id(7), id(4))).toBe(false)
    expect(canDropOn(draft, id(7), zoneId(id(3)))).toBe(false)
    expect(moveOver(draft, id(7), id(4), false)).toBeNull()
    expect(moveOver(draft, id(7), zoneId(id(3)), false)).toBeNull()
    expect(moveBlock(draft, id(7), id(3), 0)).toBeNull()
    // Un encadré ne va pas non plus dans lui-même.
    expect(canDropOn(draft, id(3), zoneId(id(3)))).toBe(false)
  })

  it("un Texte entre dans un encadré (au-dessus d'un de ses blocs, ou dans sa zone)", () => {
    const draft = sample()
    expect(order(moveOver(draft, id(1), id(5), false)!)).toEqual([
      "2",
      "3[4,1,5]",
      "6",
      "7[]",
    ])
    expect(order(moveOver(draft, id(1), id(5), true)!)).toEqual([
      "2",
      "3[4,5,1]",
      "6",
      "7[]",
    ])
    // Encadré vide : par sa zone.
    expect(order(moveOver(draft, id(6), zoneId(id(7)), false)!)).toEqual([
      "1",
      "2",
      "3[4,5]",
      "7[6]",
    ])
  })

  it("un bloc sort d'un encadré en passant au-dessus d'un bloc de la page", () => {
    const draft = sample()
    expect(order(moveOver(draft, id(4), id(6), true)!)).toEqual([
      "1",
      "2",
      "3[5]",
      "6",
      "4",
      "7[]",
    ])
  })

  it("au dépôt, réordonne dans le même conteneur", () => {
    const draft = sample()
    expect(order(moveOnDrop(draft, id(1), id(6))!)).toEqual([
      "2",
      "3[4,5]",
      "6",
      "1",
      "7[]",
    ])
    expect(order(moveOnDrop(draft, id(6), id(1))!)).toEqual([
      "6",
      "1",
      "2",
      "3[4,5]",
      "7[]",
    ])
    expect(order(moveOnDrop(draft, id(5), id(4))!)).toEqual([
      "1",
      "2",
      "3[5,4]",
      "6",
      "7[]",
    ])
    // Pas de conteneur différent au dépôt (déjà fait pendant le survol).
    expect(moveOnDrop(draft, id(1), id(4))).toBeNull()
    expect(moveOnDrop(draft, id(1), id(1))).toBeNull()
  })

  it("le brouillon obtenu reste accepté par le validateur de la base", () => {
    const moved = moveOver(sample(), id(1), zoneId(id(7)), false)!
    expect(prepareDraft(moved).ok).toBe(true)
  })
})

describe("opérations sur les blocs", () => {
  it("ajoute après le bloc choisi, dans son encadré s'il le permet", () => {
    const draft = sample()
    expect(insertionPoint(draft, "text", id(4))).toEqual({
      container: id(3),
      index: 1,
    })
    // Un encadré choisi dans un encadré : après cet encadré, dans la page.
    expect(insertionPoint(draft, "box", id(4))).toEqual({
      container: ROOT,
      index: 3,
    })
    expect(insertionPoint(draft, "image", null)).toEqual({
      container: ROOT,
      index: 5,
    })
  })

  it("monte, descend et supprime un bloc", () => {
    const draft = sample()
    expect(order(shiftBlock(draft, id(2), -1)!)).toEqual([
      "2",
      "1",
      "3[4,5]",
      "6",
      "7[]",
    ])
    expect(order(shiftBlock(draft, id(5), -1)!)).toEqual([
      "1",
      "2",
      "3[5,4]",
      "6",
      "7[]",
    ])
    expect(shiftBlock(draft, id(1), -1)).toBeNull()
    expect(order(removeBlock(draft, id(4)))).toEqual([
      "1",
      "2",
      "3[5]",
      "6",
      "7[]",
    ])
    expect(findBlock(removeBlock(draft, id(3)), id(4))).toBeNull()
  })

  it("crée des blocs vides valides, avec de nouveaux identifiants", () => {
    const box = createBlock("box") as BoxBlock
    const draft: Draft = {
      v: 1,
      title: "",
      blocks: [createBlock("text"), createBlock("image"), box],
    }
    expect(new Set(draft.blocks.map((block) => block.id)).size).toBe(3)
    expect(prepareDraft(draft).ok).toBe(true)
  })

  it("refuse un brouillon trop lourd avant de l'envoyer", () => {
    const text = "x".repeat(250_000)
    const draft: Draft = {
      v: 1,
      title: "",
      blocks: [
        {
          id: id(1),
          type: "text",
          doc: {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
        },
      ],
    }
    expect(prepareDraft(draft)).toMatchObject({
      ok: false,
      reason: "too_large",
    })
  })

  it("donne la position du bloc mal formé", () => {
    const draft = sample()
    draft.blocks.push({
      id: "pas-un-uuid",
      type: "image",
      mediaId: null,
      caption: null,
      alt: null,
    })
    expect(prepareDraft(draft)).toMatchObject({
      ok: false,
      reason: "invalid",
      position: 6,
    })
  })
})

import { describe, expect, it } from "vitest"

import { validateDraft } from "@/blocks/generated/validators"
import {
  canShift,
  DRAFT_MAX_BYTES,
  findBlock,
  prepareDraft,
  readingStats,
  shiftBlock,
  shiftLeavesBox,
} from "@/blocks/draft"
import type { Block, Doc, Draft, TextBlock } from "@/blocks/types"

const TEXT_ID = "00000000-0000-4000-8000-000000000001"
const BOX_ID = "00000000-0000-4000-8000-000000000002"
const INNER_ID = "00000000-0000-4000-8000-000000000003"

/** Ce que Tiptap (ou un ancien copier-coller) peut produire, hors de la forme du schéma. */
const messyDoc = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Lien",
          marks: [
            {
              type: "link",
              attrs: {
                href: "https://exemple.fr",
                target: "_blank",
                rel: "noopener noreferrer nofollow",
                class: null,
              },
            },
          ],
        },
        { type: "text", text: "" },
      ],
    },
    {
      type: "orderedList",
      attrs: { start: 1, type: "a" },
      content: [
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "Un" }] },
          ],
        },
      ],
    },
  ],
} as unknown as Doc

function draftWith(blocks: Draft["blocks"]): Draft {
  return {
    v: 1,
    title: "Page",
    cover: null,
    audio: null,
    blocks,
  }
}

describe("prepareDraft", () => {
  it("nettoie les textes (même dans un encadré) avant l'envoi", () => {
    const draft = draftWith([
      { id: TEXT_ID, type: "text", doc: messyDoc },
      {
        id: BOX_ID,
        type: "box",
        look: "fill",
        blocks: [{ id: INNER_ID, type: "text", doc: messyDoc }],
      },
    ])
    // Tel quel, le brouillon serait refusé par la base.
    expect(validateDraft(draft)).toBe(false)

    const prepared = prepareDraft(draft)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(validateDraft(prepared.draft)).toBe(true)
    const text = prepared.draft.blocks[0] as TextBlock
    expect(text.doc.content?.[0]).toEqual({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Lien",
          marks: [{ type: "link", attrs: { href: "https://exemple.fr" } }],
        },
      ],
    })
    const inner = prepared.draft.blocks[1]
    expect(inner.type === "box" && inner.blocks[0]).toEqual({
      id: INNER_ID,
      type: "text",
      doc: text.doc,
    })
    // L'original n'est pas modifié.
    expect((draft.blocks[0] as TextBlock).doc).toBe(messyDoc)
  })

  it("retire le résumé d'un ancien brouillon (l'admin n'en écrit plus)", () => {
    const old = { ...draftWith([]), summary: "Ancien résumé" }
    const prepared = prepareDraft(old)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.draft).not.toHaveProperty("summary")
    expect(prepared.draft).toMatchObject({ title: "Page", blocks: [] })
  })

  it("refuse un brouillon trop lourd", () => {
    const long = "a".repeat(DRAFT_MAX_BYTES)
    const prepared = prepareDraft(
      draftWith([
        {
          id: TEXT_ID,
          type: "text",
          doc: {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: long }] },
            ],
          },
        },
      ])
    )
    expect(prepared).toMatchObject({ ok: false, reason: "too_large" })
  })

  it("refuse un bloc qui n'a pas la forme attendue, en donnant sa place", () => {
    const prepared = prepareDraft(
      draftWith([
        { id: TEXT_ID, type: "text", doc: messyDoc },
        {
          id: BOX_ID,
          type: "image",
          mediaId: null,
          caption: "x".repeat(301),
          alt: null,
        },
      ])
    )
    expect(prepared).toMatchObject({
      ok: false,
      reason: "invalid",
      position: 2,
    })
  })
})

describe("readingStats", () => {
  const paragraph = (text: string): Doc =>
    ({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    }) as unknown as Doc
  const text = (id: string, words: string): TextBlock => ({
    id,
    type: "text",
    doc: paragraph(words),
  })

  it("compte les mots du titre et des blocs, encadrés compris", () => {
    const draft: Draft = {
      v: 1,
      title: "Bien dormir",
      blocks: [
        text(TEXT_ID, "Se coucher à heure fixe, c'est bien."),
        {
          id: BOX_ID,
          type: "box",
          look: "fill",
          blocks: [text(INNER_ID, "À retenir — trois mots")],
        },
      ],
    }
    // « — » n'est pas un mot.
    expect(readingStats(draft)).toEqual({ words: 13, minutes: 1 })
  })

  it("lit un bloc partagé par son modèle, et arrondit à la minute supérieure", () => {
    const shared: Block = { id: TEXT_ID, type: "linked", templateId: BOX_ID }
    const draft: Draft = { v: 1, title: "", blocks: [shared] }
    expect(readingStats(draft)).toEqual({ words: 0, minutes: 0 })
    const long = Array.from({ length: 201 }, () => "mot").join(" ")
    expect(readingStats(draft, () => text(INNER_ID, long))).toEqual({
      words: 201,
      minutes: 2,
    })
  })
})

describe("Monter et Descendre", () => {
  const OTHER_ID = "00000000-0000-4000-8000-000000000004"
  const text = (id: string): TextBlock => ({
    id,
    type: "text",
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  })
  const draft = () =>
    draftWith([
      text(TEXT_ID),
      {
        id: BOX_ID,
        type: "box",
        look: "fill",
        blocks: [text(INNER_ID), text(OTHER_ID)],
      },
    ])
  const ids = (blocks: Block[]) => blocks.map((block) => block.id)

  it("le premier bloc d'une section qu'on monte en sort, juste au-dessus d'elle", () => {
    const next = shiftBlock(draft(), INNER_ID, -1)!
    expect(ids(next.blocks)).toEqual([TEXT_ID, INNER_ID, BOX_ID])
    expect(findBlock(next, OTHER_ID)?.container).toBe(BOX_ID)
  })

  it("le dernier qu'on descend en sort, juste au-dessous d'elle", () => {
    const next = shiftBlock(draft(), OTHER_ID, 1)!
    expect(ids(next.blocks)).toEqual([TEXT_ID, BOX_ID, OTHER_ID])
  })

  it("dans la section, il change seulement de place", () => {
    const next = shiftBlock(draft(), INNER_ID, 1)!
    const box = next.blocks[1] as Block & { type: "box" }
    expect(ids(box.blocks)).toEqual([OTHER_ID, INNER_ID])
    expect(shiftLeavesBox(findBlock(draft(), INNER_ID)!, 1)).toBe(false)
    expect(shiftLeavesBox(findBlock(draft(), INNER_ID)!, -1)).toBe(true)
  })

  it("rien au bout de la page, ni hors d'une section quand la page est pleine (bloc partagé)", () => {
    expect(canShift(draft(), TEXT_ID, -1)).toBe(false)
    expect(canShift(draft(), BOX_ID, 1)).toBe(false)
    expect(canShift(draft(), INNER_ID, -1)).toBe(true)
    expect(canShift(draft(), INNER_ID, -1, 2)).toBe(false)
  })
})

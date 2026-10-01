import { describe, expect, it } from "vitest"

import { validateDraft } from "@/blocks/generated/validators"
import { DRAFT_MAX_BYTES, prepareDraft, readingStats } from "@/blocks/draft"
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
    summary: null,
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

  it("compte les mots du titre et des blocs, encadrés compris, sans le résumé", () => {
    const draft: Draft = {
      v: 1,
      title: "Bien dormir",
      summary: "Un résumé qui ne compte pas",
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

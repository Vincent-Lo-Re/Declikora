import { describe, expect, it } from "vitest"

import { validateDraft } from "@/blocks/generated/validators"
import {
  cleanTextDoc,
  isAllowedHref,
  normalizeHref,
  textDocToPlainText,
} from "@/blocks/text/clean-text-doc"
import type { Doc } from "@/blocks/types"

/** Vrai si le document passe le validateur du brouillon (celui de la base). */
function acceptedBySchema(doc: Doc): boolean {
  return validateDraft({
    v: 1,
    title: "",
    blocks: [{ id: "00000000-0000-4000-8000-000000000001", type: "text", doc }],
  })
}

const text = (value: string, marks?: unknown[]) =>
  marks ? { type: "text", text: value, marks } : { type: "text", text: value }

describe("cleanTextDoc", () => {
  it("garde tel quel un document déjà conforme", () => {
    const doc: Doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Titre" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Gras", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
            {
              type: "text",
              text: "lien",
              marks: [
                { type: "link", attrs: { href: "https://declikora.app" } },
              ],
            },
          ],
        },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "un" }] },
              ],
            },
          ],
        },
      ],
    }
    expect(cleanTextDoc(doc)).toEqual(doc)
    expect(acceptedBySchema(cleanTextDoc(doc))).toBe(true)
  })

  it("retire des liens target, rel, class et title, et les liens refusés", () => {
    const cleaned = cleanTextDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            text("a", [
              {
                type: "link",
                attrs: {
                  href: "https://ok.fr",
                  target: "_blank",
                  rel: "noopener",
                  class: "x",
                  title: "t",
                },
              },
            ]),
            text("b", [
              { type: "link", attrs: { href: "javascript:alert(1)" } },
            ]),
            text("c", [{ type: "link", attrs: { href: "http://pas-sur.fr" } }]),
            text("d", [
              { type: "underline" },
              { type: "bold" },
              { type: "bold" },
            ]),
          ],
        },
      ],
    })
    expect(cleaned.content[0]).toEqual({
      type: "paragraph",
      content: [
        text("a", [{ type: "link", attrs: { href: "https://ok.fr" } }]),
        text("b"),
        text("c"),
        text("d", [{ type: "bold" }]),
      ],
    })
    expect(acceptedBySchema(cleaned)).toBe(true)
  })

  it("ne garde que start sur une liste numérotée, ramené entre 1 et 99 999", () => {
    const item = { type: "listItem", content: [{ type: "paragraph" }] }
    const cleaned = cleanTextDoc({
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 0, type: "a" },
          content: [item],
        },
        { type: "orderedList", attrs: { start: 250000 }, content: [item] },
        { type: "orderedList", attrs: { type: "i" }, content: [item] },
      ],
    })
    expect(
      cleaned.content.map((node) => ("attrs" in node ? node.attrs : null))
    ).toEqual([{ start: 1 }, { start: 99999 }, null])
    expect(acceptedBySchema(cleaned)).toBe(true)
  })

  it("ramène les titres aux niveaux 2 et 3, et jamais dans une liste", () => {
    const cleaned = cleanTextDoc({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [text("un")] },
        { type: "heading", attrs: { level: 4 }, content: [text("quatre")] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "heading",
                  attrs: { level: 2 },
                  content: [text("dans la liste")],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "bulletList",
                  content: [{ type: "listItem", content: [] }],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(cleaned.content[0]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    })
    expect(cleaned.content[1]).toMatchObject({
      type: "heading",
      attrs: { level: 3 },
    })
    const list = cleaned.content[2] as {
      content: { content: { type: string }[] }[]
    }
    expect(list.content[0].content[0].type).toBe("paragraph")
    // Un élément qui commençait par une liste reçoit un paragraphe vide devant.
    expect(list.content[1].content.map((node) => node.type)).toEqual([
      "paragraph",
      "bulletList",
    ])
    expect(acceptedBySchema(cleaned)).toBe(true)
  })

  it("retire le texte vide, les listes vides et les nœuds inconnus", () => {
    const cleaned = cleanTextDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { textAlign: "left" },
          content: [text("")],
        },
        { type: "bulletList", content: [] },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [text("cité")] }],
        },
        { type: "codeBlock", content: [text("code")] },
        { type: "image", attrs: { src: "https://x.fr/a.png" } },
      ],
    })
    expect(cleaned.content).toEqual([
      { type: "paragraph" },
      { type: "paragraph", content: [text("cité")] },
      { type: "paragraph", content: [text("code")] },
    ])
    expect(acceptedBySchema(cleaned)).toBe(true)
  })

  it("donne toujours au moins un paragraphe", () => {
    expect(cleanTextDoc({ type: "doc", content: [] })).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    })
    expect(cleanTextDoc(null)).toEqual({
      type: "doc",
      content: [{ type: "paragraph" }],
    })
  })
})

describe("adresses des liens", () => {
  it("n'accepte que https:// et mailto:, sans espace", () => {
    expect(isAllowedHref("https://declikora.app")).toBe(true)
    expect(isAllowedHref("mailto:bonjour@declikora.app")).toBe(true)
    expect(isAllowedHref("http://declikora.app")).toBe(false)
    expect(isAllowedHref("javascript:alert(1)")).toBe(false)
    expect(isAllowedHref("/aide")).toBe(false)
    expect(isAllowedHref("https://a b")).toBe(false)
    expect(isAllowedHref(`https://${"a".repeat(2050)}`)).toBe(false)
  })

  it("corrige la casse du début et les espaces autour", () => {
    expect(normalizeHref("  HTTPS://declikora.app/Aide ")).toBe(
      "https://declikora.app/Aide"
    )
    expect(normalizeHref("MailTo:x@y.fr")).toBe("mailto:x@y.fr")
    expect(normalizeHref("javascript:alert(1)")).toBeNull()
  })
})

describe("textDocToPlainText", () => {
  it("rend titres, paragraphes et listes numérotées", () => {
    const doc: Doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Titre" }],
        },
        {
          type: "orderedList",
          attrs: { start: 2 },
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "un" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "deux" }],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(textDocToPlainText(doc)).toBe("Titre\n2. un\n3. deux")
  })
})

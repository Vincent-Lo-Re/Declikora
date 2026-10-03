import { describe, expect, it } from "vitest"

import { blockLabel, textFirstLine } from "@/blocks/labels"
import type { Doc } from "@/blocks/types"
import { texts } from "@/texts"

describe("nom des blocs dans les annonces", () => {
  it("les phrases qui citent un bloc restent justes pour une Image (féminin)", () => {
    const label = blockLabel({
      id: "00000000-0000-4000-8000-000000000001",
      type: "image",
      mediaId: null,
      caption: null,
      alt: null,
    })
    const sentences = [
      texts.editor.settings.removed(label),
      texts.editor.dnd.end(label, texts.editor.dnd.page),
      texts.editor.dnd.endOutside(label),
      texts.editor.dnd.cancel(label),
    ]
    for (const sentence of sentences) {
      // Les participes s'accordent avec « Bloc », jamais avec le nom du bloc ; pas de « il ».
      expect(sentence).not.toMatch(/» (a été )?(supprimé|déposé|lâché)|\bil\b/)
    }
    expect(texts.editor.settings.removed(label)).toBe("Bloc supprimé : Image.")
    expect(texts.editor.dnd.end(label, texts.editor.dnd.page)).toBe(
      "Bloc déposé dans la page : Image."
    )
  })
})

describe("résumé d'un texte", () => {
  const paragraph = (text: string) => ({
    type: "paragraph" as const,
    content: [{ type: "text" as const, text }],
  })

  it("prend la première ligne non vide : deux paragraphes ne sont jamais collés", () => {
    const doc: Doc = {
      type: "doc",
      content: [
        { type: "paragraph" },
        paragraph("Astuce"),
        paragraph("Prépare tes affaires"),
      ],
    }
    expect(textFirstLine(doc)).toBe("Astuce")
    expect(
      blockLabel({
        id: "00000000-0000-4000-8000-000000000001",
        type: "text",
        doc,
      })
    ).toBe(texts.editor.blockLabel.text("Astuce"))
  })

  it("un intertitre suivi d'une liste : seulement l'intertitre, comme dans le plan", () => {
    const doc: Doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Trois gestes" }],
        },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [paragraph("Boire")] }],
        },
      ],
    }
    expect(textFirstLine(doc)).toBe("Trois gestes")
  })
})

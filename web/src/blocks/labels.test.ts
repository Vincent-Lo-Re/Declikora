import { describe, expect, it } from "vitest"

import { blockLabel } from "@/blocks/labels"
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

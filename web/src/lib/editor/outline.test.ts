import { describe, expect, it } from "vitest"

import type {
  BlockMedia,
  LinkedTemplateState,
} from "@/blocks/components/context"
import { createBlock } from "@/blocks/draft"
import type { Block, Doc, Draft } from "@/blocks/types"
import type { Media } from "@/lib/media/constants"
import { blockWarning, duplicateBlock, headingsOf } from "@/lib/editor/outline"

const text = (value: string) => [{ type: "text" as const, text: value }]

const doc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: text("Les bons réflexes"),
    },
    { type: "paragraph", content: text("Se coucher tôt.") },
    { type: "heading", attrs: { level: 3 }, content: text("Un sous-titre") },
    { type: "heading", attrs: { level: 2 } },
    { type: "heading", attrs: { level: 2 }, content: text("Le matin") },
  ],
} as Doc

describe("headingsOf", () => {
  it("rend les intertitres (Titre) dans l'ordre, sans les sous-titres ni les vides", () => {
    expect(headingsOf(doc)).toEqual(["Les bons réflexes", "Le matin"])
  })
})

describe("blockWarning", () => {
  const ready = (alt: string | null): BlockMedia => ({
    state: "ready",
    media: { alt } as Media,
    url: undefined,
  })
  const noTemplate = (): LinkedTemplateState => ({ state: "loading" })
  const image = (fields: Partial<Block & { type: "image" }>): Block => ({
    ...createBlock("image"),
    ...fields,
  })

  it("signale une image sans fichier, un fichier perdu et une image sans texte alternatif", () => {
    expect(blockWarning(image({}), () => ready("x"), noTemplate)).toBe("noFile")
    expect(
      blockWarning(
        image({ mediaId: "f" }),
        () => ({ state: "missing" }),
        noTemplate
      )
    ).toBe("unavailable")
    expect(
      blockWarning(image({ mediaId: "f" }), () => ready(" "), noTemplate)
    ).toBe("noAlt")
    // Le texte du bloc remplace celui de la médiathèque.
    expect(
      blockWarning(
        image({ mediaId: "f", alt: "Une plage" }),
        () => ready(null),
        noTemplate
      )
    ).toBeNull()
  })

  it("ne signale rien pendant le chargement, ni pour un texte", () => {
    expect(
      blockWarning(
        image({ mediaId: "f" }),
        () => ({ state: "loading" }),
        noTemplate
      )
    ).toBeNull()
    expect(
      blockWarning(createBlock("text"), () => ready(null), noTemplate)
    ).toBeNull()
  })

  it("signale un bloc partagé dont le modèle n'existe plus", () => {
    const linked: Block = { id: "l", type: "linked", templateId: "t" }
    expect(
      blockWarning(
        linked,
        () => ready(null),
        () => ({ state: "missing" })
      )
    ).toBe("missingTemplate")
    expect(blockWarning(linked, () => ready(null), noTemplate)).toBeNull()
  })
})

describe("duplicateBlock", () => {
  it("met une copie juste après le bloc, avec de nouveaux identifiants (encadré compris)", () => {
    const box = createBlock("box")
    const inner = createBlock("text")
    const after = createBlock("text")
    const draft: Draft = {
      v: 1,
      title: "",
      summary: null,
      cover: null,
      audio: null,
      blocks: [{ ...box, blocks: [inner] }, after],
    }
    const result = duplicateBlock(draft, box.id)!
    expect(result.draft.blocks.map((block) => block.id)).toEqual([
      box.id,
      result.id,
      after.id,
    ])
    const copy = result.draft.blocks[1]
    expect(copy.type).toBe("box")
    expect(copy.type === "box" && copy.blocks[0].id).not.toBe(inner.id)
    expect(duplicateBlock(draft, "inconnu")).toBeNull()
  })

  it("copie un bloc d'encadré dans le même encadré", () => {
    const inner = createBlock("text")
    const box = { ...createBlock("box"), blocks: [inner] }
    const draft: Draft = {
      v: 1,
      title: "",
      summary: null,
      cover: null,
      audio: null,
      blocks: [box],
    }
    const result = duplicateBlock(draft, inner.id)!
    const updated = result.draft.blocks[0]
    expect(
      updated.type === "box" && updated.blocks.map((block) => block.id)
    ).toEqual([inner.id, result.id])
  })
})

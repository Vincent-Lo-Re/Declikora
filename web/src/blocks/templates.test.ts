import { describe, expect, it } from "vitest"

import { canDropInto, moveBlock, prepareDraft } from "@/blocks/draft"
import { validateTemplate } from "@/blocks/generated/validators"
import {
  canAddRootBlock,
  copyWithNewIds,
  detachedCopy,
  detachLinked,
  insertTemplate,
  linkedBlock,
  linkedTemplateIds,
  rootInsertIndex,
  selectedRootIds,
  singleBlock,
  templateInsertable,
} from "@/blocks/templates"
import type { BoxBlock, Draft, TextBlock } from "@/blocks/types"

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const TEMPLATE = "00000000-0000-4000-8000-0000000000aa"
const OTHER_TEMPLATE = "00000000-0000-4000-8000-0000000000bb"

function text(n: number, body = "Bonjour"): TextBlock {
  return {
    id: id(n),
    type: "text",
    doc: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: body }] }],
    },
  }
}

// Le bloc du modèle « Contact » : un encadré avec un texte et une image.
const contactBox: BoxBlock = {
  id: id(50),
  type: "box",
  look: "fill",
  blocks: [
    text(51, "Écris-nous"),
    { id: id(52), type: "image", mediaId: null, caption: null, alt: null },
  ],
}

// La page : T1, bloc lié 2 (Contact), Encadré 3 (T4), bloc lié 5 (Contact), bloc lié 6 (autre).
function page(): Draft {
  return {
    v: 1,
    title: "Accueil",
    blocks: [
      text(1),
      linkedBlock(TEMPLATE, id(2)),
      { id: id(3), type: "box", look: "border", blocks: [text(4)] },
      linkedBlock(TEMPLATE, id(5)),
      linkedBlock(OTHER_TEMPLATE, id(6)),
    ],
  }
}

const idsOf = (draft: Draft) =>
  draft.blocks.flatMap((block) =>
    block.type === "box"
      ? [block.id, ...block.blocks.map((child) => child.id)]
      : [block.id]
  )

describe("modèles : copies et détachement", () => {
  it("une copie a de nouveaux identifiants, encadré compris, et le même contenu", () => {
    const copy = copyWithNewIds(contactBox) as BoxBlock
    expect(copy.id).not.toBe(contactBox.id)
    expect(copy.blocks.map((child) => child.id)).not.toContain(id(51))
    expect(copy.blocks.map((child) => child.id)).not.toContain(id(52))
    expect({
      ...copy,
      id: "",
      blocks: copy.blocks.map((child) => ({ ...child, id: "" })),
    }).toEqual({
      ...contactBox,
      id: "",
      blocks: contactBox.blocks.map((child) => ({ ...child, id: "" })),
    })
  })

  it("détacher : même id au premier niveau, nouveaux id à l'intérieur, sans marqueur", () => {
    const copy = detachedCopy(contactBox, id(2)) as BoxBlock
    expect(copy.id).toBe(id(2))
    expect(copy.type).toBe("box")
    expect(copy).not.toHaveProperty("templateId")
    const inner = copy.blocks.map((child) => child.id)
    expect(inner).not.toContain(id(51))
    expect(new Set(inner).size).toBe(2)
    expect((copy.blocks[0] as TextBlock).doc).toEqual(
      (contactBox.blocks[0] as TextBlock).doc
    )
    // Un bloc simple garde l'id du bloc lié.
    expect(detachedCopy(text(60, "Seul"), id(2))).toEqual(text(2, "Seul"))
  })

  it("détacher un bloc lié ne change que lui : les autres restent liés", () => {
    const detached = detachLinked(page(), id(2), contactBox)
    expect(detached.blocks.map((block) => block.type)).toEqual([
      "text",
      "box",
      "box",
      "linked",
      "linked",
    ])
    expect(detached.blocks[1].id).toBe(id(2))
    expect(linkedTemplateIds(detached)).toEqual([TEMPLATE, OTHER_TEMPLATE])
    // Le brouillon reste valable (identifiants uniques, forme du schéma).
    expect(new Set(idsOf(detached)).size).toBe(idsOf(detached).length)
    expect(prepareDraft(detached).ok).toBe(true)
    // Un bloc qui n'est pas lié n'est pas touché.
    expect(detachLinked(page(), id(1), contactBox)).toEqual(page())
  })

  it("les modèles cités par un brouillon, sans doublon", () => {
    expect(linkedTemplateIds(page())).toEqual([TEMPLATE, OTHER_TEMPLATE])
    expect(linkedTemplateIds({ v: 1, title: "", blocks: [text(1)] })).toEqual(
      []
    )
  })
})

describe("modèles : insertion", () => {
  const style = {
    id: TEMPLATE,
    sort: "style" as const,
    draft: { blocks: [text(70, "À retenir"), contactBox] },
  }
  const shared = {
    id: TEMPLATE,
    sort: "shared" as const,
    draft: { blocks: [contactBox] },
  }

  it("se fait au premier niveau, après le bloc choisi ou après son encadré", () => {
    expect(rootInsertIndex(page(), null)).toBe(5)
    expect(rootInsertIndex(page(), id(1))).toBe(1)
    // Un bloc choisi dans un encadré : après l'encadré (un modèle ne va pas dans un encadré).
    expect(rootInsertIndex(page(), id(4))).toBe(3)
    expect(rootInsertIndex(page(), "inconnu")).toBe(5)
  })

  it("une mise en forme devient une copie de ses blocs, avec de nouveaux identifiants", () => {
    const result = insertTemplate(page(), style, id(1))!
    const inserted = result.draft.blocks.slice(1, 3)
    expect(inserted.map((block) => block.type)).toEqual(["text", "box"])
    expect(result.firstId).toBe(inserted[0].id)
    expect(idsOf(result.draft)).not.toContain(id(70))
    expect(idsOf(result.draft)).not.toContain(id(51))
    expect(prepareDraft(result.draft).ok).toBe(true)
    // Insérer deux fois : toujours des identifiants uniques.
    const twice = insertTemplate(result.draft, style, null)!
    expect(new Set(idsOf(twice.draft)).size).toBe(idsOf(twice.draft).length)
  })

  it("un bloc identique partout devient un bloc lié", () => {
    const result = insertTemplate(page(), shared, null)!
    const last = result.draft.blocks.at(-1)!
    expect(last).toEqual({
      id: result.firstId,
      type: "linked",
      templateId: TEMPLATE,
    })
    expect(prepareDraft(result.draft).ok).toBe(true)
  })

  it("ne s'insèrent pas : un bloc identique partout vide, une mise en forme vide, un point de départ", () => {
    const empty = { ...shared, draft: { blocks: [] } }
    expect(templateInsertable(empty)).toBe("empty")
    expect(insertTemplate(page(), empty, null)).toBeNull()
    expect(templateInsertable({ ...style, draft: { blocks: [] } })).toBe(
      "empty"
    )
    const starter = { ...style, sort: "starter" as const }
    expect(templateInsertable(starter)).toBe("starter")
    expect(insertTemplate(page(), starter, null)).toBeNull()
    expect(templateInsertable(shared)).toBe("ok")
    expect(singleBlock(shared.draft)).toBe(contactBox)
    expect(singleBlock(style.draft)).toBeNull()
  })

  it("un bloc lié ne va jamais dans un encadré", () => {
    expect(canDropInto("linked", id(3))).toBe(false)
    expect(moveBlock(page(), id(2), id(3), 0)).toBeNull()
    expect(canDropInto("linked", "root")).toBe(true)
  })

  it("un modèle ne contient pas de bloc lié (variante « template » du schéma)", () => {
    expect(validateTemplate({ v: 1, title: "Modèle", blocks: [text(1)] })).toBe(
      true
    )
    expect(
      validateTemplate({
        v: 1,
        title: "Modèle",
        blocks: [linkedBlock(TEMPLATE, id(2))],
      })
    ).toBe(false)
  })

  it("un bloc identique partout n'a qu'un bloc au premier niveau ([D11])", () => {
    const one: Draft = { v: 1, title: "Contact", blocks: [contactBox] }
    const none: Draft = { v: 1, title: "Contact", blocks: [] }
    expect(canAddRootBlock(one, "shared")).toBe(false)
    expect(canAddRootBlock(none, "shared")).toBe(true)
    expect(canAddRootBlock(one, "style")).toBe(true)
    expect(canAddRootBlock(one, null)).toBe(true)
  })
})

describe("« Enregistrer comme modèle » : les blocs choisis", () => {
  it("dans l'ordre du brouillon, seulement ceux qui y sont encore au premier niveau", () => {
    expect(
      selectedRootIds(page(), new Set([id(5), id(1), id(4), "disparu"]))
    ).toEqual([id(1), id(5)])
  })
})

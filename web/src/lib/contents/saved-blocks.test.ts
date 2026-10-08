import { describe, expect, it } from "vitest"

import {
  countUses,
  savedBlocks,
  savedImageIds,
} from "@/lib/contents/saved-blocks"
import type { TemplateItem } from "@/lib/contents/templates"

function template(
  id: string,
  title: string,
  sort: TemplateItem["sort"]
): TemplateItem {
  return {
    id,
    title,
    sort,
    templateFor: null,
    draft: { v: 1, title, blocks: [] },
    draft_saved_at: "2026-09-30T10:00:00Z",
  }
}

describe("Mes blocs", () => {
  const all = [
    template("a", "Encadré « À retenir »", "style"),
    template("b", "Signature", "shared"),
    template("c", "Article type", "starter"),
  ]

  it("montre les mises en forme et les blocs partagés, pas les points de départ", () => {
    expect(savedBlocks(all, "all", "").map((item) => item.id)).toEqual([
      "a",
      "b",
    ])
    expect(savedBlocks(all, "shared", "").map((item) => item.id)).toEqual(["b"])
    expect(savedBlocks(all, "style", "").map((item) => item.id)).toEqual(["a"])
  })

  it("cherche dans le nom, sans accents ni majuscules", () => {
    expect(savedBlocks(all, "all", "a RETENIR").map((item) => item.id)).toEqual(
      ["a"]
    )
    expect(savedBlocks(all, "all", "zzz")).toEqual([])
  })

  it("compte les contenus qui citent chaque modèle, Corbeille comprise", () => {
    const counts = countUses([
      {
        id: "1",
        kind: "article",
        title: "",
        inTrash: false,
        templateIds: ["b"],
      },
      {
        id: "2",
        kind: "page",
        title: "",
        inTrash: false,
        templateIds: ["b", "a"],
      },
      { id: "3", kind: "page", title: "", inTrash: true, templateIds: ["b"] },
    ])
    expect(counts.get("b")).toBe(3)
    expect(counts.get("a")).toBe(1)
    expect(counts.get("z")).toBeUndefined()
  })
})

describe("aperçu de Mes blocs", () => {
  it("lit les fichiers des images, sections comprises, sans doublon", () => {
    const image = (id: string, mediaId: string | null) => ({
      id,
      type: "image" as const,
      mediaId,
      caption: null,
      alt: null,
    })
    const withBlocks = (
      id: string,
      blocks: TemplateItem["draft"]["blocks"]
    ): TemplateItem => ({
      ...template(id, id, "shared"),
      draft: { v: 1, title: id, blocks },
    })
    expect(
      savedImageIds([
        withBlocks("a", [
          { id: "box", type: "box", look: "fill", blocks: [image("i1", "m2")] },
        ]),
        withBlocks("b", [image("i2", "m1"), image("i3", null)]),
        withBlocks("c", [image("i4", "m2")]),
      ])
    ).toEqual(["m1", "m2"])
  })
})

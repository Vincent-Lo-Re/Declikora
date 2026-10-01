import { describe, expect, it } from "vitest"

import { countUses, savedBlocks } from "@/lib/contents/saved-blocks"
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

  it("compte les contenus qui citent chaque modèle, hors corbeille", () => {
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
    expect(counts.get("b")).toBe(2)
    expect(counts.get("a")).toBe(1)
    expect(counts.get("z")).toBeUndefined()
  })
})

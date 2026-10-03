import { describe, expect, it } from "vitest"

import { isMostComplete, liveLevelName } from "@/lib/access-levels"
import { texts } from "@/texts"

describe("isMostComplete", () => {
  const levels = [
    { id: "essentiel", name: "Essentiel", rank: 1 },
    { id: "complete", name: "Complète", rank: 2 },
  ]

  it("reconnaît la formule la plus complète (le plus grand rang)", () => {
    expect(isMostComplete(levels, "complete")).toBe(true)
    expect(isMostComplete(levels, "essentiel")).toBe(false)
    expect(isMostComplete(levels, "inconnue")).toBe(false)
  })
})

describe("liveLevelName", () => {
  const levels = [{ id: "essentiel", name: "Essentiel", rank: 1 }]
  const words = texts.publication.settings.access

  it("Gratuit, le nom de la formule, ou une formule supprimée depuis", () => {
    expect(liveLevelName(null, levels)).toBe(words.free)
    expect(liveLevelName("essentiel", levels)).toBe("Essentiel")
    expect(liveLevelName("partie", levels)).toBe(words.deleted)
  })

  it("rien tant que les formules ne sont pas lues (pas « supprimée » par défaut)", () => {
    expect(liveLevelName("essentiel", undefined)).toBeNull()
    expect(liveLevelName(null, undefined)).toBe(words.free)
  })
})

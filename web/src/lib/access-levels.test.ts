import { describe, expect, it } from "vitest"

import { isMostComplete } from "@/lib/access-levels"

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

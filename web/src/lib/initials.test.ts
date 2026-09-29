import { describe, expect, it } from "vitest"

import { initials } from "@/lib/initials"

describe("initials", () => {
  it("prend le prénom et le premier mot du nom", () => {
    expect(initials("Vincent Lo Re", "v@exemple.fr")).toBe("VL")
    expect(initials("  marie   curie ", "m@exemple.fr")).toBe("MC")
  })

  it("une seule lettre pour un seul mot, accents gardés", () => {
    expect(initials("élodie", "e@exemple.fr")).toBe("É")
  })

  it("sans nom, la première lettre de l'e-mail", () => {
    expect(initials(null, "vincent@declikora.test")).toBe("V")
    expect(initials("   ", "zoe@exemple.fr")).toBe("Z")
  })
})

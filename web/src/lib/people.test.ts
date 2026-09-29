import { describe, expect, it } from "vitest"

import { displayName, initial } from "@/lib/people"

describe("displayName", () => {
  it("donne le nom complet, sinon l'e-mail", () => {
    expect(displayName({ full_name: " Vincent Lo Re ", email: "v@x.fr" })).toBe(
      "Vincent Lo Re"
    )
    expect(displayName({ full_name: "  ", email: "v@x.fr" })).toBe("v@x.fr")
    expect(displayName(null)).toBeNull()
  })
})

describe("initial", () => {
  it("prend la première lettre du prénom", () => {
    expect(initial({ full_name: "Vincent Lo Re", email: "v@x.fr" })).toBe("V")
    expect(initial({ full_name: "  marie   curie ", email: "m@x.fr" })).toBe(
      "M"
    )
  })

  it("garde l'accent", () => {
    expect(initial({ full_name: "élodie", email: "e@x.fr" })).toBe("É")
  })

  it("sans nom, la première lettre de l'e-mail", () => {
    expect(initial({ full_name: null, email: "vincent@declikora.test" })).toBe(
      "V"
    )
    expect(initial({ full_name: "   ", email: "zoe@x.fr" })).toBe("Z")
  })
})

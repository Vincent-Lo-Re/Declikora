import { describe, expect, it } from "vitest"

import { initial } from "@/lib/initial"

describe("initial", () => {
  it("prend la première lettre du prénom", () => {
    expect(initial("Vincent Lo Re", "v@exemple.fr")).toBe("V")
    expect(initial("  marie   curie ", "m@exemple.fr")).toBe("M")
  })

  it("garde l'accent", () => {
    expect(initial("élodie", "e@exemple.fr")).toBe("É")
  })

  it("sans nom, la première lettre de l'e-mail", () => {
    expect(initial(null, "vincent@declikora.test")).toBe("V")
    expect(initial("   ", "zoe@exemple.fr")).toBe("Z")
  })
})

import { describe, expect, it } from "vitest"

import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

describe("errorMessage", () => {
  it("donne le message d'une erreur, sinon « Erreur inattendue »", () => {
    expect(errorMessage(new Error("Réseau coupé"))).toBe("Réseau coupé")
    expect(errorMessage("texte")).toBe(texts.common.unexpected)
    expect(errorMessage(null)).toBe(texts.common.unexpected)
  })
})

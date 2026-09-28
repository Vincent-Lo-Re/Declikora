import { describe, expect, it } from "vitest"

import { checkSlug, slugFromTitle } from "./slug"

describe("adresse d'une page", () => {
  it("accepte les minuscules sans accent, les chiffres et les tirets", () => {
    expect(checkSlug("mentions-legales")).toEqual({
      ok: true,
      slug: "mentions-legales",
    })
    expect(checkSlug(" aide-2026 ")).toEqual({ ok: true, slug: "aide-2026" })
    expect(checkSlug("")).toEqual({ ok: true, slug: null })
  })

  it("refuse le reste, comme la base", () => {
    for (const value of [
      "Aide",
      "aide--2026",
      "-aide",
      "aide-",
      "aïde",
      "a b",
    ]) {
      expect(checkSlug(value)).toEqual({ ok: false, reason: "invalid" })
    }
    expect(checkSlug("a".repeat(101))).toEqual({
      ok: false,
      reason: "too_long",
    })
  })

  it("tire une adresse du titre", () => {
    expect(slugFromTitle("Mentions légales")).toBe("mentions-legales")
    expect(slugFromTitle("  L'œuvre — à propos !  ")).toBe("l-oeuvre-a-propos")
    expect(slugFromTitle("???")).toBe("")
    expect(checkSlug(slugFromTitle(`${"é".repeat(99)} x`)).ok).toBe(true)
  })
})

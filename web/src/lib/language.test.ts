import { afterEach, describe, expect, it, vi } from "vitest"

// La langue se lit au chargement du module : chaque cas le recharge après avoir posé le stockage.
async function languageWith(stored: Record<string, string>) {
  localStorage.clear()
  for (const [key, value] of Object.entries(stored))
    localStorage.setItem(key, value)
  vi.resetModules()
  return (await import("@/lib/language")).language
}

afterEach(() => {
  localStorage.clear()
  localStorage.setItem("declikora-langue", "fr")
  vi.resetModules()
})

describe("langue de l'admin", () => {
  it("celle du membre passe avant celle de toute l'admin, l'anglais sinon", async () => {
    expect(await languageWith({})).toBe("en")
    expect(await languageWith({ "declikora-langue-admin": "fr" })).toBe("fr")
    expect(
      await languageWith({
        "declikora-langue-admin": "fr",
        "declikora-langue": "en",
      })
    ).toBe("en")
    // Une valeur abîmée ne compte pas.
    expect(await languageWith({ "declikora-langue": "de" })).toBe("en")
  })

  it("lit la langue rangée sur le compte du membre", async () => {
    const { memberLanguage } = await import("@/lib/language")
    expect(memberLanguage({ language: "fr" })).toBe("fr")
    expect(memberLanguage({ language: null })).toBeNull()
    expect(memberLanguage(undefined)).toBeNull()
  })
})

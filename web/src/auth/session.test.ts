import type { Session } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  assuranceLevel,
  readTokenClaims,
  redirectTarget,
  verifiedTotpFactor,
} from "@/auth/session"

// Jeton au format JWT, encodé en UTF-8 (la signature n'est pas lue).
function token(claims: object) {
  const encode = (value: object) =>
    btoa(
      String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  return `${encode({ alg: "ES256" })}.${encode(claims)}.signature`
}

function session(claims: object, factors: object[] = []): Session {
  return {
    access_token: token(claims),
    user: { id: "u1", factors },
  } as unknown as Session
}

describe("jeton de session", () => {
  it("lit le niveau de vérification", () => {
    expect(assuranceLevel(session({ aal: "aal2" }))).toBe("aal2")
    expect(assuranceLevel(session({ aal: "aal1" }))).toBe("aal1")
  })

  it("considère un jeton illisible comme non vérifié", () => {
    expect(readTokenClaims("n'importe quoi")).toEqual({})
    expect(
      assuranceLevel({ access_token: "a.b.c" } as unknown as Session)
    ).toBe("aal1")
  })

  it("lit les caractères accentués", () => {
    expect(readTokenClaims(token({ nom: "Éloïse" }))).toEqual({ nom: "Éloïse" })
  })
})

describe("app de double vérification", () => {
  it("ne retient qu'une app vérifiée", () => {
    const unverified = { id: "f1", factor_type: "totp", status: "unverified" }
    const verified = { id: "f2", factor_type: "totp", status: "verified" }

    expect(verifiedTotpFactor(session({}, [unverified]))).toBeNull()
    expect(verifiedTotpFactor(session({}, [unverified, verified]))?.id).toBe(
      "f2"
    )
  })
})

describe("page où revenir après la connexion", () => {
  it("garde une page de l'admin", () => {
    expect(redirectTarget({ from: "/blog?page=2" })).toBe("/blog?page=2")
  })

  it.each([
    undefined,
    null,
    {},
    { from: 42 },
    { from: "https://exemple.test" },
    { from: "//exemple.test" },
    { from: "/\\exemple.test" },
    { from: "/sign-in" },
    { from: "/invitation?token_hash=abc" },
  ])("revient à l'accueil pour %j", (state) => {
    expect(redirectTarget(state)).toBe("/")
  })
})

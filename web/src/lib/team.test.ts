import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  countActiveAdmins,
  isAccessLost,
  isInvitationExpired,
  memberState,
  shownLastSignIn,
  TeamError,
  toTeamError,
  type Member,
} from "@/lib/team"
import { texts } from "@/texts"

const httpError = (body: string, status = 409) =>
  new FunctionsHttpError(new Response(body, { status }))

describe("erreurs de la fonction « equipe »", () => {
  it("traduit chaque code connu", async () => {
    const body = JSON.stringify({
      error: { code: "dernier_admin", message: "…" },
    })
    const error = await toTeamError(httpError(body))
    expect(error.code).toBe("dernier_admin")
    expect(error.message).toBe(texts.team.errors.dernier_admin)
  })

  it("donne un message général pour une réponse inattendue", async () => {
    for (const error of [
      httpError("pas du JSON", 500),
      httpError(JSON.stringify({ error: { code: "toString" } })),
      new FunctionsFetchError(new Error()),
    ]) {
      const teamError = await toTeamError(error)
      expect(teamError.code).toBeNull()
      expect(teamError.message).toBe(texts.common.unexpected)
    }
  })

  it("repère une perte d'accès (rôle retiré, session fermée)", () => {
    expect(isAccessLost(new TeamError("reserve_aux_admins"))).toBe(true)
    expect(isAccessLost(new TeamError("non_connecte"))).toBe(true)
    expect(isAccessLost(new TeamError("dernier_admin"))).toBe(false)
    expect(isAccessLost(new Error("autre"))).toBe(false)
  })
})

const member: Member = {
  id: "m1",
  email: "nina@exemple.test",
  full_name: null,
  role: "admin",
  created_at: "2026-09-27T12:00:00Z",
  status: "invited",
  invited_at: "2026-09-27T12:00:00Z",
  last_sign_in_at: null,
  mfa_enabled: false,
  mfa_enabled_at: null,
}

describe("état des membres", () => {
  it("repère une invitation dont le lien a expiré (10 minutes)", () => {
    const at = (time: string) => new Date(`2026-09-27T${time}Z`).getTime()
    expect(isInvitationExpired(member, at("12:09:00"))).toBe(false)
    expect(isInvitationExpired(member, at("12:11:00"))).toBe(true)
    expect(
      isInvitationExpired({ ...member, status: "active" }, at("13:00:00"))
    ).toBe(false)
  })

  it("ne dit « Actif » qu'une fois la double vérification configurée", () => {
    const at = (time: string) => new Date(`2026-09-27T${time}Z`).getTime()
    expect(memberState(member, at("12:09:00"))).toBe("invited")
    expect(memberState(member, at("12:11:00"))).toBe("expired")
    // Invitation acceptée : une première session, pas encore une connexion à l'admin.
    const accepted = {
      ...member,
      status: "active",
      last_sign_in_at: "2026-09-27T12:05:00Z",
    } as const
    expect(memberState(accepted)).toBe("mfaPending")
    expect(shownLastSignIn(accepted)).toBeNull()
    const active = { ...accepted, mfa_enabled: true }
    expect(memberState(active)).toBe("active")
    expect(shownLastSignIn(active)).toBe("2026-09-27T12:05:00Z")
  })

  it("ne compte que les admins capables d'agir", () => {
    const active = { ...member, status: "active", mfa_enabled: true } as const
    expect(
      countActiveAdmins([
        active,
        member, // invité
        { ...active, mfa_enabled: false }, // sans double vérification
        { ...active, role: "editor" },
      ])
    ).toBe(1)
  })
})

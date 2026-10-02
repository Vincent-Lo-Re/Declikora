import { describe, expect, it } from "vitest"

import { initialLockState, type LockState } from "@/lib/editor/edit-lock"
import {
  lockSituation,
  opensOnItsOwn,
  staysByDefault,
  takeIsForced,
} from "@/lib/editor/lock-view"

function lock(changes: Partial<LockState>): LockState {
  return { ...initialLockState, ...changes }
}

describe("lockSituation", () => {
  it("rien quand on écrit, pendant une prise de main ou sur une erreur", () => {
    expect(lockSituation(lock({ phase: "mine" }), true)).toBeNull()
    expect(lockSituation(lock({ phase: "taking" }), false)).toBeNull()
    expect(lockSituation(lock({ phase: "error" }), false)).toBeNull()
  })

  it("distingue la main perdue de la main déjà prise, et soi-même d'un autre membre", () => {
    const readonly = lock({ phase: "readonly" })
    expect(lockSituation(readonly, false)).toBe("readOnly")
    expect(lockSituation(readonly, true)).toBe("readOnlySelf")
    expect(lockSituation({ ...readonly, lost: true }, false)).toBe("lost")
    expect(lockSituation({ ...readonly, lost: true }, true)).toBe("lostSelf")
    expect(lockSituation(lock({ phase: "free", lost: true }), false)).toBe(
      "free"
    )
    expect(lockSituation(lock({ phase: "released" }), false)).toBe("released")
  })
})

describe("la fenêtre du cadenas", () => {
  it("ne s'ouvre d'elle-même que quand on vient de perdre la main", () => {
    expect(opensOnItsOwn("lost")).toBe(true)
    expect(opensOnItsOwn("lostSelf")).toBe(true)
    expect(opensOnItsOwn("readOnly")).toBe(false)
    expect(opensOnItsOwn("free")).toBe(false)
  })

  it("force la prise seulement quand quelqu'un écrit", () => {
    expect(takeIsForced("lost")).toBe(true)
    expect(takeIsForced("readOnlySelf")).toBe(true)
    expect(takeIsForced("free")).toBe(false)
    expect(takeIsForced("released")).toBe(false)
  })

  it("propose d'abord de rester quand c'est quelqu'un d'autre qui écrit", () => {
    expect(staysByDefault("lost")).toBe(true)
    expect(staysByDefault("readOnly")).toBe(true)
    expect(staysByDefault("lostSelf")).toBe(false)
    expect(staysByDefault("free")).toBe(false)
  })
})

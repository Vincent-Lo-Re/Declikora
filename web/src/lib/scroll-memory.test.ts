import { describe, expect, it } from "vitest"

import {
  isReturn,
  rememberOpened,
  rememberScroll,
  RETURN_STATE,
  scrollOf,
  takeOpened,
} from "@/lib/scroll-memory"

describe("retrouver sa place en revenant à une liste (QCM du 05/10/2026)", () => {
  it("la position de chaque page, par son chemin", () => {
    expect(scrollOf("/jamais-vue")).toBe(0)
    rememberScroll("/blog", 420)
    rememberScroll("/podcasts", 80)
    expect(scrollOf("/blog")).toBe(420)
    expect(scrollOf("/podcasts")).toBe(80)
  })

  it("le dernier contenu ouvert dans un éditeur, oublié une fois lu", () => {
    rememberOpened("a")
    rememberOpened("b")
    expect(takeOpened()).toBe("b")
    expect(takeOpened()).toBeNull()
  })

  it("revenir sur ses pas : le retour du navigateur, ou un lien de retour", () => {
    expect(isReturn(null, "POP")).toBe(true)
    expect(isReturn(RETURN_STATE, "PUSH")).toBe(true)
    expect(isReturn(null, "PUSH")).toBe(false)
    expect(isReturn({ glisse: "revenir" }, "PUSH")).toBe(false)
  })
})

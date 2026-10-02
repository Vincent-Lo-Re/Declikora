import { describe, expect, it } from "vitest"

import {
  decodeLibraryDrag,
  dropIndex,
  encodeLibraryDrag,
} from "@/lib/editor/library-drag"

describe("glisser depuis l'onglet Blocs", () => {
  it("relit un bloc ou un bloc enregistré, et rien d'autre", () => {
    expect(
      decodeLibraryDrag(encodeLibraryDrag({ kind: "block", type: "image" }))
    ).toEqual({ kind: "block", type: "image" })
    expect(
      decodeLibraryDrag(encodeLibraryDrag({ kind: "template", id: "t1" }))
    ).toEqual({ kind: "template", id: "t1" })
    expect(decodeLibraryDrag('{"kind":"block","type":"linked"}')).toBeNull()
    expect(decodeLibraryDrag('{"kind":"template","id":3}')).toBeNull()
    expect(decodeLibraryDrag("Bonjour")).toBeNull()
  })

  it("dépose avant le premier bloc dont le milieu est sous le pointeur", () => {
    expect(dropIndex([100, 200, 300], 50)).toBe(0)
    expect(dropIndex([100, 200, 300], 150)).toBe(1)
    expect(dropIndex([100, 200, 300], 350)).toBe(3)
    expect(dropIndex([], 10)).toBe(0)
  })
})

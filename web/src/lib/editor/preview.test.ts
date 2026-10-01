import { describe, expect, it } from "vitest"

import {
  chosenValue,
  defaultPreview,
  devices,
  previewLocked,
} from "@/lib/editor/preview"

const reserved = { accessChosen: true, accessLevelId: "formule" }

describe("chosenValue", () => {
  it("rend la valeur choisie, ou null quand on reclique sur le bouton déjà choisi", () => {
    expect(chosenValue(devices, ["android"])).toBe("android")
    expect(chosenValue(devices, [])).toBeNull()
    expect(chosenValue(devices, ["tablette"])).toBeNull()
  })
})

describe("previewLocked", () => {
  const visitor = {
    ...defaultPreview,
    mode: "read" as const,
    reader: "visitor" as const,
  }

  it("cache les blocs d'un article réservé à une personne sans la formule, en Lecture", () => {
    expect(previewLocked(visitor, reserved)).toBe(true)
  })

  it("montre tout à un abonné, en Édition, et pour un article gratuit ou pas encore réglé", () => {
    expect(previewLocked({ ...visitor, reader: "subscriber" }, reserved)).toBe(
      false
    )
    expect(previewLocked({ ...visitor, mode: "edit" }, reserved)).toBe(false)
    expect(
      previewLocked(visitor, { accessChosen: true, accessLevelId: null })
    ).toBe(false)
    expect(
      previewLocked(visitor, { accessChosen: false, accessLevelId: null })
    ).toBe(false)
  })
})

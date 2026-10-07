import { describe, expect, it } from "vitest"

import {
  chosenValue,
  defaultPreview,
  devices,
  fullScreenScale,
  previewFromSearch,
  previewLocked,
  showsFullScreen,
  withPreview,
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

describe("écran entier", () => {
  it("seulement en Lecture", () => {
    const full = { ...defaultPreview, fit: "full" as const }
    expect(showsFullScreen(full)).toBe(false)
    expect(showsFullScreen({ ...full, mode: "read" })).toBe(true)
    expect(showsFullScreen({ ...full, mode: "read", fit: "adjust" })).toBe(
      false
    )
  })

  it("réduit le téléphone pour qu'il tienne en hauteur, sans l'agrandir ni trop le réduire", () => {
    // iPhone : 874 + 2 × 10 = 894 de haut.
    expect(fullScreenScale("ios", 1000)).toBe(1)
    expect(fullScreenScale("ios", 894)).toBe(1)
    expect(fullScreenScale("ios", 700)).toBe(0.78)
    // Android : 915 + 2 × 9 = 933.
    expect(fullScreenScale("android", 700)).toBe(0.75)
    expect(fullScreenScale("ios", 100)).toBe(0.4)
  })
})

describe("les réglages du téléphone dans l'adresse (QCM du 04/10/2026)", () => {
  const everything = {
    device: "android",
    mode: "read",
    theme: "dark",
    largeText: true,
    reader: "visitor",
    fit: "full",
  } as const

  it("n'écrit que ce qui diffère du départ, en mots français", () => {
    expect(withPreview("", defaultPreview).toString()).toBe("")
    expect(
      withPreview("", { ...defaultPreview, mode: "read" }).toString()
    ).toBe("mode=read")
    expect(withPreview("", everything).toString()).toBe(
      "mode=read&device=android&theme=dark&reader=visitor&fit=full&text=large"
    )
  })

  it("se relit tel quel ; un mot inconnu vaut le réglage de départ", () => {
    expect(previewFromSearch(withPreview("", everything))).toEqual(everything)
    expect(previewFromSearch("")).toEqual(defaultPreview)
    expect(previewFromSearch("?mode=plein&theme=dark&text=small")).toEqual({
      ...defaultPreview,
      theme: "dark",
    })
  })

  it("garde les autres paramètres, et retire ceux qui reviennent au départ", () => {
    const params = withPreview("?file=42&mode=read&theme=dark", {
      ...defaultPreview,
      theme: "dark",
    })
    expect(params.toString()).toBe("file=42&theme=dark")
  })
})

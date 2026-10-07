import { describe, expect, it } from "vitest"

import type { HelpFiche } from "@/help/types"
import { fichesByTheme, helpScore, isHelpShortcut } from "@/lib/help"

const key = (over: Partial<KeyboardEvent>) => ({
  key: "k",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...over,
})

describe("isHelpShortcut", () => {
  it("⌘ K sur Mac, Ctrl + K ailleurs", () => {
    expect(isHelpShortcut(key({ metaKey: true }), true)).toBe(true)
    expect(isHelpShortcut(key({ ctrlKey: true }), true)).toBe(false)
    expect(isHelpShortcut(key({ ctrlKey: true }), false)).toBe(true)
    expect(isHelpShortcut(key({ key: "K", ctrlKey: true }), false)).toBe(true)
    expect(isHelpShortcut(key({ metaKey: true, altKey: true }), true)).toBe(
      false
    )
    expect(isHelpShortcut(key({ key: "j", metaKey: true }), true)).toBe(false)
  })
})

describe("helpScore", () => {
  it("chaque mot tapé, sans tenir compte des accents ni des majuscules", () => {
    expect(helpScore("Envoyer des fichiers", "fichier envoyer")).toBe(1)
    expect(helpScore("La Médiathèque", "mediatheque")).toBe(1)
    expect(helpScore("Programmer", "planifier", ["planifier", "date"])).toBe(1)
    expect(helpScore("Programmer", "corbeille")).toBe(0)
  })

  it("rien de tapé : toutes les fiches passent", () => {
    expect(helpScore("Programmer", "  ")).toBe(1)
  })
})

describe("fichesByTheme", () => {
  const fiche = (slug: string, theme: HelpFiche["theme"]): HelpFiche => ({
    slug,
    theme,
    title: slug,
    summary: "",
    keywords: [],
  })

  it("range par thème, dans l'ordre donné, sans les thèmes vides", () => {
    const groups = fichesByTheme(
      [
        fiche("a", "corbeille"),
        fiche("b", "contenus"),
        fiche("c", "corbeille"),
      ],
      ["contenus", "publication", "corbeille"]
    )
    expect(groups.map((group) => group.theme)).toEqual([
      "contenus",
      "corbeille",
    ])
    expect(groups[1].fiches.map((one) => one.slug)).toEqual(["a", "c"])
  })
})

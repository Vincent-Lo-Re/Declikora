import { describe, expect, it } from "vitest"

import { en } from "./texts/en"
import { fr } from "./texts/fr"

// Chaque texte de l'interface, avec sa clé ; une fonction est appelée avec « x » pour chaque
// paramètre (une liste, ["x"]).
function allTexts(node: unknown, key = ""): [string, string][] {
  if (typeof node === "string") return [[key, node]]
  if (typeof node === "function") {
    let result: unknown
    try {
      result = node(...Array<string>(node.length).fill("x"))
    } catch {
      result = node(...Array<string[]>(node.length).fill(["x"]))
    }
    return typeof result === "string" ? [[key, result]] : []
  }
  if (node && typeof node === "object")
    return Object.entries(node).flatMap(([name, value]) =>
      allTexts(value, key ? `${key}.${name}` : name)
    )
  return []
}

describe("textes de l'interface", () => {
  // Typographie française (docs/LEXIQUE.md) : une espace insécable avant « : ; ! ? », et à
  // l'intérieur des guillemets, pour qu'aucun signe ne passe seul à la ligne.
  it("en français, ont une espace insécable avant : ; ! ? et dans les guillemets", () => {
    const wrong = allTexts(fr).filter(([, text]) =>
      / [:;!?»]|« |[\p{L}\d)][;!?]|[\p{L}\d)]»|«[\p{L}\d]/u.test(text)
    )
    expect(wrong).toEqual([])
  })

  // En anglais, ni espace avant la ponctuation, ni guillemets français, ni espace insécable.
  it("en anglais, n'ont ni espace avant : ; ! ?, ni guillemets français", () => {
    const wrong = allTexts(en).filter(([, text]) =>
      /[\u00a0«»]| [:;!?]/u.test(text)
    )
    expect(wrong).toEqual([])
  })
})

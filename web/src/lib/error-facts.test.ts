import { describe, expect, it } from "vitest"

import { describeFacts } from "@/lib/error-facts"
import { texts } from "@/texts"

const words = texts.errorFacts
const q = words.quoted

describe("faits des erreurs de la base", () => {
  it("met en phrase les faits de chaque erreur, dans la langue de l'admin", () => {
    expect(describeFacts("verrou_tenu", "Anne")).toBe(words.heldBy("Anne"))
    expect(describeFacts("verrou_tenu", "")).toBe(words.heldBy(words.someone))
    expect(describeFacts("modele_utilise", '["Accueil", null]')).toBe(
      words.usedIn(`${q("Accueil")}, ${q(texts.common.untitled)}`)
    )
    expect(describeFacts("modele_vide", '["Contact"]')).toBe(
      words.emptyTemplates(q("Contact"))
    )
    expect(
      describeFacts(
        "fichier_indisponible",
        '[{"name": "vieux.webp", "state": "trashed"}, {"name": "a.png", "state": "pending"}, {"name": null, "state": "missing"}]'
      )
    ).toBe(
      words.unavailableFiles(
        `${words.fileTrashed(q("vieux.webp"))}, ${words.filePending(q("a.png"))}, ${words.fileMissing}`
      )
    )
    expect(describeFacts("fichier_inadapte", '["son.mp3"]')).toBe(
      words.wrongTypeFiles(q("son.mp3"))
    )
    expect(describeFacts("image_sans_fichier", "[2, 3]")).toBe(
      words.imageMissingAt("2, 3")
    )
  })

  it("ne dit rien sans faits, ou pour un autre code", () => {
    expect(describeFacts("fichier_utilise", null)).toBeNull()
    expect(describeFacts("fichier_utilise", "pas du JSON")).toBeNull()
    expect(describeFacts("contenu_introuvable", "x")).toBeNull()
    expect(describeFacts(null, "x")).toBeNull()
  })
})

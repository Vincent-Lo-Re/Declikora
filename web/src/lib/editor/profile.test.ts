import { describe, expect, it } from "vitest"

import { SHARED_ROOT_LIMIT } from "@/blocks/templates"
import type { ContentKind } from "@/lib/contents/api"
import { contentProfile, isListedKind } from "@/lib/editor/profile"

const kinds: ContentKind[] = ["article", "episode", "page", "template"]

describe("profil d'une sorte de contenu", () => {
  it("la carte de la liste : seulement pour un contenu des listes de l'app", () => {
    // Une page et un modèle ne sont dans aucune liste de l'app : pas de carte de la liste.
    expect(kinds.filter(isListedKind)).toEqual(["article", "episode"])
  })

  it("qui publie : le contenu, ou personne (modèle)", () => {
    expect(contentProfile("article").publication).toBe("own")
    expect(contentProfile("page").publication).toBe("own")
    expect(contentProfile("template").publication).toBeNull()
  })

  it("[D45] : image exigée pour un article et un épisode", () => {
    expect(contentProfile("article").cover).toBe("required")
    expect(contentProfile("episode").cover).toBe("required")
    expect(contentProfile("page").cover).toBeNull()
    expect(contentProfile("template").cover).toBeNull()
  })

  it("audio, catégories, adresse, niveau d'accès", () => {
    expect(kinds.filter((kind) => contentProfile(kind).audio)).toEqual([
      "episode",
    ])
    expect(contentProfile("article").categories).toBe("blog")
    expect(contentProfile("episode").categories).toBe("podcasts")
    expect(contentProfile("page").categories).toBeNull()
    expect(kinds.filter((kind) => contentProfile(kind).address)).toEqual([
      "page",
    ])
    expect(contentProfile("template").access).toBeNull()
    expect(contentProfile("page").access).toBe("own")
  })

  it("[D49] : un titre pour tout ce qui se publie, pas pour un modèle de bloc", () => {
    for (const kind of kinds) {
      expect(contentProfile(kind).titleRequired).toBe(kind !== "template")
    }
  })

  it("« Mes blocs » : pas dans un modèle ; un bloc partagé n'a qu'un bloc ([D11])", () => {
    expect(contentProfile("article").savedBlocks).toBe(true)
    expect(contentProfile("template", "style").savedBlocks).toBe(false)
    expect(contentProfile("template", "shared").rootLimit).toBe(
      SHARED_ROOT_LIMIT
    )
    expect(contentProfile("template", "style").rootLimit).toBeUndefined()
    expect(contentProfile("article").rootLimit).toBeUndefined()
  })
})

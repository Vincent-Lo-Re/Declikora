import { describe, expect, it } from "vitest"

import { SHARED_ROOT_LIMIT } from "@/blocks/templates"
import type { ContentKind } from "@/lib/contents/api"
import {
  contentProfile,
  isElementKind,
  isFeedKind,
  isListedKind,
} from "@/lib/editor/profile"

const kinds: ContentKind[] = [
  "article",
  "episode",
  "page",
  "method",
  "chapter",
  "lesson",
  "template",
]

describe("profil d'une sorte de contenu", () => {
  it("la mise en page : des blocs partout, sauf l'écran d'une méthode (le plan de ses chapitres)", () => {
    expect(contentProfile("method").layout).toBe("method")
    expect(kinds.filter(isFeedKind)).toEqual([
      "article",
      "episode",
      "page",
      "chapter",
      "lesson",
      "template",
    ])
    // Une page, un élément d'une méthode et un modèle ne sont dans aucune liste de l'app : pas
    // de carte de la liste.
    expect(kinds.filter(isListedKind)).toEqual(["article", "episode", "method"])
    expect(kinds.filter(isElementKind)).toEqual(["chapter", "lesson"])
  })

  it("qui publie : le contenu, sa méthode (chapitre, leçon, [D29]), personne (modèle)", () => {
    expect(contentProfile("article").publication).toBe("own")
    expect(contentProfile("page").publication).toBe("own")
    expect(contentProfile("method").publication).toBe("own")
    expect(contentProfile("chapter").publication).toBe("method")
    expect(contentProfile("lesson").publication).toBe("method")
    expect(contentProfile("template").publication).toBeNull()
  })

  it("[D45] : image exigée pour un article, un épisode et une méthode ; facultative pour un élément", () => {
    expect(contentProfile("article").cover).toBe("required")
    expect(contentProfile("episode").cover).toBe("required")
    expect(contentProfile("method").cover).toBe("required")
    expect(contentProfile("chapter").cover).toBe("optional")
    expect(contentProfile("lesson").cover).toBe("optional")
    expect(contentProfile("page").cover).toBeNull()
    expect(contentProfile("template").cover).toBeNull()
  })

  it("audio, catégories, adresse, niveau d'accès", () => {
    expect(kinds.filter((kind) => contentProfile(kind).audio)).toEqual([
      "episode",
    ])
    expect(contentProfile("article").categories).toBe("blog")
    expect(contentProfile("episode").categories).toBe("podcasts")
    expect(contentProfile("method").categories).toBeNull()
    expect(kinds.filter((kind) => contentProfile(kind).address)).toEqual([
      "page",
    ])
    expect(contentProfile("lesson").access).toBe("method")
    expect(contentProfile("template").access).toBeNull()
    expect(contentProfile("page").access).toBe("own")
  })

  it("[D49] : un titre pour tout ce qui se publie, pas pour un modèle de bloc", () => {
    for (const kind of kinds) {
      expect(contentProfile(kind).titleRequired).toBe(kind !== "template")
    }
  })

  it("« Mes blocs » : pas dans un modèle ni dans une méthode ; un bloc partagé n'a qu'un bloc ([D11])", () => {
    expect(contentProfile("article").savedBlocks).toBe(true)
    expect(contentProfile("lesson").savedBlocks).toBe(true)
    expect(contentProfile("template", "style").savedBlocks).toBe(false)
    expect(contentProfile("method").savedBlocks).toBe(false)
    expect(contentProfile("template", "shared").rootLimit).toBe(
      SHARED_ROOT_LIMIT
    )
    expect(contentProfile("template", "style").rootLimit).toBeUndefined()
    expect(contentProfile("article").rootLimit).toBeUndefined()
  })
})

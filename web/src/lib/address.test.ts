import { describe, expect, it } from "vitest"

import {
  listFiltersFromAddress,
  mediaFiltersFromAddress,
  settingsTabFromAddress,
  templateTabFromAddress,
  trashFilterFromAddress,
  writeListFilters,
  writeMediaFilters,
  writeSettingsTab,
  writeTemplateTab,
  writeTrashFilter,
} from "@/lib/address"
import {
  ALL_CATEGORIES,
  NO_CATEGORY,
  noFilters,
} from "@/lib/contents/list-filters"

const CATEGORY = "00000000-0000-4000-8000-00000000c001"

/** L'adresse après une écriture, à partir de params (une copie). */
function written(write: (params: URLSearchParams) => void, from = ""): string {
  const params = new URLSearchParams(from)
  write(params)
  return params.toString()
}

describe("les réglages des listes dans l'adresse (QCM du 05/10/2026)", () => {
  it("une liste de contenus : recherche, état et catégorie, en mots français", () => {
    expect(written((p) => writeListFilters(p, noFilters))).toBe("")
    const address = written((p) =>
      writeListFilters(p, {
        search: "bien dormir",
        state: "modified",
        category: CATEGORY,
      })
    )
    expect(address).toBe(
      `recherche=bien+dormir&etat=modifie&categorie=${CATEGORY}`
    )
    expect(listFiltersFromAddress(new URLSearchParams(address))).toEqual({
      search: "bien dormir",
      state: "modified",
      category: CATEGORY,
    })
    // Sans catégorie : un mot, pas un identifiant.
    expect(
      written((p) =>
        writeListFilters(p, { ...noFilters, category: NO_CATEGORY })
      )
    ).toBe("categorie=aucune")
    expect(
      listFiltersFromAddress(new URLSearchParams("categorie=aucune")).category
    ).toBe(NO_CATEGORY)
  })

  it("un mot inconnu vaut le réglage de départ ; revenir au départ retire le réglage", () => {
    expect(
      listFiltersFromAddress(new URLSearchParams("etat=perdu&autre=1"))
    ).toEqual({ ...noFilters, category: ALL_CATEGORIES })
    expect(
      written(
        (p) => writeListFilters(p, noFilters),
        "recherche=x&etat=brouillon&fichier=42"
      )
    ).toBe("fichier=42")
  })

  it("la Médiathèque : type, recherche et « Non utilisés », à côté de la fiche ouverte", () => {
    const address = written(
      (p) =>
        writeMediaFilters(p, { kind: "audio", search: "pluie", unused: true }),
      "fichier=42"
    )
    expect(address).toBe(
      "fichier=42&type=audio&recherche=pluie&non-utilises=oui"
    )
    expect(mediaFiltersFromAddress(new URLSearchParams(address))).toEqual({
      kind: "audio",
      search: "pluie",
      unused: true,
    })
    expect(mediaFiltersFromAddress(new URLSearchParams())).toEqual({
      kind: "all",
      search: "",
      unused: false,
    })
  })

  it("l'onglet de Paramètres : le premier par défaut, absent de l'adresse", () => {
    expect(written((p) => writeSettingsTab(p, "plans"))).toBe("onglet=formules")
    expect(settingsTabFromAddress(new URLSearchParams("onglet=avance"))).toBe(
      "advanced"
    )
    expect(settingsTabFromAddress(new URLSearchParams())).toBe("admin")
    expect(
      written((p) => writeSettingsTab(p, "admin"), "onglet=formules")
    ).toBe("")
  })

  it("l'onglet des Modèles de bloc et le filtre de la Corbeille", () => {
    expect(written((p) => writeTemplateTab(p, "shared"))).toBe(
      "onglet=partages"
    )
    expect(
      templateTabFromAddress(new URLSearchParams("onglet=points-de-depart"))
    ).toBe("starter")
    expect(written((p) => writeTemplateTab(p, "all"), "onglet=partages")).toBe(
      ""
    )
    expect(written((p) => writeTrashFilter(p, "template"))).toBe("type=modele")
    expect(trashFilterFromAddress(new URLSearchParams("type=fichier"))).toBe(
      "file"
    )
    expect(trashFilterFromAddress(new URLSearchParams("type=autre"))).toBe(
      "all"
    )
  })
})

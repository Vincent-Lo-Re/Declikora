import type { PostgrestError } from "@supabase/supabase-js"
import { describe, expect, it } from "vitest"

import {
  CategoryError,
  categoryNames,
  isCategoryAccessLost,
  toCategoryError,
  versionCategoryNames,
  type Category,
} from "@/lib/categories"
import { texts } from "@/texts"

const categories: Category[] = [
  {
    id: "c1",
    name: "Sommeil",
    position: 0,
    created_at: "2026-10-01T10:00:00Z",
    uses: 2,
  },
  {
    id: "c2",
    name: "Stress",
    position: 1,
    created_at: "2026-10-01T10:00:00Z",
    uses: 0,
  },
  {
    id: "c3",
    name: "Nutrition",
    position: 2,
    created_at: "2026-10-01T10:00:00Z",
    uses: 1,
  },
]

function pgError(changes: Partial<PostgrestError>): PostgrestError {
  return {
    name: "PostgrestError",
    message: "",
    details: "",
    hint: "",
    code: "",
    ...changes,
  } as PostgrestError
}

describe("catégories", () => {
  it("donne les noms dans l'ordre de la section, sans les catégories supprimées ([D28])", () => {
    expect(categoryNames(["c3", "c1", "disparue"], categories)).toEqual([
      "Sommeil",
      "Nutrition",
    ])
    expect(categoryNames([], categories)).toEqual([])
  })

  it("les catégories d'une version : les supprimées sont comptées à part ([D28])", () => {
    expect(
      versionCategoryNames(["c3", "disparue", "c1", "partie"], categories)
    ).toEqual({ names: ["Sommeil", "Nutrition"], deleted: 2 })
    expect(versionCategoryNames([], categories)).toEqual({
      names: [],
      deleted: 0,
    })
  })

  it("traduit les erreurs de la base", () => {
    expect(toCategoryError(pgError({ code: "23505" })).message).toBe(
      texts.categories.errors.nom_en_double
    )
    expect(toCategoryError(pgError({ code: "23514" })).code).toBe(
      "nom_invalide"
    )
    const refused = toCategoryError(
      pgError({ code: "42501", message: "reserve_a_l_equipe" })
    )
    expect(refused.code).toBe("reserve_a_l_equipe")
    expect(isCategoryAccessLost(refused)).toBe(true)
    expect(
      toCategoryError(pgError({ code: "P0001", message: "demande_invalide" }))
        .message
    ).toBe(texts.categories.errors.demande_invalide)
    expect(toCategoryError(pgError({ code: "XX000" })).message).toBe(
      texts.common.unexpected
    )
    expect(isCategoryAccessLost(new CategoryError("introuvable"))).toBe(false)
  })
})

import { describe, expect, it } from "vitest"

import type { CategoryUse } from "@/lib/categories"
import { removalOf } from "@/lib/contents/category-removal"

// Ce que fait « Retirer » selon l'état du contenu (décidé le 08/10/2026).

const base: CategoryUse = {
  content_id: "a1",
  kind: "article",
  title: "Bien dormir",
  in_draft: true,
  in_app: false,
  in_trash: false,
  live_state: "draft",
  scheduled: false,
  writer: null,
}

describe("removalOf", () => {
  it("un brouillon, ou un contenu retiré de l'app : retirée du brouillon", () => {
    expect(removalOf(base)).toEqual({
      state: "draft",
      plan: "draft",
      notInDraft: false,
    })
    expect(removalOf({ ...base, live_state: "withdrawn" }).plan).toBe("draft")
  })

  it("en ligne sans autre modification : retirée et republiée", () => {
    expect(removalOf({ ...base, in_app: true, live_state: "live" }).plan).toBe(
      "republish"
    )
  })

  it("modifié depuis la publication : retirée du brouillon seulement", () => {
    expect(
      removalOf({ ...base, in_app: true, live_state: "modified" }).plan
    ).toBe("draftOnly")
  })

  it("déjà retirée du brouillon, encore en ligne : indisponible", () => {
    expect(
      removalOf({
        ...base,
        in_draft: false,
        in_app: true,
        live_state: "modified",
      })
    ).toEqual({ state: "modified", plan: null, notInDraft: true })
  })

  it("programmé, en cours d'écriture ou à la Corbeille : indisponible, la Corbeille puis l'écriture priment", () => {
    const writer = { id: "u2", name: "Marie" }
    expect(
      removalOf({ ...base, live_state: "live", scheduled: true })
    ).toMatchObject({ state: "scheduled", plan: null })
    expect(removalOf({ ...base, scheduled: true, writer })).toMatchObject({
      state: "writing",
      plan: null,
    })
    expect(removalOf({ ...base, writer, in_trash: true })).toMatchObject({
      state: "trash",
      plan: null,
    })
  })
})

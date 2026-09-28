import { describe, expect, it } from "vitest"

import {
  validateBlock,
  validateDraft,
  validatePublished,
  validateTemplate,
} from "@/blocks/generated/validators"

// Les cas partagés de blocks/cases/ : les mêmes que ceux de pgTAP (30_blocs_schema), pour que
// l'admin et la base donnent toujours le même verdict.
type SharedCase = {
  description: string
  variant: "draft" | "template" | "published"
  valid: boolean
  data: unknown
}

const files = import.meta.glob<SharedCase>("../../../blocks/cases/*.json", {
  eager: true,
  import: "default",
})
const cases = Object.entries(files).map(([path, value]) => ({
  name: path
    .split("/")
    .pop()!
    .replace(/\.json$/, ""),
  ...value,
}))

describe("validateurs générés (blocks/cases)", () => {
  it("trouve les cas partagés", () => {
    expect(cases.length).toBeGreaterThanOrEqual(40)
    expect(cases.some((item) => item.valid)).toBe(true)
    expect(cases.some((item) => !item.valid)).toBe(true)
  })

  it.each(cases)("$name : $description", ({ variant, valid, data }) => {
    const validate = {
      draft: validateDraft,
      template: validateTemplate,
      published: validatePublished,
    }[variant]
    expect(validate(data)).toBe(valid)
    if (!valid) expect(validate.errors?.length).toBeGreaterThan(0)
  })

  it("donne le chemin précis de l'erreur", () => {
    const bad = cases.find((item) => item.name === "refuse-legende-301")!
    expect(validateDraft(bad.data)).toBe(false)
    expect(validateDraft.errors?.[0]?.instancePath).toMatch(
      /^\/blocks\/\d+\/caption$/
    )
  })

  it("valide un bloc seul (ce que fera l'app)", () => {
    expect(
      validateBlock({
        id: "00000000-0000-4000-8000-000000000001",
        type: "image",
        mediaId: null,
        caption: null,
        alt: null,
      })
    ).toBe(true)
    expect(validateBlock({ id: "x", type: "video" })).toBe(false)
  })
})

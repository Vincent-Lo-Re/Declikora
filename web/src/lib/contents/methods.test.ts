import { describe, expect, it } from "vitest"

import { screenAbove, type ElementContext } from "@/lib/contents/methods"

const context: ElementContext = {
  method: {
    id: "m",
    title: "Mieux respirer",
    deleted: false,
    access: { accessChosen: true, accessLevelId: null },
  },
  chapter: { id: "c", title: "Les bases" },
  lesson: { id: "l", title: "Le souffle", isFree: false },
}

describe("l'écran du dessus, en Lecture (QCM du 04/10/2026)", () => {
  it("la leçon d'un exercice, la méthode d'un chapitre ou d'une leçon", () => {
    expect(screenAbove("exercise", context)).toEqual({
      kind: "lesson",
      id: "l",
      title: "Le souffle",
    })
    const method = { kind: "method", id: "m", title: "Mieux respirer" }
    expect(screenAbove("lesson", { ...context, lesson: null })).toEqual(method)
    expect(screenAbove("chapter", { ...context, lesson: null })).toEqual(method)
  })
})

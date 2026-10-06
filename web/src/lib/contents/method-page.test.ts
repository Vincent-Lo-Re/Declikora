import { describe, expect, it } from "vitest"

import {
  elementContextOf,
  currentPart,
  methodParts,
  methodSaveState,
  pageItems,
  partAbove,
  partFromAddress,
  partPath,
  partPlace,
  withPart,
  withShown,
  type ElementPart,
} from "@/lib/contents/method-page"
import type {
  MethodTree,
  OutlineChapter,
  OutlineElement,
  OutlineLesson,
} from "@/lib/contents/outline"
import type { AutosaveState } from "@/lib/editor/autosave"

function element(id: string, kind: OutlineElement["kind"]): OutlineElement {
  return {
    id,
    kind,
    title: id,
    inApp: false,
    isFree: false,
    draftSavedAt: "2026-10-06T08:00:00Z",
    savedByName: null,
    editingId: null,
    editingName: null,
    published: false,
  }
}

function lesson(id: string, exercises: string[] = []): OutlineLesson {
  return {
    ...element(id, "lesson"),
    kind: "lesson",
    exercises: exercises.map((exercise) => element(exercise, "exercise")),
  }
}

/** Un chapitre ; une leçon s'écrit « a1 » ou « a1:x1,x2 » (avec ses exercices). */
function chapter(id: string, lessons: string[]): OutlineChapter {
  return {
    ...element(id, "chapter"),
    kind: "chapter",
    lessons: lessons.map((entry) => {
      const [lessonId, exercises] = entry.split(":")
      return lesson(lessonId, exercises ? exercises.split(",") : [])
    }),
  }
}

const tree: MethodTree = [
  chapter("a", ["a1:x1,x2", "a2"]),
  chapter("b", []),
  chapter("c", ["c1"]),
]

describe("les parties d'une méthode", () => {
  it("la fiche, puis chaque chapitre, ses leçons et leurs exercices, dans l'ordre", () => {
    expect(methodParts("m", tree).map((part) => part.id)).toEqual([
      "m",
      "a",
      "a1",
      "x1",
      "x2",
      "a2",
      "b",
      "c",
      "c1",
    ])
  })

  it("chaque partie dit sa place dans son parent", () => {
    const parts = methodParts("m", tree)
    expect(parts.map(partPlace)).toEqual([
      null,
      "Chapitre 1",
      "Leçon 1",
      "Exercice 1",
      "Exercice 2",
      "Leçon 2",
      "Chapitre 2",
      "Chapitre 3",
      "Leçon 1",
    ])
  })

  it("pour les lecteurs d'écran, un nom complet, unique dans la méthode", () => {
    const parts = methodParts("m", tree)
    expect(parts.map(partPath)).toEqual([
      null,
      "Chapitre 1",
      "Chapitre 1, leçon 1",
      "Chapitre 1, leçon 1, exercice 1",
      "Chapitre 1, leçon 1, exercice 2",
      "Chapitre 1, leçon 2",
      "Chapitre 2",
      "Chapitre 3",
      "Chapitre 3, leçon 1",
    ])
  })

  it("en Édition : « Nouvel exercice » à la fin de chaque leçon, « Nouvelle leçon » à la fin de chaque chapitre, « Nouveau chapitre » en bas", () => {
    const items = pageItems(methodParts("m", tree)).map((item) =>
      item.type === "part"
        ? item.part.id
        : item.type === "newExercise"
          ? `+exercice ${item.lesson.id} (${item.lessonNumber})`
          : item.type === "newLesson"
            ? `+leçon ${item.chapter.id} (${item.chapterNumber})`
            : "+chapitre"
    )
    expect(items).toEqual([
      "m",
      "a",
      "a1",
      "x1",
      "x2",
      "+exercice a1 (1)",
      "a2",
      "+exercice a2 (2)",
      "+leçon a (1)",
      "b",
      "+leçon b (2)",
      "c",
      "c1",
      "+exercice c1 (1)",
      "+leçon c (3)",
      "+chapitre",
    ])
  })

  it("une méthode sans chapitre : la fiche et « Nouveau chapitre »", () => {
    expect(pageItems(methodParts("m", [])).map((item) => item.type)).toEqual([
      "part",
      "newChapter",
    ])
  })

  it("en Lecture, l'écran du dessus : la leçon d'un exercice, la méthode d'un chapitre ou d'une leçon", () => {
    const parts = methodParts("m", tree)
    const byId = (id: string) => parts.find((part) => part.id === id)!
    expect(partAbove(byId("x2"))).toEqual({ id: "a1", title: "a1" })
    expect(partAbove(byId("a2"))).toBe("method")
    expect(partAbove(byId("b"))).toBe("method")
    expect(partAbove(byId("m"))).toBeNull()
  })
})

describe("l'arbre tel qu'il est à l'écran", () => {
  it("les titres tapés et les cases cochées, pas encore enregistrés", () => {
    const shown = withShown(
      tree,
      new Map([
        ["a1", { title: "Le souffle", inApp: true }],
        ["x2", { isFree: false, inApp: true }],
        ["c", { title: "Plus loin" }],
      ])
    )
    expect(shown[0].lessons[0]).toMatchObject({
      title: "Le souffle",
      inApp: true,
    })
    expect(shown[0].lessons[0].exercises[1]).toMatchObject({ inApp: true })
    expect(shown[2].title).toBe("Plus loin")
    // Ce qui ne change pas reste le même objet.
    expect(shown[1]).toBe(tree[1])
    expect(shown[0].lessons[1]).toBe(tree[0].lessons[1])
  })

  it("rien de différent : le même arbre", () => {
    expect(withShown(tree, new Map())).toBe(tree)
    expect(
      withShown(tree, new Map([["a", { title: "a", inApp: false }]]))
    ).toBe(tree)
  })

  it("la méthode, le chapitre et la leçon d'un exercice, pour sa carte « Dans la méthode »", () => {
    const parts = methodParts("m", tree)
    const exercise = parts.find((part) => part.id === "x1") as ElementPart
    const method = {
      id: "m",
      title: "Respirer",
      access: { accessChosen: true, accessLevelId: null },
    }
    expect(elementContextOf(exercise, method)).toEqual({
      method: { ...method, deleted: false },
      chapter: { id: "a", title: "a" },
      lesson: { id: "a1", title: "a1", isFree: false },
    })
    const chapter = parts.find((part) => part.id === "b") as ElementPart
    expect(elementContextOf(chapter, method)).toMatchObject({
      chapter: null,
      lesson: null,
    })
  })
})

describe("la partie dans l'adresse", () => {
  it("lue, puis écrite (sans la fiche) en gardant le reste", () => {
    expect(partFromAddress("?partie=a1&mode=lecture")).toBe("a1")
    expect(partFromAddress("?mode=lecture")).toBeNull()
    expect(partFromAddress("?partie=")).toBeNull()
    const params = new URLSearchParams("mode=lecture")
    expect(withPart(params, "x1").toString()).toBe("mode=lecture&partie=x1")
    expect(
      withPart(new URLSearchParams("partie=x1&mode=lecture"), null).toString()
    ).toBe("mode=lecture")
    // L'adresse de départ n'a pas changé.
    expect(params.toString()).toBe("mode=lecture")
  })
})

describe("la partie en cours d'après le défilement", () => {
  // Un écran de 1000 de haut : la ligne de lecture est à 300.
  const boxes = [
    { id: "m", top: -900, bottom: -220 },
    { id: "a", top: -200, bottom: 100 },
    { id: "a1", top: 120, bottom: 580 },
    { id: "x1", top: 600, bottom: 1400 },
  ]
  const at = (changes: { focusedId?: string | null; atBottom?: boolean }) =>
    currentPart({
      boxes,
      height: 1000,
      focusedId: null,
      atBottom: false,
      ...changes,
    })

  it("la dernière dont le haut a passé la ligne de lecture", () => {
    expect(at({})).toBe("a1")
    expect(
      currentPart({ boxes, height: 300, focusedId: null, atBottom: false })
    ).toBe("a")
  })

  it("la partie qui a le curseur, tant qu'elle se voit", () => {
    expect(at({ focusedId: "x1" })).toBe("x1")
    expect(at({ focusedId: "a" })).toBe("a")
    // Partie hors de l'écran : le défilement mène.
    expect(at({ focusedId: "m" })).toBe("a1")
  })

  it("tout en bas : la dernière partie", () => {
    expect(at({ atBottom: true })).toBe("x1")
  })

  it("avant la première partie : la première ; sans partie : aucune", () => {
    expect(
      currentPart({
        boxes: [{ id: "m", top: 400, bottom: 900 }],
        height: 1000,
        focusedId: null,
        atBottom: false,
      })
    ).toBe("m")
    expect(
      currentPart({ boxes: [], height: 1000, focusedId: null, atBottom: true })
    ).toBeNull()
  })
})

describe("l'enregistrement de toute la méthode", () => {
  const state = (changes: Partial<AutosaveState>): AutosaveState => ({
    status: "saved",
    rev: 1,
    savedAt: null,
    unsaved: false,
    error: null,
    ...changes,
  })

  it("tout enregistré : la dernière heure d'enregistrement", () => {
    expect(
      methodSaveState([
        state({ savedAt: "2026-10-06T08:00:00Z" }),
        state({ savedAt: "2026-10-06T09:30:00Z" }),
        state({}),
      ])
    ).toMatchObject({
      status: "saved",
      savedAt: "2026-10-06T09:30:00Z",
      unsaved: false,
    })
  })

  it("la partie la plus en difficulté l'emporte : refusée, hors ligne, en cours", () => {
    expect(
      methodSaveState([
        state({ status: "saving", unsaved: true }),
        state({ status: "offline", unsaved: true }),
      ])
    ).toMatchObject({ status: "offline", unsaved: true })
    expect(
      methodSaveState([
        state({ status: "pending", unsaved: true }),
        state({ status: "stopped" }),
      ]).status
    ).toBe("stopped")
  })

  it("sans partie : enregistré", () => {
    expect(methodSaveState([])).toMatchObject({
      status: "saved",
      savedAt: null,
      unsaved: false,
    })
  })
})

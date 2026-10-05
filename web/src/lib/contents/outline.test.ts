import { describe, expect, it } from "vitest"

import {
  appPlan,
  canDropOutline,
  changesView,
  CHANGES_SHOWN,
  elementAccess,
  elementState,
  exerciseCount,
  exerciseZoneId,
  findInTree,
  lessonCount,
  lessonZoneId,
  liveIds,
  moveChapter,
  moveExercise,
  moveLesson,
  moveOnDropOutline,
  moveOverOutline,
  nextScreen,
  notInAppReason,
  parentsInApp,
  parseLiveOutline,
  previewByElement,
  previewProblems,
  sameOrder,
  screenReserved,
  shiftInTree,
  shownProblem,
  targetChapter,
  targetLesson,
  toOutlinePayload,
  type MethodTree,
  type OutlineChapter,
  type OutlineElement,
  type OutlineLesson,
  type PreviewRow,
} from "@/lib/contents/outline"

function element(
  id: string,
  kind: OutlineElement["kind"],
  changes: Partial<OutlineElement> = {}
): OutlineElement {
  return {
    id,
    kind,
    title: id,
    inApp: false,
    isFree: false,
    draftSavedAt: "2026-09-28T08:00:00Z",
    savedByName: null,
    editingId: null,
    editingName: null,
    published: false,
    ...changes,
  }
}

function lesson(
  id: string,
  exercises: string[] = [],
  changes: Partial<OutlineElement> = {}
): OutlineLesson {
  return {
    ...element(id, "lesson", changes),
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

// Chapitre A (leçons a1, avec les exercices x1 et x2, et a2), chapitre B (b1, avec x3), chapitre
// C (vide).
const tree: MethodTree = [
  chapter("A", ["a1:x1,x2", "a2"]),
  chapter("B", ["b1:x3"]),
  chapter("C", []),
]

/** L'ordre d'un arbre, lisible : « A(a1[x1,x2],a2) B(b1[x3]) C() ». */
function order(value: MethodTree): string {
  return value
    .map(
      (entry) =>
        `${entry.id}(${entry.lessons
          .map((item) =>
            item.exercises.length > 0
              ? `${item.id}[${item.exercises.map((x) => x.id).join(",")}]`
              : item.id
          )
          .join(",")})`
    )
    .join(" ")
}

describe("l'arbre d'une méthode", () => {
  it("trouve un chapitre ou une leçon, avec sa place", () => {
    expect(findInTree(tree, "B")).toMatchObject({
      kind: "chapter",
      chapterIndex: 1,
    })
    expect(findInTree(tree, "a2")).toMatchObject({
      kind: "lesson",
      chapterIndex: 0,
      lessonIndex: 1,
    })
    expect(findInTree(tree, "inconnu")).toBeNull()
    expect(lessonCount(tree)).toBe(3)
  })

  it("déplace un chapitre et une leçon, y compris d'un chapitre à l'autre", () => {
    expect(order(moveChapter(tree, "C", 0))).toBe(
      "C() A(a1[x1,x2],a2) B(b1[x3])"
    )
    expect(order(moveChapter(tree, "A", 99))).toBe(
      "B(b1[x3]) C() A(a1[x1,x2],a2)"
    )
    expect(order(moveLesson(tree, "a1", "A", 1))).toBe(
      "A(a2,a1[x1,x2]) B(b1[x3]) C()"
    )
    expect(order(moveLesson(tree, "a2", "C", 0))).toBe(
      "A(a1[x1,x2]) B(b1[x3]) C(a2)"
    )
    expect(order(moveLesson(tree, "b1", "A", 0))).toBe(
      "A(b1[x3],a1[x1,x2],a2) B() C()"
    )
    // Un chapitre n'entre pas dans un chapitre ; une destination inconnue ne change rien.
    expect(moveLesson(tree, "A", "B", 0)).toBe(tree)
    expect(moveLesson(tree, "a1", "Z", 0)).toBe(tree)
    // L'arbre d'origine n'est jamais modifié.
    expect(order(tree)).toBe("A(a1[x1,x2],a2) B(b1[x3]) C()")
  })

  it("« Monter » et « Descendre » : une leçon passe au chapitre voisin à la limite", () => {
    expect(order(shiftInTree(tree, "a2", -1)!)).toBe(
      "A(a2,a1[x1,x2]) B(b1[x3]) C()"
    )
    // En fin de chapitre, elle descend en tête du suivant ; en tête, elle monte à la fin du
    // précédent.
    expect(order(shiftInTree(tree, "a2", 1)!)).toBe(
      "A(a1[x1,x2]) B(a2,b1[x3]) C()"
    )
    expect(order(shiftInTree(tree, "b1", -1)!)).toBe(
      "A(a1[x1,x2],a2,b1[x3]) B() C()"
    )
    expect(order(shiftInTree(tree, "b1", 1)!)).toBe(
      "A(a1[x1,x2],a2) B() C(b1[x3])"
    )
    // Aux deux bouts du plan, rien ne bouge.
    expect(shiftInTree(tree, "a1", -1)).toBeNull()
    expect(shiftInTree([chapter("A", ["a1"])], "a1", 1)).toBeNull()
    // Un chapitre reste parmi les chapitres.
    expect(order(shiftInTree(tree, "B", -1)!)).toBe(
      "B(b1[x3]) A(a1[x1,x2],a2) C()"
    )
    expect(shiftInTree(tree, "A", -1)).toBeNull()
    expect(shiftInTree(tree, "C", 1)).toBeNull()
  })

  it("compare deux ordres et prépare ce que reçoit outline_reorder", () => {
    expect(sameOrder(tree, [...tree])).toBe(true)
    expect(sameOrder(tree, moveLesson(tree, "a1", "A", 1))).toBe(false)
    expect(sameOrder(tree, moveLesson(tree, "b1", "C", 0))).toBe(false)
    expect(toOutlinePayload(tree)).toEqual([
      {
        chapterId: "A",
        lessons: [
          { lessonId: "a1", exerciseIds: ["x1", "x2"] },
          { lessonId: "a2", exerciseIds: [] },
        ],
      },
      { chapterId: "B", lessons: [{ lessonId: "b1", exerciseIds: ["x3"] }] },
      { chapterId: "C", lessons: [] },
    ])
  })

  it("trouve un exercice, avec sa leçon et son chapitre, et compte les exercices", () => {
    expect(findInTree(tree, "x2")).toMatchObject({
      kind: "exercise",
      chapterIndex: 0,
      lessonIndex: 0,
      exerciseIndex: 1,
      lesson: { id: "a1" },
    })
    expect(exerciseCount(tree)).toBe(3)
  })

  it("déplace un exercice dans sa leçon ou dans une autre, même d'un autre chapitre", () => {
    expect(order(moveExercise(tree, "x1", "a1", 1))).toBe(
      "A(a1[x2,x1],a2) B(b1[x3]) C()"
    )
    expect(order(moveExercise(tree, "x3", "a2", 0))).toBe(
      "A(a1[x1,x2],a2[x3]) B(b1) C()"
    )
    // Une leçon n'entre pas dans une leçon ; une destination inconnue ne change rien.
    expect(moveExercise(tree, "a2", "a1", 0)).toBe(tree)
    expect(moveExercise(tree, "x1", "Z", 0)).toBe(tree)
    expect(sameOrder(tree, moveExercise(tree, "x1", "a1", 1))).toBe(false)
    expect(sameOrder(tree, moveExercise(tree, "x3", "a2", 0))).toBe(false)
  })

  it("« Monter » et « Descendre » : un exercice passe à la leçon voisine à la limite, même d'un chapitre à l'autre", () => {
    expect(order(shiftInTree(tree, "x2", -1)!)).toBe(
      "A(a1[x2,x1],a2) B(b1[x3]) C()"
    )
    expect(order(shiftInTree(tree, "x2", 1)!)).toBe(
      "A(a1[x1],a2[x2]) B(b1[x3]) C()"
    )
    expect(order(shiftInTree(tree, "x3", -1)!)).toBe(
      "A(a1[x1,x2],a2[x3]) B(b1) C()"
    )
    // Aux deux bouts du plan, rien ne bouge.
    expect(shiftInTree(tree, "x1", -1)).toBeNull()
    expect(shiftInTree(tree, "x3", 1)).toBeNull()
  })
})

describe("règles de dépôt", () => {
  it("un exercice ne vise que les exercices ou une leçon vide", () => {
    expect(canDropOutline(tree, "x1", "x3")).toBe(true)
    expect(canDropOutline(tree, "x1", exerciseZoneId("a2"))).toBe(true)
    expect(canDropOutline(tree, "x1", "a2")).toBe(false)
    expect(canDropOutline(tree, "x1", lessonZoneId("C"))).toBe(false)
    expect(canDropOutline(tree, "a1", exerciseZoneId("a2"))).toBe(false)
    expect(targetLesson(tree, exerciseZoneId("Z"))).toBeNull()
    expect(targetLesson(tree, "x3")).toBe("b1")
  })

  it("au survol, un exercice change de leçon ; au dépôt, il prend la place visée", () => {
    expect(order(moveOverOutline(tree, "x1", "x3", false)!)).toBe(
      "A(a1[x2],a2) B(b1[x1,x3]) C()"
    )
    expect(order(moveOverOutline(tree, "x1", "x3", true)!)).toBe(
      "A(a1[x2],a2) B(b1[x3,x1]) C()"
    )
    expect(
      order(moveOverOutline(tree, "x1", exerciseZoneId("a2"), false)!)
    ).toBe("A(a1[x2],a2[x1]) B(b1[x3]) C()")
    expect(moveOverOutline(tree, "x1", "x2", true)).toBeNull()
    expect(order(moveOnDropOutline(tree, "x1", "x2")!)).toBe(
      "A(a1[x2,x1],a2) B(b1[x3]) C()"
    )
    expect(moveOnDropOutline(tree, "x1", "x3")).toBeNull()
    expect(moveOnDropOutline(tree, "x1", "a2")).toBeNull()
  })

  it("un chapitre ne vise que les chapitres, une leçon les leçons ou un chapitre vide", () => {
    expect(canDropOutline(tree, "A", "B")).toBe(true)
    expect(canDropOutline(tree, "A", "b1")).toBe(false)
    expect(canDropOutline(tree, "A", lessonZoneId("C"))).toBe(false)
    expect(canDropOutline(tree, "a1", "b1")).toBe(true)
    expect(canDropOutline(tree, "a1", lessonZoneId("C"))).toBe(true)
    // Une leçon ne sort jamais des chapitres.
    expect(canDropOutline(tree, "a1", "B")).toBe(false)
    expect(canDropOutline(tree, "inconnu", "B")).toBe(false)
    expect(targetChapter(tree, lessonZoneId("Z"))).toBeNull()
    expect(targetChapter(tree, "b1")).toBe("B")
  })

  it("au survol, une leçon change de chapitre ; au dépôt, elle prend la place visée", () => {
    // Survol de b1, au-dessus puis au-dessous de son milieu.
    expect(order(moveOverOutline(tree, "a1", "b1", false)!)).toBe(
      "A(a2) B(a1[x1,x2],b1[x3]) C()"
    )
    expect(order(moveOverOutline(tree, "a1", "b1", true)!)).toBe(
      "A(a2) B(b1[x3],a1[x1,x2]) C()"
    )
    // Un chapitre vide : à la fin.
    expect(order(moveOverOutline(tree, "a1", lessonZoneId("C"), false)!)).toBe(
      "A(a2) B(b1[x3]) C(a1[x1,x2])"
    )
    // Dans le même chapitre, ou pour un chapitre : rien au survol.
    expect(moveOverOutline(tree, "a1", "a2", true)).toBeNull()
    expect(moveOverOutline(tree, "A", "B", true)).toBeNull()

    expect(order(moveOnDropOutline(tree, "a1", "a2")!)).toBe(
      "A(a2,a1[x1,x2]) B(b1[x3]) C()"
    )
    expect(order(moveOnDropOutline(tree, "C", "A")!)).toBe(
      "C() A(a1[x1,x2],a2) B(b1[x3])"
    )
    // Pas de dépôt entre sortes différentes, ni sur soi-même.
    expect(moveOnDropOutline(tree, "a1", "B")).toBeNull()
    expect(moveOnDropOutline(tree, "a1", "a1")).toBeNull()
    expect(moveOnDropOutline(tree, "a1", "b1")).toBeNull()
  })
})

describe("plan en ligne et état de chaque élément", () => {
  const outline = parseLiveOutline([
    {
      chapterId: "A",
      versionId: "vA",
      lessons: [
        {
          lessonId: "a1",
          versionId: "va1",
          exercises: [
            { exerciseId: "x1", versionId: "vx1" },
            { exerciseId: 7 },
          ],
        },
        { lessonId: 42, versionId: "?" },
        // Un plan publié avant les exercices.
        { lessonId: "a2", versionId: "va2" },
      ],
    },
    "n'importe quoi",
  ])

  it("lit le plan figé de la version en ligne", () => {
    expect(outline).toEqual({
      chapters: [
        {
          chapterId: "A",
          versionId: "vA",
          lessons: [
            {
              lessonId: "a1",
              versionId: "va1",
              exercises: [{ exerciseId: "x1", versionId: "vx1" }],
            },
            { lessonId: "a2", versionId: "va2", exercises: [] },
          ],
        },
      ],
    })
    expect(parseLiveOutline(null)).toBeNull()
    expect([...liveIds(outline)]).toEqual(["A", "a1", "x1", "a2"])
    expect(liveIds(null).size).toBe(0)
  })

  const row = (
    elementId: string,
    change: PreviewRow["change"],
    problem: string | null = null
  ): PreviewRow => ({
    elementId,
    kind: elementId === "M" ? "method" : "lesson",
    title: elementId,
    chapterId: null,
    chapterTitle: null,
    lessonId: null,
    lessonTitle: null,
    change,
    problem,
    problemDetail: null,
    savedAt: null,
    savedByName: null,
  })
  const shown = { chapter: true, lesson: true }

  it("« neuf », « modifié », « sera retiré » viennent de la liste des changements", () => {
    const live = liveIds(outline)
    const preview = previewByElement([
      row("M", "reordered"),
      row("a1", "modified"),
      row("a2", "new"),
      row("A", "removed"),
    ])
    // La ligne de la méthode n'est pas celle d'un élément.
    expect(preview.has("M")).toBe(false)
    const one = (id: string, changes: Partial<OutlineElement> = {}) =>
      element(id, "lesson", changes)
    expect(elementState(one("a1", { inApp: true }), shown, live, preview)).toBe(
      "modified"
    )
    expect(elementState(one("a2", { inApp: true }), shown, live, preview)).toBe(
      "new"
    )
    expect(elementState(element("A", "chapter"), shown, live, preview)).toBe(
      "removing"
    )
  })

  it("sans changement : en ligne, caché, retiré, ou caché avec son chapitre", () => {
    const live = liveIds(outline)
    const empty = previewByElement([])
    expect(
      elementState(element("a1", "lesson", { inApp: true }), shown, live, empty)
    ).toBe("live")
    expect(elementState(element("x", "lesson"), shown, live, empty)).toBe(
      "hidden"
    )
    expect(
      elementState(
        element("x", "lesson", { published: true }),
        shown,
        live,
        empty
      )
    ).toBe("withdrawn")
    // Une leçon cochée dans un chapitre décoché ne part pas.
    expect(
      elementState(
        element("x", "lesson", { inApp: true }),
        { chapter: false, lesson: true },
        live,
        empty
      )
    ).toBe("blocked")
    // Un exercice coché dans une leçon décochée non plus ; dans un chapitre décoché, comme une
    // leçon.
    const exercise = element("y", "exercise", { inApp: true })
    expect(
      elementState(exercise, { chapter: true, lesson: false }, live, empty)
    ).toBe("blockedLesson")
    expect(
      elementState(exercise, { chapter: false, lesson: true }, live, empty)
    ).toBe("blocked")
    expect(elementState(exercise, shown, live, empty)).toBe("new")
    // Un exercice en ligne, cité par le plan.
    expect(
      elementState(
        element("x1", "exercise", { inApp: true }),
        shown,
        live,
        empty
      )
    ).toBe("live")
  })

  it("les parents d'un élément, d'après sa place", () => {
    const mixed: MethodTree = [
      {
        ...chapter("A", []),
        inApp: true,
        lessons: [lesson("a1", ["x1"], { inApp: false })],
      },
    ]
    expect(parentsInApp(findInTree(mixed, "A")!)).toEqual(shown)
    expect(parentsInApp(findInTree(mixed, "a1")!)).toEqual(shown)
    expect(parentsInApp(findInTree(mixed, "x1")!)).toEqual({
      chapter: true,
      lesson: false,
    })
  })

  it("tant que la liste des changements n'est pas lue, l'état se déduit des cases", () => {
    const live = liveIds(outline)
    expect(
      elementState(
        element("a1", "lesson", { inApp: true }),
        shown,
        live,
        undefined
      )
    ).toBe("live")
    expect(elementState(element("a1", "lesson"), shown, live, undefined)).toBe(
      "removing"
    )
    expect(
      elementState(
        element("y", "lesson", { inApp: true }),
        shown,
        live,
        undefined
      )
    ).toBe("new")
  })

  it("repère ce qui ferait refuser la publication", () => {
    expect(
      previewProblems([
        row("a1", "modified", "image_sans_fichier"),
        row("a2", "new"),
      ]).map((entry) => entry.elementId)
    ).toEqual(["a1"])
  })
})

describe("niveau d'accès d'un élément ([D43])", () => {
  const reserved = { accessChosen: true, accessLevelId: "essentiel" }
  const free = { accessChosen: true, accessLevelId: null }

  it("une leçon : celui de la méthode, sauf si elle est gratuite", () => {
    const lesson = { kind: "lesson", isFree: false } as const
    expect(elementAccess(reserved, lesson, [])).toEqual(reserved)
    expect(elementAccess(reserved, { ...lesson, isFree: true }, [])).toEqual(
      free
    )
    // Le niveau de la méthode pas encore choisi : la leçon non plus.
    const unchosen = { accessChosen: false, accessLevelId: null }
    expect(elementAccess(unchosen, lesson, [])).toEqual(unchosen)
  })

  it("un exercice : celui de sa leçon (isFree : « Leçon gratuite » de sa leçon)", () => {
    const exercise = { kind: "exercise", isFree: false } as const
    expect(elementAccess(reserved, exercise, [])).toEqual(reserved)
    expect(elementAccess(reserved, { ...exercise, isFree: true }, [])).toEqual(
      free
    )
  })

  it("un chapitre : gratuit dès qu'une de ses leçons montrées dans l'app est gratuite", () => {
    const chapter = { kind: "chapter", isFree: false } as const
    const one = (changes: Partial<OutlineElement>) =>
      element("l", "lesson", changes)
    expect(
      elementAccess(reserved, chapter, [
        one({ inApp: true }),
        one({ inApp: false, isFree: true }),
      ])
    ).toEqual(reserved)
    expect(
      elementAccess(reserved, chapter, [
        one({ inApp: true }),
        one({ inApp: true, isFree: true }),
      ])
    ).toEqual(free)
  })
})

describe("le plan tel que l'app le montrera", () => {
  it("les chapitres montrés, dans chacun ses leçons montrées, et dans chacune ses exercices montrés ([D29])", () => {
    const l1 = lesson("l1", [], { inApp: true })
    const tree: MethodTree = [
      {
        ...element("c1", "chapter", { inApp: true }),
        kind: "chapter",
        lessons: [
          {
            ...l1,
            exercises: [
              element("e1", "exercise", { inApp: true }),
              element("e2", "exercise"),
            ],
          },
          lesson("l2"),
        ],
      },
      {
        ...element("c2", "chapter"),
        kind: "chapter",
        lessons: [lesson("l3", [], { inApp: true })],
      },
    ]
    expect(
      appPlan(tree).map((entry) => [
        entry.id,
        entry.lessons.map((item) => [
          item.id,
          item.exercises.map((exercise) => exercise.id),
        ]),
      ])
    ).toEqual([["c1", [["l1", ["e1"]]]]])
  })
})

describe("la liste « Ce qui va changer dans l'app » (QCM du 04/10/2026)", () => {
  const line = (
    elementId: string,
    kind: PreviewRow["kind"],
    change: PreviewRow["change"],
    problem: string | null = null
  ): PreviewRow => ({
    elementId,
    kind,
    title: elementId,
    chapterId: null,
    chapterTitle: null,
    lessonId: null,
    lessonTitle: null,
    change,
    problem,
    problemDetail: null,
    savedAt: null,
    savedByName: null,
  })
  const ids = (rows: PreviewRow[]) => rows.map((row) => row.elementId)

  it("la méthode entre dans l'app : un résumé, et seulement les lignes qui ont un problème", () => {
    const view = changesView([
      line("M", "method", "new"),
      line("A", "chapter", "new"),
      line("a1", "lesson", "new"),
      line("a2", "lesson", "new", "image_sans_fichier"),
      line("x1", "exercise", "new"),
      line("B", "chapter", "new"),
    ])
    expect(view.kind).toBe("entry")
    if (view.kind !== "entry") return
    expect(view.chapters).toBe(2)
    expect(view.lessons).toBe(2)
    expect(view.exercises).toBe(1)
    expect(ids(view.problems)).toEqual(["a2"])
  })

  it("déjà dans l'app : la fiche à part, puis les groupes dans l'ordre ajouts, modifications, retraits, nouvelles places", () => {
    const view = changesView([
      line("M", "method", "reordered"),
      line("a1", "lesson", "reordered"),
      line("a2", "lesson", "modified"),
      line("A", "chapter", "removed"),
      line("a3", "lesson", "new"),
      line("a4", "lesson", "modified"),
    ])
    expect(view.kind).toBe("groups")
    if (view.kind !== "groups") return
    expect(ids(view.method)).toEqual(["M"])
    expect(view.groups.map((group) => group.change)).toEqual([
      "new",
      "modified",
      "removed",
      "reordered",
    ])
    // Dans un groupe, l'ordre du plan.
    expect(ids(view.groups[1].rows)).toEqual(["a2", "a4"])
  })

  it("dans un groupe, les lignes qui ont un problème d'abord : « Voir tout » ne les cache pas", () => {
    const rows = Array.from({ length: CHANGES_SHOWN + 2 }, (_, index) =>
      line(`a${index}`, "lesson", "modified")
    )
    rows.push(line("z", "lesson", "modified", "image_sans_fichier"))
    const view = changesView(rows)
    if (view.kind !== "groups") throw new Error("groupes attendus")
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0].rows[0].elementId).toBe("z")
    expect(view.groups[0].rows).toHaveLength(CHANGES_SHOWN + 3)
  })

  it("le titre et l'image de la fiche se signalent au-dessus, pas dans la liste", () => {
    expect(
      shownProblem(line("M", "method", "modified", "titre_manquant"))
    ).toBe(null)
    expect(
      shownProblem(
        line("M", "method", "modified", "image_de_presentation_manquante")
      )
    ).toBe(null)
    expect(
      shownProblem(line("a1", "lesson", "modified", "image_sans_fichier"))
    ).toBe("image_sans_fichier")
    // La méthode entre dans l'app sans titre : rien à lister sous le résumé.
    const view = changesView([line("M", "method", "new", "titre_manquant")])
    expect(view.kind === "entry" && view.problems).toEqual([])
  })
})

describe("la Lecture, comme dans l'app (QCM du 04/10/2026)", () => {
  // Montrés : c1 (l1 gratuite avec l'exercice e1, l2 cachée avec e2, l3), c2 caché (l4), c3 (l5).
  const shown = { inApp: true }
  const plan: MethodTree = [
    {
      ...element("c1", "chapter", shown),
      kind: "chapter",
      lessons: [
        {
          ...lesson("l1", [], { inApp: true, isFree: true }),
          exercises: [element("e1", "exercise", shown)],
        },
        { ...lesson("l2"), exercises: [element("e2", "exercise", shown)] },
        lesson("l3", [], shown),
      ],
    },
    {
      ...element("c2", "chapter"),
      kind: "chapter",
      lessons: [lesson("l4", [], shown)],
    },
    {
      ...element("c3", "chapter", shown),
      kind: "chapter",
      lessons: [lesson("l5", [], shown)],
    },
  ]

  it("« Suivant » : la première leçon d'un chapitre, la leçon d'après, l'introduction du chapitre suivant", () => {
    const next = (id: string) => {
      const screen = nextScreen(plan, id)
      return screen && [screen.kind, screen.element.id]
    }
    expect(next("c1")).toEqual(["lesson", "l1"])
    // l2 n'est pas montrée : on passe à l3.
    expect(next("l1")).toEqual(["lesson", "l3"])
    // c2 n'est pas montré : on passe à c3, deuxième chapitre de l'app.
    expect(nextScreen(plan, "l3")).toMatchObject({
      kind: "chapter",
      number: 2,
      element: { id: "c3" },
    })
    expect(next("c3")).toEqual(["lesson", "l5"])
    // Le dernier écran, un exercice et un élément caché n'ont pas de suite.
    expect(next("l5")).toBeNull()
    expect(next("e1")).toBeNull()
    expect(next("l2")).toBeNull()
    expect(next("l4")).toBeNull()
  })

  it("réservé dans une méthode réservée : une leçon pas gratuite, un chapitre sans leçon gratuite montrée ([D43])", () => {
    const screen = (id: string) => {
      const found = nextScreen(plan, id)
      if (!found) throw new Error(id)
      return found
    }
    // Après c1 : l1, gratuite.
    expect(screenReserved(screen("c1"), true)).toBe(false)
    expect(screenReserved(screen("l1"), true)).toBe(true)
    // c3 n'a pas de leçon gratuite ; c1 en a une.
    expect(screenReserved(screen("l3"), true)).toBe(true)
    expect(
      screenReserved({ kind: "chapter", element: plan[0], number: 1 }, true)
    ).toBe(false)
    // Une méthode gratuite : rien n'est réservé.
    expect(screenReserved(screen("l1"), false)).toBe(false)
  })

  it("pas dans l'app : sa case, celle de son chapitre ou celle de sa leçon", () => {
    const place = (id: string) => {
      const found = findInTree(plan, id)
      if (!found) throw new Error(id)
      return found
    }
    expect(notInAppReason(place("l1"), true)).toBeNull()
    expect(notInAppReason(place("l1"), false)).toBe("self")
    expect(notInAppReason(place("l4"), true)).toBe("chapter")
    expect(notInAppReason(place("c2"), false)).toBe("self")
    // Un exercice coché d'une leçon cachée.
    expect(notInAppReason(place("e2"), true)).toBe("lesson")
  })
})

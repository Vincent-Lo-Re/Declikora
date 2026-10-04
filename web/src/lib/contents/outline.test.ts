import { describe, expect, it } from "vitest"

import {
  appPlan,
  canDropOutline,
  changesView,
  CHANGES_SHOWN,
  elementAccess,
  elementState,
  findInTree,
  lessonCount,
  lessonZoneId,
  liveIds,
  moveChapter,
  moveLesson,
  moveOnDropOutline,
  moveOverOutline,
  parseLiveOutline,
  previewByElement,
  previewProblems,
  sameOrder,
  shiftInTree,
  shownProblem,
  targetChapter,
  toOutlinePayload,
  type MethodTree,
  type OutlineChapter,
  type OutlineElement,
  type PreviewRow,
} from "@/lib/contents/outline"

function element(
  id: string,
  kind: "chapter" | "lesson",
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

function chapter(id: string, lessons: string[]): OutlineChapter {
  return {
    ...element(id, "chapter"),
    kind: "chapter",
    lessons: lessons.map((lesson) => element(lesson, "lesson")),
  }
}

// Chapitre A (leçons a1, a2), chapitre B (b1), chapitre C (vide).
const tree: MethodTree = [
  chapter("A", ["a1", "a2"]),
  chapter("B", ["b1"]),
  chapter("C", []),
]

/** L'ordre d'un arbre, lisible : « A(a1,a2) B(b1) C() ». */
function order(value: MethodTree): string {
  return value
    .map(
      (entry) =>
        `${entry.id}(${entry.lessons.map((lesson) => lesson.id).join(",")})`
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
    expect(order(moveChapter(tree, "C", 0))).toBe("C() A(a1,a2) B(b1)")
    expect(order(moveChapter(tree, "A", 99))).toBe("B(b1) C() A(a1,a2)")
    expect(order(moveLesson(tree, "a1", "A", 1))).toBe("A(a2,a1) B(b1) C()")
    expect(order(moveLesson(tree, "a2", "C", 0))).toBe("A(a1) B(b1) C(a2)")
    expect(order(moveLesson(tree, "b1", "A", 0))).toBe("A(b1,a1,a2) B() C()")
    // Un chapitre n'entre pas dans un chapitre ; une destination inconnue ne change rien.
    expect(moveLesson(tree, "A", "B", 0)).toBe(tree)
    expect(moveLesson(tree, "a1", "Z", 0)).toBe(tree)
    // L'arbre d'origine n'est jamais modifié.
    expect(order(tree)).toBe("A(a1,a2) B(b1) C()")
  })

  it("« Monter » et « Descendre » : une leçon passe au chapitre voisin à la limite", () => {
    expect(order(shiftInTree(tree, "a2", -1)!)).toBe("A(a2,a1) B(b1) C()")
    // En fin de chapitre, elle descend en tête du suivant ; en tête, elle monte à la fin du
    // précédent.
    expect(order(shiftInTree(tree, "a2", 1)!)).toBe("A(a1) B(a2,b1) C()")
    expect(order(shiftInTree(tree, "b1", -1)!)).toBe("A(a1,a2,b1) B() C()")
    expect(order(shiftInTree(tree, "b1", 1)!)).toBe("A(a1,a2) B() C(b1)")
    // Aux deux bouts du plan, rien ne bouge.
    expect(shiftInTree(tree, "a1", -1)).toBeNull()
    expect(shiftInTree([chapter("A", ["a1"])], "a1", 1)).toBeNull()
    // Un chapitre reste parmi les chapitres.
    expect(order(shiftInTree(tree, "B", -1)!)).toBe("B(b1) A(a1,a2) C()")
    expect(shiftInTree(tree, "A", -1)).toBeNull()
    expect(shiftInTree(tree, "C", 1)).toBeNull()
  })

  it("compare deux ordres et prépare ce que reçoit outline_reorder", () => {
    expect(sameOrder(tree, [...tree])).toBe(true)
    expect(sameOrder(tree, moveLesson(tree, "a1", "A", 1))).toBe(false)
    expect(sameOrder(tree, moveLesson(tree, "b1", "C", 0))).toBe(false)
    expect(toOutlinePayload(tree)).toEqual([
      { chapterId: "A", lessonIds: ["a1", "a2"] },
      { chapterId: "B", lessonIds: ["b1"] },
      { chapterId: "C", lessonIds: [] },
    ])
  })
})

describe("règles de dépôt", () => {
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
      "A(a2) B(a1,b1) C()"
    )
    expect(order(moveOverOutline(tree, "a1", "b1", true)!)).toBe(
      "A(a2) B(b1,a1) C()"
    )
    // Un chapitre vide : à la fin.
    expect(order(moveOverOutline(tree, "a1", lessonZoneId("C"), false)!)).toBe(
      "A(a2) B(b1) C(a1)"
    )
    // Dans le même chapitre, ou pour un chapitre : rien au survol.
    expect(moveOverOutline(tree, "a1", "a2", true)).toBeNull()
    expect(moveOverOutline(tree, "A", "B", true)).toBeNull()

    expect(order(moveOnDropOutline(tree, "a1", "a2")!)).toBe(
      "A(a2,a1) B(b1) C()"
    )
    expect(order(moveOnDropOutline(tree, "C", "A")!)).toBe("C() A(a1,a2) B(b1)")
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
        { lessonId: "a1", versionId: "va1" },
        { lessonId: 42, versionId: "?" },
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
          lessons: [{ lessonId: "a1", versionId: "va1" }],
        },
      ],
    })
    expect(parseLiveOutline(null)).toBeNull()
    expect([...liveIds(outline)]).toEqual(["A", "a1"])
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
    change,
    problem,
    problemDetail: null,
    savedAt: null,
    savedByName: null,
  })

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
    const lesson = (id: string, changes: Partial<OutlineElement> = {}) =>
      element(id, "lesson", changes)
    expect(
      elementState(lesson("a1", { inApp: true }), true, live, preview)
    ).toBe("modified")
    expect(
      elementState(lesson("a2", { inApp: true }), true, live, preview)
    ).toBe("new")
    expect(elementState(element("A", "chapter"), true, live, preview)).toBe(
      "removing"
    )
  })

  it("sans changement : en ligne, caché, retiré, ou caché avec son chapitre", () => {
    const live = liveIds(outline)
    const empty = previewByElement([])
    expect(
      elementState(element("a1", "lesson", { inApp: true }), true, live, empty)
    ).toBe("live")
    expect(elementState(element("x", "lesson"), true, live, empty)).toBe(
      "hidden"
    )
    expect(
      elementState(
        element("x", "lesson", { published: true }),
        true,
        live,
        empty
      )
    ).toBe("withdrawn")
    // Une leçon cochée dans un chapitre décoché ne part pas.
    expect(
      elementState(element("x", "lesson", { inApp: true }), false, live, empty)
    ).toBe("blocked")
  })

  it("tant que la liste des changements n'est pas lue, l'état se déduit des cases", () => {
    const live = liveIds(outline)
    expect(
      elementState(
        element("a1", "lesson", { inApp: true }),
        true,
        live,
        undefined
      )
    ).toBe("live")
    expect(elementState(element("a1", "lesson"), true, live, undefined)).toBe(
      "removing"
    )
    expect(
      elementState(
        element("y", "lesson", { inApp: true }),
        true,
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

  it("un chapitre : gratuit dès qu'une de ses leçons montrées dans l'app est gratuite", () => {
    const chapter = { kind: "chapter", isFree: false } as const
    const lesson = (changes: Partial<OutlineElement>) =>
      element("l", "lesson", changes)
    expect(
      elementAccess(reserved, chapter, [
        lesson({ inApp: true }),
        lesson({ inApp: false, isFree: true }),
      ])
    ).toEqual(reserved)
    expect(
      elementAccess(reserved, chapter, [
        lesson({ inApp: true }),
        lesson({ inApp: true, isFree: true }),
      ])
    ).toEqual(free)
  })
})

describe("le plan tel que l'app le montrera", () => {
  it("les chapitres montrés, et dans chacun ses leçons montrées ([D29])", () => {
    const tree: MethodTree = [
      {
        ...element("c1", "chapter", { inApp: true }),
        kind: "chapter",
        lessons: [
          element("l1", "lesson", { inApp: true }),
          element("l2", "lesson"),
        ],
      },
      {
        ...element("c2", "chapter"),
        kind: "chapter",
        lessons: [element("l3", "lesson", { inApp: true })],
      },
    ]
    expect(
      appPlan(tree).map((chapter) => [
        chapter.id,
        chapter.lessons.map((lesson) => lesson.id),
      ])
    ).toEqual([["c1", ["l1"]]])
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
      line("B", "chapter", "new"),
    ])
    expect(view.kind).toBe("entry")
    if (view.kind !== "entry") return
    expect(view.chapters).toBe(2)
    expect(view.lessons).toBe(2)
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

// Le plan d'une méthode, sans React : l'arbre des chapitres, des leçons et de leurs exercices
// (brouillon), ses déplacements (glisser-déposer et « Monter » / « Descendre »), le plan en ligne
// (figé dans la version de la méthode) et l'état de chaque élément dans l'app. Contrat :
// docs/ARCHITECTURE-CONTENUS.md, § 1.8, « Étape 7, partie 7b » et « Exercices ».

import type { UniqueIdentifier } from "@dnd-kit/core"

// ---------------------------------------------------------------------------------------------
// L'arbre (brouillon)
// ---------------------------------------------------------------------------------------------

/** Un chapitre, une leçon ou un exercice, tel que le plan de la méthode le montre. */
export type OutlineElement = {
  id: string
  kind: "chapter" | "lesson" | "exercise"
  title: string
  // « Montrer dans l'app » (décoché à la création, [D29]).
  inApp: boolean
  // « Leçon gratuite » (leçons seulement).
  isFree: boolean
  draftSavedAt: string
  savedByName: string | null
  // Le membre qui l'écrit en ce moment (verrou actif), s'il y en a un.
  editingId: string | null
  editingName: string | null
  // A déjà été publié au moins une fois (il a des versions).
  published: boolean
}

export type OutlineLesson = OutlineElement & {
  kind: "lesson"
  exercises: OutlineElement[]
}

export type OutlineChapter = OutlineElement & {
  kind: "chapter"
  lessons: OutlineLesson[]
}

/** Les chapitres d'une méthode, dans l'ordre, chacun avec ses leçons et leurs exercices. */
export type MethodTree = OutlineChapter[]

/** La place d'un élément dans l'arbre. */
export type TreePlace =
  | { kind: "chapter"; element: OutlineChapter; chapterIndex: number }
  | {
      kind: "lesson"
      element: OutlineLesson
      chapter: OutlineChapter
      chapterIndex: number
      lessonIndex: number
    }
  | {
      kind: "exercise"
      element: OutlineElement
      lesson: OutlineLesson
      chapter: OutlineChapter
      chapterIndex: number
      lessonIndex: number
      exerciseIndex: number
    }

export function findInTree(tree: MethodTree, id: string): TreePlace | null {
  for (const [chapterIndex, chapter] of tree.entries()) {
    if (chapter.id === id)
      return { kind: "chapter", element: chapter, chapterIndex }
    for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
      if (lesson.id === id) {
        return {
          kind: "lesson",
          element: lesson,
          chapter,
          chapterIndex,
          lessonIndex,
        }
      }
      const exerciseIndex = lesson.exercises.findIndex(
        (exercise) => exercise.id === id
      )
      if (exerciseIndex >= 0) {
        return {
          kind: "exercise",
          element: lesson.exercises[exerciseIndex],
          lesson,
          chapter,
          chapterIndex,
          lessonIndex,
          exerciseIndex,
        }
      }
    }
  }
  return null
}

/** Toutes les leçons de l'arbre, dans l'ordre du plan (d'un chapitre au suivant). */
function allLessons(tree: MethodTree): OutlineLesson[] {
  return tree.flatMap((chapter) => chapter.lessons)
}

/** L'arbre où chaque leçon passe par `change`. */
function mapLessons(
  tree: MethodTree,
  change: (lesson: OutlineLesson) => OutlineLesson
): MethodTree {
  return tree.map((chapter) => ({
    ...chapter,
    lessons: chapter.lessons.map(change),
  }))
}

/** Une liste où `item` est inséré à cette place (bornée à la liste). */
function insertAt<T>(list: readonly T[], index: number, item: T): T[] {
  const at = Math.max(0, Math.min(index, list.length))
  return [...list.slice(0, at), item, ...list.slice(at)]
}

/** Déplace un chapitre à cette place (index dans la liste sans lui). */
export function moveChapter(
  tree: MethodTree,
  id: string,
  toIndex: number
): MethodTree {
  const from = tree.findIndex((chapter) => chapter.id === id)
  if (from < 0) return tree
  const rest = tree.filter((chapter) => chapter.id !== id)
  const index = Math.max(0, Math.min(toIndex, rest.length))
  return [...rest.slice(0, index), tree[from], ...rest.slice(index)]
}

/** Déplace une leçon dans ce chapitre, à cette place (index dans la liste sans elle). */
export function moveLesson(
  tree: MethodTree,
  id: string,
  toChapterId: string,
  toIndex: number
): MethodTree {
  const place = findInTree(tree, id)
  if (!place || place.kind !== "lesson") return tree
  if (!tree.some((chapter) => chapter.id === toChapterId)) return tree
  const without = tree.map((chapter) =>
    chapter.id === place.chapter.id
      ? { ...chapter, lessons: chapter.lessons.filter((l) => l.id !== id) }
      : chapter
  )
  return without.map((chapter) =>
    chapter.id === toChapterId
      ? {
          ...chapter,
          lessons: insertAt(chapter.lessons, toIndex, place.element),
        }
      : chapter
  )
}

/** Déplace un exercice dans cette leçon, à cette place (index dans la liste sans lui). */
export function moveExercise(
  tree: MethodTree,
  id: string,
  toLessonId: string,
  toIndex: number
): MethodTree {
  const place = findInTree(tree, id)
  if (!place || place.kind !== "exercise") return tree
  if (!allLessons(tree).some((lesson) => lesson.id === toLessonId)) return tree
  const without = mapLessons(tree, (lesson) =>
    lesson.id === place.lesson.id
      ? { ...lesson, exercises: lesson.exercises.filter((e) => e.id !== id) }
      : lesson
  )
  return mapLessons(without, (lesson) =>
    lesson.id === toLessonId
      ? {
          ...lesson,
          exercises: insertAt(lesson.exercises, toIndex, place.element),
        }
      : lesson
  )
}

/**
 * « Monter » (-1) ou « Descendre » (+1). Un chapitre reste parmi les chapitres ; une leçon en
 * tête de son chapitre monte à la fin du chapitre précédent, une leçon en fin de chapitre
 * descend en tête du suivant ; un exercice fait de même d'une leçon à l'autre (en passant d'un
 * chapitre au suivant). Null si l'élément ne peut pas aller plus loin.
 */
export function shiftInTree(
  tree: MethodTree,
  id: string,
  offset: -1 | 1
): MethodTree | null {
  const place = findInTree(tree, id)
  if (!place) return null
  if (place.kind === "chapter") {
    const to = place.chapterIndex + offset
    if (to < 0 || to >= tree.length) return null
    return moveChapter(tree, id, to)
  }
  if (place.kind === "exercise") {
    const to = place.exerciseIndex + offset
    if (to >= 0 && to < place.lesson.exercises.length) {
      return moveExercise(tree, id, place.lesson.id, to)
    }
    const lessons = allLessons(tree)
    const neighbor =
      lessons[lessons.findIndex((l) => l.id === place.lesson.id) + offset]
    if (!neighbor) return null
    return moveExercise(
      tree,
      id,
      neighbor.id,
      offset < 0 ? neighbor.exercises.length : 0
    )
  }
  const { chapter, chapterIndex, lessonIndex } = place
  const to = lessonIndex + offset
  if (to >= 0 && to < chapter.lessons.length) {
    return moveLesson(tree, id, chapter.id, to)
  }
  const neighbor = tree[chapterIndex + offset]
  if (!neighbor) return null
  return moveLesson(
    tree,
    id,
    neighbor.id,
    offset < 0 ? neighbor.lessons.length : 0
  )
}

/** Les identifiants de l'arbre dans l'ordre du plan, chacun avec son parent. */
function orderKey(tree: MethodTree): string {
  return tree
    .map(
      (chapter) =>
        `${chapter.id}(${chapter.lessons
          .map(
            (lesson) =>
              `${lesson.id}[${lesson.exercises.map((e) => e.id).join(",")}]`
          )
          .join(",")})`
    )
    .join(";")
}

/**
 * Vrai si les deux arbres ont les mêmes chapitres, les mêmes leçons et les mêmes exercices, dans
 * le même ordre.
 */
export function sameOrder(a: MethodTree, b: MethodTree): boolean {
  return orderKey(a) === orderKey(b)
}

/**
 * Ce que outline_reorder reçoit : tous les chapitres, toutes leurs leçons et tous leurs
 * exercices, dans l'ordre.
 */
export function toOutlinePayload(tree: MethodTree): {
  chapterId: string
  lessons: { lessonId: string; exerciseIds: string[] }[]
}[] {
  return tree.map((chapter) => ({
    chapterId: chapter.id,
    lessons: chapter.lessons.map((lesson) => ({
      lessonId: lesson.id,
      exerciseIds: lesson.exercises.map((exercise) => exercise.id),
    })),
  }))
}

/** Le nombre de leçons de l'arbre. */
export function lessonCount(tree: MethodTree): number {
  return tree.reduce((count, chapter) => count + chapter.lessons.length, 0)
}

/** Le nombre d'exercices de l'arbre. */
export function exerciseCount(tree: MethodTree): number {
  return allLessons(tree).reduce(
    (count, lesson) => count + lesson.exercises.length,
    0
  )
}

/**
 * Ce que l'app montrera du plan à la prochaine publication de la méthode : les chapitres où
 * « Montrer dans l'app » est coché, dans chacun ses leçons cochées, et dans chaque leçon ses
 * exercices cochés ([D29]).
 */
export function appPlan(tree: MethodTree): MethodTree {
  return tree
    .filter((chapter) => chapter.inApp)
    .map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons
        .filter((lesson) => lesson.inApp)
        .map((lesson) => ({
          ...lesson,
          exercises: lesson.exercises.filter((exercise) => exercise.inApp),
        })),
    }))
}

// ---------------------------------------------------------------------------------------------
// Glisser-déposer : un SortableContext pour les chapitres, un par chapitre pour ses leçons, un
// par leçon pour ses exercices, et une zone de dépôt pour un chapitre sans leçon et pour une
// leçon sans exercice.
// ---------------------------------------------------------------------------------------------

const ZONE_PREFIX = "lecons:"
const EXERCISE_ZONE_PREFIX = "exercices:"

/** La zone de dépôt des leçons d'un chapitre (pour y déposer une leçon quand il est vide). */
export function lessonZoneId(chapterId: string): string {
  return `${ZONE_PREFIX}${chapterId}`
}

/** La zone de dépôt des exercices d'une leçon (pour y déposer un exercice quand elle est vide). */
export function exerciseZoneId(lessonId: string): string {
  return `${EXERCISE_ZONE_PREFIX}${lessonId}`
}

function chapterOfZone(id: UniqueIdentifier): string | null {
  const value = String(id)
  return value.startsWith(ZONE_PREFIX) ? value.slice(ZONE_PREFIX.length) : null
}

function lessonOfZone(id: UniqueIdentifier): string | null {
  const value = String(id)
  return value.startsWith(EXERCISE_ZONE_PREFIX)
    ? value.slice(EXERCISE_ZONE_PREFIX.length)
    : null
}

/** Ce que porte chaque cible de dépôt (data de useSortable et useDroppable). */
export type OutlineDropData =
  | { type: "chapter" }
  | { type: "lesson"; chapterId: string }
  | { type: "zone"; chapterId: string }
  | { type: "exercise"; lessonId: string }
  | { type: "exerciseZone"; lessonId: string }

/** Le chapitre visé par une cible, pour une leçon : celui de la leçon, ou celui de la zone. */
export function targetChapter(
  tree: MethodTree,
  overId: UniqueIdentifier
): string | null {
  const zone = chapterOfZone(overId)
  if (zone) return tree.some((chapter) => chapter.id === zone) ? zone : null
  const place = findInTree(tree, String(overId))
  return place?.kind === "lesson" ? place.chapter.id : null
}

/** La leçon visée par une cible, pour un exercice : celle de l'exercice, ou celle de la zone. */
export function targetLesson(
  tree: MethodTree,
  overId: UniqueIdentifier
): string | null {
  const zone = lessonOfZone(overId)
  if (zone) {
    return allLessons(tree).some((lesson) => lesson.id === zone) ? zone : null
  }
  const place = findInTree(tree, String(overId))
  return place?.kind === "exercise" ? place.lesson.id : null
}

/**
 * Vrai si l'élément déplacé peut aller sur cette cible : un chapitre parmi les chapitres, une
 * leçon parmi les leçons (ou dans un chapitre vide), un exercice parmi les exercices (ou dans
 * une leçon vide). Un élément ne change jamais de niveau.
 */
export function canDropOutline(
  tree: MethodTree,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): boolean {
  const active = findInTree(tree, String(activeId))
  if (!active) return false
  if (active.kind === "chapter") {
    return findInTree(tree, String(overId))?.kind === "chapter"
  }
  if (active.kind === "exercise") return targetLesson(tree, overId) !== null
  return targetChapter(tree, overId) !== null
}

/**
 * Pendant le survol : une leçon passe dans un autre chapitre, un exercice dans une autre leçon,
 * juste avant ou après l'élément visé (ou à la fin d'un parent vide). Null si rien ne change ou
 * si c'est refusé.
 */
export function moveOverOutline(
  tree: MethodTree,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  below: boolean
): MethodTree | null {
  const active = findInTree(tree, String(activeId))
  if (active?.kind === "exercise") {
    const lessonId = targetLesson(tree, overId)
    if (!lessonId || lessonId === active.lesson.id) return null
    const over = findInTree(tree, String(overId))
    const target = allLessons(tree).find((lesson) => lesson.id === lessonId)
    if (!target) return null
    const index =
      over?.kind === "exercise"
        ? over.exerciseIndex + (below ? 1 : 0)
        : target.exercises.length
    return moveExercise(tree, active.element.id, lessonId, index)
  }
  if (!active || active.kind !== "lesson") return null
  const chapterId = targetChapter(tree, overId)
  if (!chapterId || chapterId === active.chapter.id) return null
  const over = findInTree(tree, String(overId))
  const target = tree.find((chapter) => chapter.id === chapterId)
  if (!target) return null
  const index =
    over?.kind === "lesson"
      ? over.lessonIndex + (below ? 1 : 0)
      : target.lessons.length
  return moveLesson(tree, active.element.id, chapterId, index)
}

/** Au dépôt : l'élément prend la place de la cible, dans la même liste. */
export function moveOnDropOutline(
  tree: MethodTree,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
): MethodTree | null {
  if (activeId === overId) return null
  const active = findInTree(tree, String(activeId))
  const over = findInTree(tree, String(overId))
  if (!active || !over || active.kind !== over.kind) return null
  if (active.kind === "chapter" && over.kind === "chapter") {
    return moveChapter(tree, active.element.id, over.chapterIndex)
  }
  if (active.kind === "lesson" && over.kind === "lesson") {
    if (active.chapter.id !== over.chapter.id) return null
    return moveLesson(
      tree,
      active.element.id,
      over.chapter.id,
      over.lessonIndex
    )
  }
  if (active.kind === "exercise" && over.kind === "exercise") {
    if (active.lesson.id !== over.lesson.id) return null
    return moveExercise(
      tree,
      active.element.id,
      over.lesson.id,
      over.exerciseIndex
    )
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// Le plan en ligne (versions.outline de la version en ligne de la méthode)
// ---------------------------------------------------------------------------------------------

export type LiveOutline = {
  chapters: {
    chapterId: string
    versionId: string
    lessons: {
      lessonId: string
      versionId: string
      // Absents d'un plan publié avant les exercices.
      exercises: { exerciseId: string; versionId: string }[]
    }[]
  }[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Lit le plan figé d'une version ; null s'il n'y en a pas (méthode pas en ligne). */
export function parseLiveOutline(value: unknown): LiveOutline | null {
  if (!Array.isArray(value)) return null
  const chapters: LiveOutline["chapters"] = []
  for (const entry of value) {
    if (!isRecord(entry)) continue
    const { chapterId, versionId, lessons } = entry
    if (typeof chapterId !== "string" || typeof versionId !== "string") continue
    chapters.push({
      chapterId,
      versionId,
      lessons: (Array.isArray(lessons) ? lessons : []).flatMap((lesson) =>
        isRecord(lesson) &&
        typeof lesson.lessonId === "string" &&
        typeof lesson.versionId === "string"
          ? [
              {
                lessonId: lesson.lessonId,
                versionId: lesson.versionId,
                exercises: (Array.isArray(lesson.exercises)
                  ? lesson.exercises
                  : []
                ).flatMap((exercise) =>
                  isRecord(exercise) &&
                  typeof exercise.exerciseId === "string" &&
                  typeof exercise.versionId === "string"
                    ? [
                        {
                          exerciseId: exercise.exerciseId,
                          versionId: exercise.versionId,
                        },
                      ]
                    : []
                ),
              },
            ]
          : []
      ),
    })
  }
  return { chapters }
}

/** Les éléments (chapitres, leçons et exercices) cités par le plan en ligne. */
export function liveIds(outline: LiveOutline | null): Set<string> {
  const ids = new Set<string>()
  for (const chapter of outline?.chapters ?? []) {
    ids.add(chapter.chapterId)
    for (const lesson of chapter.lessons) {
      ids.add(lesson.lessonId)
      for (const exercise of lesson.exercises) ids.add(exercise.exerciseId)
    }
  }
  return ids
}

// ---------------------------------------------------------------------------------------------
// Ce qui changera dans l'app à la publication (publish_preview)
// ---------------------------------------------------------------------------------------------

export type PreviewChange = "new" | "modified" | "reordered" | "removed"

/** Une ligne de publish_preview : un élément qui changera dans l'app si l'on publie. */
export type PreviewRow = {
  elementId: string
  kind: "method" | "chapter" | "lesson" | "exercise"
  title: string
  // Le chapitre d'une leçon ou d'un exercice (celui du plan à venir, ou du plan en ligne pour un
  // élément retiré).
  chapterId: string | null
  chapterTitle: string | null
  // La leçon d'un exercice (de même).
  lessonId: string | null
  lessonTitle: string | null
  change: PreviewChange
  // Le code qui ferait refuser la publication (image sans fichier…), et sa précision.
  problem: string | null
  problemDetail: string | null
  savedAt: string | null
  savedByName: string | null
}

/** Les lignes d'un élément de l'arbre (chapitre, leçon ou exercice), par identifiant. */
export function previewByElement(
  rows: readonly PreviewRow[]
): Map<string, PreviewRow> {
  const map = new Map<string, PreviewRow>()
  for (const row of rows) {
    if (row.kind !== "method") map.set(row.elementId, row)
  }
  return map
}

/** Les lignes qui empêchent de publier (un problème signalé). */
export function previewProblems(rows: readonly PreviewRow[]): PreviewRow[] {
  return rows.filter((row) => row.problem !== null)
}

// ---------------------------------------------------------------------------------------------
// La liste « Ce qui va changer dans l'app », telle qu'on la montre (QCM du 04/10/2026)
// ---------------------------------------------------------------------------------------------

/** Les lignes montrées par sorte de changement, avant « Voir tout ». */
export const CHANGES_SHOWN = 5

/** L'ordre des groupes : ce qui arrive, ce qui change, ce qui part, ce qui se déplace. */
const GROUP_ORDER: readonly PreviewChange[] = [
  "new",
  "modified",
  "removed",
  "reordered",
]

/**
 * Le problème d'une ligne, s'il se montre dans la liste : le titre et l'image de présentation de
 * la fiche sont déjà signalés au-dessus (« Prêt à publier ? »).
 */
export function shownProblem(row: PreviewRow): string | null {
  if (
    row.kind === "method" &&
    (row.problem === "image_de_presentation_manquante" ||
      row.problem === "titre_manquant")
  ) {
    return null
  }
  return row.problem
}

export type ChangeGroup = { change: PreviewChange; rows: PreviewRow[] }

export type ChangesView =
  // La méthode entre dans l'app : un résumé, et seulement les lignes qui ont un problème.
  | {
      kind: "entry"
      chapters: number
      lessons: number
      exercises: number
      problems: PreviewRow[]
    }
  // Déjà dans l'app : les lignes de la fiche, puis les chapitres, les leçons et les exercices par
  // sorte de changement.
  | { kind: "groups"; method: PreviewRow[]; groups: ChangeGroup[] }

/**
 * Ce que montre la liste des changements ([D29]). Tant que la méthode n'est pas dans l'app, tout y
 * entre : une ligne par élément répéterait le plan, un résumé suffit (ses chapitres, ses leçons et
 * ses exercices). Ensuite, les éléments se rangent par sorte de changement, chacun dans l'ordre du
 * plan, ceux qui ont un problème d'abord (ils ne se cachent pas derrière « Voir tout »).
 */
export function changesView(rows: readonly PreviewRow[]): ChangesView {
  const elements = rows.filter((row) => row.kind !== "method")
  const entering = rows.some(
    (row) => row.kind === "method" && row.change === "new"
  )
  if (entering) {
    return {
      kind: "entry",
      chapters: elements.filter((row) => row.kind === "chapter").length,
      lessons: elements.filter((row) => row.kind === "lesson").length,
      exercises: elements.filter((row) => row.kind === "exercise").length,
      problems: rows.filter((row) => shownProblem(row) !== null),
    }
  }
  const groups = GROUP_ORDER.map((change) => {
    const inGroup = elements.filter((row) => row.change === change)
    return {
      change,
      rows: [
        ...inGroup.filter((row) => shownProblem(row) !== null),
        ...inGroup.filter((row) => shownProblem(row) === null),
      ],
    }
  }).filter((group) => group.rows.length > 0)
  return {
    kind: "groups",
    method: rows.filter((row) => row.kind === "method"),
    groups,
  }
}

// ---------------------------------------------------------------------------------------------
// L'état de chaque élément
// ---------------------------------------------------------------------------------------------

/**
 * L'état d'un chapitre, d'une leçon ou d'un exercice, vu de l'app :
 * - live : en ligne, sans changement à publier ;
 * - modified : en ligne, modifié depuis la publication (partira à la prochaine) ;
 * - new : « Montrer dans l'app » coché, pas encore en ligne (partira à la prochaine) ;
 * - removing : en ligne, mais décoché (ou dans un parent décoché) : sortira à la prochaine ;
 * - withdrawn : déjà publié autrefois, retiré de l'app, décoché ;
 * - hidden : jamais publié, décoché ;
 * - blocked : coché, dans un chapitre décoché : il ne part pas ;
 * - blockedLesson : exercice coché, dans une leçon décochée : il ne part pas.
 */
export type ElementState =
  | "live"
  | "modified"
  | "new"
  | "removing"
  | "withdrawn"
  | "hidden"
  | "blocked"
  | "blockedLesson"

/** « Montrer dans l'app » des parents d'un élément (vrai quand il n'a pas ce parent). */
export type ParentsInApp = { chapter: boolean; lesson: boolean }

/** Les parents d'un élément, d'après sa place dans l'arbre. */
export function parentsInApp(place: TreePlace): ParentsInApp {
  if (place.kind === "chapter") return { chapter: true, lesson: true }
  if (place.kind === "lesson")
    return { chapter: place.chapter.inApp, lesson: true }
  return { chapter: place.chapter.inApp, lesson: place.lesson.inApp }
}

/**
 * L'état d'un élément : d'après publish_preview (preview, undefined tant qu'il n'est pas lu) et
 * le plan en ligne. parents : « Montrer dans l'app » de son chapitre et de sa leçon.
 */
export function elementState(
  element: Pick<OutlineElement, "id" | "kind" | "inApp" | "published">,
  parents: ParentsInApp,
  live: ReadonlySet<string>,
  preview: ReadonlyMap<string, PreviewRow> | undefined
): ElementState {
  const row = preview?.get(element.id)
  if (row?.change === "removed") return "removing"
  if (row?.change === "new") return "new"
  if (row?.change === "modified") return "modified"
  const blockedBy =
    element.kind === "chapter"
      ? null
      : !parents.chapter
        ? "blocked"
        : element.kind === "exercise" && !parents.lesson
          ? "blockedLesson"
          : null
  const goes = element.inApp && blockedBy === null
  if (live.has(element.id)) {
    // Sans la liste des changements : un élément en ligne décoché sortira.
    return preview === undefined && !goes ? "removing" : "live"
  }
  if (element.inApp && blockedBy) return blockedBy
  if (element.inApp) return "new"
  return element.published ? "withdrawn" : "hidden"
}

// ---------------------------------------------------------------------------------------------
// Le niveau d'accès d'un élément
// ---------------------------------------------------------------------------------------------

/** Un niveau d'accès tel que l'éditeur le lit (accessChosen : « Gratuit » ou une formule choisis). */
type Access = { accessChosen: boolean; accessLevelId: string | null }

const FREE: Access = { accessChosen: true, accessLevelId: null }

/**
 * Le niveau d'accès d'un élément à la prochaine publication de sa méthode ([D43]) : celui de la
 * méthode, sauf pour une leçon gratuite et ses exercices, et pour l'introduction d'un chapitre
 * dont une leçon montrée dans l'app est gratuite. isFree : « Leçon gratuite » de la leçon (la
 * sienne, ou celle d'un exercice) ; lessons : celles du chapitre (pour un chapitre), dans le
 * brouillon du plan.
 */
export function elementAccess(
  method: Access,
  element: { kind: "chapter" | "lesson" | "exercise"; isFree: boolean },
  lessons: readonly Pick<OutlineElement, "inApp" | "isFree">[]
): Access {
  if (element.kind !== "chapter") return element.isFree ? FREE : method
  return lessons.some((lesson) => lesson.inApp && lesson.isFree) ? FREE : method
}

// ---------------------------------------------------------------------------------------------
// Lecture, comme dans l'app (QCM du 04/10/2026) : la suite d'un écran, et ce qui n'y est pas.
// ---------------------------------------------------------------------------------------------

/** Un écran de la méthode dans l'ordre du plan : l'introduction d'un chapitre, ou une leçon. */
export type PlanScreen =
  | { kind: "chapter"; element: OutlineChapter; number: number }
  | { kind: "lesson"; element: OutlineLesson }

/**
 * « Suivant », en bas d'un chapitre ou d'une leçon : l'écran d'après dans le plan tel que l'app
 * le montrera (la première leçon d'un chapitre, la leçon d'après, ou l'introduction du chapitre
 * suivant). Les exercices n'y sont pas ; null pour le dernier écran, pour un exercice, et pour
 * un élément qui n'est pas dans l'app.
 */
export function nextScreen(tree: MethodTree, id: string): PlanScreen | null {
  const screens: PlanScreen[] = appPlan(tree).flatMap((chapter, index) => [
    { kind: "chapter" as const, element: chapter, number: index + 1 },
    ...chapter.lessons.map((lesson) => ({
      kind: "lesson" as const,
      element: lesson,
    })),
  ])
  const index = screens.findIndex((screen) => screen.element.id === id)
  return index >= 0 ? (screens[index + 1] ?? null) : null
}

/**
 * Un écran réservé à qui n'a pas la formule, dans une méthode réservée : une leçon qui n'est pas
 * gratuite, ou l'introduction d'un chapitre dont aucune leçon montrée ne l'est ([D43]).
 */
export function screenReserved(screen: PlanScreen, reserved: boolean): boolean {
  if (!reserved) return false
  if (screen.kind === "lesson") return !screen.element.isFree
  return !screen.element.lessons.some((lesson) => lesson.inApp && lesson.isFree)
}

/**
 * Pourquoi un élément ne sera pas dans l'app à la prochaine publication : sa case « Montrer dans
 * l'app » (inApp, telle qu'elle est à l'écran), ou celle de son chapitre ou de sa leçon ; null
 * s'il y sera.
 */
export function notInAppReason(
  place: TreePlace,
  inApp: boolean
): "self" | "chapter" | "lesson" | null {
  if (!inApp) return "self"
  const parents = parentsInApp(place)
  if (!parents.chapter) return "chapter"
  if (!parents.lesson) return "lesson"
  return null
}

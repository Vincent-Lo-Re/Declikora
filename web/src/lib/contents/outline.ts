// Le plan d'une méthode, sans React : l'arbre des chapitres et des leçons (brouillon), ses
// déplacements (glisser-déposer et « Monter » / « Descendre »), le plan en ligne (figé dans la
// version de la méthode) et l'état de chaque élément dans l'app. Contrat :
// docs/ARCHITECTURE-CONTENUS.md, § 1.8 et « Étape 7, partie 7b ».

import type { UniqueIdentifier } from "@dnd-kit/core"

// ---------------------------------------------------------------------------------------------
// L'arbre (brouillon)
// ---------------------------------------------------------------------------------------------

/** Un chapitre ou une leçon, tel que le plan de la méthode le montre. */
export type OutlineElement = {
  id: string
  kind: "chapter" | "lesson"
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

export type OutlineChapter = OutlineElement & {
  kind: "chapter"
  lessons: OutlineElement[]
}

/** Les chapitres d'une méthode, dans l'ordre, chacun avec ses leçons. */
export type MethodTree = OutlineChapter[]

/** La place d'un élément dans l'arbre. */
export type TreePlace =
  | { kind: "chapter"; element: OutlineChapter; chapterIndex: number }
  | {
      kind: "lesson"
      element: OutlineElement
      chapter: OutlineChapter
      chapterIndex: number
      lessonIndex: number
    }

export function findInTree(tree: MethodTree, id: string): TreePlace | null {
  for (const [chapterIndex, chapter] of tree.entries()) {
    if (chapter.id === id)
      return { kind: "chapter", element: chapter, chapterIndex }
    const lessonIndex = chapter.lessons.findIndex((lesson) => lesson.id === id)
    if (lessonIndex >= 0) {
      return {
        kind: "lesson",
        element: chapter.lessons[lessonIndex],
        chapter,
        chapterIndex,
        lessonIndex,
      }
    }
  }
  return null
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
  return without.map((chapter) => {
    if (chapter.id !== toChapterId) return chapter
    const index = Math.max(0, Math.min(toIndex, chapter.lessons.length))
    return {
      ...chapter,
      lessons: [
        ...chapter.lessons.slice(0, index),
        place.element,
        ...chapter.lessons.slice(index),
      ],
    }
  })
}

/**
 * « Monter » (-1) ou « Descendre » (+1). Un chapitre reste parmi les chapitres ; une leçon en
 * tête de son chapitre monte à la fin du chapitre précédent, une leçon en fin de chapitre
 * descend en tête du suivant. Null si l'élément ne peut pas aller plus loin.
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

/** Vrai si les deux arbres ont les mêmes chapitres et les mêmes leçons, dans le même ordre. */
export function sameOrder(a: MethodTree, b: MethodTree): boolean {
  if (a.length !== b.length) return false
  return a.every((chapter, index) => {
    const other = b[index]
    return (
      chapter.id === other.id &&
      chapter.lessons.length === other.lessons.length &&
      chapter.lessons.every((lesson, i) => lesson.id === other.lessons[i].id)
    )
  })
}

/** Ce que outline_reorder reçoit : tous les chapitres et toutes leurs leçons, dans l'ordre. */
export function toOutlinePayload(
  tree: MethodTree
): { chapterId: string; lessonIds: string[] }[] {
  return tree.map((chapter) => ({
    chapterId: chapter.id,
    lessonIds: chapter.lessons.map((lesson) => lesson.id),
  }))
}

/** Le nombre de leçons de l'arbre. */
export function lessonCount(tree: MethodTree): number {
  return tree.reduce((count, chapter) => count + chapter.lessons.length, 0)
}

/**
 * Ce que l'app montrera du plan à la prochaine publication de la méthode : les chapitres où
 * « Montrer dans l'app » est coché, et dans chacun ses leçons cochées ([D29]).
 */
export function appPlan(tree: MethodTree): MethodTree {
  return tree
    .filter((chapter) => chapter.inApp)
    .map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.filter((lesson) => lesson.inApp),
    }))
}

// ---------------------------------------------------------------------------------------------
// Glisser-déposer : un SortableContext pour les chapitres, un par chapitre pour ses leçons, et
// une zone de dépôt pour un chapitre sans leçon.
// ---------------------------------------------------------------------------------------------

const ZONE_PREFIX = "lecons:"

/** La zone de dépôt des leçons d'un chapitre (pour y déposer une leçon quand il est vide). */
export function lessonZoneId(chapterId: string): string {
  return `${ZONE_PREFIX}${chapterId}`
}

function chapterOfZone(id: UniqueIdentifier): string | null {
  const value = String(id)
  return value.startsWith(ZONE_PREFIX) ? value.slice(ZONE_PREFIX.length) : null
}

/** Ce que porte chaque cible de dépôt (data de useSortable et useDroppable). */
export type OutlineDropData =
  | { type: "chapter" }
  | { type: "lesson"; chapterId: string }
  | { type: "zone"; chapterId: string }

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

/**
 * Vrai si l'élément déplacé peut aller sur cette cible : un chapitre parmi les chapitres, une
 * leçon parmi les leçons (ou dans un chapitre vide). Un chapitre n'entre jamais dans un
 * chapitre, une leçon ne sort jamais des chapitres.
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
  return targetChapter(tree, overId) !== null
}

/**
 * Pendant le survol : une leçon passe dans un autre chapitre, juste avant ou après la leçon
 * visée (ou à la fin d'un chapitre vide). Null si rien ne change ou si c'est refusé.
 */
export function moveOverOutline(
  tree: MethodTree,
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
  below: boolean
): MethodTree | null {
  const active = findInTree(tree, String(activeId))
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
  return null
}

// ---------------------------------------------------------------------------------------------
// Le plan en ligne (versions.outline de la version en ligne de la méthode)
// ---------------------------------------------------------------------------------------------

export type LiveOutline = {
  chapters: {
    chapterId: string
    versionId: string
    lessons: { lessonId: string; versionId: string }[]
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
          ? [{ lessonId: lesson.lessonId, versionId: lesson.versionId }]
          : []
      ),
    })
  }
  return { chapters }
}

/** Les éléments (chapitres et leçons) cités par le plan en ligne. */
export function liveIds(outline: LiveOutline | null): Set<string> {
  const ids = new Set<string>()
  for (const chapter of outline?.chapters ?? []) {
    ids.add(chapter.chapterId)
    for (const lesson of chapter.lessons) ids.add(lesson.lessonId)
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
  kind: "method" | "chapter" | "lesson"
  title: string
  // Le chapitre d'une leçon (celui du plan à venir, ou du plan en ligne pour une leçon retirée).
  chapterId: string | null
  chapterTitle: string | null
  change: PreviewChange
  // Le code qui ferait refuser la publication (image sans fichier…), et sa précision.
  problem: string | null
  problemDetail: string | null
  savedAt: string | null
  savedByName: string | null
}

/** Les lignes d'un élément de l'arbre (chapitre ou leçon), par identifiant. */
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
// L'état de chaque élément
// ---------------------------------------------------------------------------------------------

/**
 * L'état d'un chapitre ou d'une leçon, vu de l'app :
 * - live : en ligne, sans changement à publier ;
 * - modified : en ligne, modifié depuis la publication (partira à la prochaine) ;
 * - new : « Montrer dans l'app » coché, pas encore en ligne (partira à la prochaine) ;
 * - removing : en ligne, mais décoché (ou dans un chapitre décoché) : sortira à la prochaine ;
 * - withdrawn : déjà publié autrefois, retiré de l'app, décoché ;
 * - hidden : jamais publié, décoché ;
 * - blocked : leçon cochée dans un chapitre décoché : elle ne part pas.
 */
export type ElementState =
  "live" | "modified" | "new" | "removing" | "withdrawn" | "hidden" | "blocked"

/**
 * L'état d'un élément : d'après publish_preview (preview, undefined tant qu'il n'est pas lu) et
 * le plan en ligne. chapterInApp : « Montrer dans l'app » du chapitre d'une leçon.
 */
export function elementState(
  element: Pick<OutlineElement, "id" | "kind" | "inApp" | "published">,
  chapterInApp: boolean,
  live: ReadonlySet<string>,
  preview: ReadonlyMap<string, PreviewRow> | undefined
): ElementState {
  const row = preview?.get(element.id)
  if (row?.change === "removed") return "removing"
  if (row?.change === "new") return "new"
  if (row?.change === "modified") return "modified"
  const goes = element.inApp && (element.kind === "chapter" || chapterInApp)
  if (live.has(element.id)) {
    // Sans la liste des changements : un élément en ligne décoché sortira.
    return preview === undefined && !goes ? "removing" : "live"
  }
  if (element.inApp && !goes) return "blocked"
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
 * Le niveau d'accès d'un chapitre ou d'une leçon à la prochaine publication de sa méthode
 * ([D43]) : celui de la méthode, sauf pour une leçon gratuite, et pour l'introduction d'un
 * chapitre dont une leçon montrée dans l'app est gratuite. lessons : celles du chapitre (pour
 * un chapitre), dans le brouillon du plan.
 */
export function elementAccess(
  method: Access,
  element: { kind: "chapter" | "lesson"; isFree: boolean },
  lessons: readonly Pick<OutlineElement, "inApp" | "isFree">[]
): Access {
  if (element.kind === "lesson") return element.isFree ? FREE : method
  return lessons.some((lesson) => lesson.inApp && lesson.isFree) ? FREE : method
}

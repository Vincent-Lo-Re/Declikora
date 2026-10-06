// La page d'une méthode (ADMIN § 4, « Une méthode sur une seule page »), sans React : ses parties
// dans l'ordre (la fiche, puis chaque chapitre, ses leçons et leurs exercices), le nom de chaque
// partie, la partie gardée dans l'adresse, la partie en cours d'après le défilement, l'écran du
// dessus en Lecture, et l'état d'enregistrement de toute la méthode.

import type { ElementContext } from "@/lib/contents/methods"
import type {
  MethodTree,
  OutlineChapter,
  OutlineElement,
  OutlineLesson,
} from "@/lib/contents/outline"
import type { AutosaveState } from "@/lib/editor/autosave"
import { texts } from "@/texts"

/** Une partie de la page : la fiche de la méthode, un chapitre, une leçon ou un exercice. */
export type MethodPart =
  | { kind: "method"; id: string }
  | { kind: "chapter"; id: string; element: OutlineChapter; number: number }
  | {
      kind: "lesson"
      id: string
      element: OutlineLesson
      chapter: OutlineChapter
      number: number
      chapterNumber: number
    }
  | {
      kind: "exercise"
      id: string
      element: OutlineElement
      lesson: OutlineLesson
      chapter: OutlineChapter
      number: number
      lessonNumber: number
      chapterNumber: number
    }

/** Un chapitre, une leçon ou un exercice de la page (toutes les parties sauf la fiche). */
export type ElementPart = Exclude<MethodPart, { kind: "method" }>

/** « Montrer dans l'app » et « Leçon gratuite » d'un élément, tels qu'ils sont à l'écran. */
export type ElementFlags = { inApp: boolean; isFree: boolean }

/** Ce qu'une partie montre déjà à l'écran : son titre, ses cases (pas encore enregistrés). */
export type ShownElement = Partial<
  Pick<OutlineElement, "title" | "inApp" | "isFree">
>

/**
 * L'arbre de la méthode tel qu'il est à l'écran (titres tapés, cases cochées dans le plan ou la
 * colonne de droite, peut-être pas encore enregistrés) : le plan, les états et la Lecture le
 * montrent aussitôt. Le même arbre s'il n'y a rien à changer.
 */
export function withShown(
  tree: MethodTree,
  shown: ReadonlyMap<string, ShownElement>
): MethodTree {
  const apply = <T extends OutlineElement>(element: T): T => {
    const wanted = shown.get(element.id)
    if (!wanted) return element
    const differs = (Object.keys(wanted) as (keyof ShownElement)[]).some(
      (key) => wanted[key] !== undefined && wanted[key] !== element[key]
    )
    return differs ? { ...element, ...wanted } : element
  }
  let changed = false
  const next = tree.map((chapter) => {
    const lessons = chapter.lessons.map((lesson) => {
      const exercises = lesson.exercises.map(apply)
      const shownLesson = apply(lesson)
      const same =
        shownLesson === lesson &&
        exercises.every(
          (exercise, index) => exercise === lesson.exercises[index]
        )
      return same ? lesson : { ...shownLesson, exercises }
    })
    const shownChapter = apply(chapter)
    const same =
      shownChapter === chapter &&
      lessons.every((lesson, index) => lesson === chapter.lessons[index])
    if (!same) changed = true
    return same ? chapter : { ...shownChapter, lessons }
  })
  return changed ? next : tree
}

/**
 * La méthode, le chapitre et la leçon d'un élément (la carte « Dans la méthode » et son niveau
 * d'accès), d'après la page : le titre et le niveau de la fiche tels qu'ils sont à l'écran.
 */
export function elementContextOf(
  part: ElementPart,
  method: Omit<ElementContext["method"], "deleted">
): ElementContext {
  return {
    method: { ...method, deleted: false },
    chapter:
      part.kind === "chapter"
        ? null
        : { id: part.chapter.id, title: part.chapter.title },
    lesson:
      part.kind === "exercise"
        ? {
            id: part.lesson.id,
            title: part.lesson.title,
            isFree: part.lesson.isFree,
          }
        : null,
  }
}

/**
 * Toutes les parties, dans l'ordre de la page : la fiche, puis chaque chapitre suivi de ses
 * leçons, chaque leçon suivie de ses exercices. number : la place dans son parent (1, 2, 3…),
 * comme le plan la numérote.
 */
export function methodParts(methodId: string, tree: MethodTree): MethodPart[] {
  const parts: MethodPart[] = [{ kind: "method", id: methodId }]
  tree.forEach((chapter, chapterIndex) => {
    parts.push({
      kind: "chapter",
      id: chapter.id,
      element: chapter,
      number: chapterIndex + 1,
    })
    chapter.lessons.forEach((lesson, lessonIndex) => {
      parts.push({
        kind: "lesson",
        id: lesson.id,
        element: lesson,
        chapter,
        number: lessonIndex + 1,
        chapterNumber: chapterIndex + 1,
      })
      lesson.exercises.forEach((exercise, exerciseIndex) => {
        parts.push({
          kind: "exercise",
          id: exercise.id,
          element: exercise,
          lesson,
          chapter,
          number: exerciseIndex + 1,
          lessonNumber: lessonIndex + 1,
          chapterNumber: chapterIndex + 1,
        })
      })
    })
  })
  return parts
}

/** Ce que le téléphone montre en Édition, dans l'ordre : les parties et les boutons d'ajout. */
export type PageItem =
  | { type: "part"; part: MethodPart }
  // Après les exercices d'une leçon (ou la leçon, si elle n'en a pas) : « Nouvel exercice ».
  | { type: "newExercise"; lesson: OutlineLesson; lessonNumber: number }
  // Après les leçons d'un chapitre (ou le chapitre, s'il n'en a pas) : « Nouvelle leçon ».
  | { type: "newLesson"; chapter: OutlineChapter; chapterNumber: number }
  // Tout en bas : « Nouveau chapitre ».
  | { type: "newChapter" }

/**
 * La page en Édition : chaque partie à sa place, « Nouvel exercice » à la fin de chaque leçon,
 * « Nouvelle leçon » à la fin de chaque chapitre, « Nouveau chapitre » tout en bas.
 */
export function pageItems(parts: readonly MethodPart[]): PageItem[] {
  const items: PageItem[] = []
  parts.forEach((part, index) => {
    items.push({ type: "part", part })
    const next = parts[index + 1]
    // La fin d'une leçon : la leçon sans exercice, ou son dernier exercice.
    if (part.kind === "lesson" || part.kind === "exercise") {
      if (next?.kind !== "exercise") {
        items.push(
          part.kind === "lesson"
            ? {
                type: "newExercise",
                lesson: part.element,
                lessonNumber: part.number,
              }
            : {
                type: "newExercise",
                lesson: part.lesson,
                lessonNumber: part.lessonNumber,
              }
        )
      }
    }
    // La fin d'un chapitre : le chapitre suivant, ou la fin de la page.
    if (
      part.kind !== "method" &&
      (next === undefined || next.kind === "chapter")
    ) {
      items.push(
        part.kind === "chapter"
          ? {
              type: "newLesson",
              chapter: part.element,
              chapterNumber: part.number,
            }
          : {
              type: "newLesson",
              chapter: part.chapter,
              chapterNumber: part.chapterNumber,
            }
      )
    }
  })
  items.push({ type: "newChapter" })
  return items
}

/**
 * Le nom court de la place d'une partie, en tête de la partie dans le téléphone et dans la
 * colonne de droite : « Chapitre 1 », « Leçon 2 », « Exercice 1 » ; null pour la fiche.
 */
export function partPlace(part: MethodPart): string | null {
  const place = texts.methods.element.place
  switch (part.kind) {
    case "method":
      return null
    case "chapter":
      return place.chapter(part.number)
    case "lesson":
      return place.lesson(part.number)
    case "exercise":
      return place.exercise(part.number)
  }
}

/**
 * Le nom complet de la place d'une partie, unique dans la méthode (lecteurs d'écran) :
 * « Chapitre 2 », « Chapitre 2, leçon 1 », « Chapitre 2, leçon 1, exercice 3 » ; null pour la
 * fiche.
 */
export function partPath(part: MethodPart): string | null {
  const path = texts.methods.page.path
  switch (part.kind) {
    case "method":
      return null
    case "chapter":
      return path.chapter(part.number)
    case "lesson":
      return path.lesson(part.chapterNumber, part.number)
    case "exercise":
      return path.exercise(part.chapterNumber, part.lessonNumber, part.number)
  }
}

// La partie où l'on était, dans l'adresse (la fiche n'y est pas).
const PART = "partie"

/** La partie demandée par l'adresse (null : la fiche). */
export function partFromAddress(
  search: string | URLSearchParams
): string | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search
  return params.get(PART) || null
}

/** L'adresse avec cette partie (la fiche, ou une partie inconnue : sans). */
export function withPart(
  params: URLSearchParams,
  partId: string | null
): URLSearchParams {
  const next = new URLSearchParams(params)
  if (partId) next.set(PART, partId)
  else next.delete(PART)
  return next
}

// La ligne de lecture du téléphone, en part de sa hauteur : la partie dont le haut l'a passée
// est la partie en cours.
const READING_LINE = 0.3

/**
 * La partie en cours d'après le défilement. boxes : le haut et le bas de chaque partie, dans
 * l'ordre de la page, mesurés depuis le haut de l'écran du téléphone ; height : la hauteur de
 * l'écran ; focusedId : la partie qui a le curseur ; atBottom : la page est défilée jusqu'en bas.
 * - la partie qui a le curseur, tant qu'elle se voit (on y écrit) ;
 * - tout en bas : la dernière partie (elle ne peut pas monter plus haut) ;
 * - sinon la dernière dont le haut a passé la ligne de lecture ; avant la première, la première.
 */
export function currentPart({
  boxes,
  height,
  focusedId,
  atBottom,
}: {
  boxes: readonly { id: string; top: number; bottom: number }[]
  height: number
  focusedId: string | null
  atBottom: boolean
}): string | null {
  const focused = boxes.find((box) => box.id === focusedId)
  if (focused && focused.bottom > 0 && focused.top < height) return focused.id
  if (atBottom && boxes.length > 0) return boxes[boxes.length - 1].id
  let current = boxes[0]?.id ?? null
  for (const { id, top } of boxes) {
    if (top > height * READING_LINE) break
    current = id
  }
  return current
}

/**
 * En Lecture, l'écran du dessus, comme la flèche de retour de l'app : la leçon d'un exercice, la
 * méthode d'un chapitre ou d'une leçon ; rien pour la fiche.
 */
export function partAbove(
  part: MethodPart
): { id: string; title: string } | "method" | null {
  if (part.kind === "method") return null
  if (part.kind === "exercise") {
    return { id: part.lesson.id, title: part.lesson.title }
  }
  return "method"
}

// Du plus grave au plus anodin : c'est le premier trouvé qui se montre.
const SAVE_ORDER: AutosaveState["status"][] = [
  "stopped",
  "failed",
  "offline",
  "saving",
  "pending",
  "saved",
]

/**
 * L'état d'enregistrement de toute la méthode, d'après celui de chacune de ses parties : le plus
 * grave (une partie refusée l'emporte sur une partie enregistrée), avec la dernière heure
 * d'enregistrement.
 */
export function methodSaveState(
  states: readonly AutosaveState[]
): AutosaveState {
  const worst =
    SAVE_ORDER.flatMap(
      (status) => states.find((state) => state.status === status) ?? []
    )[0] ?? null
  const savedAt = states.reduce<string | null>(
    (latest, state) =>
      state.savedAt !== null && (latest === null || state.savedAt > latest)
        ? state.savedAt
        : latest,
    null
  )
  return {
    status: worst?.status ?? "saved",
    rev: 0,
    savedAt,
    unsaved: states.some((state) => state.unsaved),
    error: worst?.error ?? null,
  }
}

import { cn } from "cn"
import { ChevronRight, CirclePlay, Lock } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import { useEditorLink } from "@/hooks/use-editor-link"
import {
  appPlan,
  type MethodTree,
  type OutlineElement,
  type OutlineLesson,
  type PlanScreen,
} from "@/lib/contents/outline"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.preview

/**
 * Le plan d'une méthode dans le téléphone, sous sa fiche, tel que l'app le montrera après la
 * prochaine publication (ADMIN § 4) : les chapitres montrés, puis leurs leçons montrées, chacune
 * à lire ou réservée, « Gratuite » pour une leçon gratuite d'une méthode réservée ([D43]) et le
 * nombre de ses exercices montrés (le plan ne les liste pas, QCM du 04/10/2026). Un chapitre ou
 * une leçon ouvre son écran : son éditeur, en Lecture si l'on y est (QCM du 04/10/2026) ; un
 * abonné à la bonne formule n'a rien de réservé.
 */
export function MethodAppPlan({
  tree,
  reserved,
  editable,
  subscriber,
}: {
  tree: MethodTree
  // La méthode a un niveau d'accès choisi qui n'est pas « Gratuit ».
  reserved: boolean
  // Édition : un plan vide le dit.
  editable: boolean
  // Lecture comme un abonné à la bonne formule : rien n'est réservé.
  subscriber: boolean
}) {
  const plan = appPlan(tree)
  if (plan.length === 0) {
    return editable ? <p className="blocks-meta">{labels.empty}</p> : null
  }
  return (
    <ol aria-label={labels.label} className="blocks-plan">
      {plan.map((chapter, index) => (
        <li key={chapter.id}>
          <PlanLink
            id={chapter.id}
            kind="chapter"
            className="blocks-plan-chapter"
          >
            {labels.chapter(
              index + 1,
              chapter.title.trim() || texts.common.untitled
            )}
          </PlanLink>
          <LessonRows
            lessons={chapter.lessons}
            reserved={reserved}
            subscriber={subscriber}
          />
        </li>
      ))}
    </ol>
  )
}

/**
 * Sous l'introduction d'un chapitre, comme dans l'app (QCM du 04/10/2026) : ses leçons montrées,
 * comme dans le plan de la méthode. En Édition, une explication remplace la liste vide.
 */
export function ChapterLessons({
  lessons,
  reserved,
  editable,
  subscriber,
}: {
  // Les leçons du chapitre, dans l'ordre du plan (cochées ou non).
  lessons: readonly OutlineLesson[]
  reserved: boolean
  editable: boolean
  subscriber: boolean
}) {
  const shown = lessons.filter((lesson) => lesson.inApp)
  return (
    <BelowList
      title={labels.chapterLessons}
      empty={editable ? labels.chapterLessonsEmpty : null}
      count={shown.length}
    >
      <LessonRows lessons={shown} reserved={reserved} subscriber={subscriber} />
    </BelowList>
  )
}

/**
 * En bas d'une leçon, comme dans l'app (QCM du 04/10/2026) : ses exercices montrés dans l'app,
 * chacun à faire ou réservé (comme sa leçon), qui ouvre son écran. En Édition, une explication
 * remplace la liste vide.
 */
export function LessonExercises({
  exercises,
  locked,
  editable,
}: {
  // Les exercices de la leçon, dans l'ordre du plan (cochés ou non).
  exercises: readonly OutlineElement[]
  // La leçon est réservée à qui lit : ses exercices aussi.
  locked: boolean
  editable: boolean
}) {
  const shown = exercises.filter((exercise) => exercise.inApp)
  return (
    <BelowList
      title={labels.lessonExercises}
      empty={editable ? labels.lessonExercisesEmpty : null}
      count={shown.length}
    >
      <ul className="blocks-plan-lessons">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <PlanLink
              id={exercise.id}
              kind="exercise"
              className="blocks-plan-lesson"
            >
              <ScreenIcon locked={locked} />
              <span className="flex-1">
                {exercise.title.trim() || texts.common.untitled}
              </span>
              {locked && (
                <span className="sr-only">{labels.lockedExercise}</span>
              )}
            </PlanLink>
          </li>
        ))}
      </ul>
    </BelowList>
  )
}

/**
 * Tout en bas d'un chapitre ou d'une leçon, comme dans l'app (QCM du 04/10/2026) : « Suivant »,
 * l'écran d'après dans l'ordre du plan (nextScreen de lib/contents/outline.ts).
 */
export function NextScreen({
  screen,
  locked,
}: {
  screen: PlanScreen
  // L'écran suivant est réservé à qui lit (screenReserved).
  locked: boolean
}) {
  const title = screen.element.title.trim() || texts.common.untitled
  return (
    <nav aria-label={labels.next} className="blocks-plan blocks-plan-below">
      <PlanLink
        id={screen.element.id}
        kind={screen.kind}
        className="blocks-plan-lesson blocks-plan-next"
      >
        <ScreenIcon locked={locked} />
        <span className="flex-1">
          <span className="blocks-plan-count">{labels.next}</span>
          <span className="block">
            {screen.kind === "chapter"
              ? labels.chapter(screen.number, title)
              : title}
          </span>
        </span>
        {locked && <span className="sr-only">{labels.locked}</span>}
        <ChevronRight aria-hidden />
      </PlanLink>
    </nav>
  )
}

/** Sous le contenu d'un écran : une liste titrée, ou l'explication d'une liste vide. */
function BelowList({
  title,
  empty,
  count,
  children,
}: {
  title: string
  // En Édition : ce qu'on dit d'une liste vide ; en Lecture (null), elle disparaît.
  empty: string | null
  count: number
  children: ReactNode
}) {
  if (count === 0) {
    return empty ? <p className="blocks-meta">{empty}</p> : null
  }
  return (
    <section aria-label={title} className="blocks-plan blocks-plan-below">
      <h2 className="blocks-plan-chapter">{title}</h2>
      {children}
    </section>
  )
}

/** Les leçons d'un chapitre, chacune à lire ou réservée, « Gratuite », et ses exercices. */
function LessonRows({
  lessons,
  reserved,
  subscriber,
}: {
  // Les leçons montrées dans l'app.
  lessons: readonly OutlineLesson[]
  reserved: boolean
  subscriber: boolean
}) {
  return (
    <ul className="blocks-plan-lessons">
      {lessons.map((lesson) => {
        const locked = reserved && !lesson.isFree && !subscriber
        const exercises = lesson.exercises.filter(
          (exercise) => exercise.inApp
        ).length
        return (
          <li key={lesson.id}>
            <PlanLink
              id={lesson.id}
              kind="lesson"
              className="blocks-plan-lesson"
            >
              <ScreenIcon locked={locked} />
              <span className="flex-1">
                {lesson.title.trim() || texts.common.untitled}
              </span>
              {locked && <span className="sr-only">{labels.locked}</span>}
              {reserved && lesson.isFree && (
                <span className="blocks-plan-free">{labels.free}</span>
              )}
              {exercises > 0 && (
                <span className="blocks-plan-count">
                  {labels.exercises(exercises)}
                </span>
              )}
            </PlanLink>
          </li>
        )
      })}
    </ul>
  )
}

/** Un écran à lire, ou réservé. */
function ScreenIcon({ locked }: { locked: boolean }) {
  return locked ? <Lock aria-hidden /> : <CirclePlay aria-hidden />
}

/**
 * Un élément du plan : un lien vers son éditeur, qui garde les réglages du téléphone de
 * l'adresse (en Lecture, il s'ouvre en Lecture).
 */
function PlanLink({
  id,
  kind,
  className,
  children,
}: {
  id: string
  kind: OutlineElement["kind"]
  className: string
  children: ReactNode
}) {
  const editorLink = useEditorLink()
  const path = contentEditorPath(kind, id)
  return path ? (
    <Link to={editorLink(path)} className={cn(className, "blocks-plan-link")}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  )
}

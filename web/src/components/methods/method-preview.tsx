import { cn } from "cn"
import { CirclePlay, Lock } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import {
  appPlan,
  type MethodTree,
  type OutlineElement,
} from "@/lib/contents/outline"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.preview

/**
 * Le plan d'une méthode dans le téléphone, sous sa fiche, tel que l'app le montrera après la
 * prochaine publication (ADMIN § 4) : les chapitres montrés, puis leurs leçons montrées, chacune
 * à lire ou réservée, « Gratuite » pour une leçon gratuite d'une méthode réservée ([D43]) et le
 * nombre de ses exercices montrés (le plan ne les liste pas, QCM du 04/10/2026). En Édition, un
 * chapitre ou une leçon ouvre son éditeur ; en Lecture, rien ne se clique, et un abonné à la bonne
 * formule n'a rien de réservé.
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
  // Édition : chaque élément mène à son éditeur.
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
            editable={editable}
            className="blocks-plan-chapter"
          >
            {labels.chapter(
              index + 1,
              chapter.title.trim() || texts.common.untitled
            )}
          </PlanLink>
          <ul className="blocks-plan-lessons">
            {chapter.lessons.map((lesson) => {
              const locked = reserved && !lesson.isFree && !subscriber
              const exercises = lesson.exercises.length
              return (
                <li key={lesson.id}>
                  <PlanLink
                    id={lesson.id}
                    kind="lesson"
                    editable={editable}
                    className="blocks-plan-lesson"
                  >
                    {locked ? <Lock aria-hidden /> : <CirclePlay aria-hidden />}
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
        </li>
      ))}
    </ol>
  )
}

/**
 * En bas d'une leçon dans le téléphone, comme dans l'app (QCM du 04/10/2026) : ses exercices
 * montrés dans l'app, chacun à faire ou réservé (comme sa leçon). En Édition, chacun ouvre son
 * éditeur, et une explication remplace la liste vide ; en Lecture, rien ne se clique.
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
  if (shown.length === 0) {
    return editable ? (
      <p className="blocks-meta">{labels.lessonExercisesEmpty}</p>
    ) : null
  }
  return (
    <section
      aria-label={labels.lessonExercises}
      className="blocks-plan blocks-lesson-exercises"
    >
      <h2 className="blocks-plan-chapter">{labels.lessonExercises}</h2>
      <ul className="blocks-plan-lessons">
        {shown.map((exercise) => (
          <li key={exercise.id}>
            <PlanLink
              id={exercise.id}
              kind="exercise"
              editable={editable}
              className="blocks-plan-lesson"
            >
              {locked ? <Lock aria-hidden /> : <CirclePlay aria-hidden />}
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
    </section>
  )
}

/** Un élément du plan : un lien vers son éditeur en Édition, sinon du texte. */
function PlanLink({
  id,
  kind,
  editable,
  className,
  children,
}: {
  id: string
  kind: OutlineElement["kind"]
  editable: boolean
  className: string
  children: ReactNode
}) {
  const path = editable ? contentEditorPath(kind, id) : null
  return path ? (
    <Link to={path} className={cn(className, "blocks-plan-link")}>
      {children}
    </Link>
  ) : (
    <span className={className}>{children}</span>
  )
}

import { cn } from "cn"
import { CirclePlay, Lock } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import { appPlan, type MethodTree } from "@/lib/contents/outline"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.preview

/**
 * Le plan d'une méthode dans le téléphone, sous sa fiche, tel que l'app le montrera après la
 * prochaine publication (ADMIN § 4) : les chapitres montrés, puis leurs leçons montrées, chacune
 * à lire ou réservée, et « Gratuite » pour une leçon gratuite d'une méthode réservée ([D43]). En
 * Édition, un chapitre ou une leçon ouvre son éditeur ; en Lecture, rien ne se clique, et un
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

/** Un chapitre ou une leçon du plan : un lien vers son éditeur en Édition, sinon du texte. */
function PlanLink({
  id,
  kind,
  editable,
  className,
  children,
}: {
  id: string
  kind: "chapter" | "lesson"
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

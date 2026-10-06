import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { Navigate, useParams, useSearchParams } from "react-router"

import { BackLink, EditorNotFound } from "@/components/editor/editor-chrome"
import { EditorSkeleton } from "@/components/editor/editor-skeleton"
import { useAccessCheck } from "@/components/team/use-access-check"
import { withPart } from "@/lib/contents/method-page"
import { elementContextRead } from "@/lib/reads"
import { editorPath } from "@/navigation"

/**
 * Un chapitre, une leçon ou un exercice ouvert d'ailleurs (Accueil, Corbeille, un ancien lien) :
 * /methodes/lecons/<id> mène à la page de sa méthode, déjà sur cette partie (ADMIN § 4, « Une
 * méthode sur une seule page »). Les réglages du téléphone de l'adresse (Lecture…) suivent.
 */
export function MethodElementPage() {
  const { contentId = "" } = useParams()
  const [searchParams] = useSearchParams()
  const checkAccess = useAccessCheck()
  const context = useQuery(elementContextRead(contentId))
  useEffect(() => {
    if (context.error) checkAccess(context.error)
  }, [context.error, checkAccess])

  if (context.isPending) {
    return <EditorSkeleton back={<BackLink section="methods" compact />} />
  }
  if (!context.data || context.data.method.deleted) {
    const failed = context.isError
    return (
      <EditorNotFound
        section="methods"
        message={failed ? context.error.message : null}
        retry={failed ? () => void context.refetch() : null}
      />
    )
  }
  return (
    <Navigate
      replace
      to={{
        pathname: editorPath("methods", context.data.method.id),
        search: `?${withPart(searchParams, contentId)}`,
      }}
    />
  )
}

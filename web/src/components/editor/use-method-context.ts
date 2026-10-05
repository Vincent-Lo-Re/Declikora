import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type { MethodPublication } from "@/components/editor/use-publication"
import { contentKeys } from "@/lib/contents/api"
import {
  getElementContext,
  getMethodPreview,
  getMethodTree,
  methodKeys,
} from "@/lib/contents/methods"
import {
  elementState,
  findInTree,
  liveIds,
  parentsInApp,
  parseLiveOutline,
  previewByElement,
} from "@/lib/contents/outline"
import {
  getPublication,
  publicationStatus,
  type ScheduleState,
} from "@/lib/contents/publication"

/**
 * Les méthodes, vues depuis l'éditeur ([D29], [D31]). Une méthode : ce qui changera dans l'app si
 * on la publie (relu régulièrement, les autres écrivent ses leçons). Un chapitre, une leçon ou un
 * exercice : sa méthode, son chapitre et sa leçon (le retour, le niveau d'accès), sa place dans le
 * plan, son état dans l'app, la programmation de sa méthode, et ce qui ferait refuser sa
 * publication à cause de lui. Rien pour les autres sortes.
 */
export function useMethodContext({
  contentId,
  role,
  inApp,
  ficheSavedAt,
}: {
  contentId: string
  // La méthode elle-même, un de ses éléments (chapitre, leçon, exercice), ou ni l'un ni l'autre.
  role: "method" | "element" | null
  // La case « Montrer dans l'app » de cet élément, telle qu'elle est à l'écran.
  inApp: boolean
  // Méthode : le moment (dans ce navigateur) où sa fiche a été enregistrée pour la dernière fois.
  ficheSavedAt: number
}) {
  const isElement = role === "element"
  const elementContext = useQuery({
    queryKey: methodKeys.context(contentId),
    queryFn: () => getElementContext(contentId),
    enabled: isElement,
  })
  const methodId =
    role === "method" ? contentId : (elementContext.data?.method.id ?? null)
  const methodInTrash = elementContext.data?.method.deleted ?? false
  // Ce qui changera dans l'app si l'on publie la méthode : relu après chaque geste du plan, à
  // l'ouverture de « Publier », et à chaque ouverture d'un éditeur (on revient souvent d'une
  // leçon modifiée).
  const preview = useQuery({
    queryKey: methodKeys.preview(methodId ?? ""),
    queryFn: () => getMethodPreview(methodId ?? ""),
    enabled: methodId !== null && !methodInTrash,
    staleTime: 0,
    refetchInterval: 30_000,
  })
  // Un élément : la publication de sa méthode (plan en ligne, programmation) et son plan (le
  // chapitre d'une leçon est-il montré ?).
  const methodPublication = useQuery({
    queryKey: contentKeys.publication(methodId ?? ""),
    queryFn: () => getPublication(methodId ?? ""),
    enabled: isElement && methodId !== null,
    refetchInterval: 30_000,
  })
  const methodTree = useQuery({
    queryKey: methodKeys.tree(methodId ?? ""),
    queryFn: () => getMethodTree(methodId ?? ""),
    enabled: isElement && methodId !== null,
  })

  // Sa place dans le plan (chapitre et rang), undefined tant que le plan n'est pas lu.
  const place = useMemo(
    () =>
      isElement && methodTree.data
        ? findInTree(methodTree.data, contentId)
        : undefined,
    [isElement, methodTree.data, contentId]
  )

  // L'état de cet élément dans l'app (« À publier », « En ligne »…).
  const ownState = useMemo(() => {
    if (!methodPublication.data || !place) return undefined
    return elementState(
      { ...place.element, inApp },
      parentsInApp(place),
      liveIds(parseLiveOutline(methodPublication.data.live?.outline)),
      preview.data ? previewByElement(preview.data) : undefined
    )
  }, [methodPublication.data, place, inApp, preview.data])

  // La programmation de la méthode, vue depuis cet élément ([D31]).
  const methodSchedule: ScheduleState = methodPublication.data
    ? publicationStatus(
        methodPublication.data,
        methodPublication.data.draft_rev,
        methodPublication.dataUpdatedAt
      ).schedule
    : { kind: "none" }

  // Ce qui ferait refuser la publication de la méthode à cause de cet élément.
  const ownProblem = isElement
    ? (preview.data?.find(
        (row) => row.elementId === contentId && row.problem !== null
      ) ?? null)
    : null

  // Une méthode : ce que « Publier » montre et demande.
  const methodBridge: MethodPublication | undefined =
    role === "method"
      ? {
          preview: preview.data,
          // La fiche enregistrée après la dernière lecture de la liste compte aussi.
          pending:
            preview.data === undefined
              ? undefined
              : preview.data.length > 0 || ficheSavedAt > preview.dataUpdatedAt,
          fetching: preview.isFetching,
          failed: preview.isError,
          refresh: () => preview.refetch(),
        }
      : undefined

  return {
    element: elementContext.data,
    // Un élément : le plan de sa méthode (« Suivant », en bas de son écran).
    tree: methodTree.data,
    place,
    preview: preview.data,
    ownState,
    methodSchedule,
    ownProblem,
    methodBridge,
  }
}

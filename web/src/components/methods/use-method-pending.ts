import { useQueries } from "@tanstack/react-query"

import { liveMethodIds, methodPreviewRead } from "@/lib/reads"

/**
 * Pour chaque méthode en ligne de la liste : vrai si publier changerait quelque chose dans l'app
 * (publish_preview non vide), faux sinon ; absente tant qu'on ne le sait pas. La révision de la
 * fiche ne suffit pas : une leçon modifiée ne change pas la fiche de sa méthode ([D29]).
 */
export function useMethodPending(
  items:
    | readonly { id: string; kind?: string; live_draft_rev: number | null }[]
    | undefined,
  // Sans kind (liste d'une seule sorte) : toutes les lignes sont des méthodes.
  allMethods = false
): Map<string, boolean> {
  const ids = liveMethodIds(items, allMethods)
  const previews = useQueries({
    queries: ids.map((id) => ({
      ...methodPreviewRead(id),
      refetchInterval: 60_000,
    })),
  })
  return new Map(
    ids.flatMap((id, index) => {
      const rows = previews[index]?.data
      return rows ? [[id, rows.length > 0] as const] : []
    })
  )
}

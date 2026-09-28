import { useQueries } from "@tanstack/react-query"

import { getMethodPreview, methodKeys } from "@/lib/contents/methods"

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
  const live = (items ?? []).filter(
    (item) =>
      (allMethods || item.kind === "method") && item.live_draft_rev !== null
  )
  const previews = useQueries({
    queries: live.map((item) => ({
      queryKey: methodKeys.preview(item.id),
      queryFn: () => getMethodPreview(item.id),
      refetchInterval: 60_000,
    })),
  })
  return new Map(
    live.flatMap((item, index) => {
      const rows = previews[index]?.data
      return rows ? [[item.id, rows.length > 0] as const] : []
    })
  )
}

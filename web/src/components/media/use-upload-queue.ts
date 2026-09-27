import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useSyncExternalStore } from "react"

import { getMediaVerdicts, mediaKeys, type MediaVerdict } from "@/lib/media/api"
import type { UploadItem } from "@/lib/media/upload"
import { getUploadQueue, type UploadQueue } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

/** La file d'envoi et ses éléments. */
export function useUploadQueue(queue: UploadQueue = getUploadQueue()) {
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot)
  return { queue, items }
}

/**
 * À monter UNE fois pour toute l'admin (AppLayout), car la file continue quand on change de
 * section : à la fin de chaque envoi, la médiathèque est relue ; tant qu'un envoi tourne, le
 * navigateur prévient avant de quitter la page.
 */
export function useUploadQueueWatch(queue: UploadQueue = getUploadQueue()) {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      queue.onSettled(() => {
        void queryClient.invalidateQueries({ queryKey: mediaKeys.all })
      }),
    [queue, queryClient]
  )

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!queue.busy) return
      event.preventDefault()
      event.returnValue = texts.media.uploads.leaveWarning
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [queue])
}

/**
 * Statut actuel des fichiers envoyés qui attendaient leur vérification (SVG, Lottie) : relu
 * toutes les 3 secondes tant que la fonction « files » n'a pas tranché. Renvoie, pour un envoi
 * terminé, son statut le plus récent (null tant qu'il n'est pas terminé).
 */
export function useUploadVerdicts(items: UploadItem[]) {
  const ids = items
    .filter(
      (item) => item.stage === "done" && item.result?.status === "checking"
    )
    .map((item) => item.result!.id)
    .sort()
  const query = useQuery({
    queryKey: mediaKeys.verdicts(ids),
    queryFn: () => getMediaVerdicts(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (current) =>
      (current.state.data ?? []).some(
        (verdict) => verdict.status === "checking"
      )
        ? 3000
        : false,
  })
  return (item: UploadItem): MediaVerdict | null => {
    const result = item.result
    if (item.stage !== "done" || !result) return null
    return (
      query.data?.find((verdict) => verdict.id === result.id) ?? {
        id: result.id,
        status: result.status,
        reject_reason: result.reject_reason,
      }
    )
  }
}

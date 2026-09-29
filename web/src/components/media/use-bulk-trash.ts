import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { errorMessage } from "@/lib/errors"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import {
  restoreMany,
  trashMany,
  type BulkTrashResult,
} from "@/lib/media/bulk-trash"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/**
 * Mise à la corbeille des fichiers cochés, avec « Annuler » dans le message (comme depuis la
 * fiche d'un fichier). onDone reçoit ce qui est parti, ce qui est gardé, et l'erreur éventuelle.
 */
export function useBulkTrash(onDone: (result: BulkTrashResult) => void) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
    ])

  const undo = async (ids: string[]) => {
    const { restored, error } = await restoreMany(ids)
    if (restored > 0) toast.success(texts.media.selection.restored(restored))
    if (error) toast.error(errorMessage(error))
    await refresh()
  }

  return useMutation({
    mutationFn: (items: Media[]) => trashMany(items),
    onSuccess: (result) => {
      if (result.trashed.length > 0) {
        const ids = result.trashed.map((media) => media.id)
        toast.success(texts.media.selection.trashed(ids.length), {
          action: {
            label: texts.media.detail.undo,
            onClick: () => void undo(ids),
          },
        })
        // La corbeille rend les fichiers protégés tout de suite (fonction « files »).
        void kickFiles()
      }
      if (result.error) {
        toast.error(errorMessage(result.error))
        checkAccess(result.error)
      }
      onDone(result)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: refresh,
  })
}

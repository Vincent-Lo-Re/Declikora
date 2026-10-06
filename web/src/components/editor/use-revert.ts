import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { revertToVersion, type VersionItem } from "@/lib/contents/publication"
import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

/**
 * « Revenir à cette version » (Historique) : l'enregistrement en attente part d'abord, la version
 * est recopiée dans le brouillon par la base (sous le verrou tenu par cette ouverture), puis le
 * brouillon est relu. onDone : l'historique se ferme.
 */
export function useRevert({
  contentId,
  session,
  prepare,
  reload,
  notifyLost,
  onDone,
}: {
  contentId: string
  session: string
  prepare: () => Promise<number | null>
  reload: () => void
  notifyLost: () => void
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  return async (version: VersionItem) => {
    try {
      if ((await prepare()) === null) return
      const result = await revertToVersion(version.id, session)
      onDone()
      toast.success(texts.publication.history.reverted(version.number))
      for (const warning of result.warnings) {
        toast.warning(texts.publication.history.warnings[warning])
      }
      // La version est dans le brouillon : on le relit. Un échec de cette relecture n'annule pas
      // le retour à la version (il est dit, et la révision en retard sera relue d'elle-même).
      reload()
    } catch (error) {
      checkAccess(error)
      toast.error(errorMessage(error))
      if (error instanceof ContentError && error.code === "verrou_perdu") {
        notifyLost()
      }
    } finally {
      void queryClient.invalidateQueries({
        queryKey: contentKeys.publication(contentId),
      })
      void queryClient.invalidateQueries({
        queryKey: contentKeys.versions(contentId),
      })
      void queryClient.invalidateQueries({ queryKey: contentKeys.lists })
    }
  }
}

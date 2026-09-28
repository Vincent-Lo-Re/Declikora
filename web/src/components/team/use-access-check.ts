import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { profileQueryKey, useAuth } from "@/auth/auth-context"
import { isAccessLevelAccessLost } from "@/lib/access-levels"
import { isContentAccessLost } from "@/lib/contents/api"
import { isMediaAccessLost } from "@/lib/media/api"
import { isAccessLost } from "@/lib/team"

/**
 * Quand la fonction « equipe », la base ou la fonction « files » répond que la personne n'a
 * plus accès (rôle retiré par un admin, compte supprimé, session fermée), relit sa fiche : le
 * menu et les pages réservées suivent aussitôt, sans attendre un rechargement.
 */
export function useAccessCheck() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id

  return useCallback(
    (error: unknown) => {
      if (
        userId &&
        (isAccessLost(error) ||
          isMediaAccessLost(error) ||
          isContentAccessLost(error) ||
          isAccessLevelAccessLost(error))
      ) {
        void queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        })
      }
    },
    [queryClient, userId]
  )
}

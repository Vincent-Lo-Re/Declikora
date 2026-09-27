import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { profileQueryKey, useAuth } from "@/auth/auth-context"
import { isAccessLost } from "@/lib/team"

/**
 * Quand la fonction « equipe » répond que la personne n'est plus admin (rôle retiré
 * par un autre admin, compte supprimé, session fermée), relit sa fiche : le menu et
 * les pages réservées aux admins suivent aussitôt, sans attendre un rechargement.
 */
export function useAccessCheck() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const userId = profile?.id

  return useCallback(
    (error: unknown) => {
      if (userId && isAccessLost(error)) {
        void queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        })
      }
    },
    [queryClient, userId]
  )
}

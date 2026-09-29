import type { QueryClient } from "@tanstack/react-query"

import { contentKeys } from "@/lib/contents/api"
import { mediaKeys, trashKey } from "@/lib/media/api"

/**
 * Après une mise à la corbeille (ou son « Annuler ») d'un contenu ou d'un modèle : les listes,
 * la Corbeille et les « Utilisé dans » de la médiathèque.
 */
export function refreshAfterContentTrash(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: contentKeys.all }),
    queryClient.invalidateQueries({ queryKey: trashKey }),
    queryClient.invalidateQueries({ queryKey: mediaKeys.allUses }),
  ])
}

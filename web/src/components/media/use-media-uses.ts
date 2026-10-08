import { useQuery } from "@tanstack/react-query"

import { getMediaUses, mediaKeys } from "@/lib/media/api"

/** Les contenus qui utilisent un fichier (fenêtre des utilisations, fiche du fichier). */
export function useMediaUses(mediaId: string, enabled = true) {
  return useQuery({
    queryKey: mediaKeys.uses(mediaId),
    queryFn: () => getMediaUses(mediaId),
    enabled,
  })
}

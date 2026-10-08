import { useQuery } from "@tanstack/react-query"

import { getMediaUses, mediaKeys } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/** Les contenus qui utilisent un fichier (fenêtre des utilisations, fiche du fichier). */
export function useMediaUses(mediaId: string, enabled = true) {
  return useQuery({
    queryKey: mediaKeys.uses(mediaId),
    queryFn: () => getMediaUses(mediaId),
    enabled,
  })
}

/** Le nom du fichier exporté : celui du fichier, sans son extension. */
export function mediaUsesFileName(media: Pick<Media, "name">): string {
  return texts.media.uses.fileName(media.name.replace(/\.[^.]+$/, ""))
}

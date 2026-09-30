import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"

import { usePreviewUrls } from "@/components/media/use-preview-urls"
import {
  contentKeys,
  getMediaByIds,
  type ContentListItem,
} from "@/lib/contents/api"
import type { Media } from "@/lib/media/constants"

/**
 * Les images de présentation d'une liste de contenus, lues en une demande, avec leurs adresses
 * d'aperçu (comme les vignettes de la Médiathèque). Une image à la corbeille, pas encore prête
 * ou pas encore lue n'a pas d'adresse : la vignette montre alors l'icône.
 */
export function useCovers(items: ContentListItem[]) {
  const ids = [
    ...new Set(items.flatMap((item) => (item.cover_id ? [item.cover_id] : []))),
  ].sort()
  const query = useQuery({
    queryKey: contentKeys.media(ids),
    queryFn: () => getMediaByIds(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })
  const ready = useMemo(
    () =>
      (query.data ?? []).filter(
        (media) => media.status === "ready" && !media.deleted_at
      ),
    [query.data]
  )
  const byId = useMemo(
    () => new Map(ready.map((media) => [media.id, media])),
    [ready]
  )
  const urlFor = usePreviewUrls(ready)
  return useCallback(
    (item: ContentListItem): { media: Media | undefined; url?: string } => {
      const media = item.cover_id ? byId.get(item.cover_id) : undefined
      return { media, url: media && urlFor(media) }
    },
    [byId, urlFor]
  )
}

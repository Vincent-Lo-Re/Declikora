import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { flattenBlocks } from "@/blocks/draft"
import type { Block, Draft } from "@/blocks/types"
import { usePreviewUrlsState } from "@/components/media/use-preview-urls"
import { contentKeys, getMediaByIds } from "@/lib/contents/api"
import type { Media } from "@/lib/media/constants"

/**
 * Les fichiers d'un brouillon : ceux des blocs Image (blocs partagés compris, linkedBlocks),
 * l'image de présentation et l'audio, avec leurs adresses d'aperçu. mediaFor dit à chaque bloc ce
 * qu'il en est (absent, en lecture, supprimé, pas prêt, illisible, prêt). Un fichier choisi à
 * l'instant (rememberMedia) se montre sans attendre la relecture de la base.
 */
export function useDraftMedia(draft: Draft, linkedBlocks: Block[]) {
  const [picked, setPicked] = useState<Record<string, Media>>({})
  const mediaIds = useMemo(
    () =>
      [
        ...new Set([
          ...[
            ...flattenBlocks(draft).map(({ block }) => block),
            ...linkedBlocks,
          ].flatMap((block) =>
            block.type === "image" && block.mediaId ? [block.mediaId] : []
          ),
          ...(draft.cover?.mediaId ? [draft.cover.mediaId] : []),
          ...(draft.audio?.mediaId ? [draft.audio.mediaId] : []),
        ]),
      ].sort(),
    [draft, linkedBlocks]
  )
  const query = useQuery({
    queryKey: contentKeys.media(mediaIds),
    queryFn: () => getMediaByIds(mediaIds),
    enabled: mediaIds.length > 0,
    placeholderData: keepPreviousData,
    // Un texte alternatif ou une transcription ajoutés dans la Médiathèque (autre onglet) :
    // relus au retour dans l'éditeur.
    refetchOnWindowFocus: "always",
  })
  const mediaById = useMemo(() => {
    const map = new Map<string, Media>(Object.entries(picked))
    for (const media of query.data ?? []) map.set(media.id, media)
    return map
  }, [query.data, picked])
  const readyMedia = useMemo(
    () =>
      [...mediaById.values()].filter(
        (media) => media.status === "ready" && !media.deleted_at
      ),
    [mediaById]
  )
  const previews = usePreviewUrlsState(readyMedia)
  const { urlFor } = previews
  // keepPreviousData : pendant la lecture d'une nouvelle liste, les anciennes données restent
  // affichées (isPlaceholderData) ; un fichier absent n'est pas encore « supprimé ».
  const loading =
    (query.isPending || query.isPlaceholderData) && mediaIds.length > 0
  const failed = query.isError
  const { refetch } = query
  const retry = useCallback(() => void refetch(), [refetch])

  const mediaFor = useCallback(
    (mediaId: string | null): BlockMedia => {
      if (!mediaId) return { state: "none" }
      const media = mediaById.get(mediaId)
      if (!media) {
        if (loading) return { state: "loading" }
        if (failed) return { state: "error", retry }
        return { state: "missing" }
      }
      if (media.deleted_at) return { state: "missing" }
      if (media.status !== "ready") return { state: "not_ready", media }
      const url = urlFor(media)
      // Pas d'adresse d'aperçu une fois sa demande finie : elle a échoué (« Réessayer »), plutôt
      // qu'un « Chargement… » sans fin.
      if (!url && !previews.fetching) {
        return { state: "error", retry: previews.retry }
      }
      return { state: "ready", media, url }
    },
    [
      mediaById,
      loading,
      failed,
      retry,
      urlFor,
      previews.fetching,
      previews.retry,
    ]
  )

  /** Un fichier choisi à l'instant : montré sans attendre la relecture de la base. */
  const rememberMedia = useCallback(
    (media: Media) =>
      setPicked((current) => ({ ...current, [media.id]: media })),
    []
  )

  return { mediaFor, rememberMedia }
}

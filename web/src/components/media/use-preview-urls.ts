import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { PREVIEW_REFRESH_MS, previewKey } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { hasPreview, previewKeys, previewUrlsRead } from "@/lib/reads"

/**
 * Adresses d'aperçu des fichiers donnés (liens temporaires d'une heure pour les fichiers
 * protégés), en une seule demande : l'adresse d'un fichier (urlFor), si la demande est en
 * cours (fetching), et « Réessayer » (retry). Un fichier prêt sans adresse, hors d'une demande en
 * cours, n'a pas pu être lu : à montrer comme un échec, pas comme un chargement.
 */
export function usePreviewUrlsState(items: Media[] | undefined) {
  const keys = previewKeys(items)
  const query = useQuery({
    ...previewUrlsRead(keys),
    enabled: keys.length > 0,
    refetchInterval: PREVIEW_REFRESH_MS,
    placeholderData: keepPreviousData,
  })
  // Même fonction tant que les adresses ne changent pas : les composants mémoïsés (blocs de
  // l'éditeur) ne se redessinent pas pour rien.
  const urls = query.data
  const urlFor = useCallback(
    (media: Media): string | undefined =>
      hasPreview(media) ? urls?.[previewKey(media)] : undefined,
    [urls]
  )
  const { refetch } = query
  const retry = useCallback(() => void refetch(), [refetch])
  return {
    urlFor,
    fetching: query.isFetching,
    retry,
  }
}

/** Adresses d'aperçu des fichiers donnés (voir usePreviewUrlsState) : l'adresse d'un fichier. */
export function usePreviewUrls(items: Media[] | undefined) {
  return usePreviewUrlsState(items).urlFor
}

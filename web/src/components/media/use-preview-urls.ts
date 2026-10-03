import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import {
  getPreviewUrls,
  mediaKeys,
  PREVIEW_REFRESH_MS,
  previewKey,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"

/** Vrai si le fichier a un objet dans le stockage qu'on peut montrer. */
function hasPreview(media: Media): boolean {
  return media.status === "ready" || media.status === "checking"
}

/**
 * Adresses d'aperçu des fichiers donnés (liens temporaires d'une heure pour les fichiers
 * protégés), en une seule demande : l'adresse d'un fichier (urlFor), si la demande est en
 * cours (fetching), et « Réessayer » (retry). Un fichier prêt sans adresse, hors d'une demande en
 * cours, n'a pas pu être lu : à montrer comme un échec, pas comme un chargement.
 */
export function usePreviewUrlsState(items: Media[] | undefined) {
  const keys = (items ?? []).filter(hasPreview).map(previewKey).sort()
  const query = useQuery({
    queryKey: mediaKeys.urls(keys),
    queryFn: () => getPreviewUrls(keys),
    enabled: keys.length > 0,
    // Les liens valent une heure : relus toutes les 30 minutes (seuls ceux qui expirent avant
    // la relecture suivante sont redemandés, voir getPreviewUrls).
    staleTime: PREVIEW_REFRESH_MS,
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

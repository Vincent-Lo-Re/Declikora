import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router"

import {
  previewFromSearch,
  withPreview,
  type PreviewSettings,
} from "@/lib/editor/preview"

/**
 * Le téléphone montré par un éditeur (Édition ou Lecture, appareil, thème, taille du texte,
 * lecteur), gardé dans l'adresse d'un écran à l'autre et après un rechargement (QCM du
 * 04/10/2026). reading : en Lecture, rien ne se modifie et l'on ne prend pas la main ; toEdit :
 * repasser en Édition (pour ajouter un bloc).
 */
export function usePhoneView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const phoneView = useMemo(
    () => previewFromSearch(searchParams),
    [searchParams]
  )
  const setPhoneView = useCallback(
    (change: (current: PreviewSettings) => PreviewSettings) =>
      setSearchParams(
        (params) => withPreview(params, change(previewFromSearch(params))),
        { replace: true }
      ),
    [setSearchParams]
  )
  const toEdit = useCallback(
    () =>
      setPhoneView((current) =>
        current.mode === "edit" ? current : { ...current, mode: "edit" }
      ),
    [setPhoneView]
  )
  return {
    phoneView,
    setPhoneView,
    reading: phoneView.mode === "read",
    toEdit,
    searchParams,
    setSearchParams,
  }
}

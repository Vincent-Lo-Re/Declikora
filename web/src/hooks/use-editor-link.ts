import { useCallback } from "react"
import { useLocation } from "react-router"

import { keepPreview } from "@/lib/editor/preview"

/**
 * Les liens d'un éditeur à l'autre (méthode, chapitre, leçon, exercice) gardent les réglages du
 * téléphone de l'adresse affichée, Lecture comprise (QCM du 04/10/2026). Hors d'un éditeur,
 * l'adresse n'en a pas : les liens restent tels quels.
 */
export function useEditorLink(): (path: string) => string {
  const { search } = useLocation()
  return useCallback((path: string) => keepPreview(path, search), [search])
}

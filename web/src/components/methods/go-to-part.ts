import { createContext, useContext } from "react"

/**
 * Dans la page d'une méthode : mène à une partie (la fiche, un chapitre, une leçon, un exercice).
 * En Édition, le téléphone y défile ; en Lecture, il montre son écran (la page de l'admin ne
 * change pas, le plan suit). Donné par la page ; null ailleurs.
 */
export const GoToPartContext = createContext<((id: string) => void) | null>(
  null
)

export function useGoToPart(): ((id: string) => void) | null {
  return useContext(GoToPartContext)
}

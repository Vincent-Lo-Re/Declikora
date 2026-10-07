import { createContext, useContext } from "react"

// Vrai pour l'étape affichée parmi celles qui glissent (AuthSlides) : seule elle donne son titre
// à l'onglet (AuthForm).
export const SlideActive = createContext(true)

/** Vrai si l'étape est celle qu'on voit (toujours vrai hors d'AuthSlides). */
export function useSlideActive(): boolean {
  return useContext(SlideActive)
}

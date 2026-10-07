import { createContext, useContext } from "react"

import type { Palette } from "@/lib/palettes"

type PaletteContextValue = {
  palette: Palette
  setPalette: (palette: Palette) => void
}

export const PaletteContext = createContext<PaletteContextValue | null>(null)

/** Les couleurs choisies (base et accent) et de quoi les changer (Mon compte). */
export function usePalette() {
  const context = useContext(PaletteContext)
  if (!context) {
    throw new Error("usePalette doit être utilisé dans un PaletteProvider")
  }
  return context
}

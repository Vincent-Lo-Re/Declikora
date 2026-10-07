import { useLayoutEffect, useState, type ReactNode } from "react"

import { PaletteContext } from "@/components/theme/palette-context"
import {
  applyPalette,
  readPalette,
  savePalette,
  type Palette,
} from "@/lib/palettes"

/**
 * Les couleurs de chacun (ADMIN § 7, « Les couleurs de chacun ») : lues sur ce navigateur, posées
 * avant l'affichage (useLayoutEffect), changées dans Mon compte.
 */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>(readPalette)

  useLayoutEffect(() => applyPalette(palette), [palette])

  const setPalette = (next: Palette) => {
    savePalette(next)
    setPaletteState(next)
  }

  return (
    <PaletteContext value={{ palette, setPalette }}>{children}</PaletteContext>
  )
}

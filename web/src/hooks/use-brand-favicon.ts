import { useEffect, useState } from "react"

import { usePalette } from "@/components/theme/palette-context"
import { useBrand, useBrandName } from "@/hooks/use-brand-name"
import { brandFileFor, faviconHref } from "@/lib/admin-identity"
import { presetOf } from "@/lib/palettes"

const darkQuery = "(prefers-color-scheme: dark)"

/**
 * Le favicon suit la marque dès qu'elle est lue : son monogramme (décliné aux couleurs de la
 * palette de ce membre s'il l'a été), dans la version qui va avec le thème de l'ordinateur (la
 * barre d'onglets le suit), sinon son initiale ; avant, celui de
 * « Ruche ».
 */
export function useBrandFavicon() {
  const brand = useBrand()
  const name = useBrandName()
  const dark = useDarkSystem()
  const preset = presetOf(usePalette().palette)
  const monogram = brandFileFor(
    brand,
    "monogram",
    dark ? "dark" : "light",
    preset
  )
  const href = monogram ?? (name ? faviconHref(name) : null)
  useEffect(() => {
    if (!href) return
    document.querySelector('link[rel="icon"]')?.setAttribute("href", href)
  }, [href])
}

/** Vrai quand l'ordinateur est en sombre ; suit ses changements. */
function useDarkSystem(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia(darkQuery).matches)
  useEffect(() => {
    const media = window.matchMedia(darkQuery)
    const onChange = () => setDark(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])
  return dark
}

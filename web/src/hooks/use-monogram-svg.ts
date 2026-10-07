import { useQuery } from "@tanstack/react-query"

import { usePalette } from "@/components/theme/palette-context"
import { useBrand } from "@/hooks/use-brand-name"
import { brandFileFor } from "@/lib/admin-identity"
import { fetchSvgText, prepareAnimatedSvg } from "@/lib/monogram-motion"
import { presetOf } from "@/lib/palettes"

/**
 * Le monogramme de l'écran de connexion (version pour fond sombre, aux couleurs de la palette) et
 * sa version prête à animer (lib/monogram-motion.ts) : null pour un fichier non compatible ou sans
 * fichier. Lu par le monogramme animé et par les cases de ses animations (Paramètres).
 */
export function useMonogramSvg() {
  const brand = useBrand()
  const preset = presetOf(usePalette().palette)
  const url = brandFileFor(brand, "monogram", "dark", preset)
  const svg = useQuery({
    queryKey: ["monogram-motion", url],
    queryFn: async () => {
      const text = url ? await fetchSvgText(url) : null
      return text ? prepareAnimatedSvg(text) : null
    },
    enabled: url !== null,
    staleTime: Infinity,
  })
  return { url, svg }
}

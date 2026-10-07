import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { BrandLogo } from "@/components/brand-logo"
import { usePalette } from "@/components/theme/palette-context"
import { useBrand, useBrandName } from "@/hooks/use-brand-name"
import { brandFileFor } from "@/lib/admin-identity"
import {
  fetchSvgText,
  motionLoop,
  prepareAnimatedSvg,
  type MotionPhase,
} from "@/lib/monogram-motion"
import { presetOf } from "@/lib/palettes"

/**
 * Le monogramme de l'écran de connexion, sur l'image de droite (version pour fond sombre, aux
 * couleurs de la palette), animé en boucle : le tracé, la lueur de l'accent et la respiration,
 * séparés par des pauses de 4 secondes (lib/monogram-motion.ts, index.css). Un SVG compatible
 * est montré en ligne pour animer ses formes ; un autre fichier, ou le nom sans logo, respire
 * seulement. Immobile si l'ordinateur demande moins d'animations (index.css).
 */
export function AnimatedMonogram() {
  const brand = useBrand()
  const name = useBrandName()
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
  const loop = motionLoop(svg.data ?? null)
  const [step, setStep] = useState(0)
  const phase: MotionPhase = loop[step % loop.length].phase

  useEffect(() => {
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      loop[step % loop.length].ms
    )
    return () => window.clearTimeout(timer)
  }, [step, loop])

  // Le temps de lire le fichier : rien, plutôt que l'image puis sa version animée.
  if (url !== null && svg.isPending) return null
  return (
    <div data-monogram data-motion-phase={phase} className="h-32">
      {svg.data ? (
        <div
          role="img"
          aria-label={name}
          className="h-full"
          // Un SVG passé par cleanSvg (lib/media/svg.ts), comme à son envoi.
          dangerouslySetInnerHTML={{ __html: svg.data.markup }}
        />
      ) : (
        <BrandLogo kind="monogram" surface="dark" className="h-full" />
      )}
    </div>
  )
}

import { cn } from "cn"
import { useEffect, useMemo, useState } from "react"

import { BrandLogo } from "@/components/brand-logo"
import { useBrandName } from "@/hooks/use-brand-name"
import { useMonogramSvg } from "@/hooks/use-monogram-svg"
import {
  motionLoop,
  type Motion,
  type MotionPhase,
} from "@/lib/monogram-motion"

/**
 * Le monogramme de l'écran de connexion, sur l'image de droite (version pour fond sombre, aux
 * couleurs de la palette), animé en boucle : les animations cochées par un admin (`motions`,
 * Paramètres ; vide : immobile), séparées par des pauses de 4 secondes (lib/monogram-motion.ts,
 * index.css). Un SVG compatible est montré en ligne pour animer ses formes ; un autre fichier, ou
 * le nom sans logo, ne joue que les animations de tout le monogramme. Le reflet passe sur une
 * copie blanche posée par-dessus. Immobile si l'ordinateur demande moins d'animations (index.css).
 * `className` : sa hauteur.
 */
export function AnimatedMonogram({
  motions,
  className,
}: {
  motions: readonly Motion[]
  className: string
}) {
  const animated = motions.length > 0
  const name = useBrandName()
  const { url, svg } = useMonogramSvg()
  // Immobile : une seule étape, la pause, sans fin.
  const loop = useMemo(
    () =>
      animated
        ? motionLoop(svg.data ?? null, motions)
        : [{ phase: "rest" as const, ms: Infinity }],
    [animated, svg.data, motions]
  )
  const [step, setStep] = useState(0)
  const phase: MotionPhase = loop[step % loop.length].phase

  useEffect(() => {
    if (!animated) return
    const timer = window.setTimeout(
      () => setStep((current) => current + 1),
      loop[step % loop.length].ms
    )
    return () => window.clearTimeout(timer)
  }, [animated, step, loop])

  // Le temps de lire le fichier : rien, plutôt que l'image puis sa version animée.
  if (url !== null && svg.isPending) return null
  const mark = svg.data ? (
    <div
      role="img"
      aria-label={name}
      className="h-full"
      // Un SVG passé par cleanSvg (lib/media/svg.ts), comme à son envoi.
      dangerouslySetInnerHTML={{ __html: svg.data.markup }}
    />
  ) : (
    <BrandLogo kind="monogram" surface="dark" className="h-full" />
  )
  return (
    <div
      data-monogram
      data-motion-phase={phase}
      className={cn("relative", className)}
    >
      {mark}
      {phase === "shine" && (
        <div data-shine aria-hidden className="absolute inset-0">
          {mark}
        </div>
      )}
    </div>
  )
}

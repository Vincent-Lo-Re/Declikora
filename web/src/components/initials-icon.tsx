import { cn } from "cn"
import type { ComponentProps } from "react"

/**
 * Des initiales dessinées comme une icône Lucide : un cercle au trait d'un pixel et les lettres
 * au centre, en SVG (viewBox 24, couleur du texte). Il prend la taille des icônes voisines.
 */
export function InitialsIcon({
  letters,
  className,
  ...props
}: { letters: string } & ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      aria-hidden
      className={cn("lucide", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="11" vectorEffect="non-scaling-stroke" />
      <text
        x="12"
        y="12.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        stroke="none"
        // Unités du dessin (viewBox 24), comme le cercle : la taille suit celle de l'icône.
        fontSize={10}
        className="font-medium"
      >
        {letters}
      </text>
    </svg>
  )
}

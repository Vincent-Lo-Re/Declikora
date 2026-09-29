import { cn } from "cn"
import type { ComponentProps } from "react"

/**
 * Une lettre dessinée comme une icône Lucide : seule, sans cadre, en SVG (viewBox 24, couleur
 * du texte). Elle prend la taille des icônes voisines.
 */
export function InitialIcon({
  letter,
  className,
  ...props
}: { letter: string } & ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("lucide", className)}
      {...props}
    >
      <text
        x="12"
        y="12"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        stroke="none"
        // Unités du dessin (viewBox 24) : la taille suit celle des icônes voisines.
        fontSize={22}
        className="font-normal"
      >
        {letter}
      </text>
    </svg>
  )
}

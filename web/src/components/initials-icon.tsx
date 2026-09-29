import { cn } from "cn"
import type { ComponentProps } from "react"

/**
 * Des initiales dessinées comme une icône Lucide : les lettres seules, sans cadre, en SVG
 * (viewBox 24, couleur du texte). Elles prennent la taille des icônes voisines.
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
      // Deux lettres larges (« MW ») peuvent déborder un peu du carré : sans les couper.
      overflow="visible"
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
        fontSize={18}
        className="font-normal"
      >
        {letters}
      </text>
    </svg>
  )
}

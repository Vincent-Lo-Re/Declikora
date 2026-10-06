import type { ComponentProps } from "react"
import { cn } from "cn"

/**
 * Une liste (tableau, grille, état vide, chargement) dans une carte blanche, posée sur le panneau
 * gris des pages avec le menu (ADMIN § 7, « Des panneaux gris sur fond blanc »). Le titre de la
 * page, la recherche et les filtres restent au-dessus, sur le gris.
 */
export function ListCard({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="list-card"
      className={cn(
        "rounded-xl bg-card p-2 text-card-foreground ring-1 ring-foreground/10",
        className
      )}
      {...props}
    />
  )
}

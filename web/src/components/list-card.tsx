import type { LucideIcon } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "cn"

import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Une liste (tableau, grille, état vide, chargement) dans une carte blanche, posée sur le panneau
 * gris des pages avec le menu (ADMIN § 7, « Des panneaux gris sur fond blanc »). Le titre de la
 * page, la recherche et les filtres restent au-dessus, sur le gris.
 */
export function ListCard({ className, ...props }: ComponentProps<"div">) {
  // La `Card` de shadcn, serrée autour de la liste (comme les tableaux des exemples shadcn).
  return (
    <Card
      data-slot="list-card"
      className={cn("gap-0 p-2", className)}
      {...props}
    />
  )
}

/**
 * Une liste vide, ou sans rien qui réponde à la recherche ou aux filtres : l'`Empty` de shadcn
 * (icône, titre, précision), dans la même carte blanche qu'une liste.
 */
export function ListEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <Empty className="bg-card ring-1 ring-foreground/10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Une carte avec son titre et son icône : les colonnes de l'éditeur du Fil (onglet Article) et
 * la fiche d'un fichier (Médiathèque). C'est la `Card` de shadcn, en petit (`size="sm"`).
 */
export function PanelCard({
  id,
  icon: Icon,
  title,
  aside,
  children,
}: {
  id: string
  icon: LucideIcon
  title: string
  // À droite du titre, en petit (un nombre…).
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    // scroll-mt-48 : amenée sous les yeux (« Prêt à publier ? »), la carte ne passe pas sous ce qui
    // reste collé en haut de la colonne.
    <Card
      size="sm"
      role="region"
      aria-labelledby={id}
      data-slot="panel-card"
      className="scroll-mt-48"
    >
      <CardHeader>
        <CardTitle>
          <h3 id={id} className="flex items-center gap-1.5">
            <Icon aria-hidden className="size-4 text-muted-foreground" />
            {title}
          </h3>
        </CardTitle>
        {aside && (
          <CardAction className="text-xs text-muted-foreground tabular-nums">
            {aside}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

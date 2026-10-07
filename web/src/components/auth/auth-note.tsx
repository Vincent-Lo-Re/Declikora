import { cn } from "cn"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Link } from "react-router"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

/**
 * Le bas d'une étape de la connexion, comme celui de la carte « Account Access » de shadcn : une
 * ligne sur fond gris (Item muted), son icône, un titre et sa précision. Avec `to`, la ligne mène
 * à une page, une flèche à droite (« Se déconnecter », icône en rouge avec `danger`).
 */
export function AuthNote({
  icon: Icon,
  title,
  text,
  to,
  danger = false,
}: {
  icon: LucideIcon
  title: string
  text: string
  to?: string
  danger?: boolean
}) {
  return (
    <Item variant="muted" render={to ? <Link to={to} /> : undefined}>
      <ItemMedia variant="icon">
        <Icon aria-hidden className={cn(danger && "text-destructive")} />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{text}</ItemDescription>
      </ItemContent>
      {to && <ArrowRight aria-hidden className="size-4" />}
    </Item>
  )
}

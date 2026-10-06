import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { texts } from "@/texts"

/**
 * Titre de la page (et de l'onglet du navigateur), précédé de l'icône de sa section, avec sa
 * présentation et ses boutons.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <title>{`${title} — ${texts.app.name}`}</title>
        <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight">
          {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  )
}

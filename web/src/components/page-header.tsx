import type { ReactNode } from "react"

import { texts } from "@/texts"

/** Titre de la page (et de l'onglet du navigateur), avec sa présentation et ses boutons. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="space-y-1">
        <title>{`${title} — ${texts.app.name}`}</title>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  )
}

import { texts } from "@/texts"

/** Titre de la page (et de l'onglet du navigateur), avec sa présentation. */
export function PageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <header className="mb-8 space-y-1">
      <title>{`${title} — ${texts.app.name}`}</title>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
    </header>
  )
}

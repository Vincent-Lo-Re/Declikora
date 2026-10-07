import type { ReactNode } from "react"

/**
 * Une section de réglages (Paramètres), comme les pages de réglages des exemples de shadcn : à
 * gauche son titre et sa phrase, à droite sa carte ; dans un cadre étroit (tablette, téléphone),
 * le titre passe au-dessus. Le cadre est un conteneur (@container) : la mise en page suit sa
 * largeur, pas celle de la fenêtre.
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-4 @3xl:grid-cols-settings @3xl:gap-8">
      <div className="space-y-1">
        <h2 className="font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

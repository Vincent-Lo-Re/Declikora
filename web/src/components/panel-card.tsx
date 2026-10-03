import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Une carte avec son titre et son icône : les colonnes de l'éditeur du Fil (onglet Article) et
 * la fiche d'un fichier (Médiathèque).
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
    <section aria-labelledby={id} className="rounded-xl border p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <h3 id={id} className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon aria-hidden className="size-4 text-muted-foreground" />
          {title}
        </h3>
        {aside && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

import type { ReactNode } from "react"

import { useSlideActive } from "@/components/auth/slide-active"
import { useBrandName } from "@/hooks/use-brand-name"
import { tabTitle } from "@/lib/admin-identity"

/**
 * Le haut des pages de connexion (modèle « login-04 » de shadcn) : le titre et sa
 * précision, centrés, puis le formulaire ; avec le titre de l'onglet.
 */
export function AuthForm({
  title,
  description,
  media,
  children,
}: {
  title: string
  description?: ReactNode
  /** Au-dessus du titre (le QR code de la double vérification). */
  media?: ReactNode
  children: ReactNode
}) {
  const brand = useBrandName()
  // Parmi les étapes qui glissent (AuthSlides), seule celle affichée nomme l'onglet.
  const active = useSlideActive()
  return (
    <div className="flex flex-col gap-6">
      {active && <title>{tabTitle(title, brand)}</title>}
      {media}
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-balance text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

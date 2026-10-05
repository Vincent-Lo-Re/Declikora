import { useEffect, useState } from "react"
import { useNavigation } from "react-router"

import { BAR_DELAY_MS } from "@/lib/preparation"
import { texts } from "@/texts"

/**
 * Une fine barre en haut pendant que la page suivante se prépare (lib/preparation.ts), après un
 * instant : une page déjà prête s'ouvre sans clignoter. La page actuelle reste nette dessous.
 */
export function NavigationBar() {
  const navigation = useNavigation()
  const pending = navigation.location?.key ?? null
  // La navigation pour laquelle le délai est passé.
  const [shownFor, setShownFor] = useState<string | null>(null)
  useEffect(() => {
    if (pending === null) return
    const timer = window.setTimeout(() => setShownFor(pending), BAR_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [pending])
  if (pending === null || shownFor !== pending) return null
  return (
    <div
      data-navigation-bar
      role="progressbar"
      aria-label={texts.nav.pageLoading}
      className="fixed inset-x-0 top-0 z-popup h-0.5 overflow-hidden"
    />
  )
}

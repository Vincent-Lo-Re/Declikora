import { useEffect, useLayoutEffect } from "react"
import { useLocation } from "react-router"

import { getPreparation, INTENT_DELAY_MS, type Member } from "@/lib/preparation"

/** Le lien sous la souris ou le focus, s'il mène à une page de l'admin. */
function internalLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link =
    target instanceof Element
      ? target.closest<HTMLAnchorElement>("a[href]")
      : null
  if (!link || link.origin !== window.location.origin) return null
  if (link.target || link.hasAttribute("download")) return null
  return link
}

/**
 * Le membre connecté prépare les pages : son arrivée télécharge le code de l'éditeur, et un lien
 * survolé (un instant) ou atteint au clavier est lu à l'avance (menu, lignes des listes, liens de
 * l'Accueil…).
 */
export function usePreparedMember(member: Member) {
  const { id, role } = member
  useEffect(() => {
    const preparation = getPreparation()
    if (!preparation) return
    const cancelWarmUp = preparation.setMember({ id, role })
    let timer = 0
    const onOver = (event: PointerEvent) => {
      const link = internalLink(event.target)
      if (!link) return
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => preparation.ahead(link.href),
        INTENT_DELAY_MS
      )
    }
    const onOut = (event: PointerEvent) => {
      const link = internalLink(event.target)
      if (link && !link.contains(event.relatedTarget as Node | null)) {
        window.clearTimeout(timer)
      }
    }
    const onFocus = (event: FocusEvent) => {
      const link = internalLink(event.target)
      if (link) preparation.ahead(link.href)
    }
    document.addEventListener("pointerover", onOver)
    document.addEventListener("pointerout", onOut)
    document.addEventListener("focusin", onFocus)
    return () => {
      cancelWarmUp()
      window.clearTimeout(timer)
      document.removeEventListener("pointerover", onOver)
      document.removeEventListener("pointerout", onOut)
      document.removeEventListener("focusin", onFocus)
      preparation.setMember(null)
    }
  }, [id, role])
}

/** Chaque page montrée le dit à la préparation (contrôle des lectures non préparées). */
export function useShownPages() {
  const { pathname } = useLocation()
  // Avant les effets de la page : ses lectures en arrivant sont toutes vues par le contrôle.
  useLayoutEffect(() => getPreparation()?.shown(pathname), [pathname])
}

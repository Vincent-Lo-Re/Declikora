import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react"
import { useLocation, useNavigationType } from "react-router"

import {
  isReturn,
  lightRowSoon,
  rememberScroll,
  rememberSearch,
  scrollOf,
  scrollWindowBackTo,
  takeOpened,
} from "@/lib/scroll-memory"

/**
 * La place de chaque page (lib/scroll-memory.ts) : relevée en défilant, retrouvée en revenant sur
 * ses pas (avec la ligne du contenu qu'on venait d'ouvrir, allumée un instant), et en haut pour
 * une page ouverte en avançant. Changer un réglage dans l'adresse (même page) ne bouge rien.
 */
export function useScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()
  // La page affichée : la position relevée en défilant est la sienne (mise à jour dès l'arrivée,
  // avant que le navigateur ne replace la fenêtre).
  const shown = useRef(location.pathname)

  useEffect(() => {
    // Le navigateur ne replace plus la page lui-même : c'est fait ici.
    const before = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    const save = () => rememberScroll(shown.current, window.scrollY)
    window.addEventListener("scroll", save, { passive: true })
    return () => {
      window.removeEventListener("scroll", save)
      window.history.scrollRestoration = before
    }
  }, [])

  // Les réglages de la page, gardés pour un lien de retour (« ← Le Fil » d'un éditeur).
  useEffect(() => {
    rememberSearch(location.pathname, location.search)
  }, [location.pathname, location.search])

  const arrive = useEffectEvent(() => {
    shown.current = location.pathname
    const back = isReturn(location.state, navigationType)
    if (back) scrollWindowBackTo(scrollOf(location.pathname))
    else window.scrollTo(0, 0)
    const opened = takeOpened()
    if (back && opened) lightRowSoon(opened)
  })
  useLayoutEffect(() => arrive(), [location.pathname])
}

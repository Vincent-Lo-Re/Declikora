import { useState } from "react"

import { opensOnItsOwn, type LockSituation } from "@/lib/editor/lock-view"

/**
 * La fenêtre du cadenas (éditeur du Fil) : ouverte d'elle-même une seule fois par perte de main,
 * puis à la demande (le cadenas). Elle reste ouverte si la situation change pendant qu'on la lit
 * (la personne qui avait la main quitte l'éditeur…), et se ferme dès qu'on écrit de nouveau.
 */
export function useLockDialog(situation: LockSituation | null) {
  const [open, setOpen] = useState(false)
  // Cette perte de main a déjà ouvert la fenêtre : la refermer ne la rouvre pas.
  const [shown, setShown] = useState(false)

  // Ajusté pendant le rendu (et non dans un effet) : la fenêtre s'ouvre avec la lecture seule.
  if (situation !== null && opensOnItsOwn(situation) && !shown) {
    setShown(true)
    setOpen(true)
  }
  // De nouveau la main (ou en train de la prendre) : la prochaine perte se montrera.
  if (situation === null && (shown || open)) {
    setShown(false)
    setOpen(false)
  }

  return { open: open && situation !== null, setOpen }
}

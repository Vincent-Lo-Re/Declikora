/**
 * Éditeur du Fil : ce que disent le cadenas et sa fenêtre quand on ne tient pas la main
 * (docs/ADMINISTRATION.md, § 4, « Un seul membre à la fois sur un brouillon »). Sans React.
 */

import type { LockState } from "@/lib/editor/edit-lock"

export type LockSituation =
  // Quelqu'un d'autre a pris la main pendant qu'on écrivait (son nom, s'il est connu).
  | "lost"
  // On a pris la main dans un autre onglet.
  | "lostSelf"
  // Quelqu'un d'autre écrivait déjà à l'ouverture.
  | "readOnly"
  // On écrit déjà dans un autre onglet.
  | "readOnlySelf"
  // Personne n'écrit : on peut prendre la main.
  | "free"
  // Onglet caché plus de 30 minutes : le brouillon a été libéré.
  | "released"

/**
 * La lecture seule du moment, ou `null` quand on écrit, pendant une prise de main, et sur une
 * erreur (celle-ci reste un bandeau).
 */
export function lockSituation(
  lock: LockState,
  holderIsMe: boolean
): LockSituation | null {
  switch (lock.phase) {
    case "readonly":
      if (holderIsMe) return lock.lost ? "lostSelf" : "readOnlySelf"
      return lock.lost ? "lost" : "readOnly"
    case "free":
      return "free"
    case "released":
      return "released"
    default:
      return null
  }
}

/**
 * La fenêtre s'ouvre d'elle-même quand on vient de perdre la main ; pas à l'ouverture d'un
 * brouillon que quelqu'un écrit déjà (rien n'a changé sous nos yeux) : le cadenas suffit.
 */
export function opensOnItsOwn(situation: LockSituation): boolean {
  return situation === "lost" || situation === "lostSelf"
}

/** Quelqu'un écrit : prendre la main la lui retire (lock_take forcé). */
export function takeIsForced(situation: LockSituation): boolean {
  return situation !== "free" && situation !== "released"
}

/**
 * Le bouton principal est « Rester en lecture seule » quand c'est quelqu'un d'autre qui écrit :
 * on évite de se renvoyer la main sans y penser. Sinon, c'est « (Re)prendre la main ».
 */
export function staysByDefault(situation: LockSituation): boolean {
  return situation === "lost" || situation === "readOnly"
}

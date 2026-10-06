import { createContext, useContext } from "react"

import type { Draft } from "@/blocks/types"
import type { PartLock } from "@/components/editor/use-part-draft"
import type { AccessLevel } from "@/lib/access-levels"
import type { ElementContext } from "@/lib/contents/methods"
import type {
  LiveOutline,
  MethodTree,
  PreviewRow,
} from "@/lib/contents/outline"
import type { ElementFlags, MethodPart } from "@/lib/contents/method-page"
import type { ScheduleState } from "@/lib/contents/publication"
import type { AutosaveState } from "@/lib/editor/autosave"
import type { PreviewSettings } from "@/lib/editor/preview"

/**
 * Les places de la page où la partie en cours montre ce qui la concerne (portails) : la barre de
 * mise en forme, sa colonne de droite (options, réglages du bloc choisi), ses blocs sous sa ligne
 * du plan, et les Blocs ; la fiche y met aussi la publication (bas de la colonne de droite) et
 * le bandeau de la programmation (au-dessus du téléphone).
 */
export type MethodPageSlots = {
  toolbar: HTMLElement | null
  right: HTMLElement | null
  footer: HTMLElement | null
  planBlocks: HTMLElement | null
  library: HTMLElement | null
  notices: HTMLElement | null
}

/** Ce qu'une partie dit d'elle-même à la page (enregistrement, texte à copier, ses cases). */
export type PartReport = {
  save: AutosaveState
  canCopy: boolean
  // Un chapitre, une leçon ou un exercice : son titre et ses cases, tels qu'ils sont à l'écran.
  title: string
  flags?: ElementFlags
}

/** Ce que la page peut demander à une partie. */
export type PartHandle = {
  // Enregistre tout de suite ce qui attend ; vrai si tout est enregistré.
  flush: () => Promise<boolean>
  // Après une perte de main : ce qui n'était pas enregistré (sinon null).
  unsavedDraft: () => Draft | null
  reload: () => void
  dismissStash: () => void
  // Un chapitre, une leçon ou un exercice : « Montrer dans l'app », « Leçon gratuite » (plan).
  setFlags?: (flags: { inApp?: boolean; isFree?: boolean }) => void
  // Le curseur dans son titre (une partie qu'on vient d'ajouter).
  focusTitle: () => void
}

export type MethodPageValue = {
  methodId: string
  // L'ouverture de la page qui tient le verrou de la méthode (save_draft de chaque partie).
  session: string
  // Le verrou de la méthode, vu par chaque partie (serverRev : la sienne, par partRev).
  lock: Omit<PartLock, "serverRev">
  // La révision d'une partie dans la base d'après les autres (null : rien à suivre).
  partRev: (id: string) => number | null
  // Change à chaque « Prendre la main » ou « Reprendre la main ».
  resumeSignal: number
  // « Reprendre la main » sur toute la méthode (force : même si quelqu'un l'écrit).
  take: (force: boolean) => void
  // Enregistre tout de suite ce qui attend dans chaque partie ; vrai si tout est enregistré.
  flushAll: () => Promise<boolean>
  // Une partie a une modification pas encore enregistrée.
  anyUnsaved: boolean
  reading: boolean
  preview: PreviewSettings
  // La partie en cours (plan, colonne de droite, Lecture) ; la fiche : l'id de la méthode.
  currentId: string
  setCurrent: (id: string) => void
  // Les parties, et l'arbre avec les cases telles qu'elles sont à l'écran (withFlags).
  parts: readonly MethodPart[]
  tree: MethodTree | undefined
  live: LiveOutline | null
  liveSet: ReadonlySet<string>
  // Ce qui changera dans l'app (publish_preview, undefined tant qu'il n'est pas lu).
  changes: PreviewRow[] | undefined
  changesById: ReadonlyMap<string, PreviewRow> | undefined
  // La fiche telle qu'elle est à l'écran (son titre, son niveau d'accès), pour ses éléments.
  method: Omit<ElementContext["method"], "deleted">
  reportFiche: (fiche: Omit<ElementContext["method"], "id" | "deleted">) => void
  // La programmation de la méthode ([D31]).
  schedule: ScheduleState
  // Après l'enregistrement d'une partie : le plan, ce qui changera dans l'app, les modèles et les
  // fichiers utilisés sont relus.
  afterPartSave: () => void
  levels: {
    data: AccessLevel[] | undefined
    failed: boolean
    retry: () => void
  }
  slots: MethodPageSlots
  register: (id: string, handle: PartHandle) => () => void
  report: (id: string, report: PartReport) => void
  announce: (message: string) => void
  // Les Blocs (glissière par-dessus le plan) : ils ajoutent à la partie en cours.
  libraryOpen: boolean
  openLibrary: (box?: string | null) => void
  closeLibrary: () => void
  savedOpen: boolean
  setSavedOpen: (open: boolean) => void
  // En Lecture, « Ajouter un bloc » repasse en Édition.
  toEdit: () => void
  // Ajoute un chapitre (parent : la méthode), une leçon (un chapitre) ou un exercice (une leçon),
  // vide ou depuis un point de départ ([D42]) : il apparaît à sa place, le curseur dans son titre.
  createPart: (
    kind: "chapter" | "lesson" | "exercise",
    parentId: string,
    starterId: string | null
  ) => void
  creating: boolean
  // L'historique ouvert, pour cette partie (null : fermé).
  historyFor: string | null
  setHistoryFor: (id: string | null) => void
}

export const MethodPageContext = createContext<MethodPageValue | null>(null)

export function useMethodPage(): MethodPageValue {
  const value = useContext(MethodPageContext)
  if (!value) throw new Error("useMethodPage : hors de la page d'une méthode")
  return value
}

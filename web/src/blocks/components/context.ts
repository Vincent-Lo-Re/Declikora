import type { Editor } from "@tiptap/react"
import { createContext, useContext } from "react"

import type { Block } from "@/blocks/types"
import type { Media } from "@/lib/media/constants"

/** Ce qu'un bloc sait de son image : le fichier, son adresse d'aperçu, son état. */
export type BlockMedia =
  | { state: "none" }
  | { state: "loading" }
  | { state: "missing" }
  // La lecture des fichiers a échoué (réseau) : ce n'est pas un fichier supprimé.
  | { state: "error"; retry: () => void }
  | { state: "not_ready"; media: Media }
  | { state: "ready"; media: Media; url: string | undefined }

/**
 * Ce que l'éditeur sait du modèle d'un bloc lié (bloc identique partout) : son nom et son bloc,
 * que l'aperçu montre tel quel ; missing : il n'existe plus, est dans la corbeille ou n'est pas
 * un bloc identique partout.
 */
export type LinkedTemplateState =
  | { state: "loading" }
  | { state: "error"; retry: () => void }
  | { state: "missing" }
  | { state: "empty"; name: string }
  | { state: "ready"; name: string; block: Block }

/** Le nom du modèle d'un bloc lié, s'il est connu. */
export function templateNameOf(state: LinkedTemplateState): string | null {
  return state.state === "ready" || state.state === "empty" ? state.name : null
}

/**
 * Ce que l'éditeur donne aux blocs de l'aperçu. Les fonctions restent les mêmes d'un rendu à
 * l'autre : taper dans un bloc ne redessine pas les autres.
 */
export type BlocksEditorValue = {
  editable: boolean
  selectedId: string | null
  selectBlock: (id: string) => void
  updateBlock: <T extends Block>(id: string, update: (block: T) => T) => void
  // Le texte qui a eu le curseur en dernier (et son bloc) : la barre de mise en forme agit sur
  // lui tant que son bloc est le bloc choisi.
  // active faux : ce texte disparaît (bloc supprimé, déplacé ou aperçu rechargé).
  setActiveText: (blockId: string, editor: Editor, active: boolean) => void
  mediaFor: (mediaId: string | null) => BlockMedia
  openPicker: (blockId: string) => void
  addToBox: (boxId: string, type: "text" | "image") => void
  // Blocs liés : le modèle cité, et « Détacher » (copie ordinaire, à la même place).
  templateFor: (templateId: string) => LinkedTemplateState
  detachBlock: (blockId: string) => void
  // Éditeur du Fil : pas de poignée dans l'aperçu, c'est le plan (toujours ouvert) qui range les
  // blocs (ADMIN § 4).
  withoutHandles?: boolean
  // Éditeur du Fil : un bloc partagé sans barre au-dessus de lui dans l'aperçu (son nom est dans
  // le plan ; « Modifier le modèle » et « Détacher », dans « Bloc choisi »).
  linkedWithoutBar?: boolean
  // Éditeur du Fil : « Ajouter dans la section » ouvre l'onglet Blocs pour cette section (ailleurs,
  // un menu Texte, Image).
  onAddInBox?: (boxId: string) => void
}

export const BlocksEditorContext = createContext<BlocksEditorValue | null>(null)

export function useBlocksEditor(): BlocksEditorValue {
  const value = useContext(BlocksEditorContext)
  if (!value) {
    throw new Error("useBlocksEditor doit être utilisé dans l'éditeur de blocs")
  }
  return value
}

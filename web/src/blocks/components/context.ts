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
 * Ce que l'éditeur donne aux blocs de l'aperçu. Les fonctions restent les mêmes d'un rendu à
 * l'autre : taper dans un bloc ne redessine pas les autres.
 */
export type BlocksEditorValue = {
  editable: boolean
  selectedId: string | null
  selectBlock: (id: string) => void
  updateBlock: <T extends Block>(id: string, update: (block: T) => T) => void
  // Le texte qui a eu le curseur en dernier : la barre de mise en forme agit sur lui.
  // active faux : ce texte disparaît (bloc supprimé, déplacé ou aperçu rechargé).
  setActiveText: (editor: Editor, active: boolean) => void
  mediaFor: (mediaId: string | null) => BlockMedia
  openPicker: (blockId: string) => void
  addToBox: (boxId: string, type: "text" | "image") => void
}

export const BlocksEditorContext = createContext<BlocksEditorValue | null>(null)

export function useBlocksEditor(): BlocksEditorValue {
  const value = useContext(BlocksEditorContext)
  if (!value) {
    throw new Error("useBlocksEditor doit être utilisé dans l'éditeur de blocs")
  }
  return value
}

/**
 * « / » au début d'un texte vide (éditeur du Fil, docs/ADMINISTRATION.md, § 4) : la liste des
 * blocs, et le texte vide remplacé par le bloc choisi. Sans React.
 */

import { findBlock, insertBlock, removeBlock } from "@/blocks/draft"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import { ROOT, type Block, type Draft } from "@/blocks/types"

// « Mes blocs » ouvre le panneau de la colonne de gauche.
export type SlashChoice = "text" | "image" | "box" | "mine"

/** Ce que propose « / » : pas d'encadré ni de bloc enregistré dans un encadré. */
export function slashChoices(draft: Draft, blockId: string): SlashChoice[] {
  return findBlock(draft, blockId)?.container === ROOT
    ? ["text", "image", "box", "mine"]
    : ["text", "image"]
}

/** Remplace un bloc par un autre, à la même place. `null` si ce n'est pas possible. */
export function replaceBlock(
  draft: Draft,
  id: string,
  block: Block
): Draft | null {
  const place = findBlock(draft, id)
  if (!place) return null
  return insertBlock(
    removeBlock(draft, id),
    block,
    place.container,
    place.index
  )
}

/** Un texte sans rien d'écrit (le texte où l'on a tapé « / », une fois vidé). */
export function isEmptyText(draft: Draft, id: string): boolean {
  const block = findBlock(draft, id)?.block
  return block?.type === "text" && textDocToPlainText(block.doc).trim() === ""
}

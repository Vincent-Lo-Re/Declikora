/**
 * Éditeur du Fil (docs/ADMINISTRATION.md, § 4) : ajouter un bloc ouvre les Blocs. Ils ajoutent
 * sous le bloc choisi, ou, après « Ajouter dans la section », à la fin de cette section. Sans React.
 */

import { findBlock } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"

/**
 * La section où les Blocs ajouteront, encore valable : elle existe et c'est toujours le bloc
 * choisi. Sinon null (les Blocs ajoutent alors sous le bloc choisi).
 */
export function liveBoxTarget(
  draft: Draft,
  boxId: string | null,
  selectedId: string | null
): string | null {
  if (!boxId || boxId !== selectedId) return null
  return findBlock(draft, boxId)?.block.type === "box" ? boxId : null
}

// Modèles de blocs dans un brouillon, sans React (docs/ARCHITECTURE-CONTENUS.md, § 2.5, § 3.5) :
// insérer un modèle (mise en forme → copie avec de nouveaux id ; bloc identique partout → bloc
// lié), détacher un bloc lié (copie ordinaire : même id au premier niveau, nouveaux id à
// l'intérieur), et la règle « un seul bloc » d'un bloc identique partout ([D11]).
// Toujours sans modifier l'original.

import { findBlock, newId } from "@/blocks/draft"
import {
  ROOT,
  type Block,
  type BoxChild,
  type Draft,
  type LinkedBlock,
} from "@/blocks/types"

/** Un bloc identique partout contient au plus un bloc au premier niveau ([D11]). */
export const SHARED_ROOT_LIMIT = 1

/** Une copie du bloc avec de nouveaux identifiants (encadré compris). */
export function copyWithNewIds(block: Block): Block {
  if (block.type === "box") {
    return {
      ...block,
      id: newId(),
      blocks: block.blocks.map((child) => ({ ...child, id: newId() })),
    }
  }
  return { ...block, id: newId() }
}

/**
 * La copie ordinaire du bloc d'un modèle qui remplace un bloc lié (« Détacher ») : l'id du bloc
 * lié au premier niveau (le bloc garde sa place, sa sélection et son nom dans le plan), de
 * nouveaux id à l'intérieur d'un encadré. Elle ne suit plus le modèle.
 */
export function detachedCopy(templateBlock: Block, linkedId: string): Block {
  if (templateBlock.type === "box") {
    return {
      ...templateBlock,
      id: linkedId,
      blocks: templateBlock.blocks.map((child): BoxChild => ({
        ...child,
        id: newId(),
      })),
    }
  }
  return { ...templateBlock, id: linkedId }
}

/** Remplace le bloc lié linkedId par une copie ordinaire du bloc de son modèle. */
export function detachLinked(
  draft: Draft,
  linkedId: string,
  templateBlock: Block
): Draft {
  return {
    ...draft,
    blocks: draft.blocks.map((block) =>
      block.id === linkedId && block.type === "linked"
        ? detachedCopy(templateBlock, linkedId)
        : block
    ),
  }
}

/** Un bloc lié à un modèle « bloc identique partout ». */
export function linkedBlock(templateId: string, id = newId()): LinkedBlock {
  return { id, type: "linked", templateId }
}

/** Le bloc unique d'un modèle (null s'il n'en a pas exactement un). */
export function singleBlock(template: Pick<Draft, "blocks">): Block | null {
  return template.blocks.length === 1 ? template.blocks[0] : null
}

/** Les modèles cités par les blocs liés d'un brouillon, sans doublon, triés. */
export function linkedTemplateIds(draft: Draft): string[] {
  return [
    ...new Set(
      draft.blocks.flatMap((block) =>
        block.type === "linked" ? [block.templateId] : []
      )
    ),
  ].sort()
}

/**
 * Où insérer un modèle : toujours au premier niveau (un bloc lié ou un encadré ne va pas dans un
 * encadré), juste après le bloc choisi, ou après l'encadré qui le contient ; sinon à la fin.
 */
export function rootInsertIndex(
  draft: Draft,
  selectedId: string | null
): number {
  const place = selectedId ? findBlock(draft, selectedId) : null
  if (!place) return draft.blocks.length
  if (place.container === ROOT) return place.index + 1
  return (findBlock(draft, place.container)?.index ?? draft.blocks.length) + 1
}

/** Ce qu'un modèle peut devenir dans un contenu. */
type TemplateToInsert = {
  id: string
  sort: "style" | "shared" | "starter"
  draft: Pick<Draft, "blocks">
}

/**
 * Peut-on insérer ce modèle ? Une mise en forme vide n'apporte rien ; un bloc identique partout
 * doit avoir son bloc ([D11] : il naît vide) ; un point de départ ne s'insère pas, il sert à
 * créer un contenu.
 */
export function templateInsertable(
  template: TemplateToInsert
): "ok" | "empty" | "starter" {
  if (template.sort === "starter") return "starter"
  if (template.sort === "shared") {
    return singleBlock(template.draft) ? "ok" : "empty"
  }
  return template.draft.blocks.length > 0 ? "ok" : "empty"
}

/**
 * Insère un modèle au premier niveau : une mise en forme devient une copie de ses blocs avec de
 * nouveaux identifiants (modifier le modèle ne la changera plus) ; un bloc identique partout
 * devient un bloc lié (il suit le modèle). Renvoie le nouveau brouillon et le premier bloc
 * inséré, ou null si le modèle ne s'insère pas.
 */
export function insertTemplate(
  draft: Draft,
  template: TemplateToInsert,
  selectedId: string | null,
  // Une place au premier niveau (bloc glissé dans l'aperçu), au lieu de « après le bloc choisi ».
  at?: number
): { draft: Draft; firstId: string } | null {
  if (templateInsertable(template) !== "ok") return null
  const inserted =
    template.sort === "shared"
      ? [linkedBlock(template.id)]
      : template.draft.blocks.map(copyWithNewIds)
  const index = at ?? rootInsertIndex(draft, selectedId)
  const blocks = [...draft.blocks]
  blocks.splice(index, 0, ...inserted)
  return { draft: { ...draft, blocks }, firstId: inserted[0].id }
}

/**
 * Peut-on ajouter un bloc au premier niveau ? Toujours, sauf dans un bloc identique partout qui
 * a déjà son bloc ([D11]).
 */
export function canAddRootBlock(
  draft: Draft,
  sort: "style" | "shared" | "starter" | null
): boolean {
  return sort !== "shared" || draft.blocks.length < SHARED_ROOT_LIMIT
}

/**
 * Les blocs de premier niveau choisis pour « Enregistrer comme modèle », dans l'ordre du
 * brouillon (ceux qui n'y sont plus sont oubliés).
 */
export function selectedRootIds(draft: Draft, chosen: Set<string>): string[] {
  return draft.blocks
    .filter((block) => chosen.has(block.id))
    .map((block) => block.id)
}

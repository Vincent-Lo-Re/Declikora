// Opérations sur un brouillon, sans React : créer, trouver, modifier, déplacer, supprimer un
// bloc, et préparer le brouillon avant l'enregistrement. Toujours sans modifier l'original.

import { validateDraft } from "@/blocks/generated/validators"
import { cleanTextDoc, textDocToPlainText } from "@/blocks/text/clean-text-doc"
import {
  ROOT,
  type Block,
  type BlockType,
  type BoxBlock,
  type BoxChild,
  type ContainerId,
  type Doc,
  type Draft,
  type ImageBlock,
  type TextBlock,
} from "@/blocks/types"

// Taille d'un brouillon : la base refuse au-delà de 262 144 octets mesurés sur jsonb::text,
// environ 8 % de plus que JSON.stringify. L'admin s'arrête donc à 240 000 octets compacts, et
// prévient à partir de 200 000.
export const DRAFT_MAX_BYTES = 240_000
export const DRAFT_WARN_BYTES = 200_000

export const TITLE_MAX = 200
// Résumé d'un article ou d'un épisode (texte simple, facultatif) : même limite que le schéma.
export const SUMMARY_MAX = 1000
// Le résumé d'un article ne sert qu'à sa carte dans la liste du Fil (ADMIN § 4) : l'admin
// s'arrête à 200 caractères ; le schéma garde 1 000 (la règle des blocs ne fait que s'élargir).
export const FEED_SUMMARY_MAX = 200
// La longueur idéale de ce résumé (la glissière de l'onglet Article).
export const FEED_SUMMARY_IDEAL = { min: 120, max: 160 } as const

/** Où en est le résumé d'un article : vide, trop court, idéal ou trop long. */
export function summaryFit(
  length: number
): "empty" | "short" | "ideal" | "long" {
  if (length === 0) return "empty"
  if (length < FEED_SUMMARY_IDEAL.min) return "short"
  return length <= FEED_SUMMARY_IDEAL.max ? "ideal" : "long"
}
// Vitesse de lecture retenue pour « Environ n min de lecture » (mots par minute).
const WORDS_PER_MINUTE = 200
export const ALT_MAX = 1000

export function newId(): string {
  return crypto.randomUUID()
}

const emptyTextDoc = (): Doc => ({
  type: "doc",
  content: [{ type: "paragraph" }],
})

export function createBlock(type: "text"): TextBlock
export function createBlock(type: "image"): ImageBlock
export function createBlock(type: "box"): BoxBlock
export function createBlock(type: "text" | "image" | "box"): Block
export function createBlock(type: "text" | "image" | "box"): Block {
  switch (type) {
    case "text":
      return { id: newId(), type: "text", doc: emptyTextDoc() }
    case "image":
      return {
        id: newId(),
        type: "image",
        mediaId: null,
        caption: null,
        alt: null,
      }
    case "box":
      return { id: newId(), type: "box", look: "fill", blocks: [] }
  }
}

/** Seuls un Texte et une Image vont dans un encadré (pas d'encadré, pas de bloc lié). */
export function canDropInto(type: BlockType, container: ContainerId): boolean {
  return container === ROOT || type === "text" || type === "image"
}

export type BlockPlace = {
  block: Block
  container: ContainerId
  index: number
  // Nombre de blocs dans le même conteneur.
  siblings: number
}

/** Où est un bloc (premier niveau ou dans un encadré). */
export function findBlock(draft: Draft, id: string): BlockPlace | null {
  for (const [index, block] of draft.blocks.entries()) {
    if (block.id === id) {
      return { block, container: ROOT, index, siblings: draft.blocks.length }
    }
    if (block.type === "box") {
      const childIndex = block.blocks.findIndex((child) => child.id === id)
      if (childIndex !== -1) {
        return {
          block: block.blocks[childIndex],
          container: block.id,
          index: childIndex,
          siblings: block.blocks.length,
        }
      }
    }
  }
  return null
}

/** Les blocs d'un conteneur (la page, ou un encadré). */
export function blocksOf(draft: Draft, container: ContainerId): Block[] {
  if (container === ROOT) return draft.blocks
  const box = draft.blocks.find(
    (block): block is BoxBlock => block.type === "box" && block.id === container
  )
  return box ? box.blocks : []
}

function withBlocks(
  draft: Draft,
  container: ContainerId,
  blocks: Block[]
): Draft {
  if (container === ROOT) return { ...draft, blocks }
  return {
    ...draft,
    blocks: draft.blocks.map((block) =>
      block.type === "box" && block.id === container
        ? { ...block, blocks: blocks as BoxChild[] }
        : block
    ),
  }
}

/** Remplace un bloc (où qu'il soit) par le résultat de update. */
export function updateBlock<T extends Block>(
  draft: Draft,
  id: string,
  update: (block: T) => T
): Draft {
  const place = findBlock(draft, id)
  if (!place) return draft
  const blocks = blocksOf(draft, place.container).map((block) =>
    block.id === id ? update(block as T) : block
  )
  return withBlocks(draft, place.container, blocks)
}

export function removeBlock(draft: Draft, id: string): Draft {
  const place = findBlock(draft, id)
  if (!place) return draft
  const blocks = blocksOf(draft, place.container).filter(
    (block) => block.id !== id
  )
  return withBlocks(draft, place.container, blocks)
}

/** Insère un bloc à une place donnée ; refuse (renvoie null) un encadré dans un encadré. */
export function insertBlock(
  draft: Draft,
  block: Block,
  container: ContainerId,
  index: number
): Draft | null {
  if (!canDropInto(block.type, container)) return null
  if (
    container !== ROOT &&
    !draft.blocks.some((item) => item.type === "box" && item.id === container)
  ) {
    return null
  }
  const blocks = [...blocksOf(draft, container)]
  blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, block)
  return withBlocks(draft, container, blocks)
}

/** Où ajouter un nouveau bloc : après le bloc choisi (en restant permis), sinon à la fin. */
export function insertionPoint(
  draft: Draft,
  type: BlockType,
  selectedId: string | null
): { container: ContainerId; index: number } {
  const place = selectedId ? findBlock(draft, selectedId) : null
  if (!place) return { container: ROOT, index: draft.blocks.length }
  if (canDropInto(type, place.container)) {
    return { container: place.container, index: place.index + 1 }
  }
  // Un encadré choisi dans un encadré : le nouveau bloc va après cet encadré.
  const box = findBlock(draft, place.container)
  return { container: ROOT, index: (box?.index ?? draft.blocks.length) + 1 }
}

/** Déplace un bloc vers une place donnée (même conteneur ou un autre). */
export function moveBlock(
  draft: Draft,
  id: string,
  container: ContainerId,
  index: number
): Draft | null {
  const place = findBlock(draft, id)
  if (!place || !canDropInto(place.block.type, container)) return null
  if (container !== ROOT && place.block.id === container) return null
  const without = removeBlock(draft, id)
  let target = index
  // Dans le même conteneur, retirer le bloc décale ceux qui le suivent.
  if (place.container === container && index > place.index) target -= 1
  return insertBlock(without, place.block, container, target)
}

/**
 * Monte (-1) ou descend (+1) un bloc dans son conteneur. Le premier bloc d'une section qu'on
 * monte (le dernier qu'on descend) en sort : il se place juste au-dessus (au-dessous) d'elle,
 * sauf si la page a déjà rootLimit blocs (un bloc partagé n'en a qu'un, [D11]). null : rien à
 * faire.
 */
export function shiftBlock(
  draft: Draft,
  id: string,
  offset: -1 | 1,
  rootLimit = Number.POSITIVE_INFINITY
): Draft | null {
  const place = findBlock(draft, id)
  if (!place) return null
  const target = place.index + offset
  if (target < 0 || target >= place.siblings) {
    if (place.container === ROOT || draft.blocks.length >= rootLimit) {
      return null
    }
    const box = findBlock(draft, place.container)
    if (!box) return null
    return moveBlock(draft, id, ROOT, box.index + (offset === 1 ? 1 : 0))
  }
  const blocks = [...blocksOf(draft, place.container)]
  blocks.splice(place.index, 1)
  blocks.splice(target, 0, place.block)
  return withBlocks(draft, place.container, blocks)
}

/** Vrai si « Monter » (-1) ou « Descendre » (+1) déplace ce bloc (shiftBlock). */
export function canShift(
  draft: Draft,
  id: string,
  offset: -1 | 1,
  rootLimit = Number.POSITIVE_INFINITY
): boolean {
  return shiftBlock(draft, id, offset, rootLimit) !== null
}

/** Vrai si « Monter » (-1) ou « Descendre » (+1) fait sortir ce bloc de sa section. */
export function shiftLeavesBox(place: BlockPlace, offset: -1 | 1): boolean {
  const target = place.index + offset
  return place.container !== ROOT && (target < 0 || target >= place.siblings)
}

/** Tous les blocs, dans l'ordre de lecture (encadrés, puis leur contenu). */
export function flattenBlocks(
  draft: Draft
): { block: Block; container: ContainerId }[] {
  return draft.blocks.flatMap((block) => [
    { block, container: ROOT },
    ...(block.type === "box"
      ? block.blocks.map((child) => ({
          block: child as Block,
          container: block.id,
        }))
      : []),
  ])
}

/** Un extrait de texte, pour nommer un bloc (plan, annonces). */
export function excerpt(text: string, max = 40): string {
  const flat = text.replace(/\s+/g, " ").trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

/** Taille du brouillon en octets, comme JSON.stringify en UTF-8. */
export function draftBytes(draft: Draft): number {
  return new TextEncoder().encode(JSON.stringify(draft)).length
}

type PreparedDraft =
  | { ok: true; draft: Draft; bytes: number }
  | { ok: false; reason: "too_large"; bytes: number }
  | { ok: false; reason: "invalid"; position: number | null; path: string }

/**
 * Prépare le brouillon à l'enregistrement : textes nettoyés (cleanTextDoc), puis vérifiés par
 * le validateur généré depuis le schéma (le même que celui de la base).
 */
export function prepareDraft(draft: Draft): PreparedDraft {
  const cleanBlock = <T extends Block>(block: T): T =>
    block.type === "text"
      ? ({ ...block, doc: cleanTextDoc(block.doc) } as T)
      : block.type === "box"
        ? ({ ...block, blocks: block.blocks.map(cleanBlock) } as T)
        : block
  const cleaned: Draft = { ...draft, blocks: draft.blocks.map(cleanBlock) }
  const bytes = draftBytes(cleaned)
  if (bytes > DRAFT_MAX_BYTES) return { ok: false, reason: "too_large", bytes }
  if (!validateDraft(cleaned)) {
    const path = validateDraft.errors?.[0]?.instancePath ?? ""
    const match = /^\/blocks\/(\d+)/.exec(path)
    return {
      ok: false,
      reason: "invalid",
      position: match ? Number(match[1]) + 1 : null,
      path,
    }
  }
  return { ok: true, draft: cleaned, bytes }
}

/**
 * Les textes des blocs, dans l'ordre (textes, légendes, encadrés). Un bloc lié est lu par
 * `resolve` (le bloc de son modèle), s'il est donné.
 */
function blockTexts(
  blocks: Block[],
  resolve?: (block: Block) => Block | null
): string[] {
  const parts: string[] = []
  const add = (block: Block) => {
    if (block.type === "text") {
      const text = textDocToPlainText(block.doc).trim()
      if (text) parts.push(text)
    } else if (block.type === "box") {
      block.blocks.forEach(add)
    } else {
      const shown = resolve?.(block)
      if (shown) add(shown)
    }
  }
  blocks.forEach(add)
  return parts
}

/** Le texte d'un brouillon, pour « Copier mon texte ». */
export function draftToPlainText(draft: Draft): string {
  const parts: string[] = []
  if (draft.title.trim()) parts.push(draft.title.trim())
  if (draft.summary?.trim()) parts.push(draft.summary.trim())
  parts.push(...blockTexts(draft.blocks))
  return parts.join("\n\n")
}

/**
 * Le nombre de mots de ce qu'on lit dans l'article (titre et blocs, blocs partagés compris par
 * `resolve` ; pas le résumé, qui n'est que dans la liste), et le temps de lecture arrondi à la
 * minute supérieure (0 pour un article vide).
 */
export function readingStats(
  draft: Draft,
  resolve?: (block: Block) => Block | null
): { words: number; minutes: number } {
  const text = [draft.title, ...blockTexts(draft.blocks, resolve)].join(" ")
  const words = text
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length
  return { words, minutes: Math.ceil(words / WORDS_PER_MINUTE) }
}

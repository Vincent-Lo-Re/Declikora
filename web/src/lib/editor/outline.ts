/**
 * Le plan de l'éditeur du Fil (docs/ADMINISTRATION.md, § 4, « Les finitions ») : intertitres
 * d'un texte, points à vérifier, copie d'un bloc. Sans React.
 */

import type {
  BlockMedia,
  LinkedTemplateState,
} from "@/blocks/components/context"
import { findBlock, insertBlock } from "@/blocks/draft"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import { copyWithNewIds } from "@/blocks/templates"
import type { Block, Doc, Draft } from "@/blocks/types"

/** Les intertitres (Titre, h2) d'un texte, dans l'ordre ; un intertitre vide ne compte pas. */
export function headingsOf(doc: Doc): string[] {
  return doc.content.flatMap((node) =>
    node.type === "heading" && node.attrs.level === 2
      ? [textDocToPlainText({ type: "doc", content: [node] }).trim()].filter(
          Boolean
        )
      : []
  )
}

// Ce que le plan signale sur une ligne.
export type BlockWarning =
  "noFile" | "unavailable" | "noAlt" | "missingTemplate"

/**
 * Ce qui manque à un bloc : une image sans fichier, un fichier qui ne s'affiche plus, une image
 * sans texte alternatif ; un bloc partagé dont le modèle n'existe plus. Ce qui se charge encore
 * (ou un échec du réseau) n'est pas signalé.
 */
export function blockWarning(
  block: Block,
  mediaFor: (mediaId: string | null) => BlockMedia,
  templateFor: (templateId: string) => LinkedTemplateState
): BlockWarning | null {
  if (block.type === "linked") {
    return templateFor(block.templateId).state === "missing"
      ? "missingTemplate"
      : null
  }
  if (block.type !== "image") return null
  if (block.mediaId === null) return "noFile"
  const media = mediaFor(block.mediaId)
  if (media.state === "missing" || media.state === "not_ready")
    return "unavailable"
  if (media.state !== "ready") return null
  return (block.alt ?? media.media.alt ?? "").trim() === "" ? "noAlt" : null
}

/**
 * « Dupliquer » : une copie du bloc (nouveaux identifiants), juste après lui, dans le même
 * conteneur. `null` si le bloc n'existe plus.
 */
export function duplicateBlock(
  draft: Draft,
  id: string
): { draft: Draft; id: string } | null {
  const place = findBlock(draft, id)
  if (!place) return null
  const copy = copyWithNewIds(place.block)
  const next = insertBlock(draft, copy, place.container, place.index + 1)
  return next ? { draft: next, id: copy.id } : null
}

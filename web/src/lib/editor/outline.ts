/**
 * Le plan de l'éditeur du Fil (docs/ADMINISTRATION.md, § 4, « Les finitions ») : la ligne d'un
 * texte, points à vérifier, copie d'un bloc. Sans React.
 */

import type {
  BlockMedia,
  LinkedTemplateState,
} from "@/blocks/components/context"
import { findBlock, insertBlock } from "@/blocks/draft"
import { textFirstLine } from "@/blocks/labels"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import { copyWithNewIds } from "@/blocks/templates"
import type { Block, Doc, Draft } from "@/blocks/types"

/** Ce que le plan montre d'un texte, sur une ligne. */
type TextOutline = {
  // Ce qui ouvre le texte : un intertitre (Titre ou Sous-titre), autre chose, ou rien.
  lead: "heading" | "text" | "empty"
  // L'intertitre qui ouvre le texte, sinon le début du texte.
  text: string
}

const flat = (value: string) => value.replace(/\s+/g, " ").trim()

/**
 * Le plan d'un texte (ADMIN § 4) : le contenu plutôt que le type, sur une ligne. Un texte qui
 * commence par un intertitre prend son nom, sinon sa première ligne ; ses autres intertitres
 * n'apparaissent pas dans le plan.
 */
export function textOutline(doc: Doc): TextOutline {
  const plain = (node: Doc["content"][number]) =>
    flat(textDocToPlainText({ type: "doc", content: [node] }))
  const first = doc.content.find((node) => plain(node) !== "")
  if (!first) return { lead: "empty", text: "" }
  // La première ligne, comme le nom du bloc dans ses réglages (blockLabel).
  return {
    lead: first.type === "heading" ? "heading" : "text",
    text: textFirstLine(doc),
  }
}

// Ce que le plan signale sur une ligne.
export type BlockWarning =
  "noFile" | "unavailable" | "missingTemplate" | "emptyBox"

/**
 * Ce qui manque à un bloc : une image sans fichier, un fichier qui ne s'affiche plus ; un bloc
 * partagé dont le modèle n'existe plus ; une section vide (l'app ne l'affiche pas). Ce qui se
 * charge encore (ou un échec du réseau) n'est pas signalé. Le texte alternatif n'est plus
 * réclamé (02/10/2026, [D15]).
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
  if (block.type === "box") return block.blocks.length === 0 ? "emptyBox" : null
  if (block.type !== "image") return null
  if (block.mediaId === null) return "noFile"
  const media = mediaFor(block.mediaId)
  return media.state === "missing" || media.state === "not_ready"
    ? "unavailable"
    : null
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

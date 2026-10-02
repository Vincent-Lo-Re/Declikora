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

// Un intertitre (Titre) ou un sous-titre (Sous-titre) d'un texte.
type HeadingLevel = 2 | 3

/** Ce que le plan montre d'un texte : une ligne, et ses intertitres dessous. */
export type TextOutline = {
  // Ce qui ouvre le texte : un intertitre, une liste, un paragraphe, ou rien (texte vide).
  lead: "h2" | "h3" | "list" | "paragraph" | "empty"
  // L'intertitre qui ouvre le texte, sinon le début du texte (sur une ligne).
  text: string
  // Les intertitres suivants, avec leur rang parmi les titres du texte (h2 et h3, vides
  // compris : c'est le rang des éléments h2 et h3 de l'aperçu).
  headings: { level: HeadingLevel; text: string; index: number }[]
}

const flat = (value: string) => value.replace(/\s+/g, " ").trim()

/**
 * Le plan d'un texte (ADMIN § 4) : le contenu plutôt que le type. Un texte qui commence par un
 * intertitre prend son nom ; les intertitres suivants (h2 et h3) se rangent dessous.
 */
export function textOutline(doc: Doc): TextOutline {
  const plain = (node: Doc["content"][number]) =>
    flat(textDocToPlainText({ type: "doc", content: [node] }))
  const headings: TextOutline["headings"] = []
  let rank = 0
  for (const node of doc.content) {
    if (node.type !== "heading") continue
    const text = plain(node)
    if (text) headings.push({ level: node.attrs.level, text, index: rank })
    rank += 1
  }
  const first = doc.content.find((node) => plain(node) !== "")
  if (!first) return { lead: "empty", text: "", headings }
  if (first.type === "heading") {
    const [lead, ...rest] = headings
    return {
      lead: first.attrs.level === 2 ? "h2" : "h3",
      text: lead.text,
      headings: rest,
    }
  }
  return {
    lead: first.type === "paragraph" ? "paragraph" : "list",
    text: flat(textDocToPlainText(doc)),
    headings,
  }
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

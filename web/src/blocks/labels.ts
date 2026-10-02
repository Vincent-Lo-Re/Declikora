import { excerpt } from "@/blocks/draft"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import type { Block } from "@/blocks/types"
import { texts } from "@/texts"

/**
 * Le nom d'un bloc dans le plan, les boutons et les annonces : « Texte « Bonjour… » ». Un bloc
 * lié est nommé d'après son modèle quand on le connaît (templateName).
 */
export function blockLabel(block: Block, templateName?: string | null): string {
  const labels = texts.editor.blockLabel
  switch (block.type) {
    case "text":
      return labels.text(excerpt(textDocToPlainText(block.doc), 30))
    case "image":
      return labels.image
    case "box":
      return labels.box(block.blocks.length)
    case "linked":
      return labels.linked(
        templateName?.trim() ? excerpt(templateName, 30) : null
      )
  }
}

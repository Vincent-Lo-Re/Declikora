import { excerpt } from "@/blocks/draft"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import type { Block } from "@/blocks/types"
import { texts } from "@/texts"

/** Le nom d'un bloc dans le plan, les boutons et les annonces : « Texte « Bonjour… » ». */
export function blockLabel(block: Block): string {
  const labels = texts.editor.blockLabel
  switch (block.type) {
    case "text":
      return labels.text(excerpt(textDocToPlainText(block.doc), 30))
    case "image":
      return labels.image(excerpt(block.caption ?? "", 30))
    case "box":
      return labels.box(block.blocks.length)
    case "linked":
      return labels.linked
  }
}

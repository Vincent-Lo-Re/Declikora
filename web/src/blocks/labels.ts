import { excerpt } from "@/blocks/draft"
import { textDocToPlainText } from "@/blocks/text/clean-text-doc"
import type { Block, Doc } from "@/blocks/types"
import { texts } from "@/texts"

/**
 * Ce qui résume un texte : sa première ligne non vide (l'intertitre qui l'ouvre, son premier
 * paragraphe, ou le premier point d'une liste), espaces resserrés. Le plan et les réglages du bloc
 * disent ainsi la même chose ; deux paragraphes ne sont jamais collés.
 */
export function textFirstLine(doc: Doc): string {
  return (
    textDocToPlainText(doc)
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .find((line) => line !== "") ?? ""
  )
}

/**
 * Le nom d'un bloc dans le plan, les boutons et les annonces : « Texte « Bonjour… » ». Un bloc
 * lié est nommé d'après son modèle quand on le connaît (templateName).
 */
export function blockLabel(block: Block, templateName?: string | null): string {
  const labels = texts.editor.blockLabel
  switch (block.type) {
    case "text":
      return labels.text(excerpt(textFirstLine(block.doc), 30))
    case "image":
      return labels.image
    case "box":
      return labels.box(
        texts.editor.outline.box[block.look],
        block.blocks.length
      )
    case "linked":
      return labels.linked(
        templateName?.trim() ? excerpt(templateName, 30) : null
      )
  }
}

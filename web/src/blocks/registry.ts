// Les blocs que l'éditeur sait ajouter (docs/ARCHITECTURE-CONTENUS.md, § 2.6) : pour un
// nouveau bloc, une entrée ici, son affichage dans components/block-canvas.tsx (BlockBody) et
// ses réglages dans le panneau de droite (web/src/components/editor/block-settings.tsx).

import { Image, SquareDashed, Type, type LucideIcon } from "lucide-react"

import { createBlock } from "@/blocks/draft"
import type { Block } from "@/blocks/types"
import { texts } from "@/texts"

export type InsertableType = "text" | "image" | "box"

export type BlockDefinition = {
  type: InsertableType
  label: string
  icon: LucideIcon
  create: () => Block
  // Peut-il aller dans un encadré ? (Le schéma le vérifie aussi, et la base.)
  allowedInBox: boolean
}

export const blockRegistry: Record<InsertableType, BlockDefinition> = {
  text: {
    type: "text",
    label: texts.editor.blocks.text,
    icon: Type,
    create: () => createBlock("text"),
    allowedInBox: true,
  },
  image: {
    type: "image",
    label: texts.editor.blocks.image,
    icon: Image,
    create: () => createBlock("image"),
    allowedInBox: true,
  },
  box: {
    type: "box",
    label: texts.editor.blocks.box,
    icon: SquareDashed,
    create: () => createBlock("box"),
    allowedInBox: false,
  },
}

/** Dans l'ordre du menu « Ajouter un bloc ». */
export const insertableBlocks: BlockDefinition[] = [
  blockRegistry.text,
  blockRegistry.image,
  blockRegistry.box,
]

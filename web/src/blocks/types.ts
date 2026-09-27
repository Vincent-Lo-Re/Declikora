// Types des blocs, tirés de blocks/blocks.schema.json (npm run blocks:generate).
// Contrat : docs/ARCHITECTURE-CONTENUS.md, § 2.

import type {
  BoxBlock,
  BoxChild,
  Doc,
  Draft,
  ImageBlock,
  LinkedBlock,
  TextBlock,
  TopBlock,
} from "@/blocks/generated/blocks"

export type {
  BoxBlock,
  BoxChild,
  Doc,
  Draft,
  ImageBlock,
  LinkedBlock,
  TextBlock,
  TopBlock,
}

/** Un bloc, au premier niveau ou dans un encadré. */
export type Block = TopBlock
export type BlockType = Block["type"]

/** La page elle-même (liste principale), par opposition à un encadré. */
export const ROOT = "root"

/** Où se trouve un bloc : la page (ROOT) ou l'id d'un encadré. */
export type ContainerId = string

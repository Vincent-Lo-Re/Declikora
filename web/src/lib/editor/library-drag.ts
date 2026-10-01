/**
 * Glisser un bloc de l'onglet Blocs dans l'aperçu (éditeur du Fil, docs/ADMINISTRATION.md,
 * § 4) : ce que porte le glisser-déposer du navigateur, et la place où le bloc tombe. Sans React.
 */

import type { InsertableType } from "@/blocks/registry"

// Le type des données glissées : l'aperçu n'accepte que lui (pas un fichier, pas du texte).
export const LIBRARY_DRAG_TYPE = "application/x-declikora-bloc"

export type LibraryDrag =
  { kind: "block"; type: InsertableType } | { kind: "template"; id: string }

export function encodeLibraryDrag(drag: LibraryDrag): string {
  return JSON.stringify(drag)
}

/** Relit ce qui a été glissé ; `null` pour tout ce qui ne vient pas de l'onglet Blocs. */
export function decodeLibraryDrag(value: string): LibraryDrag | null {
  try {
    const drag = JSON.parse(value) as Partial<Record<string, unknown>>
    if (
      drag.kind === "block" &&
      (drag.type === "text" || drag.type === "image" || drag.type === "box")
    ) {
      return { kind: "block", type: drag.type }
    }
    if (drag.kind === "template" && typeof drag.id === "string") {
      return { kind: "template", id: drag.id }
    }
  } catch {
    // Pas du JSON : ce n'est pas un bloc de l'onglet Blocs.
  }
  return null
}

/**
 * La place du bloc déposé parmi les blocs de la page : avant le premier bloc dont le milieu est
 * sous le pointeur, sinon à la fin.
 */
export function dropIndex(middles: readonly number[], y: number): number {
  const index = middles.findIndex((middle) => y < middle)
  return index === -1 ? middles.length : index
}

// Sélection en masse de la Médiathèque : cocher des fichiers, puis les mettre à la corbeille
// d'un coup. Sans React : la page (media-page.tsx) ne fait que brancher ces règles.

import { MediaError, restoreMedia, trashMedia } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"

/** Coche ou décoche un fichier. */
export function toggleSelected(
  selected: ReadonlySet<string>,
  id: string,
  checked: boolean
): Set<string> {
  const next = new Set(selected)
  if (checked) next.add(id)
  else next.delete(id)
  return next
}

/**
 * « Tout sélectionner » : coche ou décoche tous les fichiers affichés. Ceux que la recherche ou
 * un filtre cache ne changent pas.
 */
export function toggleAll(
  selected: ReadonlySet<string>,
  shown: readonly Media[],
  checked: boolean
): Set<string> {
  const next = new Set(selected)
  for (const media of shown) {
    if (checked) next.add(media.id)
    else next.delete(media.id)
  }
  return next
}

/**
 * Ce qui est coché parmi les fichiers affichés : seuls ceux-là comptent (comme dans la
 * Corbeille), pour qu'une action ne touche jamais un fichier qu'on ne voit pas.
 */
export function selectionOf(
  selected: ReadonlySet<string>,
  shown: readonly Media[]
): { items: Media[]; all: boolean; some: boolean } {
  const items = shown.filter((media) => selected.has(media.id))
  const all = shown.length > 0 && items.length === shown.length
  return { items, all, some: items.length > 0 && !all }
}

export type KeptMedia = { media: Media; detail: string }

export type BulkTrashResult = {
  trashed: Media[]
  // Fichiers encore utilisés : la base refuse de les mettre à la corbeille.
  kept: KeptMedia[]
  // Autre échec (réseau, droits) : on s'arrête là, le reste n'a pas été touché.
  error: unknown
}

/**
 * Met les fichiers à la corbeille un par un (media_trash). Un fichier utilisé est gardé et
 * l'envoi continue ; toute autre erreur arrête la suite.
 */
export async function trashMany(
  items: readonly Media[],
  trash: (id: string) => Promise<Media> = trashMedia
): Promise<BulkTrashResult> {
  const result: BulkTrashResult = { trashed: [], kept: [], error: null }
  for (const media of items) {
    try {
      await trash(media.id)
      result.trashed.push(media)
    } catch (error) {
      if (error instanceof MediaError && error.code === "fichier_utilise") {
        result.kept.push({ media, detail: error.detail ?? error.message })
      } else {
        result.error = error
        break
      }
    }
  }
  return result
}

/**
 * « Annuler » après une mise à la corbeille en masse : restaure les fichiers un par un. Renvoie
 * le nombre de fichiers revenus et la première erreur (la suite n'est pas tentée).
 */
export async function restoreMany(
  ids: readonly string[],
  restore: (id: string) => Promise<Media> = restoreMedia
): Promise<{ restored: number; error: unknown }> {
  let restored = 0
  for (const id of ids) {
    try {
      await restore(id)
      restored += 1
    } catch (error) {
      return { restored, error }
    }
  }
  return { restored, error: null }
}

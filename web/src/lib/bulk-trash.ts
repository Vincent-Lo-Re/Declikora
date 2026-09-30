// Sélection en masse (Médiathèque, listes de contenus) : cocher des lignes, puis les mettre à la
// corbeille d'un coup. Sans React : les pages ne font que brancher ces règles.

type Row = { id: string }

/** Coche ou décoche une ligne. */
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
 * « Tout sélectionner » : coche ou décoche toutes les lignes affichées. Celles que la recherche
 * ou un filtre cache ne changent pas.
 */
export function toggleAll(
  selected: ReadonlySet<string>,
  shown: readonly Row[],
  checked: boolean
): Set<string> {
  const next = new Set(selected)
  for (const row of shown) {
    if (checked) next.add(row.id)
    else next.delete(row.id)
  }
  return next
}

/**
 * Ce qui est coché parmi les lignes affichées : seules celles-là comptent (comme dans la
 * Corbeille), pour qu'une action ne touche jamais une ligne qu'on ne voit pas.
 */
export function selectionOf<T extends Row>(
  selected: ReadonlySet<string>,
  shown: readonly T[]
): { items: T[]; all: boolean; some: boolean } {
  const items = shown.filter((row) => selected.has(row.id))
  const all = shown.length > 0 && items.length === shown.length
  return { items, all, some: items.length > 0 && !all }
}

/** Une ligne gardée, avec la raison donnée par la base. */
export type Kept<T> = { item: T; detail: string }

export type BulkTrashResult<T, R = unknown> = {
  trashed: T[]
  // Ce que la base a répondu pour chacune (dans l'ordre de trashed).
  results: R[]
  // Lignes que la base refuse de mettre à la corbeille pour une raison attendue (fichier
  // utilisé, contenu en cours d'écriture…).
  kept: Kept<T>[]
  // Autre échec (réseau, droits) : on s'arrête là, le reste n'a pas été touché.
  error: unknown
}

/**
 * Met les lignes à la corbeille une par une. keptDetail dit si une erreur est un refus attendu
 * (la ligne est gardée et l'envoi continue) ; toute autre erreur arrête la suite.
 */
export async function trashMany<T extends Row, R>(
  items: readonly T[],
  trash: (id: string) => Promise<R>,
  keptDetail: (error: unknown) => string | null
): Promise<BulkTrashResult<T, R>> {
  const result: BulkTrashResult<T, R> = {
    trashed: [],
    results: [],
    kept: [],
    error: null,
  }
  for (const item of items) {
    try {
      result.results.push(await trash(item.id))
      result.trashed.push(item)
    } catch (error) {
      const detail = keptDetail(error)
      if (detail === null) {
        result.error = error
        break
      }
      result.kept.push({ item, detail })
    }
  }
  return result
}

/**
 * « Annuler » après une mise à la corbeille en masse : restaure les lignes une par une. Renvoie
 * les réponses de la base (une par ligne revenue) et la première erreur (la suite n'est pas
 * tentée).
 */
export async function restoreMany<R>(
  ids: readonly string[],
  restore: (id: string) => Promise<R>
): Promise<{ restored: R[]; error: unknown }> {
  const restored: R[] = []
  for (const id of ids) {
    try {
      restored.push(await restore(id))
    } catch (error) {
      return { restored, error }
    }
  }
  return { restored, error: null }
}

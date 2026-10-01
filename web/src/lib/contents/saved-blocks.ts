// « Mes blocs » de l'éditeur du Fil (ADMIN § 4), sans React : les modèles qui s'insèrent dans un
// article (mises en forme et blocs partagés), filtrés et cherchés, et le nombre de contenus qui
// citent chaque bloc partagé.

import { templateInsertable } from "@/blocks/templates"
import { normalizeSearch } from "@/lib/contents/list-filters"
import type { TemplateItem, TemplateUse } from "@/lib/contents/templates"

/** Le filtre du panneau : tous, les mises en forme ou les blocs partagés. */
export type SavedFilter = "all" | "style" | "shared"

/**
 * Les blocs enregistrés à montrer : pas les points de départ (ils servent à créer un contenu),
 * dans l'ordre des noms, du filtre choisi, et dont le nom contient la recherche (sans tenir
 * compte des accents ni des majuscules).
 */
export function savedBlocks(
  templates: TemplateItem[],
  filter: SavedFilter,
  search: string
): TemplateItem[] {
  const wanted = normalizeSearch(search)
  return templates.filter(
    (template) =>
      templateInsertable(template) !== "starter" &&
      (filter === "all" || template.sort === filter) &&
      normalizeSearch(template.title).includes(wanted)
  )
}

/** Le nombre de contenus (hors corbeille) qui citent chaque modèle. */
export function countUses(uses: TemplateUse[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const use of uses) {
    if (use.inTrash) continue
    for (const id of use.templateIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

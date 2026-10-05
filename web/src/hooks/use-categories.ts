import { useQuery } from "@tanstack/react-query"

import type { CategorySection } from "@/lib/categories"
import { categoriesRead } from "@/lib/reads"

/**
 * Les catégories d'une section (Blog ou Podcasts), dans l'ordre de l'équipe. null : pas de
 * catégories (une page, un modèle) ; rien n'est lu.
 */
export function useCategories(section: CategorySection | null) {
  return useQuery({
    ...categoriesRead(section ?? "blog"),
    enabled: section !== null,
  })
}

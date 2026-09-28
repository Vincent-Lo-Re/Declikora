import { useQuery } from "@tanstack/react-query"

import {
  categoryKeys,
  listCategories,
  type CategorySection,
} from "@/lib/categories"

/**
 * Les catégories d'une section (Blog ou Podcasts), dans l'ordre de l'équipe. null : pas de
 * catégories (une page, un modèle) ; rien n'est lu.
 */
export function useCategories(section: CategorySection | null) {
  return useQuery({
    queryKey: categoryKeys.list(section ?? "blog"),
    queryFn: () => listCategories(section ?? "blog"),
    enabled: section !== null,
  })
}

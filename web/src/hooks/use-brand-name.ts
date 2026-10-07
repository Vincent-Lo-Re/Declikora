import { useQuery } from "@tanstack/react-query"

import { brandName, type AdminBrand } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"

/**
 * L'identité de l'admin (nom, logotype, monogramme), lue dès l'ouverture de l'admin (main.tsx) ;
 * undefined le temps de la lecture ou si elle échoue.
 */
export function useBrand(): AdminBrand | undefined {
  return useQuery(adminBrandRead()).data
}

/**
 * Le nom de la marque à afficher (menu, connexion, titre de l'onglet) : vide le temps de la
 * lecture, pour ne pas montrer « Ruche » un instant à la place de la marque ; « Ruche » si elle
 * échoue ou si aucun nom n'est enregistré.
 */
export function useBrandName(): string {
  const { data, isPending, isError } = useQuery(adminBrandRead())
  if (isPending && !isError) return ""
  return brandName(data?.name)
}

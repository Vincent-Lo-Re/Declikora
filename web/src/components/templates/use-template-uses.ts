import { useQuery } from "@tanstack/react-query"

import { listTemplateUses, templateKeys } from "@/lib/contents/templates"

/** Les brouillons qui utilisent ce bloc identique partout (corbeille comprise). */
export function useTemplateUses(templateId: string, enabled: boolean) {
  return useQuery({
    queryKey: templateKeys.usesOf(templateId),
    queryFn: () => listTemplateUses([templateId]),
    enabled,
    refetchInterval: 30_000,
  })
}

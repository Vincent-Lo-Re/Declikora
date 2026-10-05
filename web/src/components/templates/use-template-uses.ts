import { useQuery } from "@tanstack/react-query"

import { templateUsesRead } from "@/lib/reads"

/** Les brouillons qui utilisent ce bloc identique partout (corbeille comprise). */
export function useTemplateUses(templateId: string, enabled: boolean) {
  return useQuery({
    ...templateUsesRead(templateId),
    enabled,
    refetchInterval: 30_000,
  })
}

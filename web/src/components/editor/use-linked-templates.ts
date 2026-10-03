import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"

import type { LinkedTemplateState } from "@/blocks/components/context"
import { linkedTemplateIds, singleBlock } from "@/blocks/templates"
import type { Block, Draft } from "@/blocks/types"
import {
  getTemplatesByIds,
  templateKeys,
  type LinkedTemplate,
} from "@/lib/contents/templates"

/**
 * Les blocs partagés d'un brouillon (blocs liés) : leurs modèles, relus toutes les 30 secondes
 * (un autre membre peut les corriger pendant qu'on écrit), et ce que l'éditeur en sait. Un modèle
 * inséré ou créé à l'instant (rememberShared) se montre sans attendre la relecture de la base.
 */
export function useLinkedTemplates(draft: Draft) {
  const linkedIds = useMemo(() => linkedTemplateIds(draft), [draft])
  const [picked, setPicked] = useState<Record<string, LinkedTemplate>>({})
  const query = useQuery({
    queryKey: templateKeys.byIds(linkedIds),
    queryFn: () => getTemplatesByIds(linkedIds),
    enabled: linkedIds.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  })
  const templatesById = useMemo(() => {
    const map = new Map<string, LinkedTemplate>(Object.entries(picked))
    for (const template of query.data ?? []) map.set(template.id, template)
    return map
  }, [query.data, picked])
  const loading =
    (query.isPending || query.isPlaceholderData) && linkedIds.length > 0
  const failed = query.isError
  const { refetch } = query

  /** Ce que l'éditeur sait du modèle d'un bloc lié (son nom et son bloc, ou pourquoi pas). */
  const templateFor = useCallback(
    (templateId: string): LinkedTemplateState => {
      const template = templatesById.get(templateId)
      if (!template) {
        if (loading) return { state: "loading" }
        if (failed) return { state: "error", retry: () => void refetch() }
        return { state: "missing" }
      }
      if (template.inTrash || template.sort !== "shared") {
        return { state: "missing" }
      }
      const block = singleBlock(template.draft)
      return block
        ? { state: "ready", name: template.title, block }
        : { state: "empty", name: template.title }
    },
    [templatesById, loading, failed, refetch]
  )

  /** Le nom du modèle d'un bloc lié, s'il est connu. */
  const templateName = useCallback(
    (block: Block) => {
      if (block.type !== "linked") return null
      const state = templateFor(block.templateId)
      return state.state === "ready" || state.state === "empty"
        ? state.name
        : null
    },
    [templateFor]
  )

  /** Le bloc d'un modèle partagé, tel qu'il est aujourd'hui (Lecture, temps de lecture). */
  const resolveLinked = useCallback(
    (block: Block) => {
      if (block.type !== "linked") return null
      const state = templateFor(block.templateId)
      return state.state === "ready" ? state.block : null
    },
    [templateFor]
  )

  // Les blocs des modèles cités (et ceux de leurs sections), pour leurs images.
  const linkedBlocks = useMemo(
    () =>
      linkedIds.flatMap((id): Block[] => {
        const template = templatesById.get(id)
        const block = template ? singleBlock(template.draft) : null
        if (!block) return []
        return block.type === "box" ? [block, ...block.blocks] : [block]
      }),
    [linkedIds, templatesById]
  )

  /** Un bloc partagé inséré ou créé à l'instant : montré sans attendre la relecture. */
  const rememberShared = useCallback(
    (template: Pick<LinkedTemplate, "id" | "title" | "draft">) =>
      setPicked((current) => ({
        ...current,
        [template.id]: { ...template, sort: "shared", inTrash: false },
      })),
    []
  )

  return {
    linkedIds,
    linkedBlocks,
    templateFor,
    templateName,
    resolveLinked,
    rememberShared,
  }
}

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { selectedRootIds } from "@/blocks/templates"
import type { Draft } from "@/blocks/types"
import type { OutlineSelection } from "@/components/editor/outline-panel"
import { useAccessCheck } from "@/components/team/use-access-check"
import type { Content } from "@/lib/contents/api"
import { createTemplateFrom, templateKeys } from "@/lib/contents/templates"
import type { TemplateValues } from "@/lib/schemas"
import { editorPath } from "@/navigation"
import { texts } from "@/texts"

const words = texts.templates.saveAs

/**
 * « Enregistrer comme modèle » : les blocs cochés dans le plan (« Choisir des blocs ») ou le bloc
 * choisi, puis la fenêtre du nouveau modèle. Le modèle est fait du brouillon enregistré :
 * l'enregistrement en attente part d'abord (prepare). Un bloc devenu bloc partagé est remplacé
 * par son bloc lié dans le brouillon (onLinked), si on tient la main.
 */
export function useSaveAsTemplate({
  contentId,
  draft,
  editable,
  prepare,
  onLinked,
}: {
  contentId: string
  draft: Draft
  editable: boolean
  // Termine l'enregistrement en attente ; null s'il n'a pas pu se faire.
  prepare: () => Promise<number | null>
  onLinked: (created: Content, blockId: string) => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const checkAccess = useAccessCheck()
  const [choosing, setChoosing] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set())
  // Les blocs de la fenêtre ouverte (null : fermée).
  const [ids, setIds] = useState<string[] | null>(null)

  const mutation = useMutation({
    mutationFn: async ({
      blockIds,
      values,
    }: {
      blockIds: string[]
      values: TemplateValues
    }) => {
      if ((await prepare()) === null) return null
      return createTemplateFrom(contentId, blockIds, values)
    },
    onSuccess: (created, { blockIds: saved, values }) => {
      if (!created) return
      setIds(null)
      setChoosing(false)
      setChosen(new Set())
      void queryClient.invalidateQueries({ queryKey: templateKeys.all })
      const name = created.title.trim() || texts.templates.list.untitled
      const open = {
        label: words.open,
        onClick: () => void navigate(editorPath("templates", created.id)),
      }
      if (values.sort === "shared" && saved.length === 1 && editable) {
        // Le bloc devient lié à son modèle : on le corrige désormais dans le modèle.
        onLinked(created, saved[0])
        toast.success(words.saved(name), {
          description: words.sharedReplaced,
          action: open,
        })
      } else {
        toast.success(words.saved(name), { action: open })
      }
    },
    onError: (error) => checkAccess(error),
  })

  /** Ouvre la fenêtre du nouveau modèle pour ces blocs. */
  const openFor = (blockIds: string[]) => {
    mutation.reset()
    setIds(blockIds)
  }

  // Les cases à cocher du plan.
  const selection: OutlineSelection = {
    active: choosing,
    chosen,
    onToggleActive: () => {
      setChoosing((active) => !active)
      setChosen(new Set())
    },
    onChoose: (id, checked) =>
      setChosen((current) => {
        const next = new Set(current)
        if (checked) next.add(id)
        else next.delete(id)
        return next
      }),
    onSave: () => {
      const roots = selectedRootIds(draft, new Set(chosen))
      if (roots.length > 0) openFor(roots)
    },
  }

  // La fenêtre du nouveau modèle.
  const dialog = {
    open: ids !== null,
    count: ids?.length ?? 1,
    onClose: () => setIds(null),
    pending: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
    submit: (values: TemplateValues) => {
      if (ids) mutation.mutate({ blockIds: ids, values })
    },
  }

  return { openFor, selection, dialog }
}

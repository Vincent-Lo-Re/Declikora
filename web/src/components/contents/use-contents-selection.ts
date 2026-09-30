import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import {
  restoreMany,
  selectionOf,
  toggleAll,
  toggleSelected,
  trashMany,
  type BulkTrashResult,
  type Kept,
} from "@/lib/bulk-trash"
import { keptContentDetail } from "@/lib/contents/api"
import {
  restoreContent,
  trashContent,
  type Trashed,
} from "@/lib/contents/publication"
import { errorMessage } from "@/lib/errors"
import { kickFiles } from "@/lib/media/api"
import { refreshAfterContentTrash } from "@/lib/refresh"
import { texts } from "@/texts"

type Row = { id: string; title: string }

type Words = {
  trashedMany: (count: number) => string
  restoredMany: (count: number) => string
  undo: string
}

/**
 * Sélection en masse d'une liste de contenus (listes des sections, Modèles de bloc) : les lignes
 * cochées parmi celles affichées (shown), « Tout sélectionner », la confirmation, puis la mise à
 * la corbeille une par une ; une ligne que la base garde (quelqu'un d'autre l'écrit, modèle
 * encore utilisé) reste cochée et listée (kept).
 */
export function useContentsSelection<T extends Row>({
  shown,
  words,
  nameOf,
}: {
  shown: readonly T[]
  words: Words
  nameOf: (item: T) => string
}) {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [kept, setKept] = useState<Kept<T>[]>([])
  const [confirming, setConfirming] = useState(false)
  // « Tout sélectionner » : le focus y revient quand le bouton « Mettre à la corbeille » disparaît.
  const selectAllRef = useRef<HTMLSpanElement>(null)
  const selection = selectionOf(checkedIds, shown)

  const trash = useBulkTrash<T>({
    words,
    nameOf,
    onDone: (result) => {
      setConfirming(false)
      if (!result) return
      setCheckedIds((current) => {
        const next = new Set(current)
        for (const item of result.trashed) next.delete(item.id)
        return next
      })
      setKept(result.kept)
      if (result.kept.length === 0 && result.error === null)
        selectAllRef.current?.focus()
    },
  })

  return {
    selection,
    checkedIds,
    kept,
    selectAllRef,
    pending: trash.isPending,
    confirming,
    toggle: (item: T, checked: boolean) =>
      setCheckedIds((current) => toggleSelected(current, item.id, checked)),
    toggleAll: (checked: boolean) =>
      setCheckedIds((current) => toggleAll(current, shown, checked)),
    closeKept: () => {
      setKept([])
      selectAllRef.current?.focus()
    },
    askConfirm: () => setConfirming(true),
    cancel: () => setConfirming(false),
    confirm: () => trash.mutate(selection.items),
  }
}

/**
 * Mise à la corbeille des contenus cochés, un par un. « Annuler » dans le message les ramène en
 * brouillon. onDone reçoit le résultat (null si l'envoi a échoué).
 */
function useBulkTrash<T extends Row>({
  words,
  nameOf,
  onDone,
}: {
  words: Words
  nameOf: (item: T) => string
  onDone: (result: BulkTrashResult<T, Trashed> | null) => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const refresh = () => refreshAfterContentTrash(queryClient)

  const undo = async (items: T[]) => {
    const { restored, error } = await restoreMany(
      items.map((item) => item.id),
      restoreContent
    )
    if (restored.length > 0) toast.success(words.restoredMany(restored.length))
    restored.forEach(({ addressRemoved }, index) => {
      if (addressRemoved)
        toast.warning(texts.trash.restoredWithoutAddress(nameOf(items[index])))
    })
    if (error) toast.error(errorMessage(error))
    await refresh()
  }

  return useMutation({
    mutationFn: (items: T[]) =>
      trashMany(items, trashContent, keptContentDetail),
    onSuccess: (result) => {
      if (result.trashed.length > 0) {
        toast.success(words.trashedMany(result.trashed.length), {
          action: {
            label: words.undo,
            onClick: () => void undo(result.trashed),
          },
        })
        // Leurs fichiers redeviennent peut-être protégés : tout de suite.
        if (result.results.some((trashed) => trashed.needsFileSync))
          void kickFiles()
      }
      if (result.error) {
        toast.error(errorMessage(result.error))
        checkAccess(result.error)
      }
      onDone(result)
    },
    onError: (error) => {
      toast.error(errorMessage(error))
      onDone(null)
    },
    onSettled: refresh,
  })
}

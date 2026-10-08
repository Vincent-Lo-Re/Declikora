import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { useAccessCheck } from "@/components/team/use-access-check"
import { categoryKeys, type Category, type CategoryUse } from "@/lib/categories"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { removeCategory } from "@/lib/contents/settings"
import { errorMessage } from "@/lib/errors"
import { texts } from "@/texts"

const words = texts.categories.uses

const titleOf = (use: CategoryUse) => use.title?.trim() || texts.common.untitled

/**
 * Retirer une catégorie de contenus, depuis la fenêtre de ses utilisations : les lignes cochées,
 * la confirmation (confirming : les contenus visés), puis un contenu après l'autre (un refus
 * attendu, quelqu'un qui écrit, garde la ligne sans arrêter les autres) et un résumé.
 */
export function useCategoryRemoval(category: Category) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const myId = useAuth().session?.user.id ?? ""
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState<CategoryUse[] | null>(null)

  const remove = useMutation({
    mutationFn: async (uses: CategoryUse[]) => {
      let removed = 0
      let republished = 0
      let toRepublish = 0
      const kept: string[] = []
      const notRepublished: string[] = []
      for (const use of uses) {
        try {
          const done = await removeCategory(use.content_id, category.id, myId, {
            ...words,
            scheduled: words.scheduledNow,
          })
          if (done.result === "unchanged") continue
          removed += 1
          if (done.result === "republished") republished += 1
          if (done.result === "draftOnly") {
            toRepublish += 1
            if (done.publishError)
              notRepublished.push(
                words.notRepublished(titleOf(use), done.publishError)
              )
          }
        } catch (error) {
          checkAccess(error)
          const detail =
            error instanceof ContentError && error.detail
              ? error.detail
              : errorMessage(error)
          kept.push(texts.selection.keptItem(titleOf(use), detail))
        }
      }
      return { removed, republished, toRepublish, kept, notRepublished }
    },
    onSuccess: ({
      removed,
      republished,
      toRepublish,
      kept,
      notRepublished,
    }) => {
      const summary = [
        removed > 0 ? words.done.removed(removed) : null,
        republished > 0 ? words.done.republished(republished) : null,
        toRepublish > 0 ? words.done.toRepublish(toRepublish) : null,
        kept.length > 0 ? words.done.kept(kept.length) : null,
      ]
        .filter(Boolean)
        .join(" · ")
      if (kept.length > 0)
        toast.error(summary, { description: kept.join("\n") })
      else if (removed > 0) toast.success(summary)
      for (const message of notRepublished) toast.warning(message)
      setSelected(new Set())
    },
    onSettled: async () => {
      setConfirming(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: contentKeys.all }),
      ])
    },
  })

  return { selected, setSelected, confirming, setConfirming, remove }
}

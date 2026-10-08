import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useAccessCheck } from "@/components/team/use-access-check"
import { categoryKeys, deleteCategory, type Category } from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * Les catégories cochées de l'onglet « Catégories » et leur suppression définitive, une à une
 * (une catégorie qui a disparu entre-temps n'arrête pas les autres). Tenu par la page : le
 * bouton « Supprimer définitivement (n) » est en tête de page, à côté de « Nouvelle catégorie »,
 * comme pour les contenus.
 */
export function useCategoriesBulk() {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const removeMany = useMutation({
    mutationFn: async (items: Category[]) => {
      let done = 0
      for (const item of items) {
        try {
          await deleteCategory(item.id)
          done += 1
        } catch (error) {
          if (done > 0) toast.success(labels.removedMany(done))
          throw error
        }
      }
      return done
    },
    onSuccess: (done) => {
      toast.success(labels.removedMany(done))
      setSelected(new Set())
    },
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: async () => {
      setConfirming(false)
      // Les listes du Blog ou des Podcasts montrent les noms : relues aussi.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
      ])
    },
  })

  return { selected, setSelected, confirming, setConfirming, removeMany }
}

export type CategoriesBulk = ReturnType<typeof useCategoriesBulk>

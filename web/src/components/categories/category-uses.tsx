import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { UsesBadgeButton, UsesDialog } from "@/components/uses-dialog"
import { categoryKeys, getCategoryUses, type Category } from "@/lib/categories"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * La pastille « État » d'une catégorie citée par des brouillons : elle ouvre la liste des
 * contenus qui l'utilisent (brouillon, en ligne, à la Corbeille), avec son export, comme la
 * pastille « Utilisé » d'un fichier de la Médiathèque.
 */
export function CategoryUsesButton({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const uses = useQuery({
    queryKey: categoryKeys.uses(category.id),
    queryFn: () => getCategoryUses(category.id),
    enabled: open,
  })
  return (
    <>
      <UsesBadgeButton
        label={labels.uses.open(category.name)}
        tooltip={labels.usesCount(category.uses)}
        onClick={() => setOpen(true)}
      />
      <UsesDialog
        open={open}
        onOpenChange={setOpen}
        title={labels.uses.title}
        subject={category.name}
        query={uses}
        fileName={labels.uses.fileName(category.name)}
        failed={labels.loadFailed}
        empty={labels.usesCount(0)}
      />
    </>
  )
}

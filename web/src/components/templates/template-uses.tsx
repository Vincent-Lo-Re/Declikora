import { useQuery } from "@tanstack/react-query"
import { Unlink } from "lucide-react"
import { useState } from "react"

import { IconBadge } from "@/components/icon-badge"
import { UsesBadgeButton, UsesDialog } from "@/components/uses-dialog"
import {
  getTemplateUses,
  templateKeys,
  type TemplateItem,
} from "@/lib/contents/templates"
import { texts } from "@/texts"

const labels = texts.templates.list

/**
 * La colonne « État » d'un modèle, comme la Médiathèque et les catégories : un lien coupé s'il ne
 * sert nulle part, sinon un lien (le nombre d'endroits dans l'infobulle) qui ouvre la liste des
 * contenus où il sert (bloc partagé) ou où il a été copié (mise en forme, point de départ), avec
 * son export.
 */
export function TemplateStatus({
  template,
  name,
  count,
}: {
  template: TemplateItem
  name: string
  count: number
}) {
  const [open, setOpen] = useState(false)
  const uses = useQuery({
    queryKey: templateKeys.where(template.id),
    queryFn: () => getTemplateUses(template),
    enabled: open,
  })
  if (count === 0)
    return <IconBadge icon={Unlink} label={labels.usesCount(0)} />
  return (
    <>
      <UsesBadgeButton
        label={labels.uses.open(name)}
        tooltip={labels.usesCount(count)}
        onClick={() => setOpen(true)}
      />
      <UsesDialog
        open={open}
        onOpenChange={setOpen}
        title={labels.uses.title}
        subject={name}
        query={uses}
        fileName={labels.uses.fileName(name)}
        failed={labels.loadFailed}
        empty={labels.usesCount(0)}
      />
    </>
  )
}

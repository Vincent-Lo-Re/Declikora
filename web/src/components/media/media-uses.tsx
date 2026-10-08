import { useState } from "react"

import {
  mediaUsesFileName,
  useMediaUses,
} from "@/components/media/use-media-uses"
import { UsesBadgeButton, UsesDialog } from "@/components/uses-dialog"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/**
 * La pastille « Utilisé » d'un fichier (vignette, ligne de la liste) : elle ouvre la liste des
 * endroits où il sert, avec son export (UsesDialog).
 */
export function MediaUsesButton({ media }: { media: Media }) {
  const [open, setOpen] = useState(false)
  const uses = useMediaUses(media.id, open)
  return (
    <>
      <UsesBadgeButton
        label={texts.media.uses.open(media.name)}
        tooltip={texts.media.used}
        onClick={() => setOpen(true)}
      />
      <UsesDialog
        open={open}
        onOpenChange={setOpen}
        title={texts.media.uses.title}
        subject={media.name}
        query={uses}
        fileName={mediaUsesFileName(media)}
        failed={texts.media.detail.usesFailed}
        empty={texts.media.detail.notUsed}
      />
    </>
  )
}

import { MediaThumbnail } from "@/components/media/media-visuals"
import { TableCell } from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
import type { Media } from "@/lib/media/constants"

/** « Dernière modification » d'une ligne de liste : la date seulement. */
export function SavedCell({ savedAt }: { savedAt: string }) {
  return (
    <TableCell className="text-muted-foreground">
      {formatDateTime(savedAt)}
    </TableCell>
  )
}

/** L'image de présentation d'une ligne de liste, en vignette (l'icône d'une image s'il n'y en a pas). */
export function CoverCell({
  media,
  url,
}: {
  media: Media | undefined
  url?: string
}) {
  return (
    <TableCell>
      <MediaThumbnail
        media={media}
        url={url}
        className="size-10 rounded-md"
        iconClassName="size-4"
      />
    </TableCell>
  )
}

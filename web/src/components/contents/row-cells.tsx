import { MediaThumbnail } from "@/components/media/media-visuals"
import { Badge } from "@/components/ui/badge"
import { TableCell } from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/** « Dernière modification » d'une ligne de liste : la date, et qui l'a faite. */
export function SavedCell({
  savedAt,
  savedByName,
}: {
  savedAt: string
  savedByName: string | null
}) {
  return (
    <TableCell className="text-muted-foreground">
      {formatDateTime(savedAt)}
      {savedByName && <> {texts.common.savedBy(savedByName)}</>}
    </TableCell>
  )
}

/** « État » d'une ligne de liste : qui écrit le brouillon en ce moment, s'il y a quelqu'un. */
export function EditingCell({
  editingName,
  label,
}: {
  editingName: string | null
  label: (name: string) => string
}) {
  return (
    <TableCell>
      {editingName && <Badge variant="secondary">{label(editingName)}</Badge>}
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

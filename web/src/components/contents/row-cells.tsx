import { Badge } from "@/components/ui/badge"
import { TableCell } from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
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

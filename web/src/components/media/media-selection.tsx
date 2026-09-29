import { TriangleAlert, X } from "lucide-react"
import type { Ref } from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { KeptMedia } from "@/lib/media/bulk-trash"
import { texts } from "@/texts"

/** Au-dessus des fichiers : « Tout sélectionner » et le nombre de fichiers cochés. */
export function SelectionBar({
  count,
  all,
  some,
  disabled,
  onToggleAll,
  selectAllRef,
}: {
  count: number
  all: boolean
  some: boolean
  disabled: boolean
  onToggleAll: (checked: boolean) => void
  selectAllRef: Ref<HTMLSpanElement>
}) {
  return (
    <div className="flex h-8 items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        {/* Nommée par son libellé (Base UI la relie au <label>) : pas d'aria-label en double. */}
        <Checkbox
          ref={selectAllRef}
          checked={all}
          indeterminate={some}
          disabled={disabled}
          onCheckedChange={(value) => onToggleAll(value)}
        />
        {texts.media.selection.selectAll}
      </label>
      {count > 0 && (
        <p className="text-sm text-muted-foreground">
          {texts.media.selection.count(count)}
        </p>
      )}
    </div>
  )
}

/** Les fichiers gardés par une mise à la corbeille en masse, parce qu'ils sont utilisés. */
export function KeptNotice({
  kept,
  onClose,
}: {
  kept: KeptMedia[]
  onClose: () => void
}) {
  const labels = texts.media.selection.kept
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{labels.title(kept.length)}</AlertTitle>
      <AlertDescription>
        <p>{labels.hint}</p>
        <ul className="list-disc pl-4">
          {kept.map(({ media, detail }) => (
            <li key={media.id}>{labels.item(media.name, detail)}</li>
          ))}
        </ul>
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.close}
          onClick={onClose}
        >
          <X />
        </Button>
      </AlertAction>
    </Alert>
  )
}

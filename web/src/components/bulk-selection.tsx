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
import type { Kept } from "@/lib/bulk-trash"
import { texts } from "@/texts"

/**
 * Au-dessus d'une liste (Médiathèque, listes de contenus) : « Tout sélectionner » et le nombre
 * de lignes cochées (countLabel, vide si rien n'est coché).
 */
export function SelectionBar({
  countLabel,
  all,
  some,
  disabled,
  onToggleAll,
  selectAllRef,
}: {
  countLabel: string | null
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
        {texts.selection.selectAll}
      </label>
      {countLabel && (
        <p className="text-sm text-muted-foreground">{countLabel}</p>
      )}
    </div>
  )
}

/** Les lignes gardées par une mise à la corbeille en masse, avec la raison de chacune. */
export function KeptNotice<T extends { id: string }>({
  kept,
  nameOf,
  title,
  hint,
  onClose,
}: {
  kept: Kept<T>[]
  nameOf: (item: T) => string
  title: string
  hint: string
  onClose: () => void
}) {
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{hint}</p>
        <ul className="list-disc pl-4">
          {kept.map(({ item, detail }) => (
            <li key={item.id}>
              {texts.selection.keptItem(nameOf(item), detail)}
            </li>
          ))}
        </ul>
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={texts.selection.closeKept}
          onClick={onClose}
        >
          <X />
        </Button>
      </AlertAction>
    </Alert>
  )
}

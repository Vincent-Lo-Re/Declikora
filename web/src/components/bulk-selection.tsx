import { Trash2, TriangleAlert, X } from "lucide-react"
import type { Ref } from "react"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { TableHead } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Kept } from "@/lib/bulk-trash"
import { texts } from "@/texts"

/** « Tout sélectionner » : ce qu'il faut pour la case (lignes affichées, toutes ou certaines). */
export type SelectAll = {
  all: boolean
  some: boolean
  disabled: boolean
  onToggleAll: (checked: boolean) => void
  // Le focus y revient quand le bouton « Mettre à la corbeille » disparaît.
  checkboxRef?: Ref<HTMLSpanElement>
}

/** La case « Tout sélectionner », sans texte : son nom est dans l'infobulle. */
export function SelectAllCheckbox({
  all,
  some,
  disabled,
  onToggleAll,
  checkboxRef,
}: SelectAll) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Checkbox
            ref={checkboxRef}
            aria-label={texts.selection.selectAll}
            checked={all}
            indeterminate={some}
            disabled={disabled}
            onCheckedChange={(value) => onToggleAll(value)}
          />
        }
      />
      <TooltipContent>{texts.selection.selectAll}</TooltipContent>
    </Tooltip>
  )
}

/** L'en-tête de la colonne des cases : « Tout sélectionner ». */
export function SelectAllHead(props: SelectAll) {
  return (
    <TableHead className="w-0">
      <SelectAllCheckbox {...props} />
    </TableHead>
  )
}

/** « Mettre à la corbeille (n) », en tête de page, quand des lignes sont cochées. */
export function BulkTrashButton({
  count,
  pending,
  onClick,
}: {
  count: number
  pending: boolean
  onClick: () => void
}) {
  if (count === 0) return null
  return (
    <Button
      variant="outline"
      className="text-destructive"
      disabled={pending}
      onClick={onClick}
    >
      {pending ? <Spinner /> : <Trash2 />}
      {texts.selection.trash(count)}
    </Button>
  )
}

/** Les lignes gardées par une mise à la corbeille en masse, avec la raison de chacune. */
export function KeptNotice<T extends { id: string }>({
  kept,
  nameOf,
  words,
  onClose,
}: {
  kept: Kept<T>[]
  nameOf: (item: NoInfer<T>) => string
  // Les textes de la page : titre et conseil, selon le nombre de lignes gardées.
  words: {
    keptTitle: (count: number) => string
    keptHint: (count: number) => string
  }
  onClose: () => void
}) {
  if (kept.length === 0) return null
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{words.keptTitle(kept.length)}</AlertTitle>
      <AlertDescription>
        <p>{words.keptHint(kept.length)}</p>
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

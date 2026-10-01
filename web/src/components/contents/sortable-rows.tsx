import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import { GripVertical } from "lucide-react"
import type { ComponentProps } from "react"

import { TableCell, TableRow } from "@/components/ui/table"
import { texts } from "@/texts"

const labels = texts.contentList.order

/** Une ligne déplaçable : sa poignée en première cellule, puis ses cellules. */
export function SortableRow({
  id,
  name,
  disabled,
  className,
  children,
  ...props
}: ComponentProps<typeof TableRow> & {
  id: string
  name: string
  disabled: boolean
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    attributes: { roleDescription: labels.dnd.roleDescription },
  })
  return (
    <TableRow
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        isDragging && "relative z-10 bg-background shadow-md",
        className
      )}
      {...props}
    >
      <TableCell className="w-0 pr-0">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={disabled}
          aria-label={labels.handle(name)}
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-40 active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      </TableCell>
      {children}
    </TableRow>
  )
}

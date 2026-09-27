import { cn } from "cn"

import { flattenBlocks } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry } from "@/blocks/registry"
import { ROOT, type Draft } from "@/blocks/types"
import { texts } from "@/texts"

const labels = texts.editor.outline

/** Panneau de gauche : le plan du contenu (la liste des blocs), pour aller vite à un bloc. */
export function OutlinePanel({
  draft,
  selectedId,
  onSelect,
}: {
  draft: Draft
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const items = flattenBlocks(draft)
  return (
    <nav
      aria-label={labels.title}
      className="flex h-full flex-col overflow-y-auto p-3"
    >
      <h2 className="px-2 pb-2 text-sm font-semibold">{labels.title}</h2>
      {items.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ol className="grid gap-0.5">
          {items.map(({ block, container }) => {
            const definition =
              block.type === "linked" ? null : blockRegistry[block.type]
            const Icon = definition?.icon
            const label = blockLabel(block)
            return (
              <li key={block.id} className={cn(container !== ROOT && "pl-5")}>
                <button
                  type="button"
                  aria-label={labels.select(label)}
                  aria-current={selectedId === block.id || undefined}
                  onClick={() => onSelect(block.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === block.id && "bg-accent font-medium"
                  )}
                >
                  {Icon && (
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  )}
                  <span className="truncate">{label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </nav>
  )
}

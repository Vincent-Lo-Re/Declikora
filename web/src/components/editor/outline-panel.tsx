import { cn } from "cn"
import { LayoutTemplate, ListChecks, X } from "lucide-react"

import { flattenBlocks } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry } from "@/blocks/registry"
import { ROOT, type Block, type Draft } from "@/blocks/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { texts } from "@/texts"

const labels = texts.editor.outline
const saveAs = texts.templates.saveAs

/**
 * Le choix de blocs pour « Enregistrer comme modèle » : des cases à cocher sur les blocs de
 * premier niveau du plan (accessibles au clavier), puis un bouton.
 */
export type OutlineSelection = {
  active: boolean
  chosen: ReadonlySet<string>
  onToggleActive: () => void
  onChoose: (id: string, checked: boolean) => void
  onSave: () => void
}

/** Panneau de gauche : le plan du contenu (la liste des blocs), pour aller vite à un bloc. */
export function OutlinePanel({
  draft,
  selectedId,
  onSelect,
  templateName = () => null,
  selection,
}: {
  draft: Draft
  selectedId: string | null
  onSelect: (id: string) => void
  // Le nom du modèle d'un bloc lié, s'il est connu.
  templateName?: (block: Block) => string | null
  // Absent : pas de « Enregistrer comme modèle » (lecture seule, éditeur d'un modèle).
  selection?: OutlineSelection
}) {
  const items = flattenBlocks(draft)
  const choosing = selection?.active ?? false
  const count = selection
    ? draft.blocks.filter((block) => selection.chosen.has(block.id)).length
    : 0
  return (
    <nav
      aria-label={labels.title}
      className="flex h-full flex-col overflow-y-auto p-3"
    >
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <h2 className="text-sm font-semibold">{labels.title}</h2>
        {selection && items.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            aria-pressed={choosing}
            onClick={selection.onToggleActive}
          >
            {choosing ? <X /> : <ListChecks />}
            {choosing ? saveAs.stopSelecting : saveAs.select}
          </Button>
        )}
      </div>
      {choosing && (
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          {saveAs.selectHint}
        </p>
      )}
      {items.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ol className="grid gap-0.5">
          {items.map(({ block, container }) => {
            const definition =
              block.type === "linked" ? null : blockRegistry[block.type]
            const Icon = definition?.icon ?? LayoutTemplate
            const label = blockLabel(block, templateName(block))
            const checkable = choosing && container === ROOT
            return (
              <li
                key={block.id}
                className={cn(
                  "flex min-w-0 items-center gap-1",
                  container !== ROOT && "pl-5",
                  choosing && container !== ROOT && "pl-11"
                )}
              >
                {checkable && selection && (
                  <Checkbox
                    className="mx-1.5"
                    aria-label={saveAs.selectBlock(label)}
                    checked={selection.chosen.has(block.id)}
                    onCheckedChange={(checked) =>
                      selection.onChoose(block.id, checked)
                    }
                  />
                )}
                <button
                  type="button"
                  aria-label={labels.select(label)}
                  aria-current={selectedId === block.id || undefined}
                  onClick={() => onSelect(block.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                    selectedId === block.id && "bg-accent font-medium"
                  )}
                >
                  <Icon
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
      {choosing && selection && (
        <div className="mt-3 border-t pt-3">
          <Button
            size="sm"
            className="w-full"
            disabled={count === 0}
            onClick={selection.onSave}
          >
            <LayoutTemplate />
            {saveAs.withCount(count)}
          </Button>
        </div>
      )}
    </nav>
  )
}

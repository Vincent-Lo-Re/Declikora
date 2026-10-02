import { cn } from "cn"
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Copy,
  Ellipsis,
  Heading2,
  ImageIcon,
  LayoutTemplate,
  ListChecks,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState } from "react"

import { flattenBlocks } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry } from "@/blocks/registry"
import { ROOT, type Block, type Draft } from "@/blocks/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { headingsOf, type BlockWarning } from "@/lib/editor/outline"
import { texts } from "@/texts"

const labels = texts.editor.outline
const saveAs = texts.templates.saveAs

/**
 * Le choix de blocs pour « Enregistrer comme modèle » : des cases à cocher sur les blocs de
 * premier niveau du plan (accessibles au clavier), puis un bouton.
 */
type OutlineSelection = {
  active: boolean
  chosen: ReadonlySet<string>
  onToggleActive: () => void
  onChoose: (id: string, checked: boolean) => void
  onSave: () => void
}

/**
 * Le plan de l'éditeur du Fil (ADMIN § 4, « Les finitions ») : l'image de présentation en tête,
 * les intertitres sous chaque texte, les encadrés repliables, ce qui manque, un menu « … » par
 * ligne, et le survol partagé avec l'aperçu.
 */
export type FeedOutline = {
  coverMissing: boolean
  onCover: () => void
  // Le bloc survolé, ici ou dans l'aperçu.
  hoveredId: string | null
  onHover: (id: string | null) => void
  warningOf: (block: Block) => BlockWarning | null
  onHeading: (blockId: string, index: number) => void
  // Absent en lecture seule.
  actions?: {
    onDuplicate: (id: string) => void
    // Un bloc de premier niveau, qui n'est pas déjà un bloc partagé.
    onSaveToMine: (id: string) => void
    onRemove: (id: string) => void
    // Pourquoi un bloc ne peut pas être supprimé, sinon null.
    removeBlocked: (id: string) => string | null
  }
}

/** Panneau de gauche : le plan du contenu (la liste des blocs), pour aller vite à un bloc. */
export function OutlinePanel({
  draft,
  selectedId,
  onSelect,
  templateName = () => null,
  selection,
  feed,
}: {
  draft: Draft
  selectedId: string | null
  onSelect: (id: string) => void
  // Le nom du modèle d'un bloc lié, s'il est connu.
  templateName?: (block: Block) => string | null
  // Absent : pas de « Enregistrer comme modèle » (lecture seule, éditeur d'un modèle).
  selection?: OutlineSelection
  feed?: FeedOutline
}) {
  // Les encadrés repliés (éditeur du Fil).
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const all = flattenBlocks(draft)
  const items = all.filter(({ container }) => !collapsed.has(container))
  const warnings = feed
    ? all.filter(({ block }) => feed.warningOf(block) !== null).length +
      (feed.coverMissing ? 1 : 0)
    : 0
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
        {selection && all.length > 0 && (
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
      {feed && (
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          {labels.count(all.length)}
        </p>
      )}
      {choosing && (
        <p className="px-2 pb-2 text-xs text-muted-foreground">
          {saveAs.selectHint}
        </p>
      )}
      {feed && (
        <div className="flex min-w-0 items-center gap-1">
          <button type="button" className={rowButton} onClick={feed.onCover}>
            <ImageIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{labels.cover}</span>
          </button>
          {feed.coverMissing && (
            <Warning label={labels.warnings.coverMissing} />
          )}
        </div>
      )}
      {all.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <ol className="grid gap-0.5">
          {items.map(({ block, container }) => {
            const definition =
              block.type === "linked" ? null : blockRegistry[block.type]
            const Icon = definition?.icon ?? LayoutTemplate
            const label = blockLabel(block, templateName(block))
            const checkable = choosing && container === ROOT
            const warning = feed?.warningOf(block) ?? null
            const isCollapsed = collapsed.has(block.id)
            const headings =
              feed && block.type === "text" ? headingsOf(block.doc) : []
            return (
              <li
                key={block.id}
                className={cn(
                  "grid gap-0.5",
                  container !== ROOT && "pl-5",
                  choosing && container !== ROOT && "pl-11"
                )}
                onPointerEnter={feed && (() => feed.onHover(block.id))}
                onPointerLeave={feed && (() => feed.onHover(null))}
              >
                <div
                  className={cn(
                    "group/row flex min-w-0 items-center gap-1 rounded-md",
                    feed?.hoveredId === block.id && "bg-accent/60"
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
                  {feed && block.type === "box" && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed
                          ? labels.expand(label)
                          : labels.collapse(label)
                      }
                      onClick={() =>
                        setCollapsed((current) => {
                          const next = new Set(current)
                          if (isCollapsed) next.delete(block.id)
                          else next.add(block.id)
                          return next
                        })
                      }
                    >
                      {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label={labels.select(label)}
                    aria-current={selectedId === block.id || undefined}
                    onClick={() => onSelect(block.id)}
                    className={cn(
                      rowButton,
                      selectedId === block.id && "bg-accent font-medium"
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{label}</span>
                  </button>
                  {warning && <Warning label={labels.warnings[warning]} />}
                  {feed?.actions && (
                    <RowActions
                      label={label}
                      onDuplicate={() => feed.actions!.onDuplicate(block.id)}
                      onSaveToMine={
                        container === ROOT && block.type !== "linked"
                          ? () => feed.actions!.onSaveToMine(block.id)
                          : undefined
                      }
                      onRemove={() => feed.actions!.onRemove(block.id)}
                      removeBlocked={feed.actions.removeBlocked(block.id)}
                    />
                  )}
                </div>
                {headings.length > 0 && (
                  <ol className="grid gap-0.5 pl-5">
                    {headings.map((heading, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          aria-label={labels.heading(heading)}
                          onClick={() => feed!.onHeading(block.id, index)}
                          className={cn(
                            rowButton,
                            "py-1 text-xs text-muted-foreground"
                          )}
                        >
                          <Heading2 aria-hidden className="size-3.5 shrink-0" />
                          <span className="truncate">{heading}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {feed && warnings > 0 && (
        <p className="mt-3 flex items-center gap-1.5 px-2 text-xs text-warning">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {labels.warnings.count(warnings)}
        </p>
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

const rowButton =
  "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"

/** Ce qui manque à une ligne : une icône, son sens dans l'infobulle (et lu). */
function Warning({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            aria-label={label}
            className="flex size-6 shrink-0 items-center justify-center text-warning"
          />
        }
      >
        <TriangleAlert aria-hidden className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Le menu « … » d'une ligne du plan : Dupliquer, Enregistrer dans Mes blocs, Supprimer. */
function RowActions({
  label,
  onDuplicate,
  onSaveToMine,
  onRemove,
  removeBlocked,
}: {
  label: string
  onDuplicate: () => void
  onSaveToMine?: () => void
  onRemove: () => void
  removeBlocked: string | null
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={labels.actions(label)}
            className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy />
          {labels.duplicate}
        </DropdownMenuItem>
        {onSaveToMine && (
          <DropdownMenuItem onClick={onSaveToMine}>
            <BookmarkPlus />
            {labels.saveToMine}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={removeBlocked !== null}
          onClick={onRemove}
        >
          <Trash2 />
          {labels.remove}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

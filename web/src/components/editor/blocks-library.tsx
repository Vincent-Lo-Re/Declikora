import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { cn } from "cn"
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
} from "lucide-react"
import { useRef, useState, type DragEvent } from "react"
import { Link } from "react-router"

import { StaticBlock } from "@/blocks/components/static-block"
import { insertableBlocks, type InsertableType } from "@/blocks/registry"
import { templateInsertable } from "@/blocks/templates"
import type { Block } from "@/blocks/types"
import { LoadState } from "@/components/load-state"
import { SearchInput } from "@/components/search-input"
import { buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  encodeLibraryDrag,
  LIBRARY_DRAG_TYPE,
  type LibraryDrag,
} from "@/lib/editor/library-drag"
import { focusSoon } from "@/lib/focus"
import {
  countUses,
  savedBlocks,
  type SavedFilter,
} from "@/lib/contents/saved-blocks"
import {
  listTemplateUses,
  listTemplates,
  templateKeys,
  type TemplateItem,
} from "@/lib/contents/templates"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.library
const mine = labels.mine

const filters: SavedFilter[] = ["all", "style", "shared"]

/** Glisser un bloc vers l'aperçu (qui le dépose à la place montrée). */
function startDrag(event: DragEvent, drag: LibraryDrag) {
  event.dataTransfer.setData(LIBRARY_DRAG_TYPE, encodeLibraryDrag(drag))
  event.dataTransfer.effectAllowed = "copy"
}

/**
 * L'onglet « Blocs » de l'éditeur du Fil (ADMIN § 4) : Texte, Image et Encadré, puis « Mes
 * blocs » (mises en forme et blocs partagés), qui glisse un panneau par-dessus la colonne. Un clic
 * ajoute le bloc sous le bloc choisi, ou à la fin.
 */
export function BlocksLibrary({
  editable,
  canAdd,
  onAdd,
  onInsert,
  open,
  onOpenChange,
}: {
  editable: boolean
  // Faux : on ne peut plus rien ajouter au premier niveau.
  canAdd: boolean
  onAdd: (type: InsertableType) => void
  onInsert: (template: TemplateItem) => void
  // Le panneau « Mes blocs » (ouvert aussi par « / » dans un texte vide).
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const opener = useRef<HTMLButtonElement>(null)
  const templates = useQuery({
    queryKey: templateKeys.list,
    queryFn: listTemplates,
  })
  const count = templates.data
    ? savedBlocks(templates.data, "all", "").length
    : null
  const disabled = !editable || !canAdd

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="h-full space-y-4 overflow-y-auto px-4 py-3"
        // Caché (et hors du clavier) pendant que « Mes blocs » le recouvre.
        inert={open}
      >
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
        <section aria-labelledby="blocs-de-base" className="space-y-2">
          <h3 id="blocs-de-base" className="text-sm font-semibold">
            {labels.basics}
          </h3>
          <ul className="grid grid-cols-3 gap-2">
            {insertableBlocks.map((definition) => (
              <li key={definition.type}>
                <button
                  type="button"
                  disabled={disabled}
                  draggable={!disabled}
                  onDragStart={(event) =>
                    startDrag(event, { kind: "block", type: definition.type })
                  }
                  aria-label={labels.addLabel(definition.label)}
                  className="flex w-full flex-col items-center gap-1.5 rounded-lg border bg-background px-1 py-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:bg-muted disabled:opacity-50"
                  onClick={() => onAdd(definition.type)}
                >
                  <definition.icon aria-hidden className="size-5" />
                  {definition.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <button
          ref={opener}
          type="button"
          aria-expanded={open}
          aria-controls="mes-blocs"
          className="flex w-full items-center gap-3 rounded-lg border bg-background p-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 hover:bg-muted"
          onClick={() => onOpenChange(true)}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
            <Bookmark aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{mine.title}</span>
            {count !== null && (
              <span className="block text-xs text-muted-foreground">
                {mine.count(count)}
              </span>
            )}
          </span>
          <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
        </button>
      </div>
      {open && (
        <SavedBlocksPanel
          templates={templates}
          disabled={disabled}
          onBack={() => {
            onOpenChange(false)
            focusSoon(() => opener.current)
          }}
          onInsert={onInsert}
        />
      )}
    </div>
  )
}

/** Le panneau « Mes blocs », par-dessus la colonne : recherche, filtres, aperçu de chaque bloc. */
function SavedBlocksPanel({
  templates,
  disabled,
  onBack,
  onInsert,
}: {
  templates: UseQueryResult<TemplateItem[]>
  disabled: boolean
  onBack: () => void
  onInsert: (template: TemplateItem) => void
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<SavedFilter>("all")
  // Le nombre de contenus qui citent chaque bloc partagé.
  const uses = useQuery({
    queryKey: templateKeys.allUses,
    queryFn: () => listTemplateUses(),
  })
  const counts = uses.data ? countUses(uses.data) : null
  const shown = templates.data
    ? savedBlocks(templates.data, filter, search)
    : []
  const none = templates.data
    ? savedBlocks(templates.data, "all", "").length === 0
    : false

  return (
    <section
      id="mes-blocs"
      aria-labelledby="mes-blocs-titre"
      className="absolute inset-0 flex flex-col bg-background motion-safe:animate-in motion-safe:slide-in-from-left-4"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) onBack()
      }}
    >
      <div className="flex items-center gap-1 px-2.5 pt-2">
        <button
          type="button"
          aria-label={mine.back}
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          onClick={onBack}
        >
          <ArrowLeft />
        </button>
        <h3 id="mes-blocs-titre" className="text-sm font-semibold">
          {mine.title}
        </h3>
      </div>
      <div className="space-y-2 px-4 pt-3 pb-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          label={mine.searchLabel}
          placeholder={mine.search}
          autoFocus
        />
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label={mine.filters.label}
          value={[filter]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next === "all" || next === "style" || next === "shared") {
              setFilter(next)
            }
          }}
        >
          {filters.map((value) => (
            <ToggleGroupItem key={value} value={value} className="text-xs">
              {mine.filters[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {templates.data === undefined ? (
          <LoadState
            query={templates}
            failed={texts.templates.insert.loadFailed}
            rowClassName="h-24 w-full"
          />
        ) : none ? (
          <p className="text-sm text-muted-foreground">{mine.empty}</p>
        ) : shown.length === 0 ? (
          <p role="status" className="text-sm text-muted-foreground">
            {mine.noResult}
          </p>
        ) : (
          <ul className="space-y-2">
            {shown.map((template) => (
              <li key={template.id}>
                <SavedBlock
                  template={template}
                  uses={counts?.get(template.id) ?? 0}
                  disabled={disabled}
                  onInsert={() => onInsert(template)}
                />
              </li>
            ))}
          </ul>
        )}
        <Link
          to={sections.templates.path}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-2 text-muted-foreground"
          )}
        >
          <ExternalLink />
          {mine.manage}
        </Link>
      </div>
    </section>
  )
}

/** Un bloc enregistré : un aperçu réduit, son nom, et ce qu'il devient une fois ajouté. */
function SavedBlock({
  template,
  uses,
  disabled,
  onInsert,
}: {
  template: TemplateItem
  uses: number
  disabled: boolean
  onInsert: () => void
}) {
  const name = template.title.trim() || texts.templates.list.untitled
  const empty = templateInsertable(template) === "empty"
  const shared = template.sort === "shared"
  // Un bloc partagé : l'icône de Modèles de bloc, dans le menu.
  const Icon = shared ? sections.templates.icon : Copy
  return (
    <button
      type="button"
      disabled={disabled || empty}
      draggable={!disabled && !empty}
      onDragStart={(event) =>
        startDrag(event, { kind: "template", id: template.id })
      }
      aria-label={mine.insertLabel(name)}
      className="w-full rounded-lg border bg-background p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:border-foreground/30 disabled:opacity-60"
      onClick={onInsert}
    >
      <div aria-hidden className="blocks-mini">
        {template.draft.blocks.map((block) => (
          <MiniBlock key={block.id} block={block} />
        ))}
      </div>
      <span className="mt-2 flex items-center gap-1.5 text-sm font-medium">
        <Icon aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{name}</span>
      </span>
      <span className="block text-xs text-muted-foreground">
        {empty
          ? texts.templates.insert.emptyTemplate
          : shared
            ? mine.shared(uses)
            : mine.style}
      </span>
    </button>
  )
}

/**
 * Un bloc dans l'aperçu réduit : le texte tel qu'il est (sans éditeur), une image par son icône
 * (ses fichiers ne sont pas lus ici), un encadré avec ses blocs.
 */
function MiniBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <StaticBlock block={block} />
    case "image":
      return (
        <div className="blocks-image-placeholder flex items-center justify-center">
          <ImageIcon className="size-6" />
        </div>
      )
    case "box":
      return (
        <div className="blocks-box" data-look={block.look}>
          <div className="blocks-box-list">
            {block.blocks.map((child) => (
              <MiniBlock key={child.id} block={child} />
            ))}
          </div>
        </div>
      )
    case "linked":
      return null
  }
}

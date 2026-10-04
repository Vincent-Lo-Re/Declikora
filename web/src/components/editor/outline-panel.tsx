import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Copy,
  CornerLeftUp,
  EllipsisVertical,
  GripVertical,
  LayoutTemplate,
  ListChecks,
  ListTree,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

import { BlockSummary, DragChip } from "@/blocks/components/block-summary"
import type { BlockMedia } from "@/blocks/components/context"
import {
  DraggingTypeContext,
  useBlockDrag,
} from "@/blocks/components/use-block-drag"
import { zoneId, type DropData } from "@/blocks/dnd"
import { flattenBlocks } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry } from "@/blocks/registry"
import {
  ROOT,
  type Block,
  type BoxBlock,
  type ContainerId,
  type Draft,
} from "@/blocks/types"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { ColumnHeader } from "@/components/editor/column-header"
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
import type { BlockWarning } from "@/lib/editor/outline"
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

/**
 * Le plan de l'éditeur du Fil (ADMIN § 4, « Les finitions », « Le plan retouché ») : les blocs
 * seulement (l'image de présentation se règle dans la colonne de droite), chacun par son contenu
 * (l'icône dit le type), une vignette par image, les sections repliables, ce qui manque en icône
 * (le détail dans son infobulle), un menu ⋮ par ligne, et le survol partagé avec l'aperçu.
 */
export type FeedOutline = {
  // Le fichier d'une image : sa vignette et son nom.
  mediaFor: (mediaId: string | null) => BlockMedia
  // Le bloc survolé, ici ou dans l'aperçu.
  hoveredId: string | null
  onHover: (id: string | null) => void
  warningOf: (block: Block) => BlockWarning | null
  // Ranger les lignes par glisser-déposer (absent en lecture seule).
  onMove?: (update: (draft: Draft) => Draft) => void
  // Le plan vide : « Ajouter un bloc » ouvre les Blocs (absent en lecture seule).
  onAdd?: () => void
  // Une section vide : « Ajouter dans la section » ouvre les Blocs pour elle (absent en lecture
  // seule).
  onAddInBox?: (boxId: string) => void
  // Absent en lecture seule.
  actions?: {
    onDuplicate: (id: string) => void
    // Un bloc de premier niveau, qui n'est pas déjà un bloc partagé ; pas dans un modèle de bloc.
    onSaveToMine?: (id: string) => void
    onRemove: (id: string) => void
    // Un bloc d'une section : il en sort, juste après elle.
    onLeaveBox: (id: string) => void
    // Pourquoi un bloc ne peut pas être supprimé, sinon null.
    removeBlocked: (id: string) => string | null
    // Le premier niveau est plein (un bloc partagé n'a qu'un bloc, [D11]) : « Dupliquer » un
    // bloc de premier niveau et « Sortir de la section » sont grisés.
    rootFull: boolean
  }
  // Nombre maximal de blocs au premier niveau (un bloc partagé) : le plan n'y range pas plus.
  rootLimit?: number
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
  // Les sections repliées (éditeur du Fil).
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const all = flattenBlocks(draft)
  const choosing = selection?.active ?? false
  // Éditeur du Fil : les lignes se rangent par glisser-déposer (pas pendant « Choisir des
  // blocs »), avec les règles de l'aperçu.
  const sortable = feed?.onMove !== undefined && !choosing
  const drag = useBlockDrag({
    draft,
    onChange: feed?.onMove ?? keep,
    rootLimit: feed?.rootLimit,
  })
  const shared: RowShared = {
    // Le plan se range (éditeur du Fil, brouillon tenu) : un DndContext à lui, avec son annonce.
    dnd: feed?.onMove !== undefined,
    selectedId,
    onSelect,
    templateName,
    selection,
    choosing,
    feed,
    sortable,
    collapsed,
    toggleCollapsed: (id) =>
      setCollapsed((current) => {
        const next = new Set(current)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
  }
  const count = selection
    ? draft.blocks.filter((block) => selection.chosen.has(block.id)).length
    : 0
  // « Choisir des blocs » (pour « Enregistrer comme modèle »), à droite du titre.
  const selectButton = selection && all.length > 0 && (
    <Button
      variant="ghost"
      size="xs"
      aria-pressed={choosing}
      onClick={selection.onToggleActive}
    >
      {choosing ? <X /> : <ListChecks />}
      {choosing ? saveAs.stopSelecting : saveAs.select}
    </Button>
  )
  const navRef = useRef<HTMLElement>(null)
  // Le bloc choisi ailleurs (aperçu, « Prêt à publier ? ») : sa ligne vient sous les yeux.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [selectedId])
  return (
    <nav
      ref={navRef}
      aria-label={labels.title}
      // Les lignes alignées sur la marge de 16 px des colonnes (comme les en-têtes et les cartes) ;
      // leur poignée apparaît dans cette marge.
      className={cn(
        "flex h-full flex-col overflow-y-auto px-4",
        feed ? "pb-3" : "py-3"
      )}
    >
      {/* Éditeur du Fil : le haut du plan (titre, « Choisir des blocs », nombre) reste en haut de
          la colonne quand les lignes défilent, sur un fond plein qui couvre aussi la marge ; son
          titre est un en-tête de la hauteur de celui de droite. */}
      <div className={cn(feed && "sticky top-0 z-10 -mx-4 bg-background px-4")}>
        {feed ? (
          <ColumnHeader
            icon={ListTree}
            title={labels.title}
            className="-mx-4 mb-2"
          >
            {selectButton}
          </ColumnHeader>
        ) : (
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <h2 className="text-sm font-semibold">{labels.title}</h2>
            {selectButton}
          </div>
        )}
        {/* Sans bloc, « Aucun bloc pour l'instant » le dit déjà. */}
        {feed && all.length > 0 && (
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            {/* Les blocs du premier niveau : une section donne le nombre des siens. Les points à
                vérifier sont sur leurs lignes (et dans « Prêt à publier ? »). */}
            {labels.count(draft.blocks.length)}
          </p>
        )}
        {choosing && (
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            {saveAs.selectHint}
          </p>
        )}
      </div>
      {all.length === 0 ? (
        <div className="grid gap-3 px-2">
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
          {feed?.onAdd && (
            <AddBlockButton
              label={texts.editor.add.label}
              onClick={feed.onAdd}
            />
          )}
        </div>
      ) : (
        (() => {
          const list = (
            <ol className="grid gap-0.5">
              {draft.blocks.map((block) => (
                <Row
                  key={block.id}
                  block={block}
                  container={ROOT}
                  shared={shared}
                />
              ))}
            </ol>
          )
          if (!shared.dnd) return list
          return (
            <DndContext {...drag.dndProps}>
              <DraggingTypeContext value={drag.active?.type ?? null}>
                <SortableContext
                  id={ROOT}
                  items={draft.blocks.map((block) => block.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {list}
                </SortableContext>
              </DraggingTypeContext>
              <DragOverlay dropAnimation={null}>
                {drag.active ? (
                  <DragChip>
                    {feed ? (
                      <BlockSummary
                        block={drag.active}
                        media={
                          drag.active.type === "image"
                            ? feed.mediaFor(drag.active.mediaId)
                            : null
                        }
                        templateName={templateName(drag.active)}
                      />
                    ) : (
                      blockLabel(drag.active, templateName(drag.active))
                    )}
                  </DragChip>
                ) : null}
              </DragOverlay>
            </DndContext>
          )
        })()
      )}
      {choosing && selection && (
        <div className="mt-3 border-t pt-3">
          <Button
            size="sm"
            className="w-full"
            disabled={count === 0}
            onClick={selection.onSave}
          >
            <BookmarkPlus />
            {saveAs.withCount(count)}
          </Button>
        </div>
      )}
    </nav>
  )
}

// Rien à ranger (plan d'un autre éditeur, ou lecture seule).
const keep = () => {}

type RowShared = {
  dnd: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  templateName: (block: Block) => string | null
  selection?: OutlineSelection
  choosing: boolean
  feed?: FeedOutline
  sortable: boolean
  collapsed: ReadonlySet<string>
  toggleCollapsed: (id: string) => void
}

/**
 * Une ligne du plan : le bloc (et, pour une section dépliée, ses blocs). Dans l'éditeur du Fil, elle se range par sa poignée, comme dans l'aperçu.
 */
type RowProps = { block: Block; container: ContainerId; shared: RowShared }

/** Une ligne, déplaçable seulement là où le plan se range (éditeur du Fil). */
function Row(props: RowProps) {
  return props.shared.dnd ? (
    <SortableRow {...props} />
  ) : (
    <OutlineRow {...props} />
  )
}

function SortableRow(props: RowProps) {
  const { block, container, shared } = props
  const draggingType = useContext(DraggingTypeContext)
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { kind: "block", type: block.type, container } satisfies DropData,
    attributes: { roleDescription: texts.editor.dnd.roleDescription },
    disabled: {
      draggable: !shared.sortable,
      // Pendant le déplacement d'une section, les blocs des sections ne sont plus des cibles.
      droppable:
        container !== ROOT &&
        draggingType !== null &&
        draggingType !== "text" &&
        draggingType !== "image",
    },
  })
  const label = blockLabel(block, shared.templateName(block))
  return (
    <OutlineRow
      {...props}
      rowRef={setNodeRef}
      // La position pendant un glisser-déposer (dnd-kit), posée en style par la ligne.
      rowStyle={{ transform: CSS.Translate.toString(transform), transition }}
      dragging={isDragging}
      handle={
        shared.sortable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={texts.editor.handle(label)}
            // Au début de la ligne, centrée sur elle ; toujours devinée (pâle), franche au survol.
            className="absolute top-1/2 left-0 flex h-7 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground opacity-40 group-hover/row:text-foreground group-hover/row:opacity-100 hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        )
      }
    />
  )
}

function OutlineRow({
  block,
  container,
  shared,
  rowRef,
  rowStyle,
  dragging = false,
  handle,
}: RowProps & {
  rowRef?: (element: HTMLElement | null) => void
  rowStyle?: CSSProperties
  dragging?: boolean
  // La poignée (seulement là où le plan se range).
  handle?: ReactNode
}) {
  const { selectedId, onSelect, selection, choosing, feed } = shared
  const definition = block.type === "linked" ? null : blockRegistry[block.type]
  const Icon = definition?.icon ?? LayoutTemplate
  const label = blockLabel(block, shared.templateName(block))
  const checkable = choosing && container === ROOT
  const warning = feed?.warningOf(block) ?? null
  const isCollapsed = shared.collapsed.has(block.id)
  const warningId = useId()
  return (
    <li
      ref={rowRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={rowStyle}
      className={cn("grid gap-0.5", dragging && "opacity-40")}
    >
      <div
        className={cn(
          "group/row relative flex min-w-0 items-center gap-1 rounded-md",
          // La place de la poignée, au début de la ligne.
          shared.sortable && "pl-5"
        )}
        onPointerEnter={feed && (() => feed.onHover(block.id))}
        onPointerLeave={feed && (() => feed.onHover(null))}
      >
        {handle}
        {checkable && selection && (
          <Checkbox
            className="mx-1.5"
            aria-label={saveAs.selectBlock(label)}
            checked={selection.chosen.has(block.id)}
            onCheckedChange={(checked) => selection.onChoose(block.id, checked)}
          />
        )}
        {/* Éditeur du Fil : un seul fond pour la ligne, son chevron et son menu (survol, ligne
            choisie), sans la poignée. */}
        <div
          className={cn(
            "relative flex min-w-0 flex-1 items-center gap-1 rounded-md",
            feed &&
              (selectedId === block.id
                ? "bg-accent"
                : feed.hoveredId === block.id && "bg-accent/60")
          )}
        >
          <button
            type="button"
            aria-label={labels.select(label)}
            aria-current={selectedId === block.id || undefined}
            // Retrouvée par « N points à vérifier dans le plan », qui l'allume.
            data-outline-id={block.id}
            aria-describedby={warning ? warningId : undefined}
            onClick={() => onSelect(block.id)}
            className={cn(
              rowButton,
              // Ailleurs, le fond est celui du bouton ; dans le Fil, celui de la ligne entière.
              !feed && "hover:bg-accent",
              selectedId === block.id &&
                cn("font-medium", !feed && "bg-accent"),
              // Le menu « ⋮ » s'affiche au bout de la ligne (avant le chevron d'une section, qui ne
              // bouge pas) : la ligne lui fait place, rien n'est caché dessous.
              feed?.actions &&
                "group-focus-within/row:pr-8 group-hover/row:pr-8"
            )}
          >
            {feed ? (
              <BlockSummary
                block={block}
                media={
                  block.type === "image" ? feed.mediaFor(block.mediaId) : null
                }
                templateName={shared.templateName(block)}
                warning={
                  warning && (
                    <Tooltip>
                      <TooltipTrigger
                        render={<span className="flex shrink-0 text-warning" />}
                      >
                        <TriangleAlert aria-hidden className="size-4" />
                        <span id={warningId} className="sr-only">
                          {labels.warnings[warning]}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {labels.warnings[warning]}
                      </TooltipContent>
                    </Tooltip>
                  )
                }
              />
            ) : (
              <>
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </button>
          {/* Déplier, replier une section : au bout de sa ligne, toujours à la même place. */}
          {feed && block.type === "box" && (
            <Button
              variant="ghost"
              size="icon-xs"
              // Pas de fond une fois déplié (aria-expanded) : celui de la ligne ; au survol, le
              // même gris que la ligne choisie.
              className="mr-1 shrink-0 text-muted-foreground hover:bg-accent aria-expanded:bg-transparent aria-expanded:text-muted-foreground aria-expanded:hover:bg-accent"
              aria-expanded={!isCollapsed}
              aria-label={
                isCollapsed ? labels.expand(label) : labels.collapse(label)
              }
              onClick={() => shared.toggleCollapsed(block.id)}
            >
              {isCollapsed ? <ChevronRight /> : <ChevronDown />}
            </Button>
          )}
          {feed?.actions && (
            <RowActions
              label={label}
              onDuplicate={() => feed.actions!.onDuplicate(block.id)}
              duplicateBlocked={feed.actions.rootFull && container === ROOT}
              onSaveToMine={
                container === ROOT &&
                block.type !== "linked" &&
                feed.actions.onSaveToMine
                  ? () => feed.actions!.onSaveToMine?.(block.id)
                  : undefined
              }
              onLeaveBox={
                container !== ROOT
                  ? () => feed.actions!.onLeaveBox(block.id)
                  : undefined
              }
              leaveBlocked={feed.actions.rootFull}
              onRemove={() => feed.actions!.onRemove(block.id)}
              beforeToggle={block.type === "box"}
              removeBlocked={feed.actions.removeBlocked(block.id)}
            />
          )}
        </div>
      </div>
      {block.type === "box" && !isCollapsed && (
        <BoxRows box={block} shared={shared} />
      )}
    </li>
  )
}

/** Les blocs d'une section dépliée. */
function BoxRows({ box, shared }: { box: BoxBlock; shared: RowShared }) {
  if (shared.dnd) return <DroppableBoxRows box={box} shared={shared} />
  return (
    <ol className={cn("grid gap-0.5", shared.choosing ? "pl-11" : "pl-5")}>
      {box.blocks.map((child) => (
        <Row key={child.id} block={child} container={box.id} shared={shared} />
      ))}
    </ol>
  )
}

/** Les blocs d'une section dépliée, avec sa zone de dépôt (pour une section vide). */
function DroppableBoxRows({
  box,
  shared,
}: {
  box: BoxBlock
  shared: RowShared
}) {
  const draggingType = useContext(DraggingTypeContext)
  const { setNodeRef, isOver } = useDroppable({
    id: zoneId(box.id),
    data: { kind: "zone", container: box.id } satisfies DropData,
    disabled:
      !shared.sortable ||
      (draggingType !== null &&
        draggingType !== "text" &&
        draggingType !== "image"),
  })
  return (
    <SortableContext
      id={box.id}
      items={box.blocks.map((child) => child.id)}
      strategy={verticalListSortingStrategy}
    >
      <ol
        ref={setNodeRef}
        className={cn(
          "grid min-h-2 gap-0.5 rounded-md",
          shared.feed
            ? // Le trait part du début des lignes (après la place des poignées).
              cn("border-l pl-1.5", shared.choosing ? "ml-9" : "ml-5")
            : shared.choosing
              ? "pl-11"
              : "pl-5",
          isOver && box.blocks.length === 0 && "outline-2 outline-ring/60"
        )}
      >
        {box.blocks.map((child) => (
          <Row
            key={child.id}
            block={child}
            container={box.id}
            shared={shared}
          />
        ))}
        {/* Une section vide : le même bouton que dans le téléphone (une ligne du plan peut
            aussi y être glissée). */}
        {shared.feed?.onAddInBox && box.blocks.length === 0 && (
          <li>
            <AddBlockButton
              label={texts.editor.add.inBox}
              onClick={() => shared.feed!.onAddInBox!(box.id)}
            />
          </li>
        )}
      </ol>
    </SortableContext>
  )
}

// scroll-mt-20 : une ligne amenée sous les yeux ne passe pas sous le haut collé du plan.
const rowButton =
  "flex min-w-0 flex-1 scroll-mt-20 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Le menu ⋮ d'une ligne du plan : Dupliquer, Enregistrer comme modèle…, Sortir de la section,
 * Supprimer.
 */
function RowActions({
  label,
  onDuplicate,
  duplicateBlocked,
  onSaveToMine,
  onLeaveBox,
  leaveBlocked,
  onRemove,
  removeBlocked,
  beforeToggle = false,
}: {
  label: string
  // Une section : le menu s'affiche juste avant son chevron, qui ne bouge pas.
  beforeToggle?: boolean
  onDuplicate: () => void
  // Le premier niveau est plein : la copie n'y aurait pas sa place, ni le bloc qui sort.
  duplicateBlocked: boolean
  onSaveToMine?: () => void
  onLeaveBox?: () => void
  leaveBlocked: boolean
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
            // Par-dessus la fin de la ligne : il ne prend pas de place au libellé.
            className={cn(
              // Sur le fond de la ligne, sans fond à lui : la ligne lui fait place.
              "absolute top-1 opacity-0 group-hover/row:opacity-100 hover:bg-accent focus-visible:opacity-100 aria-expanded:bg-accent aria-expanded:opacity-100",
              beforeToggle ? "right-8" : "right-1"
            )}
          />
        }
      >
        <EllipsisVertical />
      </DropdownMenuTrigger>
      {/* La largeur de ses libellés, pas celle du bouton « ⋮ ». */}
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuItem disabled={duplicateBlocked} onClick={onDuplicate}>
          <Copy />
          {labels.duplicate}
        </DropdownMenuItem>
        {onSaveToMine && (
          <DropdownMenuItem onClick={onSaveToMine}>
            <BookmarkPlus />
            {saveAs.action}
          </DropdownMenuItem>
        )}
        {onLeaveBox && (
          <DropdownMenuItem disabled={leaveBlocked} onClick={onLeaveBox}>
            <CornerLeftUp />
            {labels.leaveBox}
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

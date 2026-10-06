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
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty"
import {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
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
  back,
}: {
  draft: Draft
  selectedId: string | null
  onSelect: (id: string) => void
  // Le nom du modèle d'un bloc lié, s'il est connu.
  templateName?: (block: Block) => string | null
  // Absent : pas de « Enregistrer comme modèle » (lecture seule, éditeur d'un modèle).
  selection?: OutlineSelection
  feed: FeedOutline
  // La flèche de retour, à gauche de l'en-tête du plan.
  back?: ReactNode
}) {
  const all = flattenBlocks(draft)
  const choosing = selection?.active ?? false
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
  return (
    <nav
      aria-label={labels.title}
      // Les lignes alignées sur la marge de 16 px des colonnes (comme les en-têtes et les cartes) ;
      // leur poignée apparaît dans cette marge.
      className="flex h-full flex-col overflow-y-auto px-4 pb-3"
    >
      {/* Le haut du plan (retour, titre, « Choisir des blocs », nombre) reste en haut de la
          colonne quand les lignes défilent, sur un fond plein qui couvre aussi la marge ; son titre
          est un en-tête de la hauteur de celui de droite. */}
      <div className="sticky top-0 z-10 -mx-4 bg-background px-4">
        <ColumnHeader
          icon={ListTree}
          title={labels.title}
          back={back}
          className="-mx-4 mb-2"
        >
          {selectButton}
        </ColumnHeader>
        {/* Sans bloc, « Aucun bloc pour l'instant » le dit déjà. */}
        {all.length > 0 && (
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
      <OutlineBlocks
        draft={draft}
        selectedId={selectedId}
        onSelect={onSelect}
        templateName={templateName}
        selection={selection}
        feed={feed}
      />
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

/**
 * Les lignes du plan des blocs d'un contenu (OutlinePanel). Rangées par glisser-déposer quand le brouillon est tenu
 * (feed.onMove) ; sans bloc, « Aucun bloc pour l'instant » et « Ajouter un bloc ».
 */
function OutlineBlocks({
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
  templateName?: (block: Block) => string | null
  selection?: OutlineSelection
  feed: FeedOutline
}) {
  // Les sections repliées.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const all = flattenBlocks(draft)
  const choosing = selection?.active ?? false
  // Les lignes se rangent par glisser-déposer (pas pendant « Choisir des blocs »).
  const sortable = feed.onMove !== undefined && !choosing
  const drag = useBlockDrag({
    draft,
    onChange: feed.onMove ?? keep,
    rootLimit: feed.rootLimit,
  })
  const shared: RowShared = {
    // Le plan se range (brouillon tenu) : un DndContext à lui, avec son annonce.
    dnd: feed.onMove !== undefined,
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
  const listRef = useRef<HTMLDivElement>(null)
  // Le bloc choisi ailleurs (aperçu, « Prêt à publier ? ») : sa ligne vient sous les yeux.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [selectedId])
  if (all.length === 0) {
    return (
      <Empty className="p-2">
        <EmptyDescription>{labels.empty}</EmptyDescription>
        {feed.onAdd && (
          <EmptyContent>
            <AddBlockButton
              label={texts.editor.add.label}
              onClick={feed.onAdd}
            />
          </EmptyContent>
        )}
      </Empty>
    )
  }
  const list = (
    <SidebarMenu className="gap-0.5">
      {draft.blocks.map((block) => (
        <Row key={block.id} block={block} container={ROOT} shared={shared} />
      ))}
    </SidebarMenu>
  )
  return (
    // Les lignes du menu (SidebarMenu de shadcn), sur la colonne blanche.
    <div ref={listRef} className="sidebar-on-white">
      {shared.dnd ? (
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
                <BlockSummary
                  block={drag.active}
                  media={
                    drag.active.type === "image"
                      ? feed.mediaFor(drag.active.mediaId)
                      : null
                  }
                  templateName={templateName(drag.active)}
                />
              </DragChip>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        list
      )}
    </div>
  )
}

// Rien à ranger (lecture seule).
const keep = () => {}

type RowShared = {
  dnd: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  templateName: (block: Block) => string | null
  selection?: OutlineSelection
  choosing: boolean
  feed: FeedOutline
  sortable: boolean
  collapsed: ReadonlySet<string>
  toggleCollapsed: (id: string) => void
}

/** Une ligne du plan : le bloc (et, pour une section dépliée, ses blocs). */
type RowProps = { block: Block; container: ContainerId; shared: RowShared }

/** Une ligne, déplaçable par sa poignée quand le plan se range (brouillon tenu). */
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
          <Button
            variant="ghost"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={texts.editor.handle(label)}
            // Au début de la ligne, centrée sur elle ; toujours devinée (pâle), franche au survol.
            className="absolute top-1/2 left-0 h-7 w-4 -translate-y-1/2 cursor-grab touch-none p-0 text-muted-foreground opacity-50 group-hover/menu-item:text-foreground group-hover/menu-item:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          >
            <GripVertical aria-hidden />
          </Button>
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
  const label = blockLabel(block, shared.templateName(block))
  const checkable = choosing && container === ROOT
  const warning = feed.warningOf(block)
  const isCollapsed = shared.collapsed.has(block.id)
  const warningId = useId()
  return (
    <SidebarMenuItem
      ref={rowRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={rowStyle}
      className={cn("grid gap-0.5", dragging && "opacity-50")}
    >
      {/* Le groupe du survol est la ligne seule (pas les blocs d'une section dessous) : son menu
          « ⋮ » n'apparaît qu'au survol de sa ligne. */}
      <div
        className={cn(
          "group/menu-item relative flex min-w-0 items-center gap-1",
          // La place de la poignée, au début de la ligne.
          shared.sortable && "pl-5"
        )}
        onPointerEnter={() => feed.onHover(block.id)}
        onPointerLeave={() => feed.onHover(null)}
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
        <SidebarMenuButton
          isActive={selectedId === block.id}
          aria-label={labels.select(label)}
          aria-current={selectedId === block.id || undefined}
          // Retrouvée par « N points à vérifier dans le plan », qui l'allume.
          data-outline-id={block.id}
          aria-describedby={warning ? warningId : undefined}
          onClick={() => onSelect(block.id)}
          className={cn(
            "h-auto min-h-8 flex-1 scroll-mt-20 py-1.5",
            // Survolé dans le téléphone : la ligne s'allume à moitié.
            selectedId !== block.id &&
              feed.hoveredId === block.id &&
              "bg-sidebar-accent/60",
            // Le chevron d'une section et le menu « ⋮ » (au survol) se posent au bout de la ligne :
            // elle leur fait place, rien n'est caché dessous.
            block.type === "box" && "pr-8",
            feed.actions &&
              (block.type === "box"
                ? "group-focus-within/menu-item:pr-14 group-hover/menu-item:pr-14"
                : "group-focus-within/menu-item:pr-8 group-hover/menu-item:pr-8")
          )}
        >
          <BlockSummary
            block={block}
            media={block.type === "image" ? feed.mediaFor(block.mediaId) : null}
            templateName={shared.templateName(block)}
            warning={
              warning && (
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="flex shrink-0 text-warning" />}
                  >
                    <TriangleAlert aria-hidden />
                    <span id={warningId} className="sr-only">
                      {labels.warnings[warning]}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{labels.warnings[warning]}</TooltipContent>
                </Tooltip>
              )
            }
          />
        </SidebarMenuButton>
        {/* Déplier, replier une section : au bout de sa ligne, toujours à la même place. */}
        {block.type === "box" && (
          <SidebarMenuAction
            aria-expanded={!isCollapsed}
            aria-label={
              isCollapsed ? labels.expand(label) : labels.collapse(label)
            }
            onClick={() => shared.toggleCollapsed(block.id)}
          >
            {isCollapsed ? <ChevronRight /> : <ChevronDown />}
          </SidebarMenuAction>
        )}
        {feed.actions && (
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
      {block.type === "box" && !isCollapsed && (
        <BoxRows box={block} shared={shared} />
      )}
    </SidebarMenuItem>
  )
}

// Les blocs d'une section (SidebarMenuSub de shadcn) : un trait qui part du début des lignes
// (après la place des poignées).
const boxRowsClass = (shared: RowShared) =>
  cn("mr-0 min-h-2 gap-0.5 pr-0 pl-1.5", shared.choosing ? "ml-9" : "ml-5")

/** Les blocs d'une section dépliée. */
function BoxRows({ box, shared }: { box: BoxBlock; shared: RowShared }) {
  if (shared.dnd) return <DroppableBoxRows box={box} shared={shared} />
  return (
    <SidebarMenuSub className={boxRowsClass(shared)}>
      {box.blocks.map((child) => (
        <Row key={child.id} block={child} container={box.id} shared={shared} />
      ))}
    </SidebarMenuSub>
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
      <SidebarMenuSub
        ref={setNodeRef}
        className={cn(
          boxRowsClass(shared),
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
        {shared.feed.onAddInBox && box.blocks.length === 0 && (
          <li>
            <AddBlockButton
              label={texts.editor.add.inBox}
              onClick={() => shared.feed.onAddInBox?.(box.id)}
            />
          </li>
        )}
      </SidebarMenuSub>
    </SortableContext>
  )
}

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
  const reasonId = useId()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuAction
            showOnHover
            aria-label={labels.actions(label)}
            // Une section : juste avant son chevron, qui ne bouge pas.
            className={cn(beforeToggle && "right-7")}
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
          aria-describedby={removeBlocked ? reasonId : undefined}
          onClick={onRemove}
        >
          <Trash2 />
          {labels.remove}
        </DropdownMenuItem>
        {/* Grisé : pourquoi, juste dessous (un bloc partagé utilisé garde son bloc). */}
        {removeBlocked && (
          <p
            id={reasonId}
            className="max-w-64 px-2 pt-0.5 pb-1.5 text-xs text-muted-foreground"
          >
            {removeBlocked}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

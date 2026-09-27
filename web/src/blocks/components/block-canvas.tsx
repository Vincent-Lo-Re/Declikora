import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import { GripVertical, Plus } from "lucide-react"
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { ImageBlockView } from "@/blocks/components/image-block"
import { TextBlockView } from "@/blocks/components/text-block"
import {
  blocksCollision,
  moveOnDrop,
  moveOver,
  targetContainer,
  zoneId,
  type DropData,
} from "@/blocks/dnd"
import { findBlock } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { insertableBlocks } from "@/blocks/registry"
import {
  ROOT,
  type Block,
  type BlockType,
  type BoxBlock,
  type ContainerId,
  type Draft,
} from "@/blocks/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { texts } from "@/texts"

/**
 * Les blocs de l'aperçu, avec le glisser-déposer : un SortableContext pour la page et un par
 * encadré. Le déplacement part toujours de la poignée (jamais du bloc entier) : Espace et
 * Entrée tapés dans un texte restent au texte.
 */
export function BlockCanvas({
  draft,
  onChange,
}: {
  draft: Draft
  onChange: (update: (draft: Draft) => Draft) => void
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  // Le brouillon au début du déplacement : remis tel quel si on annule (Échap).
  const before = useRef<Draft | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Les annonces lisent le brouillon du moment (il change pendant le déplacement).
  const announcements = useMemo(() => makeAnnouncements(draft), [draft])

  const active = activeId ? findBlock(draft, activeId)?.block : null

  // Dernière cible trouvée, et vrai juste après un changement de conteneur : le temps que
  // l'aperçu se redessine, on garde la même cible (sinon le bloc repartirait aussitôt).
  const lastOver = useRef<UniqueIdentifier | null>(null)
  const justMoved = useRef(false)
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (justMoved.current && lastOver.current !== null) {
      return [{ id: lastOver.current }]
    }
    const found = blocksCollision(args)
    if (found.length > 0) {
      lastOver.current = found[0].id
      return found
    }
    return lastOver.current !== null ? [{ id: lastOver.current }] : []
  }, [])

  const onDragStart = ({ active: started }: DragStartEvent) => {
    before.current = draft
    lastOver.current = null
    setActiveId(String(started.id))
  }

  const onDragOver = ({ active: moving, over }: DragOverEvent) => {
    if (!over) return
    const translated = moving.rect.current.translated
    const below = translated
      ? translated.top + translated.height / 2 >
        over.rect.top + over.rect.height / 2
      : false
    const moved = moveOver(draft, moving.id, over.id, below)
    if (!moved) return
    justMoved.current = true
    lastOver.current = moving.id
    requestAnimationFrame(() => {
      justMoved.current = false
    })
    onChange(() => moved)
  }

  const onDragEnd = ({ active: moved, over }: DragEndEvent) => {
    setActiveId(null)
    before.current = null
    lastOver.current = null
    if (!over) return
    onChange((current) => moveOnDrop(current, moved.id, over.id) ?? current)
  }

  const onDragCancel = () => {
    setActiveId(null)
    lastOver.current = null
    const snapshot = before.current
    before.current = null
    if (snapshot) onChange(() => snapshot)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: texts.editor.dnd.instructions },
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <DraggingTypeContext value={active?.type ?? null}>
        <SortableContext
          id={ROOT}
          items={draft.blocks.map((block) => block.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="blocks-list">
            {draft.blocks.map((block) => (
              <SortableBlock key={block.id} block={block} container={ROOT} />
            ))}
          </div>
        </SortableContext>
      </DraggingTypeContext>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 font-sans text-sm text-popover-foreground shadow-md">
            <GripVertical
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            {blockLabel(active)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// Le type du bloc en cours de déplacement : les cibles interdites se désactivent.
const DraggingTypeContext = createContext<BlockType | null>(null)

function containerLabel(draft: Draft, container: ContainerId): string {
  if (container === ROOT) return texts.editor.dnd.page
  const index = findBlock(draft, container)?.index ?? 0
  return texts.editor.dnd.box(index + 1)
}

function labelOf(draft: Draft, id: UniqueIdentifier): string {
  const block = findBlock(draft, String(id))?.block
  return block ? blockLabel(block) : ""
}

/** Annonces en français pour les lecteurs d'écran. */
function makeAnnouncements(draft: Draft): Announcements {
  const dnd = texts.editor.dnd
  return {
    onDragStart: ({ active }) => dnd.start(labelOf(draft, active.id)),
    onDragOver: ({ active, over }) => {
      const label = labelOf(draft, active.id)
      // Le bloc au-dessus de sa propre place (au début, ou juste après un changement
      // d'encadré) : rien de neuf à dire, et « Tu as pris… » n'est pas écrasé.
      if (over?.id === active.id) return undefined
      if (!over) return dnd.outside(label)
      const container = targetContainer(draft, over.id)
      if (!container) return dnd.outside(label)
      const data = over.data.current as DropData | undefined
      // La zone de l'encadré où le bloc est déjà : rien de neuf non plus.
      const place = findBlock(draft, String(active.id))
      if (data?.kind === "zone" && place?.container === container)
        return undefined
      if (data?.kind === "zone") {
        return dnd.overZone(label, containerLabel(draft, container))
      }
      return dnd.over(
        label,
        labelOf(draft, over.id),
        containerLabel(draft, container)
      )
    },
    onDragEnd: ({ active, over }) => {
      const label = labelOf(draft, active.id)
      const place = findBlock(draft, String(active.id))
      if (!over || !place) return dnd.endOutside(label)
      return dnd.end(label, containerLabel(draft, place.container))
    },
    onDragCancel: ({ active }) => dnd.cancel(labelOf(draft, active.id)),
  }
}

/** Un bloc déplaçable : la poignée à gauche, le bloc lui-même dans l'aperçu. */
const SortableBlock = memo(function SortableBlock({
  block,
  container,
}: {
  block: Block
  container: ContainerId
}) {
  const { editable, selectedId, selectBlock } = useBlocksEditor()
  const draggingType = useContext(DraggingTypeContext)
  const data: DropData = { kind: "block", type: block.type, container }
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
    data,
    attributes: { roleDescription: texts.editor.dnd.roleDescription },
    disabled: {
      draggable: !editable,
      // Pendant le déplacement d'un encadré, les blocs des encadrés ne sont plus des cibles.
      droppable:
        container !== ROOT &&
        draggingType !== null &&
        draggingType !== "text" &&
        draggingType !== "image",
    },
  })
  const label = blockLabel(block)
  const selected = selectedId === block.id

  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      data-block-type={block.type}
      data-selected={selected || undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "group/block relative rounded-sm outline-offset-4 outline-ring/70",
        selected && "outline-2",
        !selected && editable && "hover:outline-1 hover:outline-border",
        isDragging && "opacity-40"
      )}
      onPointerDownCapture={() => selectBlock(block.id)}
      onFocusCapture={() => selectBlock(block.id)}
    >
      {editable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          data-block-handle
          {...attributes}
          {...listeners}
          aria-label={texts.editor.handle(label)}
          title={texts.editor.handle(label)}
          className={cn(
            "absolute top-0 -left-9 flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded-md font-sans text-muted-foreground opacity-0 transition-opacity group-hover/block:opacity-100 hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing",
            selected && "opacity-100"
          )}
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
      <BlockBody block={block} />
    </div>
  )
})

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <TextBlockView block={block} />
    case "image":
      return <ImageBlockView block={block} />
    case "box":
      return <BoxBlockView block={block} />
    case "linked":
      return (
        <div className="rounded-md border border-dashed p-3 font-sans text-sm text-muted-foreground">
          {texts.editor.settings.linked}
        </div>
      )
  }
}

/** Un encadré : sa zone de dépôt, ses blocs (Texte et Image), et « Ajouter dans l'encadré ». */
const BoxBlockView = memo(function BoxBlockView({
  block,
}: {
  block: BoxBlock
}) {
  const { editable, addToBox } = useBlocksEditor()
  const draggingType = useContext(DraggingTypeContext)
  const { setNodeRef, isOver } = useDroppable({
    id: zoneId(block.id),
    data: { kind: "zone", container: block.id } satisfies DropData,
    disabled:
      draggingType !== null &&
      draggingType !== "text" &&
      draggingType !== "image",
  })
  return (
    <div className="blocks-box" data-look={block.look}>
      <SortableContext
        id={block.id}
        items={block.blocks.map((child) => child.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "blocks-box-list rounded-sm",
            isOver && block.blocks.length === 0 && "outline-2 outline-ring/60"
          )}
        >
          {block.blocks.map((child) => (
            <SortableBlock key={child.id} block={child} container={block.id} />
          ))}
          {block.blocks.length === 0 && (
            <p className="font-sans text-sm text-muted-foreground">
              {texts.editor.emptyBox}
            </p>
          )}
        </div>
      </SortableContext>
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 -ml-2 font-sans text-muted-foreground"
              />
            }
          >
            <Plus />
            {texts.editor.add.inBox}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {insertableBlocks
              .filter((definition) => definition.allowedInBox)
              .map((definition) => (
                <DropdownMenuItem
                  key={definition.type}
                  onClick={() =>
                    addToBox(block.id, definition.type as "text" | "image")
                  }
                >
                  <definition.icon />
                  {definition.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
})

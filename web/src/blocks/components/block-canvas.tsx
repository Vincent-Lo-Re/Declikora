import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "cn"
import { GripVertical, Plus } from "lucide-react"
import { memo, useContext, useMemo } from "react"
import { Link } from "react-router"

import { BlockSummary, DragChip } from "@/blocks/components/block-summary"
import {
  BlocksEditorContext,
  templateNameOf,
  useBlocksEditor,
} from "@/blocks/components/context"
import { ImageBlockView } from "@/blocks/components/image-block"
import { StaticBlock } from "@/blocks/components/static-block"
import { TextBlockView } from "@/blocks/components/text-block"
import {
  DraggingTypeContext,
  useBlockDrag,
} from "@/blocks/components/use-block-drag"
import { zoneId, type DropData } from "@/blocks/dnd"
import { blockLabel } from "@/blocks/labels"
import { insertableBlocks } from "@/blocks/registry"
import {
  ROOT,
  type Block,
  type BoxBlock,
  type ContainerId,
  type Draft,
  type LinkedBlock,
} from "@/blocks/types"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { editorPath, sections } from "@/navigation"
import { texts } from "@/texts"

/**
 * Les blocs de l'aperçu, avec le glisser-déposer : un SortableContext pour la page et un par
 * encadré. Le déplacement part toujours de la poignée (jamais du bloc entier) : Espace et
 * Entrée tapés dans un texte restent au texte.
 */
export function BlockCanvas({
  draft,
  onChange,
  rootLimit,
}: {
  draft: Draft
  onChange: (update: (draft: Draft) => Draft) => void
  // Nombre maximal de blocs au premier niveau (1 dans un bloc identique partout, [D11]) : un
  // bloc ne sort pas d'un encadré s'il faut dépasser ce nombre.
  rootLimit?: number
}) {
  const { dndProps, active } = useBlockDrag({ draft, onChange, rootLimit })
  const { mediaFor, templateFor } = useBlocksEditor()

  return (
    <DndContext {...dndProps}>
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
          // Le bloc tenu, résumé comme dans le plan (icône et contenu).
          <DragChip>
            <BlockSummary
              block={active}
              media={active.type === "image" ? mediaFor(active.mediaId) : null}
              templateName={
                active.type === "linked"
                  ? templateNameOf(templateFor(active.templateId))
                  : null
              }
            />
          </DragChip>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * Un bloc déplaçable : la poignée dans la marge à gauche (de l'écran, ou de l'encadré), le bloc
 * lui-même dans l'aperçu. La poignée et le contour de survol ne s'allument que pour le bloc le
 * plus intérieur sous la souris (preview.css).
 */
const SortableBlock = memo(function SortableBlock({
  block,
  container,
}: {
  block: Block
  container: ContainerId
}) {
  const { editable, selectedId, selectBlock, templateFor, withoutHandles } =
    useBlocksEditor()
  // Éditeur du Fil : le plan range les blocs, l'aperçu n'a pas de poignée.
  const handle = editable && !withoutHandles
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
      draggable: !handle,
      // Pendant le déplacement d'un encadré, les blocs des encadrés ne sont plus des cibles.
      droppable:
        container !== ROOT &&
        draggingType !== null &&
        draggingType !== "text" &&
        draggingType !== "image",
    },
  })
  const label = blockLabel(
    block,
    block.type === "linked"
      ? templateNameOf(templateFor(block.templateId))
      : null
  )
  const selected = selectedId === block.id

  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      data-block-type={block.type}
      data-selected={selected || undefined}
      data-sortable={handle || undefined}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "relative rounded-sm outline-offset-4 outline-ring/70",
        selected && "outline-2",
        isDragging && "opacity-40"
      )}
      onPointerDownCapture={() => selectBlock(block.id)}
      onFocusCapture={() => selectBlock(block.id)}
    >
      {handle && (
        // La marge à gauche du bloc, sur toute sa hauteur : la poignée y reste visible quand on
        // fait défiler un long bloc (preview.css).
        <span className="blocks-handle-rail">
          {/* Pendant un déplacement, l'infobulle se ferme : Échap doit annuler le déplacement. */}
          <Tooltip disabled={isDragging}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  ref={setActivatorNodeRef}
                  data-block-handle
                  {...attributes}
                  {...listeners}
                  aria-label={texts.editor.handle(label)}
                  // Place et visibilité : .blocks-handle (preview.css).
                  className="blocks-handle cursor-grab touch-none items-center justify-center rounded-sm font-sans text-muted-foreground transition-opacity hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                />
              }
            >
              <GripVertical aria-hidden className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{texts.editor.handle(label)}</TooltipContent>
          </Tooltip>
        </span>
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
      return <LinkedBlockView block={block} />
  }
}

/**
 * Un bloc lié (bloc identique partout) : le bloc de son modèle tel quel, encadré d'un liseré,
 * non modifiable sur place, avec « Modifier le modèle » et « Détacher ».
 */
const LinkedBlockView = memo(function LinkedBlockView({
  block,
}: {
  block: LinkedBlock
}) {
  const editor = useBlocksEditor()
  const { editable, templateFor, detachBlock, linkedWithoutBar } = editor
  const template = templateFor(block.templateId)
  // Le bloc du modèle se lit ici sans pouvoir s'y modifier.
  const readOnly = useMemo(() => ({ ...editor, editable: false }), [editor])
  const labels = texts.templates.linked
  const name =
    template.state === "ready" || template.state === "empty"
      ? template.name.trim() || texts.templates.list.untitled
      : null

  return (
    <div
      className="blocks-linked rounded-md outline-1 outline-offset-4 outline-primary/40 outline-dashed"
      data-linked-template={block.templateId}
      data-linked-state={template.state}
    >
      {/* Éditeur du Fil : pas de barre au-dessus du bloc, son nom est dans le plan et ses
          actions dans « Bloc choisi » ; le liseré suffit à le reconnaître. */}
      {!linkedWithoutBar && (
        <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1 font-sans text-xs text-muted-foreground">
          {/* L'icône de Modèles de bloc, dans le menu. */}
          <sections.templates.icon aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {name
              ? labels.label(name)
              : template.state === "missing"
                ? texts.editor.blockLabel.linked(null)
                : labels.loading}
          </span>
          {template.state !== "missing" && (
            <Link
              to={editorPath("templates", block.templateId)}
              aria-label={name ? labels.editLabel(name) : labels.edit}
              className={buttonVariants({ variant: "ghost", size: "xs" })}
            >
              {labels.edit}
            </Link>
          )}
          {editable && template.state === "ready" && name && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-label={labels.detachLabel(name)}
              onClick={() => detachBlock(block.id)}
            >
              {labels.detach}
            </Button>
          )}
        </div>
      )}
      {template.state === "ready" ? (
        <BlocksEditorContext value={readOnly}>
          <StaticBlock block={template.block} />
        </BlocksEditorContext>
      ) : (
        <p className="font-sans text-sm text-muted-foreground">
          {template.state === "missing"
            ? labels.missing
            : template.state === "empty"
              ? labels.empty
              : template.state === "error"
                ? texts.templates.insert.loadFailed
                : labels.loading}
        </p>
      )}
    </div>
  )
})

/**
 * Un encadré : sa zone de dépôt, ses blocs (Texte et Image), et « Ajouter dans la section » (un
 * menu, ou dans l'éditeur du Fil l'onglet Blocs).
 */
const BoxBlockView = memo(function BoxBlockView({
  block,
}: {
  block: BoxBlock
}) {
  const { editable, addToBox, onAddInBox } = useBlocksEditor()
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
      {editable && onAddInBox && (
        <AddBlockButton
          label={texts.editor.add.inBox}
          className="mt-2"
          onClick={() => onAddInBox(block.id)}
        />
      )}
      {editable && !onAddInBox && (
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

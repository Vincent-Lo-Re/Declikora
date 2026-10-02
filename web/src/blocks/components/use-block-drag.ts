import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DndContextProps,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { createContext, useCallback, useMemo, useRef, useState } from "react"

import {
  blocksCollision,
  moveOnDrop,
  moveOver,
  targetContainer,
  type DropData,
} from "@/blocks/dnd"
import { findBlock } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import {
  ROOT,
  type Block,
  type BlockType,
  type ContainerId,
  type Draft,
} from "@/blocks/types"
import { texts } from "@/texts"

// Le type du bloc en cours de déplacement : les cibles interdites se désactivent.
export const DraggingTypeContext = createContext<BlockType | null>(null)

/**
 * Le déplacement des blocs par glisser-déposer (souris et clavier, annonces en français), avec
 * les règles de blocks/dnd.ts : le même pour l'aperçu (BlockCanvas) et pour le plan de
 * l'éditeur du Fil. Le bloc change de conteneur pendant le survol ; Échap remet le brouillon
 * du début.
 */
export function useBlockDrag({
  draft,
  onChange,
  rootLimit,
}: {
  draft: Draft
  onChange: (update: (draft: Draft) => Draft) => void
  // Nombre maximal de blocs au premier niveau (1 dans un bloc identique partout, [D11]) : un
  // bloc ne sort pas d'un encadré s'il faut dépasser ce nombre.
  rootLimit?: number
}): { dndProps: DndContextProps; active: Block | null } {
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

  const active = activeId ? (findBlock(draft, activeId)?.block ?? null) : null

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

  const exceedsLimit = (next: Draft) =>
    rootLimit !== undefined &&
    next.blocks.length > rootLimit &&
    next.blocks.length > draft.blocks.length

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
    if (!moved || exceedsLimit(moved)) return
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
    onChange((current) => {
      const next = moveOnDrop(current, moved.id, over.id)
      return next && !exceedsLimit(next) ? next : current
    })
  }

  const onDragCancel = () => {
    setActiveId(null)
    lastOver.current = null
    const snapshot = before.current
    before.current = null
    if (snapshot) onChange(() => snapshot)
  }

  return {
    active,
    dndProps: {
      sensors,
      collisionDetection,
      accessibility: {
        announcements,
        screenReaderInstructions: { draggable: texts.editor.dnd.instructions },
      },
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel,
    },
  }
}

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

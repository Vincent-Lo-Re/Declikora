import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import type { ReactNode } from "react"

type Named = { id: string; name: string }

/** Ce que disent les annonces d'une liste rangée (textes de la page, dans texts.ts). */
export type SortingWords = {
  instructions: string
  start: (name: string) => string
  over: (name: string, position: number, count: number) => string
  end: (name: string, position: number, count: number) => string
  cancel: (name: string) => string
}

/** Annonces du glisser-déposer d'une liste à plat, en français, pour les lecteurs d'écran. */
function listAnnouncements(items: Named[], words: SortingWords): Announcements {
  const nameOf = (id: UniqueIdentifier) =>
    items.find((item) => item.id === id)?.name ?? ""
  const placeOf = (id: UniqueIdentifier) =>
    items.findIndex((item) => item.id === id) + 1
  return {
    onDragStart: ({ active }) => words.start(nameOf(active.id)),
    // Au-dessus de sa propre place (au début du déplacement) : rien de neuf à dire, et « Tu
    // as pris… » n'est pas écrasé.
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? words.over(nameOf(active.id), placeOf(over.id), items.length)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? words.end(nameOf(active.id), placeOf(over.id), items.length)
        : words.cancel(nameOf(active.id)),
    onDragCancel: ({ active }) => words.cancel(nameOf(active.id)),
  }
}

/**
 * Souris (après 5 px, pour garder les clics) et clavier, et le nouvel ordre à la fin d'un
 * déplacement : onReorder reçoit tous les identifiants.
 */
function useListSorting(ids: string[], onReorder: (ids: string[]) => void) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }
  return { sensors, onDragEnd }
}

/**
 * Une liste à plat rangée par glisser-déposer (Catégories, Formules, Le Fil, Radio Éclaircies) :
 * à la souris par la poignée, ou au clavier (Espace ou Entrée, flèches). Les
 * éléments (useSortable) sont dans children, dans l'ordre de items.
 */
export function SortableList({
  items,
  words,
  onReorder,
  children,
}: {
  items: Named[]
  words: SortingWords
  onReorder: (ids: string[]) => void
  children: ReactNode
}) {
  const ids = items.map((item) => item.id)
  const { sensors, onDragEnd } = useListSorting(ids, onReorder)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements: listAnnouncements(items, words),
        screenReaderInstructions: { draggable: words.instructions },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

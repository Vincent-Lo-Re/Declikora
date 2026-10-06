import { useRef, useState, type DragEvent } from "react"

import {
  decodeLibraryDrag,
  dropIndex,
  LIBRARY_DRAG_TYPE,
  type LibraryDrag,
} from "@/lib/editor/library-drag"

/**
 * Un bloc des Blocs glissé dans le téléphone de l'éditeur du Fil (glisser-déposer du
 * navigateur). Le trait qui montre où il tombera (lineTop, par rapport au téléphone), seulement au premier niveau,
 * entre deux blocs ; au dépôt, onDrop reçoit sa place. Les gestionnaires sont en capture : le
 * texte (Tiptap) ne reçoit pas le bloc glissé.
 */
export function usePhoneDrop<T extends HTMLElement = HTMLDivElement>(
  enabled: boolean,
  onDrop: (drag: LibraryDrag, index: number) => void
) {
  const phoneRef = useRef<T>(null)
  const [lineTop, setLineTop] = useState<number | null>(null)

  // La place sous le pointeur : l'index au premier niveau, et la hauteur du trait.
  const placeAt = (clientY: number) => {
    const phone = phoneRef.current
    const list = phone?.querySelector(".blocks-list")
    if (!phone || !list) return null
    const rows = [...list.children].map((row) => row.getBoundingClientRect())
    const index = dropIndex(
      rows.map((row) => row.top + row.height / 2),
      clientY
    )
    const origin = phone.getBoundingClientRect().top
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0
    const top =
      rows.length === 0
        ? list.getBoundingClientRect().top - origin
        : index < rows.length
          ? rows[index].top - origin - gap / 2
          : rows[rows.length - 1].bottom - origin + gap / 2
    return { index, top }
  }

  const handlers = {
    onDragOverCapture: enabled
      ? (event: DragEvent<T>) => {
          if (!event.dataTransfer.types.includes(LIBRARY_DRAG_TYPE)) return
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = "copy"
          setLineTop(placeAt(event.clientY)?.top ?? null)
        }
      : undefined,
    onDragLeave: (event: DragEvent<T>) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !event.currentTarget.contains(event.relatedTarget)
      ) {
        setLineTop(null)
      }
    },
    onDropCapture: enabled
      ? (event: DragEvent<T>) => {
          const drag = decodeLibraryDrag(
            event.dataTransfer.getData(LIBRARY_DRAG_TYPE)
          )
          if (!drag) return
          event.preventDefault()
          event.stopPropagation()
          const place = placeAt(event.clientY)
          setLineTop(null)
          if (place) onDrop(drag, place.index)
        }
      : undefined,
  }

  return { phoneRef, lineTop, handlers }
}

import { useRef, useState, type DragEvent } from "react"

const hasFiles = (event: DragEvent) =>
  event.dataTransfer?.types.includes("Files") ?? false

/**
 * Une zone où l'on dépose un fichier (glisser-déposer du navigateur) : `dragging` pendant qu'un
 * fichier la survole, le premier fichier déposé part à onFile. Les entrées et sorties des enfants
 * sont comptées, pour que la zone ne clignote pas.
 */
export function useFileDrop(onFile: (file: File) => void, disabled = false) {
  const depth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const handlers = {
    onDragEnter: (event: DragEvent) => {
      if (disabled || !hasFiles(event)) return
      depth.current += 1
      setDragging(true)
    },
    onDragLeave: (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    },
    onDragOver: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = disabled ? "none" : "copy"
    },
    onDrop: (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth.current = 0
      setDragging(false)
      const file = event.dataTransfer.files[0]
      if (file && !disabled) onFile(file)
    },
  }
  return { dragging, handlers }
}

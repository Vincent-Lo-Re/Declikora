import { useLayoutEffect, useRef } from "react"

/** Hauteur d'un champ de texte ajustée à son contenu (le titre). */
export function useAutoHeight(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = "auto"
    element.style.height = `${element.scrollHeight}px`
  }, [value])
  return ref
}

/** Texte simple : pas de retour à la ligne. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ")
}

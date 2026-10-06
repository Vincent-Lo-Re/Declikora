import { useEffect, useState } from "react"

import { isApple, isFocusShortcut } from "@/lib/editor/focus-mode"
import { texts } from "@/texts"

/**
 * Le mode Concentration d'un éditeur plein écran : il cache les deux colonnes (⌘ . ou Ctrl + .,
 * Échap pour en sortir) ; chaque changement est annoncé (announce). tool : ce que la barre de
 * l'aperçu en montre.
 */
export function useFocusMode(announce: (message: string) => void) {
  const [focusMode, setFocusMode] = useState(false)
  const [apple] = useState(() => isApple(navigator.platform))
  const toggle = () => {
    setFocusMode(!focusMode)
    announce(focusMode ? texts.editor.focusMode.off : texts.editor.focusMode.on)
  }
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFocusShortcut(event, apple)) {
        event.preventDefault()
        setFocusMode(!focusMode)
        announce(
          focusMode ? texts.editor.focusMode.off : texts.editor.focusMode.on
        )
      } else if (
        focusMode &&
        event.key === "Escape" &&
        !event.defaultPrevented &&
        // Échap ferme d'abord une fenêtre ou un menu ouvert.
        !document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
        )
      ) {
        setFocusMode(false)
        announce(texts.editor.focusMode.off)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [apple, focusMode, announce])
  return {
    focusMode,
    setFocusMode,
    apple,
    toggle,
    tool: {
      on: focusMode,
      shortcut: apple
        ? texts.editor.focusMode.shortcut.apple
        : texts.editor.focusMode.shortcut.other,
      keys: apple ? "Meta+." : "Control+.",
      onToggle: toggle,
    },
  }
}

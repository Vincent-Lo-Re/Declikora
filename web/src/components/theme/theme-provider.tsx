import { useEffect, useState, type ReactNode } from "react"

import {
  isTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
} from "./theme-context"

// Le choix est gardé sur le navigateur de chacun.
function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // Stockage indisponible (navigation privée…) : on suit l'ordinateur.
  }
  return "system"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches)
      document.documentElement.classList.toggle("dark", dark)
    }

    apply()
    if (theme !== "system") return
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [theme])

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Le choix vaut pour cette visite seulement.
    }
    setThemeState(next)
  }

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

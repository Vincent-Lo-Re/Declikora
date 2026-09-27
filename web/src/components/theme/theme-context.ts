import { createContext, useContext } from "react"

export type Theme = "light" | "dark" | "system"

// Même clé que public/theme.js, qui applique le thème avant l'affichage.
export const THEME_STORAGE_KEY = "declikora-theme"

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme doit être utilisé dans un ThemeProvider")
  }
  return context
}

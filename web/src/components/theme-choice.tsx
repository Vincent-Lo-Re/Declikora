import { Monitor, Moon, Sun } from "lucide-react"

import { isTheme, useTheme } from "@/components/theme/theme-context"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { texts } from "@/texts"

const options = [
  { value: "light", label: texts.theme.light, icon: Sun },
  { value: "dark", label: texts.theme.dark, icon: Moon },
  { value: "system", label: texts.theme.system, icon: Monitor },
] as const

export function ThemeChoice() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      variant="outline"
      aria-label={texts.theme.title}
      value={[theme]}
      onValueChange={(value) => {
        // Un clic sur le choix déjà actif ne le désélectionne pas.
        const next = value[0]
        if (isTheme(next)) setTheme(next)
      }}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value}>
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

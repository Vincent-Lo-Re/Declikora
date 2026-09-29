import { isTheme, useTheme } from "@/components/theme/theme-context"
import { themeOptions } from "@/components/theme/theme-options"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { texts } from "@/texts"

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
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value}>
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

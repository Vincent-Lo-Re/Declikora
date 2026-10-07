import { isTheme, useTheme } from "@/components/theme/theme-context"
import { themeOptions } from "@/components/theme/theme-options"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { texts } from "@/texts"

/** Clair, Sombre, Automatique : trois icônes, leur nom dans l'infobulle (en haut à droite de la carte Thème). */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      variant="outline"
      size="icon"
      aria-label={texts.theme.title}
      value={[theme]}
      onValueChange={(value) => {
        // Un clic sur le choix déjà actif ne le désélectionne pas.
        const next = value[0]
        if (isTheme(next)) setTheme(next)
      }}
    >
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <Tooltip key={value}>
          <TooltipTrigger
            render={<ToggleGroupItem value={value} aria-label={label} />}
          >
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  )
}

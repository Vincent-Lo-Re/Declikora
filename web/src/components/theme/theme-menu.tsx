import { useTheme, type Theme } from "@/components/theme/theme-context"
import { themeOptions } from "@/components/theme/theme-options"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

/** Le thème qui suit au clic : Clair, Sombre, Automatique, puis de nouveau Clair. */
function nextTheme(theme: Theme): Theme {
  const index = themeOptions.findIndex((option) => option.value === theme)
  return themeOptions[(index + 1) % themeOptions.length].value
}

/**
 * Le thème, à droite du header : un bouton à l'icône du thème choisi ; chaque clic passe au
 * suivant (Clair, Sombre, Automatique), sans menu. Son nom dit le thème choisi et le suivant.
 */
export function ThemeMenu() {
  const { theme, setTheme } = useTheme()
  const current =
    themeOptions.find((option) => option.value === theme) ?? themeOptions[2]
  const next = nextTheme(current.value)
  const nextLabel = themeOptions.find((option) => option.value === next)!.label
  const Icon = current.icon
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={texts.theme.switch(current.label, nextLabel)}
      onClick={() => setTheme(next)}
    >
      <Icon />
    </Button>
  )
}

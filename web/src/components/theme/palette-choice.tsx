import { cn } from "cn"
import { RotateCcw } from "lucide-react"
import { useId } from "react"

import { usePalette } from "@/components/theme/palette-context"
import { Button } from "@/components/ui/button"
import { Field, FieldTitle } from "@/components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  accentChartSwatches,
  accentSwatches,
  baseChartSwatches,
  baseInkSwatches,
  baseMenuSwatches,
  DEFAULT_PALETTE,
  palettePresets,
} from "@/lib/palettes"
import { texts } from "@/texts"

const labels = texts.colors

/**
 * Les couleurs de chacun, dans Mon compte (ADMIN § 7, « Les couleurs de chacun ») : le preset
 * d'origine et dix palettes d'une base et d'un accent, en cartes (Card de shadcn, comme le
 * nuancier des thèmes) : un nom inventé qui mêle les deux, l'effet, le gris sombre de la base et la couleur de l'accent, puis
 * les cinq couleurs des graphiques. Un clic choisit la base et l'accent d'un coup ; la carte choisie
 * ressort. Le choix s'applique tout de suite, et reste sur ce navigateur. À côté du titre,
 * « Réinitialiser » (seulement quand une autre palette est choisie) revient à la palette d'origine.
 */
export function PaletteChoice() {
  const { palette, setPalette } = usePalette()
  const titleId = useId()
  const isDefault =
    palette.base === DEFAULT_PALETTE.base &&
    palette.accent === DEFAULT_PALETTE.accent
  return (
    <Field>
      <div className="flex min-h-6 items-center justify-between gap-2">
        <FieldTitle id={titleId}>{labels.presets.title}</FieldTitle>
        {!isDefault && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setPalette(DEFAULT_PALETTE)}
          >
            <RotateCcw />
            {labels.presets.reset}
          </Button>
        )}
      </div>
      <div
        role="group"
        aria-labelledby={titleId}
        className="grid gap-3 sm:grid-cols-2"
      >
        {palettePresets.map(({ id, base, accent }) => {
          const ink =
            accent === "none" ? baseInkSwatches[base] : accentSwatches[accent]
          const charts =
            accent === "none"
              ? baseChartSwatches[base]
              : accentChartSwatches[accent]
          const chosen = palette.base === base && palette.accent === accent
          return (
            <button
              key={id}
              type="button"
              aria-pressed={chosen}
              data-preset={id}
              className="group rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => setPalette({ base, accent })}
            >
              <Card
                size="sm"
                className={cn(
                  // À la hauteur de sa rangée, même si l'autre carte a plus de texte.
                  "h-full transition-shadow group-hover:ring-foreground/25",
                  chosen && "ring-2 ring-primary group-hover:ring-primary"
                )}
              >
                <CardHeader>
                  <CardTitle>{labels.presets.names[id]}</CardTitle>
                  <CardDescription>{labels.presets.moods[id]}</CardDescription>
                </CardHeader>
                <CardContent aria-hidden className="space-y-2">
                  <div className="flex gap-2">
                    <span
                      className={cn(
                        "h-10 flex-1 rounded-lg ring-1 ring-foreground/10",
                        baseMenuSwatches[base]
                      )}
                    />
                    <span
                      className={cn(
                        "h-10 flex-1 rounded-lg ring-1 ring-foreground/10",
                        ink
                      )}
                    />
                  </div>
                  <div className="flex gap-1">
                    {charts.map((bar) => (
                      <span
                        key={bar}
                        className={cn("h-2.5 flex-1 rounded-sm", bar)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </Field>
  )
}

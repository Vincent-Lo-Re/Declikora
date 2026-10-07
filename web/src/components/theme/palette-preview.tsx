import { cn } from "cn"
import {
  FileText,
  Image,
  LayoutDashboard,
  Radio,
  Rss,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { texts } from "@/texts"

const labels = texts.colors.preview

const navIcons: LucideIcon[] = [LayoutDashboard, Rss, Radio, FileText, Image]

const statBadges = ["default", "secondary"] as const
const rowBadges = ["default", "secondary", "outline"] as const

// Les barres du graphique, aux cinq couleurs des graphiques (classes écrites en entier pour Tailwind).
const bars = [
  "h-6 bg-chart-1",
  "h-10 bg-chart-2",
  "h-8 bg-chart-3",
  "h-14 bg-chart-4",
  "h-11 bg-chart-5",
  "h-9 bg-chart-1",
  "h-12 bg-chart-2",
  "h-7 bg-chart-3",
  "h-16 bg-chart-4",
  "h-10 bg-chart-5",
]

/**
 * L'aperçu des couleurs choisies (carte Aperçu de Mon compte) : une page d'accueil de l'admin en
 * réduction, avec des contenus inventés, faite des vrais jetons et des composants shadcn. Le menu est une carte
 * sombre de la base, comme le vrai (`data-slot="sidebar-inner"` : l'accent y pose la couleur de la
 * ligne choisie), et le contenu un panneau gris avec des chiffres, un graphique et une liste.
 * On ne s'en sert pas (inert) : elle ne sert qu'à voir.
 */
export function PalettePreview() {
  return (
    <div
      aria-hidden
      inert
      className="flex gap-1.5 rounded-xl bg-background p-1.5 text-xs ring-1 ring-foreground/10"
    >
      <div
        data-slot="sidebar-inner"
        className="dark flex w-28 shrink-0 flex-col gap-0.5 rounded-lg bg-card/90 p-1.5 text-sidebar-foreground ring-1 ring-foreground/10"
      >
        <p className="px-1.5 py-1 font-medium">{labels.brand}</p>
        {labels.nav.map((name, index) => {
          const Icon = navIcons[index]
          return (
            <span
              key={name}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-1",
                index === 0 &&
                  "bg-sidebar-active font-medium text-sidebar-active-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {name}
            </span>
          )
        })}
        <span className="mt-auto flex items-center gap-1.5 rounded-md px-1.5 py-1 ring-1 ring-sidebar-foreground/15">
          <span className="flex size-5 items-center justify-center rounded-full bg-sidebar-accent">
            {labels.initial}
          </span>
          {labels.member}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-panel p-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{labels.heading}</p>
            <Button size="xs">{labels.primary}</Button>
          </div>
          <p className="text-muted-foreground">{labels.subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {labels.stats.map(({ label, value, badge }, index) => (
            <Card key={label} size="sm" className="gap-1">
              <CardHeader className="gap-0.5">
                <p className="text-muted-foreground">{label}</p>
                <p className="text-base font-medium">{value}</p>
                <Badge variant={statBadges[index]}>{badge}</Badge>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-xs">{labels.chart}</CardTitle>
          </CardHeader>
          <div className="flex h-16 items-end gap-1 px-(--card-spacing)">
            {bars.map((bar) => (
              <span key={bar} className={cn("flex-1 rounded-t-sm", bar)} />
            ))}
          </div>
        </Card>

        <Card size="sm" className="gap-1.5">
          <CardHeader>
            <CardTitle className="text-xs">{labels.list}</CardTitle>
          </CardHeader>
          {labels.rows.map(({ name, meta, badge }, index) => (
            <div
              key={name}
              className="flex items-center gap-2 px-(--card-spacing)"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                {name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{name}</span>
                <span className="block truncate text-muted-foreground">
                  {meta}
                </span>
              </span>
              <Badge variant={rowBadges[index]}>{badge}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

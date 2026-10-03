import { cn } from "cn"
import {
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  ImagePlus,
  LayoutList,
  LockOpen,
  Pencil,
  Plus,
  Tags,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState, type ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import { MediaThumbnail } from "@/components/media/media-visuals"
import { InfoTip } from "@/components/info-tip"
import { PanelCard } from "@/components/panel-card"
import {
  AddCategory,
  type SectionCategories,
} from "@/components/editor/content-settings-sheet"
import { CONTENT_TITLE_ID, CoverAlt } from "@/components/editor/presentation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isMostComplete, type AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import type { ReadyItem } from "@/lib/contents/requirements"
import { formatDateTime, formatShortDateTime } from "@/lib/dates"
import { focusSoon, highlightSoon } from "@/lib/focus"
import { texts } from "@/texts"

const labels = texts.editor.article
const access = texts.publication.settings.access
const categoryWords = texts.publication.settings.categories

// Nombres en français (« 1 000 »).
const integer = new Intl.NumberFormat("fr-FR")

// Valeurs de la liste du niveau d'accès (une formule a pour valeur son identifiant).
const NOT_CHOSEN = "pas-encore-choisi"
const FREE = "gratuit"

// Où mène chaque ligne de « Prêt à publier ? » : le réglage qui reçoit le curseur, et la zone qui
// s'allume (la carte qui le contient, ou le champ du titre lui-même).
const targets: Record<ReadyItem["key"], { control: string; zone: string }> = {
  title: { control: CONTENT_TITLE_ID, zone: `#${CONTENT_TITLE_ID}` },
  cover: {
    control: "article-image",
    zone: '[aria-labelledby="article-carte"]',
  },
  access: {
    control: "article-niveau",
    zone: '[aria-labelledby="article-niveau-titre"]',
  },
}

/**
 * L'onglet « Article » de l'éditeur du Fil (ADMIN § 4) : ce qui manque pour publier, la carte de
 * la liste du Fil (image de présentation), le niveau d'accès, les catégories, puis le
 * temps de lecture. Tout part avec le brouillon, comme dans la glissière Réglages des autres
 * éditeurs.
 */
export function ArticlePanel({
  draft,
  editable,
  settings,
  onSettingsChange,
  levels,
  levelsFailed,
  live,
  categories,
  cover,
  coverUrl,
  ready,
  warnings,
  onChooseCover,
  onRemoveCover,
}: {
  draft: Draft
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  live: LiveVersion | null
  categories: SectionCategories
  cover: BlockMedia
  coverUrl: string | undefined
  ready: ReadyItem[]
  // Les points à vérifier du plan (une section vide…), et y aller.
  warnings: { count: number; onShow: () => void }
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  return (
    <div className="space-y-3">
      <ReadyCard items={ready} warnings={warnings} />
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {texts.editor.settings.readOnly}
        </p>
      )}
      <FeedCard
        draft={draft}
        editable={editable}
        cover={cover}
        coverUrl={coverUrl}
        onChooseCover={onChooseCover}
        onRemoveCover={onRemoveCover}
      />
      <AccessCard
        settings={settings}
        editable={editable}
        levels={levels}
        levelsFailed={levelsFailed}
        live={live}
        onChange={(accessLevelId) =>
          onSettingsChange({ ...settings, accessChosen: true, accessLevelId })
        }
      />
      <CategoriesCard
        categories={categories}
        chosen={settings.categoryIds}
        editable={editable}
        onChange={(categoryIds) =>
          onSettingsChange({ ...settings, categoryIds })
        }
      />
    </div>
  )
}

/**
 * La section fixe en bas de la colonne de droite (éditeur du Fil), dans les deux onglets : le
 * temps de lecture, les mots et la dernière modification (la date complète dans l'infobulle),
 * puis les actions (le cadenas, l'état de publication et « Publier »).
 */
export function ArticleFooter({
  stats,
  savedAt,
  children,
}: {
  stats: { words: number; minutes: number }
  savedAt: string | null
  children: ReactNode
}) {
  const saved = savedAt ? formatShortDateTime(savedAt) : null
  return (
    <div className="grid shrink-0 gap-2 border-t bg-background px-4 pt-2.5 pb-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" />
          {labels.stats.short(
            stats.minutes,
            labels.stats.words(integer.format(stats.words))
          )}
        </span>
        {savedAt && saved && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  tabIndex={0}
                  className="ml-auto flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <Pencil aria-hidden className="size-3.5" />
              {saved.today
                ? labels.stats.savedAt(saved.text)
                : labels.stats.savedOn(saved.text)}
            </TooltipTrigger>
            <TooltipContent>
              {labels.stats.saved(formatDateTime(savedAt))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/**
 * « Prêt à publier ? » : toujours visible en haut ; une ligne à régler mène à son réglage. Les
 * points à vérifier du plan suivent : ils n'empêchent pas de publier, et ne comptent pas.
 */
function ReadyCard({
  items,
  warnings,
}: {
  items: ReadyItem[]
  warnings: { count: number; onShow: () => void }
}) {
  const done = items.filter((item) => item.done).length
  return (
    // Collée en haut de la colonne, sur un fond plein : rien ne défile au-dessus d'elle (la
    // colonne a une marge intérieure, que ce fond recouvre), et ce qui passe dessous garde
    // l'écart habituel : le fond le prolonge (pb-3), à la place de l'espace entre les cartes.
    <div className="sticky -top-3 z-10 -mt-3 mb-0 bg-background pt-3 pb-3">
      <section
        aria-labelledby="article-pret"
        className="rounded-xl border bg-muted p-3"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 id="article-pret" className="text-sm font-semibold">
            {labels.ready.title}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {labels.ready.count(done, items.length)}
          </span>
        </div>
        <ul>
          {items.map((item) => {
            const label = labels.ready.items[item.key]
            return (
              <li key={item.key}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={
                    item.done
                      ? labels.ready.done(label)
                      : labels.ready.todo(label)
                  }
                  onClick={() => {
                    const target = targets[item.key]
                    // La carte vient sous les yeux et s'allume ; le curseur va sur son réglage.
                    highlightSoon(() =>
                      document.querySelector<HTMLElement>(target.zone)
                    )
                    focusSoon(
                      () => document.getElementById(target.control),
                      undefined,
                      { preventScroll: true }
                    )
                  }}
                >
                  {item.done ? (
                    <CircleCheck
                      aria-hidden
                      className="size-4 text-status-live"
                    />
                  ) : (
                    <CircleAlert aria-hidden className="size-4 text-warning" />
                  )}
                  <span className="flex-1">{label}</span>
                  {!item.done && (
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                  )}
                </button>
              </li>
            )
          })}
          {warnings.count > 0 && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={warnings.onShow}
              >
                <TriangleAlert aria-hidden className="size-4 text-warning" />
                <span className="flex-1">
                  {labels.ready.warnings(warnings.count)}
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              </button>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

/**
 * La carte de l'article dans la liste du Fil : son image de présentation (la vignette, qui est
 * aussi en tête de l'article) et son titre. Pas de résumé (03/10/2026, ADMIN § 4).
 */
function FeedCard({
  draft,
  editable,
  cover,
  coverUrl,
  onChooseCover,
  onRemoveCover,
}: {
  draft: Draft
  editable: boolean
  cover: BlockMedia
  coverUrl: string | undefined
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  const file =
    cover.state === "ready" || cover.state === "not_ready" ? cover.media : null
  const chosen = cover.state !== "none"
  return (
    <PanelCard
      id="article-carte"
      icon={LayoutList}
      title={labels.feed.title}
      aside={<InfoTip text={labels.feed.hint} />}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
        {/* data-presentation-choose : là où revient le focus quand le bouton utilisé a disparu
            (choix fait depuis l'aperçu ou depuis la fenêtre Publier). */}
        <button
          type="button"
          id="article-image"
          data-presentation-choose="cover"
          disabled={!editable}
          aria-label={
            chosen ? labels.feed.replaceLabel : labels.feed.chooseLabel
          }
          className={cn(
            "flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:text-foreground",
            !file && "border border-dashed bg-background"
          )}
          onClick={onChooseCover}
        >
          {file ? (
            <MediaThumbnail
              media={file}
              url={coverUrl}
              className="size-16"
              iconClassName="size-5"
            />
          ) : (
            <>
              <ImagePlus aria-hidden className="size-5" />
              {editable && labels.feed.choose}
            </>
          )}
        </button>
        <p className="line-clamp-3 min-w-0 text-sm font-semibold">
          {draft.title.trim() || texts.common.untitled}
        </p>
      </div>
      {cover.state === "missing" && (
        <p className="mt-2 text-xs text-destructive">
          {texts.editor.presentation.cover.missing}
        </p>
      )}
      {cover.state === "not_ready" && (
        <p className="mt-2 text-xs text-destructive">
          {texts.editor.presentation.cover.notReady}
        </p>
      )}
      <div className="mt-2 space-y-2">
        <CoverAlt cover={cover} />
        {editable && chosen && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => {
              onRemoveCover()
              // « Retirer » disparaît : le focus passe à la vignette, juste au-dessus.
              document.getElementById("article-image")?.focus()
            }}
          >
            <X />
            {texts.editor.presentation.cover.remove}
          </Button>
        )}
      </div>
    </PanelCard>
  )
}

/** Le niveau d'accès, dans une liste : « Pas encore choisi » tant que rien n'est choisi ([D41]). */
function AccessCard({
  settings,
  editable,
  levels,
  levelsFailed,
  live,
  onChange,
}: {
  settings: ContentSettings
  editable: boolean
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  live: LiveVersion | null
  onChange: (levelId: string | null) => void
}) {
  const value = settings.accessChosen
    ? (settings.accessLevelId ?? FREE)
    : NOT_CHOSEN
  const items = [
    ...(settings.accessChosen
      ? []
      : [{ value: NOT_CHOSEN, label: access.notChosenShort }]),
    { value: FREE, label: access.free },
    ...(levels ?? []).map((level) => ({ value: level.id, label: level.name })),
  ]
  const liveLevel = live
    ? live.access_level_id === null
      ? access.free
      : (levels?.find((level) => level.id === live.access_level_id)?.name ??
        access.deleted)
    : null
  return (
    <PanelCard id="article-niveau-titre" icon={LockOpen} title={access.label}>
      {levels === undefined ? (
        levelsFailed ? (
          <p role="alert" className="text-sm text-destructive">
            {access.loadFailed}
          </p>
        ) : (
          <Skeleton className="h-8 w-full" />
        )
      ) : (
        <Select
          items={items}
          value={value}
          disabled={!editable}
          onValueChange={(next) => {
            if (next === null || next === NOT_CHOSEN) return
            onChange(next === FREE ? null : next)
          }}
        >
          <SelectTrigger
            id="article-niveau"
            // Pas encore choisi : le « ! » et le bord orangé de « Prêt à publier ? ».
            className={cn(
              "w-full",
              !settings.accessChosen && "border-warning/60"
            )}
            aria-labelledby="article-niveau-titre"
          >
            {!settings.accessChosen && (
              <CircleAlert aria-hidden className="text-warning" />
            )}
            <SelectValue
              className={cn(
                !settings.accessChosen && "flex-1 text-muted-foreground"
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                value={item.value}
                disabled={item.value === NOT_CHOSEN}
              >
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {/* Pas encore choisi : la liste le dit elle-même ; ensuite, ce que le niveau ouvre. */}
      {settings.accessChosen && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {settings.accessLevelId === null
            ? access.freeHint
            : levels && isMostComplete(levels, settings.accessLevelId)
              ? access.levelHintTop
              : access.levelHint}
        </p>
      )}
      {levels?.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{access.noLevels}</p>
      )}
      {liveLevel && (
        <p className="mt-1 text-xs text-muted-foreground">
          {access.live(liveLevel)}
        </p>
      )}
    </PanelCard>
  )
}

/**
 * Les catégories en pastilles (une pastille foncée est choisie), dans l'ordre de la section.
 * Une catégorie supprimée entre-temps n'est plus montrée, et part de la liste au prochain
 * changement ([D28]). « Nouvelle » la crée tout de suite, puis la choisit.
 */
function CategoriesCard({
  categories,
  chosen,
  editable,
  onChange,
}: {
  categories: SectionCategories
  chosen: string[]
  editable: boolean
  onChange: (categoryIds: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const list = categories.list
  const toggle = (id: string) => {
    if (!list) return
    const known = new Set(list.map((category) => category.id))
    const next = new Set(chosen.filter((other) => known.has(other)))
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange([...next].sort())
  }
  return (
    <PanelCard id="article-categories" icon={Tags} title={categoryWords.label}>
      {list === undefined ? (
        categories.failed ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-destructive">
              {categoryWords.loadFailed}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={categories.retry}
            >
              {texts.common.retry}
            </Button>
          </div>
        ) : (
          <Skeleton className="h-7 w-40" />
        )
      ) : (
        <ul
          aria-labelledby="article-categories"
          className="flex flex-wrap gap-1.5"
        >
          {list.map((category) => {
            const on = chosen.includes(category.id)
            return (
              <li key={category.id}>
                <Button
                  type="button"
                  size="xs"
                  variant={on ? "default" : "outline"}
                  className="rounded-full"
                  aria-pressed={on}
                  disabled={!editable}
                  onClick={() => toggle(category.id)}
                >
                  {on && <Check />}
                  {category.name}
                </Button>
              </li>
            )
          })}
          {editable && !adding && (
            <li>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="rounded-full border-dashed text-muted-foreground"
                aria-expanded={false}
                onClick={() => setAdding(true)}
              >
                <Plus />
                {labels.categories.add}
              </Button>
            </li>
          )}
        </ul>
      )}
      {list?.length === 0 && !adding && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {categoryWords.none}
        </p>
      )}
      {editable && adding && list !== undefined && (
        <div className="mt-2.5">
          <AddCategory
            section={categories.section}
            autoFocus
            onAdded={(category) => {
              onChange([...chosen, category.id].sort())
              setAdding(false)
            }}
          />
        </div>
      )}
    </PanelCard>
  )
}

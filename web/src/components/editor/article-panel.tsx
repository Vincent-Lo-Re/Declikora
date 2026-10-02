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
  X,
} from "lucide-react"
import { useState, type ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { FEED_SUMMARY_MAX } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import { MediaThumbnail } from "@/components/media/media-visuals"
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
import { Textarea } from "@/components/ui/textarea"
import { isMostComplete, type AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import type { ReadyItem } from "@/lib/contents/requirements"
import { formatDateTime } from "@/lib/dates"
import { focusSoon } from "@/lib/focus"
import { texts } from "@/texts"

const labels = texts.editor.article
const access = texts.publication.settings.access
const categoryWords = texts.publication.settings.categories

// Nombres en français (« 1 000 »).
const integer = new Intl.NumberFormat("fr-FR")

// Valeurs de la liste du niveau d'accès (une formule a pour valeur son identifiant).
const NOT_CHOSEN = "pas-encore-choisi"
const FREE = "gratuit"

// Où mène chaque ligne de « Prêt à publier ? ».
const targets: Record<ReadyItem["key"], string> = {
  title: CONTENT_TITLE_ID,
  cover: "article-image",
  access: "article-niveau",
}

/**
 * L'onglet « Article » de l'éditeur du Fil (ADMIN § 4) : ce qui manque pour publier, la carte de
 * la liste du Fil (image de présentation et résumé), le niveau d'accès, les catégories, puis le
 * temps de lecture. Tout part avec le brouillon, comme dans la glissière Réglages des autres
 * éditeurs.
 */
export function ArticlePanel({
  draft,
  editable,
  settings,
  onSettingsChange,
  onSummaryChange,
  levels,
  levelsFailed,
  live,
  categories,
  cover,
  coverUrl,
  ready,
  stats,
  savedAt,
  onChooseCover,
  onRemoveCover,
}: {
  draft: Draft
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  onSummaryChange: (summary: string) => void
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  live: LiveVersion | null
  categories: SectionCategories
  cover: BlockMedia
  coverUrl: string | undefined
  ready: ReadyItem[]
  stats: { words: number; minutes: number }
  savedAt: string | null
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  return (
    <div className="space-y-3">
      <ReadyCard items={ready} />
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
        onSummaryChange={onSummaryChange}
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
      <div className="space-y-1 px-1 pb-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5">
          <Clock aria-hidden className="size-3.5" />
          {labels.stats.reading(stats.minutes)} ·{" "}
          {labels.stats.words(integer.format(stats.words))}
        </p>
        {savedAt && (
          <p className="flex items-center gap-1.5">
            <Pencil aria-hidden className="size-3.5" />
            {labels.stats.saved(formatDateTime(savedAt))}
          </p>
        )}
      </div>
    </div>
  )
}

/** « Prêt à publier ? » : toujours visible en haut ; une ligne à régler mène à son réglage. */
function ReadyCard({ items }: { items: ReadyItem[] }) {
  const done = items.filter((item) => item.done).length
  return (
    // Collée en haut de la colonne, sur un fond plein : rien ne défile au-dessus d'elle (la
    // colonne a une marge intérieure, que ce fond recouvre).
    <div className="sticky -top-3 z-10 -mt-3 bg-background pt-3">
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
                  onClick={() =>
                    focusSoon(() => document.getElementById(targets[item.key]))
                  }
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
        </ul>
      </section>
    </div>
  )
}

/** Une carte de l'onglet, avec son titre et son icône. */
function PanelCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string
  icon: typeof Tags
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="rounded-xl border p-3">
      <h3
        id={id}
        className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold"
      >
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * La carte de l'article dans la liste du Fil : on y choisit l'image de présentation (la vignette,
 * qui est aussi en tête de l'article), et le résumé, qui ne sert qu'à cette carte, s'écrit dessous.
 */
function FeedCard({
  draft,
  editable,
  cover,
  coverUrl,
  onChooseCover,
  onRemoveCover,
  onSummaryChange,
}: {
  draft: Draft
  editable: boolean
  cover: BlockMedia
  coverUrl: string | undefined
  onChooseCover: () => void
  onRemoveCover: () => void
  onSummaryChange: (summary: string) => void
}) {
  const summary = draft.summary ?? ""
  const file =
    cover.state === "ready" || cover.state === "not_ready" ? cover.media : null
  const chosen = cover.state !== "none"
  return (
    <PanelCard id="article-carte" icon={LayoutList} title={labels.feed.title}>
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
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {draft.title.trim() || texts.common.untitled}
          </p>
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {summary.trim() || labels.feed.summaryEmpty}
          </p>
        </div>
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
        <p className="text-xs text-muted-foreground">{labels.feed.hint}</p>
      </div>
      <div className="mt-3 space-y-1.5">
        <label htmlFor="article-resume" className="block text-sm font-medium">
          {labels.summary.label}{" "}
          <span className="font-normal text-muted-foreground">
            · {labels.summary.optional}
          </span>
        </label>
        <Textarea
          id="article-resume"
          value={summary}
          maxLength={FEED_SUMMARY_MAX}
          readOnly={!editable}
          placeholder={labels.summary.placeholder}
          aria-describedby="article-resume-compte"
          onChange={(event) =>
            onSummaryChange(
              event.target.value
                .replace(/\s*\n\s*/g, " ")
                .slice(0, FEED_SUMMARY_MAX)
            )
          }
        />
        <p
          id="article-resume-compte"
          className="flex justify-between text-xs text-muted-foreground tabular-nums"
        >
          <span>{labels.summary.ideal}</span>
          <span>{labels.summary.count(summary.length, FEED_SUMMARY_MAX)}</span>
        </p>
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
            className="w-full"
            aria-labelledby="article-niveau-titre"
          >
            <SelectValue />
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
      <p
        className={cn(
          "mt-1.5 text-xs",
          settings.accessChosen ? "text-muted-foreground" : "text-warning"
        )}
      >
        {!settings.accessChosen
          ? access.notChosen
          : settings.accessLevelId === null
            ? access.freeHint
            : levels && isMostComplete(levels, settings.accessLevelId)
              ? access.levelHintTop
              : access.levelHint}
      </p>
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

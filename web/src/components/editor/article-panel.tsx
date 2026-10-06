import { cn } from "cn"
import {
  type LucideIcon,
  AudioLines,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock,
  Headphones,
  ImagePlus,
  KeyRound,
  LayoutList,
  Link2,
  Pencil,
  Plus,
  Tags,
  TriangleAlert,
  X,
} from "lucide-react"
import { useState, type ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import { MediaFileLink } from "@/components/media/media-file-link"
import { MediaThumbnail } from "@/components/media/media-visuals"
import { InfoTip } from "@/components/info-tip"
import { LoadState } from "@/components/load-state"
import { PanelCard } from "@/components/panel-card"
import {
  AddCategory,
  type SectionCategories,
} from "@/components/editor/content-settings-sheet"
import { CoverAlt } from "@/components/editor/presentation"
import { SlugField } from "@/components/editor/slug-field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  isMostComplete,
  liveLevelName,
  type AccessLevel,
} from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import type { ReadyItem } from "@/lib/contents/requirements"
import { formatDateTime, formatShortDateTime } from "@/lib/dates"
import type { RefusedSlug } from "@/lib/contents/slug"
import {
  contentProfile,
  isListedKind,
  type ListedKind,
  type PublishedKind,
} from "@/lib/editor/profile"
import { READY_IDS, showReadySetting } from "@/lib/editor/ready-targets"
import { focusSoon } from "@/lib/focus"
import { formatDuration } from "@/lib/media/format"
import { texts } from "@/texts"

const labels = texts.editor.article
const access = texts.publication.settings.access
const categoryWords = texts.publication.settings.categories
const audioWords = texts.editor.presentation.audio
const slugWords = texts.publication.settings.slug

// Nombres en français (« 1 000 »).
const integer = new Intl.NumberFormat("fr-FR")

// Valeurs de la liste du niveau d'accès (une formule a pour valeur son identifiant).
const NOT_CHOSEN = "pas-encore-choisi"
const FREE = "gratuit"

// Carte Audio d'un épisode : la place de l'audio, qui le choisit tant qu'il n'y en a pas.
const AUDIO_CHOOSE_ID = "article-audio-choisir"

// Une mesure du bas de la colonne (lecture, dernière modification) : son détail dans l'infobulle,
// au survol comme au clavier.
const statTrigger =
  "flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * L'Article (l'Épisode, la Page), dans la colonne de droite de l'éditeur du Fil (ADMIN § 4) :
 * ce qui manque pour publier, la carte de la liste (image de présentation), l'audio d'un
 * épisode, l'adresse d'une page, le niveau d'accès et les catégories. Tout part avec le
 * brouillon.
 */
export function ArticlePanel({
  kind,
  draft,
  editable,
  reading = false,
  contentId,
  settings,
  onSettingsChange,
  refusedSlug,
  levels,
  levelsFailed,
  retryLevels,
  live,
  categories,
  cover,
  audio,
  ready,
  warnings,
  onChooseCover,
  onRemoveCover,
  onChooseAudio,
  onRemoveAudio,
}: {
  kind: PublishedKind
  contentId: string
  draft: Draft
  editable: boolean
  // En Lecture : rien ne se modifie, on ne prend pas la main (QCM du 04/10/2026).
  reading?: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  // Une page : la dernière adresse refusée par l'enregistrement (prise ou invalide).
  refusedSlug: RefusedSlug | null
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
  live: LiveVersion | null
  // Les catégories de la section ; null pour une sorte sans catégories (une page).
  categories: SectionCategories | null
  cover: BlockMedia
  // L'audio d'un épisode ; null pour une sorte sans audio.
  audio: BlockMedia | null
  ready: ReadyItem[]
  // Les points à vérifier du plan (une section vide…), et y aller.
  warnings: { count: number; onShow: () => void }
  onChooseCover: () => void
  onRemoveCover: () => void
  onChooseAudio: () => void
  onRemoveAudio: () => void
}) {
  // Une page n'est dans aucune liste de l'app : ni carte, ni image de présentation.
  const listed = isListedKind(kind) ? kind : null
  return (
    <div className="space-y-3">
      <ReadyCard
        items={ready}
        warnings={warnings}
        onChooseAudio={onChooseAudio}
      />
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {reading
            ? texts.editor.preview.reading
            : texts.editor.settings.readOnly}
        </p>
      )}
      {listed && (
        <CoverCard
          kind={listed}
          draft={draft}
          editable={editable}
          cover={cover}
          onChooseCover={onChooseCover}
          onRemoveCover={onRemoveCover}
        />
      )}
      {audio && (
        <AudioCard
          audio={audio}
          editable={editable}
          onChoose={onChooseAudio}
          onRemove={onRemoveAudio}
        />
      )}
      {contentProfile(kind).address && (
        <PanelCard
          id={READY_IDS.address.card}
          icon={Link2}
          title={slugWords.label}
          aside={<InfoTip text={slugWords.description} />}
        >
          <SlugField
            id={READY_IDS.address.control}
            contentId={contentId}
            slug={settings.slug}
            title={draft.title}
            editable={editable}
            live={live}
            refused={refusedSlug}
            inCard
            onCommit={(slug) => onSettingsChange({ ...settings, slug })}
          />
        </PanelCard>
      )}
      <AccessCard
        settings={settings}
        editable={editable}
        levels={levels}
        levelsFailed={levelsFailed}
        retryLevels={retryLevels}
        live={live}
        onChange={(accessLevelId) =>
          onSettingsChange({ ...settings, accessChosen: true, accessLevelId })
        }
      />
      {categories && (
        <CategoriesCard
          categories={categories}
          chosen={settings.categoryIds}
          editable={editable}
          onChange={(categoryIds) =>
            onSettingsChange({ ...settings, categoryIds })
          }
        />
      )}
    </div>
  )
}

/**
 * La section fixe en bas de la colonne de droite (éditeur du Fil) : l'état de l'enregistrement
 * (une icône), le temps de lecture (un épisode : la durée de son audio) et les mots, la dernière
 * modification (le détail dans les infobulles), puis les actions (le cadenas, l'état de
 * publication et « Publier »).
 */
/** Une mesure du bas de la colonne : son icône, en court, et en entier dans l'infobulle. */
type Measure = { Icon: LucideIcon; short: string; tip: string }

export function ArticleFooter({
  stats,
  audio,
  savedAt,
  saveStatus,
  children,
}: {
  stats: { words: number; minutes: number }
  // Un épisode : son audio, dont la durée remplace le temps de lecture.
  audio: BlockMedia | null
  savedAt: string | null
  // L'état de l'enregistrement, en icône (son infobulle dit l'état et l'heure).
  saveStatus: ReactNode
  children: ReactNode
}) {
  const saved = savedAt ? formatShortDateTime(savedAt) : null
  const words = labels.stats.words(integer.format(stats.words))
  const length: Measure = audio
    ? audioLength(audio, words)
    : {
        Icon: Clock,
        short: labels.stats.short(stats.minutes, words),
        tip: labels.stats.readingTip(stats.minutes, words),
      }
  return (
    // data-feed-footer : les messages passent au-dessus (index.css).
    <div
      data-feed-footer
      className="grid h-feed-footer shrink-0 content-center gap-2 border-t bg-background px-4"
    >
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {/* L'icône à la taille de celles de la ligne. */}
        <span className="flex [&_svg]:size-3.5">{saveStatus}</span>
        <Tooltip>
          <TooltipTrigger
            render={<span tabIndex={0} className={statTrigger} />}
          >
            <length.Icon aria-hidden className="size-3.5" />
            {length.short}
          </TooltipTrigger>
          <TooltipContent>{length.tip}</TooltipContent>
        </Tooltip>
        {savedAt && saved && (
          <Tooltip>
            <TooltipTrigger
              render={
                <span tabIndex={0} className={cn(statTrigger, "ml-auto")} />
              }
            >
              <Pencil aria-hidden className="size-3.5" />
              {saved.today
                ? labels.stats.savedAt(saved.text)
                : labels.stats.savedOn(saved.text)}
            </TooltipTrigger>
            <TooltipContent>
              {labels.stats.savedOn(formatDateTime(savedAt))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

/** Un épisode, en bas de la colonne : la durée de son audio (ou pourquoi elle manque) et les mots. */
function audioLength(audio: BlockMedia, words: string): Measure {
  if (audio.state === "none") {
    return {
      Icon: Headphones,
      short: labels.stats.audioShort(labels.stats.noAudio, words),
      tip: labels.stats.noAudioTip(words),
    }
  }
  const seconds = audio.state === "ready" ? audio.media.duration_s : null
  return {
    Icon: Headphones,
    short: labels.stats.audioShort(
      seconds !== null ? formatDuration(seconds) : audioWords.noDuration,
      words
    ),
    tip: labels.stats.audioTip(
      seconds !== null ? formatDuration(seconds) : labels.stats.unknownDuration,
      words
    ),
  }
}

/**
 * « Prêt à publier ? » : toujours visible en haut ; une ligne mène à son réglage (l'audio qui
 * manque : son choix s'ouvre). Les points à vérifier du plan suivent : ils n'empêchent pas de
 * publier, et ne comptent pas.
 */
function ReadyCard({
  items,
  warnings,
  onChooseAudio,
}: {
  items: ReadyItem[]
  warnings: { count: number; onShow: () => void }
  onChooseAudio: () => void
}) {
  const done = items.filter((item) => item.done).length
  return (
    // Collée en haut de la colonne, sur un fond plein : rien ne défile au-dessus d'elle (la
    // colonne a une marge intérieure, que ce fond recouvre), et ce qui passe dessous garde
    // l'écart habituel : le fond le prolonge (pb-3), à la place de l'espace entre les cartes.
    <div className="sticky -top-3 z-10 -mt-3 mb-0 bg-background pt-3 pb-3">
      <Card size="sm" role="region" aria-labelledby="article-pret">
        <CardHeader>
          <CardTitle>
            <h3 id="article-pret">{labels.ready.title}</h3>
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="tabular-nums">
              {labels.ready.count(done, items.length)}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ItemGroup className="gap-0.5">
            {items.map((item) => {
              const label = labels.ready.items[item.key]
              return (
                <ReadyRow
                  key={item.key}
                  icon={
                    item.done ? (
                      <CircleCheck className="text-status-live" />
                    ) : (
                      <CircleAlert className="text-warning" />
                    )
                  }
                  label={label}
                  chevron={!item.done}
                  aria-label={
                    item.done
                      ? labels.ready.done(label)
                      : labels.ready.todo(label)
                  }
                  onClick={() => {
                    if (item.key === "audio" && !item.done) {
                      onChooseAudio()
                      return
                    }
                    // La carte vient sous les yeux et s'allume ; le curseur va sur son réglage.
                    showReadySetting(item.key)
                  }}
                />
              )
            })}
            {warnings.count > 0 && (
              <ReadyRow
                icon={<TriangleAlert className="text-warning" />}
                label={labels.ready.warnings(warnings.count)}
                chevron
                onClick={warnings.onShow}
              />
            )}
          </ItemGroup>
        </CardContent>
      </Card>
    </div>
  )
}

/** Une ligne de « Prêt à publier ? » : l'`Item` de shadcn, un bouton qui mène au réglage. */
function ReadyRow({
  icon,
  label,
  chevron,
  ...props
}: {
  icon: ReactNode
  label: string
  chevron: boolean
  "aria-label"?: string
  onClick: () => void
}) {
  return (
    // La ligne de la liste ; dedans, le bouton (Item rendu en bouton).
    <div role="listitem">
      <Item
        size="xs"
        className="px-1.5 py-1 hover:bg-muted"
        render={<button type="button" {...props} />}
      >
        <ItemMedia variant="icon" aria-hidden>
          {icon}
        </ItemMedia>
        <ItemContent>
          <ItemTitle className="font-normal">{label}</ItemTitle>
        </ItemContent>
        {chevron && (
          <ItemActions aria-hidden className="text-muted-foreground">
            <ChevronRight className="size-4" />
          </ItemActions>
        )}
      </Item>
    </div>
  )
}

/**
 * La carte du contenu dans la liste de sa section (le Fil, Radio Éclaircies) : son image de
 * présentation (la vignette, qui est aussi en tête du contenu) et son titre. Pas de résumé
 * (03/10/2026, ADMIN § 4).
 */
function CoverCard({
  kind,
  draft,
  editable,
  cover,
  onChooseCover,
  onRemoveCover,
}: {
  kind: ListedKind
  draft: Draft
  editable: boolean
  cover: BlockMedia
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  const file =
    cover.state === "ready" || cover.state === "not_ready" ? cover.media : null
  const chosen = cover.state !== "none"
  return (
    <PanelCard
      id={READY_IDS.cover.card}
      icon={LayoutList}
      title={labels.feed.title[kind]}
      aside={<InfoTip text={labels.feed.hint[kind]} />}
    >
      <Item variant="muted" size="sm">
        <ItemMedia>
          {/* data-presentation-choose : là où revient le focus quand le bouton utilisé a disparu
            (choix fait depuis l'aperçu ou depuis la fenêtre Publier). */}
          <button
            type="button"
            id={READY_IDS.cover.control}
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
                url={cover.state === "ready" ? cover.url : undefined}
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
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle className="line-clamp-3">
            {draft.title.trim() || texts.common.untitled}
          </ItemTitle>
        </ItemContent>
      </Item>
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
              document.getElementById(READY_IDS.cover.control)?.focus()
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

/**
 * L'audio d'un épisode (ADMIN § 4) : le fichier, sa durée et sa fiche dans la Médiathèque,
 * « Changer d'audio » et « Retirer l'audio », et l'avertissement [D46] s'il n'a pas de
 * transcription.
 */
function AudioCard({
  audio,
  editable,
  onChoose,
  onRemove,
}: {
  audio: BlockMedia
  editable: boolean
  onChoose: () => void
  onRemove: () => void
}) {
  const file =
    audio.state === "ready" || audio.state === "not_ready" ? audio.media : null
  const chosen = audio.state !== "none"
  return (
    <PanelCard
      id={READY_IDS.audio.card}
      icon={AudioLines}
      title={audioWords.label}
      aside={<InfoTip text={audioWords.hint} />}
    >
      <Item variant="muted" size="sm">
        <ItemMedia>
          {chosen ? (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
              <AudioLines aria-hidden className="size-5" />
            </span>
          ) : (
            // Pas encore d'audio : la place de la vignette le choisit.
            <button
              type="button"
              id={AUDIO_CHOOSE_ID}
              data-presentation-choose="audio"
              disabled={!editable}
              aria-label={audioWords.choose}
              className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed bg-background text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:text-foreground"
              onClick={onChoose}
            >
              <AudioLines aria-hidden className="size-5" />
              {editable && labels.feed.choose}
            </button>
          )}
        </ItemMedia>
        <ItemContent className="min-w-0">
          {file ? (
            <>
              <ItemTitle className="block w-full truncate">
                {file.name}
              </ItemTitle>
              <ItemDescription>
                {file.duration_s !== null
                  ? audioWords.duration(formatDuration(file.duration_s))
                  : audioWords.noDuration}
              </ItemDescription>
              <MediaFileLink mediaId={file.id} />
            </>
          ) : (
            <ItemDescription
              className={cn(
                (audio.state === "missing" || audio.state === "error") &&
                  "text-destructive"
              )}
            >
              {audio.state === "missing"
                ? audioWords.missing
                : audio.state === "error"
                  ? audioWords.loadFailed
                  : audio.state === "loading"
                    ? texts.common.loading
                    : audioWords.none}
            </ItemDescription>
          )}
        </ItemContent>
      </Item>
      {audio.state === "not_ready" && (
        <p className="mt-2 text-xs text-destructive">{audioWords.notReady}</p>
      )}
      {audio.state === "ready" &&
        (audio.media.transcript?.trim() ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {audioWords.transcriptOk}
          </p>
        ) : (
          <p
            className="mt-2 flex items-start gap-1.5 text-xs text-warning"
            data-warning="transcript"
          >
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            {audioWords.transcriptMissing}
          </p>
        ))}
      {(audio.state === "error" || (editable && chosen)) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {audio.state === "error" && (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={audio.retry}
            >
              {texts.common.retry}
            </Button>
          )}
          {editable && chosen && (
            <>
              {/* data-presentation-choose : là où revient le focus quand le bouton utilisé a
                  disparu (choix fait depuis l'aperçu ou depuis la fenêtre Publier). */}
              <Button
                type="button"
                size="xs"
                variant="outline"
                id={READY_IDS.audio.control}
                data-presentation-choose="audio"
                onClick={onChoose}
              >
                {audioWords.replace}
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  onRemove()
                  // « Retirer » disparaît : le focus passe à la place de l'audio, qui le choisit.
                  focusSoon(() => document.getElementById(AUDIO_CHOOSE_ID))
                }}
              >
                <X />
                {audioWords.remove}
              </Button>
            </>
          )}
        </div>
      )}
    </PanelCard>
  )
}

/** Le niveau d'accès, dans une liste : « Pas encore choisi » tant que rien n'est choisi ([D41]). */
function AccessCard({
  settings,
  editable,
  levels,
  levelsFailed,
  retryLevels,
  live,
  onChange,
}: {
  settings: ContentSettings
  editable: boolean
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
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
  const liveLevel = live ? liveLevelName(live.access_level_id, levels) : null
  return (
    <PanelCard id={READY_IDS.access.card} icon={KeyRound} title={access.label}>
      {levels === undefined ? (
        <LoadState
          query={{ isError: levelsFailed, error: null, refetch: retryLevels }}
          failed={access.loadFailed}
          rows={1}
          rowClassName="h-8 w-full"
        />
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
            id={READY_IDS.access.control}
            // Pas encore choisi : le « ! » et le bord orangé de « Prêt à publier ? ».
            className={cn(
              "w-full",
              !settings.accessChosen && "border-warning/60"
            )}
            aria-labelledby={READY_IDS.access.card}
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
        <p className="mt-1.5 text-sm text-muted-foreground">
          {settings.accessLevelId === null
            ? access.freeHint
            : levels && isMostComplete(levels, settings.accessLevelId)
              ? access.levelHintTop
              : access.levelHint}
        </p>
      )}
      {levels?.length === 0 && (
        <p className="mt-1 text-sm text-muted-foreground">{access.noLevels}</p>
      )}
      {liveLevel && (
        <p className="mt-1 text-sm text-muted-foreground">
          {access.live(liveLevel)}
        </p>
      )}
    </PanelCard>
  )
}

/**
 * Les catégories en boutons à bascule (une catégorie choisie est grisée, avec une coche), dans
 * l'ordre de la section.
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
  return (
    <PanelCard id="article-categories" icon={Tags} title={categoryWords.label}>
      {list === undefined ? (
        <LoadState
          query={{
            isError: categories.failed,
            error: null,
            refetch: categories.retry,
          }}
          failed={categoryWords.loadFailed}
          rows={1}
          rowClassName="h-7 w-40"
        />
      ) : (
        // Des boutons à bascule (ToggleGroup de shadcn), un par catégorie ; « Nouvelle » au bout.
        <div className="flex flex-wrap items-center gap-1.5">
          <ToggleGroup
            multiple
            variant="outline"
            size="sm"
            spacing={1.5}
            aria-labelledby="article-categories"
            className="flex-wrap"
            value={chosen.filter((id) => list.some((one) => one.id === id))}
            onValueChange={(ids: string[]) => onChange([...ids].sort())}
            disabled={!editable}
          >
            {list.map((category) => (
              <ToggleGroupItem key={category.id} value={category.id}>
                {chosen.includes(category.id) && <Check />}
                {category.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {editable && !adding && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={labels.categories.addLabel}
              onClick={() => setAdding(true)}
            >
              <Plus />
              {labels.categories.add}
            </Button>
          )}
        </div>
      )}
      {list?.length === 0 && !adding && (
        <p className="mt-1.5 text-sm text-muted-foreground">
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

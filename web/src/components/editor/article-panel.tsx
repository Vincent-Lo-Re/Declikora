import { cn } from "cn"
import {
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
import { CONTENT_TITLE_ID, CoverAlt } from "@/components/editor/presentation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import type { FeedKind } from "@/lib/editor/profile"
import { focusSoon, highlightSoon } from "@/lib/focus"
import { formatDuration } from "@/lib/media/format"
import { texts } from "@/texts"

const labels = texts.editor.article
const access = texts.publication.settings.access
const categoryWords = texts.publication.settings.categories
const audioWords = texts.editor.presentation.audio

// Nombres en français (« 1 000 »).
const integer = new Intl.NumberFormat("fr-FR")

// Valeurs de la liste du niveau d'accès (une formule a pour valeur son identifiant).
const NOT_CHOSEN = "pas-encore-choisi"
const FREE = "gratuit"

// Carte Audio d'un épisode : la place de l'audio, qui le choisit tant qu'il n'y en a pas, et
// « Changer d'audio ».
const AUDIO_CHOOSE_ID = "article-audio-choisir"
const AUDIO_REPLACE_ID = "article-audio-changer"

// Où mène chaque ligne de « Prêt à publier ? » : le réglage qui reçoit le curseur, et la zone qui
// s'allume (la carte qui le contient, ou le champ du titre lui-même).
const targets: Record<ReadyItem["key"], { control: string; zone: string }> = {
  title: { control: CONTENT_TITLE_ID, zone: `#${CONTENT_TITLE_ID}` },
  cover: {
    control: "article-image",
    zone: '[aria-labelledby="article-carte"]',
  },
  // L'audio qui manque ouvre son choix (ReadyCard) ; choisi, la ligne mène à « Changer d'audio ».
  audio: {
    control: AUDIO_REPLACE_ID,
    zone: '[aria-labelledby="article-audio"]',
  },
  access: {
    control: "article-niveau",
    zone: '[aria-labelledby="article-niveau-titre"]',
  },
}

// Une ligne de « Prêt à publier ? » (un bouton qui mène au réglage).
const readyRow =
  "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"

// Une mesure du bas de la colonne (lecture, dernière modification) : son détail dans l'infobulle,
// au survol comme au clavier.
const statTrigger =
  "flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * L'Article (ou l'Épisode), dans la colonne de droite de l'éditeur du Fil (ADMIN § 4) : ce qui
 * manque pour publier, la carte de la liste (image de présentation), l'audio d'un épisode, le
 * niveau d'accès et les catégories. Tout part avec le brouillon, comme dans la glissière Réglages
 * des autres éditeurs.
 */
export function ArticlePanel({
  kind,
  draft,
  editable,
  settings,
  onSettingsChange,
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
  kind: FeedKind
  draft: Draft
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
  live: LiveVersion | null
  categories: SectionCategories
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
  return (
    <div className="space-y-3">
      <ReadyCard
        items={ready}
        warnings={warnings}
        onChooseAudio={onChooseAudio}
      />
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {texts.editor.settings.readOnly}
        </p>
      )}
      <FeedCard
        kind={kind}
        draft={draft}
        editable={editable}
        cover={cover}
        onChooseCover={onChooseCover}
        onRemoveCover={onRemoveCover}
      />
      {audio && (
        <AudioCard
          audio={audio}
          editable={editable}
          onChoose={onChooseAudio}
          onRemove={onRemoveAudio}
        />
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
 * La section fixe en bas de la colonne de droite (éditeur du Fil) : l'état de l'enregistrement
 * (une icône), le temps de lecture (un épisode : la durée de son audio) et les mots, la dernière
 * modification (le détail dans les infobulles), puis les actions (le cadenas, l'état de
 * publication et « Publier »).
 */
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
  const length = audio
    ? audioLength(audio, words)
    : {
        Icon: Clock,
        short: labels.stats.short(stats.minutes, words),
        tip: labels.stats.readingTip(stats.minutes, words),
      }
  return (
    <div className="grid h-feed-footer shrink-0 content-center gap-2 border-t bg-background px-4">
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
function audioLength(audio: BlockMedia, words: string) {
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
                  className={readyRow}
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
                className={readyRow}
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
 * La carte du contenu dans la liste de sa section (le Fil, Radio Éclaircies) : son image de
 * présentation (la vignette, qui est aussi en tête du contenu) et son titre. Pas de résumé
 * (03/10/2026, ADMIN § 4).
 */
function FeedCard({
  kind,
  draft,
  editable,
  cover,
  onChooseCover,
  onRemoveCover,
}: {
  kind: FeedKind
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
      id="article-carte"
      icon={LayoutList}
      title={labels.feed.title[kind]}
      aside={<InfoTip text={labels.feed.hint[kind]} />}
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
      id="article-audio"
      icon={AudioLines}
      title={audioWords.label}
      aside={<InfoTip text={audioWords.hint} />}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
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
        <div className="grid min-w-0 gap-0.5">
          {file ? (
            <>
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {file.duration_s !== null
                  ? audioWords.duration(formatDuration(file.duration_s))
                  : audioWords.noDuration}
              </p>
              <MediaFileLink mediaId={file.id} />
            </>
          ) : (
            <p
              className={cn(
                "text-sm",
                audio.state === "missing" || audio.state === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {audio.state === "missing"
                ? audioWords.missing
                : audio.state === "error"
                  ? audioWords.loadFailed
                  : audio.state === "loading"
                    ? texts.common.loading
                    : audioWords.none}
            </p>
          )}
        </div>
      </div>
      {audio.state === "not_ready" && (
        <p className="mt-2 text-xs text-destructive">{audioWords.notReady}</p>
      )}
      {audio.state === "ready" &&
        (audio.media.transcript?.trim() ? (
          <p className="mt-2 text-xs text-muted-foreground">
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
                id={AUDIO_REPLACE_ID}
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
    <PanelCard id="article-niveau-titre" icon={KeyRound} title={access.label}>
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
                aria-label={labels.categories.addLabel}
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

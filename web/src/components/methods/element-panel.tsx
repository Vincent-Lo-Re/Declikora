import { cn } from "cn"
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  History,
  Hourglass,
  KeyRound,
  TriangleAlert,
} from "lucide-react"
import { Fragment, useId, type ReactNode } from "react"
import { Link } from "react-router"

import type { BlockMedia } from "@/blocks/components/context"
import type { Draft } from "@/blocks/types"
import { CoverCard } from "@/components/editor/article-panel"
import { InfoTip } from "@/components/info-tip"
import { LoadState } from "@/components/load-state"
import {
  ElementStateBadge,
  ElementStateHint,
} from "@/components/methods/element-state-badge"
import { PanelCard } from "@/components/panel-card"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import type { AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import type { ElementContext } from "@/lib/contents/methods"
import type { ElementState, TreePlace } from "@/lib/contents/outline"
import {
  scheduleErrorText,
  type ScheduleState,
} from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import type { ElementKind } from "@/lib/editor/profile"
import { editorPath, sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.element
const MethodIcon = sections.methods.icon

/**
 * La colonne de droite d'un chapitre, d'une leçon ou d'un exercice, dans l'éditeur du Fil (ADMIN
 * § 4) : « Dans la méthode » (sa place, son état dans l'app, « Montrer dans l'app », ce qui ferait
 * refuser la publication de la méthode, sa programmation), le niveau d'accès (celui de la méthode,
 * avec « Leçon gratuite » pour une leçon ; celui de sa leçon pour un exercice), puis son image,
 * facultative. Tout part avec le brouillon ; l'app ne change qu'à la prochaine publication de la
 * méthode ([D29]).
 */
export function ElementPanel({
  kind,
  draft,
  editable,
  settings,
  onSettingsChange,
  context,
  place,
  state,
  problem,
  schedule,
  levels,
  levelsFailed,
  retryLevels,
  cover,
  onChooseCover,
  onRemoveCover,
}: {
  kind: ElementKind
  draft: Draft
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  // Sa méthode, son chapitre et sa leçon (undefined tant qu'ils ne sont pas lus).
  context: ElementContext | null | undefined
  // Sa place dans le plan (undefined tant qu'il n'est pas lu).
  place: TreePlace | null | undefined
  // Son état dans l'app (undefined tant qu'il n'est pas connu).
  state: ElementState | undefined
  // Ce qui ferait refuser la publication de la méthode à cause de lui.
  problem: string | null
  // La programmation de la méthode ([D31]).
  schedule: ScheduleState
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
  cover: BlockMedia
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  return (
    <div className="space-y-3">
      <PlaceCard
        kind={kind}
        editable={editable}
        settings={settings}
        onSettingsChange={onSettingsChange}
        context={context}
        place={place}
        state={state}
        problem={problem}
        // On tient la main sur cet élément : la programmation attend peut-être qu'on quitte
        // l'éditeur.
        schedule={scheduleText(schedule, editable)}
      />
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {texts.editor.settings.readOnly}
        </p>
      )}
      <AccessCard
        kind={kind}
        editable={editable}
        settings={settings}
        onSettingsChange={onSettingsChange}
        method={context?.method}
        lesson={context?.lesson ?? null}
        levels={levels}
        levelsFailed={levelsFailed}
        retryLevels={retryLevels}
      />
      <CoverCard
        kind={kind}
        draft={draft}
        editable={editable}
        cover={cover}
        onChooseCover={onChooseCover}
        onRemoveCover={onRemoveCover}
      />
    </div>
  )
}

/**
 * En tête de la colonne, à la place de « Prêt à publier ? » : où est l'élément dans sa méthode,
 * son état dans l'app et « Montrer dans l'app ».
 */
function PlaceCard({
  kind,
  editable,
  settings,
  onSettingsChange,
  context,
  place,
  state,
  problem,
  schedule,
}: {
  kind: ElementKind
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  context: ElementContext | null | undefined
  place: TreePlace | null | undefined
  state: ElementState | undefined
  problem: string | null
  schedule: ScheduleNote | null
}) {
  const id = useId()
  const method = context?.method
  return (
    <section
      aria-labelledby={`${id}-titre`}
      data-element-card={kind}
      className="rounded-xl border bg-muted p-3"
    >
      <div className="mb-1 flex items-center gap-1.5">
        <h3
          id={`${id}-titre`}
          className="flex items-center gap-1.5 text-sm font-semibold"
        >
          <MethodIcon aria-hidden className="size-4 text-muted-foreground" />
          {labels.card}
        </h3>
        <span className="ml-auto">
          <InfoTip text={labels.cardHint[kind]} />
        </span>
      </div>
      <div className="grid gap-2.5">
        {method && (
          <PlacePath methodTitle={method.title} place={place} kind={kind} />
        )}
        {method?.deleted && (
          <p className="text-xs text-destructive">{labels.methodInTrash}</p>
        )}
        {state && (
          <div className="grid gap-1">
            <span className="flex">
              <ElementStateBadge state={state} describedBelow />
            </span>
            <ElementStateHint state={state} always />
          </div>
        )}
        <Field orientation="horizontal" className="items-start">
          <Switch
            id={`${id}-dans-app`}
            checked={settings.inApp}
            disabled={!editable}
            onCheckedChange={(inApp) =>
              onSettingsChange({ ...settings, inApp })
            }
          />
          {/* Ce qu'il fait est dit par son état, juste au-dessus. */}
          <div className="grid gap-0.5">
            <FieldLabel htmlFor={`${id}-dans-app`}>{labels.inApp}</FieldLabel>
            {kind !== "exercise" && (
              <FieldDescription className="text-xs">
                {kind === "chapter"
                  ? labels.chapterInAppHint
                  : labels.lessonInAppHint}
              </FieldDescription>
            )}
          </div>
        </Field>
        {problem && (
          <Note icon={TriangleAlert} tone="destructive">
            {labels.problem(problem)}
          </Note>
        )}
        {schedule && (
          <Note
            icon={schedule.icon}
            tone={schedule.failed ? "destructive" : "muted"}
            data-element-schedule={schedule.kind}
          >
            <span className="block text-foreground">{schedule.message}</span>
            <span className="block">{schedule.hint}</span>
          </Note>
        )}
      </div>
    </section>
  )
}

/**
 * « Respirer en conscience › Chapitre 1 « Les bases » › Leçon 2 » (et « › Exercice 1 » pour un
 * exercice) : la place, en dernier.
 */
function PlacePath({
  methodTitle,
  place,
  kind,
}: {
  methodTitle: string
  place: TreePlace | null | undefined
  kind: ElementKind
}) {
  const untitled = texts.common.untitled
  const steps = [methodTitle.trim() || untitled]
  if (place?.kind === "chapter") {
    steps.push(labels.place.chapter(place.chapterIndex + 1))
  } else if (place?.kind === "lesson") {
    steps.push(
      labels.place.chapterOf(
        place.chapterIndex + 1,
        place.chapter.title.trim() || untitled
      ),
      labels.place.lesson(place.lessonIndex + 1)
    )
  } else if (place?.kind === "exercise") {
    steps.push(
      labels.place.chapterOf(
        place.chapterIndex + 1,
        place.chapter.title.trim() || untitled
      ),
      labels.place.lessonOf(
        place.lessonIndex + 1,
        place.lesson.title.trim() || untitled
      ),
      labels.place.exercise(place.exerciseIndex + 1)
    )
  }
  return (
    <p
      data-element-place={kind}
      className="flex flex-wrap items-center gap-x-1 text-xs text-muted-foreground"
    >
      <span className="sr-only">{labels.place.label} : </span>
      {steps.map((step, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <>
              <ChevronRight aria-hidden className="size-3" />
              <span className="sr-only">, </span>
            </>
          )}
          <span
            className={cn(
              index === steps.length - 1 &&
                index > 0 &&
                "font-medium text-foreground"
            )}
          >
            {step}
          </span>
        </Fragment>
      ))}
    </p>
  )
}

/** Une ligne d'explication avec son icône (ce qui bloque, la programmation de la méthode). */
function Note({
  icon: Icon,
  tone,
  children,
  ...props
}: {
  icon: typeof TriangleAlert
  tone: "destructive" | "muted"
  children: ReactNode
  "data-element-schedule"?: string
}) {
  return (
    <p
      {...props}
      className={cn(
        "flex items-start gap-1.5 text-xs",
        tone === "destructive" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      <Icon aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

/**
 * Le niveau d'accès : celui de la méthode, en lecture (il se choisit dans son écran) ; pour une
 * leçon, « Leçon gratuite » juste dessous ; pour un chapitre, quand son introduction devient
 * gratuite ([D43]) ; pour un exercice, celui de sa leçon.
 */
function AccessCard({
  kind,
  editable,
  settings,
  onSettingsChange,
  method,
  lesson,
  levels,
  levelsFailed,
  retryLevels,
}: {
  kind: ElementKind
  editable: boolean
  settings: ContentSettings
  onSettingsChange: (next: ContentSettings) => void
  method: ElementContext["method"] | undefined
  // La leçon d'un exercice.
  lesson: ElementContext["lesson"]
  levels: AccessLevel[] | undefined
  levelsFailed: boolean
  retryLevels: () => void
}) {
  const id = useId()
  const access = method?.access
  const needsLevels = access?.accessChosen && access.accessLevelId !== null
  // Un exercice : « Comme sa leçon : … » ; sinon « Celui de la méthode : … ».
  const ofLesson = kind === "exercise"
  const levelName = (name: string) =>
    ofLesson ? labels.access.lesson(name) : labels.access.method(name)
  const levelText = !access
    ? null
    : ofLesson && lesson?.isFree
      ? labels.access.lessonFree
      : !access.accessChosen
        ? labels.access.notChosen
        : access.accessLevelId === null
          ? levelName(texts.publication.settings.access.free)
          : levels
            ? levelName(
                levels.find((level) => level.id === access.accessLevelId)
                  ?.name ?? texts.publication.settings.access.deleted
              )
            : null
  return (
    <PanelCard
      id={`${id}-titre`}
      icon={KeyRound}
      title={texts.publication.settings.access.label}
      aside={<InfoTip text={labels.access.change} />}
    >
      {levelText === null && needsLevels ? (
        <LoadState
          query={{ isError: levelsFailed, error: null, refetch: retryLevels }}
          failed={texts.publication.settings.access.loadFailed}
          rows={1}
          rowClassName="h-8 w-full"
        />
      ) : (
        <p
          data-element-access
          className="rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm wrap-break-word"
        >
          {levelText}
        </p>
      )}
      {kind === "lesson" ? (
        <Field orientation="horizontal" className="mt-3 items-start">
          <Switch
            id={`${id}-gratuite`}
            checked={settings.isFree}
            disabled={!editable}
            onCheckedChange={(isFree) =>
              onSettingsChange({ ...settings, isFree })
            }
          />
          <div className="grid gap-0.5">
            <FieldLabel htmlFor={`${id}-gratuite`}>{labels.isFree}</FieldLabel>
            <FieldDescription className="text-xs">
              {labels.isFreeHint}
            </FieldDescription>
          </div>
        </Field>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {kind === "chapter"
            ? labels.access.chapterHint
            : labels.access.exerciseHint}
        </p>
      )}
    </PanelCard>
  )
}

/**
 * En bas de la colonne, à la place de « Publier » : « Ouvrir la méthode », d'où elle se publie
 * ([D29]) ; son menu donne l'Historique. Quand la publication programmée de la méthode attend
 * qu'on quitte l'éditeur, le bouton le dit ([D31]).
 */
export function MethodButton({
  method,
  schedule,
  holding,
  onHistory,
}: {
  method: ElementContext["method"] | undefined
  schedule: ScheduleState
  // On tient la main sur cet élément.
  holding: boolean
  onHistory: () => void
}) {
  const label =
    schedule.kind === "waiting" && holding
      ? labels.schedule.leave
      : labels.openMethod
  const content = (
    <>
      <MethodIcon />
      {label}
    </>
  )
  return (
    <div className="flex items-center">
      {method && !method.deleted ? (
        <Link
          to={editorPath("methods", method.id)}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-r-none"
          )}
        >
          {content}
        </Link>
      ) : (
        <Button variant="outline" size="sm" className="rounded-r-none" disabled>
          {content}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={labels.more}
          render={
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-l-none border-l-0"
            />
          }
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onHistory}>
            <History />
            {texts.publication.actions.history}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type ScheduleNote = {
  kind: ScheduleState["kind"]
  icon: typeof TriangleAlert
  failed: boolean
  message: string
  hint: string
}

/** Ce que la programmation de la méthode veut dire pour la personne qui écrit cet élément. */
function scheduleText(
  schedule: ScheduleState,
  holding: boolean
): ScheduleNote | null {
  const words = labels.schedule
  const note = (
    icon: typeof TriangleAlert,
    message: string,
    hint: string
  ): ScheduleNote => ({
    kind: schedule.kind,
    icon,
    failed: schedule.kind === "failed",
    message,
    hint,
  })
  switch (schedule.kind) {
    case "none":
      return null
    case "scheduled": {
      const date = formatDateTime(schedule.at)
      return note(CalendarClock, words.scheduled(date), words.scheduledHint)
    }
    case "waiting": {
      const date = formatDateTime(schedule.at)
      if (holding) {
        return note(Hourglass, words.waitingMine(date), words.waitingMineHint)
      }
      return schedule.overdue
        ? note(Hourglass, words.waiting(date), words.waitingHint)
        : note(Hourglass, words.due(date), words.dueHint)
    }
    case "failed":
      return note(
        TriangleAlert,
        words.failed,
        words.failedHint(scheduleErrorText(schedule.code))
      )
  }
}

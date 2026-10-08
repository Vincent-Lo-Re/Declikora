import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import {
  CalendarClock,
  ChevronDown,
  CircleOff,
  History,
  Hourglass,
  RefreshCw,
  Send,
  TriangleAlert,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { DayField, TimeField } from "@/components/date-time-fields"
import { AccessLevelChoice } from "@/components/editor/access-level-choice"
import type {
  LevelPick,
  PublicationControls,
} from "@/components/editor/use-publication"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import {
  scheduleErrorText,
  type LiveState,
  type ScheduleState,
} from "@/lib/contents/publication"
import {
  formatDateTime,
  formatDayInput,
  formatTimeInput,
  parisToInstant,
  parseDayInput,
  parseTimeInput,
  toParisParts,
} from "@/lib/dates"
import { texts } from "@/texts"

const labels = texts.publication

// ---------------------------------------------------------------------------------------------
// Badges (éditeur et liste des pages)
// ---------------------------------------------------------------------------------------------

const liveDots: Record<LiveState, string | null> = {
  draft: null,
  withdrawn: null,
  live: "bg-status-live",
  modified: "bg-status-modified",
}

/** « Brouillon », « En ligne », « Modifié depuis la publication », « Retiré de l'app ». */
export function LiveBadge({ live }: { live: LiveState }) {
  const dot = liveDots[live]
  return (
    <Badge variant={dot ? "secondary" : "outline"} data-publication={live}>
      {dot ? (
        <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
      ) : live === "withdrawn" ? (
        <CircleOff aria-hidden />
      ) : null}
      {labels.status[live]}
    </Badge>
  )
}

/** « Programmé le… », « Programmation en attente : quelqu'un écrit », « Programmation échouée ». */
export function ScheduleBadge({ schedule }: { schedule: ScheduleState }) {
  const text = scheduleText(schedule)
  switch (schedule.kind) {
    case "none":
      return null
    case "scheduled":
      return (
        <Badge variant="outline" data-schedule="scheduled">
          <CalendarClock aria-hidden />
          {text}
        </Badge>
      )
    case "waiting":
      return (
        <Badge
          variant="outline"
          data-schedule={isHeld(schedule) ? "waiting" : "due"}
        >
          <Hourglass aria-hidden />
          {text}
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" data-schedule="failed">
          <TriangleAlert aria-hidden />
          {text}
        </Badge>
      )
  }
}

/**
 * La tâche planifiée retient la publication : l'heure est passée depuis plus de deux minutes et
 * le brouillon a changé depuis la programmation ([D31]). Sinon, elle part à son prochain passage.
 */
function isHeld(
  schedule: Extract<ScheduleState, { kind: "waiting" }>
): boolean {
  return schedule.overdue && schedule.edited
}

function scheduleText(schedule: ScheduleState): string | null {
  switch (schedule.kind) {
    case "none":
      return null
    case "scheduled":
      return labels.status.scheduled(formatDateTime(schedule.at))
    case "waiting":
      return isHeld(schedule) ? labels.status.waiting : labels.status.due
    case "failed":
      return labels.status.failed
  }
}

/**
 * Éditeur du Fil : l'état de publication en pastille à côté de « Publier » (« Brouillon »,
 * « Programmé »…), la phrase entière dans l'infobulle (« En ligne · Programmé le… »). Le détail
 * d'une programmation est dans son bandeau.
 */
export function PublicationBadge({ pub }: { pub: PublicationControls }) {
  if (pub.failed) return <UnknownStatus pub={pub} />
  if (pub.loading) return <Skeleton className="h-5 w-20" />
  const { live, schedule } = pub.status
  const dot = liveDots[live]
  const line = [labels.status[live], scheduleText(schedule)]
    .filter(Boolean)
    .join(" · ")
  const short =
    schedule.kind === "none"
      ? labels.short[live]
      : schedule.kind === "waiting"
        ? labels.short[isHeld(schedule) ? "waiting" : "due"]
        : labels.short[schedule.kind]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            tabIndex={0}
            variant={schedule.kind === "failed" ? "destructive" : "outline"}
            data-publication={live}
            className="min-w-0"
          />
        }
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            schedule.kind === "none"
              ? (dot ?? "bg-muted-foreground")
              : "bg-status-new"
          )}
        />
        <span className="truncate">{short}</span>
        {/* La phrase entière, si elle dit plus que la pastille (pas « Brouillon : Brouillon »). */}
        {line !== short && <span className="sr-only">{` : ${line}`}</span>}
      </TooltipTrigger>
      <TooltipContent>{line}</TooltipContent>
    </Tooltip>
  )
}

/**
 * L'état de publication n'a pas pu être lu : « État inconnu » (« Publier » reste grisé), et un
 * clic le relit.
 */
function UnknownStatus({ pub }: { pub: PublicationControls }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="destructive"
            size="xs"
            aria-label={labels.status.unknownHint}
            onClick={pub.retry}
          />
        }
      >
        <RefreshCw />
        {labels.short.unknown}
      </TooltipTrigger>
      <TooltipContent>{labels.status.unknownHint}</TooltipContent>
    </Tooltip>
  )
}

/**
 * « Publier » et le menu de ses autres actions (programmer, retirer de l'app ; dans l'éditeur du
 * Fil, l'historique).
 */
export function PublishButton({
  pub,
  disabled,
  alwaysPublishable = false,
  onHistory,
}: {
  pub: PublicationControls
  disabled: boolean
  alwaysPublishable?: boolean
  // Éditeur du Fil : « Historique » dans le menu (ailleurs, une icône à côté).
  onHistory?: () => void
}) {
  const { status } = pub
  const scheduled =
    status.schedule.kind === "scheduled" || status.schedule.kind === "waiting"
  const inApp = status.live === "live" || status.live === "modified"
  const upToDate = status.live === "live" && !alwaysPublishable
  return (
    // « Publier » et son menu, accolés (ButtonGroup de shadcn).
    <ButtonGroup>
      {/* Un bouton grisé ne reçoit pas la souris : l'infobulle se pose sur son contenant. Le
          bouton n'est donc pas un enfant direct du groupe : il aplatit lui-même son bord droit
          (« ! » : au-dessus de l'arrondi que Button prend dans un groupe). */}
      <Tooltip disabled={!upToDate}>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            size="sm"
            className="rounded-r-none!"
            disabled={
              disabled || pub.busy || pub.loading || pub.failed || upToDate
            }
            onClick={pub.startPublish}
          >
            {pub.publish.isPending ? <Spinner /> : <Send />}
            {labels.actions.publish}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{labels.upToDate}</TooltipContent>
      </Tooltip>
      <ButtonGroupSeparator />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled || pub.busy || pub.loading || pub.failed}
          aria-label={labels.actions.more}
          render={<Button size="icon-sm" />}
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={pub.startSchedule}>
            <CalendarClock />
            {scheduled ? labels.actions.reschedule : labels.actions.schedule}
          </DropdownMenuItem>
          {status.schedule.kind !== "none" && (
            <DropdownMenuItem onClick={() => pub.unschedule.mutate()}>
              <CircleOff />
              {status.schedule.kind === "failed"
                ? labels.actions.dismissFailure
                : labels.actions.unschedule}
            </DropdownMenuItem>
          )}
          {onHistory && (
            <DropdownMenuItem onClick={onHistory}>
              <History />
              {labels.actions.history}
            </DropdownMenuItem>
          )}
          {inApp && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => pub.setDialog({ type: "unpublish" })}
              >
                <CircleOff />
                {labels.actions.unpublish}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  )
}

// ---------------------------------------------------------------------------------------------
// Bandeau de programmation (au-dessus du téléphone) : [D16], [D31]
// ---------------------------------------------------------------------------------------------

export function ScheduleBanner({
  pub,
  leave,
}: {
  pub: PublicationControls
  // « Quitter l'éditeur » : la programmation en attente ne part qu'une fois l'éditeur fermé.
  leave?: ReactNode
}) {
  const { schedule } = pub.status
  if (schedule.kind === "none") return null
  const byName = pub.publication?.scheduled_by_name ?? null
  const words = labels.banner

  let message: string
  let extra: string
  let actions: ReactNode
  const cancel = (
    <Button
      size="sm"
      variant="outline"
      disabled={pub.busy}
      onClick={() => pub.unschedule.mutate()}
    >
      {schedule.kind === "failed"
        ? labels.actions.dismissFailure
        : labels.actions.unschedule}
    </Button>
  )
  if (schedule.kind === "scheduled") {
    message = labels.banner.scheduled(formatDateTime(schedule.at))
    extra = words.scheduledHint
    actions = (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={pub.busy}
          onClick={pub.startSchedule}
        >
          {labels.actions.reschedule}
        </Button>
        {cancel}
      </>
    )
  } else if (schedule.kind === "waiting") {
    const date = formatDateTime(schedule.at)
    if (pub.bridge.editable && schedule.edited) {
      // Le brouillon a changé depuis la programmation et nous avons la main : c'est peut-être
      // nous qui retenons la publication ([D31]) ; on le dit, au tutoiement.
      message = words.waitingMine(date)
      extra = words.waitingMineHint
      actions = (
        <>
          {leave}
          {cancel}
        </>
      )
    } else {
      // Brouillon inchangé : la tâche publie à son prochain passage, personne ne la retient.
      const held = isHeld(schedule)
      message = held ? words.waiting(date) : words.due(date)
      extra = held ? words.waitingHint : words.dueHint
      actions = cancel
    }
  } else {
    message = labels.banner.failed
    extra = [
      labels.banner.failedReason(scheduleErrorText(schedule.code)),
      byName ? labels.banner.failedBy(byName) : null,
    ]
      .filter(Boolean)
      .join(" ")
    actions = (
      <>
        <Button
          size="sm"
          variant="outline"
          disabled={pub.busy}
          onClick={pub.startSchedule}
        >
          {labels.actions.schedule}
        </Button>
        {cancel}
      </>
    )
  }

  return (
    <div className="w-full">
      <Alert
        variant={schedule.kind === "failed" ? "destructive" : "default"}
        data-schedule-banner={schedule.kind}
      >
        {schedule.kind === "failed" ? (
          <TriangleAlert />
        ) : schedule.kind === "waiting" ? (
          <Hourglass />
        ) : (
          <CalendarClock />
        )}
        <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-foreground">
          <span>
            {message}
            <span className="block text-muted-foreground">{extra}</span>
          </span>
          <span className="flex shrink-0 gap-2">{actions}</span>
        </AlertDescription>
      </Alert>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Fenêtres : publier, programmer, retirer de l'app, refus [D14]
// ---------------------------------------------------------------------------------------------

export function PublicationDialogs({ pub }: { pub: PublicationControls }) {
  const { dialog, setDialog } = pub
  const close = (open: boolean) => {
    if (!open && !pub.busy) setDialog(null)
  }
  return (
    <>
      <Dialog open={dialog?.type === "publish"} onOpenChange={close}>
        {dialog?.type === "publish" && <PublishDialog pub={pub} />}
      </Dialog>
      <Dialog open={dialog?.type === "schedule"} onOpenChange={close}>
        {dialog?.type === "schedule" && <ScheduleDialog pub={pub} />}
      </Dialog>
      <AlertDialog open={dialog?.type === "unpublish"} onOpenChange={close}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.unpublishDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {labels.unpublishDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pub.unpublish.isPending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pub.unpublish.isPending}
              onClick={() => pub.unpublish.mutate()}
            >
              {pub.unpublish.isPending && <Spinner />}
              {labels.unpublishDialog.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={dialog?.type === "held"} onOpenChange={close}>
        {dialog?.type === "held" && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.lockHeld.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.lockHeld.description(dialog.name)}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{texts.common.cancel}</AlertDialogCancel>
              <Button
                onClick={() => {
                  setDialog(null)
                  pub.bridge.takeLock()
                }}
              >
                {labels.lockHeld.take}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

/**
 * Le nom du niveau d'accès choisi (« Gratuit », le nom de la formule). null tant que les
 * formules ne sont pas chargées : on ne sait pas encore si la formule existe toujours.
 */
function levelName(
  settings: ContentSettings,
  levels: AccessLevel[] | undefined
): string | null {
  if (settings.accessLevelId === null) return labels.settings.access.free
  if (levels === undefined) return null
  return (
    levels.find((level) => level.id === settings.accessLevelId)?.name ??
    labels.settings.access.deleted
  )
}

/**
 * Les fenêtres Publier et Programmer ont besoin des formules : pour proposer le choix du niveau
 * ([D41]) ou montrer celui qui est choisi. Tant qu'elles manquent, on ne peut pas confirmer.
 */
function levelsMissing(pub: PublicationControls): boolean {
  const { settings, levels } = pub.bridge
  return (
    levels === undefined &&
    !(settings.accessChosen && settings.accessLevelId === null)
  )
}

/** Formules en cours de chargement (squelette) ou illisibles (message et « Réessayer »). */
function LevelsUnavailable({
  pub,
  compact = false,
}: {
  pub: PublicationControls
  compact?: boolean
}) {
  if (!pub.bridge.levelsFailed) {
    return compact ? (
      <Skeleton className="h-5 w-28" aria-label={texts.common.loading} />
    ) : (
      <div className="space-y-2" aria-label={texts.common.loading}>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span role="alert" className="text-destructive">
        {labels.settings.access.loadFailed}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={pub.bridge.retryLevels}
      >
        {texts.common.retry}
      </Button>
    </span>
  )
}

/**
 * Le choix du niveau d'accès quand il n'a jamais été fait ([D41]), dans les fenêtres Publier et
 * Programmer. Sans le verrou, on ne peut pas l'enregistrer : la fenêtre le dit.
 */
function LevelRequired({
  pub,
  idPrefix,
  pick,
  onPick,
}: {
  pub: PublicationControls
  idPrefix: string
  pick: LevelPick
  onPick: (level: string | null) => void
}) {
  const { editable, levels } = pub.bridge
  const titleId = `${idPrefix}-titre`
  return (
    <div className="space-y-2">
      <p id={titleId} className="font-medium">
        {labels.publishDialog.access}
      </p>
      <p className="text-muted-foreground">
        {editable ? labels.levelRequired : labels.levelNeedsLock}
      </p>
      {levels === undefined ? (
        <LevelsUnavailable pub={pub} />
      ) : (
        <AccessLevelChoice
          idPrefix={idPrefix}
          labelledBy={titleId}
          chosen={pick !== undefined}
          levelId={pick ?? null}
          levels={levels}
          disabled={!editable}
          onChange={onPick}
        />
      )}
    </div>
  )
}

function Summary({ pub }: { pub: PublicationControls }) {
  const { settings, kind, levels } = pub.bridge
  const rows: [string, ReactNode][] = [
    [
      labels.publishDialog.access,
      levelName(settings, levels) ?? <LevelsUnavailable pub={pub} compact />,
    ],
  ]
  if (kind === "page" && settings.slug) {
    rows.push([labels.publishDialog.address, settings.slug])
  }
  return (
    <dl className="grid grid-cols-label-value gap-x-4 gap-y-1">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium break-all">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Vrai s'il manque quelque chose pour publier ([D45], audio d'un épisode). */
function hasMissing(pub: PublicationControls): boolean {
  return (pub.bridge.checks?.missing.length ?? 0) > 0
}

/**
 * Ce qui manque pour publier ou programmer (image de présentation, audio), avec de quoi le
 * choisir, puis le conseil [D46] (transcription), qui n'empêche rien.
 */
function RequirementsNotice({
  pub,
  action,
}: {
  pub: PublicationControls
  action: "publish" | "schedule"
}) {
  const checks = pub.bridge.checks
  if (!checks) return null
  const words = labels.requirements
  const fix = (key: "title" | "cover" | "audio") => {
    pub.setDialog(null)
    pub.bridge.onFix?.(key)
  }
  return (
    <>
      {checks.missing.length > 0 && (
        <Alert variant="destructive" data-requirements>
          <TriangleAlert />
          <AlertTitle>
            {action === "publish" ? words.publishTitle : words.scheduleTitle}
          </AlertTitle>
          <AlertDescription>
            <ul className="space-y-2 text-foreground">
              {checks.missing.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {item.key === "title"
                      ? words.title
                      : item.key === "cover"
                        ? item.state === "missing"
                          ? words.cover
                          : words.coverUnavailable
                        : item.state === "missing"
                          ? words.audio
                          : words.audioUnavailable}
                  </span>
                  {pub.bridge.editable && pub.bridge.onFix && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fix(item.key)}
                    >
                      {item.key === "title"
                        ? words.writeTitle
                        : item.key === "cover"
                          ? words.chooseCover
                          : words.chooseAudio}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {checks.advice.map((item) => (
        // Un conseil, pas un refus : l'Alert de shadcn, son icône en orange.
        <Alert key={item.key} role="status" data-advice={item.key}>
          <TriangleAlert className="text-warning" />
          <AlertTitle className="font-normal">{words.transcript}</AlertTitle>
        </Alert>
      ))}
    </>
  )
}

function PublishDialog({ pub }: { pub: PublicationControls }) {
  const chosen = pub.bridge.settings.accessChosen
  const [pick, setPick] = useState<LevelPick>(undefined)
  const waiting =
    (!chosen && pick === undefined) || levelsMissing(pub) || hasMissing(pub)
  return (
    // Haute (formules) : elle défile dans la fenêtre du navigateur.
    <DialogContent className="max-h-dialog overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {pub.publication?.live
            ? labels.publishDialog.titleAgain
            : labels.publishDialog.title}
        </DialogTitle>
        <DialogDescription>
          {labels.publishDialog.description}
        </DialogDescription>
      </DialogHeader>
      <RequirementsNotice pub={pub} action="publish" />
      {chosen ? (
        <Summary pub={pub} />
      ) : (
        <LevelRequired
          pub={pub}
          idPrefix="publier-niveau"
          pick={pick}
          onPick={setPick}
        />
      )}
      <DialogFooter>
        <Button
          variant="outline"
          disabled={pub.publish.isPending}
          onClick={() => pub.setDialog(null)}
        >
          {texts.common.cancel}
        </Button>
        <Button
          disabled={waiting || pub.publish.isPending}
          onClick={() => pub.publish.mutate(chosen ? undefined : pick)}
        >
          {pub.publish.isPending ? <Spinner /> : <Send />}
          {labels.publishDialog.confirm}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

// Jour et heure à Paris, tels qu'ils sont saisis (« 25/10/2099 », « 08h00 »).
const scheduleSchema = z.object({
  date: z.string(),
  time: z.string(),
})

/** Le jour et l'heure saisis (« 25/10/2099 », « 08h00 ») → l'instant, ou pourquoi c'est impossible. */
function toInstant(date: string, time: string) {
  const day = parseDayInput(date)
  const clock = parseTimeInput(time)
  return day && clock
    ? parisToInstant(day, clock)
    : ({ ok: false, reason: "invalid" } as const)
}

/** Vrai si l'instant est déjà passé (au moment où l'on valide). */
function isPast(instant: Date): boolean {
  return instant.getTime() <= Date.now()
}

function ScheduleDialog({ pub }: { pub: PublicationControls }) {
  const errors = labels.scheduleDialog.errors
  const chosen = pub.bridge.settings.accessChosen
  const [pick, setPick] = useState<LevelPick>(undefined)
  const current = pub.publication?.scheduled_at
  // Par défaut : l'heure déjà programmée, sinon demain à 8 h (heure de Paris).
  const [defaults] = useState(() => {
    const parts = current
      ? toParisParts(new Date(current))
      : {
          date: toParisParts(new Date(pub.now + 24 * 3600 * 1000)).date,
          time: "08:00",
        }
    return {
      date: formatDayInput(parts.date),
      time: formatTimeInput(parts.time),
    }
  })
  const form = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaults,
  })
  const [date, time] = useWatch({
    control: form.control,
    name: ["date", "time"],
  })
  const parsed = date && time ? toInstant(date, time) : null

  const submit = form.handleSubmit((values) => {
    if (!values.date || !values.time) {
      form.setError("time", { message: errors.required })
      return
    }
    const result = toInstant(values.date, values.time)
    if (!result.ok) {
      form.setError("time", {
        message:
          result.reason === "nonexistent" ? errors.nonexistent : errors.invalid,
      })
      return
    }
    if (isPast(result.instant)) {
      form.setError("time", { message: errors.past })
      return
    }
    pub.schedule.mutate({
      at: result.instant,
      level: chosen ? undefined : pick,
    })
  })

  return (
    <DialogContent className="max-h-dialog overflow-y-auto sm:max-w-md">
      <form noValidate onSubmit={submit} className="grid gap-4">
        <DialogHeader>
          <DialogTitle>{labels.scheduleDialog.title}</DialogTitle>
          <DialogDescription>
            {labels.scheduleDialog.description}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid grid-cols-2 gap-3">
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="programmer-jour">
                  {labels.scheduleDialog.date}
                </FieldLabel>
                <DayField
                  {...field}
                  id="programmer-jour"
                  aria-invalid={fieldState.invalid}
                  onChange={(value) => {
                    form.clearErrors()
                    field.onChange(value)
                  }}
                />
              </Field>
            )}
          />
          <Controller
            name="time"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="programmer-heure">
                  {labels.scheduleDialog.time}
                </FieldLabel>
                <TimeField
                  {...field}
                  id="programmer-heure"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="programmer-resume"
                  onChange={(value) => {
                    form.clearErrors()
                    field.onChange(value)
                  }}
                />
              </Field>
            )}
          />
        </FieldGroup>
        <div id="programmer-resume" className="space-y-1">
          <FieldError
            errors={[
              form.formState.errors.time ??
                (parsed && !parsed.ok
                  ? {
                      message:
                        parsed.reason === "nonexistent"
                          ? errors.nonexistent
                          : errors.invalid,
                    }
                  : undefined),
            ]}
          />
          {parsed?.ok && !form.formState.errors.time && (
            <FieldDescription>
              {labels.scheduleDialog.summary(formatDateTime(parsed.instant))}
              {parsed.ambiguous && ` ${labels.scheduleDialog.ambiguous}`}
            </FieldDescription>
          )}
        </div>
        <RequirementsNotice pub={pub} action="schedule" />
        {chosen ? (
          <Summary pub={pub} />
        ) : (
          <LevelRequired
            pub={pub}
            idPrefix="programmer-niveau"
            pick={pick}
            onPick={setPick}
          />
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pub.schedule.isPending}
            onClick={() => pub.setDialog(null)}
          >
            {texts.common.cancel}
          </Button>
          <Button
            type="submit"
            disabled={
              (!chosen && pick === undefined) ||
              levelsMissing(pub) ||
              hasMissing(pub) ||
              pub.schedule.isPending
            }
          >
            {pub.schedule.isPending ? <Spinner /> : <CalendarClock />}
            {labels.scheduleDialog.confirm}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}

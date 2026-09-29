import { zodResolver } from "@hookform/resolvers/zod"
import {
  CalendarClock,
  ChevronDown,
  CircleOff,
  Hourglass,
  Send,
  TriangleAlert,
} from "lucide-react"
import { useState, type ReactNode } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { AccessLevelChoice } from "@/components/editor/access-level-choice"
import type {
  LevelPick,
  PublicationControls,
} from "@/components/editor/use-publication"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { MethodChanges } from "@/components/methods/method-changes"
import type { AccessLevel } from "@/lib/access-levels"
import type { ContentSettings } from "@/lib/contents/api"
import {
  scheduleErrorText,
  type LiveState,
  type ScheduleState,
} from "@/lib/contents/publication"
import { formatDateTime, parisToInstant, toParisParts } from "@/lib/dates"
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
    <Badge
      variant={dot ? "secondary" : "outline"}
      data-publication={live}
      className="gap-1.5"
    >
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
  switch (schedule.kind) {
    case "none":
      return null
    case "scheduled":
      return (
        <Badge variant="outline" data-schedule="scheduled">
          <CalendarClock aria-hidden />
          {labels.status.scheduled(formatDateTime(schedule.at))}
        </Badge>
      )
    case "waiting":
      return (
        <Badge
          variant="outline"
          data-schedule={schedule.overdue ? "waiting" : "due"}
        >
          <Hourglass aria-hidden />
          {schedule.overdue ? labels.status.waiting : labels.status.due}
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" data-schedule="failed">
          <TriangleAlert aria-hidden />
          {labels.status.failed}
        </Badge>
      )
  }
}

// ---------------------------------------------------------------------------------------------
// Barre de publication (en-tête de l'éditeur)
// ---------------------------------------------------------------------------------------------

export function PublishBar({
  pub,
  disabled,
  alwaysPublishable = false,
}: {
  pub: PublicationControls
  // Verrou en cours de prise, contenu illisible…
  disabled: boolean
  // Le brouillon cite un bloc identique partout : son modèle a pu changer depuis la
  // publication sans que le brouillon change, « Publier » reste donc possible.
  alwaysPublishable?: boolean
}) {
  const { status } = pub
  const scheduled =
    status.schedule.kind === "scheduled" || status.schedule.kind === "waiting"
  const inApp = status.live === "live" || status.live === "modified"
  const upToDate = status.live === "live" && !alwaysPublishable
  return (
    <div className="flex items-center gap-2">
      {!pub.loading && <LiveBadge live={status.live} />}
      <div className="flex items-center">
        <Button
          size="sm"
          className="rounded-r-none"
          disabled={disabled || pub.busy || pub.loading || upToDate}
          title={upToDate ? labels.upToDate : undefined}
          onClick={pub.startPublish}
        >
          {pub.publish.isPending ? <Spinner /> : <Send />}
          {labels.actions.publish}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled || pub.busy || pub.loading}
            aria-label={labels.actions.more}
            render={
              <Button
                size="icon-sm"
                className="rounded-l-none border-l border-l-primary-foreground/25"
              />
            }
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
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// Bandeau de programmation (sous l'en-tête) : [D16], [D31]
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
  // Une méthode : l'attente peut venir de sa fiche, d'un chapitre ou d'une leçon ([D31]).
  const words = pub.bridge.method
    ? { ...labels.banner, ...labels.banner.method }
    : labels.banner

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
    if (pub.bridge.editable) {
      // C'est peut-être nous qui retenons la publication ([D31]) : on le dit, au tutoiement.
      message = words.waitingMine(date)
      extra = words.waitingMineHint
      actions = (
        <>
          {leave}
          {cancel}
        </>
      )
    } else {
      message = schedule.overdue ? words.waiting(date) : words.due(date)
      extra = schedule.overdue ? words.waitingHint : words.dueHint
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
    <div className="border-b bg-muted/40 px-4 py-2">
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
              {pub.bridge.kind === "method"
                ? labels.unpublishDialog.methodDescription
                : labels.unpublishDialog.description}
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
        {dialog?.type === "held" &&
          (heldOnElement(pub) ? (
            // Méthode dont on tient la fiche : c'est un chapitre ou une leçon qui est écrit
            // par quelqu'un d'autre ([D14]). Reprendre la main sur la fiche n'y changerait rien.
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {labels.lockHeld.elementTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {labels.lockHeld.elementDescription(dialog.name)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{texts.common.close}</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          ) : (
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
          ))}
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
 * Une méthode dont on tient la fiche : un refus [D14] vient forcément d'un chapitre ou d'une
 * leçon écrit par quelqu'un d'autre.
 */
function heldOnElement(pub: PublicationControls): boolean {
  return pub.bridge.kind === "method" && pub.bridge.editable
}

/**
 * Une méthode : la liste des changements doit être lue (et à jour), non vide, sans problème
 * signalé ; sinon la confirmation attend ([D29]).
 */
function methodNotReady(pub: PublicationControls): boolean {
  const method = pub.bridge.method
  if (!method) return false
  if (method.preview === undefined || method.fetching || method.failed) {
    return true
  }
  return (
    method.preview.length === 0 ||
    method.preview.some((row) => row.problem !== null)
  )
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
  const fix = (key: "cover" | "audio") => {
    pub.setDialog(null)
    pub.bridge.onFix?.(key)
  }
  return (
    <>
      {checks.missing.length > 0 && (
        <Alert variant="destructive" data-requirements>
          <TriangleAlert />
          <AlertDescription className="space-y-2 text-foreground">
            <p className="font-medium">
              {action === "publish" ? words.publishTitle : words.scheduleTitle}
            </p>
            <ul className="space-y-2">
              {checks.missing.map((item) => (
                <li
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span>
                    {item.key === "cover"
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
                      {item.key === "cover"
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
        <p
          key={item.key}
          className="flex items-start gap-1.5 text-sm text-warning"
          data-advice={item.key}
        >
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {words.transcript}
        </p>
      ))}
    </>
  )
}

function PublishDialog({ pub }: { pub: PublicationControls }) {
  const chosen = pub.bridge.settings.accessChosen
  const [pick, setPick] = useState<LevelPick>(undefined)
  const waiting =
    (!chosen && pick === undefined) ||
    levelsMissing(pub) ||
    hasMissing(pub) ||
    methodNotReady(pub)
  const method = pub.bridge.method
  return (
    <DialogContent className={method ? "sm:max-w-xl" : "sm:max-w-md"}>
      <DialogHeader>
        <DialogTitle>
          {pub.publication?.live
            ? labels.publishDialog.titleAgain
            : labels.publishDialog.title}
        </DialogTitle>
        <DialogDescription>
          {method
            ? labels.publishDialog.methodDescription
            : labels.publishDialog.description}
        </DialogDescription>
      </DialogHeader>
      <RequirementsNotice pub={pub} action="publish" />
      {method && <MethodChanges method={method} onOpen={closeDialog(pub)} />}
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

/** Ferme la fenêtre avant d'ouvrir un élément de la liste des changements. */
function closeDialog(pub: PublicationControls) {
  return () => pub.setDialog(null)
}

// Jour et heure à Paris (champs HTML « date » et « time »).
const scheduleSchema = z.object({
  date: z.string(),
  time: z.string(),
})

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
  const [defaults] = useState(() =>
    current
      ? toParisParts(new Date(current))
      : {
          date: toParisParts(new Date(pub.now + 24 * 3600 * 1000)).date,
          time: "08:00",
        }
  )
  const form = useForm({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaults,
  })
  const [date, time] = useWatch({
    control: form.control,
    name: ["date", "time"],
  })
  const parsed = date && time ? parisToInstant(date, time) : null

  const submit = form.handleSubmit((values) => {
    if (!values.date || !values.time) {
      form.setError("time", { message: errors.required })
      return
    }
    const result = parisToInstant(values.date, values.time)
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
    <DialogContent
      className={pub.bridge.method ? "sm:max-w-xl" : "sm:max-w-md"}
    >
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
                <Input
                  {...field}
                  id="programmer-jour"
                  type="date"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => {
                    form.clearErrors()
                    field.onChange(event)
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
                <Input
                  {...field}
                  id="programmer-heure"
                  type="time"
                  step={60}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="programmer-resume"
                  onChange={(event) => {
                    form.clearErrors()
                    field.onChange(event)
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
        {pub.bridge.method && (
          <MethodChanges
            method={pub.bridge.method}
            onOpen={closeDialog(pub)}
            note={texts.methods.changes.scheduleNote}
          />
        )}
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
              methodNotReady(pub) ||
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

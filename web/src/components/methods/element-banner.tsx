import {
  CalendarClock,
  GraduationCap,
  Hourglass,
  Settings2,
  TriangleAlert,
} from "lucide-react"
import { cn } from "cn"
import { Link } from "react-router"

import {
  ElementStateBadge,
  ElementStateHint,
} from "@/components/methods/element-state-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import type { ElementContext } from "@/lib/contents/methods"
import type { ElementState } from "@/lib/contents/outline"
import {
  scheduleErrorText,
  type ScheduleState,
} from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import { editorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.element

/**
 * En tête de l'éditeur d'un chapitre ou d'une leçon : il n'a pas de bouton Publier, tout part
 * avec la méthode ([D29]). Le rappel dit où il est, son état dans l'app, s'il est gratuit, et
 * mène à la méthode (et aux réglages « Montrer dans l'app », « Leçon gratuite »).
 */
export function ElementBanner({
  kind,
  context,
  state,
  isFree,
  problem,
  schedule,
  holding,
  onOpenSettings,
}: {
  kind: "chapter" | "lesson"
  // undefined tant que la méthode n'est pas lue.
  context: ElementContext | null | undefined
  // L'état dans l'app (undefined tant qu'il n'est pas connu).
  state: ElementState | undefined
  isFree: boolean
  // Ce qui ferait refuser la publication de la méthode à cause de cet élément.
  problem: string | null
  // La programmation de la méthode ([D31]).
  schedule: ScheduleState
  // On tient la main sur cet élément (la programmation attend peut-être qu'on quitte l'éditeur).
  holding: boolean
  onOpenSettings: () => void
}) {
  const method = context?.method
  const scheduleNote = scheduleText(schedule, holding)
  return (
    <div className="border-b bg-muted/40 px-4 py-2">
      <Alert data-element-banner={kind}>
        <GraduationCap />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-foreground">
          <span className="space-y-1">
            <span className="block">
              {labels.reminder[kind]}{" "}
              {method && !method.deleted && labels.publishFromMethod}
            </span>
            {context?.chapter && (
              <span className="block text-muted-foreground">
                {labels.inChapter(
                  context.chapter.title.trim() || texts.methods.outline.untitled
                )}
              </span>
            )}
            {method?.deleted && (
              <span className="block text-destructive">
                {labels.methodInTrash}
              </span>
            )}
            {problem && (
              <span className="flex items-start gap-1.5 text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {labels.problem(problem)}
              </span>
            )}
            {scheduleNote && (
              <span
                className={cn(
                  "flex items-start gap-1.5",
                  schedule.kind === "failed"
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
                data-element-schedule={schedule.kind}
              >
                {schedule.kind === "failed" ? (
                  <TriangleAlert
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                ) : schedule.kind === "waiting" ? (
                  <Hourglass aria-hidden className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <CalendarClock
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0"
                  />
                )}
                <span>
                  <span className="block text-foreground">
                    {scheduleNote.message}
                  </span>
                  <span className="block">{scheduleNote.hint}</span>
                </span>
              </span>
            )}
            <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {state && <ElementStateBadge state={state} />}
              {kind === "lesson" && isFree && (
                <Badge variant="outline">{texts.methods.outline.free}</Badge>
              )}
            </span>
            {state && <ElementStateHint state={state} />}
          </span>
          <span className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={onOpenSettings}>
              <Settings2 />
              {labels.settings}
            </Button>
            {method && !method.deleted && (
              <Link
                to={editorPath("methods", method.id)}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "no-underline! hover:text-primary-foreground!"
                )}
              >
                {/* La publication programmée attend peut-être qu'on quitte l'éditeur ([D31]). */}
                {schedule.kind === "waiting" && holding
                  ? labels.schedule.leave
                  : labels.openMethod}
              </Link>
            )}
          </span>
        </AlertDescription>
      </Alert>
    </div>
  )
}

/** Ce que la programmation de la méthode veut dire pour la personne qui écrit cet élément. */
function scheduleText(
  schedule: ScheduleState,
  holding: boolean
): { message: string; hint: string } | null {
  const words = labels.schedule
  switch (schedule.kind) {
    case "none":
      return null
    case "scheduled": {
      const date = formatDateTime(schedule.at)
      return { message: words.scheduled(date), hint: words.scheduledHint }
    }
    case "waiting": {
      const date = formatDateTime(schedule.at)
      if (holding) {
        return { message: words.waitingMine(date), hint: words.waitingMineHint }
      }
      return schedule.overdue
        ? { message: words.waiting(date), hint: words.waitingHint }
        : { message: words.due(date), hint: words.dueHint }
    }
    case "failed":
      return {
        message: words.failed,
        hint: words.failedHint(scheduleErrorText(schedule.code)),
      }
  }
}

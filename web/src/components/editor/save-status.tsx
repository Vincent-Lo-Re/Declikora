import { cn } from "cn"
import { Check, CircleAlert, CloudOff, LoaderCircle } from "lucide-react"
import { useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { AutosaveState, AutosaveStatus } from "@/lib/editor/autosave"
import { formatDateTime } from "@/lib/dates"
import { texts } from "@/texts"

const labels = texts.editor.save

/**
 * « Enregistré », « Enregistrement… », « Hors ligne, nouvel essai… ». L'indicateur visible
 * n'est pas une région annoncée (il change à chaque pause de frappe) : une région à part, pour
 * les lecteurs d'écran, ne parle que quand l'état change vraiment (voir useAnnouncement).
 * L'heure du dernier enregistrement est dans une infobulle, atteignable au clavier, et lue avec
 * « Enregistré ».
 */
export function SaveStatus({
  state,
  visible,
  compact = false,
}: {
  state: AutosaveState
  // Faux en lecture seule sans rien à enregistrer : seule la région annoncée reste.
  visible: boolean
  // Éditeur du Fil : l'icône seule, l'état dans l'infobulle (l'heure est juste à côté, dans
  // « Modifié à … »).
  compact?: boolean
}) {
  const announcement = useAnnouncement(state.status)
  const { icon: Icon, text, spin, tone } = describe(state.status)
  const date =
    !compact && state.status === "saved" && state.savedAt
      ? formatDateTime(state.savedAt)
      : null

  const indicator = (
    <>
      <Icon aria-hidden className={spin ? "size-4 animate-spin" : "size-4"} />
      <span className={cn(compact && "sr-only")}>{text}</span>
      {date && <span className="sr-only">{` ${labels.savedOn(date)}`}</span>}
    </>
  )
  const className = cn(
    "flex items-center gap-1.5 rounded-md text-sm",
    tone === "error" ? "text-destructive" : "text-muted-foreground"
  )
  // Une infobulle quand il y a quelque chose à y lire : l'heure, ou l'état d'une icône seule.
  const tip = date ? labels.savedAt(date) : compact ? text : null

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {visible &&
        (tip ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <p
                  tabIndex={0}
                  data-save-status={state.status}
                  className={cn(
                    className,
                    "outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  )}
                />
              }
            >
              {indicator}
            </TooltipTrigger>
            <TooltipContent>{tip}</TooltipContent>
          </Tooltip>
        ) : (
          <p data-save-status={state.status} className={className}>
            {indicator}
          </p>
        ))}
    </>
  )
}

// États qui méritent d'être signalés. « Non enregistré » (refus, main perdue) est déjà annoncé
// par son message d'alerte : on le retient seulement pour annoncer le retour à « Enregistré ».
const PROBLEMS = new Set<AutosaveStatus>(["offline", "failed", "stopped"])

/**
 * Ce que lit le lecteur d'écran : « Hors ligne… » en passant hors ligne, puis « Tes
 * modifications sont enregistrées » au retour à la normale après un problème. Jamais le cycle
 * normal (en attente, enregistrement, enregistré).
 */
function useAnnouncement(status: AutosaveStatus): string {
  const [tracked, setTracked] = useState({
    status,
    problem: PROBLEMS.has(status),
    message: "",
  })
  if (tracked.status !== status) {
    let { problem, message } = tracked
    if (PROBLEMS.has(status)) {
      problem = true
      if (status === "offline")
        message = isOffline()
          ? labels.announce.offline
          : labels.announce.retrying
    } else if (status === "saved" && problem) {
      problem = false
      message = labels.announce.saved
    }
    setTracked({ status, problem, message })
  }
  return tracked.message
}

/**
 * L'envoi a échoué et repartira : « Hors ligne » seulement si le navigateur l'est vraiment ; sinon
 * le serveur n'a pas répondu (erreur 5xx, délai dépassé, trop de demandes).
 */
function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false
}

function describe(status: AutosaveStatus) {
  switch (status) {
    case "saved":
      return { icon: Check, text: labels.saved, spin: false, tone: "normal" }
    case "pending":
      return {
        icon: LoaderCircle,
        text: labels.pending,
        spin: false,
        tone: "normal",
      }
    case "saving":
      return {
        icon: LoaderCircle,
        text: labels.saving,
        spin: true,
        tone: "normal",
      }
    case "offline":
      return {
        icon: CloudOff,
        text: isOffline() ? labels.offline : labels.retrying,
        spin: false,
        tone: "error",
      }
    case "failed":
      return {
        icon: CircleAlert,
        text: labels.failed,
        spin: false,
        tone: "error",
      }
    case "stopped":
      return {
        icon: CircleAlert,
        text: labels.stopped,
        spin: false,
        tone: "error",
      }
  }
}

import { CircleOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ElementState } from "@/lib/contents/outline"
import { texts } from "@/texts"

const labels = texts.methods.outline

const stateDots: Record<ElementState, string | null> = {
  live: "bg-status-live",
  modified: "bg-status-modified",
  new: "bg-status-new",
  removing: "bg-status-removing",
  withdrawn: null,
  hidden: null,
  blocked: null,
}

// Les états qui demandent un geste pour que l'élément parte dans l'app : leur explication est
// écrite sous le badge (ElementStateHint), et non seulement lue par les lecteurs d'écran.
const GESTURE_STATES: ReadonlySet<ElementState> = new Set([
  "withdrawn",
  "hidden",
  "blocked",
])

/**
 * L'état d'un chapitre ou d'une leçon dans l'app : « En ligne », « Modifié depuis la
 * publication », « Neuf », « Sera retiré de l'app », « Retiré de l'app », « Caché de l'app »…
 * L'explication est dans l'infobulle pour la souris, et dans le texte de la page pour le clavier
 * et les lecteurs d'écran : lue juste après le badge, ou écrite dessous (ElementStateHint).
 */
export function ElementStateBadge({ state }: { state: ElementState }) {
  const dot = stateDots[state]
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant={dot ? "secondary" : "outline"}
              className="gap-1.5"
              data-element-state={state}
            />
          }
        >
          {dot ? (
            <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
          ) : (
            <CircleOff aria-hidden />
          )}
          {labels.states[state]}
        </TooltipTrigger>
        <TooltipContent>{labels.stateHints[state]}</TooltipContent>
      </Tooltip>
      {!GESTURE_STATES.has(state) && (
        <span className="sr-only" data-element-state-hint={state}>
          {labels.stateHints[state]}
        </span>
      )}
    </>
  )
}

/** L'explication d'un état qui demande un geste (« Coche « Montrer dans l'app »… »), en clair. */
export function ElementStateHint({ state }: { state: ElementState }) {
  if (!GESTURE_STATES.has(state)) return null
  return (
    <span
      className="block text-xs text-muted-foreground"
      data-element-state-hint={state}
    >
      {labels.stateHints[state]}
    </span>
  )
}

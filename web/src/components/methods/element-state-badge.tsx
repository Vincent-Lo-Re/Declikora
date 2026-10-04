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
 * describedBelow : elle est toujours écrite dessous (`ElementStateHint` avec `always`), sans
 * infobulle.
 */
export function ElementStateBadge({
  state,
  describedBelow = false,
}: {
  state: ElementState
  describedBelow?: boolean
}) {
  const dot = stateDots[state]
  return (
    <>
      <Tooltip disabled={describedBelow}>
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
      {!describedBelow && !GESTURE_STATES.has(state) && (
        <span className="sr-only" data-element-state-hint={state}>
          {labels.stateHints[state]}
        </span>
      )}
    </>
  )
}

/**
 * L'explication d'un état qui demande un geste (« Coche « Montrer dans l'app »… »), en clair ;
 * always : celle de tous les états.
 */
export function ElementStateHint({
  state,
  always = false,
}: {
  state: ElementState
  always?: boolean
}) {
  if (!always && !GESTURE_STATES.has(state)) return null
  return (
    <span
      className="block text-xs text-muted-foreground"
      data-element-state-hint={state}
    >
      {labels.stateHints[state]}
    </span>
  )
}

/**
 * L'état d'une ligne du plan d'une méthode, en pastille seule (la place manque pour son nom) :
 * son nom et son explication dans l'infobulle, et pour les lecteurs d'écran.
 */
export function ElementStateDot({ state }: { state: ElementState }) {
  const dot = stateDots[state]
  const text = `${labels.states[state]} : ${labels.stateHints[state]}`
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            data-element-state={state}
            className="flex size-5 shrink-0 items-center justify-center text-muted-foreground"
          />
        }
      >
        {dot ? (
          <span aria-hidden className={`size-2 rounded-full ${dot}`} />
        ) : (
          <CircleOff aria-hidden className="size-3.5" />
        )}
        <span className="sr-only">{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}

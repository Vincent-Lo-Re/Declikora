import { cn } from "cn"
import { CircleCheck, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { findPageBySlug } from "@/lib/contents/api"
import type { LiveVersion } from "@/lib/contents/publication"
import { checkSlug, slugFromTitle, type RefusedSlug } from "@/lib/contents/slug"
import { texts } from "@/texts"

const labels = texts.publication.settings.slug

// Le temps laissé entre deux touches avant de demander à la base si l'adresse est libre.
const CHECK_DELAY_MS = 400

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "free" }
  | { kind: "error"; message: string }

/**
 * L'adresse d'une page, vérifiée en tapant : sa forme tout de suite, puis, un instant après la
 * dernière touche, si une autre page l'a déjà (« Libre », ou le nom de cette page). Une adresse
 * libre part aussitôt avec le brouillon (onCommit) ; quitter le champ ou Entrée vérifient sans
 * attendre. « Reprendre le titre » propose l'adresse tirée du titre, et l'adresse en ligne est
 * rappelée dessous. Dans la carte de l'éditeur du Fil (inCard), le titre de la carte nomme le
 * champ et l'aide est dans son infobulle.
 */
export function SlugField({
  id,
  contentId,
  slug,
  title,
  editable,
  live,
  refused,
  inCard = false,
  onCommit,
}: {
  id: string
  contentId: string | null
  slug: string | null
  title: string
  editable: boolean
  live: LiveVersion | null
  // La dernière adresse refusée par l'enregistrement (prise ou invalide).
  refused: RefusedSlug | null
  inCard?: boolean
  onCommit: (slug: string | null) => void
}) {
  const [text, setText] = useState(
    refused ? (refused.slug ?? "") : (slug ?? "")
  )
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  // La dernière adresse envoyée par ce champ : quand elle revient du brouillon, ce qu'on a tapé
  // depuis reste à l'écran.
  const [sent, setSent] = useState<string | null | undefined>(undefined)
  // L'adresse a changé ailleurs (relecture du brouillon) ou vient d'être refusée : le champ
  // reprend celle du brouillon, ou montre celle qui a été refusée.
  const [shown, setShown] = useState({ slug, refused })
  if (shown.slug !== slug || shown.refused !== refused) {
    setShown({ slug, refused })
    if ((refused !== shown.refused && refused !== null) || slug !== sent) {
      setText(refused ? (refused.slug ?? "") : (slug ?? ""))
      setStatus({ kind: "idle" })
    }
  }

  // Une vérification en attente, et le numéro de la dernière demandée (une réponse plus ancienne
  // est ignorée).
  const timer = useRef<number | undefined>(undefined)
  const asked = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const send = (value: string | null) => {
    setSent(value)
    onCommit(value)
  }

  // Déjà prise par une autre page : refusée tout de suite (la base refuse aussi, à
  // l'enregistrement, si une autre page la prend entre-temps).
  const ask = async (value: string, request: number) => {
    try {
      const other = await findPageBySlug(value, contentId)
      if (request !== asked.current) return
      if (other) {
        setStatus({ kind: "error", message: labels.taken(other.title) })
        return
      }
      setStatus({ kind: "free" })
    } catch {
      // Vérification impossible (réseau) : la base tranchera à l'enregistrement.
      if (request !== asked.current) return
      setStatus({ kind: "idle" })
    }
    send(value)
  }

  const check = (value: string, now: boolean) => {
    window.clearTimeout(timer.current)
    const request = ++asked.current
    const checked = checkSlug(value)
    if (!checked.ok) {
      setStatus({
        kind: "error",
        message:
          checked.reason === "too_long" ? labels.tooLong : labels.invalid,
      })
      return
    }
    if (checked.slug === slug) {
      setStatus({ kind: "idle" })
      return
    }
    if (checked.slug === null) {
      setStatus({ kind: "idle" })
      send(null)
      return
    }
    setStatus({ kind: "checking" })
    const candidate = checked.slug
    if (now) void ask(candidate, request)
    else {
      timer.current = window.setTimeout(
        () => void ask(candidate, request),
        CHECK_DELAY_MS
      )
    }
  }

  // Sans rien taper depuis le refus, l'adresse refusée n'est pas renvoyée.
  const unchangedRefusal = (value: string) =>
    refused !== null && value === (refused.slug ?? "")
  const message =
    status.kind === "error"
      ? status.message
      : status.kind === "idle" && refused && unchangedRefusal(text)
        ? refused.message
        : null
  const suggestion = slugFromTitle(title)
  const describedBy = `${id}-aide`

  return (
    <Field data-invalid={message !== null} className="gap-1.5">
      <FieldLabel htmlFor={id} className={cn(inCard && "sr-only")}>
        {labels.label}
      </FieldLabel>
      <Input
        id={id}
        value={text}
        readOnly={!editable}
        autoComplete="off"
        spellCheck={false}
        placeholder={labels.placeholder}
        aria-invalid={message !== null}
        aria-describedby={describedBy}
        onChange={(event) => {
          setText(event.target.value)
          check(event.target.value, false)
        }}
        onBlur={(event) => {
          const value = event.target.value
          if (!editable || unchangedRefusal(value)) return
          const checked = checkSlug(value)
          if (checked.ok) setText(checked.slug ?? "")
          check(value, true)
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return
          event.preventDefault()
          if (!unchangedRefusal(event.currentTarget.value)) {
            check(event.currentTarget.value, true)
          }
        }}
      />
      {/* Un refus prend toute la ligne : « Reprendre le titre » passe dessous. */}
      <div className="flex min-h-7 flex-wrap items-center gap-x-2 gap-y-1">
        <p
          id={describedBy}
          role="status"
          className={cn(
            "flex min-w-0 items-center gap-1.5 text-xs",
            message
              ? "basis-full text-destructive"
              : "flex-1 text-muted-foreground"
          )}
        >
          {message ??
            (status.kind === "checking" ? (
              labels.checking
            ) : status.kind === "free" ? (
              <>
                <CircleCheck
                  aria-hidden
                  className="size-3.5 text-status-live"
                />
                {labels.free}
              </>
            ) : inCard ? (
              <span className="sr-only">{labels.description}</span>
            ) : (
              labels.description
            ))}
        </p>
        {editable && suggestion && suggestion !== slug && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="ml-auto shrink-0"
            onClick={() => {
              setText(suggestion)
              check(suggestion, true)
            }}
          >
            <RefreshCw />
            {labels.fromTitle}
          </Button>
        )}
      </div>
      {live?.slug && (
        <FieldDescription className="text-xs">
          {labels.live(live.slug)}
        </FieldDescription>
      )}
    </Field>
  )
}

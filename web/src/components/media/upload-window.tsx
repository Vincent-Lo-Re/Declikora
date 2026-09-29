import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react"
import { useEffect, useId, useRef, useState, type FocusEvent } from "react"

import {
  useUploadQueue,
  useUploadVerdicts,
} from "@/components/media/use-upload-queue"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { MediaVerdict } from "@/lib/media/api"
import {
  UPLOAD_WINDOW_CLOSE_MS,
  UPLOAD_WINDOW_SPACE,
} from "@/lib/media/constants"
import { formatBytes, formatPercent } from "@/lib/media/format"
import { rejectReasonText, type UploadItem } from "@/lib/media/upload"
import {
  getUploadQueue,
  isActive,
  isCancellable,
  type UploadQueue,
} from "@/lib/media/upload-queue"
import {
  summarize,
  summaryText,
  uploadState,
  type UploadSummary,
} from "@/lib/media/upload-summary"
import { texts } from "@/texts"

// Fréquence à laquelle on regarde si la souris ou le focus sont dans la fenêtre.
const TICK_MS = 200
// Écart entre la fenêtre et ce qui passe au-dessus (messages).
const GAP_PX = 12

/**
 * La fenêtre des envois, en bas à droite de toutes les pages avec le menu (montée une fois dans
 * AppLayout, car la file continue quand on change de section) : une ligne par fichier, avec sa
 * progression, « Annuler » et « Réessayer ». Quand tout est prêt, vérification des SVG et des
 * Lottie comprise, elle se ferme toute seule ; après un échec, elle reste ouverte jusqu'à
 * « Fermer ». Les étapes sont annoncées aux lecteurs d'écran par UploadAnnouncer.
 */
export function UploadWindow({
  queue = getUploadQueue(),
  closeDelayMs = UPLOAD_WINDOW_CLOSE_MS,
}: {
  queue?: UploadQueue
  closeDelayMs?: number
}) {
  const { items } = useUploadQueue(queue)
  if (items.length === 0) return null
  // Montée à chaque ouverture : une nouvelle série d'envois repart dépliée.
  return (
    <OpenUploadWindow queue={queue} items={items} closeDelayMs={closeDelayMs} />
  )
}

function OpenUploadWindow({
  queue,
  items,
  closeDelayMs,
}: {
  queue: UploadQueue
  items: UploadItem[]
  closeDelayMs: number
}) {
  const verdictOf = useUploadVerdicts(items)
  const [collapsed, setCollapsed] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  // Ce qui avait le focus avant qu'il entre dans la fenêtre : il le retrouve après « Fermer ».
  const returnFocus = useRef<HTMLElement | null>(null)
  const listId = useId()

  const summary = summarize(
    items.map((item) => uploadState(item, verdictOf(item)))
  )
  const allReady = summary.active === 0 && summary.failed === 0
  const uploading = items.some(isActive)

  // La place prise en bas de la page, tenue à jour quand la fenêtre change de taille.
  useEffect(() => {
    const element = windowRef.current
    if (!element || typeof ResizeObserver === "undefined") return
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty(
        UPLOAD_WINDOW_SPACE,
        `${element.offsetHeight + GAP_PX}px`
      )
    })
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty(UPLOAD_WINDOW_SPACE)
    }
  }, [])

  // Tout est prêt : la fenêtre se ferme après closeDelayMs sans la souris dessus ni le focus
  // dedans. Le compte repart de zéro chaque fois qu'on y revient.
  useEffect(() => {
    if (!allReady) return
    let waited = 0
    const timer = window.setInterval(() => {
      const element = windowRef.current
      const inUse =
        element !== null &&
        (element.matches(":hover") || element.contains(document.activeElement))
      if (inUse) {
        waited = 0
        return
      }
      waited += TICK_MS
      if (waited >= closeDelayMs) queue.clearSettled()
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [allReady, closeDelayMs, queue])

  const rememberReturnFocus = (event: FocusEvent<HTMLDivElement>) => {
    const from = event.relatedTarget
    if (from instanceof HTMLElement && !event.currentTarget.contains(from)) {
      returnFocus.current = from
    }
  }

  const restoreFocus = () => {
    const target = returnFocus.current
    if (target?.isConnected) target.focus()
  }

  const close = () => {
    queue.clearFinished()
    restoreFocus()
  }

  // La ligne retirée emporte son bouton : le focus va au bouton de la fenêtre, ou revient où il
  // était si c'était la dernière ligne (la fenêtre se ferme).
  const dismiss = (id: string) => {
    const last = items.length === 1
    queue.dismiss(id)
    if (last) restoreFocus()
    else toggleRef.current?.focus()
  }

  return (
    <Card
      ref={windowRef}
      size="sm"
      role="region"
      aria-label={texts.media.uploads.title}
      onFocus={rememberReturnFocus}
      className="fixed right-6 bottom-6 z-40 w-96 shadow-lg duration-200 animate-in fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SummaryIcon summary={summary} />
          {summaryText(summary)}
        </CardTitle>
        <CardAction className="flex gap-1">
          {/* Sans le fond « ouvert » des menus : ce bouton est déplié la plupart du temps. */}
          <Button
            ref={toggleRef}
            variant="ghost"
            size="icon-sm"
            className="aria-expanded:bg-transparent hover:aria-expanded:bg-muted dark:hover:aria-expanded:bg-muted/50"
            aria-expanded={!collapsed}
            aria-controls={listId}
            aria-label={
              collapsed
                ? texts.media.uploads.expand
                : texts.media.uploads.collapse
            }
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </Button>
          {/* Pendant un envoi, on l'annule ligne par ligne : pas de fermeture d'un coup. */}
          {!uploading && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={texts.media.uploads.close}
              onClick={close}
            >
              <X />
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent
        id={listId}
        hidden={collapsed}
        className="max-h-72 overflow-y-auto"
      >
        <ul className="divide-y">
          {items.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              verdict={verdictOf(item)}
              queue={queue}
              onDismiss={dismiss}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function SummaryIcon({ summary }: { summary: UploadSummary }) {
  if (summary.active > 0) {
    return (
      <LoaderCircle
        aria-hidden
        className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
      />
    )
  }
  if (summary.failed > 0) {
    return (
      <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
    )
  }
  return <CircleCheck aria-hidden className="size-4 shrink-0" />
}

function stageText(item: UploadItem, verdict: MediaVerdict | null): string {
  if (item.stage === "error" && item.error) return item.error
  if (item.stage === "done" && verdict) {
    // Statut relu dans la base : la fonction « files » a pu trancher depuis l'envoi.
    if (verdict.status === "checking") return texts.media.uploads.checking
    if (verdict.status === "rejected") {
      return texts.media.rejectedBecause(
        rejectReasonText(verdict.reject_reason)
      )
    }
    if (item.result?.status === "checking") return texts.media.uploads.checked
  }
  if (item.stage === "sending" && item.progress !== null) {
    return `${texts.media.uploads.stages.sending} ${formatPercent(item.progress)}`
  }
  return texts.media.uploads.stages[item.stage]
}

// Les étapes sont annoncées aux lecteurs d'écran par UploadAnnouncer (zone toujours présente) :
// ici, pas de role="alert" ajouté après coup.
function UploadRow({
  item,
  verdict,
  queue,
  onDismiss,
}: {
  item: UploadItem
  verdict: MediaVerdict | null
  queue: UploadQueue
  onDismiss: (id: string) => void
}) {
  const active = isActive(item)
  const cancellable = isCancellable(item)
  const failed = item.stage === "error" || verdict?.status === "rejected"
  // « Réessayer » disparaît une fois l'envoi relancé : le focus passe à « Annuler ».
  const lastButton = useRef<HTMLButtonElement>(null)
  return (
    <li className="flex items-start gap-3 py-2" data-stage={item.stage}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate font-medium">{item.fileName}</span>
          {item.size !== null && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatBytes(item.size)}
              {item.resumable && ` · ${texts.media.uploads.resumable}`}
            </span>
          )}
        </div>
        <p
          className={
            failed
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {stageText(item, verdict)}
        </p>
        {item.stage === "sending" && (
          <Progress
            value={item.progress === null ? null : item.progress * 100}
            aria-label={item.fileName}
          />
        )}
        {item.warnings.includes("gif_anime") && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <TriangleAlert aria-hidden className="size-4 shrink-0" />
            {texts.media.uploads.gifWarning}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {item.stage === "error" && item.canRetry && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={texts.media.uploads.retry(item.fileName)}
            onClick={() => {
              queue.retry(item.id)
              lastButton.current?.focus()
            }}
          >
            <RotateCcw />
          </Button>
        )}
        {/* Pendant l'enregistrement (quelques instants), ni annulation ni retrait. */}
        {(cancellable || !active) && (
          <Button
            ref={lastButton}
            variant="ghost"
            size="icon-sm"
            aria-label={
              cancellable
                ? texts.media.uploads.cancel(item.fileName)
                : texts.media.uploads.dismiss(item.fileName)
            }
            onClick={() =>
              cancellable ? queue.cancel(item.id) : onDismiss(item.id)
            }
          >
            <X />
          </Button>
        )}
      </div>
    </li>
  )
}

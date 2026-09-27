import { RotateCcw, TriangleAlert, X } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useUploadVerdicts } from "@/components/media/use-upload-queue"
import type { MediaVerdict } from "@/lib/media/api"
import { formatBytes, formatPercent } from "@/lib/media/format"
import { rejectReasonText, type UploadItem } from "@/lib/media/upload"
import {
  isActive,
  isCancellable,
  type UploadQueue,
} from "@/lib/media/upload-queue"
import { texts } from "@/texts"

// Nombre de listes d'envois affichées (une seule en pratique : celle de la Médiathèque).
let mountedPanels = 0

/**
 * En quittant la Médiathèque, les envois réussis et annulés quittent la liste : au retour, on
 * ne retrouve que ce qui tourne encore ou ce qui a échoué. Le retrait attend la fin de la tâche
 * en cours, pour ignorer un démontage suivi aussitôt d'un remontage (StrictMode en
 * développement, nouvel affichage de la même page).
 */
function useClearSettledOnLeave(queue: UploadQueue) {
  useEffect(() => {
    mountedPanels += 1
    return () => {
      mountedPanels -= 1
      setTimeout(() => {
        if (mountedPanels === 0) queue.clearSettled()
      }, 0)
    }
  }, [queue])
}

/** Les envois en cours et terminés : progression, annulation, erreurs, « Réessayer ». */
export function UploadPanel({
  queue,
  items,
}: {
  queue: UploadQueue
  items: UploadItem[]
}) {
  useClearSettledOnLeave(queue)
  const verdictOf = useUploadVerdicts(items)
  if (items.length === 0) return null
  const hasFinished = items.some((item) => !isActive(item))

  return (
    <Card
      size="sm"
      className="mb-6"
      role="region"
      aria-label={texts.media.uploads.title}
    >
      <CardHeader>
        <CardTitle>{texts.media.uploads.title}</CardTitle>
        {hasFinished && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queue.clearFinished()}
            >
              {texts.media.uploads.clear}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => (
            <UploadRow
              key={item.id}
              item={item}
              verdict={verdictOf(item)}
              queue={queue}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  )
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
}: {
  item: UploadItem
  verdict: MediaVerdict | null
  queue: UploadQueue
}) {
  const active = isActive(item)
  const cancellable = isCancellable(item)
  const failed = item.stage === "error" || verdict?.status === "rejected"
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
            onClick={() => queue.retry(item.id)}
          >
            <RotateCcw />
          </Button>
        )}
        {/* Pendant l'enregistrement (quelques instants), ni annulation ni retrait. */}
        {(cancellable || !active) && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              cancellable
                ? texts.media.uploads.cancel(item.fileName)
                : texts.media.uploads.dismiss(item.fileName)
            }
            onClick={() =>
              cancellable ? queue.cancel(item.id) : queue.dismiss(item.id)
            }
          >
            <X />
          </Button>
        )}
      </div>
    </li>
  )
}

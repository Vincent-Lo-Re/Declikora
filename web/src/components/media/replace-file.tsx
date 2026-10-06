import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Replace, TriangleAlert } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { acceptByKind } from "@/components/media/media-kinds"
import {
  useUploadQueue,
  useUploadVerdicts,
} from "@/components/media/use-upload-queue"
import { PanelCard } from "@/components/panel-card"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/errors"
import {
  getMediaUses,
  kickFiles,
  mediaKeys,
  replaceMedia,
  replaceMediaLive,
  trashKey,
  trashMedia,
  type KeptDraft,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { rejectReasonText } from "@/lib/media/upload"
import { texts } from "@/texts"

const labels = texts.media.replace

/**
 * « Remplacer… » ([D48]) : un nouveau fichier du même type part dans la file d'envoi habituelle
 * (fenêtre des envois) ; une fois prêt, il prend la place de celui-ci dans les brouillons. Ce
 * qui est en ligne ne change que sur « Mettre à jour ces N contenus dans l'app ». Quand plus
 * rien n'utilise l'ancien fichier, il part à la corbeille et la fiche passe au nouveau.
 */
export function ReplaceFile({
  media,
  onReplaced,
}: {
  media: Media
  onReplaced: (newId: string) => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const input = useRef<HTMLInputElement>(null)
  const { queue, items } = useUploadQueue()
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [kept, setKept] = useState<KeptDraft[]>([])
  const [replacedCount, setReplacedCount] = useState<number | null>(null)

  const item = items.find((entry) => entry.id === uploadId) ?? null
  const verdictOf = useUploadVerdicts(item ? [item] : [])
  const verdict = item ? verdictOf(item) : null
  const readyId = verdict?.status === "ready" ? verdict.id : null

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
    ])

  // Ce qui utilise encore l'ancien fichier (brouillons gardés, contenus en ligne).
  const uses = useQuery({
    queryKey: mediaKeys.uses(media.id),
    queryFn: () => getMediaUses(media.id),
    enabled: replacedCount !== null,
  })
  const liveCount = (uses.data ?? []).filter((use) => use.in_app).length

  // Plus rien ne l'utilise : l'ancien part à la corbeille, et la fiche passe au nouveau.
  const retire = useMutation({
    mutationFn: () => trashMedia(media.id),
    onSuccess: () => {
      toast.success(labels.oldTrashed)
      void kickFiles()
      if (readyId) onReplaced(readyId)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled: refresh,
  })

  const replace = useMutation({
    mutationFn: (newId: string) => replaceMedia(media.id, newId),
    onSuccess: ({ replaced, kept: stillKept }) => {
      setReplacedCount(replaced)
      setKept(stillKept)
      toast.success(labels.replaced(replaced))
    },
    onError: (error) => {
      checkAccess(error)
      toast.error(errorMessage(error))
    },
    onSettled: refresh,
  })

  const push = useMutation({
    mutationFn: (newId: string) => replaceMediaLive(media.id, newId),
    onSuccess: (count) => {
      toast.success(labels.pushed(count))
      // Le nouveau fichier devient peut-être public, l'ancien protégé : tout de suite.
      void kickFiles()
    },
    onError: (error) => {
      checkAccess(error)
      toast.error(errorMessage(error))
    },
    onSettled: refresh,
  })

  // Le nouveau fichier est prêt : il prend la place de l'ancien dans les brouillons.
  const { mutate: replaceNow, isIdle } = replace
  useEffect(() => {
    if (readyId && isIdle) replaceNow(readyId)
  }, [readyId, isIdle, replaceNow])

  // Après le remplacement : plus rien n'utilise l'ancien fichier, il part à la corbeille.
  const { mutate: retireNow, isIdle: retireIdle } = retire
  const unused =
    replacedCount !== null &&
    uses.isSuccess &&
    !uses.isFetching &&
    uses.data.length === 0
  useEffect(() => {
    if (unused && retireIdle) retireNow()
  }, [unused, retireIdle, retireNow])

  const choose = (file: File | undefined) => {
    if (!file) return
    const [id] = queue.add([file])
    setUploadId(id ?? null)
  }

  const failed =
    item && (item.stage === "error" || item.stage === "cancelled")
      ? (item.error ?? labels.failed)
      : verdict?.status === "rejected"
        ? labels.rejected(rejectReasonText(verdict.reject_reason))
        : null
  const busy =
    item !== null &&
    failed === null &&
    replacedCount === null &&
    !replace.isError
  const stage = !item
    ? null
    : item.stage !== "done"
      ? labels.uploading
      : verdict?.status === "checking"
        ? labels.checking
        : labels.replacing

  return (
    <PanelCard id="media-replace" icon={Replace} title={labels.title}>
      <div className="space-y-3" data-replace-file>
        <p className="text-sm text-muted-foreground">{labels.description}</p>
        <input
          ref={input}
          type="file"
          accept={acceptByKind[media.kind]}
          className="sr-only"
          tabIndex={-1}
          aria-label={labels.input}
          onChange={(event) => {
            choose(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        {replacedCount === null && (
          <Button
            variant="outline"
            disabled={busy || media.status !== "ready"}
            onClick={() => {
              setUploadId(null)
              replace.reset()
              input.current?.click()
            }}
          >
            {busy ? <Spinner /> : <Replace />}
            {labels.action}
          </Button>
        )}
        {busy && stage && (
          <p role="status" className="text-sm text-muted-foreground">
            {stage}
          </p>
        )}
        {failed && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>{failed}</AlertDescription>
          </Alert>
        )}
        {replacedCount !== null && readyId && (
          <div className="space-y-3">
            <p role="status" className="text-sm">
              {labels.replaced(replacedCount)}
            </p>
            {kept.length > 0 && (
              <Alert>
                <TriangleAlert />
                <AlertDescription>
                  <p>{labels.kept(kept.length)}</p>
                  <ul className="list-disc pl-4">
                    {kept.map((draft) => (
                      <li key={draft.id}>
                        {labels.keptItem(draft.title, draft.holder)}
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={replace.isPending}
                    onClick={() => replace.mutate(readyId)}
                  >
                    {replace.isPending && <Spinner />}
                    {labels.retryKept}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {liveCount > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {labels.live(liveCount)}
                </p>
                <Button
                  disabled={push.isPending}
                  onClick={() => push.mutate(readyId)}
                >
                  {push.isPending && <Spinner />}
                  {labels.push(liveCount)}
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={() => onReplaced(readyId)}>
              {labels.openNew}
            </Button>
          </div>
        )}
      </div>
    </PanelCard>
  )
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { AudioLines, Search, Upload } from "lucide-react"
import { useEffect, useRef, useState, type ComponentProps } from "react"

import { MediaThumbnail } from "@/components/media/media-visuals"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import {
  useUploadQueue,
  useUploadQueueWatch,
} from "@/components/media/use-upload-queue"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { listMedia, mediaKeys, type MediaFilters } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { formatDuration, formatPercent } from "@/lib/media/format"
import { getUploadQueue, type UploadQueue } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

// Ce que l'on choisit : une image (bloc Image, image de présentation) ou un audio (épisode).
type PickerKind = "image" | "audio"

const pickerLabels = {
  image: texts.editor.picker,
  audio: { ...texts.editor.picker, ...texts.editor.audioPicker },
}

// Les audios qu'accepte la médiathèque (MP3, M4A) ; même remarque que pour les images.
const acceptedAudios = [
  ".mp3",
  ".m4a",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
].join(",")

// Ce que propose le sélecteur de fichiers : les photos et images seulement, celles que le bloc
// Image accepte (le navigateur en fait un filtre, pas une règle : un autre fichier est signalé).
const acceptedImages = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
].join(",")

/**
 * Choisir une image (ou un audio) de la médiathèque (les fichiers prêts seulement : la base
 * refuse un fichier en vérification ou dans la corbeille), ou en envoyer un nouveau, choisi dès
 * qu'il est prêt. Mêmes vignettes et même file d'envoi que la Médiathèque.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onChoose,
  kind = "image",
  queue = getUploadQueue(),
  finalFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (media: Media) => void
  kind?: PickerKind
  queue?: UploadQueue
  // Où va le focus à la fermeture, quand le bouton qui l'a ouverte a disparu (Base UI).
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"]
}) {
  const labels = pickerLabels[kind]
  // L'éditeur est hors du menu (AppLayout) : c'est ici qu'on relit la médiathèque après un
  // envoi et qu'on prévient avant de quitter la page pendant un envoi.
  useUploadQueueWatch(queue)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" finalFocus={finalFocus}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {open && <PickerBody kind={kind} onChoose={onChoose} queue={queue} />}
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({
  kind,
  onChoose,
  queue,
}: {
  kind: PickerKind
  onChoose: (media: Media) => void
  queue: UploadQueue
}) {
  const labels = pickerLabels[kind]
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search, 250)
  const filters: MediaFilters = { kind, search: debounced, unused: false }
  const media = useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: () => listMedia(filters),
    placeholderData: keepPreviousData,
  })
  const ready = (media.data ?? []).filter((item) => item.status === "ready")
  const urlFor = usePreviewUrls(ready)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={labels.searchPlaceholder}
            aria-label={labels.search}
            className="pl-8"
          />
        </div>
        <PickerUpload kind={kind} queue={queue} onChoose={onChoose} />
      </div>
      {media.data === undefined ? (
        media.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {labels.loadFailed}
            </p>
            <Button variant="outline" onClick={() => media.refetch()}>
              {texts.common.retry}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full" />
            ))}
          </div>
        )
      ) : ready.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {debounced.trim() ? labels.noResults : labels.empty}
        </p>
      ) : kind === "audio" ? (
        <ul className="max-h-picker space-y-2 overflow-y-auto p-0.5">
          {ready.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={labels.choose(item.name)}
                onClick={() => onChoose(item)}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <AudioLines
                  aria-hidden
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                {!item.transcript?.trim() && (
                  <span className="shrink-0 text-xs text-warning">
                    {texts.editor.audioPicker.noTranscript}
                  </span>
                )}
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {item.duration_s !== null
                    ? formatDuration(item.duration_s)
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid max-h-picker grid-cols-4 gap-3 overflow-y-auto p-0.5">
          {ready.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={labels.choose(item.name)}
                onClick={() => onChoose(item)}
                className="group w-full overflow-hidden rounded-lg border text-left outline-none hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <MediaThumbnail
                  media={item}
                  url={urlFor(item)}
                  className="aspect-square w-full"
                />
                <span className="block truncate px-2 py-1.5 text-xs">
                  {item.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * « Envoyer une image » : le fichier passe par la file d'envoi de la Médiathèque (réduction,
 * envoi, enregistrement). Dès qu'il est prêt, il est choisi, et la fenêtre se ferme. Si on la
 * ferme avant, l'envoi continue et le fichier arrive dans la Médiathèque.
 */
function PickerUpload({
  kind,
  queue,
  onChoose,
}: {
  kind: PickerKind
  queue: UploadQueue
  onChoose: (media: Media) => void
}) {
  const labels = pickerLabels[kind]
  const input = useRef<HTMLInputElement>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [notImage, setNotImage] = useState<string | null>(null)
  const { items } = useUploadQueue(queue)
  const item = uploadId
    ? (items.find((other) => other.id === uploadId) ?? null)
    : null
  // La fin de l'envoi arrive par la file (système extérieur à React).
  useEffect(() => {
    if (!uploadId) return
    return queue.onSettled((settled) => {
      const result = settled.result
      if (settled.id !== uploadId || settled.stage !== "done" || !result) {
        return
      }
      queue.dismiss(uploadId)
      setUploadId(null)
      if (result.kind === kind && result.status === "ready") {
        onChoose(result)
      } else {
        // Un SVG, un PDF… : il est bien dans la Médiathèque, mais pas du type attendu.
        setNotImage(result.name)
      }
    })
  }, [uploadId, queue, onChoose, kind])

  const onFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setNotImage(null)
    if (uploadId) queue.dismiss(uploadId)
    const [id] = queue.add([file])
    setUploadId(id)
  }

  const busy =
    item !== null && item.stage !== "error" && item.stage !== "cancelled"

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={kind === "audio" ? acceptedAudios : acceptedImages}
        className="sr-only"
        tabIndex={-1}
        aria-label={labels.uploadInput}
        onChange={(event) => {
          onFiles(event.target.files)
          event.target.value = ""
        }}
      />
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload />
        {labels.upload}
      </Button>
      {/* Zone toujours présente, pour que les lecteurs d'écran annoncent chaque changement. */}
      <div role="status" className="basis-full empty:hidden">
        {notImage ? (
          <p className="text-sm text-destructive">
            {labels.notImage(notImage)}
          </p>
        ) : item?.stage === "error" ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-destructive">
              {labels.uploadFailed(item.fileName, item.error ?? "")}
            </p>
            {item.canRetry && (
              <Button variant="outline" onClick={() => queue.retry(item.id)}>
                {texts.common.retry}
              </Button>
            )}
          </div>
        ) : item ? (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {item.stage === "sending" && item.progress !== null
                ? labels.uploadingProgress(
                    item.fileName,
                    formatPercent(item.progress)
                  )
                : labels.uploading(item.fileName)}
            </p>
            {item.stage === "sending" && (
              <Progress
                value={item.progress === null ? null : item.progress * 100}
                aria-label={item.fileName}
              />
            )}
          </div>
        ) : null}
      </div>
    </>
  )
}

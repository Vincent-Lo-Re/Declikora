import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search, Upload } from "lucide-react"
import { useEffect, useRef, useState } from "react"

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
import { formatPercent } from "@/lib/media/format"
import { getUploadQueue, type UploadQueue } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

const labels = texts.editor.picker

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
 * Choisir une image de la médiathèque (les fichiers prêts seulement : la base refuse un fichier
 * en vérification ou dans la corbeille), ou en envoyer une nouvelle, choisie dès qu'elle est
 * prête. Mêmes vignettes et même file d'envoi que la Médiathèque.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onChoose,
  queue = getUploadQueue(),
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (media: Media) => void
  queue?: UploadQueue
}) {
  // L'éditeur est hors du menu (AppLayout) : c'est ici qu'on relit la médiathèque après un
  // envoi et qu'on prévient avant de quitter la page pendant un envoi.
  useUploadQueueWatch(queue)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {open && <PickerBody onChoose={onChoose} queue={queue} />}
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({
  onChoose,
  queue,
}: {
  onChoose: (media: Media) => void
  queue: UploadQueue
}) {
  const [search, setSearch] = useState("")
  const debounced = useDebouncedValue(search, 250)
  const filters: MediaFilters = { kind: "image", search: debounced }
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
        <PickerUpload queue={queue} onChoose={onChoose} />
      </div>
      {media.data === undefined ? (
        media.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {labels.loadFailed}
            </p>
            <Button variant="outline" onClick={() => media.refetch()}>
              {labels.retry}
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
      ) : (
        <ul className="grid max-h-[60vh] grid-cols-4 gap-3 overflow-y-auto p-0.5">
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
  queue,
  onChoose,
}: {
  queue: UploadQueue
  onChoose: (media: Media) => void
}) {
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
      if (result.kind === "image" && result.status === "ready") {
        onChoose(result)
      } else {
        // Un SVG, un PDF… : il est bien dans la Médiathèque, mais le bloc Image n'en veut pas.
        setNotImage(result.name)
      }
    })
  }, [uploadId, queue, onChoose])

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
        accept={acceptedImages}
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
                {labels.retry}
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

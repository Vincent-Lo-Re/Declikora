import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  LayoutGrid,
  List,
  Search,
  TriangleAlert,
  Upload,
  UploadCloud,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { kindIcons } from "@/components/media/media-kinds"
import { MediaGrid, MediaTable } from "@/components/media/media-collection"
import { MediaSheet } from "@/components/media/media-sheet"
import { OrphansNotice } from "@/components/media/orphans-notice"
import { StorageUsage } from "@/components/media/storage-usage"
import { UploadPanel } from "@/components/media/upload-panel"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import { useUploadQueue } from "@/components/media/use-upload-queue"
import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  getMedia,
  listMedia,
  MEDIA_LIST_LIMIT,
  mediaKeys,
  type MediaFilters,
} from "@/lib/media/api"
import {
  INTERRUPTED_AFTER_MS,
  mediaKinds,
  type Media,
} from "@/lib/media/constants"
import { texts } from "@/texts"

type View = "grid" | "list"

const viewStorageKey = "declikora:mediatheque:affichage"

// « /mediatheque?fichier=<id> » ouvre la fiche de ce fichier (lien depuis l'éditeur : la
// transcription d'un audio, le texte alternatif d'une image de présentation).
const FILE_PARAM = "fichier"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Ce que le sélecteur de fichiers propose (le navigateur en fait un filtre, pas une règle).
const acceptedFiles = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".svg",
  ".json",
  ".mp3",
  ".m4a",
  ".pdf",
  "image/*",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "application/pdf",
  "application/json",
].join(",")

function readView(): View {
  try {
    return localStorage.getItem(viewStorageKey) === "list" ? "list" : "grid"
  } catch {
    return "grid"
  }
}

function saveView(view: View) {
  try {
    localStorage.setItem(viewStorageKey, view)
  } catch {
    // Préférence non gardée : sans conséquence.
  }
}

/**
 * Vrai tant qu'un fichier est en vérification ou en cours d'envoi (depuis moins d'une heure) :
 * la liste est alors relue toutes les 3 secondes.
 */
function needsRefresh(items: Media[] | undefined): boolean {
  const now = Date.now()
  return (items ?? []).some(
    (media) =>
      media.status === "checking" ||
      (media.status === "pending" &&
        now - new Date(media.status_changed_at).getTime() <
          INTERRUPTED_AFTER_MS)
  )
}

/** Médiathèque : tous les fichiers, l'envoi, la fiche de chaque fichier. */
export function MediaPage() {
  const { title, description } = texts.sections.media
  const checkAccess = useAccessCheck()
  const { queue, items: uploads } = useUploadQueue()
  const [kind, setKind] = useState<MediaFilters["kind"]>("all")
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 250)
  const [view, setView] = useState<View>(readView)
  // Fiche ouverte : relue dans la liste à chaque mise à jour, gardée si elle en sort.
  const [opened, setOpened] = useState<Media | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadButton = useRef<HTMLButtonElement>(null)
  // Après une mise à la corbeille depuis la fiche : id du fichier voisin qui reçoit le focus
  // (le bouton qui avait ouvert la fiche disparaît de la liste avec le fichier).
  const focusAfterTrash = useRef<string | null>(null)

  const filters = { kind, search: debouncedSearch }
  const media = useQuery({
    queryKey: mediaKeys.list(filters),
    queryFn: () => listMedia(filters),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (needsRefresh(query.state.data) ? 3000 : false),
  })
  useEffect(() => {
    if (media.error) checkAccess(media.error)
  }, [media.error, checkAccess])

  // La fiche demandée par l'adresse, tant qu'aucune autre n'a été ouverte.
  const [searchParams, setSearchParams] = useSearchParams()
  const askedParam = searchParams.get(FILE_PARAM)
  const askedId = askedParam && UUID.test(askedParam) ? askedParam : null
  const asked = useQuery({
    queryKey: mediaKeys.one(askedId ?? ""),
    queryFn: () => getMedia(askedId ?? ""),
    enabled: askedId !== null,
  })
  const forgetAsked = useCallback(() => {
    if (!searchParams.has(FILE_PARAM)) return
    setSearchParams(
      (params) => {
        params.delete(FILE_PARAM)
        return params
      },
      { replace: true }
    )
  }, [searchParams, setSearchParams])
  // Un fichier introuvable (supprimé entre-temps, ou adresse abîmée) : on le dit.
  const askedMissing =
    askedParam !== null &&
    (askedId === null || (asked.isSuccess && asked.data === null))
  useEffect(() => {
    if (!askedMissing) return
    toast.error(texts.media.errors.fichier_introuvable)
    forgetAsked()
  }, [askedMissing, forgetAsked])
  const shown = opened ?? (askedId ? (asked.data ?? null) : null)

  const urlFor = usePreviewUrls(
    shown && !media.data?.some((item) => item.id === shown.id)
      ? [...(media.data ?? []), shown]
      : media.data
  )
  const selected = shown
    ? (media.data?.find((item) => item.id === shown.id) ?? shown)
    : null
  const closeSheet = () => {
    setOpened(null)
    forgetAsked()
  }

  const addFiles = useCallback(
    (files: FileList | File[] | null) => {
      const list = Array.from(files ?? [])
      if (list.length > 0) queue.add(list)
    },
    [queue]
  )

  // Glisser-déposer n'importe où sur la page.
  useEffect(() => {
    let depth = 0
    const hasFiles = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files") ?? false
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth += 1
      setDragging(true)
    }
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth = 0
      setDragging(false)
      addFiles(event.dataTransfer?.files ?? null)
    }
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragleave", onLeave)
    window.addEventListener("dragover", onOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragleave", onLeave)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [addFiles])

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files)
    // Le même fichier pourra être choisi de nouveau.
    event.target.value = ""
  }

  const filtering = debouncedSearch.trim() !== "" || kind !== "all"

  const onTrashed = (trashed: Media) => {
    const items = media.data ?? []
    const index = items.findIndex((item) => item.id === trashed.id)
    const neighbor =
      index === -1 ? null : (items[index + 1] ?? items[index - 1])
    focusAfterTrash.current = neighbor?.id ?? ""
    closeSheet()
  }

  // Où va le focus quand la fiche se ferme : par défaut, le bouton qui l'a ouverte ; après une
  // mise à la corbeille, le fichier suivant (ou précédent), sinon « Envoyer des fichiers ».
  const sheetFinalFocus = () => {
    const target = focusAfterTrash.current
    focusAfterTrash.current = null
    if (target === null) return true
    const neighbor = target
      ? document.querySelector<HTMLElement>(
          // Un id est un uuid : rien à échapper dans le sélecteur.
          `[data-media-open="${target}"]`
        )
      : null
    return neighbor ?? uploadButton.current
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={acceptedFiles}
              className="sr-only"
              tabIndex={-1}
              aria-label={texts.media.uploadInput}
              onChange={onInputChange}
            />
            <Button
              ref={uploadButton}
              onClick={() => fileInput.current?.click()}
            >
              <Upload />
              {texts.media.upload}
            </Button>
          </>
        }
      />

      <div className="mb-6 space-y-4">
        <StorageUsage />
        <OrphansNotice />
      </div>

      <UploadPanel queue={queue} items={uploads} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={texts.media.searchPlaceholder}
            aria-label={texts.media.search}
            className="pl-8"
          />
        </div>
        <ToggleGroup
          variant="outline"
          aria-label={texts.media.filters.label}
          value={[kind]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next) setKind(next as MediaFilters["kind"])
          }}
        >
          <ToggleGroupItem value="all">
            {texts.media.filters.all}
          </ToggleGroupItem>
          {mediaKinds.map((item) => {
            const Icon = kindIcons[item]
            return (
              <ToggleGroupItem key={item} value={item}>
                <Icon />
                {texts.media.filters[item]}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <ToggleGroup
          variant="outline"
          className="ml-auto"
          aria-label={texts.media.view.label}
          value={[view]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next === "grid" || next === "list") {
              setView(next)
              saveView(next)
            }
          }}
        >
          <ToggleGroupItem value="grid" aria-label={texts.media.view.grid}>
            <LayoutGrid />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label={texts.media.view.list}>
            <List />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {media.data === undefined ? (
        media.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {texts.media.loadFailed} {media.error.message}
            </p>
            <Button variant="outline" onClick={() => media.refetch()}>
              {texts.media.retry}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="aspect-square w-full" />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {media.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription className="flex flex-wrap items-center gap-x-2">
                {texts.media.refreshFailed}
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => media.refetch()}
                >
                  {texts.media.retry}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {media.data.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {filtering ? <Search /> : <UploadCloud />}
                </EmptyMedia>
                <EmptyTitle>
                  {filtering
                    ? texts.media.noResults.title
                    : texts.media.empty.title}
                </EmptyTitle>
                <EmptyDescription>
                  {filtering
                    ? texts.media.noResults.description
                    : texts.media.empty.description}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : view === "grid" ? (
            <MediaGrid
              items={media.data}
              urlFor={urlFor}
              onOpen={setOpened}
              now={media.dataUpdatedAt}
            />
          ) : (
            <MediaTable
              items={media.data}
              urlFor={urlFor}
              onOpen={setOpened}
              now={media.dataUpdatedAt}
            />
          )}
          {media.data.length >= MEDIA_LIST_LIMIT && (
            <p className="text-sm text-muted-foreground">
              {texts.media.tooMany(MEDIA_LIST_LIMIT)}
            </p>
          )}
        </div>
      )}

      <MediaSheet
        media={selected}
        url={selected ? urlFor(selected) : undefined}
        now={media.dataUpdatedAt}
        onClose={closeSheet}
        onTrashed={onTrashed}
        finalFocus={sheetFinalFocus}
      />

      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary px-12 py-10 text-center">
            <UploadCloud className="size-10" />
            <p className="text-lg font-medium">{texts.media.dropTitle}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {texts.media.dropHint}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  GalleryHorizontalEnd,
  LayoutGrid,
  List,
  Search,
  TriangleAlert,
  Unlink,
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

import {
  BulkTrashButton,
  KeptNotice,
  SelectAllToggle,
  type SelectAll,
} from "@/components/bulk-selection"
import { ListCard } from "@/components/list-card"
import { LoadState } from "@/components/load-state"
import { acceptedFiles, kindIcons } from "@/components/media/media-kinds"
import { MediaGrid, MediaTable } from "@/components/media/media-collection"
import { MediaSheet } from "@/components/media/media-sheet"
import { OrphansNotice } from "@/components/media/orphans-notice"
import { StorageUsage } from "@/components/media/storage-usage"
import { useBulkTrash } from "@/components/media/use-bulk-trash"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import { PageHeader } from "@/components/page-header"
import { SearchInput } from "@/components/search-input"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAddressState } from "@/hooks/use-address-state"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  askedFileFromAddress,
  FILE_PARAM,
  mediaFiltersFromAddress,
  writeMediaFilters,
} from "@/lib/address"
import {
  selectionOf,
  toggleAll,
  toggleSelected,
  type Kept,
} from "@/lib/bulk-trash"
import { MEDIA_LIST_LIMIT, type MediaFilters } from "@/lib/media/api"
import {
  INTERRUPTED_AFTER_MS,
  mediaKinds,
  type Media,
} from "@/lib/media/constants"
import { getUploadQueue } from "@/lib/media/upload-queue"
import { mediaListRead, mediaRead } from "@/lib/reads"
import { sections } from "@/navigation"
import { texts } from "@/texts"

type View = "grid" | "list"

const viewStorageKey = "declikora:mediatheque:affichage"

const viewChoices: { value: View; Icon: typeof LayoutGrid }[] = [
  { value: "grid", Icon: LayoutGrid },
  { value: "list", Icon: List },
]

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
  // Les envois se suivent dans la fenêtre des envois (UploadWindow, dans AppLayout).
  const queue = getUploadQueue()
  // La recherche et les filtres, gardés dans l'adresse (on retrouve la liste en y revenant).
  const [address, setAddress] = useAddressState(
    mediaFiltersFromAddress,
    writeMediaFilters
  )
  const { kind, unused, search } = address
  const setKind = (next: MediaFilters["kind"]) =>
    setAddress({ ...address, kind: next })
  const setUnused = (next: boolean) => setAddress({ ...address, unused: next })
  const setSearch = (next: string) => setAddress({ ...address, search: next })
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
  // Sélection en masse : les fichiers cochés, et ceux gardés car encore utilisés.
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [kept, setKept] = useState<Kept<Media>[]>([])
  const selectAll = useRef<HTMLButtonElement>(null)

  const filters: MediaFilters = { kind, search: debouncedSearch, unused }
  const media = useQuery({
    ...mediaListRead(filters),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (needsRefresh(query.state.data) ? 3000 : false),
  })
  useEffect(() => {
    if (media.error) checkAccess(media.error)
  }, [media.error, checkAccess])

  // La fiche demandée par l'adresse, tant qu'aucune autre n'a été ouverte.
  const [searchParams, setSearchParams] = useSearchParams()
  const askedParam = searchParams.get(FILE_PARAM)
  const askedId = askedFileFromAddress(searchParams)
  const asked = useQuery({
    ...mediaRead(askedId ?? ""),
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

  const filtering = debouncedSearch.trim() !== "" || kind !== "all" || unused
  // « Non utilisés » seul et rien à montrer : tout sert, ce n'est pas une recherche ratée.
  const emptyText = !filtering
    ? texts.media.empty
    : unused && kind === "all" && debouncedSearch.trim() === ""
      ? texts.media.noUnused
      : texts.media.noResults

  const shownItems = media.data ?? []
  const selection = selectionOf(checkedIds, shownItems)
  const bulkTrash = useBulkTrash((result) => {
    setCheckedIds((current) => {
      const next = new Set(current)
      for (const trashed of result.trashed) next.delete(trashed.id)
      return next
    })
    setKept(result.kept)
    // Le bouton « Mettre à la corbeille » disparaît quand tout est parti : le focus va sur
    // « Tout sélectionner », ou sur « Envoyer des fichiers » si la liste va être vide.
    if (result.kept.length === 0 && result.error === null) {
      const emptied = result.trashed.length === shownItems.length
      ;(emptied ? uploadButton.current : selectAll.current)?.focus()
    }
  })

  const onTrashed = (trashed: Media) => {
    const items = media.data ?? []
    const index = items.findIndex((item) => item.id === trashed.id)
    const neighbor =
      index === -1 ? null : (items[index + 1] ?? items[index - 1])
    focusAfterTrash.current = neighbor?.id ?? ""
    setCheckedIds((current) => toggleSelected(current, trashed.id, false))
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

  const selectAllProps: SelectAll = {
    all: selection.all,
    some: selection.some,
    disabled: bulkTrash.isPending,
    onToggleAll: (checked) =>
      setCheckedIds((current) => toggleAll(current, shownItems, checked)),
  }
  const collectionSelection = {
    selectAll: selectAllProps,
    selected: checkedIds,
    onSelect: (item: Media, checked: boolean) =>
      setCheckedIds((current) => toggleSelected(current, item.id, checked)),
    selectionDisabled: bulkTrash.isPending,
  }

  return (
    <>
      <PageHeader
        icon={sections.media.icon}
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
            <BulkTrashButton
              count={selection.items.length}
              pending={bulkTrash.isPending}
              onClick={() => bulkTrash.mutate(selection.items)}
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

      {/* Sur une seule ligne : la recherche rétrécit quand la place manque, le reste garde sa taille. */}
      <div className="mb-6 flex items-center gap-3 *:shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          label={texts.media.search}
          placeholder={texts.media.searchPlaceholder}
          className="w-72 min-w-32 shrink!"
        />
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
            <GalleryHorizontalEnd />
            {texts.media.filters.all}
          </ToggleGroupItem>
          {/* Une icône par type : son nom dans une infobulle et pour les lecteurs d'écran. */}
          {mediaKinds.map((item) => {
            const Icon = kindIcons[item]
            const label = texts.media.filters[item]
            return (
              <Tooltip key={item}>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value={item}
                      size="icon"
                      aria-label={label}
                    />
                  }
                >
                  <Icon />
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            )
          })}
        </ToggleGroup>
        {/* Pour entretenir la médiathèque, avec la sélection en masse. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                variant="outline"
                size="icon"
                aria-label={texts.media.filters.unused}
                pressed={unused}
                onPressedChange={setUnused}
              />
            }
          >
            <Unlink />
          </TooltipTrigger>
          <TooltipContent>{texts.media.filters.unused}</TooltipContent>
        </Tooltip>
        {/* Avant Grille et Liste, au même format : sur les fichiers affichés, dans les deux vues. */}
        <div className="ml-auto">
          <SelectAllToggle
            {...selectAllProps}
            disabled={selectAllProps.disabled || shownItems.length === 0}
            buttonRef={selectAll}
          />
        </div>
        <ToggleGroup
          variant="outline"
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
          {/* Comme les filtres de type : une icône, son nom dans une infobulle. */}
          {viewChoices.map(({ value, Icon }) => (
            <Tooltip key={value}>
              <TooltipTrigger
                render={
                  <ToggleGroupItem
                    value={value}
                    size="icon"
                    aria-label={texts.media.view[value]}
                  />
                }
              >
                <Icon />
              </TooltipTrigger>
              <TooltipContent>{texts.media.view[value]}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
      </div>

      {media.data === undefined ? (
        <ListCard className="p-4">
          <LoadState
            query={media}
            failed={texts.media.loadFailed}
            skeleton={
              <div className="grid grid-cols-media gap-4">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="aspect-square w-full" />
                ))}
              </div>
            }
          />
        </ListCard>
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
                  {texts.common.retry}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {media.data.length === 0 ? (
            <Empty className="bg-card ring-1 ring-foreground/10">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  {filtering ? <Search /> : <UploadCloud />}
                </EmptyMedia>
                <EmptyTitle>{emptyText.title}</EmptyTitle>
                <EmptyDescription>{emptyText.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {kept.length > 0 && (
                <KeptNotice
                  kept={kept}
                  nameOf={(item) => item.name}
                  words={texts.media.selection}
                  onClose={() => {
                    setKept([])
                    selectAll.current?.focus()
                  }}
                />
              )}
              {view === "grid" ? (
                <MediaGrid
                  items={media.data}
                  urlFor={urlFor}
                  onOpen={setOpened}
                  now={media.dataUpdatedAt}
                  {...collectionSelection}
                />
              ) : (
                <MediaTable
                  items={media.data}
                  urlFor={urlFor}
                  onOpen={setOpened}
                  now={media.dataUpdatedAt}
                  {...collectionSelection}
                />
              )}
            </>
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
        onReplaced={(newId) => {
          // La fiche du nouveau fichier, par l'adresse (il n'est peut-être pas encore dans la
          // liste relue).
          setOpened(null)
          setSearchParams(
            (params) => {
              params.set(FILE_PARAM, newId)
              return params
            },
            { replace: true }
          )
        }}
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

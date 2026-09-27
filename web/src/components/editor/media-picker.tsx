import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

import { MediaThumbnail } from "@/components/media/media-visuals"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { listMedia, mediaKeys, type MediaFilters } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.picker

/**
 * Choisir une image de la médiathèque (les fichiers prêts seulement : la base refuse un fichier
 * en vérification ou dans la corbeille). Mêmes vignettes que la Médiathèque.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChoose: (media: Media) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        {open && <PickerBody onChoose={onChoose} />}
      </DialogContent>
    </Dialog>
  )
}

function PickerBody({ onChoose }: { onChoose: (media: Media) => void }) {
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
      <div className="relative">
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
        <div className="space-y-3 py-6 text-center text-sm text-muted-foreground">
          <p>{debounced.trim() ? labels.noResults : labels.empty}</p>
          {!debounced.trim() && (
            <Link
              to={sections.media.path}
              className={buttonVariants({ variant: "outline" })}
            >
              {labels.toLibrary}
            </Link>
          )}
        </div>
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

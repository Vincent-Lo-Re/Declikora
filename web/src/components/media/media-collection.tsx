import { rejectedText } from "@/components/media/media-kinds"
import {
  MediaStatusBadge,
  MediaThumbnail,
} from "@/components/media/media-visuals"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
import type { Media } from "@/lib/media/constants"
import { formatBytes, formatMediaDetails } from "@/lib/media/format"
import { texts } from "@/texts"

type CollectionProps = {
  items: Media[]
  urlFor: (media: Media) => string | undefined
  onOpen: (media: Media) => void
  // Heure de la liste chargée : l'état « Envoi interrompu » ne dépend pas du rendu.
  now: number
}

/** Les fichiers en grille : vignette, nom, type, poids et état. */
export function MediaGrid({ items, urlFor, onOpen, now }: CollectionProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4">
      {items.map((media) => (
        <li key={media.id}>
          <button
            type="button"
            className="group flex w-full flex-col overflow-hidden rounded-xl text-left ring-1 ring-foreground/10 transition-shadow outline-none hover:ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={texts.media.open(media.name)}
            aria-describedby={`media-${media.id}-etat`}
            data-media-open={media.id}
            onClick={() => onOpen(media)}
          >
            <MediaThumbnail
              media={media}
              url={urlFor(media)}
              className="aspect-square w-full"
            />
            <div className="space-y-1.5 p-3" id={`media-${media.id}-etat`}>
              <p className="truncate text-sm font-medium" title={media.name}>
                {media.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {texts.media.kinds[media.kind]} ·{" "}
                {formatBytes(media.size_bytes)}
              </p>
              {media.status === "rejected" ? (
                <p className="text-xs text-destructive">
                  {rejectedText(media)}
                </p>
              ) : (
                <MediaStatusBadge media={media} now={now} />
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Les fichiers en liste, avec toutes leurs informations. */
export function MediaTable({ items, urlFor, onOpen, now }: CollectionProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">
            <span className="sr-only">{texts.media.columns.preview}</span>
          </TableHead>
          <TableHead>{texts.media.columns.name}</TableHead>
          <TableHead>{texts.media.columns.kind}</TableHead>
          <TableHead>{texts.media.columns.size}</TableHead>
          <TableHead>{texts.media.columns.details}</TableHead>
          <TableHead>{texts.media.columns.createdAt}</TableHead>
          <TableHead>{texts.media.columns.status}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((media) => (
          <TableRow key={media.id}>
            <TableCell>
              <MediaThumbnail
                media={media}
                url={urlFor(media)}
                className="size-10 rounded-md"
                iconClassName="size-4"
              />
            </TableCell>
            <TableCell className="max-w-72">
              <button
                type="button"
                className="max-w-full truncate text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:underline"
                aria-label={texts.media.open(media.name)}
                title={media.name}
                data-media-open={media.id}
                onClick={() => onOpen(media)}
              >
                {media.name}
              </button>
            </TableCell>
            <TableCell>{texts.media.kinds[media.kind]}</TableCell>
            <TableCell>{formatBytes(media.size_bytes)}</TableCell>
            <TableCell>{formatMediaDetails(media) ?? "—"}</TableCell>
            <TableCell>{formatDateTime(media.created_at)}</TableCell>
            <TableCell>
              {media.status === "rejected" ? (
                <span className="text-xs whitespace-normal text-destructive">
                  {rejectedText(media)}
                </span>
              ) : (
                <MediaStatusBadge media={media} now={now} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

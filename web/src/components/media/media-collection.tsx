import { cn } from "cn"

import { rejectedText } from "@/components/media/media-kinds"
import {
  MediaStatusBadge,
  MediaThumbnail,
  MediaUnusedBadge,
} from "@/components/media/media-visuals"
import { Checkbox } from "@/components/ui/checkbox"
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
  // Sélection en masse : les fichiers cochés, et le changement d'une case.
  selected: ReadonlySet<string>
  onSelect: (media: Media, checked: boolean) => void
  // Pendant une mise à la corbeille en masse, les cases ne bougent plus.
  selectionDisabled: boolean
}

/** Les fichiers en grille : vignette, nom, type, poids et état. */
export function MediaGrid({
  items,
  urlFor,
  onOpen,
  now,
  selected,
  onSelect,
  selectionDisabled,
}: CollectionProps) {
  // Dès qu'un fichier est coché, un clic sur une vignette la coche au lieu d'ouvrir sa fiche.
  const selecting = items.some((media) => selected.has(media.id))
  return (
    <ul className="grid grid-cols-media gap-4">
      {items.map((media) => {
        const checked = selected.has(media.id)
        return (
          <li key={media.id} className="group/media relative">
            {/* La case apparaît au survol ou au clavier, et reste visible pendant une sélection. */}
            <div
              className={cn(
                "absolute top-2 left-2 z-10 flex rounded-md bg-background/90 p-1.5 shadow-sm transition-opacity group-hover/media:opacity-100 focus-within:opacity-100 motion-reduce:transition-none",
                selecting ? "opacity-100" : "opacity-0"
              )}
            >
              <Checkbox
                aria-label={texts.media.selection.select(media.name)}
                checked={checked}
                disabled={selectionDisabled}
                onCheckedChange={(value) => onSelect(media, value)}
              />
            </div>
            <button
              type="button"
              className={cn(
                "group flex w-full flex-col overflow-hidden rounded-xl text-left ring-1 ring-foreground/10 transition-shadow outline-none hover:ring-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50",
                checked && "ring-2 ring-primary hover:ring-primary"
              )}
              // Pendant une sélection, la vignette entière coche ou décoche le fichier.
              aria-label={
                selecting
                  ? texts.media.selection.select(media.name)
                  : texts.media.open(media.name)
              }
              aria-pressed={selecting ? checked : undefined}
              // Au clavier, la case suffit : pas deux arrêts pour le même fichier.
              tabIndex={selecting ? -1 : undefined}
              aria-describedby={`media-${media.id}-etat`}
              data-media-open={media.id}
              onClick={() => {
                if (!selecting) onOpen(media)
                else if (!selectionDisabled) onSelect(media, !checked)
              }}
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
                  <div className="flex flex-wrap gap-1.5">
                    <MediaStatusBadge media={media} now={now} />
                    <MediaUnusedBadge media={media} />
                  </div>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Les fichiers en liste, avec toutes leurs informations. */
export function MediaTable({
  items,
  urlFor,
  onOpen,
  now,
  selected,
  onSelect,
  selectionDisabled,
}: CollectionProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-0">
            <span className="sr-only">{texts.media.selection.column}</span>
          </TableHead>
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
          <TableRow
            key={media.id}
            data-state={selected.has(media.id) ? "selected" : undefined}
          >
            <TableCell>
              <Checkbox
                aria-label={texts.media.selection.select(media.name)}
                checked={selected.has(media.id)}
                disabled={selectionDisabled}
                onCheckedChange={(value) => onSelect(media, value)}
              />
            </TableCell>
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
                <div className="flex flex-wrap gap-1.5">
                  <MediaStatusBadge media={media} now={now} />
                  <MediaUnusedBadge media={media} />
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

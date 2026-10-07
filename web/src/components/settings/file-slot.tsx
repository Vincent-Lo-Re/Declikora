import { cn } from "cn"
import { ImageIcon, ImagePlus, Trash2, UploadCloud } from "lucide-react"
import { useId } from "react"

import { Button } from "@/components/ui/button"
import { Item } from "@/components/ui/item"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFileDrop } from "@/hooks/use-file-drop"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Une case de fichier (Paramètres, section « Logos ») : l'aperçu sur son fond (un clic choisit
 * ou remplace le fichier, l'image prend son « + » au survol ; on peut aussi y déposer un fichier),
 * l'icône qui le retire dans son coin, et sa légende en bas du cadre (« Fond clair »).
 */
export function FileSlot({
  label,
  caption,
  url,
  busy,
  accept,
  onChoose,
  onRemove,
  frameClassName,
  zoneClassName,
}: {
  /** Le nom du champ, pour les lecteurs d'écran (« Logotype · fond clair »). */
  label: string
  caption: string
  url: string | null
  busy: boolean
  accept: string
  onChoose: (file: File) => void
  onRemove: () => void
  /** Le fond de l'aperçu. */
  frameClassName: string
  /** La couleur des icônes sur ce fond. */
  zoneClassName: string
}) {
  const inputId = useId()
  const drop = useFileDrop(onChoose, busy)

  return (
    <div data-file-slot={label} {...drop.handlers}>
      <Item
        variant="outline"
        className={cn(
          "relative aspect-3/2 overflow-hidden p-0 transition-shadow",
          drop.dragging && "ring-2 ring-primary",
          frameClassName
        )}
      >
        <label
          htmlFor={inputId}
          className={cn(
            "group/zone absolute inset-0 flex cursor-pointer items-center justify-center px-3 pt-3 pb-8",
            zoneClassName
          )}
        >
          <span className="sr-only">
            {url ? labels.replace : labels.choose}
          </span>
          {busy ? (
            <Spinner className="size-6" />
          ) : drop.dragging ? (
            <UploadCloud aria-hidden className="size-6" />
          ) : url ? (
            <>
              <img
                src={url}
                alt={label}
                className="max-h-full max-w-full object-contain transition-opacity group-hover/zone:opacity-30"
              />
              <ImagePlus
                aria-hidden
                className="absolute size-8 opacity-0 transition-opacity group-hover/zone:opacity-100"
              />
            </>
          ) : (
            <>
              <ImageIcon
                aria-hidden
                className="size-8 group-hover/zone:hidden"
              />
              <ImagePlus
                aria-hidden
                className="hidden size-8 group-hover/zone:block"
              />
            </>
          )}
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-2 text-center text-xs"
          >
            {drop.dragging ? labels.drop : caption}
          </span>
        </label>
        {url && !busy && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon-sm"
                  // Un fond plein sous le rouge pâle : l'icône se voit sur n'importe quelle image.
                  className="absolute top-2 right-2 bg-background shadow-sm ring-1 ring-foreground/10"
                  aria-label={labels.remove}
                  onClick={onRemove}
                />
              }
            >
              <Trash2 />
            </TooltipTrigger>
            <TooltipContent>{labels.remove}</TooltipContent>
          </Tooltip>
        )}
      </Item>
      <input
        id={inputId}
        type="file"
        accept={accept}
        aria-label={label}
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const chosen = event.target.files?.[0]
          event.target.value = ""
          if (chosen) onChoose(chosen)
        }}
      />
    </div>
  )
}

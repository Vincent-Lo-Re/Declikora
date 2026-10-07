import { cn } from "cn"
import { ImageIcon, ImagePlus, Trash2, UploadCloud } from "lucide-react"
import { useId, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"
import { Item } from "@/components/ui/item"
import { Label } from "@/components/ui/label"
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
 * Un fichier de l'identité de l'admin (onglet « Identité de l'admin » des Paramètres, admins), sur
 * le modèle de la carte « Cover Art » de shadcn : l'étiquette, l'aperçu (un clic choisit ou
 * remplace le fichier, l'image prend son « + » au survol ; on peut aussi en déposer un sur la
 * carte) et, dans son cadre, l'icône qui le retire ; en pied, où il s'affiche et les formats.
 */
export function FileCoverCard({
  label,
  url,
  busy,
  accept,
  onChoose,
  onRemove,
  frameClassName,
  zoneClassName,
  imageClassName,
  footer,
}: {
  label: string
  url: string | null
  busy: boolean
  accept: string
  onChoose: (file: File) => void
  onRemove: () => void
  /** Le fond et les proportions de l'aperçu. */
  frameClassName: string
  /** La couleur des icônes sur ce fond. */
  zoneClassName?: string
  /** La place de l'image dans l'aperçu (entière, ou couvrant tout le cadre). */
  imageClassName: string
  footer: ReactNode
}) {
  const inputId = useId()
  // Toute la carte reçoit un fichier glissé depuis l'ordinateur.
  const drop = useFileDrop(onChoose, busy)

  return (
    <Card
      className={cn(
        "h-full transition-shadow",
        drop.dragging && "ring-2 ring-primary"
      )}
      {...drop.handlers}
    >
      <CardContent className="flex flex-col gap-3">
        <Label
          htmlFor={inputId}
          className="justify-center text-xs font-normal tracking-wider text-muted-foreground uppercase"
        >
          {label}
        </Label>
        <Item
          variant="outline"
          className={cn("relative overflow-hidden p-0", frameClassName)}
        >
          {/* Un clic choisit (ou remplace) le fichier ; au survol, l'image prend son « + ». */}
          <label
            htmlFor={inputId}
            className={cn(
              "group/zone absolute inset-0 flex cursor-pointer items-center justify-center",
              zoneClassName
            )}
          >
            <span className="sr-only">
              {url ? labels.replace : labels.choose}
            </span>
            {busy ? (
              <Spinner className="size-8" />
            ) : drop.dragging ? (
              <span className="flex flex-col items-center gap-2 text-sm">
                <UploadCloud aria-hidden className="size-8" />
                {labels.drop}
              </span>
            ) : url ? (
              <>
                <img
                  src={url}
                  alt={label}
                  className={cn(
                    "transition-opacity group-hover/zone:opacity-30",
                    imageClassName
                  )}
                />
                <ImagePlus
                  aria-hidden
                  className="absolute size-10 opacity-0 transition-opacity group-hover/zone:opacity-100"
                />
              </>
            ) : (
              <>
                <ImageIcon
                  aria-hidden
                  className="size-10 group-hover/zone:hidden"
                />
                <ImagePlus
                  aria-hidden
                  className="hidden size-10 group-hover/zone:block"
                />
              </>
            )}
          </label>
          {/* Retirer le fichier : une icône dans le cadre, hors de la zone qui choisit. */}
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
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ""
            if (chosen) onChoose(chosen)
          }}
        />
      </CardContent>
      <CardFooter className="mt-auto flex-col gap-2">
        <CardDescription className="text-center text-xs">
          {footer}
        </CardDescription>
      </CardFooter>
    </Card>
  )
}

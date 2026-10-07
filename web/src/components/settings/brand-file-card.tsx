import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ImageIcon, ImagePlus, Trash2, UploadCloud } from "lucide-react"
import { useId, useState } from "react"
import { toast } from "sonner"

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
import { BrandVariantsDialog } from "@/components/settings/brand-variants-dialog"
import {
  adminBrandKey,
  BrandFileError,
  brandFileAccept,
  prepareBrandFile,
  removeBrandFile,
  saveBrandFile,
  saveBrandVariants,
  variantPresets,
  type PreparedBrandFile,
} from "@/lib/admin-identity"
import { useFileDrop } from "@/hooks/use-file-drop"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Un fichier de la marque (onglet « Identité de l'admin » des Paramètres, admins), sur le modèle
 * de la carte « Cover Art » de shadcn : l'étiquette (« Logotype · fond clair »), l'aperçu sur ce
 * fond (un clic choisit ou remplace le fichier, l'image prend son « + » au survol ; on peut aussi
 * en déposer un sur la carte) et, dans son cadre, l'icône qui le retire ; en pied, où il
 * s'affiche et les formats acceptés. Un SVG aux couleurs modifiables demande s'il faut
 * le décliner aux couleurs des palettes (BrandVariantsDialog).
 */
export function BrandFileCard({
  kind,
  surface,
}: {
  kind: "logotype" | "monogram"
  surface: "light" | "dark"
}) {
  const slot = `${kind}-${surface}` as const
  const queryClient = useQueryClient()
  const inputId = useId()
  const brand = useQuery(adminBrandRead()).data
  const file = brand?.[slot] ?? null
  const otherSlot = `${kind}-${surface === "light" ? "dark" : "light"}` as const
  const other = brand?.[otherSlot]
  const varied = Object.keys(brand?.variants ?? {}).some((key) =>
    key.startsWith(`${kind}:`)
  )
  const label = labels.label(labels[kind].title, labels[surface])
  // Un SVG aux couleurs modifiables, en attente de la réponse : le décliner ou non.
  const [asking, setAsking] = useState<PreparedBrandFile | null>(null)

  const onDone = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    toast.success(message)
  }
  const onError = (error: Error) =>
    toast.error(
      error instanceof BrandFileError ? error.message : texts.common.unexpected
    )
  const save = useMutation({
    mutationFn: async ({
      prepared,
      decline,
    }: {
      prepared: PreparedBrandFile
      decline: boolean
    }) => {
      await saveBrandFile(slot, prepared, file?.path ?? null)
      // La carte de l'autre fond, vide, reçoit sa version (créée avec les déclinaisons).
      if (decline && prepared.svg) {
        await saveBrandVariants(kind, prepared.svg, other ? null : otherSlot)
      }
    },
    onSuccess: (_, { decline }) =>
      onDone(decline ? labels.variants.done : labels.saved),
    onError,
    onSettled: () => setAsking(null),
  })
  const remove = useMutation({
    mutationFn: (path: string) => removeBrandFile(slot, path, !other),
    onSuccess: () => onDone(labels.removed),
    onError,
  })
  const busy = save.isPending || remove.isPending

  // Un SVG aux couleurs modifiables pose la question ; les autres fichiers partent tels quels.
  const choose = async (chosen: File) => {
    try {
      const prepared = await prepareBrandFile(chosen)
      if (prepared.svg) setAsking(prepared)
      else save.mutate({ prepared, decline: false })
    } catch (error) {
      onError(error as Error)
    }
  }

  // Toute la carte reçoit un fichier glissé depuis l'ordinateur.
  const drop = useFileDrop((dropped) => void choose(dropped), busy)

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
        {/* L'aperçu sur le fond auquel la version est destinée, pas sur celui du thème. */}
        <Item
          variant="outline"
          className={cn(
            "relative aspect-video overflow-hidden p-0",
            surface === "light" ? "bg-brand-light" : "bg-brand-dark"
          )}
        >
          {/* Un clic choisit (ou remplace) le fichier ; au survol, l'image prend son « + ». */}
          <label
            htmlFor={inputId}
            className={cn(
              "group/zone absolute inset-0 flex cursor-pointer items-center justify-center p-4",
              surface === "light"
                ? "text-brand-light-muted"
                : "text-brand-dark-muted"
            )}
          >
            <span className="sr-only">
              {file ? labels.replace : labels.choose}
            </span>
            {busy ? (
              <Spinner className="size-8" />
            ) : drop.dragging ? (
              <span className="flex flex-col items-center gap-2 text-sm">
                <UploadCloud aria-hidden className="size-8" />
                {labels.drop}
              </span>
            ) : file ? (
              <>
                <img
                  src={file.url}
                  alt={label}
                  className="max-h-full max-w-full object-contain transition-opacity group-hover/zone:opacity-30"
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
          {file && !busy && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    // Un fond plein sous le rouge pâle : l'icône se voit sur n'importe quelle image.
                    className="absolute top-2 right-2 bg-background shadow-sm ring-1 ring-foreground/10"
                    aria-label={labels.remove}
                    onClick={() => remove.mutate(file.path)}
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
          accept={brandFileAccept}
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            event.target.value = ""
            if (chosen) void choose(chosen)
          }}
        />
      </CardContent>
      <CardFooter className="mt-auto flex-col gap-2">
        <CardDescription className="text-center text-xs">
          {labels[kind].use}
          <br />
          {labels.formats}
          {varied && (
            <>
              <br />
              {labels.variants.status(variantPresets.length)}
            </>
          )}
        </CardDescription>
      </CardFooter>
      <BrandVariantsDialog
        file={asking}
        pending={save.isPending}
        onKeep={() =>
          asking && save.mutate({ prepared: asking, decline: false })
        }
        onConfirm={() =>
          asking && save.mutate({ prepared: asking, decline: true })
        }
      />
    </Card>
  )
}

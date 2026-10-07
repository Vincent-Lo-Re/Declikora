import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { Trash2, UploadCloud } from "lucide-react"
import { useId } from "react"
import { toast } from "sonner"

import defaultLoginImage from "@/assets/brand/connexion.webp"
import { AnimatedMonogram } from "@/components/auth/animated-monogram"
import { InfoTip } from "@/components/info-tip"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useFileDrop } from "@/hooks/use-file-drop"
import { useMonogramSvg } from "@/hooks/use-monogram-svg"
import {
  adminBrandKey,
  BrandFileError,
  loginImageAccept,
  prepareLoginImage,
  removeLoginImage,
  saveLoginImage,
  saveMonogramMotion,
  saveMonogramMotions,
} from "@/lib/admin-identity"
import {
  DEFAULT_MOTIONS,
  type Motion,
  motionBlocker,
  MOTIONS,
} from "@/lib/monogram-motion"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const files = texts.settings.adminIdentity.files
const labels = files.loginScreen
const motionLabels = files.monogramMotion

/**
 * L'écran de connexion (Paramètres, section « Écran de connexion ») : une carte, l'aperçu tel que
 * sur la connexion (l'image choisie, sinon celle à défaut, sous le voile du fond du menu, et le
 * monogramme, animé ou immobile ; on peut y déposer une image) et, à côté (dessous sur une carte
 * étroite), deux réglages : l'image de fond (« Choisir », et la corbeille) et le monogramme animé
 * (son interrupteur, puis ses animations à cocher, une au moins). Les mêmes pour toute l'équipe.
 */
export function LoginScreenCard() {
  const queryClient = useQueryClient()
  const inputId = useId()
  const brand = useQuery(adminBrandRead()).data
  const monogram = useMonogramSvg()
  const image = brand?.loginImage ?? null

  const refresh = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    toast.success(message)
  }
  const save = useMutation({
    mutationFn: async (chosen: File) =>
      saveLoginImage(await prepareLoginImage(chosen), image?.path ?? null),
    onSuccess: () => refresh(files.saved),
    onError: (error) =>
      toast.error(
        error instanceof BrandFileError
          ? error.message
          : texts.common.unexpected
      ),
  })
  const remove = useMutation({
    mutationFn: (path: string) => removeLoginImage(path),
    onSuccess: () => refresh(files.removed),
    onError: () => toast.error(texts.common.unexpected),
  })
  const motion = useMutation({
    mutationFn: (next: boolean) => saveMonogramMotion(next),
    onSuccess: (_, next) =>
      refresh(next ? files.monogramMotion.on : files.monogramMotion.off),
    onError: () => toast.error(texts.common.unexpected),
  })
  const chosenMotions = useMutation({
    mutationFn: (next: Motion[]) => saveMonogramMotions(next),
    onSuccess: () => refresh(motionLabels.saved),
    onError: () => toast.error(texts.common.unexpected),
  })
  const busy = save.isPending || remove.isPending
  // Pendant l'enregistrement, l'interrupteur et les cases montrent déjà le choix.
  const animated = motion.isPending
    ? motion.variables
    : (brand?.monogramMotion ?? true)
  const motions = chosenMotions.isPending
    ? chosenMotions.variables
    : (brand?.monogramMotions ?? DEFAULT_MOTIONS)
  const toggleMotion = (which: Motion, checked: boolean) =>
    chosenMotions.mutate(
      MOTIONS.filter((one) => (one === which ? checked : motions.includes(one)))
    )
  const drop = useFileDrop((dropped) => save.mutate(dropped), busy)

  return (
    <Card className="@container overflow-hidden py-0">
      <div className="flex flex-col @lg:flex-row">
        {/* Sous la classe dark : le voile prend le fond du menu, comme sur l'écran de connexion. */}
        <div
          role="img"
          aria-label={labels.preview}
          className={cn(
            "dark relative flex aspect-video items-center justify-center bg-card @lg:aspect-auto @lg:min-h-56 @lg:flex-1",
            drop.dragging && "ring-2 ring-primary ring-inset"
          )}
          {...drop.handlers}
        >
          <img
            src={image?.url ?? defaultLoginImage}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-card/70" />
          <div className="relative text-foreground">
            {busy ? (
              <Spinner className="size-8" />
            ) : drop.dragging ? (
              <UploadCloud aria-hidden className="size-8" />
            ) : (
              // Rallumé, ou ses animations changées, il repart du début.
              <AnimatedMonogram
                key={animated ? motions.join() : "still"}
                motions={animated ? motions : []}
                className="h-24"
              />
            )}
          </div>
        </div>
        <ItemGroup className="justify-center gap-0 divide-y p-2 @lg:w-80">
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{files.loginImage.title}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {files.loginImage.formats}
                <br />
                {files.loginImage.maxSize}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {image && !busy && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={files.remove}
                        onClick={() => remove.mutate(image.path)}
                      />
                    }
                  >
                    <Trash2 />
                  </TooltipTrigger>
                  <TooltipContent>{files.remove}</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                render={<label htmlFor={inputId} />}
              >
                {image ? files.replace : files.loginImage.choose}
              </Button>
              <input
                id={inputId}
                type="file"
                accept={loginImageAccept}
                aria-label={labels.title}
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const chosen = event.target.files?.[0]
                  event.target.value = ""
                  if (chosen) save.mutate(chosen)
                }}
              />
            </ItemActions>
          </Item>
          <Item size="sm">
            <ItemContent>
              <ItemTitle>{files.monogramMotion.title}</ItemTitle>
              <ItemDescription className="line-clamp-none">
                {files.monogramMotion.description}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              <Switch
                checked={animated}
                onCheckedChange={(next) => motion.mutate(next)}
                disabled={motion.isPending}
                aria-label={files.monogramMotion.toggle}
              />
            </ItemActions>
            <div className="basis-full pt-1">
              <ul
                aria-label={motionLabels.group}
                className="grid grid-cols-2 gap-x-3 gap-y-2"
              >
                {MOTIONS.map((one) => {
                  const checked = motions.includes(one)
                  // Tant que le fichier n'est pas lu, rien n'est grisé.
                  const blocked = monogram.svg.isSuccess
                    ? motionBlocker(one, monogram.svg.data)
                    : monogram.url === null
                      ? motionBlocker(one, null)
                      : null
                  return (
                    <li key={one} className="flex items-center gap-1">
                      <Label className="font-normal">
                        <Checkbox
                          checked={checked}
                          // Une au moins : la dernière cochée ne se décoche pas.
                          disabled={
                            !animated ||
                            blocked !== null ||
                            chosenMotions.isPending ||
                            (checked && motions.length === 1)
                          }
                          onCheckedChange={(next) => toggleMotion(one, next)}
                        />
                        {motionLabels.motions[one]}
                      </Label>
                      {blocked && (
                        <InfoTip text={motionLabels.blocked[blocked]} />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </Item>
        </ItemGroup>
      </div>
    </Card>
  )
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { FileCoverCard } from "@/components/settings/file-cover-card"
import {
  adminBrandKey,
  BrandFileError,
  loginImageAccept,
  prepareLoginImage,
  removeLoginImage,
  saveLoginImage,
} from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * L'image de l'écran de connexion (FileCoverCard), à droite du formulaire (modèle « login-04 »
 * de shadcn) : une photo, réduite avant l'envoi, qui couvre tout son cadre.
 */
export function LoginImageCard() {
  const queryClient = useQueryClient()
  const image = useQuery(adminBrandRead()).data?.loginImage ?? null

  const save = useMutation({
    mutationFn: async (chosen: File) =>
      saveLoginImage(await prepareLoginImage(chosen), image?.path ?? null),
    onSuccess: () => done(labels.saved),
    onError: (error) =>
      toast.error(
        error instanceof BrandFileError
          ? error.message
          : texts.common.unexpected
      ),
  })
  const remove = useMutation({
    mutationFn: (path: string) => removeLoginImage(path),
    onSuccess: () => done(labels.removed),
    onError: () => toast.error(texts.common.unexpected),
  })
  const done = async (message: string) => {
    await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    toast.success(message)
  }

  return (
    <FileCoverCard
      label={labels.loginImage.title}
      url={image?.url ?? null}
      busy={save.isPending || remove.isPending}
      accept={loginImageAccept}
      onChoose={(chosen) => save.mutate(chosen)}
      onRemove={() => image && remove.mutate(image.path)}
      frameClassName="aspect-video bg-muted"
      zoneClassName="text-muted-foreground"
      imageClassName="size-full object-cover"
      footer={
        <>
          {labels.loginImage.use}
          <br />
          {labels.loginImage.formats}
        </>
      }
    />
  )
}

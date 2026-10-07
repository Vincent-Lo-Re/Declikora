import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { useState } from "react"
import { toast } from "sonner"

import { BrandVariantsDialog } from "@/components/settings/brand-variants-dialog"
import { FileCoverCard } from "@/components/settings/file-cover-card"
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
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity.files

/**
 * Un fichier de la marque (FileCoverCard, « Logotype · fond clair »), montré sur ce fond. Un SVG
 * aux couleurs modifiables demande s'il faut le décliner aux couleurs des palettes
 * (BrandVariantsDialog).
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

  return (
    <>
      <FileCoverCard
        label={label}
        url={file?.url ?? null}
        busy={busy}
        accept={brandFileAccept}
        onChoose={(chosen) => void choose(chosen)}
        onRemove={() => file && remove.mutate(file.path)}
        // L'aperçu sur le fond auquel la version est destinée, pas sur celui du thème.
        frameClassName={cn(
          "aspect-video",
          surface === "light" ? "bg-brand-light" : "bg-brand-dark"
        )}
        zoneClassName={cn(
          "p-4",
          surface === "light"
            ? "text-brand-light-muted"
            : "text-brand-dark-muted"
        )}
        imageClassName="max-h-full max-w-full object-contain"
        footer={
          <>
            {labels[kind].use}
            <br />
            {labels.formats}
            {varied && (
              <>
                <br />
                {labels.variants.status(variantPresets.length)}
              </>
            )}
          </>
        }
      />
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
    </>
  )
}

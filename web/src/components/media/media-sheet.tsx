import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ExternalLink, Trash2, TriangleAlert } from "lucide-react"
import { type ComponentProps, lazy, Suspense, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { kindIcons, rejectedText } from "@/components/media/media-kinds"
import { MediaStatusBadge } from "@/components/media/media-visuals"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/dates"
import {
  getMediaUses,
  kickFiles,
  MediaError,
  mediaKeys,
  restoreMedia,
  trashKey,
  trashMedia,
  updateMedia,
  type MediaChanges,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import {
  formatBytes,
  formatDimensions,
  formatDuration,
} from "@/lib/media/format"
import { mediaDetailsSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const LottiePreview = lazy(() =>
  import("@/components/media/lottie-preview").then((module) => ({
    default: module.LottiePreview,
  }))
)

/** Fiche d'un fichier, dans un panneau à droite. */
export function MediaSheet({
  media,
  url,
  now,
  onClose,
  onTrashed = onClose,
  finalFocus,
}: {
  media: Media | null
  url: string | undefined
  now: number
  onClose: () => void
  // Après « Mettre à la corbeille » : le fichier va disparaître de la liste, avec le bouton
  // qui avait ouvert la fiche. La page dit où remettre le focus (finalFocus).
  onTrashed?: (media: Media) => void
  finalFocus?: ComponentProps<typeof SheetContent>["finalFocus"]
}) {
  return (
    <Sheet
      open={media !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        finalFocus={finalFocus}
      >
        {media && (
          <MediaSheetBody
            key={media.id}
            media={media}
            url={url}
            now={now}
            onTrashed={() => onTrashed(media)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function MediaSheetBody({
  media,
  url,
  now,
  onTrashed,
}: {
  media: Media
  url: string | undefined
  now: number
  onTrashed: () => void
}) {
  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="break-words">{media.name}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-2">
          {texts.media.kinds[media.kind]}
          <MediaStatusBadge media={media} now={now} />
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-6 px-4 pb-6">
        {media.status === "rejected" && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription>
              <p>{rejectedText(media)}</p>
              <p>{texts.media.rejectedCleanup}</p>
            </AlertDescription>
          </Alert>
        )}
        <MediaPreview media={media} url={url} />
        <MediaDetailsForm media={media} />
        <Separator />
        <MediaInfo media={media} />
        <Separator />
        <MediaUses media={media} />
        <Separator />
        <TrashButton media={media} onTrashed={onTrashed} />
      </div>
    </>
  )
}

function MediaPreview({
  media,
  url,
}: {
  media: Media
  url: string | undefined
}) {
  const Icon = kindIcons[media.kind]
  const box =
    "flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground"

  if (url && (media.kind === "image" || media.kind === "svg")) {
    return (
      <div className={box}>
        <img
          src={url}
          alt={media.alt ?? ""}
          className="size-full object-contain"
        />
      </div>
    )
  }
  if (url && media.kind === "audio") {
    return (
      <audio controls preload="metadata" src={url} className="w-full">
        <track kind="captions" />
      </audio>
    )
  }
  // Une animation n'est affichée qu'une fois vérifiée par le serveur.
  if (url && media.kind === "lottie" && media.status === "ready") {
    return (
      <div className={box}>
        <Suspense fallback={<Spinner />}>
          <LottiePreview url={url} label={media.name} />
        </Suspense>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <div className={box}>
        <Icon aria-hidden className="size-12" />
      </div>
      {url && media.kind === "pdf" ? (
        <Button
          variant="outline"
          size="sm"
          render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          nativeButton={false}
        >
          <ExternalLink />
          {texts.media.detail.openFile}
        </Button>
      ) : (
        !url && (
          <p className="text-sm text-muted-foreground">
            {texts.media.detail.noPreview}
          </p>
        )
      )}
    </div>
  )
}

function MediaDetailsForm({ media }: { media: Media }) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const hasAlt = media.kind === "image" || media.kind === "svg"
  const hasTranscript = media.kind === "audio"
  const defaults = {
    name: media.name,
    alt: media.alt ?? "",
    transcript: media.transcript ?? "",
  }
  const form = useForm({
    resolver: zodResolver(mediaDetailsSchema),
    defaultValues: defaults,
  })

  const save = useMutation({
    mutationFn: (values: typeof defaults) => {
      const changes: MediaChanges = { name: values.name }
      if (hasAlt) changes.alt = values.alt === "" ? null : values.alt
      if (hasTranscript) {
        changes.transcript = values.transcript === "" ? null : values.transcript
      }
      return updateMedia(media.id, changes)
    },
    onSuccess: (saved) => {
      toast.success(texts.media.detail.saved)
      form.reset({
        name: saved.name,
        alt: saved.alt ?? "",
        transcript: saved.transcript ?? "",
      })
    },
    onError: (error) => {
      form.setError("root", { message: error.message })
      checkAccess(error)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
  })

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
    >
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="media-name">
                {texts.media.detail.name}
              </FieldLabel>
              <Input
                {...field}
                id="media-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        {hasAlt && (
          <Controller
            name="alt"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="media-alt">
                  {texts.media.detail.alt}
                </FieldLabel>
                <Textarea
                  {...field}
                  id="media-alt"
                  rows={2}
                  aria-invalid={fieldState.invalid}
                  aria-describedby="media-alt-hint"
                />
                <FieldDescription id="media-alt-hint">
                  {texts.media.detail.altHint}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
        {hasTranscript && (
          <Controller
            name="transcript"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="media-transcript">
                  {texts.media.detail.transcript}
                </FieldLabel>
                <Textarea
                  {...field}
                  id="media-transcript"
                  rows={6}
                  className="max-h-80"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="media-transcript-hint"
                />
                <FieldDescription id="media-transcript-hint">
                  {texts.media.detail.transcriptHint}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}
        <FieldError errors={[form.formState.errors.root]} />
      </FieldGroup>
      <div>
        <Button
          type="submit"
          disabled={save.isPending || !form.formState.isDirty}
        >
          {save.isPending && <Spinner />}
          {texts.media.detail.save}
        </Button>
      </div>
    </form>
  )
}

function MediaInfo({ media }: { media: Media }) {
  const rows: [string, string][] = [
    [texts.media.detail.kind, texts.media.kinds[media.kind]],
  ]
  if (media.width !== null && media.height !== null) {
    rows.push([
      texts.media.detail.dimensions,
      formatDimensions(media.width, media.height),
    ])
  }
  if (media.duration_s !== null) {
    rows.push([texts.media.detail.duration, formatDuration(media.duration_s)])
  }
  rows.push(
    [texts.media.detail.size, formatBytes(media.size_bytes)],
    [texts.media.detail.createdAt, formatDateTime(media.created_at)],
    [
      texts.media.detail.visibility,
      media.is_public
        ? texts.media.detail.public
        : texts.media.detail.protected,
    ]
  )
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{texts.media.detail.info}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function MediaUses({ media }: { media: Media }) {
  const uses = useQuery({
    queryKey: mediaKeys.uses(media.id),
    queryFn: () => getMediaUses(media.id),
  })
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{texts.media.detail.uses}</h3>
      {uses.isPending ? (
        <p className="text-sm text-muted-foreground">
          {texts.media.detail.usesLoading}
        </p>
      ) : uses.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {texts.media.detail.usesFailed}
        </p>
      ) : uses.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {texts.media.detail.notUsed}
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {uses.data.map((use) => (
            <li
              key={use.content_id}
              className="flex flex-wrap items-center gap-2"
            >
              <span>
                {use.title}
                {use.parent_title && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({use.parent_title})
                  </span>
                )}
              </span>
              {use.in_draft && (
                <Badge variant="outline">{texts.media.detail.inDraft}</Badge>
              )}
              {use.in_app && (
                <Badge variant="secondary">{texts.media.detail.inApp}</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TrashButton({
  media,
  onTrashed,
}: {
  media: Media
  onTrashed: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [refusal, setRefusal] = useState<string | null>(null)

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
    ])

  // « Annuler » dans le message : la fiche est déjà fermée, d'où un simple appel.
  const undo = async () => {
    try {
      await restoreMedia(media.id)
      toast.success(texts.media.detail.restored)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : texts.common.unexpected
      )
    } finally {
      await refresh()
    }
  }

  const trash = useMutation({
    mutationFn: () => trashMedia(media.id),
    onSuccess: () => {
      toast.success(texts.media.detail.trashed, {
        action: {
          label: texts.media.detail.undo,
          onClick: () => void undo(),
        },
      })
      onTrashed()
      void kickFiles()
    },
    onError: (error) => {
      if (error instanceof MediaError && error.code === "fichier_utilise") {
        setRefusal(error.detail ?? error.message)
      } else {
        toast.error(error.message)
        checkAccess(error)
      }
    },
    onSettled: refresh,
  })

  return (
    <div className="space-y-3">
      {refusal && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>
            <p>{texts.media.detail.used}</p>
            <p>{refusal}</p>
          </AlertDescription>
        </Alert>
      )}
      <Button
        variant="outline"
        className="text-destructive"
        disabled={trash.isPending}
        onClick={() => trash.mutate()}
      >
        {trash.isPending ? <Spinner /> : <Trash2 />}
        {texts.media.detail.trash}
      </Button>
    </div>
  )
}

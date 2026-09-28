import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useEffect, type ComponentProps } from "react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { listStarters, templateKeys } from "@/lib/contents/templates"
import { outlineElementSchema, type OutlineElementValues } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.methods.create

const emptyForm: OutlineElementValues = { title: "", starter: "" }

/** Ce qu'on crée : un chapitre de la méthode, ou une leçon d'un chapitre. */
export type NewElement =
  | { kind: "chapter" }
  | { kind: "lesson"; chapterId: string; chapterLabel: string }

/**
 * « Nouveau chapitre » et « Nouvelle leçon » : le titre, puis le point de départ (vide, ou un
 * point de départ des chapitres ou des leçons, [D42]). L'élément arrive en fin de liste, caché
 * de l'app.
 */
export function NewElementDialog({
  target,
  onOpenChange,
  pending,
  error,
  onSubmit,
  finalFocus,
}: {
  // null : fenêtre fermée.
  target: NewElement | null
  onOpenChange: (open: boolean) => void
  pending: boolean
  error: string | null
  onSubmit: (values: OutlineElementValues, open: boolean) => void
  // Où va le focus à la fermeture (après une création, le plan le met sur le nouvel élément).
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"]
}) {
  const kind = target?.kind ?? "chapter"
  const form = useForm<OutlineElementValues>({
    resolver: zodResolver(outlineElementSchema),
    defaultValues: emptyForm,
  })
  const starters = useQuery({
    queryKey: templateKeys.starters(kind),
    queryFn: () => listStarters(kind),
    enabled: target !== null,
  })

  // Chaque ouverture repart d'un formulaire vide.
  const open = target !== null
  useEffect(() => {
    if (open) form.reset(emptyForm)
  }, [open, form])

  const submitWith = (openAfter: boolean) =>
    form.handleSubmit((values) => onSubmit(values, openAfter))

  const idPrefix = `nouvel-element-${kind}`
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg" finalFocus={finalFocus}>
        <form onSubmit={submitWith(false)} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {kind === "chapter" ? labels.chapterTitle : labels.lessonTitle}
            </DialogTitle>
            <DialogDescription>
              {target?.kind === "lesson"
                ? labels.lessonDescription(target.chapterLabel)
                : labels.chapterDescription}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${idPrefix}-titre`}>
                    {labels.name}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`${idPrefix}-titre`}
                    autoComplete="off"
                    maxLength={200}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {starters.isPending ? (
              <Skeleton
                className="h-10 w-full"
                aria-label={texts.common.loading}
              />
            ) : starters.isError ? (
              <p className="text-sm text-muted-foreground">
                {labels.startersFailed}
              </p>
            ) : starters.data.length > 0 ? (
              <Controller
                name="starter"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel id={`${idPrefix}-depart`}>
                      {labels.start}
                    </FieldLabel>
                    <RadioGroup
                      aria-labelledby={`${idPrefix}-depart`}
                      value={field.value}
                      onValueChange={(value: string) => field.onChange(value)}
                    >
                      {[
                        { id: "", title: labels.blank[kind] },
                        ...starters.data.map((starter) => ({
                          id: starter.id,
                          title:
                            starter.title.trim() ||
                            texts.templates.list.untitled,
                        })),
                      ].map((option) => {
                        const id = `${idPrefix}-depart-${option.id || "vide"}`
                        return (
                          <FieldLabel key={id} htmlFor={id}>
                            <Field orientation="horizontal">
                              <RadioGroupItem value={option.id} id={id} />
                              <FieldTitle>{option.title}</FieldTitle>
                            </Field>
                          </FieldLabel>
                        )
                      })}
                    </RadioGroup>
                  </Field>
                )}
              />
            ) : null}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void submitWith(true)()}
            >
              {labels.openAfter}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {labels.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { categoryNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * La fenêtre d'une catégorie : la créer (« Nouvelle catégorie »), ou la modifier (menu « … », clic
 * sur la ligne). « Enregistrer » ferme la fenêtre ; la catégorie arrive dans la liste.
 */
export function CategoryDialog({
  open,
  onOpenChange,
  name,
  pending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Le nom de la catégorie modifiée ; null pour une nouvelle catégorie.
  name: string | null
  pending: boolean
  error: string | null
  onSubmit: (name: string) => void
}) {
  const form = useForm({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: name ?? "" },
  })

  // Chaque ouverture repart du nom de la catégorie (ou d'un champ vide).
  useEffect(() => {
    if (open) form.reset({ name: name ?? "" })
  }, [open, name, form])

  const submit = form.handleSubmit((values) => onSubmit(values.name))

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {name === null
                ? labels.dialog.createTitle
                : labels.dialog.editTitle}
            </DialogTitle>
            {name === null && (
              <DialogDescription>{labels.dialog.description}</DialogDescription>
            )}
          </DialogHeader>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || error !== null}>
                <FieldLabel htmlFor="categorie-nom">{labels.name}</FieldLabel>
                <Input
                  {...field}
                  id="categorie-nom"
                  autoComplete="off"
                  placeholder={labels.namePlaceholder}
                  aria-invalid={fieldState.invalid || error !== null}
                />
                <FieldError
                  errors={[
                    fieldState.error ??
                      (error ? { message: error } : undefined),
                  ]}
                />
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {labels.dialog.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

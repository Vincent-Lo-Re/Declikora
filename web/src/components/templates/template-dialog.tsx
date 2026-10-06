import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlert } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"

import { TITLE_MAX } from "@/blocks/draft"
import { Alert, AlertTitle } from "@/components/ui/alert"
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  templateSections,
  templateSorts,
  type TemplateFor,
} from "@/lib/contents/templates"
import { templateSchema, type TemplateValues } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.templates.create

const emptyForm: TemplateValues = { name: "", sort: "style", templateFor: null }

const sectionItems = templateSections.map((value) => ({
  value,
  label: texts.templates.sections[value],
}))

/**
 * Nom, sorte et (pour un point de départ) section d'un nouveau modèle : « Nouveau modèle » dans
 * la section Modèles, ou « Enregistrer comme modèle » dans l'éditeur. La sorte se choisit ici
 * et ne change plus (ADMIN § 5).
 */
export function TemplateDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  defaultSection,
  sharedDisabled,
  pending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  submitLabel: string
  // La section proposée pour un point de départ (celle du contenu d'où l'on part).
  defaultSection: TemplateFor | null
  // Pourquoi « Bloc identique partout » n'est pas possible ici (plusieurs blocs choisis).
  sharedDisabled?: string | null
  pending: boolean
  error: string | null
  onSubmit: (values: TemplateValues) => void
}) {
  const form = useForm<TemplateValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: emptyForm,
  })
  const sort = useWatch({ control: form.control, name: "sort" })

  // Chaque ouverture repart d'un formulaire vide.
  useEffect(() => {
    if (open) form.reset(emptyForm)
  }, [open, form])

  const submit = form.handleSubmit((values) =>
    onSubmit({
      ...values,
      templateFor: values.sort === "starter" ? values.templateFor : null,
    })
  )

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="modele-nom">{labels.name}</FieldLabel>
                  <Input
                    {...field}
                    id="modele-nom"
                    autoComplete="off"
                    maxLength={TITLE_MAX}
                    placeholder={labels.namePlaceholder}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="sort"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel id="modele-sorte">{labels.sort}</FieldLabel>
                  <RadioGroup
                    aria-labelledby="modele-sorte"
                    value={field.value}
                    onValueChange={(value: string) => {
                      field.onChange(value)
                      if (
                        value === "starter" &&
                        !form.getValues("templateFor")
                      ) {
                        form.setValue("templateFor", defaultSection)
                      }
                    }}
                  >
                    {templateSorts.map((value) => {
                      const id = `modele-sorte-${value}`
                      const disabled =
                        value === "shared" && Boolean(sharedDisabled)
                      const option = texts.templates.sorts[value]
                      return (
                        <FieldLabel key={value} htmlFor={id}>
                          <Field
                            orientation="horizontal"
                            data-disabled={disabled || undefined}
                          >
                            <RadioGroupItem
                              value={value}
                              id={id}
                              disabled={disabled}
                            />
                            <FieldContent>
                              <FieldTitle>{option.title}</FieldTitle>
                              <FieldDescription>
                                {disabled ? sharedDisabled : option.description}
                              </FieldDescription>
                            </FieldContent>
                          </Field>
                        </FieldLabel>
                      )
                    })}
                  </RadioGroup>
                </Field>
              )}
            />
            {sort === "starter" && (
              <Controller
                name="templateFor"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="modele-section">
                      {labels.section}
                    </FieldLabel>
                    <Select
                      items={sectionItems}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger
                        id="modele-section"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder={labels.sectionPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>{labels.sectionHint}</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            )}
            {error && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

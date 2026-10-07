import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Save } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { adminBrandKey, saveBrandDetails } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { adminNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity

/**
 * Le nom de la marque et son adresse de contact (onglet « Identité de l'admin » des Paramètres,
 * admins), carte de la section « Marque » (son titre et son explication sont à gauche,
 * SettingsSection) : les deux champs côte à côte, « Enregistrer » dans le pied gris. Le nom
 * s'affiche dans l'admin (vide : le nom à défaut) ; l'adresse aide sur l'écran de connexion.
 */
export function AdminIdentityCard() {
  const brand = useQuery(adminBrandRead())
  return brand.isSuccess ? (
    <BrandDetailsForm
      name={brand.data.name}
      contactEmail={brand.data.contactEmail}
    />
  ) : (
    <Card>
      <CardContent>
        <LoadState query={brand} rows={2} failed={labels.loadFailed} />
      </CardContent>
    </Card>
  )
}

function BrandDetailsForm({
  name,
  contactEmail,
}: {
  name: string | null
  contactEmail: string | null
}) {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(adminNameSchema),
    defaultValues: { name: name ?? "", contactEmail: contactEmail ?? "" },
  })

  const save = useMutation({
    // Vides : la base garde null (le nom à défaut, pas d'adresse).
    mutationFn: (values: { name: string; contactEmail: string }) =>
      saveBrandDetails(values.name || null, values.contactEmail || null),
    onSuccess: async (_, values) => {
      form.reset(values)
      await queryClient.invalidateQueries({ queryKey: adminBrandKey })
      toast.success(labels.saved)
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  const onSubmit = form.handleSubmit((values) => save.mutate(values))

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="@container pb-0">
        <CardContent className="grid gap-4 @lg:grid-cols-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-name">{labels.name}</FieldLabel>
                <Input
                  {...field}
                  id="admin-name"
                  placeholder={texts.app.name}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-email">{labels.email}</FieldLabel>
                <Input
                  {...field}
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder={labels.emailPlaceholder}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </CardContent>
        {/* « Enregistrer » à droite dans le pied gris ; sur toute la largeur dans une carte étroite. */}
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={save.isPending || !form.formState.isDirty}
          >
            {save.isPending ? <Spinner /> : <Save aria-hidden />}
            {labels.save}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

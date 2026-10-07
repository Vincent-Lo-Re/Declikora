import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { adminBrandKey, saveAdminName } from "@/lib/admin-identity"
import { adminBrandRead } from "@/lib/reads"
import { adminNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.settings.adminIdentity

/**
 * Le nom de la marque (onglet « Identité de l'admin » des Paramètres, admins) : le même pour toute
 * l'équipe, en haut du menu, à la connexion et dans l'onglet du navigateur. Vide : « Ruche ».
 */
export function AdminIdentityCard() {
  const brand = useQuery(adminBrandRead())
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {labels.title}
        </CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {brand.isSuccess ? (
          <AdminNameForm saved={brand.data.name} />
        ) : (
          <LoadState query={brand} rows={1} failed={labels.loadFailed} />
        )}
      </CardContent>
    </Card>
  )
}

function AdminNameForm({ saved }: { saved: string | null }) {
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(adminNameSchema),
    defaultValues: { name: saved ?? "" },
  })

  const save = useMutation({
    // Vide : la base garde null, et l'admin revient à « Ruche ».
    mutationFn: (name: string) => saveAdminName(name || null),
    onSuccess: async (_, name) => {
      form.reset({ name })
      await queryClient.invalidateQueries({ queryKey: adminBrandKey })
      toast.success(labels.saved)
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  const onSubmit = form.handleSubmit(({ name }) => save.mutate(name))

  return (
    <form onSubmit={onSubmit} noValidate>
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="admin-name">{labels.name}</FieldLabel>
            <ButtonGroup className="w-full">
              <Input
                {...field}
                id="admin-name"
                placeholder={labels.placeholder}
                aria-invalid={fieldState.invalid}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={save.isPending || !form.formState.isDirty}
              >
                {save.isPending && <Spinner />}
                {texts.common.save}
              </Button>
            </ButtonGroup>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </form>
  )
}

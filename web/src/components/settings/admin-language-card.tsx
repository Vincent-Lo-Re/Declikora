import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminBrandKey, saveAdminLanguage } from "@/lib/admin-identity"
import { isLanguage, LANGUAGES, type Language } from "@/lib/language"
import { adminBrandRead } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.settings.advanced.language

const items = LANGUAGES.map((value) => ({
  value,
  label: texts.languages[value],
}))

/**
 * La langue de toute l'admin (onglet « Avancé » des Paramètres, admins) : celle de l'équipe tant
 * qu'un membre n'a pas choisi la sienne dans Mon compte, et celle des pages de connexion.
 * L'identité de l'admin relue, useAdminLanguage recharge la page si la langue change.
 */
export function AdminLanguageCard() {
  const queryClient = useQueryClient()
  const brand = useQuery(adminBrandRead())
  const save = useMutation({
    mutationFn: (language: Language) => saveAdminLanguage(language),
    onSuccess: async () => {
      toast.success(labels.saved)
      await queryClient.invalidateQueries({ queryKey: adminBrandKey })
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  return (
    <Card>
      <CardContent>
        {brand.isSuccess ? (
          <Field>
            <FieldLabel htmlFor="admin-language">{labels.label}</FieldLabel>
            <Select
              items={items}
              value={save.isPending ? save.variables : brand.data.language}
              disabled={save.isPending}
              onValueChange={(value) => {
                if (isLanguage(value) && value !== brand.data.language)
                  save.mutate(value)
              }}
            >
              <SelectTrigger id="admin-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>{labels.hint}</FieldDescription>
          </Field>
        ) : (
          <LoadState query={brand} rows={1} failed={labels.loadFailed} />
        )}
      </CardContent>
    </Card>
  )
}

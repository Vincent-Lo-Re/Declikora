import { zodResolver } from "@hookform/resolvers/zod"
import type { Factor } from "@supabase/supabase-js"
import { cn } from "cn"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { profileQueryKey, useAuth, type Profile } from "@/auth/auth-context"
import { PageHeader } from "@/components/page-header"
import { useBrand } from "@/hooks/use-brand-name"
import { PaletteChoice } from "@/components/theme/palette-choice"
import { PalettePreview } from "@/components/theme/palette-preview"
import { ThemeChoice } from "@/components/theme-choice"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { saveFullName, saveLanguage } from "@/lib/auth"
import { formatDateTime } from "@/lib/dates"
import {
  applyMemberLanguage,
  isLanguage,
  LANGUAGES,
  memberLanguage,
  type Language,
} from "@/lib/language"
import { profileSchema } from "@/lib/schemas"
import { sections } from "@/navigation"
import { texts } from "@/texts"

/** Mon compte : profil, double vérification, langue, thème (clair, sombre ou automatique, et les couleurs) et son aperçu. */
export function AccountPage() {
  const { profile, factor } = useAuth()
  const { title, description } = texts.sections.account

  return (
    <>
      <PageHeader
        icon={sections.account.icon}
        title={title}
        description={description}
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        {profile && <ProfileCard profile={profile} />}

        <MfaCard factor={factor} />

        <LanguageCard />

        <Section
          title={texts.theme.title}
          description={texts.theme.description}
          action={<ThemeChoice />}
        >
          <PaletteChoice />
        </Section>

        <Section
          title={texts.colors.preview.title}
          description={texts.colors.preview.description}
          className="xl:sticky xl:top-0"
        >
          <PalettePreview />
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className={cn("space-y-3", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * La double vérification, présentée comme les autres cartes : le titre à gauche ; la date dans une ligne grise avec le bouclier (Item, comme « Se déconnecter ») ; ce qu'il
 * faut faire si le téléphone est perdu, en petit texte (seul un admin la réinitialise). Elle prend
 * la hauteur de la carte Profil, à côté.
 */
function MfaCard({ factor }: { factor: Factor | null }) {
  const labels = texts.account.mfa
  return (
    <Section
      title={labels.title}
      description={labels.description}
      className="self-stretch"
      // Le contenu prend toute la hauteur de la carte : « Téléphone perdu ? » descend tout en bas.
      contentClassName="flex flex-1 flex-col gap-3 space-y-0"
    >
      {factor && (
        <Item variant="muted" className="py-4">
          <ItemMedia variant="icon">
            <ShieldCheck className="text-status-live" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-status-live">
              {labels.configured}
            </ItemTitle>
            <ItemDescription>
              {labels.configuredOn(formatDateTime(factor.created_at))}
            </ItemDescription>
          </ItemContent>
        </Item>
      )}
      <p className="mt-auto text-sm text-muted-foreground">
        <span className="block font-medium text-foreground">
          {labels.lostPhone.title}
        </span>
        {labels.lostPhone.text}
      </p>
    </Section>
  )
}

/**
 * Le profil, sur le modèle de la carte « Account Access » de shadcn : le nom, l'adresse e-mail
 * (grisée, elle ne se change pas ici) avec le rôle à droite ; « Enregistrer » collé au nom.
 */
function ProfileCard({ profile }: { profile: Profile }) {
  const labels = texts.account.profile
  const queryClient = useQueryClient()
  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name ?? "" },
  })

  const save = useMutation({
    mutationFn: (fullName: string) => saveFullName(profile.id, fullName),
    onSuccess: async (_, fullName) => {
      form.reset({ full_name: fullName })
      await queryClient.invalidateQueries({
        queryKey: profileQueryKey(profile.id),
      })
      toast.success(labels.saved)
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  const onSubmit = form.handleSubmit(({ full_name }) => save.mutate(full_name))

  return (
    <form onSubmit={onSubmit} noValidate className="self-stretch">
      <Card className="h-full">
        <CardHeader>
          <CardTitle role="heading" aria-level={2}>
            {labels.title}
          </CardTitle>
          <CardDescription>{labels.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Controller
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="account-name">{labels.name}</FieldLabel>
                  <ButtonGroup className="w-full">
                    <Input
                      {...field}
                      id="account-name"
                      autoComplete="name"
                      placeholder={labels.namePlaceholder}
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
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="account-email">{labels.email}</FieldLabel>
                <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  <span className="sr-only">{labels.rolePrefix}</span>
                  {texts.roles[profile.role]}
                </span>
              </div>
              <Input
                id="account-email"
                type="email"
                value={profile.email}
                disabled
                readOnly
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  )
}

// « Comme l'admin » : le membre suit la langue de toute l'admin (Paramètres › Avancé).
const ADMIN_CHOICE = "admin"

/**
 * La langue de l'admin pour ce membre (ou celle de toute l'admin) : rangée sur son compte, puis
 * la page se recharge si la langue change.
 */
function LanguageCard() {
  const labels = texts.account.language
  const { session } = useAuth()
  const brand = useBrand()
  const chosen = memberLanguage(session?.user.user_metadata)
  const save = useMutation({
    mutationFn: saveLanguage,
    onSuccess: (_, next) => applyMemberLanguage(next),
    onError: () => toast.error(labels.failed),
  })
  const items = [
    {
      value: ADMIN_CHOICE,
      label: labels.sameAsAdmin(texts.languages[brand?.language ?? "en"]),
    },
    ...LANGUAGES.map((value) => ({ value, label: texts.languages[value] })),
  ]
  const current: string = save.isPending
    ? (save.variables ?? ADMIN_CHOICE)
    : (chosen ?? ADMIN_CHOICE)

  return (
    <Section title={labels.title} description={labels.description}>
      <Field>
        <FieldLabel htmlFor="account-language">{labels.label}</FieldLabel>
        <Select
          items={items}
          value={current}
          disabled={save.isPending}
          onValueChange={(value) => {
            const next: Language | null = isLanguage(value) ? value : null
            if (next !== chosen) save.mutate(next)
          }}
        >
          <SelectTrigger id="account-language" className="w-full">
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
      </Field>
    </Section>
  )
}

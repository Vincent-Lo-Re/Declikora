import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { Link } from "react-router"
import { toast } from "sonner"

import { profileQueryKey, useAuth, type Profile } from "@/auth/auth-context"
import { PageHeader } from "@/components/page-header"
import { ThemeChoice } from "@/components/theme-choice"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
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
import { Spinner } from "@/components/ui/spinner"
import { saveFullName } from "@/lib/auth"
import { formatDateTime } from "@/lib/dates"
import { profileSchema } from "@/lib/schemas"
import { authPaths, sections } from "@/navigation"
import { texts } from "@/texts"

/** Mon compte : profil, double vérification, apparence et déconnexion, chacun dans sa carte. */
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
        <Section
          title={texts.account.profile.title}
          description={texts.account.profile.description}
        >
          {profile && <ProfileForm profile={profile} />}
        </Section>

        <Section title={texts.account.mfa.title}>
          {factor && (
            <p className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-muted-foreground" />
              {texts.account.mfa.configuredOn(
                formatDateTime(factor.created_at)
              )}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {texts.account.mfa.lostPhone}
          </p>
        </Section>

        <Section
          title={texts.theme.title}
          description={texts.theme.description}
        >
          <ThemeChoice />
        </Section>

        <Section
          title={texts.account.signOut.title}
          description={texts.account.signOut.description}
        >
          <Link
            to={authPaths.signOut}
            className={buttonVariants({ variant: "outline" })}
          >
            <LogOut />
            {texts.common.signOut}
          </Link>
        </Section>
      </div>
    </>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
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
      toast.success(texts.account.profile.saved)
    },
    onError: () => toast.error(texts.common.unexpected),
  })

  const onSubmit = form.handleSubmit(({ full_name }) => save.mutate(full_name))

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="full_name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="account-name">
                {texts.account.profile.name}
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  {...field}
                  id="account-name"
                  autoComplete="name"
                  placeholder={texts.account.profile.namePlaceholder}
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
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <dl className="grid grid-cols-label-value gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {texts.account.profile.email}
          </dt>
          <dd>{profile.email}</dd>
          <dt className="text-muted-foreground">
            {texts.account.profile.role}
          </dt>
          <dd>{texts.roles[profile.role]}</dd>
        </dl>
      </FieldGroup>
    </form>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { Link, Navigate, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { redirectTarget } from "@/auth/session"
import { AuthCard } from "@/components/auth-card"
import { CodeInput } from "@/components/code-input"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { mfaEnrollmentKey, startMfaEnrollment, verifyMfaCode } from "@/lib/auth"
import { mfaCodeSchema } from "@/lib/schemas"
import { authPaths } from "@/navigation"
import { texts } from "@/texts"

/**
 * Double vérification, après le code reçu par e-mail : configuration de l'app
 * du téléphone la première fois, puis saisie de son code à chaque connexion.
 */
export function MfaPage() {
  const { loading, session, level, factor } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!session) {
    return <Navigate to={authPaths.signIn} replace state={location.state} />
  }
  // Double vérification faite : retour à la page demandée.
  if (level === "aal2") {
    return <Navigate to={redirectTarget(location.state)} replace />
  }

  return factor ? (
    <AuthCard
      title={texts.mfa.verifyTitle}
      description={texts.mfa.verifyDescription}
    >
      <CodeForm factorId={factor.id} />
    </AuthCard>
  ) : (
    <MfaSetup userId={session.user.id} />
  )
}

function MfaSetup({ userId }: { userId: string }) {
  // Une seule préparation par membre, même si la page s'affiche deux fois.
  const enrollment = useQuery({
    queryKey: mfaEnrollmentKey(userId),
    queryFn: startMfaEnrollment,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  return (
    <AuthCard
      title={texts.mfa.setupTitle}
      description={texts.mfa.setupDescription}
    >
      {enrollment.isPending ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : enrollment.isError ? (
        <div className="space-y-4">
          <p role="alert" className="text-sm text-destructive">
            {texts.mfa.setupFailed}
          </p>
          <SignOutLink />
        </div>
      ) : (
        <ol className="space-y-5 text-sm">
          <li>1. {texts.mfa.installApp}</li>
          <li className="space-y-3">
            <p>2. {texts.mfa.scan}</p>
            <img
              src={enrollment.data.qrCode}
              alt={texts.mfa.qrCode}
              className="mx-auto size-44 rounded-lg bg-white p-2"
            />
            <p className="text-muted-foreground">{texts.mfa.secret}</p>
            <code className="block rounded-md bg-muted px-3 py-2 text-center font-mono text-xs break-all select-all">
              {enrollment.data.secret}
            </code>
          </li>
          <li className="space-y-3">
            <p>3. {texts.mfa.enterCode}</p>
            <CodeForm
              factorId={enrollment.data.factorId}
              showLostPhone={false}
            />
          </li>
        </ol>
      )}
    </AuthCard>
  )
}

// En cas de succès, la session passe au niveau « aal2 » et MfaPage redirige.
function CodeForm({
  factorId,
  showLostPhone = true,
}: {
  factorId: string
  showLostPhone?: boolean
}) {
  const form = useForm({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: "" },
  })
  const { isSubmitting, errors } = form.formState

  const onSubmit = form.handleSubmit(async ({ code }) => {
    const error = await verifyMfaCode(factorId, code)
    if (error) {
      form.resetField("code")
      form.setError("root", { message: error })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="mfa-code">{texts.mfa.code}</FieldLabel>
              <CodeInput
                id="mfa-code"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                autoFocus={showLostPhone}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <FieldError errors={[errors.root]} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {texts.mfa.submit}
        </Button>
        {showLostPhone && (
          <FieldDescription>{texts.mfa.lostPhone}</FieldDescription>
        )}
        <SignOutLink />
      </FieldGroup>
    </form>
  )
}

function SignOutLink() {
  return (
    <Link
      to={authPaths.signOut}
      className={buttonVariants({
        variant: "link",
        className: "h-auto self-start p-0",
      })}
    >
      {texts.common.signOut}
    </Link>
  )
}

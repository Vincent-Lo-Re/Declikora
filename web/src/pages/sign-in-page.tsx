import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Navigate, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import {
  clearPendingSignIn,
  readPendingSignIn,
  savePendingSignIn,
} from "@/auth/pending-sign-in"
import { redirectTarget } from "@/auth/session"
import { AuthCard } from "@/components/auth-card"
import { CodeInput } from "@/components/code-input"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { sendSignInCode, verifySignInCode } from "@/lib/auth"
import { signInCodeSchema, signInEmailSchema } from "@/lib/schemas"
import { authPaths } from "@/navigation"
import { texts } from "@/texts"

// L'étape du code : l'adresse, et le message à afficher en tête.
type CodeRequest = { email: string; notice: string }

function restoredCodeRequest(): CodeRequest | null {
  const email = readPendingSignIn()
  return email ? { email, notice: texts.signIn.codeStillValid(email) } : null
}

/** Connexion : l'adresse e-mail, puis le code à 6 chiffres reçu par e-mail. */
export function SignInPage() {
  const { loading, session, level } = useAuth()
  const location = useLocation()
  // Après un rechargement, on reprend à l'étape du code si une demande est en cours.
  const [codeRequest, setCodeRequest] = useState(restoredCodeRequest)

  if (loading) return null
  // Déjà connecté : la suite du parcours, en gardant la page demandée.
  if (session) {
    return level === "aal2" ? (
      <Navigate to={redirectTarget(location.state)} replace />
    ) : (
      <Navigate to={authPaths.mfa} replace state={location.state} />
    )
  }

  if (codeRequest === null) {
    return (
      <EmailStep
        onSent={(request) => {
          savePendingSignIn(request.email)
          setCodeRequest(request)
        }}
      />
    )
  }
  return (
    <CodeStep
      key={codeRequest.email}
      request={codeRequest}
      onChangeEmail={() => {
        clearPendingSignIn()
        setCodeRequest(null)
      }}
    />
  )
}

function EmailStep({ onSent }: { onSent: (request: CodeRequest) => void }) {
  const form = useForm({
    resolver: zodResolver(signInEmailSchema),
    defaultValues: { email: "" },
  })
  const { isSubmitting, errors } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    const result = await sendSignInCode(email)
    if (result === "sent") {
      onSent({ email, notice: texts.signIn.codeSent(email) })
    } else if (result === "recentlySent") {
      // Un code est déjà parti (page rechargée, retour à la même adresse) : on
      // passe quand même à sa saisie.
      onSent({ email, notice: texts.signIn.codeAlreadySent(email) })
    } else {
      form.setError("root", { message: result.error })
    }
  })

  return (
    <AuthCard title={texts.signIn.title} description={texts.signIn.description}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-email">
                  {texts.signIn.email}
                </FieldLabel>
                <Input
                  {...field}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={texts.signIn.emailPlaceholder}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldError errors={[errors.root]} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {texts.signIn.sendCode}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

function CodeStep({
  request: { email, notice: initialNotice },
  onChangeEmail,
}: {
  request: CodeRequest
  onChangeEmail: () => void
}) {
  const [notice, setNotice] = useState(initialNotice)
  const [resending, setResending] = useState(false)
  const form = useForm({
    resolver: zodResolver(signInCodeSchema),
    defaultValues: { code: "" },
  })
  const { isSubmitting, errors } = form.formState

  // En cas de succès, la session change et SignInPage passe à l'étape suivante.
  const onSubmit = form.handleSubmit(async ({ code }) => {
    const error = await verifySignInCode(email, code)
    if (error) {
      form.setError("root", { message: error })
    } else {
      clearPendingSignIn()
    }
  })

  const resend = async () => {
    setResending(true)
    const result = await sendSignInCode(email)
    setResending(false)
    form.clearErrors()
    form.resetField("code")
    if (result === "sent") {
      savePendingSignIn(email)
      setNotice(texts.signIn.codeResent)
    } else {
      const message =
        result === "recentlySent" ? texts.common.tooManyAttempts : result.error
      form.setError("root", { message })
    }
  }

  return (
    <AuthCard title={texts.signIn.codeTitle} description={notice}>
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="sign-in-code">
                  {texts.signIn.code}
                </FieldLabel>
                <CodeInput
                  id="sign-in-code"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                  autoFocus
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <FieldError errors={[errors.root]} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {texts.signIn.submitCode}
          </Button>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={resend}
              disabled={resending}
            >
              {texts.signIn.resendCode}
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={onChangeEmail}
            >
              {texts.signIn.otherEmail}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {texts.signIn.invitedHint}
          </p>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}

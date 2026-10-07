import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { KeyRound, MailOpen } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { Navigate, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import {
  clearPendingSignIn,
  readPendingSignIn,
  savePendingSignIn,
} from "@/auth/pending-sign-in"
import { redirectTarget } from "@/auth/session"
import { AuthForm } from "@/components/auth-form"
import { AuthNote } from "@/components/auth/auth-note"
import { toastFirstError } from "@/components/auth/form-errors"
import { AuthSlides } from "@/components/auth/auth-slides"
import { MfaStep } from "@/components/auth/mfa-step"
import { CodeInput } from "@/components/code-input"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { LoadingDots } from "@/components/loading-dots"
import { atLeast, CODE_CHECK_MIN_MS } from "@/lib/at-least"
import { sendSignInCode, verifySignInCode } from "@/lib/auth"
import {
  isCompleteCode,
  isSignInEmail,
  signInCodeSchema,
  signInEmailSchema,
} from "@/lib/schemas"
import { texts } from "@/texts"

// L'étape du code : l'adresse, et le message à afficher en tête.
type CodeRequest = { email: string; notice: string }

function restoredCodeRequest(): CodeRequest | null {
  const email = readPendingSignIn()
  return email ? { email, notice: texts.signIn.codeStillValid(email) } : null
}

/**
 * La connexion, en étapes qui glissent sur une seule page (AuthSlides, ADMIN § 2) : l'adresse
 * e-mail, le code à 6 chiffres reçu par e-mail, puis la double vérification ; ensuite, la page
 * demandée. Une session déjà ouverte (rechargement, retour d'une page de l'admin) reprend à la
 * double vérification.
 */
export function SignInPage() {
  const { loading, session, level } = useAuth()
  const location = useLocation()
  // Après un rechargement, on reprend à l'étape du code si une demande est en cours. La demande
  // reste après « Changer d'adresse » : l'étape du code garde son contenu en glissant.
  const [codeRequest, setCodeRequest] = useState(restoredCodeRequest)
  const [step, setStep] = useState<"email" | "code">(
    codeRequest ? "code" : "email"
  )
  // Un code en vérification : l'étape reste, le temps que le bouton montre son attente.
  const [checkingEmailCode, setCheckingEmailCode] = useState(false)
  const [checkingMfa, setCheckingMfa] = useState(false)

  if (loading) return null
  // Double vérification faite : la page demandée.
  if (session && level === "aal2" && !checkingEmailCode && !checkingMfa) {
    return <Navigate to={redirectTarget(location.state)} replace />
  }

  const current = session && !checkingEmailCode ? 2 : step === "code" ? 1 : 0
  return (
    <AuthSlides
      current={current}
      slides={[
        <EmailStep
          key="email"
          onSent={(request) => {
            savePendingSignIn(request.email)
            setCodeRequest(request)
            setStep("code")
          }}
        />,
        codeRequest && (
          <CodeStep
            key={codeRequest.email}
            request={codeRequest}
            onChecking={setCheckingEmailCode}
            onChangeEmail={() => {
              clearPendingSignIn()
              setStep("email")
            }}
          />
        ),
        session && (
          <MfaStep
            key="mfa"
            userId={session.user.id}
            onChecking={setCheckingMfa}
          />
        ),
      ]}
    />
  )
}

function EmailStep({ onSent }: { onSent: (request: CodeRequest) => void }) {
  const form = useForm({
    resolver: zodResolver(signInEmailSchema),
    defaultValues: { email: "" },
  })
  const { isSubmitting } = form.formState
  const emailReady = isSignInEmail(
    useWatch({ control: form.control, name: "email" })
  )

  // Les erreurs arrivent en notification, comme dans le reste de l'admin.
  const onSubmit = form.handleSubmit(async ({ email }) => {
    const result = await sendSignInCode(email)
    if (result === "sent") {
      onSent({ email, notice: texts.signIn.codeSent(email) })
    } else if (result === "recentlySent") {
      // Un code est déjà parti (page rechargée, retour à la même adresse) : on
      // passe quand même à sa saisie.
      onSent({ email, notice: texts.signIn.codeAlreadySent(email) })
    } else {
      toast.error(result.error)
    }
  }, toastFirstError)

  return (
    <AuthForm title={texts.signIn.title}>
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
                  // En quittant le champ, une adresse mal écrite le dit en notification.
                  onBlur={() => {
                    field.onBlur()
                    if (field.value.trim() && !isSignInEmail(field.value)) {
                      void form.trigger("email")
                      toast.error(texts.signIn.invalidEmail, {
                        id: "invalid-email",
                      })
                    }
                  }}
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  placeholder={texts.signIn.emailPlaceholder}
                  aria-invalid={fieldState.invalid}
                />
              </Field>
            )}
          />
          {/* Inactif tant que l'adresse n'est pas bien écrite. */}
          <Button type="submit" disabled={isSubmitting || !emailReady}>
            {isSubmitting ? <LoadingDots /> : texts.signIn.sendCode}
          </Button>
          {/* Ce qui va se passer, en bas (comme la carte « Account Access » de shadcn). */}
          <AuthNote
            icon={KeyRound}
            title={texts.signIn.hint.title}
            text={texts.signIn.hint.text}
          />
        </FieldGroup>
      </form>
    </AuthForm>
  )
}

function CodeStep({
  request: { email, notice },
  onChecking,
  onChangeEmail,
}: {
  request: CodeRequest
  onChecking: (checking: boolean) => void
  onChangeEmail: () => void
}) {
  const [resending, setResending] = useState(false)
  const form = useForm({
    resolver: zodResolver(signInCodeSchema),
    defaultValues: { code: "" },
  })
  const { isSubmitting } = form.formState
  const codeReady = isCompleteCode(
    useWatch({ control: form.control, name: "code" })
  )

  // En cas de succès, la session change et SignInPage passe à l'étape suivante.
  const onSubmit = form.handleSubmit(async ({ code }) => {
    // Au moins une seconde : on voit les trois points avant la double vérification.
    onChecking(true)
    const error = await atLeast(
      verifySignInCode(email, code),
      CODE_CHECK_MIN_MS
    )
    onChecking(false)
    if (error) {
      form.resetField("code")
      toast.error(error)
    } else {
      clearPendingSignIn()
    }
  }, toastFirstError)

  const resend = async () => {
    setResending(true)
    const result = await sendSignInCode(email)
    setResending(false)
    form.resetField("code")
    if (result === "sent") {
      savePendingSignIn(email)
      toast.success(texts.signIn.codeResent)
    } else {
      toast.error(
        result === "recentlySent" ? texts.common.tooManyAttempts : result.error
      )
    }
  }

  return (
    <AuthForm title={texts.signIn.codeTitle} description={notice}>
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
                  onComplete={() => void onSubmit()}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={fieldState.invalid}
                />
              </Field>
            )}
          />
          {/* Inactif tant que les 6 chiffres ne sont pas saisis. */}
          <Button type="submit" disabled={isSubmitting || !codeReady}>
            {isSubmitting ? <LoadingDots /> : texts.signIn.submitCode}
          </Button>
          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={resend}
              // Pas pendant la vérification d'un code.
              disabled={resending || isSubmitting}
            >
              {texts.signIn.resendCode}
            </Button>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={onChangeEmail}
              disabled={isSubmitting}
            >
              {texts.signIn.otherEmail}
            </Button>
          </div>
          <AuthNote
            icon={MailOpen}
            title={texts.signIn.invitedHint.title}
            text={texts.signIn.invitedHint.text}
          />
        </FieldGroup>
      </form>
    </AuthForm>
  )
}

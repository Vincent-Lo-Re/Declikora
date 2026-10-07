import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { LogOut, TriangleAlert } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { useState } from "react"
import { Link } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { AuthForm } from "@/components/auth-form"
import { AuthNote } from "@/components/auth/auth-note"
import { AuthSlides } from "@/components/auth/auth-slides"
import { toastFirstError } from "@/components/auth/form-errors"
import { CodeInput } from "@/components/code-input"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { LoadingDots } from "@/components/loading-dots"
import { atLeast, CODE_CHECK_MIN_MS } from "@/lib/at-least"
import { mfaEnrollmentKey, startMfaEnrollment, verifyMfaCode } from "@/lib/auth"
import { isCompleteCode, mfaCodeSchema } from "@/lib/schemas"
import { authPaths } from "@/navigation"
import { texts } from "@/texts"

/**
 * L'étape de la double vérification (AuthSlides), après le code reçu par e-mail ou l'invitation :
 * configuration de l'app du téléphone la première fois, puis saisie de son code à chaque
 * connexion. Pendant la vérification d'un code, l'étape reste telle quelle (configuration ou
 * saisie), même si la session change déjà ; onChecking le dit à la page, qui attend la fin pour
 * entrer dans l'admin.
 */
export function MfaStep({
  userId,
  onChecking,
}: {
  userId: string
  onChecking: (checking: boolean) => void
}) {
  const { factor } = useAuth()
  const [checking, setChecking] = useState<"setup" | "verify" | null>(null)

  const setup = checking ? checking === "setup" : !factor
  const onCheck = (now: boolean) => {
    setChecking(now ? (setup ? "setup" : "verify") : null)
    onChecking(now)
  }
  return !setup && factor ? (
    <AuthForm
      title={texts.mfa.verifyTitle}
      description={texts.mfa.verifyDescription}
    >
      <CodeForm factorId={factor.id} onChecking={onCheck} />
    </AuthForm>
  ) : (
    <MfaSetup userId={userId} onChecking={onCheck} />
  )
}

function MfaSetup({
  userId,
  onChecking,
}: {
  userId: string
  onChecking: (checking: boolean) => void
}) {
  // Une seule préparation par membre, même si la page s'affiche deux fois.
  const enrollment = useQuery({
    queryKey: mfaEnrollmentKey(userId),
    queryFn: startMfaEnrollment,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const [scanned, setScanned] = useState(false)

  if (enrollment.isPending) {
    return (
      <AuthForm title={texts.mfa.setupTitle}>
        <div className="flex justify-center py-6 text-muted-foreground">
          <LoadingDots />
        </div>
      </AuthForm>
    )
  }
  if (enrollment.isError) {
    return (
      <AuthForm title={texts.mfa.setupTitle}>
        <div className="space-y-4">
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{texts.mfa.setupFailed}</AlertTitle>
          </Alert>
          <SignOutNote />
        </div>
      </AuthForm>
    )
  }
  // Deux étapes qui glissent : le QR code, puis le premier code de l'app.
  return (
    <AuthSlides
      current={scanned ? 1 : 0}
      slides={[
        <AuthForm
          key="scan"
          title={texts.mfa.setupTitle}
          description={texts.mfa.setupDescription}
          media={
            <div className="mx-auto rounded-xl border bg-white p-4">
              <img
                src={enrollment.data.qrCode}
                alt={texts.mfa.qrCode}
                className="size-40"
              />
            </div>
          }
        >
          <div className="space-y-2 text-center text-sm">
            <p className="text-muted-foreground">{texts.mfa.secret}</p>
            <code className="block rounded-md bg-muted px-3 py-2 font-mono text-xs break-all select-all">
              {enrollment.data.secret}
            </code>
          </div>
          {/* Comme « Got it » de la carte de shadcn : on passe au code. */}
          <Button variant="secondary" onClick={() => setScanned(true)}>
            {texts.mfa.scanned}
          </Button>
          {/* Ici, la sortie reste discrète : un lien en petit, sous « C'est fait ». */}
          <Link
            to={authPaths.signOut}
            className="self-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {texts.common.signOut}
          </Link>
        </AuthForm>,
        <AuthForm
          key="code"
          title={texts.mfa.firstCodeTitle}
          description={texts.mfa.firstCodeDescription}
        >
          <CodeForm
            factorId={enrollment.data.factorId}
            showLostPhone={false}
            onChecking={onChecking}
            onBack={() => setScanned(false)}
          />
        </AuthForm>,
      ]}
    />
  )
}

// En cas de succès, la session passe au niveau « aal2 » et la page entre dans l’admin.
function CodeForm({
  factorId,
  showLostPhone = true,
  onChecking,
  onBack,
}: {
  factorId: string
  showLostPhone?: boolean
  onChecking: (checking: boolean) => void
  /** Revenir au QR code (configuration). */
  onBack?: () => void
}) {
  const form = useForm({
    resolver: zodResolver(mfaCodeSchema),
    defaultValues: { code: "" },
  })
  const { isSubmitting } = form.formState
  const codeReady = isCompleteCode(
    useWatch({ control: form.control, name: "code" })
  )

  const onSubmit = form.handleSubmit(async ({ code }) => {
    // Au moins une seconde : on voit les trois points avant d'entrer dans l'admin.
    onChecking(true)
    const error = await atLeast(
      verifyMfaCode(factorId, code),
      CODE_CHECK_MIN_MS
    )
    onChecking(false)
    if (error) {
      form.resetField("code")
      toast.error(error)
    }
  }, toastFirstError)

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
          {isSubmitting ? <LoadingDots /> : texts.mfa.submit}
        </Button>
        {showLostPhone && (
          <FieldDescription className="text-center text-xs">
            {texts.mfa.lostPhone}
          </FieldDescription>
        )}
        {onBack && (
          <Button
            type="button"
            variant="link"
            className="h-auto self-center p-0"
            onClick={onBack}
            disabled={isSubmitting}
          >
            {texts.mfa.backToQr}
          </Button>
        )}
        <SignOutNote />
      </FieldGroup>
    </form>
  )
}

/** « Se déconnecter », en bas de la carte, sur fond gris (comme « Danger Zone » d'« Account Access »). */
function SignOutNote() {
  return (
    <AuthNote
      icon={LogOut}
      danger
      title={texts.common.signOut}
      text={texts.mfa.signOutText}
      to={authPaths.signOut}
    />
  )
}

import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Link, Navigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { redirectTarget } from "@/auth/session"

import { AuthForm } from "@/components/auth-form"
import { AuthSlides } from "@/components/auth/auth-slides"
import { MfaStep } from "@/components/auth/mfa-step"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { LoadingDots } from "@/components/loading-dots"
import { acceptInvitation } from "@/lib/auth"
import { authPaths } from "@/navigation"
import { texts } from "@/texts"
import { useBrandName } from "@/hooks/use-brand-name"

/**
 * Lien reçu dans l'e-mail d'invitation, en deux étapes qui glissent (AuthSlides, ADMIN § 2) :
 * accepter l'invitation, puis configurer la double vérification ; ensuite, l'Accueil.
 * L'invitation n'est acceptée qu'au clic : les antivirus qui ouvrent les liens des e-mails ne la
 * consomment donc pas.
 */
export function InvitationPage() {
  const { session, level } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [checkingMfa, setCheckingMfa] = useState(false)

  // Double vérification configurée : l'admin.
  if (accepted && session && level === "aal2" && !checkingMfa) {
    return <Navigate to={redirectTarget(undefined)} replace />
  }
  return (
    <AuthSlides
      current={accepted && session ? 1 : 0}
      slides={[
        <InvitationStep
          key="invitation"
          onAccepted={() => setAccepted(true)}
        />,
        accepted && session && (
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

function InvitationStep({ onAccepted }: { onAccepted: () => void }) {
  const [searchParams] = useSearchParams()
  const brand = useBrandName()
  const [accepting, setAccepting] = useState(false)

  const tokenHash = searchParams.get("token_hash")
  const complete = tokenHash !== null && searchParams.get("type") === "invite"

  const accept = async () => {
    if (!tokenHash) return
    setAccepting(true)
    const failure = await acceptInvitation(tokenHash)
    setAccepting(false)
    // Un refus arrive en notification, comme dans le reste de l'admin.
    if (failure) toast.error(failure)
    // Connecté : il reste à configurer la double vérification, à l'étape suivante.
    else onAccepted()
  }

  return (
    <AuthForm
      title={texts.invitation.title}
      description={complete ? texts.invitation.description(brand) : undefined}
    >
      {complete ? (
        <FieldGroup>
          <Button onClick={accept} disabled={accepting}>
            {accepting ? <LoadingDots /> : texts.invitation.accept}
          </Button>
        </FieldGroup>
      ) : (
        <FieldGroup>
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{texts.invitation.incomplete}</AlertTitle>
          </Alert>
          <Link
            to={authPaths.signIn}
            className={buttonVariants({ variant: "outline" })}
          >
            {texts.invitation.toSignIn}
          </Link>
        </FieldGroup>
      )}
    </AuthForm>
  )
}

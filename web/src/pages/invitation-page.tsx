import { TriangleAlert } from "lucide-react"
import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { AuthCard } from "@/components/auth-card"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { acceptInvitation } from "@/lib/auth"
import { authPaths } from "@/navigation"
import { texts } from "@/texts"

/**
 * Lien reçu dans l'e-mail d'invitation. L'invitation n'est acceptée qu'au clic :
 * les antivirus qui ouvrent les liens des e-mails ne la consomment donc pas.
 */
export function InvitationPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenHash = searchParams.get("token_hash")
  const complete = tokenHash !== null && searchParams.get("type") === "invite"

  const accept = async () => {
    if (!tokenHash) return
    setAccepting(true)
    setError(null)
    const failure = await acceptInvitation(tokenHash)
    setAccepting(false)
    if (failure) setError(failure)
    // Connecté : il reste à configurer la double vérification.
    else navigate(authPaths.mfa, { replace: true })
  }

  return (
    <AuthCard
      title={texts.invitation.title}
      description={complete ? texts.invitation.description : undefined}
    >
      {complete ? (
        <FieldGroup>
          <FieldError>{error}</FieldError>
          <Button onClick={accept} disabled={accepting}>
            {accepting && <Spinner />}
            {texts.invitation.accept}
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
    </AuthCard>
  )
}

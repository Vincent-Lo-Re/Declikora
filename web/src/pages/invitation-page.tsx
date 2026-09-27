import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"

import { AuthCard } from "@/components/auth-card"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldError, FieldGroup } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { authErrorMessage } from "@/lib/auth-errors"
import { supabase } from "@/lib/supabase"
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
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "invite",
    })
    setAccepting(false)
    if (error) setError(authErrorMessage(error, "invitation"))
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
          <p role="alert" className="text-sm text-destructive">
            {texts.invitation.incomplete}
          </p>
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

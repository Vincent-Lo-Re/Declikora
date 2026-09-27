import { useEffect } from "react"
import { Navigate } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { supabase } from "@/lib/supabase"
import { authPaths } from "@/navigation"

/**
 * « Se déconnecter » : ferme la session sur ce navigateur seulement (les autres
 * appareils restent connectés), puis ouvre la page de connexion, sans garder
 * la page d'où l'on vient.
 */
export function SignOutPage() {
  const { session } = useAuth()

  useEffect(() => {
    void supabase.auth.signOut({ scope: "local" })
  }, [])

  return session ? null : <Navigate to={authPaths.signIn} replace />
}

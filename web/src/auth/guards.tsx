import { Navigate, Outlet, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import type { RedirectState } from "@/auth/session"
import { LoadingScreen } from "@/components/loading-screen"
import { MemberPreparation } from "@/components/member-preparation"
import { authPaths } from "@/navigation"
import { AdminOnlyPage } from "@/pages/admin-only-page"

/**
 * Pages de l'admin : il faut être connecté, avoir passé la double vérification
 * et faire partie de l'équipe. Sinon, on passe par la connexion en gardant la
 * page demandée. La base vérifie les mêmes règles de son côté.
 */
export function RequireTeamMember() {
  const { loading, session, level, profile, profileState } = useAuth()
  const { pathname, search } = useLocation()
  const state: RedirectState = { from: pathname + search }

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to={authPaths.signIn} replace state={state} />
  if (level !== "aal2") {
    return <Navigate to={authPaths.mfa} replace state={state} />
  }
  // La page d'erreur propose de recharger.
  if (profileState === "error") throw new Error("Fiche du membre illisible")
  // Sans fiche, la déconnexion est en cours (voir AuthProvider).
  if (!profile) return <LoadingScreen />

  // Le membre prépare les pages avant de les montrer (lib/preparation.ts).
  return (
    <>
      <MemberPreparation member={profile} />
      <Outlet />
    </>
  )
}

/** Sections réservées aux admins (Équipe, Paramètres). */
export function RequireAdmin() {
  const { profile } = useAuth()
  return profile?.role === "admin" ? <Outlet /> : <AdminOnlyPage />
}

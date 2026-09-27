import type { Factor, Session } from "@supabase/supabase-js"
import { createContext, useContext } from "react"

import type { AssuranceLevel } from "@/auth/session"
import type { Tables } from "@/lib/database.types"

export type Profile = Pick<
  Tables<"profiles">,
  "id" | "email" | "full_name" | "role"
>

export type AuthValue = {
  // Vrai tant que la session gardée par le navigateur n'a pas été lue.
  loading: boolean
  session: Session | null
  level: AssuranceLevel | null
  // L'app de double vérification configurée (null si elle ne l'est pas encore).
  factor: Factor | null
  // La fiche du membre (rôle, nom), lisible dès le code reçu par e-mail.
  profile: Profile | null
  profileState: "loading" | "error" | "ready"
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider")
  }
  return context
}

export const profileQueryKey = (userId: string | undefined) =>
  ["profile", userId] as const

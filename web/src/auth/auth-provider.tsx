import type { Session } from "@supabase/supabase-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type ReactNode } from "react"

import {
  AuthContext,
  profileQueryKey,
  type AuthValue,
  type Profile,
} from "@/auth/auth-context"
import { assuranceLevel, verifiedTotpFactor } from "@/auth/session"
import { supabase } from "@/lib/supabase"

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Suit la session Supabase et charge la fiche du membre connecté. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<{
    loading: boolean
    session: Session | null
  }>({ loading: true, session: null })

  useEffect(() => {
    // Rappel synchrone, sans autre appel à Supabase : la version asynchrone
    // peut bloquer le rafraîchissement de la session.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ loading: false, session })
      if (event === "SIGNED_OUT") queryClient.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const { session } = state
  const userId = session?.user.id
  const profileQuery = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => fetchProfile(userId!),
    enabled: userId !== undefined,
  })

  // Une session sans fiche : le membre a été retiré de l'équipe.
  const removed = profileQuery.isSuccess && profileQuery.data === null
  useEffect(() => {
    if (removed) void supabase.auth.signOut({ scope: "local" })
  }, [removed])

  const value: AuthValue = {
    loading: state.loading,
    session,
    level: session ? assuranceLevel(session) : null,
    factor: session ? verifiedTotpFactor(session) : null,
    profile: profileQuery.data ?? null,
    // Une relecture qui échoue en arrière-plan (réseau coupé au retour sur l'onglet) garde la
    // fiche déjà chargée : l'erreur ne bloque l'admin que s'il n'y a encore aucune fiche.
    profileState:
      profileQuery.data !== undefined
        ? "ready"
        : profileQuery.isError
          ? "error"
          : "loading",
  }

  return <AuthContext value={value}>{children}</AuthContext>
}

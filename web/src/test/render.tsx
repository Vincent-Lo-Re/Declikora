import type { Factor, Session } from "@supabase/supabase-js"
import { render } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"

import { AuthContext, type AuthValue, type Profile } from "@/auth/auth-context"
import { AppProviders } from "@/components/app-providers"
import { createQueryClient } from "@/lib/query-client"
import { routes } from "@/routes"

export const testFactor: Factor = {
  id: "facteur-1",
  factor_type: "totp",
  status: "verified",
  created_at: "2026-09-27T12:30:00Z",
  updated_at: "2026-09-27T12:30:00Z",
}

export const testProfile: Profile = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "anne@exemple.test",
  full_name: "Anne Admin",
  role: "admin",
}

/** Session simulée : seuls les champs lus par l'admin sont remplis. */
function fakeSession(profile: Profile, factor: Factor | null): Session {
  return {
    access_token: "jeton-de-test",
    user: {
      id: profile.id,
      email: profile.email,
      factors: factor ? [factor] : [],
    },
  } as unknown as Session
}

type AuthOptions =
  | "signed-out"
  | {
      role?: Profile["role"]
      level?: "aal1" | "aal2"
      factor?: Factor | null
    }

/** État de connexion simulé, sans Supabase. Par défaut : un admin, double vérification faite. */
export function fakeAuth(options: AuthOptions = {}): AuthValue {
  if (options === "signed-out") {
    return {
      loading: false,
      session: null,
      level: null,
      factor: null,
      profile: null,
      profileState: "loading",
    }
  }
  const profile = { ...testProfile, role: options.role ?? "admin" }
  const factor = options.factor === undefined ? testFactor : options.factor
  return {
    loading: false,
    session: fakeSession(profile, factor),
    level: options.level ?? "aal2",
    factor,
    profile,
    profileState: "ready",
  }
}

/** Affiche l'admin à l'adresse donnée, avec l'état de connexion simulé. */
export function renderApp(path: string, auth: AuthValue = fakeAuth()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  render(
    <AppProviders queryClient={queryClient}>
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </AppProviders>
  )
  return { router, queryClient }
}

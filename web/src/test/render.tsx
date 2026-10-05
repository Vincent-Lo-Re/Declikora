import type { Factor, Session } from "@supabase/supabase-js"
import { act, render, waitFor } from "@testing-library/react"
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from "react-router"
import { expect } from "vitest"

import { AuthContext, type AuthValue, type Profile } from "@/auth/auth-context"
import { AppProviders } from "@/components/app-providers"
import { startPreparation, type PageHandle } from "@/lib/preparation"
import { createQueryClient } from "@/lib/query-client"
import { routes } from "@/routes"

/**
 * Le code des pages, chargé avec ce fichier (comme avant leur découpage) : un test ne compte pas
 * le temps de le compiler. L'éditeur (warm) reste chargé par le test qui l'ouvre.
 */
async function loadPages(list: RouteObject[]): Promise<unknown> {
  return Promise.all(
    list.flatMap((route) => {
      const handle = route.handle as PageHandle | undefined
      return [
        ...(handle && !handle.warm ? [handle.code()] : []),
        loadPages(route.children ?? []),
      ]
    })
  )
}
await loadPages(routes)

const testFactor: Factor = {
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

/**
 * Le routeur a fini : le code de la page est chargé, et les redirections (connexion, double
 * vérification…) sont faites.
 */
async function settled(router: ReturnType<typeof createMemoryRouter>) {
  const idle = () =>
    router.state.initialized && router.state.navigation.state === "idle"
  for (let round = 0; round < 5; round++) {
    // Le premier chargement d'une page dans un fichier de tests la compile (l'éditeur : Tiptap).
    await waitFor(() => expect(idle()).toBe(true), { timeout: 15_000 })
    const shown = router.state.location.key
    // Les effets de la page affichée (une redirection, par exemple) ont lieu ici.
    await act(() => Promise.resolve())
    if (idle() && router.state.location.key === shown) return
  }
}

/**
 * Affiche l'admin à l'adresse donnée, avec l'état de connexion simulé, une fois le code de la page
 * chargé (chaque page est chargée à part).
 */
export async function renderApp(path: string, auth: AuthValue = fakeAuth()) {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  const preparation = startPreparation(queryClient, routes)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders queryClient={queryClient}>
      <AuthContext value={auth}>
        <RouterProvider router={router} />
      </AuthContext>
    </AppProviders>
  )
  await settled(router)
  return { router, queryClient, preparation }
}

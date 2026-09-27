import type {
  AuthChangeEvent,
  Session,
  Subscription,
} from "@supabase/supabase-js"
import { QueryClientProvider } from "@tanstack/react-query"
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { profileQueryKey, useAuth } from "@/auth/auth-context"
import { AuthProvider } from "@/auth/auth-provider"
import { createQueryClient } from "@/lib/query-client"
import { supabase } from "@/lib/supabase"

afterEach(() => vi.restoreAllMocks())

type Listener = (event: AuthChangeEvent, session: Session | null) => void

// Remplace le suivi de session de Supabase : le test décide des événements.
function captureAuthListener() {
  let listener: Listener = () => {}
  vi.spyOn(supabase.auth, "onAuthStateChange").mockImplementation(
    (callback) => {
      listener = callback as Listener
      return {
        data: { subscription: { unsubscribe: () => {} } as Subscription },
      }
    }
  )
  return (event: AuthChangeEvent, session: Session | null) =>
    act(() => listener(event, session))
}

function mockProfile(profile: object | null) {
  vi.spyOn(supabase, "from").mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: profile, error: null }),
      }),
    }),
  } as never)
}

function State() {
  const { loading, session, level, profile, profileState } = useAuth()
  return (
    <output>
      {JSON.stringify({
        loading,
        user: session?.user.id ?? null,
        level,
        role: profile?.role ?? null,
        profileState,
      })}
    </output>
  )
}

function renderProvider() {
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <State />
      </AuthProvider>
    </QueryClientProvider>
  )
  return queryClient
}

const state = () => JSON.parse(screen.getByRole("status").textContent ?? "")

// Jeton de niveau aal2 (seul son contenu est lu).
const aal2Session = {
  access_token: `e30.${btoa(JSON.stringify({ aal: "aal2" }))}.x`,
  user: { id: "u1", factors: [] },
} as unknown as Session

describe("AuthProvider", () => {
  it("attend la session enregistrée, puis la suit", async () => {
    const emit = captureAuthListener()
    mockProfile({
      id: "u1",
      email: "a@exemple.test",
      full_name: null,
      role: "editor",
    })
    renderProvider()

    expect(state().loading).toBe(true)

    emit("INITIAL_SESSION", null)
    expect(state()).toMatchObject({ loading: false, user: null, level: null })

    emit("SIGNED_IN", aal2Session)
    expect(state()).toMatchObject({ user: "u1", level: "aal2" })
    await vi.waitFor(() =>
      expect(state()).toMatchObject({ role: "editor", profileState: "ready" })
    )
  })

  it("garde la fiche si une relecture échoue en arrière-plan", async () => {
    const emit = captureAuthListener()
    const profile = {
      id: "u1",
      email: "a@exemple.test",
      full_name: null,
      role: "editor",
    }
    let fail = false
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            fail
              ? { data: null, error: new Error("réseau coupé") }
              : { data: profile, error: null },
        }),
      }),
    } as never)
    const queryClient = renderProvider()

    emit("INITIAL_SESSION", aal2Session)
    await vi.waitFor(() =>
      expect(state()).toMatchObject({ role: "editor", profileState: "ready" })
    )

    fail = true
    await act(() =>
      queryClient.refetchQueries({ queryKey: profileQueryKey("u1") })
    )
    expect(queryClient.getQueryState(profileQueryKey("u1"))?.status).toBe(
      "error"
    )
    expect(state()).toMatchObject({ role: "editor", profileState: "ready" })
  })

  it("signale une fiche illisible au premier chargement", async () => {
    const emit = captureAuthListener()
    vi.spyOn(supabase, "from").mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: new Error("réseau coupé"),
          }),
        }),
      }),
    } as never)
    renderProvider()

    emit("INITIAL_SESSION", aal2Session)
    await vi.waitFor(() =>
      expect(state()).toMatchObject({ role: null, profileState: "error" })
    )
  })

  it("déconnecte un membre retiré de l'équipe", async () => {
    const emit = captureAuthListener()
    mockProfile(null)
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null })
    renderProvider()

    emit("INITIAL_SESSION", aal2Session)

    await vi.waitFor(() =>
      expect(signOut).toHaveBeenCalledWith({ scope: "local" })
    )
  })
})

import { QueryClient, QueryObserver } from "@tanstack/react-query"
import type { RouteObject } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  fresh,
  getPreparation,
  PREPARE_LIMIT_MS,
  preparedOnArrival,
  ready,
  startPreparation,
  withinLimit,
  type PageHandle,
  type Prepare,
} from "@/lib/preparation"

// La préparation des pages (ADMIN § 7, « Une navigation sans à-coups », étape 2) : ce qu'une page
// lit avant d'être montrée, la limite de 2 secondes, la lecture à l'avance d'un lien et le
// contrôle des lectures non préparées.

const KEY = ["essai"] as const
const member = { id: "membre-1", role: "editor" as const }

/** Une lecture faite par un composant affiché (un observateur, comme useQuery). */
function read(queryClient: QueryClient, queryKey: readonly unknown[]) {
  new QueryObserver(queryClient, {
    queryKey,
    queryFn: async () => "lu",
  }).subscribe(() => {})
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe("ready et fresh : les lectures d'une page", () => {
  it("ready garde ce qui est en mémoire, même ancien ; sinon, ou si c'est périmé, relit", async () => {
    const queryClient = client()
    const queryFn = vi.fn(async () => "lu")

    expect(await ready(queryClient, { queryKey: KEY, queryFn })).toBe("lu")
    expect(queryFn).toHaveBeenCalledTimes(1)
    // En mémoire, même au-delà de sa fraîcheur : la page la relira derrière, sans attendre.
    expect(
      await ready(queryClient, { queryKey: KEY, queryFn, staleTime: 0 })
    ).toBe("lu")
    expect(queryFn).toHaveBeenCalledTimes(1)

    // Périmée (invalidée après un geste) : relue avant d'ouvrir la page.
    await queryClient.invalidateQueries({ queryKey: KEY })
    queryFn.mockResolvedValueOnce("relu")
    expect(await ready(queryClient, { queryKey: KEY, queryFn })).toBe("relu")
  })

  it("une lecture qui échoue ne fait pas échouer la préparation : la page montrera l'erreur", async () => {
    const queryClient = client()
    const queryFn = vi.fn(async (): Promise<string> => {
      throw new Error("réseau")
    })
    expect(await ready(queryClient, { queryKey: KEY, queryFn })).toBeUndefined()
    expect(await fresh(queryClient, { queryKey: KEY, queryFn })).toBeUndefined()
  })

  it("fresh relit ce qui a plus de son âge permis, et garde ce qui vient d'être lu", async () => {
    vi.useFakeTimers()
    const queryClient = client()
    const queryFn = vi.fn(async () => "lu")
    await fresh(queryClient, { queryKey: KEY, queryFn }, 1000)
    await fresh(queryClient, { queryKey: KEY, queryFn }, 1000)
    expect(queryFn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1500)
    await fresh(queryClient, { queryKey: KEY, queryFn }, 1000)
    expect(queryFn).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe("withinLimit", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("vrai si le travail finit à temps (même en échec), faux à la limite", async () => {
    expect(await withinLimit(Promise.resolve())).toBe(true)
    expect(await withinLimit(Promise.reject(new Error("raté")))).toBe(true)

    const late = withinLimit(new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(PREPARE_LIMIT_MS)
    expect(await late).toBe(false)
  })
})

describe("la préparation de l'admin", () => {
  const code = vi.fn(async () => ({}))
  const prepare = vi.fn<Prepare>(async () => {})
  const editorCode = vi.fn(async () => ({}))
  const routes: RouteObject[] = [
    {
      children: [
        {
          path: "/blog",
          handle: { code, prepare } satisfies PageHandle,
        },
        {
          path: "/blog/:contentId",
          handle: {
            code: editorCode,
            prepare: null,
            warm: true,
          } satisfies PageHandle,
        },
      ],
    },
  ]
  const url = (path: string) => new URL(path, window.location.origin)

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it("ne prépare rien sans membre connecté (premier chargement, connexion)", async () => {
    const preparation = startPreparation(client(), routes)
    expect(getPreparation()).toBe(preparation)
    await preparation.arrive(prepare, {}, url("/blog"))
    preparation.ahead("/blog")
    expect(prepare).not.toHaveBeenCalled()
  })

  it("prépare la page avant de la montrer, 2 secondes au plus", async () => {
    vi.useFakeTimers()
    const queryClient = client()
    const preparation = startPreparation(queryClient, routes)
    preparation.setMember(member)

    await preparation.arrive(prepare, { id: "1" }, url("/blog?status=draft"))
    expect(prepare).toHaveBeenCalledWith({
      queryClient,
      member,
      params: { id: "1" },
      search: new URLSearchParams("status=draft"),
    })

    // Une lecture qui n'en finit pas : la page s'affiche quand même au bout de 2 secondes.
    prepare.mockReturnValueOnce(new Promise(() => {}))
    let shown = false
    void preparation.arrive(prepare, {}, url("/blog")).then(() => {
      shown = true
    })
    await vi.advanceTimersByTimeAsync(PREPARE_LIMIT_MS - 1)
    expect(shown).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(shown).toBe(true)
  })

  it("lit à l'avance la page d'un lien : son code et ce qu'elle prépare, une fois", () => {
    const preparation = startPreparation(client(), routes)
    preparation.setMember(member)

    preparation.ahead(`${window.location.origin}/blog?q=pluie`)
    expect(code).toHaveBeenCalledTimes(1)
    expect(prepare).toHaveBeenCalledWith(
      expect.objectContaining({
        member,
        params: {},
        search: new URLSearchParams("q=pluie"),
      })
    )
    // Survolé de nouveau peu après : rien de plus.
    preparation.ahead("/blog?q=pluie")
    expect(prepare).toHaveBeenCalledTimes(1)
    // Une adresse inconnue, ou la page affichée : rien.
    preparation.ahead("/ailleurs")
    preparation.ahead(window.location.pathname)
    expect(code).toHaveBeenCalledTimes(1)
  })

  it("le code des pages warm se télécharge à l'arrivée du membre, si on le demande", async () => {
    startPreparation(client(), routes).setMember(member)
    await vi.waitFor(() => expect(code).not.toHaveBeenCalled())
    expect(editorCode).not.toHaveBeenCalled()

    startPreparation(client(), routes, { warmUp: true }).setMember(member)
    await vi.waitFor(() => expect(editorCode).toHaveBeenCalledTimes(1))
    expect(code).not.toHaveBeenCalled()
  })

  it("le contrôle signale une lecture faite en arrivant sans avoir été préparée", async () => {
    const queryClient = client()
    const warn = vi.fn()
    const preparation = startPreparation(queryClient, routes, { warn })
    preparation.setMember(member)
    const prepared = ["préparée"]
    await preparation.arrive(
      async ({ queryClient }) =>
        ready(queryClient, { queryKey: prepared, queryFn: async () => 1 }),
      {},
      url("/blog")
    )
    preparation.shown("/blog")

    // Ce que la page avait préparé : rien à dire, même relu.
    read(queryClient, prepared)
    await queryClient.refetchQueries({ queryKey: prepared })
    expect(warn).not.toHaveBeenCalled()
    // Une lecture oubliée par la préparation de la page.
    read(queryClient, ["oubliée"])
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        'Lecture non préparée en arrivant sur /blog : ["oubliée"]'
      )
    )
  })

  it("le contrôle ne compte ni la préparation de la page suivante, ni ce qu'un geste fait lire", async () => {
    const queryClient = client()
    const warn = vi.fn()
    const preparation = startPreparation(queryClient, routes, { warn })
    preparation.setMember(member)
    await preparation.arrive(null, {}, url("/blog"))
    preparation.shown("/blog")

    // Un lien survolé, puis cliqué : la page suivante se prépare (sans composant qui la lise).
    preparation.ahead("/blog?q=pluie")
    await preparation.arrive(
      ({ queryClient }) =>
        ready(queryClient, { queryKey: ["suivante"], queryFn: async () => 1 }),
      {},
      url("/blog/1")
    )
    expect(warn).not.toHaveBeenCalled()

    // Sur une page montrée, un clic : ce qu'il fait lire n'est pas une lecture d'arrivée.
    preparation.shown("/blog/1")
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    read(queryClient, ["après un clic"])
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(warn).not.toHaveBeenCalled()
  })

  it("le contrôle se tait après la limite de 2 secondes (la page n'était pas prête)", async () => {
    vi.useFakeTimers()
    const queryClient = client()
    const warn = vi.fn()
    const preparation = startPreparation(queryClient, routes, { warn })
    preparation.setMember(member)
    const arrival = preparation.arrive(
      () => new Promise(() => {}),
      {},
      url("/blog")
    )
    await vi.advanceTimersByTimeAsync(PREPARE_LIMIT_MS)
    await arrival
    preparation.shown("/blog")
    read(queryClient, ["après"])
    await vi.advanceTimersByTimeAsync(10)
    expect(warn).not.toHaveBeenCalled()
  })

  it("une page n'est préparée qu'en y arrivant, pas quand sa recherche change", () => {
    const args = (from: string, to: string) =>
      ({
        currentUrl: url(from),
        nextUrl: url(to),
      }) as Parameters<typeof preparedOnArrival>[0]
    expect(preparedOnArrival(args("/blog", "/blog?q=pluie"))).toBe(false)
    expect(preparedOnArrival(args("/blog/1", "/blog/2"))).toBe(true)
  })
})

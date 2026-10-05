import type {
  QueryClient,
  QueryExecuteOptions,
  QueryKey,
} from "@tanstack/react-query"
import {
  matchRoutes,
  type LoaderFunctionArgs,
  type Params,
  type RouteObject,
  type ShouldRevalidateFunctionArgs,
} from "react-router"

import type { Profile } from "@/auth/auth-context"
import { REREAD_MS } from "@/lib/reads"

/*
 * Les pages arrivent complètes (ADMIN § 7, « Une navigation sans à-coups », étape 2) : la page
 * suivante est préparée avant d'être montrée (le loader de sa route), pendant que la page
 * actuelle reste à l'écran. Un lien survolé ou atteint au clavier est lu à l'avance. Les pages
 * disent ce qu'elles préparent dans lib/page-preparations.ts, avec les lectures de lib/reads.ts.
 */

/** Au-delà, la page s'affiche quand même, avec des lignes grises là où il manque encore quelque chose. */
export const PREPARE_LIMIT_MS = 2_000
/** La barre du haut n'apparaît qu'après ce délai : une page déjà prête s'ouvre sans clignoter. */
export const BAR_DELAY_MS = 200
/** Un lien survolé aussi longtemps est lu à l'avance (pas ceux que la souris ne fait que traverser). */
export const INTENT_DELAY_MS = 80
// Un lien déjà lu à l'avance ne l'est pas de nouveau avant ce délai.
const AHEAD_AGAIN_MS = 10_000
// Après l'arrivée sur une page préparée, une lecture sans données qui part pendant ce temps
// n'avait pas été préparée (contrôle, voir createPreparation).
const ARRIVAL_WATCH_MS = 1_000

/** Le membre connecté, double vérification faite : rien n'est préparé sans lui. */
export type Member = Pick<Profile, "id" | "role">

type PrepareArgs = {
  queryClient: QueryClient
  member: Member
  params: Params
  search: URLSearchParams
}

/** Lit ce que la page montre en arrivant ; se termine quand c'est prêt, jamais en échec. */
export type Prepare = (args: PrepareArgs) => Promise<unknown>

/**
 * Une page de l'admin (handle de sa route) : son code, chargé à part, ce qu'elle prépare (null :
 * elle ne lit rien en arrivant), et warm si son code se télécharge dès l'ouverture de l'admin.
 */
export type PageHandle = {
  code: () => Promise<unknown>
  prepare: Prepare | null
  warm?: boolean
}

function isPageHandle(handle: unknown): handle is PageHandle {
  return (
    typeof handle === "object" &&
    handle !== null &&
    "code" in handle &&
    "prepare" in handle
  )
}

type Read<T, K extends QueryKey> = QueryExecuteOptions<T, Error, T, T, K>

/**
 * Une lecture prête : celle en mémoire si elle s'y trouve (même ancienne : la page la relira
 * derrière), sinon, ou si on la sait périmée (invalidée), une nouvelle lecture. Jamais en échec :
 * la page montrera l'erreur et « Réessayer ».
 */
export async function ready<T, K extends QueryKey>(
  queryClient: QueryClient,
  read: Read<T, K>
): Promise<T | undefined> {
  const state = queryClient.getQueryState<T>(read.queryKey)
  if (state?.data !== undefined && !state.isInvalidated) return state.data
  return queryClient.query(read).catch(() => undefined)
}

/**
 * Une lecture récente : relue si elle a plus de `maxAgeMs` (par défaut, relue à chaque ouverture,
 * sauf si elle vient de l'être). Jamais en échec.
 */
export function fresh<T, K extends QueryKey>(
  queryClient: QueryClient,
  read: Read<T, K>,
  maxAgeMs = REREAD_MS
): Promise<T | undefined> {
  return queryClient
    .query({ ...read, staleTime: maxAgeMs })
    .catch(() => undefined)
}

/** Vrai si le travail finit dans les temps, faux si la limite passe avant. */
export async function withinLimit(
  work: Promise<unknown>,
  limitMs = PREPARE_LIMIT_MS
): Promise<boolean> {
  let timer = 0
  const limit = new Promise<boolean>((resolve) => {
    timer = window.setTimeout(() => resolve(false), limitMs)
  })
  try {
    return await Promise.race([
      work.then(
        () => true,
        () => true
      ),
      limit,
    ])
  } finally {
    window.clearTimeout(timer)
  }
}

/** Des images téléchargées et décodées d'avance : la page les montre aussitôt. */
export function preloadImages(urls: readonly string[]): Promise<unknown> {
  return Promise.allSettled(
    urls.map((url) => {
      const image = new Image()
      image.src = url
      // Sans decode (navigateur simulé des tests), rien à attendre.
      return typeof image.decode === "function"
        ? image.decode()
        : Promise.resolve()
    })
  )
}

/** Quand le navigateur a un moment (tout de suite s'il ne sait pas le dire). */
function whenIdle(work: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(work)
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(work, 0)
  return () => window.clearTimeout(id)
}

export type Preparation = {
  readonly queryClient: QueryClient
  /** Le membre connecté (null : déconnecté) ; à son arrivée, le code des pages warm se télécharge. */
  setMember: (member: Member | null) => () => void
  /** Prépare la page d'une adresse avant de la montrer, PREPARE_LIMIT_MS au plus (loader). */
  arrive: (prepare: Prepare | null, params: Params, url: URL) => Promise<void>
  /** La page vient d'être montrée : le contrôle des lectures non préparées commence. */
  shown: (pathname: string) => void
  /** Lit à l'avance la page d'un lien (survol, clavier) : son code et ce qu'elle prépare. */
  ahead: (href: string) => void
}

/**
 * La préparation des pages, commune au routeur (loaders) et aux composants (voir
 * startPreparation). routes : celles du routeur, pour retrouver la page d'un lien. warmUp : le
 * code des pages warm se télécharge à l'arrivée du membre (pas dans les tests). warn : le
 * contrôle, qui signale une lecture faite par une page en arrivant sans avoir été préparée (en
 * développement et pendant les parcours Playwright ; voir docs/BONNES-PRATIQUES.md, § 2).
 */
function createPreparation(
  queryClient: QueryClient,
  routes: RouteObject[],
  {
    warn,
    warmUp: warm = false,
  }: { warn?: (message: string) => void; warmUp?: boolean } = {}
): Preparation {
  let member: Member | null = null
  let arrival: { pathname: string; prepared: boolean } | null = null
  let watched: { pathname: string; until: number } | null = null
  const aheadAt = new Map<string, number>()

  if (warn) {
    // Seules comptent les lectures de la page elle-même en arrivant : une lecture lancée par un
    // composant affiché (pas par une préparation), sans données à montrer. Le premier geste de la
    // personne (clic, touche) arrête le contrôle : ce qu'il lit ensuite ne vient pas de l'arrivée.
    queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "fetch") return
      if (!watched || Date.now() > watched.until) return
      if (event.query.state.data !== undefined) return
      if (event.query.getObserversCount() === 0) return
      warn(
        `Lecture non préparée en arrivant sur ${watched.pathname} : ${JSON.stringify(event.query.queryKey)}`
      )
    })
  }

  if (warn) {
    const stopWatching = () => {
      watched = null
    }
    document.addEventListener("pointerdown", stopWatching, true)
    document.addEventListener("keydown", stopWatching, true)
  }

  const pageOf = (pathname: string) => {
    const match = matchRoutes(routes, pathname)?.at(-1)
    return match && isPageHandle(match.route.handle)
      ? { page: match.route.handle, params: match.params }
      : null
  }

  const warmUp = () => {
    const visit = (list: RouteObject[]) => {
      for (const route of list) {
        if (isPageHandle(route.handle) && route.handle.warm) {
          void route.handle.code().catch(() => undefined)
        }
        if (route.children) visit(route.children)
      }
    }
    visit(routes)
  }

  return {
    queryClient,
    setMember(next) {
      member = next
      if (!next || !warm) return () => undefined
      return whenIdle(warmUp)
    },
    async arrive(prepare, params, url) {
      const current = member
      arrival = null
      // La page suivante se prépare : ses lectures ne sont pas celles de la page affichée.
      watched = null
      // Pas encore connecté (premier chargement, connexion) : la page lira elle-même.
      if (!current) return
      const prepared = prepare
        ? await withinLimit(
            prepare({
              queryClient,
              member: current,
              params,
              search: url.searchParams,
            })
          )
        : true
      arrival = { pathname: url.pathname, prepared }
    },
    shown(pathname) {
      watched =
        arrival?.pathname === pathname && arrival.prepared
          ? { pathname, until: Date.now() + ARRIVAL_WATCH_MS }
          : null
      arrival = null
    },
    ahead(href) {
      const current = member
      if (!current) return
      const url = new URL(href, window.location.origin)
      // La page affichée : rien à lire d'avance (et son éditeur garde sa propre lecture).
      if (url.pathname === window.location.pathname) return
      const found = pageOf(url.pathname)
      if (!found) return
      const key = url.pathname + url.search
      const last = aheadAt.get(key)
      if (last !== undefined && Date.now() - last < AHEAD_AGAIN_MS) return
      aheadAt.set(key, Date.now())
      void found.page.code().catch(() => undefined)
      void found.page.prepare?.({
        queryClient,
        member: current,
        params: found.params,
        search: url.searchParams,
      })
    },
  }
}

let shared: Preparation | null = null

/**
 * Démarre la préparation de l'admin (une seule, comme la mémoire des données : main.tsx, et
 * chaque admin des tests). Les loaders et les composants la retrouvent par getPreparation.
 */
export function startPreparation(
  ...args: Parameters<typeof createPreparation>
): Preparation {
  shared = createPreparation(...args)
  return shared
}

/** La préparation démarrée (null avant startPreparation). */
export function getPreparation(): Preparation | null {
  return shared
}

/** Le loader d'une page : elle est préparée avant d'être montrée. */
export function pageLoader(prepare: Prepare | null) {
  return async ({ params, url }: LoaderFunctionArgs) => {
    await shared?.arrive(prepare, params, url)
    return null
  }
}

/**
 * Une page n'est préparée qu'en y arrivant : changer sa recherche, ses filtres ou son onglet ne la
 * prépare pas de nouveau (elle relit elle-même, sans attendre).
 */
export function preparedOnArrival({
  currentUrl,
  nextUrl,
}: ShouldRevalidateFunctionArgs): boolean {
  return currentUrl.pathname !== nextUrl.pathname
}

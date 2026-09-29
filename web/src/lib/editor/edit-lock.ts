// Verrou « un seul membre à la fois sur un brouillon », sans React
// (docs/ARCHITECTURE-CONTENUS.md, § 1.10 et § 3.3). La base tranche toujours ; ici, on suit
// son état pour l'afficher :
// - on prend le verrou en ouvrant l'éditeur (lock_take) ;
// - signe de vie toutes les 20 s, et aussitôt qu'on revient sur l'onglet ;
// - un onglet caché plus de 30 minutes relâche le verrou ; au retour, on tente de le reprendre ;
// - Realtime (edit_locks) montre aussitôt qui écrit et chaque enregistrement ; sans Realtime,
//   lock_status toutes les 30 s ; et lock_status juste après l'abonnement (un changement peut
//   manquer au premier abonnement) ;
// - le verrou est tenu par un membre ET par une ouverture de l'éditeur (session) : un autre
//   onglet du même membre qui prend la main fait passer celui-ci en lecture seule.
// Tant qu'on tient la main, personne d'autre ne peut écrire : la révision vue par Realtime ou
// par lock_status est alors la nôtre (parfois avant la réponse de save_draft) et n'est pas
// suivie. Seule la prise de main (lock_take) donne la révision de départ.

import type {
  ChannelState,
  ContentError,
  LockChange,
  LockRow,
} from "@/lib/contents/api"

export type LockPhase =
  | "taking" // lock_take en cours
  | "mine" // on tient le verrou : on écrit
  | "readonly" // quelqu'un d'autre écrit
  | "free" // personne n'écrit : on peut prendre la main
  | "released" // onglet caché plus de 30 minutes : verrou relâché
  | "error" // contenu introuvable, dans la corbeille, ou état illisible

export type LockState = {
  phase: LockPhase
  holderId: string | null
  holderName: string | null
  // Révision du brouillon d'après le verrou (suivie en direct par Realtime).
  draftRev: number | null
  // Vrai si on a perdu la main sans l'avoir voulu (quelqu'un l'a reprise).
  lost: boolean
  error: ContentError | null
  // Heure (ms) du signe de vie de notre prise de main : un changement plus ancien, livré en
  // retard par Realtime (création du contenu, relâche d'avant), ne nous retire pas la main.
  mineSince: number | null
}

const LOCK_TTL_MS = 90_000
const HEARTBEAT_MS = 20_000
const POLL_MS = 30_000
const HIDDEN_RELEASE_MS = 30 * 60 * 1000

export const initialLockState: LockState = {
  phase: "taking",
  holderId: null,
  holderName: null,
  draftRev: null,
  lost: false,
  error: null,
  mineSince: null,
}

type LockEvent =
  | { type: "taking" }
  // source : la réponse d'une prise de main (lock_take) ou d'une relecture (lock_status).
  | { type: "row"; row: LockRow; source: "take" | "status" }
  | {
      type: "change"
      change: LockChange
      myId: string
      mySession: string
      now: number
    }
  | { type: "lost" }
  | { type: "released" }
  | { type: "error"; error: ContentError }

/** La machine d'états du verrou : ce que devient l'état après chaque événement. */
export function lockReducer(state: LockState, event: LockEvent): LockState {
  const wasMine = state.phase === "mine"
  switch (event.type) {
    case "taking":
      return { ...state, phase: "taking", error: null }
    case "row": {
      const { row } = event
      // Relâché volontairement (onglet caché) : on reste ainsi jusqu'au retour sur l'onglet,
      // qui tente de reprendre la main.
      if (state.phase === "released" && !row.mine) {
        return { ...state, draftRev: row.draft_rev }
      }
      if (row.mine) {
        // Déjà à nous : une relecture ne change pas la révision de départ (celle qu'elle lit
        // vient de nos propres enregistrements, peut-être avant leur réponse).
        const keep = event.source === "status" && wasMine
        const takenAt = row.heartbeat_at ? Date.parse(row.heartbeat_at) : NaN
        return {
          phase: "mine",
          holderId: row.holder_id,
          holderName: row.holder_name,
          draftRev:
            keep && state.draftRev !== null ? state.draftRev : row.draft_rev,
          lost: false,
          error: null,
          mineSince:
            keep && state.mineSince !== null
              ? state.mineSince
              : Number.isNaN(takenAt)
                ? null
                : takenAt,
        }
      }
      return {
        phase: row.is_active ? "readonly" : "free",
        holderId: row.is_active ? row.holder_id : null,
        holderName: row.is_active ? row.holder_name : null,
        draftRev: row.draft_rev,
        lost: state.lost || wasMine,
        error: null,
        mineSince: null,
      }
    }
    case "change": {
      const { change, myId, mySession, now } = event
      if (change.holder_id === myId && change.holder_session === mySession) {
        // Notre propre prise, signe de vie ou enregistrement : rien ne change (la révision
        // est la nôtre, et la réponse de save_draft la donnera).
        return state
      }
      // Un changement d'avant notre prise de main, livré en retard (Realtime peut envoyer au
      // nouvel abonné ce qui s'est passé juste avant son abonnement) : sans effet.
      if (
        wasMine &&
        state.mineSince !== null &&
        Date.parse(change.heartbeat_at) < state.mineSince
      ) {
        return state
      }
      // Quelqu'un d'autre (ou nous, dans un autre onglet).
      const draftRev = Math.max(state.draftRev ?? 0, change.draft_rev)
      const active =
        change.holder_id !== null &&
        now - new Date(change.heartbeat_at).getTime() < LOCK_TTL_MS
      if (state.phase === "released" || state.phase === "taking") {
        return { ...state, draftRev }
      }
      if (!active) {
        return {
          ...state,
          phase: "free",
          holderId: null,
          holderName: null,
          draftRev,
          lost: state.lost || wasMine,
        }
      }
      const sameHolder = change.holder_id === state.holderId
      return {
        ...state,
        phase: "readonly",
        holderId: change.holder_id,
        // Realtime ne donne pas le nom : il sera relu par lock_status.
        holderName: sameHolder ? state.holderName : null,
        draftRev,
        lost: state.lost || wasMine,
      }
    }
    case "lost":
      if (!wasMine) return state
      return {
        ...state,
        phase: "readonly",
        holderId: null,
        holderName: null,
        lost: true,
      }
    case "released":
      return { ...state, phase: "released", holderId: null, holderName: null }
    case "error":
      return { ...state, phase: "error", error: event.error }
  }
}

/** Les appels à la base et à Realtime, remplaçables dans les tests. */
export type LockApi = {
  take: (force: boolean) => Promise<LockRow>
  status: () => Promise<LockRow>
  heartbeat: () => Promise<boolean>
  release: () => Promise<boolean>
  subscribe: (
    onChange: (change: LockChange) => void,
    onState: (state: ChannelState) => void
  ) => () => void
}

type EditLockOptions = {
  api: LockApi
  myId: string
  // L'ouverture de l'éditeur (la même que celle passée à l'api).
  session: string
  // Appelé avant de relâcher le verrou (onglet caché 30 minutes) : finir l'enregistrement.
  beforeRelease?: () => Promise<void>
  heartbeatMs?: number
  pollMs?: number
  hiddenReleaseMs?: number
}

type Timer = ReturnType<typeof setTimeout>

export class EditLockController {
  private readonly api: LockApi
  private readonly myId: string
  private readonly session: string
  private beforeRelease?: () => Promise<void>
  private readonly heartbeatMs: number
  private readonly pollMs: number
  private readonly hiddenReleaseMs: number
  private current: LockState = initialLockState
  private readonly listeners = new Set<() => void>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private hiddenTimer: Timer | null = null
  private unsubscribe: (() => void) | null = null
  private channel: ChannelState | null = null
  private stopped = false
  // Prise de main en cours, et nombre de prises lancées. Une relecture (lock_status) lancée
  // pendant une prise peut lire l'état d'AVANT la prise : elle attend la fin de la prise, et
  // sa réponse est ignorée si une prise a été lancée entre-temps (celle-ci est plus récente).
  private taking: Promise<void> | null = null
  private takes = 0

  constructor(options: EditLockOptions) {
    this.api = options.api
    this.myId = options.myId
    this.session = options.session
    this.beforeRelease = options.beforeRelease
    this.heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS
    this.pollMs = options.pollMs ?? POLL_MS
    this.hiddenReleaseMs = options.hiddenReleaseMs ?? HIDDEN_RELEASE_MS
  }

  get state(): LockState {
    return this.current
  }

  /** Ce qu'il faut faire avant de relâcher le verrou (terminer l'enregistrement). */
  setBeforeRelease(beforeRelease: () => Promise<void>) {
    this.beforeRelease = beforeRelease
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): LockState => this.current

  private dispatch(event: LockEvent) {
    if (this.stopped) return
    const next = lockReducer(this.current, event)
    if (next === this.current) return
    this.current = next
    for (const listener of this.listeners) listener()
    // Quelqu'un d'autre écrit, mais on ne sait pas encore qui : on relit son nom.
    if (next.phase === "readonly" && next.holderName === null) {
      void this.refresh()
    }
  }

  /**
   * Ouvre l'éditeur : prend le verrou, écoute Realtime, démarre les minuteries. after : la
   * fermeture d'un éditeur précédent du même contenu dans cet onglet (enregistrement en attente,
   * puis lock_release), à laisser finir avant de prendre la main.
   */
  start(after?: Promise<void>) {
    this.stopped = false
    this.unsubscribe = this.api.subscribe(
      (change) =>
        this.dispatch({
          type: "change",
          change,
          myId: this.myId,
          mySession: this.session,
          now: Date.now(),
        }),
      (state) => {
        const wasLive = this.channel === "SUBSCRIBED"
        this.channel = state
        // Juste après l'abonnement : relire, un changement a pu manquer.
        if (state === "SUBSCRIBED" && !wasLive) void this.refresh()
      }
    )
    this.heartbeatTimer = setInterval(() => void this.beat(), this.heartbeatMs)
    this.pollTimer = setInterval(() => {
      if (this.channel !== "SUBSCRIBED") void this.refresh()
    }, this.pollMs)
    void this.take(false, after)
  }

  /** Prend la main ; force : « Reprendre la main » (après confirmation). */
  async take(force: boolean, after?: Promise<void>) {
    this.takes += 1
    const run = this.runTake(force, after)
    this.taking = run
    try {
      await run
    } finally {
      if (this.taking === run) this.taking = null
    }
  }

  private async runTake(force: boolean, after?: Promise<void>) {
    if (this.current.phase !== "mine") this.dispatch({ type: "taking" })
    if (after) {
      await after.catch(() => undefined)
      if (this.stopped) return
    }
    try {
      const row = await this.api.take(force)
      // L'éditeur a été fermé pendant la demande : on rend aussitôt la main.
      if (this.stopped) {
        if (row.mine) await this.api.release().catch(() => false)
        return
      }
      this.dispatch({ type: "row", row, source: "take" })
    } catch (error) {
      this.dispatch({ type: "error", error: error as ContentError })
    }
  }

  /** Relit l'état du verrou (lock_status), après la prise de main en cours s'il y en a une. */
  async refresh() {
    while (this.taking) await this.taking
    const takes = this.takes
    try {
      const row = await this.api.status()
      if (takes !== this.takes) return
      this.dispatch({ type: "row", row, source: "status" })
    } catch {
      // Réseau coupé : on réessaiera au prochain passage.
    }
  }

  /** Signe de vie ; s'il échoue parce qu'on n'a plus la main, on passe en lecture seule. */
  async beat() {
    if (this.current.phase !== "mine") return
    try {
      const held = await this.api.heartbeat()
      if (!held) this.dispatch({ type: "lost" })
    } catch {
      // Réseau coupé : le verrou tient encore 90 s, on réessaiera.
    }
  }

  /** L'enregistrement a répondu « verrou_perdu ». */
  notifyLost() {
    this.dispatch({ type: "lost" })
  }

  /** L'onglet est caché (hidden vrai) ou de nouveau visible. */
  setHidden(hidden: boolean) {
    if (hidden) {
      if (this.hiddenTimer) clearTimeout(this.hiddenTimer)
      this.hiddenTimer = setTimeout(() => {
        this.hiddenTimer = null
        void this.releaseWhileHidden()
      }, this.hiddenReleaseMs)
      return
    }
    if (this.hiddenTimer) {
      clearTimeout(this.hiddenTimer)
      this.hiddenTimer = null
    }
    if (this.current.phase === "released") {
      void this.take(false)
    } else if (this.current.phase === "mine") {
      void this.beat()
    } else {
      void this.refresh()
    }
  }

  private async releaseWhileHidden() {
    if (this.current.phase !== "mine") return
    try {
      await this.beforeRelease?.()
    } catch {
      // Ce qui n'est pas enregistré reste à l'écran.
    }
    if (this.current.phase !== "mine") return
    try {
      await this.api.release()
    } catch {
      // Le verrou expirera de lui-même au bout de 90 s.
    }
    this.dispatch({ type: "released" })
  }

  /** Ferme l'éditeur après avoir terminé l'enregistrement en attente (beforeRelease). */
  async finishThenStop(): Promise<void> {
    if (this.current.phase === "mine") {
      try {
        await this.beforeRelease?.()
      } catch {
        // Ce qui n'est pas enregistré est perdu : le navigateur a prévenu avant de quitter.
      }
    }
    await this.stop()
  }

  /** Ferme l'éditeur : plus d'écoute ni de minuterie, et on relâche le verrou s'il est à nous. */
  async stop(): Promise<void> {
    const wasMine = this.current.phase === "mine"
    this.stopped = true
    this.unsubscribe?.()
    this.unsubscribe = null
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.pollTimer) clearInterval(this.pollTimer)
    if (this.hiddenTimer) clearTimeout(this.hiddenTimer)
    this.heartbeatTimer = null
    this.pollTimer = null
    this.hiddenTimer = null
    if (wasMine) {
      try {
        await this.api.release()
      } catch {
        // Le verrou expirera de lui-même au bout de 90 s.
      }
    }
  }
}

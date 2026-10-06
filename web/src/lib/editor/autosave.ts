// Enregistrement automatique, sans React (docs/ARCHITECTURE-CONTENUS.md, § 3.3) :
// - 1,5 s après la dernière modification, et au plus tard 10 s après la première modification
//   pas encore enregistrée (on enregistre même si l'on écrit sans s'arrêter) ;
// - une seule requête à la fois : une modification faite pendant l'envoi attend son tour ;
// - hors ligne (ou serveur indisponible) : nouvel essai de plus en plus espacé, et tout de suite
//   quand le navigateur revient en ligne. La base a pu enregistrer l'envoi sans que la réponse
//   arrive : le nouvel essai renvoie d'abord LA MÊME valeur sur la même révision (save_draft
//   reconnaît ce rejeu et renvoie la révision déjà enregistrée), puis la plus récente ;
// - verrou perdu, révision dépassée, contenu supprimé : on s'arrête, sans rien perdre de ce qui
//   est à l'écran (« Copier mon texte ») ;
// - éditeur fermé (close) : un dernier envoi, sans nouvel essai ensuite ; s'il échoue, la valeur
//   est confiée à onUnsavedAtClose (« Copier mon texte » dans un message).

import { ContentError, type SavedDraft } from "@/lib/contents/api"
import { reportError } from "@/lib/sentry"

export type AutosaveStatus =
  | "saved" // tout est enregistré
  | "pending" // une modification attend son enregistrement
  | "saving" // une requête est en cours
  | "offline" // l'envoi a échoué (réseau, serveur) : nouvel essai prévu
  | "failed" // refusé par la base ou le validateur : pas de nouvel essai avant la prochaine modification
  | "stopped" // plus aucun enregistrement possible (verrou perdu, conflit, corbeille)

export type AutosaveState = {
  status: AutosaveStatus
  rev: number
  savedAt: string | null
  // Une modification n'est pas encore enregistrée (ou est en cours d'envoi).
  unsaved: boolean
  error: ContentError | null
}

type AutosaveOptions<T> = {
  save: (value: T, baseRev: number) => Promise<SavedDraft>
  rev: number
  savedAt: string | null
  debounceMs?: number
  maxWaitMs?: number
  // Attentes entre deux essais hors ligne ; la dernière se répète.
  retryDelaysMs?: number[]
  onSaved?: (result: SavedDraft, value: T) => void
  onStopped?: (error: ContentError) => void
  // L'éditeur s'est fermé sans que la dernière valeur soit enregistrée.
  onUnsavedAtClose?: (value: T) => void
}

type Handlers<T> = Pick<
  AutosaveOptions<T>,
  "onSaved" | "onStopped" | "onUnsavedAtClose"
>

const AUTOSAVE_DEBOUNCE_MS = 1500
const AUTOSAVE_MAX_WAIT_MS = 10_000
const AUTOSAVE_RETRY_DELAYS_MS = [2000, 4000, 8000, 15_000, 30_000]

// Erreurs après lesquelles plus aucun enregistrement n'a de sens.
const STOPPING_CODES = new Set([
  "verrou_perdu",
  "conflit_revision",
  "dans_la_corbeille",
  "contenu_introuvable",
  "reserve_a_l_equipe",
])

type Timer = ReturnType<typeof setTimeout>

/** Une requête qui n'a pas pu partir (fetch rejette alors une TypeError, selon le navigateur). */
function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /fetch|network|load failed/i.test(error.message)
  )
}

export class AutosaveController<T> {
  private readonly options: Required<
    Omit<AutosaveOptions<T>, keyof Handlers<T>>
  > &
    Handlers<T>
  private latest: T | null = null
  private dirty = false
  private firstChangeAt: number | null = null
  private timer: Timer | null = null
  private retryTimer: Timer | null = null
  private attempt = 0
  private inFlight: Promise<void> | null = null
  private dueWhileSaving = false
  // Envoi resté sans réponse (réseau, serveur) : peut-être enregistré. Il repart tel quel.
  private uncertain: { value: T; baseRev: number } | null = null
  // L'éditeur est fermé : plus de nouvel essai programmé (voir close).
  private closed = false
  private readonly listeners = new Set<() => void>()
  private current: AutosaveState

  constructor(options: AutosaveOptions<T>) {
    this.options = {
      debounceMs: AUTOSAVE_DEBOUNCE_MS,
      maxWaitMs: AUTOSAVE_MAX_WAIT_MS,
      retryDelaysMs: AUTOSAVE_RETRY_DELAYS_MS,
      ...options,
    }
    this.current = {
      status: "saved",
      rev: options.rev,
      savedAt: options.savedAt,
      unsaved: false,
      error: null,
    }
  }

  get state(): AutosaveState {
    return this.current
  }

  /** La dernière valeur pas encore enregistrée (null si tout est enregistré). */
  get unsavedValue(): T | null {
    return this.dirty || this.inFlight ? this.latest : null
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): AutosaveState => this.current

  private update(changes: Partial<AutosaveState>) {
    const next: AutosaveState = {
      ...this.current,
      ...changes,
      unsaved: this.dirty || this.inFlight !== null,
    }
    // Rien n'a changé (une frappe de plus pendant l'attente) : personne n'est prévenu, rien n'est
    // redessiné.
    const keys = Object.keys(next) as (keyof AutosaveState)[]
    if (keys.every((key) => next[key] === this.current[key])) return
    this.current = next
    for (const listener of this.listeners) listener()
  }

  /**
   * Rappels après un enregistrement réussi, quand l'enregistrement s'arrête, ou quand l'éditeur
   * se ferme sans avoir pu enregistrer.
   */
  setHandlers(handlers: Handlers<T>) {
    this.options.onSaved = handlers.onSaved
    this.options.onStopped = handlers.onStopped
    this.options.onUnsavedAtClose = handlers.onUnsavedAtClose
  }

  /** Une modification : elle sera enregistrée 1,5 s après la dernière (10 s au plus). */
  change(value: T) {
    if (this.current.status === "stopped") return
    this.latest = value
    this.dirty = true
    this.firstChangeAt ??= Date.now()
    if (this.current.status === "offline") {
      // Le prochain essai enverra la dernière version.
      this.update({})
      return
    }
    this.update({
      status: this.inFlight ? "saving" : "pending",
      error: null,
    })
    this.schedule()
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer)
    const sinceFirst = Date.now() - (this.firstChangeAt ?? Date.now())
    const wait = Math.max(
      0,
      Math.min(this.options.debounceMs, this.options.maxWaitMs - sinceFirst)
    )
    this.timer = setTimeout(() => {
      this.timer = null
      void this.run()
    }, wait)
  }

  private run(): Promise<void> {
    if (!this.dirty || this.current.status === "stopped") {
      return this.inFlight ?? Promise.resolve()
    }
    if (this.inFlight) {
      // Une seule requête à la fois : celle-ci partira dès que l'autre sera finie.
      this.dueWhileSaving = true
      return this.inFlight
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    const baseRev = this.current.rev
    // Après un envoi resté sans réponse : on le rejoue tel quel, puis la valeur la plus récente
    // part aussitôt après (si elle est différente).
    const replay =
      this.uncertain?.baseRev === baseRev ? this.uncertain.value : null
    const value = replay ?? (this.latest as T)
    this.dirty = replay !== null && this.latest !== replay
    if (this.dirty) this.dueWhileSaving = true
    else this.firstChangeAt = null
    const request = this.send(value, baseRev)
    this.inFlight = request
    this.update({ status: "saving", error: null })
    return request
  }

  private async send(value: T, baseRev: number): Promise<void> {
    let error: ContentError | null = null
    let result: SavedDraft | null = null
    try {
      result = await this.options.save(value, baseRev)
    } catch (caught) {
      // Le réseau qui lâche (fetch) : hors ligne, nouvel essai. Une autre erreur est un défaut
      // de l'admin : « Non enregistré », sans nouvel essai avant la prochaine modification, et
      // l'équipe est prévenue. De même pour une erreur que la base n'explique pas, ou un
      // brouillon que notre validateur refuse.
      error =
        caught instanceof ContentError
          ? caught
          : new ContentError(null, { retryable: isNetworkFailure(caught) })
      if (
        !error.retryable &&
        (error.code === null || error.code === "forme_invalide")
      ) {
        reportError(caught)
      }
    }
    this.inFlight = null

    if (result) {
      this.attempt = 0
      this.uncertain = null
      this.update({
        status: this.dirty ? "pending" : "saved",
        rev: result.rev,
        savedAt: result.savedAt,
        error: null,
      })
      this.options.onSaved?.(result, value)
      if (this.dirty && this.dueWhileSaving) {
        this.dueWhileSaving = false
        void this.run()
      }
      return
    }

    // Rien n'est perdu : la valeur envoyée (ou une plus récente) reste à enregistrer.
    this.dirty = true
    this.firstChangeAt ??= Date.now()
    this.dueWhileSaving = false
    if (!error) return
    // Sans réponse de la base, l'envoi a peut-être été enregistré : on le rejouera tel quel.
    this.uncertain = error.retryable ? { value, baseRev } : null
    if (error.code && STOPPING_CODES.has(error.code)) {
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      this.update({ status: "stopped", error })
      this.options.onStopped?.(error)
    } else if (error.retryable && this.closed) {
      // Éditeur fermé : pas de nouvel essai (flush prévient de ce qui n'est pas enregistré).
      this.update({ status: "offline", error })
    } else if (error.retryable) {
      const delays = this.options.retryDelaysMs
      const delay = delays[Math.min(this.attempt, delays.length - 1)]
      this.attempt += 1
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null
        void this.run()
      }, delay)
      this.update({ status: "offline", error })
    } else {
      // Refus (forme, taille…) : on attend la prochaine modification pour réessayer.
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      this.update({ status: "failed", error })
    }
  }

  /** Enregistre tout de suite ce qui attend (en quittant l'éditeur). */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
    if (
      this.dirty &&
      this.current.status !== "stopped" &&
      this.current.status !== "failed"
    ) {
      await this.run()
    }
    if (this.closed && this.dirty && this.latest !== null) {
      this.clearTimers()
      this.options.onUnsavedAtClose?.(this.latest)
    }
  }

  /**
   * L'éditeur se ferme : plus aucun envoi programmé. Le dernier envoi part par flush (en rendant
   * le verrou) ; s'il échoue, il n'est pas réessayé, et onUnsavedAtClose reçoit la valeur.
   */
  close() {
    this.closed = true
    this.clearTimers()
  }

  /** L'éditeur se rouvre avec ce même enregistrement (React, en développement, monte deux fois). */
  reopen() {
    this.closed = false
  }

  /** Le navigateur est de nouveau en ligne : on réessaie sans attendre. */
  retryNow() {
    if (this.current.status === "offline") void this.run()
  }

  /** Plus aucun enregistrement (verrou perdu ailleurs) ; ce qui est à l'écran reste. */
  stop(error: ContentError = new ContentError("verrou_perdu")) {
    if (this.current.status === "stopped") return
    this.clearTimers()
    this.update({ status: "stopped", error })
  }

  /** Repart d'un brouillon relu dans la base (lecture seule, reprise de la main). */
  reset(rev: number, savedAt: string | null) {
    this.clearTimers()
    this.latest = null
    this.dirty = false
    this.firstChangeAt = null
    this.attempt = 0
    this.dueWhileSaving = false
    this.uncertain = null
    this.update({ status: "saved", rev, savedAt, error: null })
  }

  private clearTimers() {
    if (this.timer) clearTimeout(this.timer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.timer = null
    this.retryTimer = null
  }
}

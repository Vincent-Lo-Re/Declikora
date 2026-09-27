// File d'attente des envois : deux à la fois, avec progression, annulation et « Réessayer ».
// Elle vit en dehors des pages : un envoi continue si on change de section.

import { discardUpload } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import { TransferError } from "@/lib/media/transfer"
import {
  describeUploadError,
  runUpload,
  type UploadItem,
  type UploadJob,
  type UploadRunner,
} from "@/lib/media/upload"

type Listener = () => void

type Entry = {
  item: UploadItem
  job: UploadJob
  controller: AbortController | null
}

export type UploadQueueOptions = {
  runner?: UploadRunner
  concurrency?: number
  // Abandon d'une ligne « pending » (envoi annulé ou retiré après un échec).
  discard?: (mediaId: string) => Promise<void>
}

let nextId = 0

export class UploadQueue {
  private entries: Entry[] = []
  private snapshot: UploadItem[] = []
  private listeners = new Set<Listener>()
  private settledListeners = new Set<(item: UploadItem) => void>()
  private readonly runner: UploadRunner
  private readonly concurrency: number
  private readonly discard: (mediaId: string) => Promise<void>

  constructor({
    runner = runUpload,
    concurrency = 2,
    discard = discardUpload,
  }: UploadQueueOptions = {}) {
    this.runner = runner
    this.concurrency = concurrency
    this.discard = discard
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.snapshot

  /** Appelé à la fin de chaque envoi (réussi ou non) : pour relire la médiathèque. */
  onSettled(listener: (item: UploadItem) => void) {
    this.settledListeners.add(listener)
    return () => {
      this.settledListeners.delete(listener)
    }
  }

  /** Vrai tant qu'un envoi attend ou tourne. */
  get busy(): boolean {
    return this.entries.some((entry) => isActive(entry.item))
  }

  /** Ajoute des fichiers à la file et renvoie l'identifiant de chaque envoi. */
  add(files: File[]): string[] {
    const ids: string[] = []
    for (const file of files) {
      nextId += 1
      ids.push(`envoi-${nextId}`)
      this.entries.push({
        item: {
          id: `envoi-${nextId}`,
          fileName: file.name.normalize("NFC"),
          size: null,
          stage: "waiting",
          progress: null,
          resumable: false,
          warnings: [],
          error: null,
          canRetry: false,
          result: null,
        },
        job: { file, prepared: null, media: null },
        controller: null,
      })
    }
    this.emit()
    this.pump()
    return ids
  }

  cancel(id: string) {
    const entry = this.find(id)
    if (!entry || !isCancellable(entry.item)) return
    entry.controller?.abort()
    this.update(entry, { stage: "cancelled", progress: null })
    this.abandon(entry)
    this.pump()
  }

  retry(id: string) {
    const entry = this.find(id)
    if (!entry || entry.item.stage !== "error" || !entry.item.canRetry) return
    this.update(entry, { stage: "waiting", error: null, canRetry: false })
    this.pump()
  }

  /** Retire un envoi terminé de la liste (et abandonne sa ligne s'il a échoué). */
  dismiss(id: string) {
    const entry = this.find(id)
    if (!entry || isActive(entry.item)) return
    if (entry.item.stage === "error") this.abandon(entry)
    this.entries = this.entries.filter((other) => other !== entry)
    this.emit()
  }

  /** Retire tous les envois terminés. */
  clearFinished() {
    for (const entry of this.entries) {
      if (!isActive(entry.item)) this.dismiss(entry.item.id)
    }
  }

  /**
   * Retire les envois réussis et annulés, et garde ceux en échec : en revenant à la
   * Médiathèque, on ne retrouve que ce qui tourne encore ou ce qui attend une action.
   */
  clearSettled() {
    const settled = this.entries.filter(
      (entry) => entry.item.stage === "done" || entry.item.stage === "cancelled"
    )
    if (settled.length === 0) return
    this.entries = this.entries.filter((entry) => !settled.includes(entry))
    this.emit()
  }

  private find(id: string) {
    return this.entries.find((entry) => entry.item.id === id)
  }

  // Une ligne créée mais jamais confirmée : on la fait effacer.
  private abandon(entry: Entry) {
    const media = entry.job.media
    if (media && media.status === "pending") {
      entry.job.media = null
      void this.discard(media.id)
    }
  }

  private pump() {
    const running = this.entries.filter((entry) => entry.controller !== null)
    let free = this.concurrency - running.length
    for (const entry of this.entries) {
      if (free <= 0) break
      if (entry.item.stage === "waiting" && entry.controller === null) {
        free -= 1
        void this.start(entry)
      }
    }
  }

  private async start(entry: Entry) {
    const controller = new AbortController()
    entry.controller = controller
    let result: Media | null = null
    let failure: unknown = null
    try {
      result = await this.runner(entry.job, {
        signal: controller.signal,
        update: (changes) => {
          if (!controller.signal.aborted) this.update(entry, changes)
        },
      })
    } catch (error) {
      failure = error
    }
    entry.controller = null
    if (controller.signal.aborted) {
      // Annulé pendant l'envoi : la ligne a pu être créée après l'annulation.
      this.abandon(entry)
    } else if (failure === null) {
      this.update(entry, { stage: "done", progress: 1, result })
    } else if (failure instanceof TransferError && failure.code === "annule") {
      this.update(entry, { stage: "cancelled", progress: null })
      this.abandon(entry)
    } else {
      const { message, canRetry } = describeUploadError(failure)
      this.update(entry, {
        stage: "error",
        progress: null,
        error: message,
        canRetry,
      })
    }
    for (const listener of this.settledListeners) listener(entry.item)
    this.pump()
  }

  private update(entry: Entry, changes: Partial<UploadItem>) {
    entry.item = { ...entry.item, ...changes }
    this.emit()
  }

  private emit() {
    this.snapshot = this.entries.map((entry) => entry.item)
    for (const listener of this.listeners) listener()
  }
}

/** Vrai tant qu'on peut annuler : ensuite, le fichier est déjà arrivé et s'enregistre. */
export function isCancellable(item: UploadItem): boolean {
  return (
    item.stage === "waiting" ||
    item.stage === "preparing" ||
    item.stage === "sending"
  )
}

export function isActive(item: UploadItem): boolean {
  return (
    item.stage === "waiting" ||
    item.stage === "preparing" ||
    item.stage === "sending" ||
    item.stage === "confirming"
  )
}

let sharedQueue: UploadQueue | null = null

/** La file d'envoi de l'admin (une seule, créée à la première utilisation). */
export function getUploadQueue(): UploadQueue {
  sharedQueue ??= new UploadQueue()
  return sharedQueue
}

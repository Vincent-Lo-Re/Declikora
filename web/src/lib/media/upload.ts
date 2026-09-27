// Envoi d'un fichier de bout en bout (§ 4.2) : préparation dans le navigateur, ligne « pending »
// (media_create, qui donne le chemin exact), envoi dans le bucket protégé, confirmation
// (media_confirm), puis appel de la fonction « files » pour un SVG ou un Lottie à vérifier.

import {
  confirmMedia,
  createMedia,
  kickFiles,
  MediaError,
} from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"
import {
  prepareFile,
  PrepareError,
  type PreparedFile,
  type PrepareWarning,
} from "@/lib/media/prepare"
import {
  sendFile,
  shouldUseResumable,
  TransferError,
} from "@/lib/media/transfer"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

/** La base a refusé le fichier reçu (media_confirm), avec la raison. */
export class RejectedError extends Error {
  readonly reason: string

  constructor(reason: string) {
    super(reason)
    this.name = "RejectedError"
    this.reason = reason
  }
}

export type UploadStage =
  | "waiting"
  | "preparing"
  | "sending"
  | "confirming"
  | "done"
  | "error"
  | "cancelled"

/** Ce que l'interface affiche d'un envoi. */
export type UploadItem = {
  id: string
  fileName: string
  // Taille envoyée (après réduction), connue une fois le fichier préparé.
  size: number | null
  stage: UploadStage
  // De 0 à 1 pendant l'envoi.
  progress: number | null
  resumable: boolean
  warnings: PrepareWarning[]
  error: string | null
  canRetry: boolean
  result: Media | null
}

/** Ce que l'envoi garde en mémoire entre deux essais (fichier préparé, ligne créée). */
export type UploadJob = {
  file: File
  prepared: PreparedFile | null
  media: Media | null
}

export type UploadContext = {
  signal: AbortSignal
  update: (changes: Partial<UploadItem>) => void
}

export type UploadRunner = (
  job: UploadJob,
  context: UploadContext
) => Promise<Media>

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new TransferError("annule")
}

async function accessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new MediaError("non_connecte")
  return data.session.access_token
}

/** Envoi réel, contre Supabase. Reprend là où un essai précédent s'est arrêté. */
export const runUpload: UploadRunner = async (job, { signal, update }) => {
  if (!job.prepared) {
    update({ stage: "preparing", progress: null })
    job.prepared = await prepareFile(job.file)
  }
  const prepared = job.prepared
  update({
    size: prepared.blob.size,
    resumable: shouldUseResumable(prepared.blob.size),
    warnings: prepared.warnings,
  })
  throwIfAborted(signal)

  if (!job.media) job.media = await createMedia(prepared)
  const media = job.media
  throwIfAborted(signal)

  update({ stage: "sending", progress: 0 })
  try {
    await sendFile({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      getAccessToken: accessToken,
      path: media.path,
      blob: prepared.blob,
      signal,
      onProgress: (sent, total) =>
        update({ progress: total > 0 ? sent / total : null }),
    })
  } catch (error) {
    // Déjà arrivé lors d'un essai précédent : il ne reste qu'à confirmer.
    if (!(error instanceof TransferError && error.code === "deja_envoye")) {
      throw error
    }
  }

  update({ stage: "confirming", progress: null })
  const confirmed = await confirmMedia(media.id)
  job.media = confirmed
  if (confirmed.status === "rejected") {
    throw new RejectedError(confirmed.reject_reason ?? "fichier_incoherent")
  }
  // SVG ou Lottie : vérification tout de suite, sans attendre la tâche planifiée.
  if (confirmed.status === "checking") void kickFiles()
  return confirmed
}

// Erreurs pour lesquelles « Réessayer » a un sens (coupure, problème passager).
const retryableTransfers = new Set(["envoi_interrompu", "envoi_refuse"])
const retryableMedia = new Set(["fichier_absent", null])

/** Message à afficher pour l'échec d'un envoi, et si on peut réessayer. */
export function describeUploadError(error: unknown): {
  message: string
  canRetry: boolean
} {
  if (error instanceof PrepareError) {
    return { message: texts.media.prepareErrors[error.code], canRetry: false }
  }
  if (error instanceof TransferError) {
    return {
      message: texts.media.transferErrors[error.code],
      canRetry: retryableTransfers.has(error.code),
    }
  }
  if (error instanceof RejectedError) {
    return {
      message: texts.media.rejectedBecause(rejectReasonText(error.reason)),
      canRetry: false,
    }
  }
  if (error instanceof MediaError) {
    return { message: error.message, canRetry: retryableMedia.has(error.code) }
  }
  return { message: texts.common.unexpected, canRetry: true }
}

/** Raison d'un refus, en toutes lettres. */
export function rejectReasonText(reason: string | null): string {
  if (reason && Object.hasOwn(texts.media.rejectReasons, reason)) {
    return texts.media.rejectReasons[
      reason as keyof typeof texts.media.rejectReasons
    ]
  }
  return texts.media.rejectReasons.inconnue
}

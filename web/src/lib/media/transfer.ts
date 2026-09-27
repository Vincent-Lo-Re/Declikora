// Envoi d'un fichier préparé dans le bucket protégé, au chemin EXACT donné par media_create.
//
// - Jusqu'à 6 Mo : envoi standard. On passe par XMLHttpRequest, et non par storage-js, pour
//   avoir la progression et l'annulation ; c'est la même requête que celle de storage-js pour
//   un corps binaire (POST /storage/v1/object/<bucket>/<chemin>, en-têtes content-type,
//   cache-control « max-age=60 » et x-upsert « false »).
// - Au-delà : envoi reprenable (TUS, tus-js-client), réglé comme le recommande Supabase
//   (morceaux de 6 Mo exactement). Une coupure réseau est reprise d'elle-même, et « Réessayer »
//   reprend là où l'envoi s'était arrêté.

import type { DetailedError } from "tus-js-client"

import {
  CACHE_CONTROL_SECONDS,
  PROTECTED_BUCKET,
  RESUMABLE_THRESHOLD_BYTES,
} from "@/lib/media/constants"

export type TransferErrorCode =
  | "annule"
  | "envoi_interrompu"
  | "fichier_trop_lourd"
  | "type_refuse"
  | "envoi_refuse"
  | "deja_envoye"

/** Échec d'un envoi, avec sa raison (traduite par texts.ts). */
export class TransferError extends Error {
  readonly code: TransferErrorCode

  constructor(code: TransferErrorCode) {
    super(code)
    this.name = "TransferError"
    this.code = code
  }
}

/** Vrai si le fichier part par l'envoi reprenable (plus de 6 Mo). */
export function shouldUseResumable(size: number): boolean {
  return size > RESUMABLE_THRESHOLD_BYTES
}

/**
 * Adresse de l'envoi reprenable. En ligne, Supabase recommande le nom d'hôte direct du
 * stockage (https://<réf>.storage.supabase.co) ; en local, la passerelle habituelle.
 */
export function resumableEndpoint(supabaseUrl: string): string {
  const url = new URL(supabaseUrl)
  const hosted = /^([a-z0-9]+)\.supabase\.co$/.exec(url.hostname)
  if (hosted) {
    return `https://${hosted[1]}.storage.supabase.co/storage/v1/upload/resumable`
  }
  return `${url.origin}/storage/v1/upload/resumable`
}

/** Raison d'un refus de Storage, d'après le code HTTP. */
export function transferErrorFromStatus(status: number): TransferError {
  if (status === 413) return new TransferError("fichier_trop_lourd")
  if (status === 415) return new TransferError("type_refuse")
  if (status === 409) return new TransferError("deja_envoye")
  if (status === 0 || status >= 500)
    return new TransferError("envoi_interrompu")
  return new TransferError("envoi_refuse")
}

export type TransferRequest = {
  supabaseUrl: string
  publishableKey: string
  // Jeton de la session, relu avant chaque requête (un long envoi peut dépasser son expiration).
  getAccessToken: () => Promise<string>
  path: string
  blob: Blob
  onProgress: (sent: number, total: number) => void
  signal: AbortSignal
}

function abortError() {
  return new TransferError("annule")
}

/** Envoi standard (jusqu'à 6 Mo). */
async function sendStandard(request: TransferRequest): Promise<void> {
  const { supabaseUrl, publishableKey, path, blob, onProgress, signal } =
    request
  if (signal.aborted) throw abortError()
  const token = await request.getAccessToken()

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(
      "POST",
      `${supabaseUrl}/storage/v1/object/${PROTECTED_BUCKET}/${path}`
    )
    xhr.setRequestHeader("authorization", `Bearer ${token}`)
    xhr.setRequestHeader("apikey", publishableKey)
    xhr.setRequestHeader("content-type", blob.type)
    xhr.setRequestHeader("cache-control", `max-age=${CACHE_CONTROL_SECONDS}`)
    xhr.setRequestHeader("x-upsert", "false")
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total)
    }
    const onAbort = () => xhr.abort()
    signal.addEventListener("abort", onAbort, { once: true })
    const finish = (error?: TransferError) => {
      signal.removeEventListener("abort", onAbort)
      if (error) reject(error)
      else resolve()
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(blob.size, blob.size)
        finish()
      } else {
        finish(transferErrorFromStatus(storageStatus(xhr)))
      }
    }
    xhr.onerror = () => finish(new TransferError("envoi_interrompu"))
    xhr.onabort = () => finish(abortError())
    xhr.send(blob)
  })
}

// Storage répond parfois 400 avec le vrai code dans le corps ({ statusCode: "409" }).
function storageStatus(xhr: XMLHttpRequest): number {
  try {
    const body = JSON.parse(xhr.responseText) as { statusCode?: unknown }
    const code = Number(body.statusCode)
    if (Number.isInteger(code) && code >= 400) return code
  } catch {
    // Corps illisible : on garde le code HTTP.
  }
  return xhr.status
}

/** Envoi reprenable (TUS), au-delà de 6 Mo. */
async function sendResumable(request: TransferRequest): Promise<void> {
  const { supabaseUrl, publishableKey, path, blob, onProgress, signal } =
    request
  if (signal.aborted) throw abortError()
  // Chargé seulement pour un gros fichier.
  const { Upload } = await import("tus-js-client")
  if (signal.aborted) throw abortError()

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(blob, {
      endpoint: resumableEndpoint(supabaseUrl),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { apikey: publishableKey, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      // Une empreinte par chemin : on ne reprend jamais l'envoi d'un autre fichier.
      fingerprint: async () => `declikora-envoi:${path}`,
      metadata: {
        bucketName: PROTECTED_BUCKET,
        objectName: path,
        contentType: blob.type,
        cacheControl: CACHE_CONTROL_SECONDS,
      },
      // Taille imposée par Supabase : ne pas la changer.
      chunkSize: 6 * 1024 * 1024,
      onBeforeRequest: async (req) => {
        req.setHeader(
          "authorization",
          `Bearer ${await request.getAccessToken()}`
        )
      },
      onProgress: (sent, total) => onProgress(sent, total),
      onSuccess: () => {
        signal.removeEventListener("abort", onAbort)
        resolve()
      },
      onError: (error) => {
        signal.removeEventListener("abort", onAbort)
        const status = (error as DetailedError).originalResponse?.getStatus()
        reject(
          status === undefined
            ? new TransferError("envoi_interrompu")
            : transferErrorFromStatus(status)
        )
      },
    })
    const onAbort = () => {
      // Arrête l'envoi et efface ce qui est déjà arrivé sur le serveur.
      void upload.abort(true).catch(() => {})
      reject(abortError())
    }
    signal.addEventListener("abort", onAbort, { once: true })
    void upload
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0])
        upload.start()
      })
      .catch(() => upload.start())
  })
}

/** Envoie le fichier : standard jusqu'à 6 Mo, reprenable au-delà. */
export function sendFile(request: TransferRequest): Promise<void> {
  return shouldUseResumable(request.blob.size)
    ? sendResumable(request)
    : sendStandard(request)
}

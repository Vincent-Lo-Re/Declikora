// Préparation d'un fichier dans le navigateur, avant l'envoi (§ 4.2) :
// - photos réduites à environ 300 Ko (GIF : première image ; HEIC : si le navigateur le lit) ;
// - SVG nettoyés ; Lottie vérifiés ;
// - audios avec leur type normalisé et leur durée ;
// - PDF envoyés tels quels.
// Le type rendu est toujours un type accepté par les buckets et la base.

import {
  IMAGE_MAX_SIDE,
  IMAGE_TARGET_BYTES,
  MAX_CHECKED_BYTES,
  MAX_FILE_BYTES,
  type MediaKind,
  type MediaMime,
} from "@/lib/media/constants"
import { detectFormat, readHead } from "@/lib/media/detect"
import {
  decodeImage,
  isAnimatedGif,
  reduceImage,
  type DecodedImage,
} from "@/lib/media/image"
import { checkLottie, type LottieReason } from "@/lib/media/lottie"
import type { SvgReason } from "@/lib/media/svg"

type PrepareErrorCode =
  | "type_refuse"
  | "video_refusee"
  | "fichier_vide"
  | "fichier_trop_lourd"
  | "fichier_a_verifier_trop_lourd"
  | "image_illisible"
  | "heic_illisible"
  | SvgReason
  | LottieReason

/** Un fichier que l'admin refuse avant de l'envoyer, avec la raison (traduite par texts.ts). */
export class PrepareError extends Error {
  readonly code: PrepareErrorCode

  constructor(code: PrepareErrorCode) {
    super(code)
    this.name = "PrepareError"
    this.code = code
  }
}

export type PrepareWarning =
  // GIF animé : seule la première image est gardée.
  "gif_anime"

export type PreparedFile = {
  kind: MediaKind
  // Nom d'origine (la base en tire le nom du chemin).
  name: string
  mime: MediaMime
  // Ce qui part vraiment : un Blob du type normalisé (storage-js et Storage lisent blob.type).
  blob: Blob
  width: number | null
  height: number | null
  durationS: number | null
  warnings: PrepareWarning[]
}

export type PrepareDeps = {
  decodeImage: (file: Blob) => Promise<DecodedImage>
  readAudioDuration: (blob: Blob) => Promise<number | null>
}

/** Durée d'un audio lue par le navigateur (métadonnées seulement), null s'il n'y arrive pas. */
function readAudioDuration(blob: Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    const done = (value: number | null) => {
      window.clearTimeout(timer)
      audio.removeAttribute("src")
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = window.setTimeout(() => done(null), 10_000)
    audio.preload = "metadata"
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? audio.duration : null)
    audio.onerror = () => done(null)
    audio.src = url
  })
}

const browserDeps: PrepareDeps = { decodeImage, readAudioDuration }

/**
 * Nom d'origine en Unicode composé (NFC) : macOS et Safari donnent souvent « e » suivi d'un
 * accent séparé (NFD), que la recherche « café » ne trouverait pas. La base normalise aussi.
 */
function fileName(file: File): string {
  return file.name.normalize("NFC")
}

const keptAsIs = new Set(["png", "webp"])

async function prepareImage(
  file: File,
  format: string,
  deps: PrepareDeps
): Promise<PreparedFile> {
  const warnings: PrepareWarning[] = []
  if (format === "gif") {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (isAnimatedGif(bytes)) warnings.push("gif_anime")
  }

  let image: DecodedImage
  try {
    image = await deps.decodeImage(file)
  } catch {
    throw new PrepareError(
      format === "heic" ? "heic_illisible" : "image_illisible"
    )
  }
  try {
    // PNG ou WebP déjà léger et pas trop grand : envoyé tel quel (aucune perte).
    if (
      keptAsIs.has(format) &&
      file.size <= IMAGE_TARGET_BYTES &&
      Math.max(image.width, image.height) <= IMAGE_MAX_SIDE
    ) {
      const mime = format === "png" ? "image/png" : "image/webp"
      return {
        kind: "image",
        name: fileName(file),
        mime,
        blob: new Blob([file], { type: mime }),
        width: image.width,
        height: image.height,
        durationS: null,
        warnings,
      }
    }
    const reduced = await reduceImage(image, image.encode)
    const mime =
      reduced.blob.type === "image/webp" ? "image/webp" : "image/jpeg"
    return {
      kind: "image",
      name: fileName(file),
      mime,
      blob: new Blob([reduced.blob], { type: mime }),
      width: reduced.width,
      height: reduced.height,
      durationS: null,
      warnings,
    }
  } finally {
    image.close()
  }
}

/** Prépare un fichier pour l'envoi, ou lève une PrepareError avec la raison du refus. */
export async function prepareFile(
  file: File,
  deps: PrepareDeps = browserDeps
): Promise<PreparedFile> {
  if (file.size === 0) throw new PrepareError("fichier_vide")
  const format = detectFormat(await readHead(file), file.name, file.type)
  if (format === null) throw new PrepareError("type_refuse")
  if (format === "video") throw new PrepareError("video_refusee")
  if (file.size > MAX_FILE_BYTES) throw new PrepareError("fichier_trop_lourd")

  switch (format) {
    case "jpeg":
    case "png":
    case "webp":
    case "gif":
    case "heic":
    case "other-image":
      return prepareImage(file, format, deps)

    case "svg": {
      if (file.size > MAX_CHECKED_BYTES) {
        throw new PrepareError("fichier_a_verifier_trop_lourd")
      }
      // DOMPurify n'est chargé que pour un SVG.
      const { cleanSvg, SvgError } = await import("@/lib/media/svg")
      let cleaned
      try {
        cleaned = cleanSvg(await file.text())
      } catch (error) {
        if (error instanceof SvgError) throw new PrepareError(error.reason)
        throw new PrepareError("svg_illisible")
      }
      const blob = new Blob([cleaned.markup], { type: "image/svg+xml" })
      if (blob.size > MAX_CHECKED_BYTES) {
        throw new PrepareError("fichier_a_verifier_trop_lourd")
      }
      return {
        kind: "svg",
        name: fileName(file),
        mime: "image/svg+xml",
        blob,
        width: cleaned.width,
        height: cleaned.height,
        durationS: null,
        warnings: [],
      }
    }

    case "lottie": {
      if (file.size > MAX_CHECKED_BYTES) {
        throw new PrepareError("fichier_a_verifier_trop_lourd")
      }
      const check = checkLottie(await file.text())
      if (!check.ok) throw new PrepareError(check.reason)
      return {
        kind: "lottie",
        name: fileName(file),
        mime: "application/json",
        blob: new Blob([file], { type: "application/json" }),
        width: check.width,
        height: check.height,
        durationS: null,
        warnings: [],
      }
    }

    case "mp3":
    case "m4a": {
      const mime = format === "mp3" ? "audio/mpeg" : "audio/mp4"
      const blob = new Blob([file], { type: mime })
      const duration = await deps.readAudioDuration(blob)
      return {
        kind: "audio",
        name: fileName(file),
        mime,
        blob,
        width: null,
        height: null,
        durationS:
          duration === null ? null : Math.round(duration * 1000) / 1000,
        warnings: [],
      }
    }

    case "pdf":
      return {
        kind: "pdf",
        name: fileName(file),
        mime: "application/pdf",
        blob: new Blob([file], { type: "application/pdf" }),
        width: null,
        height: null,
        durationS: null,
        warnings: [],
      }
  }
}

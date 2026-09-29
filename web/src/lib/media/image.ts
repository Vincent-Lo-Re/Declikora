// Réduction des photos dans le navigateur (§ 4.2) : environ 300 Ko, 2 000 px au plus sur le
// grand côté, en WebP (JPEG si le navigateur ne sait pas écrire le WebP, comme Safari).
// Code maison (createImageBitmap + canvas) : pas de bibliothèque à suivre.

import { IMAGE_MAX_SIDE, IMAGE_TARGET_BYTES } from "@/lib/media/constants"

export type ImageType = "image/webp" | "image/jpeg"

/** Dessine l'image à la taille donnée et l'encode. Le Blob rendu dit le type réellement écrit. */
export type Encoder = (
  width: number,
  height: number,
  type: ImageType,
  quality: number
) => Promise<Blob>

type ReducedImage = { blob: Blob; width: number; height: number }

// Qualités essayées pour chaque taille, puis on réduit la taille.
const qualities = [0.85, 0.72, 0.6]
const sizeStep = 0.8
// En dessous, on garde le meilleur résultat plutôt que de dégrader encore la photo.
const minSide = 800

/** Taille ramenée à `maxSide` au plus sur le grand côté (jamais agrandie). */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number
): { width: number; height: number } {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Réduit une image jusqu'à la taille visée : WebP d'abord ; si le navigateur rend autre chose
 * (Safari rend du PNG sans prévenir), JPEG. On baisse la qualité, puis la taille, et on garde
 * le premier résultat assez léger (sinon le plus léger).
 */
export async function reduceImage(
  source: { width: number; height: number },
  encode: Encoder,
  {
    targetBytes = IMAGE_TARGET_BYTES,
    maxSide = IMAGE_MAX_SIDE,
  }: { targetBytes?: number; maxSide?: number } = {}
): Promise<ReducedImage> {
  let type: ImageType = "image/webp"
  let best: ReducedImage | null = null
  let limit = Math.min(maxSide, Math.max(source.width, source.height))

  for (;;) {
    const size = fitWithin(source.width, source.height, limit)
    for (const quality of qualities) {
      let blob = await encode(size.width, size.height, type, quality)
      if (type === "image/webp" && blob.type !== "image/webp") {
        type = "image/jpeg"
        blob = await encode(size.width, size.height, type, quality)
      }
      if (blob.size <= targetBytes) return { blob, ...size }
      if (best === null || blob.size < best.blob.size) best = { blob, ...size }
    }
    const side = Math.max(size.width, size.height)
    if (side <= minSide && best !== null) return best
    limit = Math.max(minSide, Math.round(side * sizeStep))
  }
}

/**
 * Vrai si un GIF contient plusieurs images (animation). On parcourt ses blocs : compter les
 * octets 0x2C au hasard se tromperait, car ils apparaissent aussi dans les données.
 */
export function isAnimatedGif(bytes: Uint8Array): boolean {
  if (bytes.length < 13) return false
  let offset = 13
  const flags = bytes[10]
  if (flags & 0x80) offset += 3 * 2 ** ((flags & 0x07) + 1)

  const skipSubBlocks = () => {
    while (offset < bytes.length) {
      const length = bytes[offset]
      offset += 1
      if (length === 0) return
      offset += length
    }
  }

  let frames = 0
  while (offset < bytes.length) {
    const marker = bytes[offset]
    if (marker === 0x3b) break // fin du fichier
    if (marker === 0x21) {
      // Extension : étiquette, puis sous-blocs.
      offset += 2
      skipSubBlocks()
    } else if (marker === 0x2c) {
      frames += 1
      if (frames > 1) return true
      const localFlags = bytes[offset + 9]
      offset += 10
      if (localFlags & 0x80) offset += 3 * 2 ** ((localFlags & 0x07) + 1)
      offset += 1 // taille minimale du code LZW
      skipSubBlocks()
    } else {
      break // fichier abîmé : on s'arrête
    }
  }
  return false
}

/** Image décodée par le navigateur, prête à être réduite. */
export type DecodedImage = {
  width: number
  height: number
  encode: Encoder
  close: () => void
}

/**
 * Décode une image avec le navigateur (première image pour un GIF animé, orientation de l'appareil
 * photo appliquée). Échoue si le navigateur ne sait pas la lire (HEIC hors de Safari…).
 */
export async function decodeImage(file: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })
  const encode: Encoder = async (width, height, type, quality) => {
    const canvas =
      typeof OffscreenCanvas === "undefined"
        ? Object.assign(document.createElement("canvas"), { width, height })
        : new OffscreenCanvas(width, height)
    const context = canvas.getContext("2d") as
      CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
    if (!context) throw new Error("Canvas indisponible")
    if (type === "image/jpeg") {
      // Le JPEG n'a pas de transparence : fond blanc plutôt que noir.
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, width, height)
    }
    context.imageSmoothingQuality = "high"
    context.drawImage(bitmap, 0, 0, width, height)
    if (canvas instanceof HTMLCanvasElement) {
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Encodage impossible")),
          type,
          quality
        )
      )
    }
    return canvas.convertToBlob({ type, quality })
  }
  return {
    width: bitmap.width,
    height: bitmap.height,
    encode,
    close: () => bitmap.close(),
  }
}

// Reconnaissance d'un fichier choisi : d'après ses premiers octets d'abord, puis son extension
// et le type annoncé par le système (qui varie : « audio/x-m4a » depuis macOS, « audio/mp3 »…).
// Le type envoyé à Storage et à la base est TOUJOURS un type normalisé (§ 1.9, [D33]).

import type { MediaMime } from "@/lib/media/constants"

export type DetectedFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "heic"
  // Autre image que le navigateur saura peut-être lire (AVIF, BMP…) : convertie.
  | "other-image"
  | "svg"
  | "lottie"
  | "mp3"
  | "m4a"
  | "pdf"
  | "video"

// Nombre d'octets lus au début du fichier pour le reconnaître.
export const HEAD_BYTES = 64

const heicBrands = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "mif1",
  "msf1",
])
const avifBrands = new Set(["avif", "avis"])
const audioBrands = new Set(["M4A ", "M4B ", "M4P "])

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte)
}

/** Extension en minuscules, sans le point (« photo.HEIC » → « heic »). */
export function extensionOf(name: string): string {
  const match = /\.([^./\\]+)$/.exec(name)
  return match ? match[1].toLowerCase() : ""
}

/** Vrai si les octets sont ceux d'un MP3 (étiquette ID3 ou début d'une trame MPEG). */
function isMp3(head: Uint8Array): boolean {
  if (ascii(head, 0, 3) === "ID3") return true
  // Trame MPEG : 11 bits à 1, puis une version et une couche valides.
  return (
    head.length >= 2 &&
    head[0] === 0xff &&
    (head[1] & 0xe0) === 0xe0 &&
    (head[1] & 0x06) !== 0 &&
    (head[1] & 0x18) !== 0x08
  )
}

/**
 * Reconnaît le format d'un fichier, ou renvoie null s'il n'est pas accepté.
 * `head` : ses premiers octets (HEAD_BYTES), `name` et `type` : ce que dit le système.
 */
export function detectFormat(
  head: Uint8Array,
  name: string,
  type: string
): DetectedFormat | null {
  const extension = extensionOf(name)
  const declared = type.toLowerCase()

  if (startsWith(head, [0xff, 0xd8, 0xff])) return "jpeg"
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png"
  }
  if (ascii(head, 0, 6) === "GIF87a" || ascii(head, 0, 6) === "GIF89a") {
    return "gif"
  }
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 4) === "WEBP")
    return "webp"
  if (ascii(head, 0, 5) === "%PDF-") return "pdf"

  // Conteneur ISO (MP4, M4A, HEIC, AVIF…) : « ftyp » puis la marque principale.
  if (ascii(head, 4, 4) === "ftyp") {
    const brand = ascii(head, 8, 4)
    if (heicBrands.has(brand)) return "heic"
    if (avifBrands.has(brand)) return "other-image"
    if (
      audioBrands.has(brand) ||
      extension === "m4a" ||
      declared.startsWith("audio/")
    ) {
      return "m4a"
    }
    // Un .mp4 ou un .mov sans marque audio : une vidéo (pas de vidéo dans la médiathèque).
    return "video"
  }

  if (isMp3(head)) return "mp3"

  if (extension === "svg" || declared === "image/svg+xml") return "svg"
  if (extension === "json" || declared === "application/json") return "lottie"

  // Autre image annoncée comme telle (BMP…) : le navigateur essaiera de la lire.
  if (declared.startsWith("image/") && declared !== "image/svg+xml") {
    return "other-image"
  }
  if (declared.startsWith("video/")) return "video"
  return null
}

/**
 * Type audio normalisé : « audio/mpeg » pour un MP3, « audio/mp4 » pour un M4A, quel que soit
 * le type annoncé (audio/x-m4a, audio/m4a, audio/mp3…). Null si ce n'est pas un audio accepté.
 */
export function normalizeAudioType(
  head: Uint8Array,
  name: string,
  type: string
): Extract<MediaMime, "audio/mpeg" | "audio/mp4"> | null {
  const format = detectFormat(head, name, type)
  if (format === "mp3") return "audio/mpeg"
  if (format === "m4a") return "audio/mp4"
  return null
}

/** Lit les premiers octets d'un fichier. */
export async function readHead(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())
}

import {
  AudioLines,
  FileText,
  Image as ImageIcon,
  Shapes,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import type { Media, MediaKind } from "@/lib/media/constants"
import { rejectReasonText } from "@/lib/media/upload"
import { texts } from "@/texts"

export const kindIcons: Record<MediaKind, LucideIcon> = {
  image: ImageIcon,
  svg: Shapes,
  lottie: Sparkles,
  audio: AudioLines,
  pdf: FileText,
}

/**
 * Ce que le sélecteur de fichiers propose pour chaque type (le navigateur en fait un filtre, pas
 * une règle : le fichier est reconnu ensuite, lib/media/detect.ts).
 */
export const acceptByKind: Record<MediaKind, string> = {
  image: [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".heic",
    ".heif",
    ".avif",
    "image/*",
  ].join(","),
  svg: [".svg", "image/svg+xml"].join(","),
  lottie: [".json", "application/json"].join(","),
  audio: [".mp3", ".m4a", "audio/mpeg", "audio/mp4", "audio/x-m4a"].join(","),
  pdf: [".pdf", "application/pdf"].join(","),
}

/** Tous les formats acceptés (« Envoyer des fichiers »). */
export const acceptedFiles = Object.values(acceptByKind).join(",")

/** « Refusé : raison » pour un fichier refusé. */
export function rejectedText(media: Media): string {
  return texts.media.rejectedBecause(rejectReasonText(media.reject_reason))
}

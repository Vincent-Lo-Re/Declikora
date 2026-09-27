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

/** « Refusé : raison » pour un fichier refusé. */
export function rejectedText(media: Media): string {
  return texts.media.rejectedBecause(rejectReasonText(media.reject_reason))
}

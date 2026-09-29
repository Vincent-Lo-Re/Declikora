// Règles de la médiathèque, communes à l'envoi et à l'affichage.
// Elles reprennent celles de la base (supabase/migrations/20260927170100_mediatheque.sql) et
// de docs/ARCHITECTURE-CONTENUS.md (§ 1.9, § 4.1, § 4.2).

import type { Tables } from "@/lib/database.types"

export const mediaKinds = ["image", "svg", "lottie", "audio", "pdf"] as const
export type MediaKind = (typeof mediaKinds)[number]

export type MediaStatus = "pending" | "checking" | "ready" | "rejected"

// Types acceptés par les buckets (liste exacte), après normalisation par l'admin.
export type MediaMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/svg+xml"
  | "application/json"
  | "audio/mpeg"
  | "audio/mp4"
  | "application/pdf"

/** Une ligne de la médiathèque (table media), avec la sorte et l'état précisés. */
export type Media = Omit<Tables<"media">, "kind" | "status" | "mime"> & {
  kind: MediaKind
  status: MediaStatus
  mime: MediaMime
}

const MB = 1024 * 1024

// 50 Mo par fichier (limite des buckets et de l'offre gratuite).
export const MAX_FILE_BYTES = 50 * MB
// 5 Mo au plus pour un SVG ou un Lottie : la fonction « files » doit pouvoir les vérifier.
export const MAX_CHECKED_BYTES = 5 * MB
// Au-delà, envoi reprenable (TUS) : c'est aussi la taille des morceaux de Supabase.
export const RESUMABLE_THRESHOLD_BYTES = 6 * MB
// Photos réduites à environ 300 Ko, 2 000 px au plus sur le grand côté.
export const IMAGE_TARGET_BYTES = 300 * 1024
export const IMAGE_MAX_SIDE = 2000

// Stockage de l'offre gratuite : 1 Go, alerte à 800 Mo.
export const STORAGE_QUOTA_BYTES = 1024 * MB
export const STORAGE_ALERT_BYTES = 800 * MB

export const PROTECTED_BUCKET = "files-protected"
export const PUBLIC_BUCKET = "files-public"
// Durée de cache des fichiers (réponse B de la question 5, § 4.6).
export const CACHE_CONTROL_SECONDS = "60"

// Un envoi « pending » plus vieux que ça est considéré comme interrompu.
export const INTERRUPTED_AFTER_MS = 60 * 60 * 1000

// Fenêtre des envois : temps pendant lequel elle reste affichée une fois tout prêt, avant de
// se fermer toute seule.
export const UPLOAD_WINDOW_CLOSE_MS = 4000
// Variable CSS posée sur la page tant que la fenêtre des envois est affichée : la place qu'elle
// prend en bas (sa hauteur et un écart). Les messages (Toaster) et le bas des pages s'en
// servent pour ne pas passer dessous.
export const UPLOAD_WINDOW_SPACE = "--upload-window-space"

export function isMediaKind(value: unknown): value is MediaKind {
  return (
    typeof value === "string" &&
    (mediaKinds as readonly string[]).includes(value)
  )
}

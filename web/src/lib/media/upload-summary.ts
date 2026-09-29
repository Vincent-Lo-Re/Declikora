// La fenêtre des envois, sans React : où en est chaque envoi (vérification du serveur comprise)
// et le titre qui les résume.

import type { MediaVerdict } from "@/lib/media/api"
import type { UploadItem } from "@/lib/media/upload"
import { isActive } from "@/lib/media/upload-queue"
import { texts } from "@/texts"

export type UploadState = "active" | "ready" | "failed" | "cancelled"

/** Où en est un envoi : un SVG ou un Lottie envoyé reste « active » tant qu'il est vérifié. */
export function uploadState(
  item: UploadItem,
  verdict: MediaVerdict | null
): UploadState {
  if (isActive(item)) return "active"
  if (item.stage === "cancelled") return "cancelled"
  if (item.stage === "error") return "failed"
  if (verdict?.status === "checking") return "active"
  if (verdict?.status === "rejected") return "failed"
  return "ready"
}

export type UploadSummary = Record<UploadState, number>

export function summarize(states: UploadState[]): UploadSummary {
  const summary: UploadSummary = {
    active: 0,
    ready: 0,
    failed: 0,
    cancelled: 0,
  }
  for (const state of states) summary[state] += 1
  return summary
}

/** Titre de la fenêtre : ce qui tourne d'abord, puis les échecs, puis ce qui est prêt. */
export function summaryText(summary: UploadSummary): string {
  const say = texts.media.uploads.summary
  if (summary.active > 0) return say.active(summary.active)
  if (summary.failed > 0) return say.failed(summary.failed)
  if (summary.ready > 0) return say.ready(summary.ready)
  return say.cancelled
}

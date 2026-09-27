import { useEffect, useRef } from "react"

import {
  useUploadQueue,
  useUploadQueueWatch,
  useUploadVerdicts,
} from "@/components/media/use-upload-queue"
import type { MediaVerdict } from "@/lib/media/api"
import { rejectReasonText, type UploadItem } from "@/lib/media/upload"
import { texts } from "@/texts"

/** Ce qu'on annonce d'un envoi à son étape actuelle (null : rien de neuf à dire). */
function announcement(
  item: UploadItem,
  verdict: MediaVerdict | null
): string | null {
  const say = texts.media.uploads.announce
  switch (item.stage) {
    case "sending":
      return say.sending(item.fileName)
    case "done":
      if (verdict?.status === "checking") return say.checking(item.fileName)
      if (verdict?.status === "rejected") {
        return say.rejected(
          item.fileName,
          rejectReasonText(verdict.reject_reason)
        )
      }
      return say.ready(item.fileName)
    case "error":
      return say.failed(item.fileName, item.error ?? texts.common.unexpected)
    case "cancelled":
      return say.cancelled(item.fileName)
    default:
      return null
  }
}

/**
 * Suivi des envois pour toute l'admin (monté une fois dans AppLayout, car un envoi continue
 * quand on change de section) : avertissement avant de quitter la page, relecture de la
 * médiathèque, et une zone lue par les lecteurs d'écran, toujours présente, qui annonce chaque
 * étape de chaque fichier (envoi, vérification, prêt, refusé avec sa raison, échec).
 */
export function UploadAnnouncer() {
  useUploadQueueWatch()
  const { items } = useUploadQueue()
  const verdictOf = useUploadVerdicts(items)
  const region = useRef<HTMLDivElement>(null)
  const announced = useRef(new Map<string, string>())

  useEffect(() => {
    const messages: string[] = []
    const next = new Map<string, string>()
    for (const item of items) {
      const message = announcement(item, verdictOf(item))
      if (message === null) continue
      next.set(item.id, message)
      if (announced.current.get(item.id) !== message) messages.push(message)
    }
    announced.current = next
    if (messages.length > 0 && region.current) {
      region.current.textContent = messages.join(" ")
    }
  })

  return (
    <div
      ref={region}
      role="status"
      aria-live="polite"
      aria-label={texts.media.uploads.announcerLabel}
      className="sr-only"
    />
  )
}

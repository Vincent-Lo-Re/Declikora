import { describe, expect, it } from "vitest"

import type { MediaVerdict } from "@/lib/media/api"
import type { UploadItem, UploadStage } from "@/lib/media/upload"
import { summarize, summaryText, uploadState } from "@/lib/media/upload-summary"
import { texts } from "@/texts"

function item(stage: UploadStage): UploadItem {
  return {
    id: "envoi-1",
    fileName: "logo.svg",
    size: null,
    stage,
    progress: null,
    resumable: false,
    warnings: [],
    error: null,
    canRetry: false,
    result: null,
  }
}

function verdict(status: MediaVerdict["status"]): MediaVerdict {
  return {
    id: "00000000-0000-4000-8000-00000000000a",
    status,
    reject_reason: status === "rejected" ? "svg_element_interdit" : null,
  }
}

describe("état d'un envoi", () => {
  it("est en cours tant que le fichier part ou s'enregistre", () => {
    for (const stage of [
      "waiting",
      "preparing",
      "sending",
      "confirming",
    ] as const) {
      expect(uploadState(item(stage), null)).toBe("active")
    }
  })

  it("reste en cours pendant la vérification du serveur, puis prêt ou en échec", () => {
    expect(uploadState(item("done"), verdict("checking"))).toBe("active")
    expect(uploadState(item("done"), verdict("ready"))).toBe("ready")
    expect(uploadState(item("done"), verdict("rejected"))).toBe("failed")
  })

  it("distingue l'échec de l'annulation", () => {
    expect(uploadState(item("error"), null)).toBe("failed")
    expect(uploadState(item("cancelled"), null)).toBe("cancelled")
  })
})

describe("titre de la fenêtre des envois", () => {
  const say = texts.media.uploads.summary

  it("parle d'abord de ce qui tourne, puis des échecs, puis de ce qui est prêt", () => {
    expect(summaryText(summarize(["active", "failed", "ready"]))).toBe(
      say.active(1)
    )
    expect(summaryText(summarize(["failed", "ready", "ready"]))).toBe(
      say.failed(1)
    )
    expect(summaryText(summarize(["ready", "cancelled"]))).toBe(say.ready(1))
    expect(summaryText(summarize(["cancelled"]))).toBe(say.cancelled)
  })

  it("accorde le nombre", () => {
    expect(say.active(1)).toBe("1 envoi en cours")
    expect(say.active(3)).toBe("3 envois en cours")
    expect(say.failed(2)).toBe("2 envois ont échoué")
    expect(say.ready(5)).toBe("5 fichiers prêts")
  })
})

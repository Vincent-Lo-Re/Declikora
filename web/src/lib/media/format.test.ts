import { describe, expect, it } from "vitest"

import {
  formatBytes,
  formatDimensions,
  formatDuration,
  formatPercent,
} from "@/lib/media/format"
import { texts } from "@/texts"

describe("affichage", () => {
  it("écrit les tailles en octets, Ko, Mo et Go", () => {
    expect(formatBytes(812)).toBe("812 octets")
    expect(formatBytes(300 * 1024)).toBe("300 Ko")
    expect(formatBytes(12.5 * 1024 * 1024)).toBe("12,5 Mo")
    expect(formatBytes(800 * 1024 * 1024)).toBe("800 Mo")
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1 Go")
  })

  it("écrit les durées", () => {
    expect(formatDuration(45.2)).toBe("45 s")
    expect(formatDuration(185)).toBe("3 min 05 s")
    expect(formatDuration(3720)).toBe("1 h 02 min")
  })

  it("écrit les dimensions", () => {
    expect(formatDimensions(1200, 800)).toBe("1200 × 800 px")
  })

  it("écrit la progression en pourcentage", () => {
    expect(formatPercent(0.424)).toBe("42 %")
  })

  it("prend ses unités dans texts.ts", () => {
    // Un seul endroit pour les textes : format.ts n'écrit aucune unité lui-même.
    expect(formatBytes(2 * 1024 * 1024)).toBe(texts.media.units.megabytes("2"))
    expect(formatDuration(185)).toBe(texts.media.units.minutesSeconds(3, "05"))
  })
})

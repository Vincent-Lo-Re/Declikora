import { describe, expect, it } from "vitest"

import { formatDateTime } from "./dates"

describe("formatDateTime", () => {
  it("écrit la date courte à l'heure de Paris, en été", () => {
    expect(formatDateTime(new Date("2026-09-27T12:30:00Z"))).toBe(
      "27 sept. 2026 à 14:30"
    )
  })

  it("suit le changement d'heure, en hiver", () => {
    expect(formatDateTime(new Date("2026-01-05T08:05:00Z"))).toBe(
      "5 janv. 2026 à 09:05"
    )
  })

  it("accepte une date écrite par la base", () => {
    expect(formatDateTime("2026-09-27T12:30:00+00:00")).toBe(
      "27 sept. 2026 à 14:30"
    )
  })
})

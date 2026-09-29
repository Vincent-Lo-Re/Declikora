import { describe, expect, it } from "vitest"

import {
  formatDateTime,
  formatDayInput,
  formatTimeInput,
  parisToInstant,
  parseDayInput,
  parseTimeInput,
  toParisParts,
} from "./dates"

describe("formatDateTime", () => {
  it("écrit la date courte à l'heure de Paris, en été", () => {
    expect(formatDateTime(new Date("2026-09-27T12:30:00Z"))).toBe(
      "27 sept. 2026 à 14h30"
    )
  })

  it("suit le changement d'heure, en hiver", () => {
    expect(formatDateTime(new Date("2026-01-05T08:05:00Z"))).toBe(
      "5 janv. 2026 à 09h05"
    )
  })

  it("accepte une date écrite par la base", () => {
    expect(formatDateTime("2026-09-27T12:30:00+00:00")).toBe(
      "27 sept. 2026 à 14h30"
    )
  })
})

describe("heure de Paris ↔ instant (programmation)", () => {
  it("convertit une heure d'été et une heure d'hiver", () => {
    expect(parisToInstant("2026-10-03", "08:00")).toEqual({
      ok: true,
      instant: new Date("2026-10-03T06:00:00Z"),
      ambiguous: false,
    })
    expect(parisToInstant("2026-12-24", "18:30")).toEqual({
      ok: true,
      instant: new Date("2026-12-24T17:30:00Z"),
      ambiguous: false,
    })
  })

  it("passage à l'heure d'été (29 mars 2026) : 2 h 30 n'existe pas", () => {
    expect(parisToInstant("2026-03-29", "02:30")).toEqual({
      ok: false,
      reason: "nonexistent",
    })
    expect(parisToInstant("2026-03-29", "02:00")).toEqual({
      ok: false,
      reason: "nonexistent",
    })
    // Juste avant et juste après le saut.
    expect(parisToInstant("2026-03-29", "01:59")).toMatchObject({
      instant: new Date("2026-03-29T00:59:00Z"),
    })
    expect(parisToInstant("2026-03-29", "03:00")).toMatchObject({
      instant: new Date("2026-03-29T01:00:00Z"),
    })
  })

  it("retour à l'heure d'hiver (25 oct. 2026) : 2 h 30 existe deux fois, la première est retenue", () => {
    expect(parisToInstant("2026-10-25", "02:30")).toEqual({
      ok: true,
      instant: new Date("2026-10-25T00:30:00Z"),
      ambiguous: true,
    })
    expect(parisToInstant("2026-10-25", "01:59")).toEqual({
      ok: true,
      instant: new Date("2026-10-24T23:59:00Z"),
      ambiguous: false,
    })
    expect(parisToInstant("2026-10-25", "03:00")).toEqual({
      ok: true,
      instant: new Date("2026-10-25T02:00:00Z"),
      ambiguous: false,
    })
  })

  it("refuse un jour ou une heure qui n'existent pas", () => {
    expect(parisToInstant("2026-04-31", "10:00")).toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(parisToInstant("2026-02-29", "10:00")).toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(parisToInstant("2026-10-03", "24:00")).toEqual({
      ok: false,
      reason: "invalid",
    })
    expect(parisToInstant("", "08:00")).toEqual({
      ok: false,
      reason: "invalid",
    })
  })

  it("relit un instant à l'heure de Paris, aux deux côtés des changements d'heure", () => {
    expect(toParisParts(new Date("2026-03-29T00:59:00Z"))).toEqual({
      date: "2026-03-29",
      time: "01:59",
    })
    expect(toParisParts(new Date("2026-03-29T01:00:00Z"))).toEqual({
      date: "2026-03-29",
      time: "03:00",
    })
    expect(toParisParts(new Date("2026-10-25T00:30:00Z"))).toEqual({
      date: "2026-10-25",
      time: "02:30",
    })
    expect(toParisParts(new Date("2026-10-25T01:30:00Z"))).toEqual({
      date: "2026-10-25",
      time: "02:30",
    })
    // Minuit s'écrit 00:00, et le jour change à Paris avant de changer à Londres.
    expect(toParisParts(new Date("2026-12-31T23:00:00Z"))).toEqual({
      date: "2027-01-01",
      time: "00:00",
    })
  })

  it("aller-retour : chaque quart d'heure de l'année redonne le même instant", () => {
    const start = Date.UTC(2026, 0, 1)
    for (let t = start; t < start + 366 * 86_400_000; t += 15 * 60_000) {
      const instant = new Date(t)
      const parts = toParisParts(instant)
      const back = parisToInstant(parts.date, parts.time)
      if (!back.ok) throw new Error(`${parts.date} ${parts.time}`)
      if (back.ambiguous) {
        // L'heure doublée d'octobre est ramenée à sa première occurrence (une heure plus tôt).
        expect(t - back.instant.getTime()).toBeOneOf([0, 3_600_000])
      } else {
        expect(back.instant.getTime()).toBe(t)
      }
      expect(toParisParts(back.instant)).toEqual(parts)
    }
  })
})

describe("saisie à la française (fenêtre « Programmer »)", () => {
  it("lit un jour « jj/mm/aaaa », avec ou sans zéro, et refuse un jour qui n'existe pas", () => {
    expect(parseDayInput("25/10/2099")).toBe("2099-10-25")
    expect(parseDayInput(" 5/3/2099 ")).toBe("2099-03-05")
    expect(parseDayInput("31/04/2099")).toBeNull()
    expect(parseDayInput("29/02/2099")).toBeNull()
    expect(parseDayInput("2099-10-25")).toBeNull()
    expect(formatDayInput("2099-03-05")).toBe("05/03/2099")
  })

  it("lit une heure « 08h05 », « 8h05 », « 8h » ou « 08:05 », et l'écrit « 08h05 »", () => {
    expect(parseTimeInput("08h05")).toBe("08:05")
    expect(parseTimeInput("8h05")).toBe("08:05")
    expect(parseTimeInput("8h")).toBe("08:00")
    expect(parseTimeInput("08:05")).toBe("08:05")
    expect(parseTimeInput("18 h 42")).toBe("18:42")
    expect(parseTimeInput("24h00")).toBeNull()
    expect(parseTimeInput("8h60")).toBeNull()
    expect(parseTimeInput("huit heures")).toBeNull()
    expect(formatTimeInput("08:05")).toBe("08h05")
  })
})

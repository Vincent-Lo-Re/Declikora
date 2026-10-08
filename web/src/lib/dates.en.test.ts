import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Les dates de l'admin en anglais : la langue se lit au chargement, d'où l'import après coup.
let dates: typeof import("@/lib/dates")

beforeAll(async () => {
  localStorage.setItem("declikora-langue", "en")
  vi.resetModules()
  dates = await import("@/lib/dates")
})

afterAll(() => {
  localStorage.setItem("declikora-langue", "fr")
  vi.resetModules()
})

describe("dates en anglais", () => {
  it("s'écrivent à l'américaine, à l'heure de Paris", () => {
    expect(dates.formatDateTime("2026-09-27T12:30:00Z")).toBe(
      "Sep 27, 2026, 2:30 PM"
    )
    const now = new Date("2026-10-03T10:00:00Z")
    expect(dates.formatShortDateTime("2026-10-03T07:05:00Z", now)).toEqual({
      today: true,
      text: "9:05 AM",
    })
    expect(dates.formatShortDateTime("2026-09-30T07:05:00Z", now).text).toBe(
      "Sep 30"
    )
  })

  it("se tapent en mm/dd/yyyy", () => {
    expect(dates.parseDayInput("10/25/2099")).toBe("2099-10-25")
    expect(dates.parseDayInput("25/10/2099")).toBeNull()
    expect(dates.formatDayInput("2099-10-25")).toBe("10/25/2099")
  })

  it("lisent l'heure sur 12 heures, ou sur 24 heures avec les minutes", () => {
    expect(dates.parseTimeInput("8:00 AM")).toBe("08:00")
    expect(dates.parseTimeInput("8 pm")).toBe("20:00")
    expect(dates.parseTimeInput("12:15 a.m.")).toBe("00:15")
    expect(dates.parseTimeInput("12:15 PM")).toBe("12:15")
    expect(dates.parseTimeInput("14:30")).toBe("14:30")
    expect(dates.parseTimeInput("13 PM")).toBeNull()
    expect(dates.parseTimeInput("8")).toBeNull()
    expect(dates.formatTimeInput("00:15")).toBe("12:15 AM")
    expect(dates.formatTimeInput("20:05")).toBe("8:05 PM")
  })
})

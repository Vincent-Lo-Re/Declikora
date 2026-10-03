import { texts } from "@/texts"

// Toutes les dates de l'administration sont à l'heure de Paris.
const timeZone = "Europe/Paris"

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone,
})

const timeFormat = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone,
})

/** L'heure à la française, à l'heure de Paris : « 18h42 », « 09h05 ». */
function formatTime(value: Date): string {
  const parts = timeFormat.formatToParts(value)
  const hour = parts.find((part) => part.type === "hour")?.value ?? ""
  const minute = parts.find((part) => part.type === "minute")?.value ?? ""
  return `${hour}${texts.dates.hour}${minute}`
}

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone,
})

/**
 * Une date courte, à l'heure de Paris : l'heure seule le jour même (« 16h31 »), sinon le jour
 * (« 3 oct. »). `today` dit lequel.
 */
export function formatShortDateTime(
  date: Date | string,
  now: Date = new Date()
): { today: boolean; text: string } {
  const value = typeof date === "string" ? new Date(date) : date
  const today = toParisParts(value).date === toParisParts(now).date
  return {
    today,
    text: today ? formatTime(value) : dayFormat.format(value),
  }
}

/** « 27 sept. 2026 à 18h42 », à l'heure de Paris. */
export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date
  return `${dateFormat.format(value)} ${texts.dates.at} ${formatTime(value)}`
}

// ---------------------------------------------------------------------------------------------
// Saisie d'un jour et d'une heure à la française (fenêtre « Programmer ») : « 25/10/2099 »,
// « 08h00 ». Les calculs gardent les formats ISO (« 2099-10-25 », « 08:00 »).
// ---------------------------------------------------------------------------------------------

const DAY_INPUT = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const TIME_INPUT = /^(\d{1,2})\s*[h:]\s*(\d{2})?$/i

const pad = (value: number) => String(value).padStart(2, "0")

/** « 25/10/2099 » (ou « 5/3/2099 ») → « 2099-10-25 » ; null si ce n'est pas un jour qui existe. */
export function parseDayInput(text: string): string | null {
  const match = DAY_INPUT.exec(text.trim())
  if (!match) return null
  const [day, month, year] = match.slice(1).map(Number)
  const check = new Date(Date.UTC(year, month - 1, day))
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null
  }
  return `${year}-${pad(month)}-${pad(day)}`
}

/** « 2099-10-25 » → « 25/10/2099 ». */
export function formatDayInput(iso: string): string {
  const [year, month, day] = iso.split("-")
  return `${day}/${month}/${year}`
}

/** « 8h05 », « 08h05 », « 8h », « 08:05 » → « 08:05 » ; null sinon. */
export function parseTimeInput(text: string): string | null {
  const match = TIME_INPUT.exec(text.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2] ?? "0")
  if (hours > 23 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}

/** « 08:05 » → « 08h05 ». */
export function formatTimeInput(time: string): string {
  const [hours, minutes] = time.split(":")
  return `${hours}${texts.dates.hour}${minutes}`
}

// ---------------------------------------------------------------------------------------------
// Heure de Paris ↔ instant (timestamptz), pour programmer une publication.
// La base compare l'instant avec now() : seul l'instant compte, pas le fuseau de pg_cron.
// ---------------------------------------------------------------------------------------------

// Les chiffres de la date et de l'heure à Paris, sur 24 heures (jamais « 24:00 »).
const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** Jour et heure à Paris : { date: "2026-10-25", time: "02:30" } (formats des champs HTML). */
type ParisParts = { date: string; time: string }

export function toParisParts(instant: Date): ParisParts {
  const parts: Record<string, string> = {}
  for (const part of partsFormat.formatToParts(instant)) {
    parts[part.type] = part.value
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

type ParisInstant =
  // ambiguous : l'heure existe deux fois (retour à l'heure d'hiver, fin octobre) ; c'est la
  // première, encore en heure d'été, qui est retenue.
  | { ok: true; instant: Date; ambiguous: boolean }
  // invalid : jour ou heure mal écrits, ou qui n'existent pas (31 avril) ;
  // nonexistent : l'heure n'existe pas ce jour-là (passage à l'heure d'été, fin mars : on
  // passe de 2 h à 3 h).
  | { ok: false; reason: "invalid" | "nonexistent" }

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/
// Paris est à UTC+1 en hiver, UTC+2 en été.
const PARIS_OFFSETS_MINUTES = [120, 60]

/**
 * L'instant qui correspond à un jour et une heure de Paris (« 2026-10-03 », « 08:00 »). Aux
 * changements d'heure, une heure peut ne pas exister ou exister deux fois : on le dit.
 */
export function parisToInstant(date: string, time: string): ParisInstant {
  const day = DATE_PATTERN.exec(date)
  const clock = TIME_PATTERN.exec(time)
  if (!day || !clock) return { ok: false, reason: "invalid" }
  const [year, month, dayOfMonth] = day.slice(1).map(Number)
  const [hours, minutes] = clock.slice(1).map(Number)
  if (hours > 23 || minutes > 59) return { ok: false, reason: "invalid" }
  // Le même jour et la même heure « comme si » Paris était à UTC.
  const naive = Date.UTC(year, month - 1, dayOfMonth, hours, minutes)
  const check = new Date(naive)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== dayOfMonth
  ) {
    return { ok: false, reason: "invalid" }
  }
  // Les instants qui, lus à Paris, redonnent exactement ce jour et cette heure (le plus tôt
  // d'abord : heure d'été avant heure d'hiver).
  const matches = PARIS_OFFSETS_MINUTES.map(
    (offset) => new Date(naive - offset * 60_000)
  ).filter((instant) => {
    const parts = toParisParts(instant)
    return parts.date === date && parts.time === time
  })
  if (matches.length === 0) return { ok: false, reason: "nonexistent" }
  return { ok: true, instant: matches[0], ambiguous: matches.length > 1 }
}

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
  timeZone,
})

/** « 27 sept. 2026 à 14:30 », à l'heure de Paris. */
export function formatDateTime(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date
  return `${dateFormat.format(value)} ${texts.dates.at} ${timeFormat.format(value)}`
}

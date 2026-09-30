import { texts } from "@/texts"

// Affichage des tailles, durées et dimensions, en français (unités dans texts.media.units).

const units = texts.media.units

const oneDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })

const KB = 1024
const MB = 1024 * KB
const GB = 1024 * MB

/** « 812 octets », « 245 Ko », « 12,5 Mo », « 1 Go ». */
export function formatBytes(bytes: number): string {
  if (bytes < KB) return units.bytes(integer.format(bytes))
  if (bytes < MB) return units.kilobytes(integer.format(Math.round(bytes / KB)))
  if (bytes < GB) {
    const value = bytes / MB
    return units.megabytes(
      value < 100 ? oneDecimal.format(value) : integer.format(value)
    )
  }
  return units.gigabytes(oneDecimal.format(bytes / GB))
}

/** Le compteur d'un lecteur : « 0:42 », « 3:05 », « 1:02:03 ». */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = String(total % 60).padStart(2, "0")
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`
}

/** « 45 s », « 3 min 05 s », « 1 h 02 min ». */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const rest = total % 60
  if (hours > 0)
    return units.hoursMinutes(hours, String(minutes).padStart(2, "0"))
  if (minutes > 0) {
    return units.minutesSeconds(minutes, String(rest).padStart(2, "0"))
  }
  return units.seconds(rest)
}

/** « 1200 × 800 px ». */
export function formatDimensions(width: number, height: number): string {
  return units.dimensions(width, height)
}

/** « 42 % » (progression d'un envoi, de 0 à 1). */
export function formatPercent(fraction: number): string {
  return units.percent(Math.round(fraction * 100))
}

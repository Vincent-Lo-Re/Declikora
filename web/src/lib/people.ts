import { locale } from "@/lib/language"

/** Le nom et l'e-mail d'un membre, tels que les lectures les donnent (profiles). */
export type PersonName = { full_name: string | null; email: string }

/** Le nom à montrer d'un membre : son nom complet, sinon son e-mail. */
export function displayName(person: PersonName): string
export function displayName(person: PersonName | null): string | null
export function displayName(person: PersonName | null): string | null {
  if (!person) return null
  return person.full_name?.trim() || person.email
}

/**
 * Initiale d'un membre, pour son avatar : la première lettre de son prénom (le premier mot du
 * nom complet), sinon celle de son e-mail. En majuscule, accent gardé (« élodie » → « É »).
 */
export function initial({ full_name, email }: PersonName): string {
  const firstWord = (full_name ?? "").trim().split(/\s+/)[0] || email.trim()
  return (Array.from(firstWord)[0] ?? "").toLocaleUpperCase(locale)
}

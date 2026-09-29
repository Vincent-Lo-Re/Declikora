/**
 * Initiale d'un membre, pour « Mon compte » : la première lettre de son prénom (le premier mot
 * du nom complet), sinon celle de son e-mail. En majuscule, accent gardé (« élodie » → « É »).
 */
export function initial(fullName: string | null, email: string): string {
  const firstWord = (fullName ?? "").trim().split(/\s+/)[0] || email.trim()
  return (Array.from(firstWord)[0] ?? "").toLocaleUpperCase("fr")
}

/**
 * Initiales d'un membre, pour « Mon compte » : la première lettre du prénom et celle du premier
 * mot du nom. Le nom complet est rangé en un seul champ : le prénom est son premier mot, le nom
 * commence au deuxième (« Vincent Lo Re » → « VL »). Une seule lettre pour un seul mot, sinon la
 * première lettre de l'e-mail. En majuscules, accents gardés (« Élodie » → « É »).
 */
export function initials(fullName: string | null, email: string): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  const letters = words.length === 0 ? [email.trim()] : words.slice(0, 2)
  return letters
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase("fr")
}

/**
 * Initiales d'un membre, pour son avatar : la première lettre du prénom et celle du dernier
 * mot du nom (« Vincent Lo Re » → « VR »), une seule lettre pour un seul mot, sinon la première
 * lettre de l'e-mail. En majuscules, accents gardés (« Élodie » → « É »).
 */
export function initials(fullName: string | null, email: string): string {
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  const letters =
    words.length === 0
      ? [email.trim()]
      : words.length === 1
        ? [words[0]]
        : [words[0], words[words.length - 1]]
  return letters
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase("fr")
}

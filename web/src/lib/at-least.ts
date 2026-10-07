// Une attente qui dure au moins un temps donné : ce qui se montre pendant (les trois points d'un
// bouton, pages de connexion) a le temps d'être vu, même quand la réponse arrive tout de suite.
// Une réponse plus lente n'attend rien de plus.

/** Le temps minimal de la vérification d'un code (e-mail ou app du téléphone) : 1 seconde. */
export const CODE_CHECK_MIN_MS = 1000

/** Le résultat de `work`, rendu au plus tôt `ms` millisecondes après l'appel. */
export async function atLeast<T>(work: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([
    work,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ])
  return result
}

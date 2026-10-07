import { texts as source } from "../texts"

// Les textes de l'interface, pour les tests seulement (alias « @/texts » de vite.config.ts) :
// les espaces insécables deviennent des espaces ordinaires. Testing Library remplace celles du
// texte affiché, jamais celles du texte cherché : sans cela, `getByText(texts.…)` ne trouverait
// plus rien. src/texts.test.ts lit le vrai fichier et vérifie les espaces insécables.
function plain<T>(value: T): T {
  if (typeof value === "string") return value.replace(/ /g, " ") as T
  if (typeof value === "function")
    return ((...args: unknown[]) => plain(value(...args))) as T
  if (Array.isArray(value)) return value.map(plain) as T
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, plain(item)])
    ) as T
  return value
}

export const texts = plain(source)

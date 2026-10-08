// Les faits qu'une erreur de la base donne dans hint (titres, noms de fichiers, nom de qui écrit),
// mis en phrase dans la langue de l'admin. Le detail de la base, en français, reste pour les
// journaux : l'admin ne l'affiche jamais.

import { texts } from "@/texts"

const words = texts.errorFacts

function parse(hint: string): unknown {
  try {
    return JSON.parse(hint)
  } catch {
    return null
  }
}

function strings(value: unknown): (string | null)[] {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : null))
    : []
}

// « “A propos”, “Sans titre” » : chaque titre entre guillemets, un titre vide écrit par l'admin.
function titles(value: unknown): string {
  return strings(value)
    .map((title) => words.quoted(title || texts.common.untitled))
    .join(", ")
}

function unavailable(value: unknown): string {
  if (!Array.isArray(value)) return ""
  return value
    .map((file: { name?: unknown; state?: unknown }) => {
      const name =
        typeof file?.name === "string" && file.name
          ? words.quoted(file.name)
          : null
      if (!name || file.state === "missing") return words.fileMissing
      return file.state === "trashed"
        ? words.fileTrashed(name)
        : words.filePending(name)
    })
    .join(", ")
}

/**
 * La précision d'une erreur, écrite par l'admin à partir de ce que la base donne dans hint ;
 * null quand il n'y a rien à ajouter au message du code.
 */
export function describeFacts(
  code: string | null,
  hint: string | null
): string | null {
  if (code === null || hint === null) return null
  switch (code) {
    case "verrou_tenu":
      return words.heldBy(hint || words.someone)
    case "fichier_utilise":
    case "modele_utilise": {
      const list = titles(parse(hint))
      return list ? words.usedIn(list) : null
    }
    case "modele_vide": {
      const list = titles(parse(hint))
      return list ? words.emptyTemplates(list) : null
    }
    case "fichier_indisponible": {
      const list = unavailable(parse(hint))
      return list ? words.unavailableFiles(list) : null
    }
    case "fichier_inadapte": {
      const names = strings(parse(hint))
        .filter((name): name is string => !!name)
        .map(words.quoted)
        .join(", ")
      return names ? words.wrongTypeFiles(names) : null
    }
    case "image_sans_fichier": {
      const positions = parse(hint)
      return Array.isArray(positions) && positions.length > 0
        ? words.imageMissingAt(positions.join(", "))
        : null
    }
    default:
      return null
  }
}

import { texts } from "@/texts"

/**
 * Le message d'une erreur attrapée, pour un message à l'écran : celui de l'erreur (déjà en
 * français quand elle vient de nos appels : MediaError, ContentError…), sinon « Erreur
 * inattendue ».
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : texts.common.unexpected
}

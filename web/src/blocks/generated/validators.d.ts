// Généré par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier.
import type { Draft, TemplateDraft, TopBlock } from "./blocks"

/** Une erreur d'Ajv : instancePath donne le chemin précis dans le document. */
export interface BlocksValidationError {
  instancePath: string
  schemaPath: string
  keyword: string
  params: Record<string, unknown>
  message?: string
}

/** Vrai si le document a la forme attendue ; sinon, errors décrit la première erreur. */
export interface BlocksValidator<T> {
  (data: unknown): data is T
  errors?: BlocksValidationError[] | null
}

/** Brouillon d'un contenu (variante « draft »). */
export declare const validateDraft: BlocksValidator<Draft>
/** Brouillon d'un modèle de blocs (variante « template » : pas de bloc lié). */
export declare const validateTemplate: BlocksValidator<TemplateDraft>
/** Un bloc de premier niveau d'un brouillon de contenu (l'app valide chaque bloc reçu). */
export declare const validateBlock: BlocksValidator<TopBlock>

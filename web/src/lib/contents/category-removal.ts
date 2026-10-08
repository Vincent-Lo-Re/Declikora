// Retirer une catégorie d'un contenu depuis la fenêtre « Où cette catégorie est utilisée »
// (onglet Catégories du Blog et des Podcasts, décidé le 08/10/2026). Ce que fait « Retirer »
// dépend de l'état du contenu : removalOf le dit (la pastille et son infobulle le montrent),
// removeCategory le fait, sous le verrou du contenu (lib/contents/settings.ts).

import type { CategoryUse } from "@/lib/categories"

/** L'état d'un contenu, tel que la fenêtre le montre. */
export type UseState =
  | "draft"
  | "withdrawn"
  | "live"
  | "modified"
  | "scheduled"
  | "writing"
  | "trash"

/**
 * Ce que fera « Retirer » :
 * - draft : retirée du brouillon (le contenu n'est pas dans l'app) ;
 * - republish : retirée et republiée aussitôt (en ligne, rien d'autre n'a changé) ;
 * - draftOnly : retirée du brouillon seulement (des modifications en cours ne partent pas) ;
 * - null : indisponible (programmé, en cours d'écriture, à la Corbeille, déjà retirée du
 *   brouillon mais encore en ligne).
 */
type RemovalPlan = "draft" | "republish" | "draftOnly" | null

export type Removal = {
  state: UseState
  plan: RemovalPlan
  // Déjà retirée du brouillon, encore en ligne : à republier.
  notInDraft: boolean
}

/** L'état d'un contenu et ce que « Retirer » y fera. La Corbeille, puis l'écriture, priment. */
export function removalOf(use: CategoryUse): Removal {
  const state: UseState = use.in_trash
    ? "trash"
    : use.writer
      ? "writing"
      : use.scheduled
        ? "scheduled"
        : use.live_state
  const notInDraft = !use.in_draft
  let plan: RemovalPlan = null
  if (!notInDraft) {
    if (state === "draft" || state === "withdrawn") plan = "draft"
    else if (state === "live") plan = "republish"
    else if (state === "modified") plan = "draftOnly"
  }
  return { state, plan, notInDraft }
}

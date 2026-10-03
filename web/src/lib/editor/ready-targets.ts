// Éditeur du Fil : où mènent les lignes de « Prêt à publier ? » et les refus de publication. Le
// réglage qui reçoit le curseur, et la zone qui s'allume (la carte qui le contient, ou le champ du
// titre lui-même). Les composants posent ces identifiants ; sans React.

import type { ReadyItem } from "@/lib/contents/requirements"
import { focusSoon, highlightSoon } from "@/lib/focus"

// Le titre du contenu, en tête de l'aperçu : « Prêt à publier ? » et « Écrire le titre » y mènent.
export const CONTENT_TITLE_ID = "contenu-titre"

// Le réglage de chaque ligne (control) et le titre de sa carte (card) dans la colonne de droite.
export const READY_IDS = {
  cover: { control: "article-image", card: "article-carte" },
  // L'audio qui manque ouvre son choix ; choisi, la ligne mène à « Changer d'audio ».
  audio: { control: "article-audio-changer", card: "article-audio" },
  address: { control: "article-adresse", card: "article-adresse-titre" },
  access: { control: "article-niveau", card: "article-niveau-titre" },
} as const

/** Amène un réglage sous les yeux : sa carte s'allume, le curseur va sur lui. */
export function showReadySetting(key: ReadyItem["key"]) {
  const zone =
    key === "title"
      ? `#${CONTENT_TITLE_ID}`
      : `[aria-labelledby="${READY_IDS[key].card}"]`
  const control = key === "title" ? CONTENT_TITLE_ID : READY_IDS[key].control
  highlightSoon(() => document.querySelector<HTMLElement>(zone))
  focusSoon(() => document.getElementById(control), undefined, {
    preventScroll: true,
  })
}

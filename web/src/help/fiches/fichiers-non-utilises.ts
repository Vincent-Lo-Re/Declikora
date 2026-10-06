import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "fichiers-non-utilises",
  theme: "mediatheque",
  title: "Faire de la place dans la Médiathèque",
  summary:
    "Le bouton « Non utilisés » montre les fichiers qui ne servent nulle part, pour les mettre à la corbeille.",
  keywords: [
    "non utilisés",
    "place occupée",
    "stockage",
    "espace",
    "plein",
    "nettoyer",
    "trier",
  ],
  steps: [
    "Ouvre « Médiathèque » et regarde la « Place occupée ».",
    "Clique sur le bouton « Non utilisés » pour n'afficher que les fichiers qui ne servent dans aucun contenu.",
    "Coche les fichiers à retirer, ou clique sur « Tout sélectionner ».",
    "Clique sur « Mettre à la corbeille », suivi du nombre de fichiers cochés.",
    "Pour libérer la place, vide ensuite la corbeille.",
  ],
  notes: [
    "Un fichier non utilisé n'est ni dans un brouillon ni dans un contenu en ligne.",
    "Les fichiers ont 1 Go en tout. Au-delà, plus aucun envoi n'est possible : la Médiathèque prévient quand le stockage est presque plein.",
    "Un fichier encore utilisé n'est pas mis à la corbeille : il reste coché, et la liste te le dit.",
  ],
}

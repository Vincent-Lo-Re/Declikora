import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "utiliser-la-corbeille",
  theme: "corbeille",
  title: "Restaurer ou effacer depuis la corbeille",
  summary:
    "Tout ce qui est mis à la corbeille y reste 30 jours, le temps de le restaurer, puis il est effacé définitivement.",
  keywords: [
    "corbeille",
    "restaurer",
    "récupérer",
    "supprimer",
    "effacer",
    "vider",
    "30 jours",
  ],
  steps: [
    "Ouvre « Corbeille » dans le menu ; filtre par type si besoin (Médiathèque, Pages, Le Fil, Radio Éclaircies, Modèles de bloc).",
    "Pour récupérer un élément, clique sur « Restaurer » sur sa ligne.",
    "Pour effacer un élément tout de suite, clique sur « Effacer définitivement », puis confirme.",
    "Pour tout effacer, clique sur « Vider la corbeille », puis confirme.",
  ],
  notes: [
    "Effacer ou vider est définitif : tu ne pourras pas revenir en arrière.",
    "Sans geste de ta part, chaque élément est effacé au bout de 30 jours : la colonne « Effacement automatique » donne la date.",
    "Un contenu restauré revient en brouillon : rien n'est republié dans l'app.",
    "Ce qui est parti ensemble dans la corbeille (le même lot) est restauré ou effacé ensemble.",
  ],
}

import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "gerer-les-categories",
  theme: "contenus",
  title: "Gérer les catégories",
  summary:
    "Le Fil et Radio Éclaircies ont chacun leurs catégories, que l'app utilise pour filtrer les contenus.",
  keywords: [
    "catégorie",
    "filtre",
    "thème",
    "classer",
    "renommer",
    "ordre",
    "étiquette",
  ],
  steps: [
    "Ouvre « Le Fil » ou « Radio Éclaircies », puis clique sur « Catégories ».",
    "Pour en ajouter une, écris son nom dans « Ajouter une catégorie », puis clique sur « Ajouter ».",
    "Range-les avec la poignée, à la souris ou au clavier : l'app les montre dans cet ordre.",
    "Pour renommer ou supprimer une catégorie, ouvre le menu de sa ligne et choisis « Renommer » ou « Supprimer ».",
    "Pour donner des catégories à un contenu, choisis-les dans la colonne de droite de l'éditeur ; « Nouvelle » en crée une sur place.",
  ],
  notes: [
    "Les catégories sont facultatives : un contenu peut en avoir une, plusieurs ou aucune.",
    "Les catégories d'un contenu ne changent dans l'app qu'à sa prochaine publication.",
    "Supprimer une catégorie est définitif : elle ne passe pas par la corbeille, et elle disparaît tout de suite des filtres de l'app.",
  ],
}

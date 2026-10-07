import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "revenir-a-une-version",
  theme: "publication",
  title: "Revenir à une version précédente",
  summary:
    "L'historique garde chaque version publiée, avec son auteur et sa date, et peut la recopier dans le brouillon.",
  keywords: [
    "historique",
    "version",
    "revenir",
    "restaurer",
    "ancienne version",
    "annuler",
    "retour en arrière",
  ],
  steps: [
    "Dans l'éditeur, ouvre le menu à côté de « Publier » et choisis « Historique ».",
    "Repère la version voulue, avec son numéro, sa date et son auteur.",
    "Clique sur « Revenir à cette version », puis confirme.",
    "Relis le brouillon, puis publie-le pour que l'app change.",
  ],
  notes: [
    "Rien ne change dans l'app avant la prochaine publication.",
    "La version remplace le texte du brouillon, son niveau d'accès, et ses catégories (article, épisode) ou son adresse (page).",
    "Pour revenir à une version, il faut avoir la main sur le brouillon.",
    "Si un fichier de cette version n'est plus disponible, choisis-en un autre avant de publier.",
  ],
}

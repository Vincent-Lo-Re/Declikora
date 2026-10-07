import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "publier-un-contenu",
  theme: "publication",
  title: "Publier un contenu, ou le retirer de l'app",
  summary:
    "« Publier » envoie dans l'app une copie du brouillon ; « Retirer de l'app » la retire sans supprimer le contenu.",
  keywords: [
    "publier",
    "mettre en ligne",
    "prêt à publier",
    "dépublier",
    "retirer",
    "en ligne",
    "brouillon",
  ],
  steps: [
    "Dans la colonne de droite de l'éditeur, regarde « Prêt à publier ? » : un clic sur une ligne à régler mène à son réglage.",
    "Règle ce qui manque : le titre, l'image de présentation (article, épisode), l'audio (épisode), l'adresse de la page (page) et le niveau d'accès.",
    "Clique sur « Publier », en bas de la colonne de droite.",
    "Vérifie le niveau d'accès dans la fenêtre « Publier dans l'app ? », puis clique sur « Publier ».",
  ],
  notes: [
    "Après la publication, tu peux modifier le brouillon sans toucher à l'app : l'état passe à « Modifié », et l'app ne change qu'à la publication suivante.",
    "Les points à vérifier dans le plan (une section vide, par exemple) n'empêchent pas de publier. La transcription d'un épisode est conseillée, pas obligatoire.",
    "Pour retirer un contenu de l'app, ouvre le menu à côté de « Publier » et choisis « Retirer de l'app » : le brouillon et l'historique sont gardés, et une publication programmée est annulée.",
    "Si quelqu'un écrit le brouillon en ce moment, il faut reprendre la main pour publier.",
  ],
}

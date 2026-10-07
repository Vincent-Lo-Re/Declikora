import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "creer-un-contenu",
  theme: "contenus",
  title: "Créer un article, un épisode ou une page",
  summary:
    "Un nouveau contenu se crée depuis sa liste, avec son titre, puis s'ouvre dans l'éditeur.",
  keywords: [
    "nouvel article",
    "nouvel épisode",
    "nouvelle page",
    "créer",
    "ajouter",
    "point de départ",
    "écrire",
  ],
  steps: [
    "Ouvre « Le Fil », « Radio Éclaircies » ou « Pages » dans le menu.",
    "Clique sur « Nouvel article », « Nouvel épisode » ou « Nouvelle page ».",
    "Écris le titre : il suffit pour commencer.",
    "Si la liste en propose, choisis un « Point de départ » : le contenu s'ouvre avec une structure déjà en place.",
    "Choisis des catégories si tu veux, pour un article ou un épisode.",
    "Clique sur « Créer l'article », « Créer l'épisode » ou « Créer la page » : l'éditeur s'ouvre.",
  ],
  notes: [
    "Tout ce que tu écris est enregistré automatiquement, quelques secondes après chaque changement.",
    "Le niveau d'accès se choisit ensuite, dans l'éditeur : il n'y a pas de niveau par défaut.",
    "L'adresse d'une page vient de son titre. Si une autre page l'a déjà, la création est bloquée : change le titre. Ensuite, l'adresse ne suit plus le titre, et elle se modifie dans la carte « Adresse de la page ».",
    "Dans Le Fil et Radio Éclaircies, un contenu neuf arrive en tête de liste. Range la liste avec la poignée en tête de ligne : l'app montre les contenus en ligne dans cet ordre.",
  ],
}

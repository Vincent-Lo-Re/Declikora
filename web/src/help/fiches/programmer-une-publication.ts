import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "programmer-une-publication",
  theme: "publication",
  title: "Programmer une publication",
  summary:
    "Un contenu peut partir dans l'app tout seul, au jour et à l'heure choisis, à l'heure de Paris.",
  keywords: [
    "programmer",
    "planifier",
    "date",
    "heure",
    "plus tard",
    "publication programmée",
    "annuler",
  ],
  steps: [
    "Dans l'éditeur, ouvre le menu à côté de « Publier » et choisis « Programmer… ».",
    "Choisis le « Jour » (25/10/2099, ou dans le calendrier) et l'« Heure (Paris) », par exemple 08h00.",
    "Clique sur « Programmer » : un bandeau au-dessus du téléphone rappelle la date.",
    "Pour changer la date, choisis « Changer la programmation… » dans le même menu ; pour l'annuler, « Annuler la programmation ».",
  ],
  notes: [
    "C'est le dernier brouillon enregistré à cette heure-là qui part dans l'app : tu peux continuer à écrire d'ici là.",
    "Si quelqu'un a modifié le brouillon depuis la programmation et a encore l'éditeur ouvert à l'heure prévue, la publication attend qu'il le quitte, une heure au plus. Ensuite, elle échoue.",
    "Dans les listes (Le Fil, Radio Éclaircies, Pages), une pastille sur la ligne montre une publication programmée, en attente ou échouée.",
    "Il faut les mêmes réglages que pour publier : titre, image de présentation, audio d'un épisode, adresse d'une page.",
  ],
}

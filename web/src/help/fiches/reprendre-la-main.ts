import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "reprendre-la-main",
  theme: "contenus",
  title: "Reprendre la main sur un brouillon",
  summary:
    "Une seule personne écrit un brouillon à la fois : les autres le voient en lecture seule et peuvent reprendre la main.",
  keywords: [
    "lecture seule",
    "cadenas",
    "verrou",
    "prendre la main",
    "bloqué",
    "quelqu'un écrit",
    "plusieurs",
  ],
  steps: [
    "Ouvre le contenu : si quelqu'un l'écrit déjà, tu le vois en lecture seule, avec le cadenas « Lecture seule » en bas de la colonne de droite.",
    "Clique sur le cadenas pour voir qui écrit.",
    "Clique sur « Prendre la main » pour écrire : l'autre personne passe en lecture seule.",
    "Ou clique sur « Rester en lecture seule » pour la laisser finir : le brouillon se met à jour à chaque enregistrement.",
  ],
  notes: [
    "Si quelqu'un reprend la main pendant que tu écris, une fenêtre te le dit. « Copier mon texte » garde ce qui n'était pas encore enregistré.",
    "Si tu écris le même contenu dans un autre onglet, « Reprendre la main ici » fait passer l'autre onglet en lecture seule.",
    "Un onglet resté caché plus de 30 minutes libère le brouillon pour l'équipe : « Reprendre l'écriture » te rend la main.",
    "En Lecture, tu ne prends jamais la main : tu la prends en passant en Édition.",
  ],
}

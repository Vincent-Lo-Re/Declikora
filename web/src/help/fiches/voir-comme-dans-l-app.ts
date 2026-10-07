import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "voir-comme-dans-l-app",
  theme: "contenus",
  title: "Voir un contenu comme dans l'app",
  summary:
    "La Lecture montre le contenu comme dans l'app, sur iPhone ou Android, en clair ou en sombre, sans outils.",
  keywords: [
    "lecture",
    "aperçu",
    "téléphone",
    "iphone",
    "android",
    "mode sombre",
    "grand texte",
    "abonné",
  ],
  steps: [
    "Dans l'éditeur, clique sur « Lecture : comme dans l'app », dans la barre d'icônes à droite du téléphone.",
    "Choisis l'iPhone ou l'Android, le thème « Clair » ou « Sombre », et « Grand texte » si besoin.",
    "Choisis de lire comme un abonné à la bonne formule, ou comme une personne sans la formule.",
    "Clique sur « Écran entier » pour voir tout l'écran du téléphone, puis sur « Ajuster » pour revenir.",
    "Clique sur « Édition » pour écrire de nouveau.",
  ],
  notes: [
    "En Lecture, rien ne se modifie et tu ne prends pas la main : les autres peuvent écrire pendant que tu lis, et tu vois leurs changements.",
    "Un clic sur une ligne du Plan fait défiler le téléphone jusqu'au bloc, sans quitter la Lecture.",
    "Tes choix restent d'un écran à l'autre, même après un rechargement. Un contenu ouvert depuis une liste s'ouvre toujours en Édition.",
    "Sans la formule, un contenu réservé ne montre pas ses blocs : seulement l'image, le titre et l'invitation à prendre la formule.",
  ],
}

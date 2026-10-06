import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "decrire-ou-remplacer-un-fichier",
  theme: "mediatheque",
  title: "Décrire ou remplacer un fichier",
  summary:
    "La fiche d'un fichier donne son nom, son texte alternatif ou sa transcription, les contenus qui l'utilisent, et permet de le remplacer partout.",
  keywords: [
    "fiche",
    "texte alternatif",
    "transcription",
    "remplacer",
    "utilisé dans",
    "renommer",
    "accessibilité",
  ],
  steps: [
    "Dans « Médiathèque », clique sur un fichier pour ouvrir sa fiche.",
    "Dans la carte « Description », change son nom et écris le texte alternatif d'une image ou la transcription d'un audio, puis clique sur « Enregistrer ».",
    "Regarde la carte « Utilisé dans » pour savoir quels contenus s'en servent.",
    "Pour changer de fichier partout, clique sur « Remplacer… » et choisis un nouveau fichier du même type.",
    "Si des contenus en ligne montrent encore l'ancien fichier, clique sur « Mettre à jour ces contenus dans l'app ».",
  ],
  notes: [
    "Le nouveau fichier prend la place de l'ancien dans tous les brouillons, sauf ceux que quelqu'un écrit en ce moment, qui sont listés.",
    "Quand plus rien n'utilise l'ancien fichier, il part à la corbeille.",
    "Un texte alternatif ou une transcription changé ne passe dans les contenus en ligne qu'avec « Mettre à jour ces contenus dans l'app ».",
    "Un fichier encore utilisé ne peut pas être mis à la corbeille : retire-le d'abord des contenus.",
  ],
}

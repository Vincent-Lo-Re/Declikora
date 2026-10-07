import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "ecrire-avec-des-blocs",
  theme: "contenus",
  title: "Écrire avec des blocs",
  summary:
    "Un contenu est une suite de blocs (Texte, Image, Section) qu'on ajoute, qu'on écrit dans le téléphone et qu'on range dans le plan.",
  keywords: [
    "éditeur",
    "bloc",
    "ajouter un bloc",
    "plan",
    "déplacer",
    "supprimer",
    "mes blocs",
    "mise en forme",
  ],
  steps: [
    "Clique sur « Ajouter un bloc » : les Blocs s'ouvrent à gauche, par-dessus le Plan.",
    "Clique sur « Texte », « Image » ou « Section » pour l'ajouter sous le bloc choisi (ou à la fin), ou glisse-le dans le téléphone.",
    "Écris directement dans le téléphone, puis sélectionne des mots pour les mettre en forme avec la barre à gauche du téléphone.",
    "Clique sur un bloc pour ouvrir ses réglages à droite : le fichier et le texte alternatif d'une image, l'apparence d'une section.",
    "Range les blocs dans le Plan en glissant leur poignée, ou avec « Monter » et « Descendre » en bas des réglages du bloc.",
    "Pour retirer un bloc, clique sur « Supprimer le bloc » ; « Annuler » le remet pendant quelques secondes.",
  ],
  notes: [
    "« Mes blocs », dans les Blocs, propose tes mises en forme et tes blocs partagés (voir les modèles de bloc).",
    "Une section contient des textes et des images, pas d'autre section. Pour y ajouter un bloc, clique sur « Ajouter dans la section ».",
    "La Concentration (⌘ . ou Ctrl + .) cache les deux colonnes ; Échap les fait revenir.",
    "Tout s'enregistre automatiquement : l'état de l'enregistrement est en bas de la colonne de droite.",
  ],
}

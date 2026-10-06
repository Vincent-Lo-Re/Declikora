import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "envoyer-des-fichiers",
  theme: "mediatheque",
  title: "Envoyer des fichiers dans la Médiathèque",
  summary:
    "Les images, SVG, animations, audios et PDF s'envoient dans la Médiathèque, puis servent dans tous les contenus.",
  keywords: [
    "envoyer",
    "importer",
    "télécharger",
    "ajouter un fichier",
    "image",
    "audio",
    "photo",
    "glisser-déposer",
  ],
  steps: [
    "Ouvre « Médiathèque » dans le menu.",
    "Clique sur « Envoyer des fichiers » et choisis tes fichiers, ou glisse-les sur la page.",
    "Suis les envois dans la fenêtre des envois, en bas à droite.",
    "Quand un fichier est « Prêt », il peut servir dans les contenus.",
  ],
  notes: [
    "Formats acceptés : JPEG, PNG, WebP, GIF, HEIC, AVIF, SVG, Lottie (.json), MP3, M4A et PDF. Pas de vidéo.",
    "50 Mo au plus par fichier, 5 Mo pour un SVG ou une animation Lottie.",
    "Les photos sont réduites automatiquement avant l'envoi, sans différence visible, et les SVG sont nettoyés du code caché. D'un GIF animé, seule la première image est gardée.",
    "Dans l'éditeur, tu peux aussi envoyer une image au moment de la choisir, avec « Envoyer une image ».",
  ],
}

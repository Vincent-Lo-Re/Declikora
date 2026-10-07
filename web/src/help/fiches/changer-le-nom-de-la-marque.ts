import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "changer-le-nom-de-la-marque",
  theme: "equipe",
  title: "Changer le nom et les logos de la marque",
  summary:
    "Un admin donne son nom, son logotype, son monogramme et l'image de l'écran de connexion à l'administration, pour toute l'équipe.",
  keywords: [
    "marque",
    "nom",
    "ruche",
    "identité",
    "logo",
    "logotype",
    "monogramme",
    "favicon",
    "connexion",
    "image",
    "photo",
    "icône",
    "couleurs",
    "palette",
    "décliner",
    "paramètres",
    "titre",
  ],
  steps: [
    "Ouvre « Paramètres » dans le header, onglet « Identité de l'admin ».",
    "Écris le nom dans la carte « Nom de la marque », puis clique sur « Enregistrer ».",
    "Pour le logotype et le monogramme, clique sur l'image d'une carte (fond clair ou fond sombre), ou dépose ton fichier dessus.",
    "Pour l'image à droite de la page de connexion, fais de même avec la carte « Écran de connexion ».",
  ],
  notes: [
    "Le nom apparaît en haut du menu, au-dessus des pages de connexion et dans l'onglet du navigateur, pour toute l'équipe.",
    "Laisse le champ vide pour revenir à « Ruche ». Le nom fait 40 caractères au plus.",
    "Le logotype remplace le nom en haut du menu et à la connexion ; le monogramme sert d'icône dans l'onglet du navigateur. Une seule version sert pour les deux fonds ; sans fichier, le nom (ou son initiale) s'affiche.",
    "Les fichiers : SVG, PNG ou WebP, 1 Mo au plus. L'image de l'écran de connexion : JPEG, PNG ou WebP, réduite à l'envoi ; sans elle, le monogramme s'affiche sur le fond du menu.",
    "Un SVG aux couleurs modifiables (peu de couleurs pleines, sans image ni dégradé) peut être décliné aux couleurs des onze palettes : l'admin le propose après l'envoi. Chacun le voit alors aux couleurs de sa palette ; avec Neutrine, il garde ses couleurs, en clair sur fond sombre.",
    "Les e-mails d'invitation et de connexion ne changent pas de nom.",
    "L'app de double vérification garde le nom qu'elle avait quand chacun l'a configurée.",
  ],
}

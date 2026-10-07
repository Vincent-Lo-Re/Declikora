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
    "Dans la section « Marque », écris le nom et, si tu veux, une adresse e-mail de contact (montrée sur l'écran de connexion à qui a besoin d'aide), puis clique sur « Enregistre tes choix ».",
    "Dans la section « Logos », clique sur une case du logotype ou du monogramme (fond clair ou fond sombre), ou dépose ton fichier dessus.",
    "Dans la section « Écran de connexion », choisis l'image à droite du formulaire (ou dépose-la sur l'aperçu), et active ou désactive le monogramme animé.",
  ],
  notes: [
    "Le nom apparaît en haut du menu, au-dessus des pages de connexion et dans l'onglet du navigateur, pour toute l'équipe.",
    "Laisse le champ vide pour revenir au nom à défaut. Le nom fait 40 caractères au plus.",
    "Le logotype remplace le nom en haut du menu et à la connexion ; le monogramme sert d'icône dans l'onglet du navigateur. Une seule version sert pour les deux fonds ; sans fichier, le nom (ou son initiale) s'affiche.",
    "Les fichiers : SVG, PNG ou WebP, 1 Mo au plus. L'image de l'écran de connexion : JPEG, PNG ou WebP, réduite à l'envoi ; sans elle, l'image à défaut.",
    "Un SVG aux couleurs modifiables (peu de couleurs pleines, sans image ni dégradé) peut être décliné aux couleurs des onze palettes : l'admin le propose après l'envoi. Chacun le voit alors aux couleurs de sa palette ; avec Neutrine, il garde ses couleurs, en clair sur fond sombre.",
    "Les e-mails d'invitation et de connexion ne changent pas de nom.",
    "L'app de double vérification garde le nom qu'elle avait quand chacun l'a configurée.",
  ],
}

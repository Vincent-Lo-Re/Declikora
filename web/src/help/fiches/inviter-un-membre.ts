import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "inviter-un-membre",
  theme: "equipe",
  title: "Inviter un membre dans l'équipe",
  summary:
    "Un admin invite une personne par e-mail et choisit son rôle : Admin ou Éditeur.",
  keywords: [
    "inviter",
    "équipe",
    "membre",
    "rôle",
    "admin",
    "éditeur",
    "double vérification",
    "accès",
  ],
  steps: [
    "Ouvre « Équipe » (réservée aux admins) et clique sur « Inviter un membre ».",
    "Saisis son adresse e-mail et, si tu veux, son nom.",
    "Choisis son rôle : « Admin » ou « Éditeur ».",
    "Clique sur « Envoyer l'invitation ».",
    "Si le lien a expiré, ouvre le menu de sa ligne et choisis « Renvoyer l'invitation ».",
  ],
  notes: [
    "Le lien d'invitation est valable 10 minutes. Personne ne peut s'inscrire seul.",
    "Un éditeur écrit, publie et supprime les contenus, et gère les catégories, les modèles, la Médiathèque et la corbeille. Un admin fait tout cela, plus l'équipe et les Paramètres.",
    "À sa première connexion, la personne configure la double vérification avec une app de son téléphone (Google Authenticator, 1Password…).",
    "Téléphone perdu : un admin choisit « Réinitialiser la double vérification » dans le menu de sa ligne. Garde donc toujours au moins deux admins.",
  ],
}

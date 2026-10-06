import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "choisir-le-niveau-d-acces",
  theme: "publication",
  title: "Choisir qui peut lire un contenu",
  summary:
    "Chaque contenu a un niveau d'accès : « Gratuit » ou une formule d'abonnement, que les admins gèrent dans les Paramètres.",
  keywords: [
    "niveau d'accès",
    "gratuit",
    "formule",
    "abonnement",
    "abonné",
    "réservé",
    "payant",
    "paramètres",
  ],
  steps: [
    "Dans l'éditeur, trouve la carte « Niveau d'accès » dans la colonne de droite.",
    "Choisis « Gratuit » ou une formule dans la liste : le choix compte à la prochaine publication.",
    "Pour créer une formule (admins), ouvre « Paramètres », écris son nom dans « Ajouter une formule », puis clique sur « Ajouter ».",
    "Range les formules avec la poignée, de la moins complète (en haut) à la plus complète (en bas).",
  ],
  notes: [
    "Il n'y a pas de niveau par défaut : tant que tu n'as pas choisi, la liste dit « Choisis un niveau », et « Publier » le demande.",
    "Un abonné lit les contenus de sa formule et ceux des formules moins complètes. Changer l'ordre des formules change tout de suite ce que chaque abonné peut lire.",
    "Une formule utilisée par un contenu, une version publiée ou un abonné ne se supprime pas : renomme-la ou déplace-la plutôt.",
    "Le niveau d'accès se change aussi depuis une liste : menu « … » de la ligne, puis « Réglages ».",
  ],
}

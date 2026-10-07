import type { HelpFiche } from "@/help/types"

export const fiche: HelpFiche = {
  slug: "utiliser-les-modeles-de-bloc",
  theme: "modeles",
  title: "Créer et utiliser un modèle de bloc",
  summary:
    "Un modèle de bloc est une mise en forme à recopier, un bloc partagé identique partout, ou un point de départ pour un nouveau contenu.",
  keywords: [
    "modèle",
    "mise en forme",
    "bloc partagé",
    "point de départ",
    "mes blocs",
    "réutiliser",
    "gabarit",
  ],
  steps: [
    "Ouvre « Modèles de bloc » et clique sur « Nouveau modèle ».",
    "Donne-lui un nom et choisis son type : « Mise en forme », « Bloc partagé » ou « Point de départ » (avec sa section). Le type ne changera plus.",
    "Clique sur « Créer le modèle », puis écris ses blocs dans l'éditeur.",
    "Dans un contenu, ajoute une mise en forme ou un bloc partagé depuis « Mes blocs », dans les Blocs.",
    "Un point de départ se choisit en créant un contenu, dans la liste « Point de départ » de la fenêtre.",
  ],
  notes: [
    "Une mise en forme est recopiée : modifier le modèle ne change pas les contenus déjà écrits.",
    "Un bloc partagé contient un seul bloc. Corrigé dans le modèle, il l'est dans tous les brouillons qui l'utilisent ; l'app ne change qu'après « Mettre à jour ces contenus dans l'app ». « Détacher » en fait une copie ordinaire dans un contenu.",
    "Un bloc partagé encore utilisé ne va pas à la corbeille : « Détacher partout » en fait d'abord des copies ordinaires.",
    "Tu peux aussi créer un modèle depuis un contenu : « Choisir des blocs » dans le Plan, ou « Enregistrer comme modèle… » sur un bloc.",
  ],
}

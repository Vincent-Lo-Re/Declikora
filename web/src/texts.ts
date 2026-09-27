// Tous les textes de l'interface, en français, au même endroit.

export const texts = {
  app: {
    name: "Declikora",
    title: "Declikora — Administration",
  },

  common: {
    close: "Fermer",
  },

  nav: {
    label: "Menu principal",
    description: "Les sections de l'administration.",
    footerLabel: "Équipe et compte",
    toggle: "Afficher ou masquer le menu",
    groups: {
      contents: "Contenus",
      tools: "Outils",
    },
  },

  // Titre et présentation de chaque section, dans le menu et en tête de page.
  sections: {
    home: {
      title: "Accueil",
      description: "Brouillons récents et publications programmées.",
    },
    blog: {
      title: "Blog",
      description: "Les articles et leurs catégories.",
    },
    podcasts: {
      title: "Podcasts",
      description: "Les épisodes et leurs catégories.",
    },
    methods: {
      title: "Méthodes",
      description: "Les méthodes, leurs chapitres et leurs leçons.",
    },
    pages: {
      title: "Pages",
      description: "Les pages simples de l'app.",
    },
    templates: {
      title: "Modèles",
      description: "Les modèles de blocs, à réutiliser dans les contenus.",
    },
    media: {
      title: "Médiathèque",
      description: "Les images, sons, animations et documents.",
    },
    trash: {
      title: "Corbeille",
      description: "Ce qui a été supprimé, restaurable pendant 30 jours.",
    },
    team: {
      title: "Équipe",
      description: "Les membres de l'équipe et leurs rôles.",
    },
    settings: {
      title: "Paramètres",
      description: "Les formules d'abonnement.",
    },
    account: {
      title: "Mon compte",
      description: "Tes préférences d'affichage.",
    },
  },

  comingSoon: {
    title: "Bientôt disponible",
    description: "Cette section sera construite dans une prochaine étape.",
  },

  theme: {
    title: "Thème",
    description: "Clair, sombre, ou automatique pour suivre l'ordinateur.",
    light: "Clair",
    dark: "Sombre",
    system: "Automatique",
  },

  smallScreen: {
    title: "Écran trop petit",
    message:
      "L'administration est faite pour un ordinateur. Agrandis la fenêtre ou passe sur un ordinateur.",
  },

  notFound: {
    title: "Page introuvable",
    description:
      "Cette adresse ne correspond à aucune page de l'administration.",
    back: "Retour à l'accueil",
  },

  error: {
    title: "Une erreur est survenue",
    description:
      "Quelque chose s'est mal passé. L'erreur a été signalée. Recharge la page pour réessayer.",
    reload: "Recharger la page",
  },

  dates: {
    // Entre la date et l'heure : « 27 sept. 2026 à 14:30 »
    at: "à",
  },
} as const

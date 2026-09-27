// Tous les textes de l'interface, en français, au même endroit.

export const texts = {
  app: {
    name: "Declikora",
    title: "Declikora — Administration",
  },

  common: {
    close: "Fermer",
    cancel: "Annuler",
    loading: "Chargement…",
    signOut: "Se déconnecter",
    tooManyAttempts: "Trop d'essais. Attends une minute avant de réessayer.",
    unexpected:
      "Un problème est survenu. Vérifie ta connexion, puis réessaie dans un instant.",
  },

  roles: {
    admin: "Admin",
    editor: "Éditeur",
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
      description: "Ton profil, ta sécurité et tes préférences d'affichage.",
    },
  },

  comingSoon: {
    title: "Bientôt disponible",
    description: "Cette section sera construite dans une prochaine étape.",
  },

  // Connexion : e-mail, puis code reçu par e-mail, puis double vérification.
  signIn: {
    title: "Connexion",
    description:
      "Saisis ton adresse e-mail. Tu recevras un code à 6 chiffres pour te connecter.",
    email: "Adresse e-mail",
    emailPlaceholder: "prenom@exemple.fr",
    invalidEmail: "Saisis une adresse e-mail valide.",
    sendCode: "Recevoir un code",
    codeTitle: "Saisis le code reçu",
    // Même message que l'adresse fasse partie de l'équipe ou non.
    codeSent: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code vient d'y être envoyé. Il est valable 10 minutes.`,
    // Nouvelle demande trop rapprochée : le code déjà envoyé reste valable.
    codeAlreadySent: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code y a déjà été envoyé il y a moins d'une minute. Saisis-le, ou attends une minute avant d'en demander un nouveau.`,
    // Après un rechargement de la page.
    codeStillValid: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code y a été envoyé. Il est valable 10 minutes.`,
    // Une invitation pas encore acceptée ne permet pas de recevoir un code.
    invitedHint:
      "Tu as été invité ? Ouvre plutôt le lien de l'e-mail d'invitation, ou demande à un admin de te le renvoyer.",
    code: "Code reçu par e-mail",
    invalidCode: "Le code contient 6 chiffres.",
    wrongCode:
      "Code incorrect ou expiré. Vérifie-le, ou demande un nouveau code.",
    submitCode: "Se connecter",
    resendCode: "Recevoir un nouveau code",
    codeResent:
      "Si l'adresse fait partie de l'équipe, un nouveau code est parti.",
    otherEmail: "Changer d'adresse",
  },

  mfa: {
    setupTitle: "Configure la double vérification",
    setupDescription:
      "Elle protège l'administration : après le code reçu par e-mail, tu saisiras le code d'une app de ton téléphone. Tu ne la configures qu'une fois.",
    installApp:
      "Installe une app de double vérification sur ton téléphone (Google Authenticator, 1Password…).",
    scan: "Dans l'app, ajoute un compte en scannant ce QR code.",
    qrCode: "QR code à scanner avec l'app de ton téléphone",
    secret: "Pas de caméra ? Saisis plutôt cette clé dans l'app :",
    enterCode: "Saisis le code à 6 chiffres affiché par l'app.",
    setupFailed:
      "La configuration n'a pas pu démarrer. Recharge la page pour réessayer.",
    verifyTitle: "Double vérification",
    verifyDescription:
      "Saisis le code à 6 chiffres affiché par l'app de ton téléphone.",
    code: "Code de l'app",
    invalidCode: "Le code contient 6 chiffres.",
    wrongCode:
      "Code incorrect. Vérifie l'heure de ton téléphone, puis réessaie avec le code suivant.",
    submit: "Valider",
    lostPhone:
      "Téléphone perdu ? Demande à un admin de réinitialiser ta double vérification.",
  },

  invitation: {
    title: "Rejoindre l'équipe",
    description:
      "Un admin t'invite à rejoindre l'administration de Declikora. Ensuite, tu configureras la double vérification.",
    accept: "Accepter l'invitation",
    expired:
      "Ce lien a expiré ou a déjà servi. Demande à un admin de te renvoyer l'invitation.",
    incomplete:
      "Ce lien d'invitation est incomplet. Ouvre le lien reçu par e-mail, ou demande à un admin de te renvoyer l'invitation.",
    toSignIn: "Aller à la connexion",
  },

  adminOnly: {
    title: "Réservé aux admins",
    description:
      "Cette section est réservée aux admins de l'équipe. Demande à un admin si tu as besoin d'y accéder.",
    back: "Retour à l'accueil",
  },

  account: {
    profile: {
      title: "Profil",
      description: "Ton nom apparaît auprès de l'équipe.",
      name: "Nom",
      namePlaceholder: "Prénom Nom",
      nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
      save: "Enregistrer",
      saved: "Nom enregistré.",
      email: "Adresse e-mail",
      role: "Rôle",
    },
    mfa: {
      title: "Double vérification",
      configuredOn: (date: string) => `Configurée le ${date}.`,
      lostPhone:
        "Téléphone perdu ? Demande à un admin de réinitialiser ta double vérification.",
    },
    signOut: {
      title: "Déconnexion",
      description: "Ferme ta session sur ce navigateur.",
    },
  },

  team: {
    invite: "Inviter un membre",
    inviteDescription:
      "La personne reçoit un e-mail avec un lien pour rejoindre l'équipe. Le lien est valable 10 minutes : tu pourras le renvoyer s'il expire.",
    email: "Adresse e-mail",
    emailPlaceholder: "prenom@exemple.fr",
    invalidEmail: "Saisis une adresse e-mail valide.",
    name: "Nom (facultatif)",
    namePlaceholder: "Prénom Nom",
    nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
    role: "Rôle",
    sendInvitation: "Envoyer l'invitation",
    invited: (email: string) => `Invitation envoyée à ${email}.`,
    loadFailed: "La liste de l'équipe n'a pas pu être chargée.",
    refreshFailed:
      "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
    singleAdmin:
      "Tu es le seul admin à avoir configuré la double vérification. Nomme un deuxième admin : si tu perds ton téléphone, c'est lui qui réinitialisera la tienne.",
    retry: "Réessayer",
    columns: {
      member: "Membre",
      role: "Rôle",
      status: "État",
      lastSignIn: "Dernière connexion",
      mfa: "Double vérification",
      actions: "Actions",
    },
    status: {
      invited: "Invitation envoyée",
      expired: "Invitation expirée",
      active: "Actif",
    },
    you: "Toi",
    noName: "Sans nom",
    never: "Jamais",
    mfaOn: "Configurée",
    mfaOff: "Pas encore",
    actions: {
      open: (member: string) => `Actions pour ${member}`,
      resend: "Renvoyer l'invitation",
      makeAdmin: "Passer admin",
      makeEditor: "Passer éditeur",
      resetMfa: "Réinitialiser la double vérification",
      remove: "Retirer de l'équipe",
    },
    done: {
      resent: "Invitation renvoyée.",
      role: "Rôle modifié.",
      resetMfa:
        "Double vérification réinitialisée. Elle sera à configurer à la prochaine connexion.",
      removed: "Membre retiré de l'équipe.",
    },
    confirmRemove: {
      title: "Retirer ce membre ?",
      description: (member: string) =>
        `${member} n'aura plus accès à l'administration et son compte sera supprimé.`,
      confirm: "Retirer",
    },
    confirmResetMfa: {
      title: "Réinitialiser la double vérification ?",
      description: (member: string) =>
        `${member} sera déconnecté de l'administration et devra configurer à nouveau la double vérification avec son téléphone.`,
      confirm: "Réinitialiser",
    },
    // Erreurs renvoyées par la fonction serveur « equipe », selon leur code.
    errors: {
      non_connecte: "Ta session a expiré. Reconnecte-toi pour continuer.",
      reserve_aux_admins: "Cette action est réservée aux admins.",
      soi_meme:
        "Tu ne peux pas faire ça sur ton propre compte. Demande à un autre admin.",
      demande_invalide:
        "La demande n'est pas valide. Vérifie les informations saisies.",
      introuvable: "Ce membre n'existe plus. Recharge la liste.",
      deja_membre: "Cette adresse fait déjà partie de l'équipe.",
      deja_acceptee: "Cette personne a déjà accepté son invitation.",
      dernier_admin:
        "L'équipe doit garder au moins un admin qui a accepté son invitation et configuré la double vérification. Nomme d'abord un autre admin.",
      trop_de_demandes: "Trop d'e-mails envoyés. Réessaie dans une minute.",
    },
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

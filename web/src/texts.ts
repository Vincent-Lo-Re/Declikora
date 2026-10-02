// Tous les textes de l'interface, en français, au même endroit.

/** « la leçon… » → « La leçon… » (en début de phrase). */
const upperFirst = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1)

export const texts = {
  app: {
    name: "Declikora",
  },

  // Les mots de l'interface qui ne dépendent pas de la page : une seule fois ici.
  common: {
    close: "Fermer",
    cancel: "Annuler",
    retry: "Réessayer",
    save: "Enregistrer",
    untitled: "Sans titre",
    actions: "Actions",
    clearSearch: "Effacer la recherche",
    // « Modifié le 27 sept. 2026 à 14h30 par Anne »
    savedBy: (name: string) => `par ${name}`,
    loading: "Chargement…",
    signOut: "Se déconnecter",
    tooManyAttempts: "Trop d'essais. Attends une minute avant de réessayer.",
    unexpected:
      "Un problème est survenu. Vérifie ta connexion, puis réessaie dans un instant.",
  },

  // Sélection en masse (Médiathèque, listes de contenus) : les mots qui ne dépendent pas de la page.
  selection: {
    select: (name: string) => `Sélectionner ${name}`,
    selectAll: "Tout sélectionner",
    trash: (count: number) => `Mettre à la corbeille (${count})`,
    keptItem: (name: string, detail: string) => `${name} — ${detail}`,
    closeKept: "Fermer ce message",
  },

  roles: {
    admin: "Admin",
    editor: "Éditeur",
  },

  nav: {
    label: "Menu principal",
    description: "Les sections de l'administration.",
    footerLabel: "Équipe et Paramètres",
    open: "Ouvrir la navigation",
    close: "Refermer la navigation",
    groups: {
      contents: "Contenus",
      tools: "Outils",
    },
  },

  // Titre et présentation de chaque section, dans le menu et en tête de page.
  sections: {
    home: {
      title: "Tableau de bord",
      description: "Brouillons récents et publications programmées.",
    },
    blog: {
      title: "Le Fil",
      description: "Les articles et leurs catégories.",
    },
    podcasts: {
      title: "Radio Éclaircies",
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
      title: "Modèles de bloc",
      description: "Les modèles de bloc, à réutiliser dans les contenus.",
    },
    media: {
      title: "Médiathèque",
      description:
        "JPEG, PNG, WebP, GIF, HEIC, AVIF, SVG, Lottie, MP3, M4A et PDF.",
    },
    trash: {
      title: "Corbeille",
      description:
        "Ce qui a été mis à la corbeille, restaurable pendant 30 jours.",
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

  // Accueil (étape 7) : ce qui attend l'équipe.
  home: {
    drafts: {
      title: "Mes brouillons récents",
      description: "Ce que tu as modifié en dernier.",
      empty:
        "Tu n'as encore rien écrit. Commence par un article, un épisode, une méthode ou une page.",
    },
    scheduled: {
      title: "Publications programmées",
      description:
        "Dans l'ordre où elles partiront dans l'app. Une programmation en attente attend que la personne qui écrit ait quitté l'éditeur.",
      empty: "Aucune publication programmée.",
      by: (name: string) => `programmée par ${name}`,
    },
    failed: {
      title: "Programmations échouées",
      description:
        "Elles ne sont pas parties dans l'app. Ouvre le contenu pour le programmer de nouveau, ou pour effacer l'échec.",
      empty: "Aucune programmation échouée.",
      reason: (reason: string) => `Raison : ${reason}`,
      by: (name: string) => `Programmée par ${name}.`,
    },
    savedAt: (date: string) => `Modifié le ${date}`,
    inMethod: (title: string) => `Méthode « ${title} »`,
    loadFailed: "Cette liste n'a pas pu être chargée.",
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
    back: "Retour au tableau de bord",
  },

  account: {
    profile: {
      title: "Profil",
      description: "Ton nom apparaît auprès de l'équipe.",
      name: "Nom",
      namePlaceholder: "Prénom Nom",
      nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
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
    columns: {
      member: "Membre",
      role: "Rôle",
      status: "État",
      lastSignIn: "Dernière connexion",
      mfa: "Double vérification",
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

  media: {
    upload: "Envoyer des fichiers",
    uploadInput: "Fichiers à envoyer",
    dropTitle: "Dépose tes fichiers ici",
    dropHint:
      "Images, SVG, animations Lottie (.json), audios (MP3, M4A) et PDF. 50 Mo au plus par fichier.",
    search: "Rechercher un fichier",
    searchPlaceholder: "Rechercher par nom…",
    filters: {
      label: "Type de fichier",
      all: "Tout",
      image: "Images",
      svg: "SVG",
      lottie: "Animations",
      audio: "Audios",
      pdf: "PDF",
      // Ni dans un brouillon ni dans une version en ligne : la règle de la corbeille.
      unused: "Non utilisés",
    },
    // Pastille d'un fichier qui ne sert dans aucun contenu, ou qui sert.
    unused: "Non utilisé",
    used: "Utilisé",
    kinds: {
      image: "Image",
      svg: "SVG",
      lottie: "Animation",
      audio: "Audio",
      pdf: "PDF",
    },
    view: {
      label: "Affichage",
      grid: "Grille",
      list: "Liste",
    },
    status: {
      pending: "Envoi en cours…",
      interrupted: "Envoi interrompu",
      checking: "Vérification…",
      ready: "Prêt",
      rejected: "Refusé",
    },
    rejectedBecause: (reason: string) => `Refusé : ${reason}`,
    // Unités (web/src/lib/media/format.ts) : « 812 octets », « 3 min 05 s », « 1200 × 800 px ».
    units: {
      bytes: (value: string) => `${value} octets`,
      kilobytes: (value: string) => `${value} Ko`,
      megabytes: (value: string) => `${value} Mo`,
      gigabytes: (value: string) => `${value} Go`,
      hoursMinutes: (hours: number, minutes: string) =>
        `${hours} h ${minutes} min`,
      minutesSeconds: (minutes: number, seconds: string) =>
        `${minutes} min ${seconds} s`,
      seconds: (seconds: number) => `${seconds} s`,
      dimensions: (width: number, height: number) => `${width} × ${height} px`,
      percent: (value: number) => `${value} %`,
    },
    // Codes de media.reject_reason (fonction « files » et media_confirm).
    rejectReasons: {
      fichier_incoherent:
        "le fichier reçu ne correspond pas à celui annoncé. Envoie-le de nouveau.",
      fichier_trop_lourd:
        "fichier trop lourd pour être vérifié (5 Mo au plus).",
      verification_impossible:
        "la vérification a échoué trois fois. Envoie-le de nouveau.",
      svg_illisible: "ce SVG est illisible.",
      svg_element_interdit:
        "ce SVG contient un élément interdit (script, animation, lien…).",
      svg_attribut_interdit:
        "ce SVG contient un attribut interdit (code caché, style actif…).",
      svg_lien_externe:
        "ce SVG charge une image, une police ou un style extérieur.",
      lottie_illisible: "ce fichier d'animation est illisible (JSON invalide).",
      lottie_invalide: "ce n'est pas une animation Lottie valide.",
      lottie_lien_externe:
        "cette animation charge une image ou une police extérieure.",
      inconnue: "le fichier n'a pas été accepté.",
    },
    rejectedCleanup:
      "Il sera retiré automatiquement de la médiathèque dans les 24 heures.",
    columns: {
      preview: "Aperçu",
      name: "Nom",
      kind: "Type",
      size: "Poids",
      createdAt: "Ajouté le",
      status: "État",
    },
    open: (name: string) => `Ouvrir la fiche de ${name}`,
    // Sélection en masse (cases des vignettes et de la liste).
    selection: {
      trashed: (count: number) =>
        count === 1
          ? "1 fichier mis à la corbeille."
          : `${count} fichiers mis à la corbeille.`,
      restored: (count: number) =>
        count === 1 ? "1 fichier restauré." : `${count} fichiers restaurés.`,
      keptTitle: (count: number) =>
        count === 1
          ? "1 fichier gardé : il est encore utilisé"
          : `${count} fichiers gardés : ils sont encore utilisés`,
      keptHint: (count: number) =>
        count === 1
          ? "Retire-le d'abord des contenus. Il reste sélectionné."
          : "Retire-les d'abord des contenus. Ils restent sélectionnés.",
    },
    empty: {
      title: "Aucun fichier pour l'instant",
      description:
        "Envoie des images, des audios, des animations ou des PDF : ils serviront dans les contenus.",
    },
    noResults: {
      title: "Aucun fichier trouvé",
      description: "Essaie un autre nom ou un autre type.",
    },
    noUnused: {
      title: "Tous les fichiers servent",
      description:
        "Aucun fichier non utilisé ici : chacun est dans un brouillon ou un contenu en ligne.",
    },
    tooMany: (count: number) =>
      `Seuls les ${count} fichiers les plus récents sont affichés. Affine ta recherche pour trouver les autres.`,
    loadFailed: "La médiathèque n'a pas pu être chargée.",
    refreshFailed:
      "La médiathèque n'a pas pu être mise à jour : elle date peut-être un peu.",
    storage: {
      label: "Place occupée",
      value: (used: string, total: string) => `${used} sur ${total}`,
      alertTitle: "Stockage presque plein",
      alert: (used: string) =>
        `Les fichiers occupent ${used} sur 1 Go. Au-delà, plus aucun envoi ne sera possible : mets à la corbeille ce qui ne sert plus, puis vide-la.`,
    },
    orphans: {
      title: (count: number) =>
        count === 1
          ? "1 fichier sans fiche dans le stockage"
          : `${count} fichiers sans fiche dans le stockage`,
      description: (date: string) =>
        `Trouvés au contrôle du ${date}. Ce sont des restes d'envois interrompus : ils occupent de la place sans apparaître dans la médiathèque.`,
      show: "Voir la liste",
      hide: "Masquer la liste",
      more: (count: number) => `… et ${count} de plus`,
      clean: "Nettoyer",
      cleaned: (count: number) =>
        count === 0
          ? "Rien à effacer : ces fichiers ont moins de 24 heures ou ont retrouvé leur fiche."
          : count === 1
            ? "1 fichier effacé du stockage."
            : `${count} fichiers effacés du stockage.`,
    },
    uploads: {
      // Nom de la fenêtre des envois (en bas à droite) pour les lecteurs d'écran.
      title: "Envois",
      summary: {
        active: (count: number) =>
          count === 1 ? "1 envoi en cours" : `${count} envois en cours`,
        failed: (count: number) =>
          count === 1 ? "1 envoi a échoué" : `${count} envois ont échoué`,
        ready: (count: number) =>
          count === 1 ? "1 fichier prêt" : `${count} fichiers prêts`,
        cancelled: "Envois annulés",
      },
      collapse: "Réduire la fenêtre des envois",
      expand: "Afficher le détail des envois",
      close: "Fermer la fenêtre des envois",
      cancel: (name: string) => `Annuler l'envoi de ${name}`,
      retry: (name: string) => `Réessayer l'envoi de ${name}`,
      dismiss: (name: string) => `Retirer ${name} de la liste`,
      stages: {
        waiting: "En attente",
        preparing: "Préparation…",
        sending: "Envoi…",
        confirming: "Enregistrement…",
        done: "Prêt",
        error: "Échec",
        cancelled: "Annulé",
      },
      checking: "Envoyé, vérification en cours",
      checked: "Vérifié et prêt",
      announcerLabel: "Suivi des envois",
      // Annonces lues par les lecteurs d'écran (une par étape, pas à chaque pourcentage).
      announce: {
        sending: (name: string) => `Envoi de ${name}…`,
        checking: (name: string) =>
          `${name} est envoyé. Vérification en cours.`,
        ready: (name: string) => `${name} est envoyé et prêt.`,
        rejected: (name: string, reason: string) =>
          `${name} est refusé : ${reason}`,
        failed: (name: string, error: string) =>
          `Échec de l'envoi de ${name}. ${error}`,
        cancelled: (name: string) => `Envoi de ${name} annulé.`,
      },
      resumable: "Envoi reprenable",
      gifWarning:
        "GIF animé : seule la première image est gardée. Pour une animation, utilise un fichier Lottie.",
      leaveWarning: "Des fichiers sont en cours d'envoi.",
    },
    // Refus avant l'envoi (préparation dans le navigateur).
    prepareErrors: {
      type_refuse:
        "Format refusé. Envoie une image (JPEG, PNG, WebP, GIF, HEIC, AVIF), un SVG, une animation Lottie (.json), un audio (MP3, M4A) ou un PDF.",
      video_refusee:
        "Les vidéos ne sont pas acceptées. Pour un son, envoie un MP3 ou un M4A.",
      fichier_vide: "Ce fichier est vide.",
      fichier_trop_lourd: "Fichier trop lourd : 50 Mo au plus.",
      fichier_a_verifier_trop_lourd:
        "Fichier trop lourd : 5 Mo au plus pour un SVG ou une animation Lottie.",
      image_illisible:
        "Cette image est illisible par ton navigateur. Enregistre-la en JPEG ou en PNG, puis envoie-la de nouveau.",
      heic_illisible:
        "Ton navigateur ne sait pas lire les photos HEIC (iPhone). Ouvre-la avec Safari, ou enregistre-la en JPEG, puis envoie-la de nouveau.",
      svg_illisible:
        "Ce SVG est illisible, ou il déclare des entités (refusées par sécurité).",
      svg_element_interdit:
        "Ce SVG contient un élément qui ne peut pas être retiré sans l'abîmer.",
      svg_attribut_interdit:
        "Ce SVG contient un attribut qui ne peut pas être retiré sans l'abîmer.",
      svg_lien_externe:
        "Ce SVG charge une ressource extérieure qui ne peut pas être retirée.",
      lottie_illisible:
        "Ce fichier .json est illisible : ce n'est pas du JSON valide.",
      lottie_invalide:
        "Ce fichier .json n'est pas une animation Lottie valide (calques, taille, images par seconde…).",
      lottie_lien_externe:
        "Cette animation charge une image ou une police extérieure. Exporte-la avec les images intégrées.",
    },
    transferErrors: {
      annule: "Envoi annulé.",
      envoi_interrompu:
        "L'envoi a été interrompu. Vérifie ta connexion, puis réessaie.",
      fichier_trop_lourd: "Fichier trop lourd : 50 Mo au plus.",
      type_refuse: "Ce type de fichier est refusé par le stockage.",
      envoi_refuse: "Le stockage a refusé l'envoi. Réessaie dans un instant.",
      deja_envoye: "Ce fichier a déjà été envoyé.",
    },
    // « Remplacer… » dans la fiche d'un fichier ([D48]) : un nouveau fichier du même type.
    replace: {
      title: "Remplacer ce fichier",
      description:
        "Envoie un nouveau fichier du même type : une fois prêt, il prend sa place dans tous les brouillons. Ce qui est en ligne ne change qu'à ta demande.",
      action: "Remplacer…",
      input: "Nouveau fichier",
      uploading: "Envoi du nouveau fichier…",
      checking: "Vérification du nouveau fichier…",
      replacing: "Remplacement dans les brouillons…",
      replaced: (count: number) =>
        count === 0
          ? "Aucun brouillon n'utilisait ce fichier."
          : count === 1
            ? "Remplacé dans 1 brouillon."
            : `Remplacé dans ${count} brouillons.`,
      kept: (count: number) =>
        count === 1
          ? "1 brouillon n'a pas changé : quelqu'un l'écrit en ce moment."
          : `${count} brouillons n'ont pas changé : quelqu'un les écrit en ce moment.`,
      keptItem: (title: string, holder: string) =>
        `« ${title || "Sans titre"} » (${holder})`,
      retryKept: "Réessayer pour ces brouillons",
      live: (count: number) =>
        count === 1
          ? "1 contenu en ligne montre encore l'ancien fichier."
          : `${count} contenus en ligne montrent encore l'ancien fichier.`,
      push: (count: number) =>
        count === 1
          ? "Mettre à jour ce contenu dans l'app"
          : `Mettre à jour ces ${count} contenus dans l'app`,
      pushed: (count: number) =>
        count === 1
          ? "1 contenu mis à jour dans l'app."
          : `${count} contenus mis à jour dans l'app.`,
      oldTrashed:
        "Plus rien n'utilise l'ancien fichier : il est dans la corbeille.",
      openNew: "Ouvrir le nouveau fichier",
      rejected: (reason: string) => `Le nouveau fichier est refusé : ${reason}`,
      failed: "L'envoi du nouveau fichier a échoué.",
    },
    detail: {
      noPreview: "Pas d'aperçu pour ce fichier.",
      openFile: "Ouvrir le fichier",
      lottieFailed: "L'aperçu de l'animation n'a pas pu s'afficher.",
      name: "Nom",
      nameRequired: "Donne un nom au fichier.",
      nameTooLong: "Le nom ne doit pas dépasser 255 caractères.",
      alt: "Texte alternatif",
      altHint:
        "Décris l'image en une phrase pour les personnes qui ne la voient pas. Laisse vide si elle est purement décorative.",
      altTooLong: "Le texte alternatif ne doit pas dépasser 1 000 caractères.",
      transcript: "Transcription",
      transcriptHint: "Le texte de l'audio, pour qui ne peut pas l'écouter.",
      transcriptTooLong:
        "La transcription ne doit pas dépasser 200 000 caractères.",
      saved: "Fiche enregistrée.",
      info: "Informations",
      kind: "Type",
      dimensions: "Dimensions",
      duration: "Durée",
      size: "Poids",
      createdAt: "Ajouté le",
      visibility: "Accès",
      public:
        "Public (utilisé par un contenu gratuit en ligne, ou image de présentation)",
      protected: "Protégé",
      uses: "Utilisé dans",
      usesLoading: "Recherche des contenus…",
      notUsed:
        "Ce fichier n'est utilisé dans aucun contenu pour l'instant. Tu peux l'insérer dans un contenu depuis l'éditeur (bloc Image).",
      usesFailed: "La liste des contenus n'a pas pu être chargée.",
      inDraft: "Brouillon",
      inApp: "Dans l'app",
      usesLive: "En ligne dans l'app",
      usesDrafts: "Dans les brouillons",
      usesLiveHint:
        "L'app montre la version publiée : ses textes ne changent qu'à la prochaine publication.",
      // Textes figés à la publication ([D30], option B).
      outdated: {
        title: (count: number) =>
          count === 1
            ? "1 contenu en ligne montre encore l'ancien texte"
            : `${count} contenus en ligne montrent encore l'ancien texte`,
        description:
          "Le texte alternatif ou la transcription a changé depuis leur publication. Seuls les textes de ce fichier seront remplacés dans l'app : le reste des brouillons ne part pas.",
        version: (number: number, date: string) =>
          `version n° ${number}, publiée le ${date}`,
        push: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app"
            : `Mettre à jour ces ${count} contenus dans l'app`,
        pushed: (count: number) =>
          count === 0
            ? "Rien à mettre à jour : l'app a déjà les bons textes."
            : count === 1
              ? "1 contenu mis à jour dans l'app."
              : `${count} contenus mis à jour dans l'app.`,
        failed:
          "La liste des contenus à mettre à jour n'a pas pu être chargée.",
      },
      trash: "Mettre à la corbeille",
      trashed: "Fichier mis à la corbeille.",
      undo: "Annuler",
      restored: "Fichier restauré.",
      used: "Ce fichier est encore utilisé : retire-le d'abord des contenus.",
    },
    // Erreurs de la base (RPC) et de la fonction « files », selon leur code.
    errors: {
      reserve_a_l_equipe:
        "Ta session ne donne plus accès à la médiathèque. Reconnecte-toi.",
      non_connecte: "Ta session a expiré. Reconnecte-toi pour continuer.",
      type_refuse: "Ce type de fichier n'est pas accepté.",
      nom_invalide: "Le nom du fichier doit faire entre 1 et 255 caractères.",
      fichier_vide: "Ce fichier est vide.",
      fichier_trop_lourd:
        "Fichier trop lourd : 50 Mo au plus, 5 Mo pour un SVG ou une animation Lottie.",
      fichier_invalide: "Les informations du fichier ne sont pas valides.",
      fichier_introuvable:
        "Ce fichier n'existe plus ou est dans la corbeille. Recharge la page.",
      fichier_absent:
        "Le fichier n'est pas arrivé dans le stockage. Réessaie dans un instant.",
      envoi_expire: "Cet envoi a expiré. Envoie le fichier de nouveau.",
      fichier_utilise:
        "Ce fichier est encore utilisé : retire-le d'abord des contenus.",
      fichier_pas_pret:
        "Le nouveau fichier n'est pas encore prêt : attends la fin de sa vérification.",
      type_different: "Le nouveau fichier doit être du même type que l'ancien.",
      effacement_demande: "L'effacement de ce fichier est déjà en cours.",
      demande_invalide: "La demande n'est pas valide. Recharge la page.",
      reserve_aux_admins: "Cette action est réservée aux admins.",
      methode_refusee: "La demande n'est pas valide. Recharge la page.",
      trop_tot: "Trop de demandes rapprochées. Réessaie dans une minute.",
      erreur_serveur:
        "Le serveur n'a pas pu terminer. Réessaie dans un instant.",
    },
  },

  trash: {
    filters: {
      // Les sections d'où viennent les éléments, avec leurs noms du menu.
      label: "Type d'élément",
      all: "Tout",
      file: "Médiathèque",
      page: "Pages",
      article: "Le Fil",
      episode: "Radio Éclaircies",
      method: "Méthodes",
      template: "Modèles de bloc",
    },
    itemTypes: {
      file: "Fichier",
      content: "Contenu",
    },
    // Sorte d'un contenu dans la corbeille.
    contentKinds: {
      article: "Article",
      episode: "Épisode",
      method: "Méthode",
      chapter: "Chapitre",
      lesson: "Leçon",
      page: "Page",
      template: "Modèle de bloc",
    },
    // Ce qui est parti avec une méthode (même lot) : restauré ou effacé avec elle.
    batch: (count: number) =>
      count === 1 ? "avec 1 élément" : `avec ${count} éléments`,
    batchList: (names: string) => `Dans le même lot : ${names}.`,
    eraseSelection: (count: number) => `Effacer définitivement (${count})`,
    confirmSelection: {
      title: (count: number) =>
        count === 1
          ? "Effacer définitivement cet élément ?"
          : "Effacer définitivement ces éléments ?",
      description: (count: number) =>
        count === 1
          ? "L'élément sélectionné sera effacé définitivement. Tu ne pourras pas revenir en arrière."
          : `Les ${count} éléments sélectionnés seront effacés définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Effacer définitivement",
    },
    // Seules les pages ont une adresse.
    restoredWithoutAddress: (name: string) =>
      `La page « ${name} » est restaurée, mais sans adresse : une autre page a pris la sienne entre-temps. Choisis-en une autre avant de la publier.`,
    restoredDraft: "Retour en brouillon : rien n'est republié dans l'app.",
    open: "Ouvrir",
    columns: {
      name: "Nom",
      type: "Type",
      deletedAt: "Mis à la corbeille le",
      purgeAt: "Effacement automatique",
    },
    deletedBy: (name: string) => `par ${name}`,
    purgeOn: (date: string) => `le ${date}`,
    purgeRefused: "Effacement impossible : encore utilisé",
    purgeRefusedHint:
      "Ce fichier a été inséré dans un contenu entre-temps. Restaure-le, ou retire-le du contenu avant de vider la corbeille.",
    restore: "Restaurer",
    restoreItem: (name: string) => `Restaurer ${name}`,
    // Sans accord : l'élément peut être un fichier, une page, une méthode…
    restored: (name: string) => `« ${name} » est de retour.`,
    eraseItem: (name: string) => `Effacer définitivement ${name}`,
    erase: "Effacer définitivement",
    empty: "Vider la corbeille",
    emptied: (count: number) =>
      count === 0
        ? "La corbeille était déjà vide."
        : count === 1
          ? "1 élément est en cours d'effacement."
          : `${count} éléments sont en cours d'effacement.`,
    confirmEmpty: {
      title: "Vider la corbeille ?",
      description: (count: number) =>
        `${count === 1 ? "L'élément de la corbeille sera effacé" : `Les ${count} éléments de la corbeille seront effacés`} définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Vider la corbeille",
    },
    confirmErase: {
      title: "Effacer définitivement ?",
      description: (name: string) =>
        `« ${name} » sera effacé définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Effacer définitivement",
    },
    retention:
      "Ce qui est mis à la corbeille reste ici 30 jours, puis est effacé automatiquement.",
    emptyState: {
      title: "La corbeille est vide",
      description:
        "Ce que tu mets à la corbeille arrive ici. Tu peux le restaurer pendant 30 jours.",
    },
    emptyFilter: "Aucun élément de ce type dans la corbeille.",
    loadFailed: "La corbeille n'a pas pu être chargée.",
    refreshFailed:
      "La corbeille n'a pas pu être mise à jour : elle date peut-être un peu.",
  },

  // Listes des contenus d'une section (Pages, Blog, Podcasts) : étape 7.
  contentList: {
    // Ce qui dépend de la sorte de contenu (genre, nombre).
    kinds: {
      page: {
        submit: "Créer la page",
        create: "Nouvelle page",
        createFailed: "La page n'a pas pu être créée.",
        // « Nouvelle page » quand des points de départ existent pour les Pages ([D42]).
        blank: "Page vide",
        confirmTrashTitle: "Mettre cette page à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la corbeille. Si elle est en ligne, elle disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras la restaurer pendant 30 jours.`,
        restored: (title: string) =>
          `« ${title} » est restaurée, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          `Mettre ${count} pages à la corbeille ?`,
        confirmTrashMany:
          "Elles vont dans la corbeille. Celles qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer pendant 30 jours.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 page mise à la corbeille."
            : `${count} pages mises à la corbeille.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 page restaurée, en brouillon."
            : `${count} pages restaurées, en brouillon.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 page gardée" : `${count} pages gardées`,
        keptHint: (count: number) =>
          count === 1
            ? "Elle reste sélectionnée."
            : "Elles restent sélectionnées.",
        emptyTitle: "Aucune page pour l'instant",
        emptyDescription:
          "Crée une page : elle s'ouvre aussitôt dans l'éditeur, et tout ce que tu écris est enregistré au fur et à mesure.",
        search: "Rechercher une page",
        noResults: "Aucune page ne correspond à ta recherche ou à tes filtres.",
      },
      article: {
        submit: "Créer l'article",
        create: "Nouvel article",
        createFailed: "L'article n'a pas pu être créé.",
        blank: "Article vide",
        confirmTrashTitle: "Mettre cet article à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la corbeille. S'il est en ligne, il disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras le restaurer pendant 30 jours.`,
        restored: (title: string) => `« ${title} » est restauré, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          `Mettre ${count} articles à la corbeille ?`,
        confirmTrashMany:
          "Ils vont dans la corbeille. Ceux qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer pendant 30 jours.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 article mis à la corbeille."
            : `${count} articles mis à la corbeille.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 article restauré, en brouillon."
            : `${count} articles restaurés, en brouillon.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 article gardé" : `${count} articles gardés`,
        keptHint: (count: number) =>
          count === 1 ? "Il reste sélectionné." : "Ils restent sélectionnés.",
        emptyTitle: "Aucun article pour l'instant",
        emptyDescription:
          "Crée un article : il s'ouvre aussitôt dans l'éditeur, et tout ce que tu écris est enregistré au fur et à mesure.",
        search: "Rechercher un article",
        noResults:
          "Aucun article ne correspond à ta recherche ou à tes filtres.",
      },
      episode: {
        submit: "Créer l'épisode",
        create: "Nouvel épisode",
        createFailed: "L'épisode n'a pas pu être créé.",
        blank: "Épisode vide",
        confirmTrashTitle: "Mettre cet épisode à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la corbeille. S'il est en ligne, il disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras le restaurer pendant 30 jours.`,
        restored: (title: string) => `« ${title} » est restauré, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          `Mettre ${count} épisodes à la corbeille ?`,
        confirmTrashMany:
          "Ils vont dans la corbeille. Ceux qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer pendant 30 jours.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 épisode mis à la corbeille."
            : `${count} épisodes mis à la corbeille.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 épisode restauré, en brouillon."
            : `${count} épisodes restaurés, en brouillon.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 épisode gardé" : `${count} épisodes gardés`,
        keptHint: (count: number) =>
          count === 1 ? "Il reste sélectionné." : "Ils restent sélectionnés.",
        emptyTitle: "Aucun épisode pour l'instant",
        emptyDescription:
          "Crée un épisode : il s'ouvre aussitôt dans l'éditeur. Choisis ensuite son image de présentation et son audio.",
        search: "Rechercher un épisode",
        noResults:
          "Aucun épisode ne correspond à ta recherche ou à tes filtres.",
      },
      method: {
        submit: "Créer la méthode",
        create: "Nouvelle méthode",
        createFailed: "La méthode n'a pas pu être créée.",
        blank: "Méthode vide",
        confirmTrashTitle: "Mettre cette méthode à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la corbeille, avec ses chapitres et ses leçons. Si elle est en ligne, elle disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras la restaurer pendant 30 jours.`,
        restored: (title: string) =>
          `« ${title} » est restaurée, en brouillon, avec ses chapitres et ses leçons.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          `Mettre ${count} méthodes à la corbeille ?`,
        confirmTrashMany:
          "Elles vont dans la corbeille, avec leurs chapitres et leurs leçons. Celles qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer pendant 30 jours.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 méthode mise à la corbeille."
            : `${count} méthodes mises à la corbeille.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 méthode restaurée, en brouillon."
            : `${count} méthodes restaurées, en brouillon.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 méthode gardée" : `${count} méthodes gardées`,
        keptHint: (count: number) =>
          count === 1
            ? "Elle reste sélectionnée."
            : "Elles restent sélectionnées.",
        emptyTitle: "Aucune méthode pour l'instant",
        emptyDescription:
          "Crée une méthode : elle s'ouvre aussitôt, avec sa fiche et son plan. Ajoute-lui ensuite ses chapitres et ses leçons.",
        search: "Rechercher une méthode",
        noResults:
          "Aucune méthode ne correspond à ta recherche ou à tes filtres.",
      },
    },
    columns: {
      cover: "Image de présentation",
      title: "Titre",
      publication: "Publication",
      categories: "Catégories",
      level: "Niveau d'accès",
      savedAt: "Dernière modification",
    },
    searchPlaceholder: "Rechercher par titre…",
    filters: {
      state: "État",
      category: "Catégorie",
      states: {
        all: "Tous les états",
        draft: "Brouillons",
        live: "En ligne",
        modified: "Modifiés depuis la publication",
        withdrawn: "Retirés de l'app",
        scheduled: "Programmés",
        failed: "Programmation échouée",
      },
      allCategories: "Toutes les catégories",
      noCategory: "Sans catégorie",
      reset: "Effacer les filtres",
    },
    count: (shown: number, total: number) =>
      shown === total
        ? total === 1
          ? "1 élément"
          : `${total} éléments`
        : `${shown} sur ${total}`,
    // Méthodes : le niveau de la fiche.
    levelNotChosen: "Pas encore choisi",
    noCategory: "Aucune",
    manageCategories: "Catégories",
    actions: (title: string) => `Actions pour ${title}`,
    open: "Ouvrir",
    trash: "Mettre à la corbeille",
    confirmTrash: {
      confirm: "Mettre à la corbeille",
    },
    trashed: (title: string) => `« ${title} » est dans la corbeille.`,
    undo: "Annuler",
    // Fenêtre « Nouvel article » (…) : le titre, un point de départ, les réglages ([D42]).
    newContent: {
      description:
        "Le titre suffit pour commencer : tout se modifie ensuite dans les réglages.",
      starter: "Point de départ",
      // Une page : l'adresse vient du titre ; déjà prise, la création est bloquée.
      address: (slug: string) => `Adresse de la page : ${slug}`,
      addressTaken: (title: string) =>
        `La page « ${title || "Sans titre"} » a déjà cette adresse : change le titre.`,
      addressEmpty:
        "Ce titre ne donne pas d'adresse : ajoute des lettres ou des chiffres.",
      starterHint: "Une structure déjà en place, au lieu d'un contenu vide.",
      settingsFailed: (message: string) =>
        `Créé, mais ses réglages n'ont pas été enregistrés : ${message} Corrige-les dans les réglages.`,
    },
    // Ordre des listes (Le Fil, Radio Éclaircies, Méthodes, [D47]) : glisser-déposer.
    order: {
      column: "Ordre",
      handle: (title: string) => `Déplacer « ${title} »`,
      filtering:
        "Pour ranger la liste, efface d'abord la recherche et les filtres.",
      saved: "Nouvel ordre enregistré.",
      failed:
        "Le nouvel ordre n'a pas été enregistré : la liste reprend son ordre.",
      dnd: {
        roleDescription: "contenu déplaçable",
        instructions:
          "Pour déplacer un contenu, appuie sur Espace ou Entrée sur sa poignée. Déplace-le avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler.",
        start: (title: string) => `Tu as pris « ${title} ».`,
        over: (title: string, position: number, count: number) =>
          `« ${title} » est à la place n° ${position} sur ${count}.`,
        end: (title: string, position: number, count: number) =>
          `« ${title} » déposé à la place n° ${position} sur ${count}.`,
        cancel: (title: string) =>
          `Déplacement annulé : « ${title} » reprend sa place.`,
      },
    },
    // « Réglages » dans le menu d'une ligne : les mêmes réglages que dans l'éditeur.
    settings: {
      action: "Réglages",
      save: "Enregistrer",
      saved: (title: string) => `Réglages de « ${title} » enregistrés.`,
      unchanged: "Rien n'a changé.",
      checking: "Vérification du brouillon…",
      heldBy: (name: string) =>
        `${name} écrit ce contenu en ce moment : attends qu'il ait fini, ou ouvre-le pour reprendre la main.`,
      heldSelf:
        "Tu écris ce contenu dans un autre onglet : change ses réglages dans cet onglet-là.",
      yourselfElsewhere: "Toi (dans un autre onglet)",
    },
    // Colonne Catégories : la première, puis « +2 » pour les autres.
    moreCategories: (count: number) => `+${count}`,
    otherCategories: (names: string) => `Aussi : ${names}`,
    loadFailed: "La liste n'a pas pu être chargée.",
    refreshFailed:
      "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
  },

  // Méthodes (étape 7, partie 7b) : ADMIN § 1 et § 3, [D29], [D26], [D36], [D42], [D43].
  methods: {
    kinds: {
      chapter: "Chapitre",
      lesson: "Leçon",
    },
    outline: {
      title: "Plan de la méthode",
      description:
        "Les chapitres et leurs leçons, dans l'ordre de l'app. Range-les par leur poignée : rien ne change dans l'app avant la publication de la méthode.",
      readOnly:
        "Lecture seule : prends la main sur la méthode pour ranger le plan et y ajouter des chapitres ou des leçons.",
      label: "Chapitres et leçons",
      newChapter: "Nouveau chapitre",
      newLesson: "Nouvelle leçon",
      newLessonIn: (chapter: string) => `Nouvelle leçon dans ${chapter}`,
      emptyTitle: "Aucun chapitre pour l'instant",
      emptyDescription:
        "Commence par un chapitre : il a sa propre introduction en blocs, affichée avant ses leçons.",
      noLessons:
        "Aucune leçon dans ce chapitre. Dépose une leçon ici, ou crée-la.",
      chapterNumber: (position: number) => `Chapitre ${position}`,
      lessonNumber: (position: number) => `Leçon ${position}`,
      // Nom complet d'un élément (boutons, annonces, cases à cocher).
      chapterLabel: (position: number, title: string) =>
        `le chapitre ${position} « ${title} »`,
      lessonLabel: (position: number, title: string) =>
        `la leçon ${position} « ${title} »`,
      handle: (label: string) => `Déplacer : ${label}`,
      inApp: "Montrer dans l'app",
      inAppFor: (label: string) => `Montrer dans l'app : ${label}`,
      isFree: "Leçon gratuite",
      isFreeFor: (label: string) => `Leçon gratuite : ${label}`,
      free: "Gratuite",
      savedAt: (date: string) => `Modifié le ${date}`,
      editing: (name: string) => `${name} écrit`,
      openElsewhere: "Ouvert dans un autre de tes onglets",
      actions: (label: string) => `Actions pour ${label}`,
      open: "Ouvrir",
      moveUp: "Monter",
      moveDown: "Descendre",
      unpublish: "Retirer de l'app",
      trash: "Mettre à la corbeille",
      states: {
        live: "En ligne",
        modified: "Modifié depuis la publication",
        new: "Neuf",
        removing: "Sera retiré de l'app",
        withdrawn: "Retiré de l'app",
        hidden: "Caché de l'app",
        blocked: "Caché avec son chapitre",
      },
      stateHints: {
        live: "Dans l'app, tel quel.",
        modified:
          "Ses modifications partiront à la prochaine publication de la méthode.",
        new: "Il partira dans l'app à la prochaine publication de la méthode.",
        removing:
          "Décoché : il sortira de l'app à la prochaine publication de la méthode.",
        withdrawn:
          "Il n'est plus dans l'app. Coche « Montrer dans l'app » puis publie la méthode pour le remettre.",
        hidden:
          "Coche « Montrer dans l'app » quand il est prêt : il partira à la prochaine publication de la méthode.",
        blocked:
          "Son chapitre n'est pas montré dans l'app : cette leçon ne part pas avec la méthode.",
      },
      problem: "À corriger avant de publier",
      // Cases cochées depuis le plan : le réglage appartient à l'élément, sous son verrou.
      heldBy: (name: string) =>
        `${name} écrit cet élément en ce moment : attends qu'il ait fini, ou ouvre-le pour reprendre la main.`,
      heldSelf:
        "Tu écris cet élément dans un autre onglet : change ce réglage dans cet onglet-là.",
      yourselfElsewhere: "Toi (dans un autre onglet)",
      flagsFailed: "Ce réglage n'a pas été changé.",
      reorderFailed: "Le plan n'a pas pu être rangé : il reprend son ordre.",
      stale:
        "Le plan a changé entre-temps (un élément ajouté, supprimé ou restauré) : il vient d'être relu. Range-le de nouveau.",
      moved: (label: string, place: string) =>
        `${upperFirst(label)} : ${place}.`,
      chapterPlace: (position: number, total: number) =>
        `chapitre ${position} sur ${total}`,
      lessonPlace: (position: number, total: number, chapter: string) =>
        `leçon ${position} sur ${total}, dans ${chapter}`,
      confirmUnpublish: {
        title: (label: string) => `Retirer de l'app ${label} ?`,
        chapter:
          "Le chapitre et ses leçons disparaissent de l'app tout de suite (une nouvelle version de la méthode est écrite). « Montrer dans l'app » est décoché : coche-le, puis publie la méthode, pour le remettre.",
        lesson:
          "La leçon disparaît de l'app tout de suite (une nouvelle version de la méthode est écrite). « Montrer dans l'app » est décoché : coche-le, puis publie la méthode, pour la remettre.",
        confirm: "Retirer de l'app",
      },
      unpublished: (label: string) => `Retiré de l'app : ${label}.`,
      confirmTrash: {
        title: (label: string) => `Mettre ${label} à la corbeille ?`,
        chapter:
          "Le chapitre et ses leçons vont dans la corbeille. S'ils sont en ligne, ils disparaissent aussi de l'app. Tu pourras les restaurer pendant 30 jours.",
        lesson:
          "La leçon va dans la corbeille. Si elle est en ligne, elle disparaît aussi de l'app. Tu pourras la restaurer pendant 30 jours.",
        confirm: "Mettre à la corbeille",
      },
      trashed: (label: string) => `${upperFirst(label)} est dans la corbeille.`,
      undo: "Annuler",
      restored: (label: string) =>
        `De retour en fin de liste, caché de l'app : ${label}.`,
      loadFailed: "Le plan n'a pas pu être chargé.",
      refreshFailed:
        "Le plan n'a pas pu être mis à jour : il date peut-être un peu.",
    },
    // Glisser-déposer du plan : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "élément déplaçable",
      instructions:
        "Pour déplacer un chapitre ou une leçon, appuie sur Espace ou Entrée sur sa poignée. Déplace-le avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler. Une leçon peut changer de chapitre.",
      start: (label: string) => `Tu as pris ${label}.`,
      over: (label: string, target: string) =>
        `${upperFirst(label)} est sur ${target}.`,
      overChapter: (label: string, chapter: string) =>
        `${upperFirst(label)} est dans ${chapter}.`,
      outside: (label: string) =>
        `${upperFirst(label)} n'est au-dessus d'aucune place.`,
      end: (label: string, place: string) => `Déposé : ${label}, ${place}.`,
      endOutside: (label: string) =>
        `Lâché hors du plan : ${label} reprend sa place.`,
      cancel: (label: string) =>
        `Déplacement annulé : ${label} reprend sa place.`,
    },
    create: {
      chapterTitle: "Nouveau chapitre",
      lessonTitle: "Nouvelle leçon",
      chapterDescription:
        "Il arrive en fin de plan, caché de l'app : coche « Montrer dans l'app » quand il est prêt.",
      lessonDescription: (chapter: string) =>
        `Elle arrive en fin de liste, dans ${chapter}, cachée de l'app : coche « Montrer dans l'app » quand elle est prête.`,
      name: "Titre",
      nameRequired: "Donne-lui un titre.",
      nameTooLong: "Le titre ne doit pas dépasser 200 caractères.",
      start: "Point de départ",
      blank: {
        chapter: "Chapitre vide",
        lesson: "Leçon vide",
      },
      submit: "Créer",
      openAfter: "Créer et ouvrir",
      created: {
        chapter: (title: string) => `Chapitre « ${title} » créé.`,
        lesson: (title: string) => `Leçon « ${title} » créée.`,
      },
      open: "Ouvrir",
      failed: "L'élément n'a pas pu être créé.",
      startersFailed:
        "Les points de départ n'ont pas pu être chargés : l'élément sera vide.",
    },
    // L'éditeur d'un chapitre ou d'une leçon : il n'a pas de bouton Publier ([D29]).
    element: {
      back: (method: string) => `Retour à la méthode « ${method} »`,
      reminder: {
        chapter:
          "Ce chapitre part dans l'app avec sa méthode : il n'a pas de bouton Publier. Son introduction est affichée avant ses leçons.",
        lesson:
          "Cette leçon part dans l'app avec sa méthode : elle n'a pas de bouton Publier.",
      },
      publishFromMethod: "Publie la méthode depuis sa page.",
      openMethod: "Ouvrir la méthode",
      inChapter: (chapter: string) => `Dans le chapitre « ${chapter} »`,
      // La programmation de la méthode, vue depuis un chapitre ou une leçon ([D31]).
      schedule: {
        scheduled: (date: string) => `La méthode est programmée le ${date}.`,
        scheduledHint:
          "Si « Montrer dans l'app » est coché, c'est le dernier brouillon enregistré à cette heure-là qui partira. Si tu as modifié cet élément depuis la programmation et que ton éditeur est encore ouvert à ce moment-là, la publication attend que tu le quittes, une heure au plus.",
        due: (date: string) =>
          `La méthode est programmée le ${date} : sa publication part dans un instant.`,
        dueHint:
          "Si quelqu'un a modifié la méthode, un chapitre ou une leçon depuis la programmation et a encore son éditeur ouvert, elle attendra qu'il le quitte, une heure au plus.",
        waiting: (date: string) =>
          `La publication de la méthode, programmée le ${date}, attend : quelqu'un écrit la méthode, un chapitre ou une leçon.`,
        waitingHint:
          "Elle partira dès que cette personne aura quitté son éditeur. Au bout d'une heure, elle échouera.",
        // La personne devant l'écran tient le verrou de cet élément.
        waitingMine: (date: string) =>
          `La méthode est programmée le ${date} : sa publication attend peut-être que tu quittes l'éditeur.`,
        waitingMineHint:
          "Si tu as modifié cet élément depuis la programmation, elle ne part pas tant que ton éditeur reste ouvert, même sans écrire. Au bout d'une heure, elle échouera.",
        failed: "La publication programmée de la méthode a échoué.",
        failedHint: (reason: string) =>
          `Raison : ${reason} Tu peux la programmer de nouveau depuis la méthode.`,
        leave: "Quitter l'éditeur",
      },
      methodInTrash:
        "Sa méthode est dans la corbeille : restaure-la pour publier cet élément.",
      problem: (text: string) =>
        `À corriger avant de publier la méthode : ${text}`,
      settings: "Réglages",
    },
    // Avant de publier ou de programmer une méthode : la liste de ce qui va changer ([D29]).
    changes: {
      title: "Ce qui va changer dans l'app",
      loading: "Recherche de ce qui a changé…",
      failed: "La liste des changements n'a pas pu être lue.",
      nothing:
        "Rien à publier : l'app montre déjà cette méthode telle qu'elle est.",
      method: {
        new: "La méthode entre dans l'app",
        modified: "Fiche de la méthode modifiée",
        reordered: "Chapitres ou leçons rangés autrement",
      },
      kinds: {
        chapter: "Chapitre",
        lesson: "Leçon",
      },
      // « Leçon « Respirer » » : la sorte, puis le titre.
      row: (kind: string, title: string) => `${kind} « ${title} »`,
      changes: {
        new: "Neuf",
        modified: "Modifié",
        removed: "Retiré",
        reordered: "Rangé",
      },
      inChapter: (title: string) => `dans « ${title} »`,
      savedAt: (date: string) => `modifié le ${date}`,
      open: (label: string) => `Ouvrir ${label}`,
      blocked:
        "Corrige d'abord ce qui est signalé : la publication serait refusée.",
      scheduleNote:
        "C'est ce qui partirait maintenant. À l'heure programmée, c'est l'état de ce moment-là qui partira : la fiche, le plan et les éléments cochés.",
      count: (count: number) =>
        count === 1 ? "1 changement" : `${count} changements`,
    },
  },

  // Catégories du Blog et des Podcasts (étape 7) : ADMIN § 3, [D28], [D44].
  categories: {
    title: (section: string) => `Catégories : ${section}`,
    description: {
      blog: "Elles servent à filtrer les articles dans l'app. Un article peut en avoir une, plusieurs ou aucune.",
      podcasts:
        "Elles servent à filtrer les épisodes dans l'app. Un épisode peut en avoir une, plusieurs ou aucune.",
    },
    back: (section: string) => `Retour à la section ${section}`,
    orderTitle: "Ordre dans l'app",
    order:
      "L'app les montre dans cet ordre. Range-les avec la poignée, à la souris ou au clavier.",
    listLabel: (section: string) =>
      `Catégories de la section ${section}, dans l'ordre de l'app`,
    empty:
      "Aucune catégorie pour l'instant. Les catégories sont facultatives : ajoutes-en si tu veux que l'app puisse filtrer.",
    name: "Nom de la nouvelle catégorie",
    namePlaceholder: "Par exemple : Sommeil",
    addTitle: "Ajouter une catégorie",
    addDescription:
      "Elle arrive en bas de la liste ; range-la ensuite à sa place.",
    nameRequired: "Donne un nom à la catégorie.",
    nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
    add: "Ajouter",
    added: (name: string) => `Catégorie « ${name} » ajoutée.`,
    rename: "Renommer",
    renameLabel: (name: string) => `Nouveau nom pour ${name}`,
    renamed: "Catégorie renommée.",
    remove: "Supprimer",
    actions: (name: string) => `Actions pour ${name}`,
    // Pastille de chaque catégorie : le nombre de brouillons qui la citent, dans l'infobulle.
    uses: (count: number) =>
      count === 0 ? "Non utilisée" : `Utilisée ${count} fois`,
    confirmRemove: {
      title: "Supprimer cette catégorie ?",
      description: (name: string) =>
        `La catégorie « ${name} » sera supprimée définitivement : elle ne passe pas par la corbeille, et tu ne pourras pas la restaurer.`,
      uses: (count: number) =>
        count === 1
          ? "1 brouillon la perd aussitôt. Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés."
          : count > 1
            ? `${count} brouillons la perdent aussitôt. Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés.`
            : "Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés.",
      confirm: "Supprimer définitivement",
    },
    removed: (name: string) => `Catégorie « ${name} » supprimée.`,
    handle: (name: string) => `Déplacer ${name}`,
    reordered: "Nouvel ordre enregistré.",
    // Glisser-déposer : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "catégorie déplaçable",
      instructions:
        "Pour déplacer une catégorie, appuie sur Espace ou Entrée sur sa poignée. Déplace-la avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
      start: (name: string) => `Tu as pris ${name}.`,
      over: (name: string, position: number, count: number) =>
        `${name} est à la place n° ${position} sur ${count}.`,
      end: (name: string, position: number, count: number) =>
        `${name} déposée à la place n° ${position} sur ${count}.`,
      cancel: (name: string) =>
        `Déplacement annulé : ${name} reprend sa place.`,
    },
    loadFailed: "Les catégories n'ont pas pu être chargées.",
    errors: {
      nom_en_double: "Une catégorie de cette section porte déjà ce nom.",
      nom_invalide: "Le nom doit faire entre 1 et 100 caractères.",
      introuvable: "Cette catégorie n'existe plus. Recharge la page.",
      demande_invalide:
        "La liste a changé entre-temps. Recharge la page, puis réessaie.",
      categorie_invalide: "La section d'une catégorie ne change pas.",
      reserve_a_l_equipe:
        "Ta session ne donne plus accès aux catégories. Reconnecte-toi.",
    },
  },

  // Modèles de blocs (étape 6) : page Modèles, éditeur d'un modèle, insertion dans un contenu,
  // « Enregistrer comme modèle ». docs/ADMINISTRATION.md, § 5.
  templates: {
    sorts: {
      style: {
        title: "Mise en forme",
        tab: "Mises en forme",
        description:
          "On insère une copie déjà mise en forme, puis on y écrit son propre texte. Modifier le modèle ne change pas les contenus déjà écrits.",
        example: "Exemple : un encadré « À retenir ».",
      },
      shared: {
        title: "Bloc partagé",
        tab: "Blocs partagés",
        description:
          "Le même bloc, avec le même texte, dans plusieurs contenus. On le corrige une seule fois dans le modèle, et il est corrigé dans tous les brouillons qui l'utilisent.",
        example:
          "Exemple : un encadré « Contact ». Il contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      },
      starter: {
        title: "Point de départ",
        tab: "Points de départ",
        description:
          "Un nouveau contenu s'ouvre avec une structure déjà en place, au lieu d'une page vide.",
        example: "Exemple : « Interview ».",
      },
    },
    // La section d'un point de départ ([D42]) : la sorte de contenu qu'il sert à créer.
    sections: {
      article: "Le Fil (article)",
      episode: "Radio Éclaircies (épisode)",
      chapter: "Méthodes (chapitre)",
      lesson: "Méthodes (leçon)",
      page: "Pages",
    },
    list: {
      create: "Nouveau modèle",
      columns: {
        name: "Nom",
        type: "Type",
        savedAt: "Dernière modification",
      },
      // Les onglets : « Tous les blocs », puis un par sorte (texts.templates.sorts.*.tab).
      tabs: {
        label: "Types de modèles",
        all: "Tous les blocs",
      },
      untitled: "Sans nom",
      empty: {
        title: "Aucun modèle pour l'instant",
        description:
          "Crée un modèle ici, ou depuis un contenu : choisis des blocs dans le plan, puis « Enregistrer comme modèle ».",
      },
      emptySort: "Aucun modèle de ce type pour l'instant.",
      usesLoading: "Recherche des brouillons…",
      actions: (name: string) => `Actions pour ${name}`,
      open: "Ouvrir",
      trash: "Mettre à la corbeille",
      loadFailed: "La liste des modèles n'a pas pu être chargée.",
      refreshFailed:
        "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
      createFailed: "Le modèle n'a pas pu être créé.",
      confirmTrash: {
        title: "Mettre ce modèle à la corbeille ?",
        description: (name: string) =>
          `« ${name} » va dans la corbeille : tu pourras le restaurer pendant 30 jours. Les contenus où il a été inséré gardent leur copie.`,
        confirm: "Mettre à la corbeille",
      },
      trashed: (name: string) => `« ${name} » est dans la corbeille.`,
      undo: "Annuler",
      restored: (name: string) => `« ${name} » est restauré.`,
      // Sélection en masse.
      confirmTrashManyTitle: (count: number) =>
        `Mettre ${count} modèles à la corbeille ?`,
      confirmTrashMany:
        "Ils vont dans la corbeille : tu pourras les restaurer pendant 30 jours. Les contenus où ils ont été insérés gardent leur copie. Un bloc partagé encore utilisé est gardé.",
      trashedMany: (count: number) =>
        count === 1
          ? "1 modèle mis à la corbeille."
          : `${count} modèles mis à la corbeille.`,
      restoredMany: (count: number) =>
        count === 1 ? "1 modèle restauré." : `${count} modèles restaurés.`,
      keptTitle: (count: number) =>
        count === 1 ? "1 modèle gardé" : `${count} modèles gardés`,
      keptHint: (count: number) =>
        `Pour un bloc partagé encore utilisé, « Mettre à la corbeille » propose « Détacher partout ». ${count === 1 ? "Il reste sélectionné." : "Ils restent sélectionnés."}`,
      // Un bloc partagé utilisé ne se supprime pas (ADMIN § 5).
      used: {
        title: "Ce modèle est encore utilisé",
        description:
          "Un bloc partagé ne se supprime pas tant qu'un brouillon l'utilise. « Détacher partout » en fait une copie ordinaire dans chacun d'eux, corbeille comprise : ils ne suivront plus le modèle. Ce qui est en ligne dans l'app ne change pas.",
        list: "Brouillons qui l'utilisent",
        inTrash: "dans la corbeille",
        detachAll: "Détacher partout",
        detached: (count: number) =>
          count === 1
            ? "Détaché dans 1 brouillon : tu peux maintenant supprimer le modèle."
            : `Détaché dans ${count} brouillons : tu peux maintenant supprimer le modèle.`,
        checkFailed:
          "Les brouillons qui utilisent ce modèle n'ont pas pu être relus.",
      },
    },
    create: {
      title: "Nouveau modèle",
      description:
        "Choisis le type du modèle : il ne changera plus. Tu écriras ensuite ses blocs dans l'éditeur.",
      name: "Nom",
      namePlaceholder: "Par exemple : Contact",
      nameRequired: "Donne un nom au modèle.",
      nameTooLong: "Le nom ne doit pas dépasser 200 caractères.",
      sort: "Type",
      section: "Section",
      sectionPlaceholder: "Choisis une section",
      sectionHint:
        "Le point de départ ne sera proposé que dans cette section : « Nouvelle page » ne propose que ceux des pages.",
      sectionRequired: "Choisis la section du point de départ.",
      submit: "Créer le modèle",
    },
    // Éditeur d'un modèle (le même éditeur plein écran, sans publication).
    editor: {
      nameLabel: "Nom du modèle",
      namePlaceholder: "Nom du modèle",
      starterFor: (section: string) => `Point de départ : ${section}`,
      sharedLimit:
        "Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      empty: {
        title: "Modèle vide",
        description:
          "Ajoute ses blocs : un texte, une image ou un encadré. Tu pourras ensuite l'insérer dans les contenus.",
        sharedDescription:
          "Ajoute son bloc : un texte, une image ou un encadré (qui peut en regrouper plusieurs). Tant qu'il est vide, il ne peut pas être inséré.",
      },
      usedIn: (count: number) =>
        count === 0
          ? "Utilisé dans aucun brouillon"
          : count === 1
            ? "Utilisé dans 1 brouillon"
            : `Utilisé dans ${count} brouillons`,
      usedInList: "Brouillons qui utilisent ce modèle",
      keepBlock:
        "Ce modèle est utilisé : il garde son bloc. Pour le retirer, détache-le d'abord partout (page Modèles de bloc).",
      outdated: {
        push: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app"
            : `Mettre à jour ces ${count} contenus dans l'app`,
        title: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app ?"
            : `Mettre à jour ces ${count} contenus dans l'app ?`,
        description:
          "Ces contenus sont en ligne avec une ancienne version de ce bloc. Seul ce bloc sera remplacé dans l'app : le reste de leurs brouillons ne part pas. Rien ne change dans l'app avant ce clic.",
        version: (number: number, date: string) =>
          `version n° ${number}, publiée le ${date}`,
        confirm: "Mettre à jour",
        pushed: (count: number) =>
          count === 0
            ? "Rien à mettre à jour : l'app a déjà ce bloc."
            : count === 1
              ? "1 contenu mis à jour dans l'app."
              : `${count} contenus mis à jour dans l'app.`,
        failed:
          "La liste des contenus à mettre à jour dans l'app n'a pas pu être chargée.",
      },
    },
    // Un bloc lié (bloc partagé) dans l'éditeur d'un contenu.
    linked: {
      label: (name: string) => `Modèle « ${name} »`,
      loading: "Chargement du modèle…",
      missing:
        "Ce modèle n'existe plus ou est dans la corbeille : supprime ce bloc, ou restaure le modèle.",
      empty: "Ce modèle est vide.",
      edit: "Modifier le modèle",
      editLabel: (name: string) => `Modifier le modèle « ${name} »`,
      detach: "Détacher",
      detachLabel: (name: string) => `Détacher du modèle « ${name} »`,
      detached: (name: string) =>
        `Bloc détaché de « ${name} » : c'est maintenant une copie ordinaire, que tu peux modifier ici.`,
      settings: (name: string) =>
        `Ce bloc est partagé : il vient du modèle « ${name} ». Pour le corriger, modifie le modèle : la correction apparaîtra dans tous les brouillons qui l'utilisent.`,
      detachHint:
        "« Détacher » en fait une copie ordinaire, modifiable ici, qui ne suit plus le modèle. Les autres contenus restent liés.",
    },
    // « Ajouter un bloc » › « Un modèle… ».
    insert: {
      menu: "Un modèle…",
      title: "Insérer un modèle",
      description:
        "Une mise en forme s'insère en copie, que tu modifies ici. Un bloc partagé reste lié à son modèle.",
      empty:
        "Aucun modèle à insérer pour l'instant. Crée-en un dans Modèles de bloc.",
      insert: "Insérer",
      insertLabel: (name: string) => `Insérer ${name}`,
      emptyTemplate: "Vide : ajoute-lui son bloc dans Modèles de bloc.",
      loadFailed: "Les modèles n'ont pas pu être chargés.",
      manage: "Gérer les modèles",
      inserted: (name: string) => `Modèle « ${name} » inséré.`,
    },
    // « Enregistrer comme modèle » : une sélection de blocs (plan, ou bloc choisi).
    saveAs: {
      action: "Enregistrer comme modèle…",
      select: "Choisir des blocs",
      stopSelecting: "Annuler le choix",
      selectHint:
        "Coche les blocs à enregistrer comme modèle, puis « Enregistrer comme modèle ».",
      selectBlock: (label: string) => `Choisir ${label}`,
      withCount: (count: number) => `Enregistrer comme modèle (${count})`,
      title: "Enregistrer comme modèle",
      description: (count: number) =>
        count === 1
          ? "Le bloc choisi devient un nouveau modèle."
          : `Les ${count} blocs choisis deviennent un nouveau modèle, dans l'ordre du contenu.`,
      sharedOne:
        "Pour un bloc partagé, choisis un seul bloc (un encadré peut en regrouper plusieurs).",
      sharedReplaced:
        "Le bloc est maintenant lié au modèle : le corriger dans le modèle le corrigera ici aussi.",
      submit: "Enregistrer le modèle",
      saved: (name: string) => `Modèle « ${name} » enregistré.`,
      open: "Ouvrir",
    },
  },

  // Éditeur de blocs (plein écran) : docs/ARCHITECTURE-CONTENUS.md, § 2.7 et § 3.3.
  editor: {
    back: (section: string) => `Retour à la section ${section}`,
    loading: "Ouverture du brouillon…",
    notFound: {
      title: "Contenu introuvable",
      description:
        "Ce contenu n'existe plus, ou il est dans la corbeille. Retourne à la liste.",
    },
    title: {
      label: "Titre du contenu",
      placeholder: "Titre",
    },
    blocks: {
      text: "Texte",
      image: "Image",
      box: "Encadré",
    },
    // Nom d'un bloc dans le plan, les annonces et les boutons.
    blockLabel: {
      text: (excerpt: string) =>
        excerpt ? `Texte « ${excerpt} »` : "Texte vide",
      image: (caption: string) => (caption ? `Image « ${caption} »` : "Image"),
      box: (count: number) =>
        count === 0
          ? "Encadré vide"
          : count === 1
            ? "Encadré (1 bloc)"
            : `Encadré (${count} blocs)`,
      linked: (name: string | null) =>
        name ? `Bloc partagé « ${name} »` : "Bloc partagé",
    },
    textPlaceholder: "Écris ici…",
    add: {
      label: "Ajouter un bloc",
      inBox: "Ajouter dans l'encadré",
    },
    emptyPage: {
      title: "Aucun bloc pour l'instant",
      description:
        "Ajoute un premier bloc : un texte, une image ou un encadré.",
    },
    emptyBox:
      "Encadré vide : ajoute un texte ou une image, ou dépose un bloc ici.",
    handle: (label: string) => `Déplacer : ${label}`,
    // Glisser-déposer : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "bloc déplaçable",
      instructions:
        "Pour déplacer un bloc, appuie sur Espace ou Entrée sur sa poignée. Déplace-le avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler.",
      page: "la page",
      box: (position: number) => `l'encadré (bloc n° ${position})`,
      start: (label: string) => `Tu as pris ${label}.`,
      over: (label: string, target: string, container: string) =>
        `${label} est au niveau de ${target}, dans ${container}.`,
      overZone: (label: string, container: string) =>
        `${label} est dans ${container}.`,
      outside: (label: string) => `${label} n'est au-dessus d'aucune place.`,
      // Accordé à « Bloc » : le nom du bloc peut être masculin (Texte) ou féminin (Image).
      end: (label: string, container: string) =>
        `Bloc déposé dans ${container} : ${label}.`,
      endOutside: (label: string) =>
        `Bloc lâché hors de la page : ${label} reprend sa place.`,
      cancel: (label: string) =>
        `Déplacement annulé : ${label} reprend sa place.`,
    },
    outline: {
      toggle: "Plan",
      show: "Afficher le plan",
      hide: "Masquer le plan",
      title: "Plan",
      empty: "Aucun bloc pour l'instant.",
      select: (label: string) => `Aller à ${label}`,
      // Le plan de l'éditeur du Fil (ADMIN § 4, « Les finitions »).
      count: (count: number) =>
        count === 0 ? "Aucun bloc" : count === 1 ? "1 bloc" : `${count} blocs`,
      cover: "Image de présentation",
      heading: (title: string) => `Aller à l'intertitre « ${title} »`,
      move: (label: string) => `Ranger dans le plan : ${label}`,
      collapse: (label: string) => `Replier ${label}`,
      expand: (label: string) => `Déplier ${label}`,
      actions: (label: string) => `Actions pour ${label}`,
      duplicate: "Dupliquer",
      duplicated: (label: string) => `${label} : copie ajoutée juste après.`,
      saveToMine: "Enregistrer dans Mes blocs",
      remove: "Supprimer",
      warnings: {
        coverMissing: "Pas encore choisie",
        noFile: "Pas encore de fichier",
        unavailable: "Le fichier ne s'affiche plus",
        noAlt: "Sans texte alternatif",
        missingTemplate: "Le modèle n'existe plus",
        count: (count: number) =>
          count === 1 ? "1 point à vérifier" : `${count} points à vérifier`,
      },
    },
    toolbar: {
      label: "Mise en forme",
      unavailable: "Clique dans un texte pour le mettre en forme.",
      paragraph: "Paragraphe",
      h2: "Titre",
      h3: "Sous-titre",
      bulletList: "Liste à puces",
      orderedList: "Liste numérotée",
      bold: "Gras",
      italic: "Italique",
      link: "Lien",
      undo: "Annuler",
      redo: "Rétablir",
    },
    link: {
      title: "Lien",
      description:
        "Une adresse qui commence par https:// (site) ou mailto: (e-mail).",
      url: "Adresse",
      placeholder: "https://exemple.fr",
      invalid: "L'adresse doit commencer par https:// ou mailto:, sans espace.",
      apply: "Appliquer",
      remove: "Retirer le lien",
    },
    image: {
      choose: "Choisir une image",
      replace: "Changer d'image",
      none: "Aucune image choisie",
      missing: "Image supprimée : choisis-en une autre.",
      loadFailed: "L'image n'a pas pu être chargée.",
      notReady: "Cette image n'est pas prête : choisis-en une autre.",
      captionLabel: "Légende",
      captionPlaceholder: "Ajoute une légende (facultatif)",
      altWarning:
        "Pas de texte alternatif : décris l'image pour les personnes qui ne la voient pas.",
    },
    picker: {
      title: "Choisir une image",
      description:
        "Les images prêtes de la médiathèque, ou une nouvelle image à envoyer.",
      search: "Rechercher une image",
      searchPlaceholder: "Rechercher par nom…",
      choose: (name: string) => `Choisir ${name}`,
      empty:
        "Aucune image dans la médiathèque. Envoies-en une avec « Envoyer une image ».",
      noResults: "Aucune image trouvée. Essaie un autre nom.",
      loadFailed: "Les images n'ont pas pu être chargées.",
      upload: "Envoyer une image",
      uploadInput: "Image à envoyer",
      uploading: (name: string) => `Envoi de « ${name} »…`,
      uploadingProgress: (name: string, percent: string) =>
        `Envoi de « ${name} »… ${percent}`,
      uploadFailed: (name: string, error: string) =>
        `Échec de l'envoi de « ${name} ». ${error}`,
      notImage: (name: string) =>
        `« ${name} » est dans la médiathèque, mais le bloc Image n'accepte que les photos et les images (JPEG, PNG, WebP, GIF, HEIC).`,
    },
    // Le choix de l'audio d'un épisode : mêmes libellés que le choix d'une image, sauf ceux-ci.
    audioPicker: {
      title: "Choisir l'audio",
      description:
        "Les audios prêts de la médiathèque, ou un nouveau fichier à envoyer (MP3 ou M4A).",
      search: "Rechercher un audio",
      choose: (name: string) => `Choisir ${name}`,
      empty:
        "Aucun audio dans la médiathèque. Envoies-en un avec « Envoyer un audio ».",
      noResults: "Aucun audio trouvé. Essaie un autre nom.",
      loadFailed: "Les audios n'ont pas pu être chargés.",
      upload: "Envoyer un audio",
      uploadInput: "Audio à envoyer",
      notImage: (name: string) =>
        `« ${name} » est dans la médiathèque, mais un épisode n'accepte qu'un audio (MP3 ou M4A).`,
      noTranscript: "Sans transcription",
    },
    // Présentation d'un article ou d'un épisode (étape 7) : image de présentation, résumé,
    // audio, catégories. [D45], [D46].
    presentation: {
      panelTitle: {
        article: "Présentation de l'article",
        episode: "Présentation de l'épisode",
        method: "Fiche de la méthode",
        chapter: "Présentation du chapitre",
        lesson: "Présentation de la leçon",
      },
      panelHint:
        "Ce que l'app montre en tête du contenu et dans ses listes. Choisis un bloc dans l'aperçu pour voir ses réglages.",
      methodPanelHint:
        "Ce que l'app montre en tête de la méthode et dans ses listes. Son plan est à droite : chaque chapitre et chaque leçon s'écrit dans son propre éditeur.",
      show: "Voir la présentation",
      cover: {
        label: "Image de présentation",
        hint: "Obligatoire pour publier : c'est la vignette des listes de l'app. Elle reste publique, même pour un contenu réservé.",
        // Chapitre ou leçon : elle n'est pas exigée ([D45] ne vise que les contenus des listes).
        optionalHint:
          "Facultative : la vignette de cet élément dans le plan de la méthode, dans l'app. Elle reste publique.",
        choose: "Choisir l'image de présentation",
        replace: "Changer d'image",
        remove: "Retirer l'image",
        removed: "Image de présentation retirée.",
        none: "Pas encore d'image de présentation",
        missing: "Image supprimée : choisis-en une autre.",
        notReady: "Cette image n'est pas prête : choisis-en une autre.",
        alt: (alt: string) => `Texte alternatif (médiathèque) : « ${alt} »`,
        noAlt:
          "Pas de texte alternatif : ajoute-le dans la fiche de l'image, pour les personnes qui ne la voient pas.",
      },
      summary: {
        label: "Résumé",
        placeholder: "Résumé (facultatif)",
        hint: "Facultatif. Affiché sous le titre et dans les listes de l'app.",
        count: (count: string) => `${count} / 1 000 caractères`,
      },
      audio: {
        label: "Audio de l'épisode",
        hint: "Obligatoire pour publier : un fichier MP3 ou M4A de la médiathèque.",
        choose: "Choisir l'audio",
        replace: "Changer d'audio",
        remove: "Retirer l'audio",
        removed: "Audio retiré.",
        none: "Pas encore d'audio",
        missing: "Audio supprimé : choisis-en un autre.",
        notReady: "Cet audio n'est pas prêt : choisis-en un autre.",
        loadFailed: "L'audio n'a pas pu être chargé.",
        duration: (duration: string) => `Durée : ${duration}`,
        noDuration: "Durée inconnue",
        transcriptOk: "Transcription renseignée dans la médiathèque.",
        transcriptMissing:
          "Pas de transcription : ajoute-la dans la fiche du fichier, pour les personnes qui ne peuvent pas écouter. Elle est conseillée, pas obligatoire.",
        openFile: "Ouvrir sa fiche dans la médiathèque",
      },
      categories: {
        label: "Catégories",
        none: "Aucune catégorie (facultatif).",
        edit: "Choisir les catégories",
      },
      openFileHint: "(nouvel onglet)",
    },
    // Éditeur du Fil (ADMIN § 4) : les onglets des deux colonnes, et l'onglet « Article ».
    columns: {
      left: "Plan et blocs",
      right: "Article et bloc choisi",
      plan: "Plan",
      blocks: "Blocs",
      article: "Article",
      block: "Bloc choisi",
      noBlock: "Clique sur un bloc dans le téléphone pour voir ses réglages.",
    },
    // L'aperçu de l'éditeur du Fil : la barre d'outils à droite du téléphone, et ce que montre la
    // Lecture (le rendu de l'app reste provisoire tant qu'elle n'est pas dessinée).
    // « / » au début d'un texte vide (éditeur du Fil).
    slash: {
      placeholder: "Écris ici, ou tape « / » pour ajouter un bloc",
      title: "Ajouter un bloc",
      mine: "Mes blocs…",
    },
    // Le mode Concentration de l'éditeur du Fil : les deux colonnes se cachent.
    focusMode: {
      label: "Concentration",
      on: "Concentration : les colonnes sont cachées. Échap pour les retrouver.",
      off: "Les colonnes sont de retour.",
      shortcut: { apple: "⌘ .", other: "Ctrl + ." },
    },
    preview: {
      tools: "Aperçu",
      device: {
        label: "Téléphone",
        ios: "iPhone · 402 × 874",
        android: "Android · 412 × 915",
      },
      mode: {
        label: "Mode",
        edit: "Édition",
        read: "Lecture : l'article comme dans l'app",
      },
      theme: {
        label: "Thème du téléphone",
        light: "Clair",
        dark: "Sombre",
      },
      largeText: "Grand texte",
      reader: {
        label: "Lecteur",
        subscriber: "Lire comme un abonné à la bonne formule",
        visitor: "Lire comme une personne sans la formule",
      },
      screen: { ios: "Aperçu sur iPhone", android: "Aperçu sur Android" },
      // L'heure de la barre d'état, comme sur les photos des fabricants.
      time: { ios: "9:41", android: "12:00" },
      back: "Retour",
      bookmark: "Garder",
      share: "Partager",
      minutes: (count: number) => `${count} min de lecture`,
      locked: {
        title: "La suite est réservée",
        text: (level: string) =>
          `Avec la formule ${level}, tu lis tout l'article.`,
        textUnknown: "Avec la bonne formule, tu lis tout l'article.",
        action: "Voir les formules",
      },
    },
    // L'onglet « Blocs » de l'éditeur du Fil, et le panneau « Mes blocs ».
    library: {
      hint: "Clique sur un bloc pour l'ajouter sous le bloc choisi (ou à la fin), ou glisse-le dans le téléphone.",
      basics: "Blocs",
      addLabel: (label: string) => `Ajouter un bloc ${label}`,
      mine: {
        title: "Mes blocs",
        count: (count: number) =>
          count === 0
            ? "Aucun bloc enregistré"
            : count === 1
              ? "1 bloc enregistré"
              : `${count} blocs enregistrés`,
        back: "Revenir aux blocs",
        search: "Rechercher un bloc",
        searchLabel: "Rechercher dans Mes blocs",
        filters: {
          label: "Type de bloc",
          all: "Tous",
          style: "Mises en forme",
          shared: "Partagés",
        },
        style: "Mise en forme : une copie à compléter",
        shared: (count: number) =>
          count === 0
            ? "Bloc partagé : suit son modèle"
            : count === 1
              ? "Bloc partagé : suit son modèle · dans 1 contenu"
              : `Bloc partagé : suit son modèle · dans ${count} contenus`,
        insertLabel: (name: string) => `Ajouter « ${name} »`,
        empty:
          "Aucun bloc enregistré pour l'instant : enregistre un bloc depuis un article, ou crée-le dans Modèles de bloc.",
        noResult: "Aucun bloc ne correspond.",
        manage: "Gérer dans Modèles de bloc",
      },
    },
    article: {
      ready: {
        title: "Prêt à publier ?",
        count: (done: number, total: number) => `${done} / ${total}`,
        items: {
          title: "Titre",
          cover: "Image de présentation",
          access: "Niveau d'accès",
        },
        done: (label: string) => `${label} : fait`,
        todo: (label: string) => `${label} : à régler`,
      },
      feed: {
        title: "Dans la liste du Fil",
        choose: "Choisir",
        chooseLabel: "Choisir l'image de présentation",
        replaceLabel: "Changer l'image de présentation",
        summaryEmpty: "Le résumé apparaît ici.",
        hint: "L'image est obligatoire pour publier : c'est aussi celle en tête de l'article.",
      },
      summary: {
        label: "Résumé",
        optional: "facultatif",
        placeholder: "Une ou deux phrases pour donner envie de lire…",
        ideal: "Idéal : 120 à 160",
        count: (count: number, max: number) => `${count} / ${max}`,
      },
      categories: {
        add: "Nouvelle",
      },
      stats: {
        reading: (minutes: number) =>
          `Environ ${Math.max(minutes, 1)} min de lecture`,
        words: (count: string) =>
          count === "0" || count === "1" ? `${count} mot` : `${count} mots`,
        saved: (date: string) => `Modifié le ${date}`,
      },
    },
    settings: {
      label: "Réglages du bloc",
      title: (label: string) => `Réglages : ${label}`,
      none: "Choisis un bloc dans l'aperçu pour voir ses réglages.",
      readOnly: "Lecture seule : tu ne peux rien modifier.",
      text: "Écris directement dans l'aperçu. Sélectionne des mots pour les mettre en forme avec la barre de mise en forme.",
      image: {
        file: "Fichier",
        alt: "Texte alternatif",
        altFromLibrary: "Reprendre celui de la médiathèque",
        libraryAlt: (alt: string) => `Médiathèque : « ${alt} »`,
        noLibraryAlt:
          "La médiathèque n'a pas de texte alternatif pour cette image.",
        altHint:
          "Décris l'image en une phrase pour les personnes qui ne la voient pas.",
        caption: "Légende",
        captionCount: (count: number) => `${count} / 300 caractères`,
        captionHint: "Texte simple, écrit sous l'image dans l'aperçu.",
      },
      box: {
        look: "Apparence",
        fill: "Fond",
        border: "Bordure",
        hint: "Un encadré contient des textes et des images, pas d'autre encadré.",
      },
      moveUp: "Monter",
      moveDown: "Descendre",
      remove: "Supprimer le bloc",
      removed: (label: string) => `Bloc supprimé : ${label}.`,
      undo: "Annuler",
      // Annoncé après « Monter » ou « Descendre ».
      moved: (position: number, count: number, container: string) =>
        `Bloc n° ${position} sur ${count}, dans ${container}.`,
      inBox: "l'encadré",
    },
    // Enregistrement automatique.
    save: {
      saved: "Enregistré",
      savedAt: (date: string) => `Enregistré le ${date}`,
      // Lu après « Enregistré » par les lecteurs d'écran.
      savedOn: (date: string) => `le ${date}`,
      pending: "Modifications en attente…",
      saving: "Enregistrement…",
      offline: "Hors ligne, nouvel essai…",
      failed: "Non enregistré",
      stopped: "Non enregistré",
      // Lu par les lecteurs d'écran, seulement quand l'état change vraiment (pas à chaque
      // enregistrement).
      announce: {
        offline:
          "Hors ligne : tes modifications seront enregistrées au retour du réseau.",
        saved: "Tes modifications sont enregistrées.",
      },
      leave: {
        title: "Quitter sans enregistrer ?",
        description:
          "Tes dernières modifications ne sont pas encore enregistrées : elles seront perdues.",
        stay: "Rester",
        confirm: "Quitter quand même",
      },
      nearLimit:
        "Ce brouillon approche de la taille maximale. Pense à le découper en plusieurs contenus.",
      invalidAt: (position: number) =>
        `Le bloc n° ${position} n'a pas la forme attendue.`,
    },
    // Un seul membre à la fois sur un brouillon.
    lock: {
      readOnly: (name: string) =>
        `${name} écrit ce brouillon. Tu le vois en lecture seule, et il se met à jour à chaque enregistrement.`,
      readOnlySelf:
        "Tu écris ce brouillon dans un autre onglet. Ici, tu le vois en lecture seule.",
      free: "Personne n'écrit ce brouillon en ce moment.",
      take: "Modifier",
      forceTake: "Reprendre la main",
      confirmForce: {
        title: "Reprendre la main ?",
        description: (name: string) =>
          `${name} passera en lecture seule. Ce qui n'est pas encore enregistré de son côté restera dans son navigateur.`,
        descriptionSelf:
          "L'autre onglet passera en lecture seule. Ce qui n'y est pas encore enregistré y restera.",
        confirm: "Reprendre la main",
      },
      lost: (name: string) =>
        `${name} a repris la main : tu vois maintenant ce brouillon en lecture seule.`,
      lostUnknown:
        "Quelqu'un a repris la main : tu vois maintenant ce brouillon en lecture seule.",
      lostSelf:
        "Tu as pris la main dans un autre onglet : ici, tu vois maintenant ce brouillon en lecture seule.",
      unsaved:
        "Ce que tu n'avais pas encore enregistré n'est pas perdu : copie-le avant de quitter la page.",
      stashKept:
        "Le texte que tu n'avais pas enregistré avant de perdre la main est encore disponible.",
      dismiss: "Ignorer",
      copy: "Copier mon texte",
      copied: "Ton texte est copié. Colle-le où tu veux.",
      copyFailed: "La copie n'a pas marché. Sélectionne ton texte à la main.",
      released:
        "Cet onglet est resté caché plus de 30 minutes : le brouillon a été libéré pour l'équipe.",
      retake: "Reprendre l'écriture",
      someone: "Quelqu'un",
      trashed:
        "Ce contenu est dans la corbeille : restaure-le pour le modifier.",
      failed:
        "L'état du brouillon n'a pas pu être lu. Réessaie dans un instant.",
      reloadFailed:
        "Le brouillon n'a pas pu être relu. Ton texte reste à l'écran : réessaie dans un instant.",
    },
    // Erreurs de la base (RPC), selon leur code (docs/ARCHITECTURE-CONTENUS.md, « Étape 4 »).
    errors: {
      reserve_a_l_equipe:
        "Ta session ne donne plus accès à l'éditeur. Reconnecte-toi.",
      demande_invalide: "La demande n'est pas valide. Recharge la page.",
      sorte_invalide:
        "Ce type de contenu ou de modèle n'est pas valide. Recharge la page.",
      parent_invalide: "Ce contenu ne peut pas être rangé à cet endroit.",
      contenu_introuvable: "Ce contenu n'existe plus.",
      dans_la_corbeille:
        "Ce contenu est dans la corbeille : restaure-le pour le modifier.",
      verrou_perdu:
        "Quelqu'un d'autre a pris la main sur ce brouillon : tes dernières modifications ne sont pas enregistrées.",
      conflit_revision:
        "Le brouillon a changé ailleurs depuis ta dernière lecture. Copie ton texte, puis recharge la page.",
      reglages_invalides: "Un réglage n'est pas valide pour ce contenu.",
      adresse_invalide:
        "L'adresse ne contient que des lettres minuscules sans accent, des chiffres et des tirets.",
      adresse_prise: "Une autre page a déjà cette adresse.",
      categorie_invalide: "Une des catégories n'existe plus. Recharge la page.",
      brouillon_trop_lourd:
        "Ce brouillon est trop long pour être enregistré (256 Ko au plus). Découpe-le en plusieurs contenus.",
      brouillon_trop_imbrique:
        "Une liste contient trop de niveaux. Réduis les listes dans les listes.",
      forme_invalide:
        "Le brouillon n'a pas la forme attendue : il n'a pas été enregistré.",
      id_en_double:
        "Deux blocs ont le même identifiant. Recharge la page, puis réessaie.",
      fichier_indisponible:
        "Une image n'est plus disponible (supprimée ou pas prête). Choisis-en une autre.",
      modele_indisponible: "Un modèle utilisé n'est plus disponible.",
      // Étape 5 : publication, programmation, historique, corbeille.
      acces_a_choisir:
        "Choisis d'abord le niveau d'accès : Gratuit ou une formule d'abonnement.",
      verrou_tenu:
        "Quelqu'un écrit ce brouillon en ce moment : reprends la main, ou attends qu'il ait fini.",
      adresse_manquante: "Choisis l'adresse de la page avant de la publier.",
      son_manquant: "Choisis l'audio de l'épisode avant de le publier.",
      // [D49].
      titre_manquant: "Donne un titre avant de publier.",
      // Étape 7 : [D45].
      image_de_presentation_manquante:
        "Choisis l'image de présentation avant de publier : c'est la vignette des listes de l'app.",
      image_sans_fichier:
        "Une image n'a pas de fichier : choisis-en un, ou supprime le bloc.",
      fichier_inadapte:
        "Un fichier n'est pas du bon type : une photo ou une image pour un bloc Image ou l'image de présentation, un audio pour un épisode.",
      niveau_invalide:
        "Cette formule n'existe plus. Choisis un autre niveau d'accès.",
      date_passee:
        "Ce moment est déjà passé. Choisis un jour et une heure à venir.",
      version_introuvable:
        "Cette version n'existe plus. Recharge l'historique.",
      version_immuable: "Une version publiée ne se modifie pas.",
      modele_utilise:
        "Ce modèle est encore utilisé dans des brouillons : détache-le d'abord.",
      parent_dans_la_corbeille:
        "Restaure d'abord le chapitre ou la méthode qui le contient.",
      // Étape 6 : modèles de blocs.
      modele_vide:
        "Ce bloc partagé est encore vide : ajoute-lui son bloc dans Modèles de bloc avant de l'insérer.",
      modele_un_seul_bloc:
        "Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      bloc_introuvable:
        "Un des blocs choisis n'est pas encore enregistré. Attends la fin de l'enregistrement, puis réessaie.",
      modele_introuvable:
        "Ce modèle n'existe plus, ou ce n'est pas un bloc partagé. Recharge la page.",
      // Étape 7, partie 7b : méthodes.
      plan_perime:
        "Le plan a changé entre-temps : relis-le, puis range-le de nouveau.",
      plan_invalide:
        "Le plan de la méthode n'est pas valide. Recharge la page.",
    },
  },

  // Publication (étape 5) : barre de publication, programmation, historique, réglages.
  publication: {
    status: {
      label: "État de la publication",
      draft: "Brouillon",
      withdrawn: "Retiré de l'app",
      live: "En ligne",
      modified: "Modifié depuis la publication",
      scheduled: (date: string) => `Programmé le ${date}`,
      // Juste après l'heure prévue : la tâche planifiée n'est peut-être pas encore passée.
      due: "Publication en cours",
      waiting: "Programmation en attente : quelqu'un écrit",
      failed: "Programmation échouée",
    },
    // Bandeau de l'éditeur ([D16], [D31]).
    banner: {
      scheduled: (date: string) =>
        `Programmé le ${date} : ce que tu écris partira à cette heure.`,
      scheduledHint:
        "C'est le dernier brouillon enregistré à cette heure-là qui sera publié. Si quelqu'un l'a modifié depuis la programmation et a encore l'éditeur ouvert à ce moment-là, la publication attend qu'il le quitte, une heure au plus.",
      due: (date: string) =>
        `Programmé le ${date} : la publication part dans un instant.`,
      dueHint:
        "Si quelqu'un a modifié ce brouillon depuis la programmation et a encore l'éditeur ouvert, elle attendra qu'il le quitte, une heure au plus.",
      waiting: (date: string) =>
        `Programmation en attente depuis le ${date} : quelqu'un écrit ce brouillon.`,
      waitingHint:
        "La publication partira dès qu'il aura quitté l'éditeur. Au bout d'une heure, elle échouera.",
      // La personne devant l'écran tient elle-même le verrou ([D31]).
      waitingMine: (date: string) =>
        `Programmé le ${date} : la publication attend que tu quittes l'éditeur.`,
      waitingMineHint:
        "Tu as modifié le brouillon depuis la programmation : tant que ton éditeur reste ouvert, même sans écrire, elle ne part pas. Au bout d'une heure, elle échouera.",
      leave: "Quitter l'éditeur",
      // Une méthode : l'attente peut venir de sa fiche, d'un chapitre ou d'une leçon ([D31]).
      method: {
        scheduledHint:
          "C'est le dernier brouillon enregistré à cette heure-là de la fiche, des chapitres et des leçons qui sera publié. Si quelqu'un a modifié l'un d'eux depuis la programmation et a encore son éditeur ouvert à ce moment-là, la publication attend qu'il le quitte, une heure au plus.",
        dueHint:
          "Si quelqu'un a modifié la fiche, un chapitre ou une leçon depuis la programmation et a encore son éditeur ouvert, elle attendra qu'il le quitte, une heure au plus.",
        waiting: (date: string) =>
          `Programmation en attente depuis le ${date} : quelqu'un écrit la méthode, un chapitre ou une leçon.`,
        waitingHint:
          "La publication partira dès que cette personne aura quitté son éditeur. Au bout d'une heure, elle échouera.",
        waitingMine: (date: string) =>
          `Programmé le ${date} : la publication attend que la personne qui écrit quitte son éditeur, peut-être toi.`,
        waitingMineHint:
          "Si tu as modifié la fiche depuis la programmation, elle ne part pas tant que ton éditeur reste ouvert, même sans écrire. Si c'est un chapitre ou une leçon, elle attend que la personne qui l'écrit le quitte. Au bout d'une heure, elle échouera.",
      },
      failed: "La publication programmée a échoué.",
      failedReason: (reason: string) => `Raison : ${reason}`,
      failedBy: (name: string) => `Elle avait été programmée par ${name}.`,
    },
    // Codes de contents.schedule_error propres à la tâche planifiée (les autres sont ceux de
    // la publication, dans texts.editor.errors).
    scheduleErrors: {
      auteur_parti:
        "la personne qui l'avait programmée ne fait plus partie de l'équipe.",
      brouillon_en_cours_d_ecriture:
        "quelqu'un écrivait encore le brouillon au bout d'une heure d'attente.",
      erreur_inattendue: "une erreur inattendue est survenue.",
    },
    actions: {
      publish: "Publier",
      more: "Autres actions de publication",
      schedule: "Programmer…",
      reschedule: "Changer la programmation…",
      unschedule: "Annuler la programmation",
      dismissFailure: "Effacer l'échec",
      unpublish: "Retirer de l'app",
      history: "Historique",
      settings: "Réglages",
    },
    publishDialog: {
      title: "Publier dans l'app ?",
      titleAgain: "Publier les modifications ?",
      description:
        "Les lecteurs verront ce brouillon tel qu'il est enregistré. Tu pourras ensuite le modifier sans toucher à l'app, jusqu'à la prochaine publication.",
      access: "Niveau d'accès",
      address: "Adresse",
      confirm: "Publier",
      // Une méthode : tout part d'un seul geste ([D29]).
      methodDescription:
        "La fiche, le plan et les chapitres et leçons cochés « Montrer dans l'app » partent ensemble, tels qu'ils sont enregistrés. Rien d'autre ne change dans l'app.",
    },
    // Ce qui manque pour publier ou programmer ([D45], audio d'un épisode), et le conseil [D46].
    requirements: {
      publishTitle: "Pour publier, il manque :",
      scheduleTitle: "Pour programmer, il manque :",
      title: "Le titre.",
      writeTitle: "Écrire le titre",
      cover: "L'image de présentation (la vignette des listes de l'app).",
      coverUnavailable:
        "Une image de présentation disponible : la sienne est supprimée ou pas prête.",
      audio: "L'audio de l'épisode.",
      audioUnavailable:
        "Un audio disponible : le sien est supprimé ou pas prêt.",
      chooseCover: "Choisir l'image",
      chooseAudio: "Choisir l'audio",
      transcript:
        "Conseillé : l'audio n'a pas de transcription. Tu peux publier quand même, et l'ajouter ensuite dans sa fiche de la médiathèque.",
    },
    levelRequired:
      "Il n'y a pas de niveau d'accès par défaut : choisis Gratuit ou une formule.",
    levelNeedsLock:
      "Pour choisir le niveau d'accès, prends d'abord la main sur le brouillon.",
    needsSaved:
      "Le brouillon n'est pas encore enregistré. Attends la fin de l'enregistrement, puis réessaie.",
    published: (number: number) => `Publié dans l'app (version n° ${number}).`,
    upToDate: "Ce brouillon est déjà en ligne, tel quel.",
    conflict:
      "Le brouillon vient de changer : relis-le, puis publie de nouveau.",
    lockHeld: {
      title: "Quelqu'un écrit ce brouillon",
      description: (name: string) =>
        `${name} écrit ce brouillon en ce moment. Pour publier, reprends la main (${name} passera en lecture seule), ou attends qu'il ait fini.`,
      take: "Reprendre la main",
      // Méthode : quelqu'un écrit un de ses chapitres ou une de ses leçons ([D14]).
      elementTitle: "Quelqu'un écrit un élément de la méthode",
      elementDescription: (name: string) =>
        `${name} écrit un chapitre ou une leçon de cette méthode en ce moment : le plan montre lequel. Attends qu'il ait fini, ou ouvre cet élément pour reprendre la main, puis publie.`,
    },
    unpublishDialog: {
      title: "Retirer de l'app ?",
      description:
        "Les lecteurs ne le verront plus. Le brouillon et l'historique sont gardés, et tu pourras le publier de nouveau. Une publication programmée est annulée.",
      confirm: "Retirer de l'app",
      done: "Retiré de l'app.",
      // Une méthode : ses chapitres et ses leçons partent avec elle.
      methodDescription:
        "Les lecteurs ne verront plus la méthode, ni ses chapitres et ses leçons. Les brouillons et l'historique sont gardés, et tu pourras la publier de nouveau. Une publication programmée est annulée.",
    },
    scheduleDialog: {
      title: "Programmer la publication",
      description:
        "Choisis le jour et l'heure, à l'heure de Paris. À ce moment-là, le dernier brouillon enregistré partira dans l'app.",
      date: "Jour",
      time: "Heure (Paris)",
      summary: (date: string) => `Publication le ${date}.`,
      ambiguous:
        "Cette heure existe deux fois cette nuit-là (retour à l'heure d'hiver) : la publication partira à la première, encore en heure d'été.",
      confirm: "Programmer",
      done: (date: string) => `Publication programmée le ${date}.`,
      errors: {
        required: "Choisis un jour et une heure.",
        invalid: "Ce jour ou cette heure n'existe pas.",
        nonexistent:
          "Cette heure n'existe pas ce jour-là : à 02h00, on passe directement à 03h00 (heure d'été). Choisis une autre heure.",
        past: "Ce moment est déjà passé. Choisis un jour et une heure à venir.",
      },
    },
    unscheduled: "Programmation annulée.",
    failureDismissed: "Échec effacé.",
    history: {
      title: "Historique",
      description:
        "Les versions publiées, de la plus récente à la plus ancienne. Revenir à une version la recopie dans le brouillon, sans rien changer dans l'app.",
      empty: "Aucune version publiée pour l'instant.",
      version: (number: number) => `Version n° ${number}`,
      by: (name: string) => `par ${name}`,
      live: "En ligne",
      origins: {
        manual: "Publiée",
        scheduled: "Publiée à l'heure programmée",
        template: "Mise à jour d'un modèle",
        outline: "Plan de la méthode",
        files: "Textes de la médiathèque mis à jour",
      },
      // Les catégories d'une version (article, épisode), dans l'ordre de la section ([D28]).
      categories: (names: string[]) => `Catégories : ${names.join(", ")}`,
      noCategory: "Aucune catégorie",
      deletedCategories: (count: number) =>
        count === 1 ? "catégorie supprimée" : `${count} catégories supprimées`,
      revert: "Revenir à cette version",
      revertItem: (number: number) => `Revenir à la version n° ${number}`,
      confirm: {
        title: (number: number) => `Revenir à la version n° ${number} ?`,
        // Ce que revert_to_version remplace dépend de la sorte : l'adresse d'une page, les
        // catégories d'un article ou d'un épisode.
        description: (kind: string) =>
          kind === "method"
            ? "Seule la fiche revient : le titre, le résumé, l'image de présentation et le niveau d'accès. Le plan, les chapitres et les leçons ne changent pas : chacun a son propre historique. Rien ne change dans l'app avant la prochaine publication."
            : kind === "chapter"
              ? "L'introduction du chapitre sera remplacée par cette version. Rien ne change dans l'app avant la prochaine publication de la méthode."
              : kind === "lesson"
                ? "La leçon sera remplacée par cette version : son texte et « Leçon gratuite ». Rien ne change dans l'app avant la prochaine publication de la méthode."
                : kind === "page"
                  ? "Le brouillon sera remplacé par cette version : son texte, son niveau d'accès et son adresse. Rien ne change dans l'app avant la prochaine publication."
                  : kind === "article" || kind === "episode"
                    ? "Le brouillon sera remplacé par cette version : son texte, son niveau d'accès et ses catégories (une catégorie supprimée depuis ne revient pas). Rien ne change dans l'app avant la prochaine publication."
                    : "Le brouillon sera remplacé par cette version : son texte et son niveau d'accès. Rien ne change dans l'app avant la prochaine publication.",
        confirm: "Revenir à cette version",
      },
      needsLock:
        "Pour revenir à une version, prends d'abord la main sur le brouillon.",
      reverted: (number: number) =>
        `Le brouillon reprend la version n° ${number}.`,
      warnings: {
        fichier_retire:
          "Un fichier n'est plus disponible : choisis-en un autre avant de publier.",
        modele_detache:
          "Un modèle n'existe plus : son bloc est devenu une copie ordinaire.",
        adresse_prise:
          "Une autre page a pris cette adresse entre-temps : le brouillon garde son adresse actuelle.",
      },
      loadFailed: "L'historique n'a pas pu être chargé.",
    },
    settings: {
      title: "Réglages du contenu",
      description:
        "Ils sont enregistrés avec le brouillon et ne changent l'app qu'à la prochaine publication.",
      readOnly:
        "Lecture seule : prends la main sur le brouillon pour modifier les réglages.",
      titleLabel: "Titre",
      titleRequired: "Donne un titre.",
      access: {
        label: "Niveau d'accès",
        description:
          "Qui peut lire ce contenu dans l'app. Il n'y a pas de niveau par défaut.",
        free: "Gratuit",
        freeHint: "Tout le monde peut le lire.",
        levelHint:
          "Pour les abonnés de cette formule et des formules plus complètes.",
        notChosen: "Pas encore choisi : « Publier » le demandera.",
        notChosenShort: "Pas encore choisi",
        noLevels:
          "Aucune formule d'abonnement pour l'instant : un admin peut en créer dans les paramètres.",
        loadFailed: "Les formules d'abonnement n'ont pas pu être chargées.",
        live: (name: string) => `En ligne : ${name}`,
        deleted: "formule supprimée",
      },
      slug: {
        label: "Adresse de la page",
        description:
          "Ce que l'app demande pour ouvrir la page : des lettres minuscules sans accent, des chiffres et des tirets.",
        placeholder: "mentions-legales",
        invalid:
          "Des lettres minuscules sans accent, des chiffres et des tirets seulement (pas de tiret au début, à la fin ni deux de suite).",
        tooLong: "L'adresse ne doit pas dépasser 100 caractères.",
        fromTitle: "Reprendre le titre",
        live: (slug: string) => `En ligne : ${slug}`,
        missing: "Choisis l'adresse de la page avant de la publier.",
        taken: (title: string) =>
          `La page « ${title || "Sans titre"} » a déjà cette adresse : choisis-en une autre.`,
        checking: "Vérification de l'adresse…",
      },
      categories: {
        label: "Catégories",
        description:
          "Facultatives : l'app s'en sert pour filtrer. Elles ne changent l'app qu'à la prochaine publication.",
        none: "Aucune catégorie dans cette section pour l'instant.",
        loadFailed: "Les catégories n'ont pas pu être chargées.",
      },
      // Chapitre ou leçon : « Montrer dans l'app » et « Leçon gratuite » ([D29], [D43]).
      element: {
        label: "Dans l'app",
        description:
          "Ils ne changent l'app qu'à la prochaine publication de la méthode.",
        inApp: "Montrer dans l'app",
        inAppHint:
          "Décoché à la création : coche-le quand l'élément est prêt. Il partira avec la prochaine publication de la méthode.",
        chapterInAppHint:
          "Ses leçons ne partent que si leur chapitre est montré.",
        isFree: "Leçon gratuite",
        isFreeHint:
          "Lisible par tout le monde, même si la méthode est réservée. L'introduction de son chapitre devient gratuite elle aussi.",
      },
      // Un réglage refusé par la base : le brouillon s'enregistre quand même, sans lui.
      refused:
        "Ce réglage n'a pas été changé. Le reste du brouillon continue d'être enregistré.",
    },
  },

  // Paramètres (admins) : les formules d'abonnement.
  settings: {
    accessLevels: {
      title: "Formules d'abonnement",
      description:
        "Rangées de la moins complète (en haut) à la plus complète (en bas). Un abonné lit les contenus de sa formule et ceux des formules placées au-dessus. Changer l'ordre change tout de suite ce que chaque abonné peut lire.",
      listLabel: "Formules, de la moins complète à la plus complète",
      empty:
        "Aucune formule pour l'instant. Sans formule, un contenu ne peut être que gratuit.",
      name: "Nom de la nouvelle formule",
      namePlaceholder: "Par exemple : Essentiel",
      addTitle: "Ajouter une formule",
      addDescription:
        "Elle arrive en bas de la liste, comme la plus complète ; range-la ensuite à sa place.",
      nameRequired: "Donne un nom à la formule.",
      nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
      add: "Ajouter",
      added: (name: string) => `Formule « ${name} » ajoutée.`,
      rank: (position: number) => `n° ${position}`,
      rename: "Renommer",
      renameLabel: (name: string) => `Nouveau nom pour ${name}`,
      renamed: "Formule renommée.",
      remove: "Supprimer",
      actions: (name: string) => `Actions pour ${name}`,
      confirmRemove: {
        title: "Supprimer cette formule ?",
        description: (name: string) =>
          `La formule « ${name} » sera supprimée. C'est possible seulement si aucun contenu, aucune version publiée et aucun abonné ne s'en sert.`,
        confirm: "Supprimer définitivement",
      },
      removed: (name: string) => `Formule « ${name} » supprimée.`,
      handle: (name: string) => `Déplacer ${name}`,
      reordered: "Nouvel ordre enregistré.",
      // Glisser-déposer : annonces lues par les lecteurs d'écran.
      dnd: {
        roleDescription: "formule déplaçable",
        instructions:
          "Pour déplacer une formule, appuie sur Espace ou Entrée sur sa poignée. Déplace-la avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
        start: (name: string) => `Tu as pris ${name}.`,
        over: (name: string, position: number, count: number) =>
          `${name} est à la place n° ${position} sur ${count}.`,
        end: (name: string, position: number, count: number) =>
          `${name} déposée à la place n° ${position} sur ${count}.`,
        cancel: (name: string) =>
          `Déplacement annulé : ${name} reprend sa place.`,
      },
      loadFailed: "Les formules n'ont pas pu être chargées.",
      errors: {
        formule_utilisee:
          "Cette formule est utilisée par un contenu, une version publiée ou un abonné : renomme-la ou déplace-la plutôt.",
        nom_en_double: "Une formule porte déjà ce nom.",
        reserve_aux_admins: "Les formules sont réservées aux admins.",
        reserve_a_l_equipe:
          "Ta session ne donne plus accès aux paramètres. Reconnecte-toi.",
        demande_invalide:
          "La liste a changé entre-temps. Recharge la page, puis réessaie.",
        introuvable: "Cette formule n'existe plus. Recharge la page.",
      },
    },
  },

  // Lecteur audio (fiche d'un fichier, présentation d'un épisode).
  audioPlayer: {
    play: (name: string) => `Écouter ${name}`,
    pause: (name: string) => `Mettre ${name} en pause`,
    position: "Position dans l'audio",
    mute: "Couper le son",
    unmute: "Remettre le son",
    failed:
      "Cet audio n'a pas pu être lu. Vérifie ta connexion, puis réessaie.",
  },

  // Menu de l'avatar, en haut à droite de chaque page.
  accountMenu: {
    open: "Menu de ton compte",
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
    back: "Retour au tableau de bord",
  },

  error: {
    title: "Une erreur est survenue",
    description:
      "Quelque chose s'est mal passé. L'erreur a été signalée. Recharge la page pour réessayer.",
    reload: "Recharger la page",
  },

  dates: {
    // Entre la date et l'heure : « 27 sept. 2026 à 18h42 »
    at: "à",
    // Entre les heures et les minutes : « 18h42 »
    hour: "h",
    // Champs « Jour » et « Heure » (fenêtre « Programmer »).
    dayPlaceholder: "jj/mm/aaaa",
    timePlaceholder: "08h00",
    pickDay: "Choisir le jour dans le calendrier",
  },
} as const

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
      description:
        "Les images, SVG, animations, audios et PDF, utilisables dans tous les contenus.",
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
    },
    kinds: {
      image: "Image",
      svg: "SVG",
      lottie: "Animation Lottie",
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
      details: "Dimensions ou durée",
      createdAt: "Ajouté le",
      status: "État",
    },
    open: (name: string) => `Ouvrir la fiche de ${name}`,
    empty: {
      title: "Aucun fichier pour l'instant",
      description:
        "Envoie des images, des sons, des animations ou des PDF : ils serviront dans les contenus.",
    },
    noResults: {
      title: "Aucun fichier trouvé",
      description: "Essaie un autre nom ou un autre type.",
    },
    tooMany: (count: number) =>
      `Seuls les ${count} fichiers les plus récents sont affichés. Affine ta recherche pour trouver les autres.`,
    loadFailed: "La médiathèque n'a pas pu être chargée.",
    refreshFailed:
      "La médiathèque n'a pas pu être mise à jour : elle date peut-être un peu.",
    retry: "Réessayer",
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
      title: "Envois",
      clear: "Effacer la liste",
      cancel: (name: string) => `Annuler l'envoi de ${name}`,
      retry: (name: string) => `Réessayer l'envoi de ${name}`,
      dismiss: (name: string) => `Retirer ${name} de la liste`,
      stages: {
        waiting: "En attente",
        preparing: "Préparation…",
        sending: "Envoi…",
        confirming: "Enregistrement…",
        done: "Envoyé",
        error: "Échec",
        cancelled: "Annulé",
      },
      checking: "Envoyé, vérification en cours",
      checked: "Envoyé et vérifié",
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
        "Format refusé. Envoie une image (JPEG, PNG, WebP, GIF, HEIC), un SVG, une animation Lottie (.json), un audio (MP3, M4A) ou un PDF.",
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
      transcriptTooLong: "La transcription est trop longue.",
      save: "Enregistrer",
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
      untitled: "Sans titre",
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
      label: "Type d'élément",
      all: "Tout",
      file: "Fichiers",
      page: "Pages",
      article: "Articles",
      episode: "Épisodes",
      method: "Méthodes",
      template: "Modèles",
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
      template: "Modèle",
    },
    untitled: "Sans titre",
    // Ce qui est parti avec une méthode (même lot) : restauré ou effacé avec elle.
    batch: (count: number) =>
      count === 1 ? "avec 1 élément" : `avec ${count} éléments`,
    batchList: (names: string) => `Parti avec lui : ${names}.`,
    select: (name: string) => `Sélectionner ${name}`,
    selectAll: "Tout sélectionner",
    eraseSelection: (count: number) => `Effacer la sélection (${count})`,
    confirmSelection: {
      title: "Effacer la sélection ?",
      description: (count: number) =>
        count === 1
          ? "L'élément sélectionné sera effacé définitivement. Tu ne pourras pas revenir en arrière."
          : `Les ${count} éléments sélectionnés seront effacés définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Effacer définitivement",
    },
    // Seules les pages ont une adresse.
    restoredWithoutAddress: (name: string) =>
      `La page « ${name} » est restaurée, mais sans adresse : une autre page a pris la sienne entre-temps. Choisis-en une autre avant de la publier.`,
    restoredDraft:
      "Il revient en brouillon : il n'est pas republié dans l'app.",
    columns: {
      name: "Nom",
      type: "Type",
      deletedAt: "Supprimé le",
      purgeAt: "Effacement automatique",
      actions: "Actions",
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
        `${name} sera effacé définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Effacer définitivement",
    },
    retention:
      "Ce qui est supprimé reste ici 30 jours, puis est effacé automatiquement.",
    emptyState: {
      title: "La corbeille est vide",
      description:
        "Ce que tu supprimes arrive ici. Tu peux le restaurer pendant 30 jours.",
    },
    emptyFilter: "Aucun élément de ce type dans la corbeille.",
    loadFailed: "La corbeille n'a pas pu être chargée.",
    refreshFailed:
      "La corbeille n'a pas pu être mise à jour : elle date peut-être un peu.",
    retry: "Réessayer",
  },

  // Liste des pages (étape 4 : minimale, pour essayer l'éditeur ; complétée à l'étape 7).
  contentList: {
    create: "Nouvelle page",
    createFailed: "La page n'a pas pu être créée.",
    columns: {
      title: "Titre",
      publication: "Publication",
      savedAt: "Dernière modification",
      status: "En ce moment",
      actions: "Actions",
    },
    actions: (title: string) => `Actions pour ${title}`,
    open: "Ouvrir",
    trash: "Supprimer",
    confirmTrash: {
      title: "Supprimer cette page ?",
      description: (title: string) =>
        `${title} va dans la corbeille. Si elle est en ligne, elle disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras la restaurer pendant 30 jours.`,
      confirm: "Mettre à la corbeille",
    },
    trashed: (title: string) => `${title} est dans la corbeille.`,
    undo: "Annuler",
    restored: (title: string) => `${title} est restaurée, en brouillon.`,
    untitled: "Sans titre",
    savedBy: (name: string) => `par ${name}`,
    beingEdited: (name: string) => `${name} écrit`,
    empty: {
      title: "Aucune page pour l'instant",
      description:
        "Crée une page : elle s'ouvre aussitôt dans l'éditeur, et tout ce que tu écris est enregistré au fur et à mesure.",
    },
    loadFailed: "La liste n'a pas pu être chargée.",
    refreshFailed:
      "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
    retry: "Réessayer",
    // « Nouvelle page » quand des points de départ existent pour les Pages ([D42]).
    blank: "Page vide",
    starters: "Points de départ",
  },

  // Modèles de blocs (étape 6) : page Modèles, éditeur d'un modèle, insertion dans un contenu,
  // « Enregistrer comme modèle ». docs/ADMINISTRATION.md, § 5.
  templates: {
    sorts: {
      style: {
        title: "Mise en forme réutilisable",
        description:
          "On insère une copie déjà mise en forme, puis on y écrit son propre texte. Modifier le modèle ne change pas les contenus déjà écrits.",
        example: "Exemple : un encadré « À retenir ».",
      },
      shared: {
        title: "Bloc identique partout",
        description:
          "Le même bloc, avec le même texte, dans plusieurs contenus. On le corrige une seule fois dans le modèle, et il est corrigé dans tous les brouillons qui l'utilisent.",
        example:
          "Exemple : un encadré « Contact ». Il contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      },
      starter: {
        title: "Point de départ",
        description:
          "Un nouveau contenu s'ouvre avec une structure déjà en place, au lieu d'une page vide.",
        example: "Exemple : « Interview ».",
      },
    },
    // La section d'un point de départ ([D42]) : la sorte de contenu qu'il sert à créer.
    sections: {
      article: "Blog (article)",
      episode: "Podcasts (épisode)",
      chapter: "Méthodes (chapitre)",
      lesson: "Méthodes (leçon)",
      page: "Pages",
    },
    list: {
      create: "Nouveau modèle",
      columns: {
        name: "Nom",
        uses: "Utilisation",
        section: "Section",
        savedAt: "Dernière modification",
        status: "En ce moment",
        actions: "Actions",
      },
      untitled: "Sans nom",
      empty: {
        title: "Aucun modèle pour l'instant",
        description:
          "Crée un modèle ici, ou depuis un contenu : choisis des blocs dans le plan, puis « Enregistrer comme modèle ».",
      },
      emptySort: "Aucun modèle de cette sorte pour l'instant.",
      uses: (count: number) =>
        count === 0
          ? "Utilisé nulle part"
          : count === 1
            ? "Utilisé dans 1 brouillon"
            : `Utilisé dans ${count} brouillons`,
      usesLoading: "Recherche des brouillons…",
      actions: (name: string) => `Actions pour ${name}`,
      open: "Ouvrir",
      trash: "Supprimer",
      savedBy: (name: string) => `par ${name}`,
      beingEdited: (name: string) => `${name} le modifie`,
      loadFailed: "La liste des modèles n'a pas pu être chargée.",
      refreshFailed:
        "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
      retry: "Réessayer",
      createFailed: "Le modèle n'a pas pu être créé.",
      confirmTrash: {
        title: "Supprimer ce modèle ?",
        description: (name: string) =>
          `${name} va dans la corbeille : tu pourras le restaurer pendant 30 jours. Les contenus où il a été inséré gardent leur copie.`,
        confirm: "Mettre à la corbeille",
      },
      trashed: (name: string) => `${name} est dans la corbeille.`,
      undo: "Annuler",
      restored: (name: string) => `${name} est restauré.`,
      // Un bloc identique partout utilisé ne se supprime pas (ADMIN § 5).
      used: {
        title: "Ce modèle est encore utilisé",
        description:
          "Un bloc identique partout ne se supprime pas tant qu'un brouillon l'utilise. « Détacher partout » en fait une copie ordinaire dans chacun d'eux, corbeille comprise : ils ne suivront plus le modèle. Ce qui est en ligne dans l'app ne change pas.",
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
        "Choisis la sorte du modèle : elle ne changera plus. Tu écriras ensuite ses blocs dans l'éditeur.",
      name: "Nom",
      namePlaceholder: "Par exemple : Contact",
      nameRequired: "Donne un nom au modèle.",
      nameTooLong: "Le nom fait 200 caractères au plus.",
      sort: "Sorte",
      section: "Section",
      sectionPlaceholder: "Choisis une section",
      sectionHint:
        "Le point de départ ne sera proposé que dans cette section : « Nouvelle page » ne propose que ceux des Pages.",
      sectionRequired: "Choisis la section du point de départ.",
      submit: "Créer le modèle",
    },
    // Éditeur d'un modèle (le même éditeur plein écran, sans publication).
    editor: {
      nameLabel: "Nom du modèle",
      namePlaceholder: "Nom du modèle",
      sort: "Sorte du modèle",
      starterFor: (section: string) => `Point de départ : ${section}`,
      sharedLimit:
        "Un bloc identique partout contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
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
      inTrash: "dans la corbeille",
      keepBlock:
        "Ce modèle est utilisé : il garde son bloc. Pour le retirer, détache-le d'abord partout (page Modèles).",
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
    // Un bloc lié (bloc identique partout) dans l'éditeur d'un contenu.
    linked: {
      label: (name: string) => `Modèle : ${name}`,
      loading: "Chargement du modèle…",
      missing:
        "Ce modèle n'existe plus ou est dans la corbeille : supprime ce bloc, ou restaure le modèle.",
      empty: "Ce modèle est vide.",
      edit: "Modifier le modèle",
      editLabel: (name: string) => `Modifier le modèle ${name}`,
      detach: "Détacher",
      detachLabel: (name: string) => `Détacher du modèle ${name}`,
      detached: (name: string) =>
        `Bloc détaché de ${name} : c'est maintenant une copie ordinaire, que tu peux modifier ici.`,
      settings: (name: string) =>
        `Ce bloc est identique partout : il vient du modèle ${name}. Pour le corriger, modifie le modèle : la correction apparaîtra dans tous les brouillons qui l'utilisent.`,
      detachHint:
        "« Détacher » en fait une copie ordinaire, modifiable ici, qui ne suit plus le modèle. Les autres contenus restent liés.",
    },
    // « Ajouter un bloc » › « Un modèle… ».
    insert: {
      menu: "Un modèle…",
      title: "Insérer un modèle",
      description:
        "Une mise en forme s'insère en copie, que tu modifies ici. Un bloc identique partout reste lié à son modèle.",
      empty:
        "Aucun modèle à insérer pour l'instant. Crée-en un dans la section Modèles.",
      insert: "Insérer",
      insertLabel: (name: string) => `Insérer ${name}`,
      emptyTemplate: "Vide : ajoute-lui son bloc dans Modèles.",
      loadFailed: "Les modèles n'ont pas pu être chargés.",
      retry: "Réessayer",
      manage: "Gérer les modèles",
      inserted: (name: string) => `Modèle inséré : ${name}.`,
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
        "Pour un bloc identique partout, choisis un seul bloc (un encadré peut en regrouper plusieurs).",
      sharedReplaced:
        "Le bloc est maintenant lié au modèle : le corriger dans le modèle le corrigera ici aussi.",
      submit: "Enregistrer le modèle",
      saved: (name: string) => `Modèle enregistré : ${name}.`,
      open: "Ouvrir",
    },
  },

  // Éditeur de blocs (plein écran) : docs/ARCHITECTURE-CONTENUS.md, § 2.7 et § 3.3.
  editor: {
    back: (section: string) => `Retour à ${section}`,
    loading: "Ouverture du brouillon…",
    notFound: {
      title: "Contenu introuvable",
      description:
        "Ce contenu n'existe plus, ou il est dans la corbeille. Retourne à la liste.",
    },
    title: {
      label: "Titre du contenu",
      placeholder: "Titre",
      tooLong: "Le titre ne doit pas dépasser 200 caractères.",
    },
    untitled: "Sans titre",
    pageTitle: (title: string) => `${title} — Éditeur`,
    blocks: {
      text: "Texte",
      image: "Image",
      box: "Encadré",
      linked: "Bloc identique partout",
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
        name ? `Bloc identique « ${name} »` : "Bloc identique partout",
    },
    textPlaceholder: "Écris ici…",
    add: {
      label: "Ajouter un bloc",
      hint: "Ajouté après le bloc choisi, ou à la fin.",
      inBox: "Ajouter dans l'encadré",
    },
    emptyPage: {
      title: "Page vide",
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
      refused: "Un encadré ne peut pas aller dans un autre encadré.",
    },
    outline: {
      toggle: "Plan",
      show: "Afficher le plan",
      hide: "Masquer le plan",
      title: "Plan",
      empty: "Aucun bloc pour l'instant.",
      select: (label: string) => `Aller à ${label}`,
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
      missing: "Fichier supprimé, choisis-en un autre.",
      loadFailed: "L'image n'a pas pu être chargée.",
      retry: "Réessayer",
      notReady: "Ce fichier n'est pas prêt. Choisis-en un autre.",
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
      retry: "Réessayer",
      upload: "Envoyer une image",
      uploadInput: "Image à envoyer",
      uploading: (name: string) => `Envoi de ${name}…`,
      uploadingProgress: (name: string, percent: string) =>
        `Envoi de ${name}… ${percent}`,
      uploadFailed: (name: string, error: string) =>
        `Échec de l'envoi de ${name}. ${error}`,
      notImage: (name: string) =>
        `${name} est dans la Médiathèque, mais le bloc Image n'accepte que les photos et les images (JPEG, PNG, WebP, GIF, HEIC).`,
    },
    settings: {
      label: "Réglages du bloc",
      title: (label: string) => `Réglages : ${label}`,
      none: "Choisis un bloc dans l'aperçu pour voir ses réglages.",
      readOnly: "Lecture seule : tu ne peux rien modifier.",
      text: "Écris directement dans l'aperçu. Sélectionne des mots pour les mettre en forme avec la barre au-dessus du téléphone.",
      image: {
        file: "Fichier",
        alt: "Texte alternatif",
        altFromLibrary: "Reprendre celui de la médiathèque",
        libraryAlt: (alt: string) => `Médiathèque : « ${alt} »`,
        noLibraryAlt:
          "La médiathèque n'a pas de texte alternatif pour cette image.",
        altHint:
          "Décris l'image en une phrase pour les personnes qui ne la voient pas.",
        altTooLong: "1 000 caractères au plus.",
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
    page: {
      title: "Brouillon",
      savedAt: (date: string) => `Enregistré le ${date}`,
      size: (percent: string) => `Taille : ${percent} de la limite`,
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
      taking: "Ouverture du brouillon…",
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
      retry: "Réessayer",
      reloadFailed:
        "Le brouillon n'a pas pu être relu. Ton texte reste à l'écran : réessaie dans un instant.",
    },
    // Erreurs de la base (RPC), selon leur code (docs/ARCHITECTURE-CONTENUS.md, « Étape 4 »).
    errors: {
      reserve_a_l_equipe:
        "Ta session ne donne plus accès à l'éditeur. Reconnecte-toi.",
      demande_invalide: "La demande n'est pas valide. Recharge la page.",
      sorte_invalide:
        "Cette sorte de contenu ou de modèle n'est pas valide. Recharge la page.",
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
      son_manquant: "Choisis le son de l'épisode avant de le publier.",
      image_sans_fichier:
        "Une image n'a pas de fichier : choisis-en un, ou supprime le bloc.",
      fichier_inadapte:
        "Un fichier n'est pas du bon type : une photo ou une image pour un bloc Image, un audio pour un épisode.",
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
        "Ce bloc identique partout est encore vide : ajoute-lui son bloc dans Modèles avant de l'insérer.",
      modele_un_seul_bloc:
        "Un bloc identique partout contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      bloc_introuvable:
        "Un des blocs choisis n'est pas encore enregistré. Attends la fin de l'enregistrement, puis réessaie.",
      modele_introuvable:
        "Ce modèle n'existe plus, ou ce n'est pas un bloc identique partout. Recharge la page.",
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
    liveSince: (number: number, date: string) =>
      `Version n° ${number} en ligne depuis le ${date}.`,
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
      failed: "La publication programmée a échoué",
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
    },
    unpublishDialog: {
      title: "Retirer de l'app ?",
      description:
        "Les lecteurs ne le verront plus. Le brouillon et l'historique sont gardés, et tu pourras le publier de nouveau. Une publication programmée est annulée.",
      confirm: "Retirer de l'app",
      done: "Retiré de l'app.",
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
          "Cette heure n'existe pas ce jour-là : à 2 h, on passe directement à 3 h (heure d'été). Choisis une autre heure.",
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
      revert: "Revenir à cette version",
      revertItem: (number: number) => `Revenir à la version n° ${number}`,
      confirm: {
        title: (number: number) => `Revenir à la version n° ${number} ?`,
        description:
          "Le brouillon sera remplacé par cette version : son texte, son niveau d'accès et son adresse. Rien ne change dans l'app avant la prochaine publication.",
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
      retry: "Réessayer",
    },
    settings: {
      title: "Réglages du contenu",
      description:
        "Ils sont enregistrés avec le brouillon et ne changent l'app qu'à la prochaine publication.",
      readOnly:
        "Lecture seule : prends la main sur le brouillon pour modifier les réglages.",
      access: {
        label: "Niveau d'accès",
        description:
          "Qui peut lire ce contenu dans l'app. Il n'y a pas de niveau par défaut.",
        free: "Gratuit",
        freeHint: "Tout le monde peut le lire.",
        levelHint:
          "Pour les abonnés de cette formule et des formules plus complètes.",
        notChosen: "Pas encore choisi : « Publier » le demandera.",
        noLevels:
          "Aucune formule d'abonnement pour l'instant : un admin peut en créer dans les Paramètres.",
        loadFailed: "Les formules d'abonnement n'ont pas pu être chargées.",
        retry: "Réessayer",
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
      namePlaceholder: "Essentiel",
      nameRequired: "Donne un nom à la formule.",
      nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
      add: "Ajouter",
      added: (name: string) => `Formule « ${name} » ajoutée.`,
      rank: (position: number) => `n° ${position}`,
      rename: "Renommer",
      renameItem: (name: string) => `Renommer ${name}`,
      renameLabel: (name: string) => `Nouveau nom pour ${name}`,
      save: "Enregistrer",
      renamed: "Formule renommée.",
      remove: "Supprimer",
      removeItem: (name: string) => `Supprimer ${name}`,
      confirmRemove: {
        title: "Supprimer cette formule ?",
        description: (name: string) =>
          `La formule « ${name} » sera supprimée. C'est possible seulement si aucun contenu, aucune version publiée et aucun abonné ne s'en sert.`,
        confirm: "Supprimer",
      },
      removed: (name: string) => `Formule « ${name} » supprimée.`,
      handle: (name: string) => `Déplacer ${name}`,
      moveUp: (name: string) => `Monter ${name}`,
      moveDown: (name: string) => `Descendre ${name}`,
      reordered: "Nouvel ordre enregistré.",
      moved: (name: string, position: number, count: number) =>
        `${name} est maintenant n° ${position} sur ${count}.`,
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
      retry: "Réessayer",
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

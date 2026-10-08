// Tous les textes de l'interface en français, tirés de l'anglais (en.ts), au même endroit.

import type { Texts } from "./en.ts"

export const fr: Texts = {
  app: {
    // Le nom par défaut de l'admin ; un admin le remplace par celui de la marque (Paramètres).
    name: "Ruche",
  },

  // Les langues de l'admin, chacune écrite dans sa langue (Mon compte).
  languages: {
    en: "English",
    fr: "Français",
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

  // Les faits renvoyés par la base avec une erreur (hint), écrits par l'admin (lib/error-facts.ts).
  errorFacts: {
    quoted: (text: string) => `« ${text} »`,
    someone: "Quelqu'un",
    usedIn: (titles: string) => `Utilisé dans : ${titles}.`,
    heldBy: (name: string) => `${name} l'écrit en ce moment.`,
    unavailableFiles: (files: string) => `Fichiers indisponibles : ${files}.`,
    fileTrashed: (name: string) => `${name} (dans la Corbeille)`,
    filePending: (name: string) => `${name} (pas encore prêt)`,
    fileMissing: "un fichier qui n'existe plus",
    wrongTypeFiles: (names: string) =>
      `Pas du bon type de fichier à cet endroit : ${names}.`,
    emptyTemplates: (titles: string) => `Modèles vides : ${titles}.`,
    imageMissingAt: (positions: string) =>
      `Blocs Image sans fichier, à la position ${positions}.`,
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
    groups: {
      contents: "Contenus",
      tools: "Outils",
    },
    // La barre du haut, pendant que la page suivante se prépare.
    pageLoading: "Chargement de la page",
  },

  // Titre et présentation de chaque section, dans le menu et en tête de page.
  sections: {
    home: {
      title: "Tableau de bord",
      description: "Bienvenue",
    },
    blog: {
      title: "Blog",
      description: "Les articles et leurs catégories.",
    },
    podcasts: {
      title: "Podcasts",
      description: "Les épisodes et leurs catégories.",
    },
    pages: {
      title: "Pages",
      description:
        "Les pages simples de ton app, comme À propos ou Mentions légales.",
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
      description:
        "Donne un visage à ton admin et à ton app, compose tes formules et ajuste les réglages avancés.",
    },
    account: {
      title: "Mon compte",
      description: "Ton profil, ta sécurité et tes préférences d'affichage.",
    },
  },

  // Connexion : e-mail, puis code reçu par e-mail, puis double vérification.
  // Sous la carte des pages de connexion : « © 2026 Ruche · Tous droits réservés ».
  copyright: (year: number, brand: string) =>
    `© ${year} ${brand} · Tous droits réservés`,
  signIn: {
    title: "Connexion",
    // En bas de l'étape de l'adresse (AuthNote).
    hint: {
      title: "Connexion sans mot de passe",
      text: "Saisis ton adresse e-mail. Tu recevras un code à 6 chiffres pour te connecter.",
    },
    email: "Adresse e-mail",
    emailPlaceholder: "prenom@exemple.fr",
    invalidEmail: "Saisis une adresse e-mail valide.",
    sendCode: "Recevoir un code",
    codeTitle: "Consulte tes e-mails",
    // Même message que l'adresse fasse partie de l'équipe ou non.
    codeSent: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code vient d'y être envoyé. Il est valable 10 minutes.`,
    // Nouvelle demande trop rapprochée : le code déjà envoyé reste valable.
    codeAlreadySent: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code y a déjà été envoyé il y a moins d'une minute. Saisis-le, ou attends une minute avant d'en demander un nouveau.`,
    // Après un rechargement de la page.
    codeStillValid: (email: string) =>
      `Si ${email} fait partie de l'équipe, un code y a été envoyé. Il est valable 10 minutes après son envoi.`,
    // Une invitation pas encore acceptée ne permet pas de recevoir un code.
    invitedHint: {
      title: "Tu as reçu une invitation ?",
      text: "Ouvre plutôt le lien de l'e-mail d'invitation, ou demande à un admin de te le renvoyer.",
      // Avec l'adresse de contact de la marque (Paramètres), suivie de l'adresse en lien.
      withContact: "Ouvre plutôt le lien de l'e-mail d'invitation, ou écris à",
    },
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
    // La configuration, en deux étapes qui glissent : le QR code (modèle « Scan to connect your
    // mobile device » de shadcn), puis le premier code de l'app.
    setupTitle: "Scanne pour relier ton téléphone",
    setupDescription:
      "Ouvre une app de double vérification (Google Authenticator, 1Password…), ajoute un compte et scanne ce QR code. Tu ne le fais qu'une fois.",
    qrCode: "QR code à scanner avec l'app de ton téléphone",
    secret: "Impossible de le scanner ? Saisis plutôt cette clé dans l'app :",
    scanned: "C'est fait",
    firstCodeTitle: "Saisis le code de l'app",
    firstCodeDescription:
      "Le code à 6 chiffres que l'app affiche maintenant pour l'admin.",
    backToQr: "Revoir le QR code",
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
    // Sous le bouton « Valider », en une ligne (assez court pour la largeur du formulaire).
    lostPhone: "Téléphone perdu ? Demande à un admin de la réinitialiser.",
    // Avec l'adresse de contact de la marque, suivie de l'adresse en lien.
    lostPhoneContact: "Téléphone perdu ? Écris à",
    // Sous « Se déconnecter », en bas de la carte.
    signOutText: "Reviens à la connexion.",
  },

  invitation: {
    title: "Rejoindre l'équipe",
    description: (brand: string) =>
      `Un admin t'invite à rejoindre l'admin de ${brand}. Ensuite, tu configureras la double vérification.`,
    accept: "Accepter l'invitation",
    expired:
      "Ce lien a expiré ou a déjà servi. Si tu as déjà accepté ton invitation, connecte-toi avec ton adresse e-mail. Sinon, demande à un admin de te la renvoyer.",
    incomplete:
      "Ce lien d'invitation est incomplet. Ouvre le lien reçu par e-mail, ou demande à un admin de te renvoyer l'invitation.",
    toSignIn: "Aller à la connexion",
  },

  adminOnly: {
    title: "Réservé aux admins",
    description:
      "Cette section est réservée aux admins de l'équipe. Demande à un admin si tu as besoin d'y accéder.",
    back: "Retour au Tableau de bord",
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
      // Lu par les lecteurs d'écran devant le rôle.
      rolePrefix: "Rôle : ",
    },
    language: {
      title: "Langue",
      description:
        "La langue de l'admin, pour toi seulement. Elle vaut aussi pour les e-mails que tu reçois.",
      label: "Langue de l'admin",
      // Le membre suit la langue de toute l'admin (Paramètres › Avancé), entre parenthèses.
      sameAsAdmin: (language: string) => `Comme l'admin (${language})`,
      failed: "Ta langue n'a pas pu être enregistrée. Réessaie.",
    },
    mfa: {
      title: "Double vérification",
      description:
        "Le code de l'app de ton téléphone, demandé à chaque connexion.",
      configured: "Configurée",
      configuredOn: (date: string) => `le ${date}`,
      lostPhone: {
        title: "Téléphone perdu ?",
        text: "Demande à un admin de réinitialiser ta double vérification.",
      },
    },
  },

  team: {
    invite: "Inviter un membre",
    inviteDescription:
      "La personne reçoit un e-mail avec un lien pour rejoindre l'équipe. Le lien est valable 10 minutes : tu pourras le renvoyer s'il expire.",
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
      "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
    singleAdmin:
      "Tu es le seul admin à avoir configuré la double vérification. Nomme un deuxième admin : si tu perds ton téléphone, c'est cette personne qui réinitialisera la tienne.",
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
      // Invitation acceptée, double vérification pas encore configurée.
      mfaPending: "Double vérification à faire",
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
      title: "Retirer ce membre ?",
      description: (member: string) =>
        `${member} n'aura plus accès à l'admin et son compte sera supprimé. Ses contenus restent, mais ses publications programmées ne partiront pas.`,
      confirm: "Retirer",
    },
    confirmResetMfa: {
      title: "Réinitialiser la double vérification ?",
      description: (member: string) =>
        `${member} sera déconnecté et devra configurer à nouveau la double vérification avec son téléphone.`,
      confirm: "Réinitialiser",
    },
    // Erreurs renvoyées par la fonction serveur « equipe », selon leur code.
    errors: {
      non_connecte: "Tu as été déconnecté. Reconnecte-toi pour continuer.",
      reserve_aux_admins: "Cette action est réservée aux admins.",
      soi_meme:
        "Tu ne peux pas faire ça sur ton propre compte. Demande à un autre admin.",
      demande_invalide:
        "La demande n'est pas valide. Vérifie les informations saisies.",
      introuvable:
        "Ce membre ne fait plus partie de l'équipe. Recharge la liste.",
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
      "Images, SVG, animations Lottie (.json), audios (MP3, M4A) et PDF. 50 Mo au plus par fichier (5 Mo pour un SVG ou une animation Lottie).",
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
    },
    rejectedBecause: (reason: string) => `Refusé : ${reason}`,
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
        "ce SVG contient un attribut interdit (code caché, style dangereux…).",
      svg_lien_externe:
        "ce SVG charge une image, une police ou un style extérieur.",
      lottie_illisible: "ce fichier d'animation est illisible (JSON invalide).",
      lottie_invalide: "ce n'est pas une animation Lottie valide.",
      lottie_lien_externe:
        "cette animation charge une image ou une police extérieure.",
      inconnue: "le fichier n'a pas été accepté.",
    },
    rejectedCleanup:
      "Il sera retiré automatiquement de la Médiathèque dans les 24 heures.",
    columns: {
      preview: "Aperçu",
      name: "Nom",
      kind: "Type",
      size: "Poids",
      createdAt: "Ajouté le",
      status: "État",
    },
    open: (name: string) => `Ouvrir la fiche « ${name} »`,
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
          ? "1 fichier gardé : il est encore utilisé"
          : `${count} fichiers gardés : ils sont encore utilisés`,
      keptHint: (count: number) =>
        count === 1
          ? "Retire-le d'abord des contenus. Les contenus de la Corbeille comptent encore, tant qu'ils ne sont pas supprimés définitivement. Il reste sélectionné."
          : "Retire-les d'abord des contenus. Les contenus de la Corbeille comptent encore, tant qu'ils ne sont pas supprimés définitivement. Ils restent sélectionnés.",
    },
    empty: {
      title: "Aucun fichier pour l'instant",
      description:
        "Envoie des images, des audios, des animations ou des PDF : ils serviront dans les contenus.",
    },
    noResults: {
      title: "Aucun fichier trouvé",
      description: "Essaie un autre nom ou un autre type.",
    },
    noUnused: {
      title: "Tous les fichiers servent",
      description:
        "Aucun fichier non utilisé ici : chacun est dans un brouillon ou un contenu en ligne.",
    },
    tooMany: (count: number) =>
      `Seuls les ${count} fichiers les plus récents sont affichés. Affine ta recherche pour trouver les autres.`,
    loadFailed: "La Médiathèque n'a pas pu être chargée.",
    refreshFailed:
      "La Médiathèque n'a pas pu être mise à jour : elle date peut-être un peu.",
    storage: {
      label: "Place occupée",
      value: (used: string, total: string) => `${used} sur ${total}`,
      alertTitle: "Stockage presque plein",
      alert: (used: string) =>
        `Les fichiers occupent ${used} sur 1 Go. Au-delà, plus aucun envoi ne sera possible : mets à la corbeille ce qui ne sert plus, puis vide-la.`,
    },
    orphans: {
      title: (count: number) =>
        count === 1
          ? "1 fichier sans fiche dans le stockage"
          : `${count} fichiers sans fiche dans le stockage`,
      description: (date: string) =>
        `Trouvés au contrôle du ${date}. Ce sont des restes d'envois interrompus : ils occupent de la place sans apparaître dans la Médiathèque.`,
      show: "Voir la liste",
      hide: "Masquer la liste",
      more: (count: number) => `… et ${count} de plus`,
      clean: "Nettoyer",
      cleaned: (count: number) =>
        count === 0
          ? "Rien à effacer : ces fichiers ont moins de 24 heures ou ont retrouvé leur fiche."
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
          `${name} est refusé : ${reason}`,
        failed: (name: string, error: string) =>
          `Échec de l'envoi de ${name}. ${error}`,
        cancelled: (name: string) => `Envoi de ${name} annulé.`,
      },
      resumable: "Envoi qui peut reprendre",
      gifWarning:
        "GIF animé : seule la première image est gardée. Pour une animation, utilise un fichier Lottie.",
      leaveWarning: "Des fichiers sont en cours d'envoi.",
    },
    // Refus avant l'envoi (préparation dans le navigateur).
    prepareErrors: {
      type_refuse:
        "Format refusé. Envoie une image (JPEG, PNG, WebP, GIF, HEIC, AVIF), un SVG, une animation Lottie (.json), un audio (MP3, M4A) ou un PDF.",
      video_refusee:
        "Les vidéos ne sont pas acceptées. Pour un audio, envoie un MP3 ou un M4A.",
      fichier_vide: "Ce fichier est vide.",
      fichier_trop_lourd: "Fichier trop lourd : 50 Mo au plus.",
      fichier_a_verifier_trop_lourd:
        "Fichier trop lourd : 5 Mo au plus pour un SVG ou une animation Lottie.",
      image_illisible:
        "Cette image est illisible par ton navigateur. Enregistre-la en JPEG ou en PNG, puis envoie-la de nouveau.",
      heic_illisible:
        "Ton navigateur ne sait pas lire les photos HEIC (iPhone). Envoie celle-ci depuis Safari, ou enregistre-la en JPEG puis envoie-la de nouveau.",
      svg_illisible:
        "Ce SVG est illisible, ou il contient du code refusé par sécurité.",
      svg_element_interdit:
        "Ce SVG contient un élément dangereux qui ne peut pas être retiré sans abîmer l'image.",
      svg_attribut_interdit:
        "Ce SVG contient un attribut dangereux qui ne peut pas être retiré sans abîmer l'image.",
      svg_lien_externe:
        "Ce SVG charge une image, une police ou un style extérieur qui ne peut pas être retiré.",
      lottie_illisible:
        "Ce fichier .json est illisible : ce n'est pas du JSON valide.",
      lottie_invalide:
        "Ce fichier .json n'est pas une animation Lottie valide (calques, taille, images par seconde…).",
      lottie_lien_externe:
        "Cette animation charge une image ou une police extérieure. Exporte-la avec les images intégrées.",
    },
    transferErrors: {
      annule: "Envoi annulé.",
      envoi_interrompu:
        "L'envoi a été interrompu. Vérifie ta connexion, puis réessaie.",
      fichier_trop_lourd: "Fichier trop lourd : 50 Mo au plus.",
      type_refuse: "Ce type de fichier est refusé par le stockage.",
      envoi_refuse: "Le stockage a refusé l'envoi. Réessaie dans un instant.",
      deja_envoye: "Ce fichier a déjà été envoyé.",
    },
    // « Remplacer… » dans la fiche d'un fichier ([D48]) : un nouveau fichier du même type.
    replace: {
      title: "Remplacer ce fichier",
      description:
        "Envoie un nouveau fichier du même type. Une fois prêt, il prend sa place dans tous les brouillons, sauf ceux que quelqu'un écrit en ce moment et les contenus de la Corbeille. Ce qui est en ligne ne change pas tant que tu ne le mets pas à jour.",
      action: "Remplacer…",
      input: "Nouveau fichier",
      uploading: "Envoi du nouveau fichier…",
      checking: "Vérification du nouveau fichier…",
      replacing: "Remplacement dans les brouillons…",
      replaced: (count: number) =>
        count === 0
          ? "Aucun brouillon n'a changé."
          : count === 1
            ? "Remplacé dans 1 brouillon."
            : `Remplacé dans ${count} brouillons.`,
      kept: (count: number) =>
        count === 1
          ? "1 brouillon n'a pas changé : quelqu'un l'écrit en ce moment."
          : `${count} brouillons n'ont pas changé : quelqu'un les écrit en ce moment.`,
      keptItem: (title: string, holder: string) =>
        `« ${title || "Sans titre"} » (${holder})`,
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
        "Plus rien n'utilise l'ancien fichier : il est dans la Corbeille.",
      openNew: "Ouvrir le nouveau fichier",
      rejected: (reason: string) => `Le nouveau fichier est refusé : ${reason}`,
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
      // La carte du nom et du texte alternatif (ou de la transcription).
      description: "Description",
      info: "Informations",
      kind: "Type",
      dimensions: "Dimensions",
      duration: "Durée",
      size: "Poids",
      createdAt: "Ajouté le",
      visibility: "Accès",
      public: "Public",
      publicHint:
        "Utilisé par un contenu gratuit en ligne, ou comme image de présentation.",
      protected: "Protégé",
      uses: "Utilisé dans",
      usesCount: (count: number) =>
        count === 1 ? "1 contenu" : `${count} contenus`,
      usesLoading: "Recherche des contenus…",
      notUsed:
        "Ce fichier n'est utilisé dans aucun contenu pour l'instant. Tu peux l'ajouter à un contenu depuis l'éditeur.",
      usesFailed: "La liste des contenus n'a pas pu être chargée.",
      inDraft: "Brouillon",
      inApp: "En ligne",
      usesLive: "En ligne dans l'app",
      usesDrafts: "Dans les brouillons",
      usesLiveHint:
        "L'app montre la version publiée. Un changement du texte alternatif ou de la transcription de ce fichier n'y apparaît qu'après une nouvelle publication ou une mise à jour dans l'app.",
      // Textes figés à la publication ([D30], option B).
      outdated: {
        title: (count: number) =>
          count === 1
            ? "1 contenu en ligne montre encore l'ancien texte"
            : `${count} contenus en ligne montrent encore l'ancien texte`,
        description:
          "Le texte alternatif ou la transcription a changé depuis leur publication. Seuls les textes de ce fichier seront remplacés dans l'app : les autres modifications des brouillons ne sont pas publiées.",
        version: (number: number, date: string) =>
          `version n° ${number}, publiée le ${date}`,
        push: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app"
            : `Mettre à jour ces ${count} contenus dans l'app`,
        pushed: (count: number) =>
          count === 0
            ? "Rien à mettre à jour : l'app a déjà les bons textes."
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
      used: "Ce fichier est encore utilisé : retire-le d'abord des contenus. Les contenus de la Corbeille comptent encore, tant qu'ils ne sont pas supprimés définitivement.",
    },
    // Erreurs de la base (RPC) et de la fonction « files », selon leur code.
    errors: {
      reserve_a_l_equipe:
        "Tu n'as plus accès à la Médiathèque. Reconnecte-toi.",
      non_connecte: "Tu as été déconnecté. Reconnecte-toi pour continuer.",
      type_refuse: "Ce type de fichier n'est pas accepté.",
      nom_invalide: "Le nom du fichier doit faire entre 1 et 255 caractères.",
      fichier_vide: "Ce fichier est vide.",
      fichier_trop_lourd:
        "Fichier trop lourd : 50 Mo au plus, 5 Mo pour un SVG ou une animation Lottie.",
      fichier_invalide: "Les informations du fichier ne sont pas valides.",
      fichier_introuvable:
        "Ce fichier n'existe plus ou il est dans la Corbeille. Recharge la page.",
      fichier_absent:
        "Le fichier n'est pas arrivé dans le stockage. Réessaie dans un instant.",
      envoi_expire: "Cet envoi a expiré. Envoie le fichier de nouveau.",
      fichier_utilise:
        "Ce fichier est encore utilisé : retire-le d'abord des contenus. Les contenus de la Corbeille comptent encore, tant qu'ils ne sont pas supprimés définitivement.",
      fichier_pas_pret:
        "Le nouveau fichier n'est pas encore prêt : attends la fin de sa vérification.",
      type_different: "Le nouveau fichier doit être du même type que l'ancien.",
      effacement_demande:
        "Ce fichier est en cours de suppression définitive : il ne peut plus être restauré.",
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
      article: "Blog",
      episode: "Podcasts",
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
      page: "Page",
      template: "Modèle de bloc",
    },
    // Ce qui est parti avec un élément (même lot) : restauré ou effacé avec lui.
    batch: (count: number) =>
      count === 1 ? "avec 1 autre élément" : `avec ${count} autres éléments`,
    batchList: (names: string) => `Dans le même lot : ${names}.`,
    eraseSelection: (count: number) => `Supprimer définitivement (${count})`,
    confirmSelection: {
      title: (count: number) =>
        count === 1
          ? "Supprimer définitivement cet élément ?"
          : "Supprimer définitivement ces éléments ?",
      description: (count: number) =>
        count === 1
          ? "L'élément sélectionné sera supprimé définitivement. Tu ne pourras pas revenir en arrière."
          : `Les ${count} éléments sélectionnés seront supprimés définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Supprimer définitivement",
    },
    // Seules les pages ont une adresse.
    restoredWithoutAddress: (name: string) =>
      `La page « ${name} » est restaurée, mais sans adresse : une autre page a pris la sienne entre-temps. Choisis-en une autre avant de la publier.`,
    restoredDraft: "Retour en brouillon : rien n'est republié dans l'app.",
    open: "Ouvrir",
    columns: {
      name: "Nom",
      type: "Type",
      deletedAt: "Mis à la corbeille le",
      purgeAt: "Effacement automatique",
    },
    deletedBy: (name: string) => `par ${name}`,
    purgeOn: (date: string) => `après le ${date}`,
    purgeRefused: "Suppression impossible : encore utilisé",
    purgeRefusedHint:
      "Ce fichier a été inséré dans un contenu entre-temps. Restaure-le, ou retire-le de ce contenu avant de le supprimer définitivement.",
    restore: "Restaurer",
    restoreItem: (name: string) => `Restaurer ${name}`,
    // Sans accord : l'élément peut être un fichier, une page, un article…
    restored: (name: string) => `« ${name} » est de retour.`,
    eraseItem: (name: string) => `Supprimer définitivement ${name}`,
    erase: "Supprimer définitivement",
    empty: "Vider la corbeille",
    emptied: (count: number) =>
      count === 0
        ? "La Corbeille était déjà vide."
        : count === 1
          ? "1 élément est en cours de suppression."
          : `${count} éléments sont en cours de suppression.`,
    confirmEmpty: {
      title: "Vider la corbeille ?",
      description: (count: number) =>
        `${count === 1 ? "L'élément de la Corbeille sera supprimé" : `Les ${count} éléments de la Corbeille seront supprimés`} définitivement. Tu ne pourras pas revenir en arrière.`,
      confirm: "Vider la corbeille",
    },
    confirmErase: {
      title: "Supprimer définitivement ?",
      description: (name: string) =>
        `Suppression définitive de « ${name} » : tu ne pourras pas revenir en arrière.`,
      confirm: "Supprimer définitivement",
    },
    emptyState: {
      title: "La Corbeille est vide",
      description:
        "Ce que tu mets à la corbeille arrive ici. Tu peux le restaurer pendant 30 jours.",
    },
    emptyFilter: "Aucun élément de ce type dans la Corbeille.",
    loadFailed: "La Corbeille n'a pas pu être chargée.",
    refreshFailed:
      "La Corbeille n'a pas pu être mise à jour : elle date peut-être un peu.",
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
        confirmTrashTitle: "Mettre cette page à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la Corbeille. Si elle est en ligne, elle disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras la restaurer en brouillon pendant 30 jours.`,
        restored: (title: string) =>
          `« ${title} » est restaurée, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Mettre 1 page à la corbeille ?"
            : `Mettre ${count} pages à la corbeille ?`,
        confirmTrashMany:
          "Elles vont dans la Corbeille. Celles qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer en brouillon pendant 30 jours.",
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
          "Crée une page : elle s'ouvre aussitôt dans l'éditeur, et tout ce que tu écris est enregistré au fur et à mesure.",
        search: "Rechercher une page",
        noResults: "Aucune page ne correspond à ta recherche ou à tes filtres.",
      },
      article: {
        submit: "Créer l'article",
        create: "Nouvel article",
        createFailed: "L'article n'a pas pu être créé.",
        blank: "Article vide",
        confirmTrashTitle: "Mettre cet article à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la Corbeille. S'il est en ligne, il disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras le restaurer en brouillon pendant 30 jours.`,
        restored: (title: string) => `« ${title} » est restauré, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Mettre 1 article à la corbeille ?"
            : `Mettre ${count} articles à la corbeille ?`,
        confirmTrashMany:
          "Ils vont dans la Corbeille. Ceux qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer en brouillon pendant 30 jours.",
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
          "Crée un article : il s'ouvre aussitôt dans l'éditeur, et tout ce que tu écris est enregistré au fur et à mesure.",
        search: "Rechercher un article",
        noResults:
          "Aucun article ne correspond à ta recherche ou à tes filtres.",
      },
      episode: {
        submit: "Créer l'épisode",
        create: "Nouvel épisode",
        createFailed: "L'épisode n'a pas pu être créé.",
        blank: "Épisode vide",
        confirmTrashTitle: "Mettre cet épisode à la corbeille ?",
        confirmTrash: (title: string) =>
          `« ${title} » va dans la Corbeille. S'il est en ligne, il disparaît aussi de l'app, et une publication programmée est annulée. Tu pourras le restaurer en brouillon pendant 30 jours.`,
        restored: (title: string) => `« ${title} » est restauré, en brouillon.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Mettre 1 épisode à la corbeille ?"
            : `Mettre ${count} épisodes à la corbeille ?`,
        confirmTrashMany:
          "Ils vont dans la Corbeille. Ceux qui sont en ligne disparaissent aussi de l'app, et leurs publications programmées sont annulées. Tu pourras les restaurer en brouillon pendant 30 jours.",
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
          "Crée un épisode : il s'ouvre aussitôt dans l'éditeur. Choisis ensuite son image de présentation et son audio.",
        search: "Rechercher un épisode",
        noResults:
          "Aucun épisode ne correspond à ta recherche ou à tes filtres.",
      },
    },
    columns: {
      cover: "Image de présentation",
      title: "Titre",
      publication: "État",
      categories: "Catégories",
      savedAt: "Enregistré le",
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
        failed: "Programmations échouées",
      },
      allCategories: "Toutes les catégories",
      noCategory: "Sans catégorie",
      reset: "Effacer les filtres",
    },
    count: (shown: number, total: number) =>
      shown === total
        ? total === 1
          ? "1 contenu"
          : `${total} contenus`
        : `${shown} sur ${total}`,
    noCategory: "Aucune",
    manageCategories: "Catégories",
    actions: (title: string) => `Actions pour ${title}`,
    open: "Ouvrir",
    trash: "Mettre à la corbeille",
    confirmTrash: {
      confirm: "Mettre à la corbeille",
    },
    trashed: (title: string) => `« ${title} » est dans la Corbeille.`,
    undo: "Annuler",
    // Fenêtre « Nouvel article » (…) : le titre, un point de départ, les réglages ([D42]).
    newContent: {
      description:
        "Le titre suffit pour commencer : tout se modifie ensuite dans l'éditeur.",
      // Un article : ses réglages sont dans la colonne « Article » de l'éditeur.
      articleDescription:
        "Le titre suffit pour commencer : tout se modifie ensuite dans l'éditeur, colonne « Article ».",
      starter: "Point de départ",
      // Une page : l'adresse vient du titre ; déjà prise, la création est bloquée.
      address: (slug: string) => `Adresse de la page : ${slug}`,
      addressTaken: (title: string) =>
        `La page « ${title || "Sans titre"} » a déjà cette adresse : change le titre.`,
      addressEmpty:
        "Ce titre ne donne pas d'adresse : ajoute des lettres ou des chiffres.",
      starterHint: "Une structure déjà en place, au lieu d'un contenu vide.",
      settingsFailed: (message: string) =>
        `Le contenu est créé, mais ses réglages n'ont pas été enregistrés : ${message} Corrige-les dans l'éditeur.`,
    },
    // Ordre des listes (Le Fil, Radio Éclaircies, [D47]) : glisser-déposer.
    order: {
      column: "Ordre",
      handle: (title: string) => `Déplacer « ${title} »`,
      filtering:
        "Pour ranger la liste, efface d'abord la recherche et les filtres.",
      // Le nouvel ordre est dans l'app tout de suite, sans « Publier ».
      saved: "Nouvel ordre enregistré : il apparaît tout de suite dans l'app.",
      failed:
        "Le nouvel ordre n'a pas été enregistré : la liste reprend son ordre.",
      dnd: {
        roleDescription: "contenu déplaçable",
        instructions:
          "Pour déplacer un contenu, appuie sur Espace ou Entrée sur sa poignée. Déplace-le avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour le déposer, ou sur Échap pour annuler.",
        start: (title: string) => `Tu as pris « ${title} ».`,
        over: (title: string, position: number, count: number) =>
          `« ${title} » est à la place n° ${position} sur ${count}.`,
        end: (title: string, position: number, count: number) =>
          `Déposé à la place n° ${position} sur ${count} : « ${title} ».`,
        cancel: (title: string) =>
          `Déplacement annulé : « ${title} » reprend sa place.`,
      },
    },
    // « Réglages » dans le menu d'une ligne : les mêmes réglages que dans l'éditeur.
    settings: {
      action: "Réglages",
      save: "Enregistrer",
      saved: (title: string) => `Réglages de « ${title} » enregistrés.`,
      unchanged: "Rien n'a changé.",
      checking: "On vérifie que personne n'écrit ce contenu…",
      heldBy: (name: string) =>
        `${name} écrit ce contenu en ce moment : attends que ${name} ait fini, ou ouvre-le pour reprendre la main.`,
      heldSelf:
        "Tu écris ce contenu dans un autre onglet : change ses réglages dans cet onglet-là.",
      yourselfElsewhere: "Toi (dans un autre onglet)",
    },
    // Colonne Catégories : la première, puis « +2 » pour les autres.
    moreCategories: (count: number) => `+${count}`,
    otherCategories: (names: string) => `Aussi : ${names}`,
    loadFailed: "La liste n'a pas pu être chargée.",
    refreshFailed:
      "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
  },

  // Catégories du Blog et des Podcasts (étape 7) : ADMIN § 3, [D28], [D44].
  categories: {
    title: (section: string) => `Catégories : ${section}`,
    description: {
      // Renommer ou ranger une catégorie change l'app tout de suite, sans « Publier ».
      blog: "Elles servent à filtrer les articles dans l'app. Un article peut en avoir une, plusieurs ou aucune. Ce que tu changes ici apparaît tout de suite dans l'app, sans publier.",
      podcasts:
        "Elles servent à filtrer les épisodes dans l'app. Un épisode peut en avoir une, plusieurs ou aucune. Ce que tu changes ici apparaît tout de suite dans l'app, sans publier.",
    },
    back: (section: string) => `Retour : ${section}`,
    orderTitle: "Ordre dans l'app",
    order:
      "L'app les montre dans cet ordre. Range-les avec la poignée, à la souris ou au clavier.",
    listLabel: (section: string) =>
      `Catégories : ${section}, dans l'ordre de l'app`,
    empty:
      "Aucune catégorie pour l'instant. Les catégories sont facultatives : ajoutes-en si tu veux que l'app puisse filtrer.",
    name: "Nom de la nouvelle catégorie",
    namePlaceholder: "Par exemple : Sommeil",
    addTitle: "Ajouter une catégorie",
    addDescription:
      "Elle arrive en bas de la liste ; range-la ensuite à sa place.",
    nameRequired: "Donne un nom à la catégorie.",
    nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
    add: "Ajouter",
    added: (name: string) => `Catégorie « ${name} » ajoutée.`,
    rename: "Renommer",
    renameLabel: (name: string) => `Nouveau nom pour ${name}`,
    renamed: "Catégorie renommée.",
    remove: "Supprimer définitivement",
    actions: (name: string) => `Actions pour ${name}`,
    // Pastille de chaque catégorie : le nombre de brouillons qui la citent, dans l'infobulle.
    uses: (count: number) =>
      count === 0
        ? "Utilisée dans aucun brouillon"
        : count === 1
          ? "Utilisée dans 1 brouillon"
          : `Utilisée dans ${count} brouillons`,
    confirmRemove: {
      title: "Supprimer cette catégorie ?",
      description: (name: string) =>
        `La catégorie « ${name} » sera supprimée définitivement : elle ne passe pas par la Corbeille, et tu ne pourras pas la restaurer.`,
      uses: (count: number) =>
        count === 1
          ? "1 brouillon la perd aussitôt. Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés."
          : count > 1
            ? `${count} brouillons la perdent aussitôt. Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés.`
            : "Dans l'app, elle disparaît des filtres tout de suite, même pour les contenus déjà publiés.",
      confirm: "Supprimer définitivement",
    },
    removed: (name: string) => `Catégorie « ${name} » supprimée.`,
    handle: (name: string) => `Déplacer « ${name} »`,
    reordered: "Nouvel ordre enregistré.",
    // Glisser-déposer : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "catégorie déplaçable",
      instructions:
        "Pour déplacer une catégorie, appuie sur Espace ou Entrée sur sa poignée. Déplace-la avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
      start: (name: string) => `Tu as pris « ${name} ».`,
      over: (name: string, position: number, count: number) =>
        `« ${name} » est à la place n° ${position} sur ${count}.`,
      end: (name: string, position: number, count: number) =>
        `« ${name} » déposée à la place n° ${position} sur ${count}.`,
      cancel: (name: string) =>
        `Déplacement annulé : « ${name} » reprend sa place.`,
    },
    loadFailed: "Les catégories n'ont pas pu être chargées.",
    errors: {
      nom_en_double: "Une catégorie de cette section porte déjà ce nom.",
      nom_invalide: "Le nom doit faire entre 1 et 100 caractères.",
      introuvable: "Cette catégorie n'existe plus. Recharge la page.",
      demande_invalide:
        "La liste a changé entre-temps. Recharge la page, puis réessaie.",
      categorie_invalide: "La section d'une catégorie ne change pas.",
      reserve_a_l_equipe: "Tu n'as plus accès aux catégories. Reconnecte-toi.",
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
          "Tu insères une copie déjà mise en forme, puis tu y écris ton propre texte. Modifier le modèle ne change pas les contenus déjà écrits.",
        example: "Exemple : un encadré « À retenir ».",
      },
      shared: {
        title: "Bloc partagé",
        tab: "Blocs partagés",
        description:
          "Le même bloc, avec le même texte, dans plusieurs contenus. Tu le corriges une seule fois dans le modèle, et il est corrigé dans tous les brouillons qui l'utilisent.",
        example:
          "Exemple : un encadré « Contact ». Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      },
      starter: {
        title: "Point de départ",
        tab: "Points de départ",
        description:
          "Un nouveau contenu s'ouvre avec une structure déjà en place, au lieu d'une page vide.",
        example: "Exemple : « Interview ».",
      },
    },
    // La section d'un point de départ ([D42]) : la sorte de contenu qu'il sert à créer.
    sections: {
      article: "Blog (article)",
      episode: "Podcasts (épisode)",
      chapter: "Méthodes (chapitre)",
      lesson: "Méthodes (leçon)",
      exercise: "Méthodes (exercice)",
      page: "Pages",
    },
    list: {
      create: "Nouveau modèle",
      columns: {
        name: "Nom",
        type: "Type",
        savedAt: "Enregistré le",
      },
      // Les onglets : « Tous les modèles », puis un par sorte (texts.templates.sorts.*.tab).
      tabs: {
        label: "Types de modèles",
        all: "Tous les modèles",
      },
      untitled: "Sans nom",
      empty: {
        title: "Aucun modèle pour l'instant",
        description:
          "Crée un modèle ici, ou depuis un article, un épisode ou une page : choisis des blocs dans le Plan, puis « Enregistrer comme modèle ».",
      },
      emptySort: "Aucun modèle de ce type pour l'instant",
      usesLoading: "Recherche des brouillons…",
      actions: (name: string) => `Actions pour ${name}`,
      open: "Ouvrir",
      trash: "Mettre à la corbeille",
      loadFailed: "La liste des modèles n'a pas pu être chargée.",
      refreshFailed:
        "La liste n'a pas pu être mise à jour : elle date peut-être un peu.",
      createFailed: "Le modèle n'a pas pu être créé.",
      confirmTrash: {
        title: "Mettre ce modèle à la corbeille ?",
        description: (name: string) =>
          `« ${name} » va dans la Corbeille : tu pourras le restaurer pendant 30 jours. Les contenus où il a été inséré gardent leur copie.`,
        confirm: "Mettre à la corbeille",
      },
      trashed: (name: string) => `« ${name} » est dans la Corbeille.`,
      undo: "Annuler",
      restored: (name: string) => `« ${name} » est restauré.`,
      // Sélection en masse.
      confirmTrashManyTitle: (count: number) =>
        count === 1
          ? "Mettre 1 modèle à la corbeille ?"
          : `Mettre ${count} modèles à la corbeille ?`,
      confirmTrashMany:
        "Ils vont dans la Corbeille : tu pourras les restaurer pendant 30 jours. Les contenus où ils ont été insérés gardent leur copie. Un bloc partagé encore utilisé est gardé.",
      trashedMany: (count: number) =>
        count === 1
          ? "1 modèle mis à la corbeille."
          : `${count} modèles mis à la corbeille.`,
      restoredMany: (count: number) =>
        count === 1 ? "1 modèle restauré." : `${count} modèles restaurés.`,
      keptTitle: (count: number) =>
        count === 1 ? "1 modèle gardé" : `${count} modèles gardés`,
      keptHint: (count: number) =>
        `Pour un bloc partagé encore utilisé, « Mettre à la corbeille » propose « Détacher partout ». ${count === 1 ? "Il reste sélectionné." : "Ils restent sélectionnés."}`,
      // Un bloc partagé utilisé ne se supprime pas (ADMIN § 5).
      used: {
        title: "Ce modèle est encore utilisé",
        description:
          "Un bloc partagé ne peut pas aller à la corbeille tant qu'un brouillon l'utilise. « Détacher partout » en fait une copie ordinaire dans chacun d'eux, même ceux de la Corbeille : ils ne suivront plus le modèle. Ce qui est en ligne dans l'app ne change pas.",
        list: "Brouillons qui l'utilisent",
        inTrash: "dans la Corbeille",
        detachAll: "Détacher partout",
        detached: (count: number) =>
          count === 1
            ? "Détaché dans 1 brouillon : tu peux maintenant mettre le modèle à la corbeille."
            : `Détaché dans ${count} brouillons : tu peux maintenant mettre le modèle à la corbeille.`,
        checkFailed:
          "Les brouillons qui utilisent ce modèle n'ont pas pu être relus.",
      },
    },
    create: {
      title: "Nouveau modèle",
      description:
        "Choisis le type du modèle : il ne changera plus. Tu écriras ensuite ses blocs dans l'éditeur.",
      name: "Nom",
      namePlaceholder: "Par exemple : Contact",
      nameRequired: "Donne un nom au modèle.",
      nameTooLong: "Le nom ne doit pas dépasser 200 caractères.",
      sort: "Type",
      section: "Section",
      sectionPlaceholder: "Choisis une section",
      sectionHint:
        "Le point de départ ne sera proposé que dans cette section : « Nouvelle page » ne propose que ceux des pages.",
      sectionRequired: "Choisis la section du point de départ.",
      submit: "Créer le modèle",
    },
    // Éditeur d'un modèle (le même éditeur plein écran, sans publication).
    editor: {
      nameLabel: "Nom du modèle",
      namePlaceholder: "Nom du modèle",
      // La carte « Sorte » de la colonne de droite (éditeur du Fil) : un point de départ dit pour
      // quelle section il sert.
      starterFor: (section: string) => `Pour créer : ${section}`,
      sharedLimit:
        "Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      usedIn: (count: number) =>
        count === 0
          ? "Utilisé dans aucun brouillon"
          : count === 1
            ? "Utilisé dans 1 brouillon"
            : `Utilisé dans ${count} brouillons`,
      usesTitle: "Utilisé dans",
      usesNone:
        "Ajoute-le à un article, un épisode ou une page par « Mes blocs », dans les Blocs.",
      usesFailed:
        "La liste des brouillons qui l'utilisent n'a pas pu être chargée.",
      inTrash: "dans la Corbeille",
      keepBlock:
        "Ce modèle est utilisé : son bloc ne peut pas être supprimé. Pour supprimer le bloc, détache d'abord le modèle partout : dans Modèles de bloc, choisis « Mettre à la corbeille » pour ce modèle, puis « Détacher partout ».",
      outdated: {
        push: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app"
            : `Mettre à jour ces ${count} contenus dans l'app`,
        title: (count: number) =>
          count === 1
            ? "Mettre à jour ce contenu dans l'app ?"
            : `Mettre à jour ces ${count} contenus dans l'app ?`,
        description: (count: number) =>
          count === 1
            ? "Ce contenu est en ligne avec une ancienne version de ce bloc. Seul ce bloc sera remplacé dans l'app : les autres modifications de son brouillon ne seront pas publiées. Rien ne change dans l'app tant que tu n'as pas cliqué sur « Mettre à jour »."
            : "Ces contenus sont en ligne avec une ancienne version de ce bloc. Seul ce bloc sera remplacé dans l'app : les autres modifications de leurs brouillons ne seront pas publiées. Rien ne change dans l'app tant que tu n'as pas cliqué sur « Mettre à jour ».",
        version: (number: number, date: string) =>
          `version n° ${number}, publiée le ${date}`,
        confirm: "Mettre à jour",
        pushed: (count: number) =>
          count === 0
            ? "Rien à mettre à jour : l'app a déjà ce bloc."
            : count === 1
              ? "1 contenu mis à jour dans l'app."
              : `${count} contenus mis à jour dans l'app.`,
        failed:
          "La liste des contenus à mettre à jour dans l'app n'a pas pu être chargée.",
      },
    },
    // Un bloc lié (bloc partagé) dans l'éditeur d'un contenu.
    linked: {
      loading: "Chargement du modèle…",
      loadFailed: "Le modèle n'a pas pu être chargé.",
      missing:
        "Ce modèle n'existe plus ou est dans la Corbeille : supprime ce bloc, ou restaure le modèle.",
      empty: "Ce modèle est vide.",
      editLabel: (name: string) => `Modifier le modèle « ${name} »`,
      detachLabel: (name: string) => `Détacher du modèle « ${name} »`,
      detached: (name: string) =>
        `Bloc détaché de « ${name} » : c'est maintenant une copie ordinaire, que tu peux modifier ici.`,
      // Les réglages d'un bloc partagé (glissière du bloc) : deux points courts.
      settings: (name: string) =>
        `Ce bloc suit le modèle « ${name} ». Corrige-le dans le modèle : tous les brouillons qui l'utilisent suivront.`,
      detachHint:
        "« Détacher » en fait une copie modifiable ici, qui ne suit plus le modèle ; les autres contenus le suivent toujours.",
    },
    // « Mes blocs », dans les Blocs de l'éditeur.
    insert: {
      emptyTemplate: "Vide : complète-le dans Modèles de bloc.",
      loadFailed: "Les modèles n'ont pas pu être chargés.",
    },
    // « Enregistrer comme modèle » : une sélection de blocs (plan, ou bloc choisi).
    saveAs: {
      action: "Enregistrer comme modèle…",
      select: "Choisir des blocs",
      stopSelecting: "Annuler le choix",
      selectHint:
        "Coche les blocs à enregistrer comme modèle, puis « Enregistrer comme modèle ».",
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
        "Le bloc suit maintenant le modèle : le corriger dans le modèle le corrigera ici aussi.",
      submit: "Enregistrer le modèle",
      saved: (name: string) => `Modèle « ${name} » enregistré.`,
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
        "Ce contenu n'existe plus, ou il est dans la Corbeille. Retourne à la liste.",
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
        excerpt ? `Texte « ${excerpt} »` : "Texte vide",
      image: "Image",
      // Une section : son aspect, comme dans le plan (« Section avec fond »), et ses blocs.
      box: (look: string, count: number) =>
        count === 0
          ? `${look} (vide)`
          : count === 1
            ? `${look} (1 bloc)`
            : `${look} (${count} blocs)`,
      linked: (name: string | null) =>
        name ? `Bloc partagé « ${name} »` : "Bloc partagé",
    },
    textPlaceholder: "Écris ici…",
    add: {
      label: "Ajouter un bloc",
      inBox: "Ajouter dans l'encadré",
    },
    // Rien ne se dépose dans une section du téléphone (« Ajouter dans la section » est juste
    // dessous) ; ce que dit aussi le plan.
    emptyBox: "Encadré vide : il n'apparaîtra pas dans l'app.",
    handle: (label: string) => `Déplacer : ${label}`,
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
      outside: (label: string) => `${label} n'est sur aucun emplacement.`,
      // Accordé à « Bloc » : le nom du bloc peut être masculin (Texte) ou féminin (Image).
      end: (label: string, container: string) =>
        `Bloc déposé dans ${container} : ${label}.`,
      endOutside: (label: string) =>
        `Bloc lâché hors de la page : ${label} reprend sa place.`,
      cancel: (label: string) =>
        `Déplacement annulé : ${label} reprend sa place.`,
    },
    outline: {
      title: "Plan",
      empty: "Aucun bloc pour l'instant.",
      select: (label: string) => `Aller à ${label}`,
      // Le plan de l'éditeur du Fil (ADMIN § 4, « Les finitions »).
      count: (count: number) => (count === 1 ? "1 bloc" : `${count} blocs`),
      // Une ligne de section : son aspect, puis le nombre de ses blocs.
      box: { fill: "Encadré avec fond", border: "Encadré avec bordure" },
      collapse: (label: string) => `Replier ${label}`,
      expand: (label: string) => `Déplier ${label}`,
      actions: (label: string) => `Actions pour ${label}`,
      duplicate: "Dupliquer",
      duplicated: (label: string) => `${label} : copie ajoutée juste après.`,
      leaveBox: "Sortir de l'encadré",
      left: (label: string) =>
        `Bloc sorti de l'encadré, juste après lui : ${label}.`,
      remove: "Supprimer",
      warnings: {
        noFile: "Pas encore d'image",
        unavailable: "Fichier indisponible",
        missingTemplate: "Le modèle n'existe plus",
        emptyBox: "Vide : n'apparaîtra pas dans l'app",
      },
    },
    toolbar: {
      label: "Barre de mise en forme",
      unavailable: "Clique dans un texte pour le mettre en forme.",
      paragraph: "Paragraphe",
      h2: "Intertitre",
      h3: "Petit intertitre",
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
      none: "Pas encore d'image",
      missing: "Image indisponible : choisis-en une autre.",
      loadFailed: "L'image n'a pas pu être chargée.",
      notReady: "Cette image n'est pas prête : choisis-en une autre.",
    },
    picker: {
      title: "Choisir une image",
      description:
        "Choisis une image de la Médiathèque, ou envoies-en une nouvelle.",
      search: "Rechercher une image",
      searchPlaceholder: "Rechercher par nom…",
      choose: (name: string) => `Choisir ${name}`,
      empty:
        "Aucune image dans la Médiathèque. Envoies-en une avec « Envoyer une image ».",
      noResults: "Aucune image trouvée. Essaie un autre nom.",
      loadFailed: "Les images n'ont pas pu être chargées.",
      upload: "Envoyer une image",
      uploadInput: "Image à envoyer",
      uploading: (name: string) => `Envoi de « ${name} »…`,
      uploadingProgress: (name: string, percent: string) =>
        `Envoi de « ${name} »… ${percent}`,
      uploadFailed: (name: string, error: string) =>
        `Échec de l'envoi de « ${name} ». ${error}`,
      notImage: (name: string) =>
        `« ${name} » a été ajouté à la Médiathèque, mais seules les images sont acceptées ici (JPEG, PNG, WebP, GIF, HEIC ou AVIF).`,
    },
    // Le choix de l'audio d'un épisode : mêmes libellés que le choix d'une image, sauf ceux-ci.
    audioPicker: {
      title: "Choisir l'audio",
      description:
        "Choisis un audio de la Médiathèque, ou envoies-en un nouveau (MP3 ou M4A).",
      search: "Rechercher un audio",
      choose: (name: string) => `Choisir ${name}`,
      empty:
        "Aucun audio dans la Médiathèque. Envoies-en un avec « Envoyer un audio ».",
      noResults: "Aucun audio trouvé. Essaie un autre nom.",
      loadFailed: "Les audios n'ont pas pu être chargés.",
      upload: "Envoyer un audio",
      uploadInput: "Audio à envoyer",
      notImage: (name: string) =>
        `« ${name} » est dans la Médiathèque, mais un épisode n'accepte qu'un audio (MP3 ou M4A).`,
      noTranscript: "Sans transcription",
    },
    // Présentation d'un article ou d'un épisode (étape 7) : image de présentation, audio,
    // catégories. [D45], [D46]. Plus de résumé depuis le 03/10/2026.
    presentation: {
      cover: {
        choose: "Choisir l'image de présentation",
        remove: "Retirer l'image",
        removed: "Image de présentation retirée.",
        none: "Pas encore d'image de présentation",
        missing: "Image indisponible : choisis-en une autre.",
        notReady: "Cette image n'est pas prête : choisis-en une autre.",
        alt: (alt: string) => `Texte alternatif (Médiathèque) : « ${alt} »`,
      },
      audio: {
        label: "Audio",
        hint: "Obligatoire pour publier : un fichier MP3 ou M4A de la Médiathèque. L'app le lit sous le titre de l'épisode.",
        choose: "Choisir l'audio",
        replace: "Changer d'audio",
        remove: "Retirer l'audio",
        removed: "Audio retiré.",
        none: "Pas encore d'audio",
        missing: "Audio indisponible : choisis-en un autre.",
        notReady: "Cet audio n'est pas prêt : choisis-en un autre.",
        loadFailed: "L'audio n'a pas pu être chargé.",
        duration: (duration: string) => `Durée : ${duration}`,
        noDuration: "Durée inconnue",
        transcriptOk: "Transcription renseignée dans la Médiathèque.",
        transcriptMissing:
          "Pas de transcription : ajoute-la dans la fiche du fichier, pour les personnes qui ne peuvent pas écouter. Elle est conseillée, pas obligatoire.",
      },
      // La fiche d'un fichier, dans un nouvel onglet (une image d'un bloc, l'audio d'un épisode).
      openInLibrary: "Ouvrir sa fiche dans la Médiathèque",
      openFileHint: "(nouvel onglet)",
    },
    // Éditeur du Fil (ADMIN § 4) : le nom des deux colonnes (lecteurs d'écran), le titre de la
    // glissière des Blocs, et celui de la colonne de droite (l'Article, l'Épisode).
    columns: {
      left: "Plan et Blocs",
      right: {
        article: "Article et réglages du bloc",
        episode: "Épisode et réglages du bloc",
        page: "Page et réglages du bloc",
        template: "Modèle et réglages du bloc",
      },
      blocks: "Blocs",
      content: {
        article: "Article",
        episode: "Épisode",
        page: "Page",
        template: "Modèle",
      },
    },
    // Le mode Concentration de l'éditeur du Fil : les deux colonnes se cachent.
    focusMode: {
      label: "Concentration",
      exit: "Quitter la Concentration",
      on: "Concentration : les colonnes sont cachées. Échap pour les retrouver.",
      off: "Concentration quittée : les colonnes sont de retour.",
      shortcut: { apple: "⌘ .", other: "Ctrl + ." },
    },
    // L'aperçu de l'éditeur du Fil : la barre d'outils à droite du téléphone, et ce que montre la
    // Lecture (le rendu de l'app reste provisoire tant qu'elle n'est pas dessinée).
    preview: {
      tools: "Options de l'aperçu",
      device: {
        label: "Téléphone",
        ios: "iPhone · 402 × 874",
        android: "Android · 412 × 915",
      },
      mode: {
        label: "Mode",
        edit: "Édition",
        read: "Lecture : comme dans l'app",
      },
      theme: {
        label: "Thème du téléphone",
        light: "Clair",
        dark: "Sombre",
      },
      largeText: "Grand texte",
      fit: {
        label: "Taille de l'écran",
        adjust:
          "Ajuster : l'écran tient dans la hauteur de la fenêtre, sans changer de largeur",
        full: "Écran entier : tout l'écran du téléphone, réduit s'il le faut",
        scale: (percent: number) => `${percent} %`,
        scaleLabel: (percent: number) => `Écran entier affiché à ${percent} %`,
      },
      reader: {
        label: "Lecteur",
        subscriber: "Lire comme un abonné à la bonne formule",
        visitor: "Lire comme une personne sans la formule",
      },
      screen: { ios: "Aperçu sur iPhone", android: "Aperçu sur Android" },
      // L'heure de la barre d'état, comme sur les photos des fabricants.
      time: { ios: "9:41", android: "12:00" },
      minutes: (count: number) => `${count} min de lecture`,
      locked: {
        title: "La suite est réservée aux abonnés",
        text: {
          article: (level: string) =>
            `Avec la formule ${level}, tu lis tout l'article.`,
          episode: (level: string) =>
            `Avec la formule ${level}, tu écoutes tout l'épisode.`,
          page: (level: string) =>
            `Avec la formule ${level}, tu lis toute la page.`,
        },
        textUnknown: {
          article: "Avec la bonne formule, tu lis tout l'article.",
          episode: "Avec la bonne formule, tu écoutes tout l'épisode.",
          page: "Avec la bonne formule, tu lis toute la page.",
        },
        action: "Voir les formules",
      },
      // En Lecture, on ne prend pas la main : rien ne se modifie.
      reading: "En Lecture : passe en Édition pour modifier.",
    },
    // Les Blocs de l'éditeur du Fil (en glissière par-dessus le Plan), et le panneau « Mes blocs ».
    library: {
      hint: "Clique sur un bloc pour l'ajouter sous le bloc choisi (ou à la fin), ou glisse-le dans le téléphone.",
      basics: "Blocs de base",
      addLabel: (label: string) => `Ajouter un bloc ${label}`,
      // La glissière des Blocs, par-dessus le Plan (éditeur du Fil).
      close: "Fermer les Blocs",
      // La cible d'un ajout : « Ajouter dans la section ».
      target: {
        box: "Ajout dans l'encadré : texte ou image seulement",
        cancel: "Annuler l'ajout dans l'encadré",
      },
      mine: {
        title: "Mes blocs",
        count: (count: number) =>
          count === 0
            ? "Aucun modèle"
            : count === 1
              ? "1 modèle"
              : `${count} modèles`,
        back: "Revenir aux Blocs",
        search: "Rechercher un bloc",
        searchLabel: "Rechercher dans Mes blocs",
        filters: {
          label: "Type de modèle",
          all: "Tous",
          style: "Mises en forme",
          shared: "Blocs partagés",
        },
        style: "Mise en forme : une copie à compléter",
        shared: (count: number) =>
          count === 0
            ? "Bloc partagé : suit son modèle"
            : count === 1
              ? "Bloc partagé : suit son modèle · utilisé dans 1 brouillon"
              : `Bloc partagé : suit son modèle · utilisé dans ${count} brouillons`,
        insertLabel: (name: string) => `Ajouter « ${name} »`,
        empty:
          "Aucune mise en forme ni aucun bloc partagé pour l'instant. Dans l'éditeur, utilise « Enregistrer comme modèle… », ou crées-en un dans Modèles de bloc.",
        // Un bloc de « Mes blocs » ajouté au contenu.
        added: (name: string) => `« ${name} » ajouté.`,
        noResult: "Aucun modèle ne correspond à ta recherche ou à tes filtres.",
        manage: "Gérer dans Modèles de bloc",
      },
    },
    article: {
      ready: {
        title: "Prêt à publier ?",
        count: (done: number, total: number) => `${done} / ${total}`,
        items: {
          title: "Titre",
          cover: "Image de présentation",
          audio: "Audio",
          address: "Adresse de la page",
          access: "Niveau d'accès",
        },
        done: (label: string) => `${label} : fait`,
        todo: (label: string) => `${label} : à régler`,
        // Les points à vérifier du plan : ils n'empêchent pas de publier.
        warnings: (count: number) =>
          count === 1
            ? "1 point à vérifier dans le Plan"
            : `${count} points à vérifier dans le Plan`,
      },
      feed: {
        title: {
          article: "Dans la liste du Blog",
          episode: "Dans la liste des Podcasts",
        },
        choose: "Choisir",
        chooseLabel: "Choisir l'image de présentation",
        replaceLabel: "Changer l'image de présentation",
        hint: {
          article:
            "L'image est obligatoire pour publier : c'est aussi celle en tête de l'article.",
          episode:
            "L'image est obligatoire pour publier : c'est aussi celle en tête de l'épisode.",
        },
      },
      categories: {
        add: "Ajouter",
        addLabel: "Ajouter une catégorie",
      },
      stats: {
        words: (count: string) =>
          count === "0" || count === "1" ? `${count} mot` : `${count} mots`,
        // En bas de la colonne : court (la phrase entière et la date complète dans l'infobulle).
        // 0 min pour un article vide, comme en Lecture (readingStats).
        short: (minutes: number, words: string) => `${minutes} min · ${words}`,
        readingTip: (minutes: number, words: string) =>
          `Environ ${minutes} min de lecture, ${words}`,
        // Un épisode : la durée de son audio au lieu du temps de lecture.
        audioShort: (duration: string, words: string) =>
          `${duration} · ${words}`,
        audioTip: (duration: string, words: string) =>
          `Durée de l'audio : ${duration}, ${words}`,
        noAudio: "Pas d'audio",
        noAudioTip: (words: string) => `Pas encore d'audio, ${words}`,
        unknownDuration: "inconnue",
        savedAt: (time: string) => `Enregistré à ${time}`,
        savedOn: (day: string) => `Enregistré le ${day}`,
      },
    },
    settings: {
      label: "Réglages du bloc",
      title: (label: string) => `Réglages : ${label}`,
      // Éditeur du Fil : la barre d'icônes en bas de la glissière du bloc.
      actions: "Actions du bloc",
      readOnly: "Lecture seule : tu ne peux rien modifier.",
      text: "Écris directement dans l'aperçu. Sélectionne des mots pour les mettre en gras, en italique ou en lien.",
      image: {
        file: "Fichier",
        alt: "Texte alternatif",
        altFromLibrary: "Reprendre celui de la Médiathèque",
        libraryAlt: (alt: string) => `Médiathèque : « ${alt} »`,
        noLibraryAlt:
          "La Médiathèque n'a pas de texte alternatif pour cette image.",
        altHint:
          "Décris l'image en une phrase pour les personnes qui ne la voient pas.",
      },
      box: {
        look: "Apparence",
        fill: "Fond",
        border: "Bordure",
        hint: "Un encadré contient des textes et des images, pas d'autre encadré.",
      },
      moveUp: "Monter",
      moveDown: "Descendre",
      // Le premier (ou le dernier) bloc d'une section en sort.
      moveUpOut: "Monter hors de l'encadré",
      moveDownOut: "Descendre hors de l'encadré",
      remove: "Supprimer le bloc",
      removed: (label: string) => `Bloc supprimé : ${label}.`,
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
      pending: "Enregistrement dans un instant…",
      saving: "Enregistrement…",
      offline: "Hors ligne, nouvel essai…",
      // En ligne, mais le serveur n'a pas répondu (erreur passagère) : nouvel essai prévu.
      retrying: "Échec de l'enregistrement, nouvel essai…",
      failed: "Échec de l'enregistrement",
      stopped: "Enregistrement arrêté",
      // Lu par les lecteurs d'écran, seulement quand l'état change vraiment (pas à chaque
      // enregistrement).
      announce: {
        offline:
          "Hors ligne : tes modifications seront enregistrées au retour du réseau.",
        retrying:
          "Le serveur n'a pas répondu : l'enregistrement va réessayer dans un instant.",
        saved: "Tes modifications sont enregistrées.",
      },
      leave: {
        title: "Quitter sans enregistrer ?",
        description:
          "Tes dernières modifications ne sont pas encore enregistrées : elles seront perdues.",
        stay: "Rester",
        confirm: "Quitter quand même",
      },
      // Le brouillon a changé ailleurs et sa relecture a échoué : nouvel essai toutes les 3 s.
      rereadFailed:
        "Ce brouillon a changé ailleurs et n'a pas pu être relu. Il reste en lecture seule tant que la relecture n'a pas réussi.",
      // L'éditeur fermé, la dernière modification n'a pas pu partir (message gardé à l'écran).
      unsavedAtClose:
        "Ta dernière modification n'a pas pu être enregistrée avant de quitter l'éditeur.",
      nearLimit:
        "Ce brouillon approche de la taille maximale. Pense à le découper en plusieurs contenus.",
      invalidAt: (position: number) =>
        `Le bloc n° ${position} n'a pas la forme attendue.`,
    },
    // Un seul membre à la fois sur un brouillon.
    lock: {
      unsaved:
        "Ce que tu n'avais pas encore enregistré n'est pas perdu : copie-le avant de quitter la page.",
      stashKept:
        "Le texte que tu n'avais pas enregistré avant de perdre la main est encore disponible.",
      dismiss: "Ignorer",
      copy: "Copier mon texte",
      copied: "Ton texte est copié. Colle-le où tu veux.",
      copyFailed:
        "La copie n'a pas marché. Autorise l'accès au presse-papiers dans ton navigateur, puis réessaie.",
      someone: "Quelqu'un",
      trashed:
        "Ce contenu est dans la Corbeille : restaure-le pour le modifier.",
      failed:
        "L'état du brouillon n'a pas pu être lu. Réessaie dans un instant.",
      reloadFailed:
        "Le brouillon n'a pas pu être relu. Ton texte reste à l'écran : réessaie dans un instant.",
      // Le cadenas à côté de Concentration, et sa fenêtre.
      button: "Lecture seule",
      dialog: {
        title: {
          lost: (name: string) => `${name} a repris la main`,
          lostUnknown: "Quelqu'un a repris la main",
          lostSelf: "Tu as pris la main dans un autre onglet",
          readOnly: (name: string) => `${name} écrit ce brouillon`,
          readOnlySelf: "Tu écris ce brouillon dans un autre onglet",
          free: "Personne n'écrit ce brouillon",
          released: "Le brouillon a été libéré",
        },
        text: {
          lost: (name: string) =>
            `Tu vois maintenant ce brouillon en lecture seule. Il se met à jour à chaque enregistrement de ${name}.`,
          lostUnknown:
            "Tu vois maintenant ce brouillon en lecture seule. Il se met à jour à chaque enregistrement.",
          lostSelf: "Ici, tu vois maintenant ce brouillon en lecture seule.",
          readOnly: (name: string) =>
            `Tu le vois en lecture seule, et il se met à jour à chaque enregistrement de ${name}.`,
          readOnlySelf: "Ici, tu le vois en lecture seule.",
          free: "Tu le vois en lecture seule. Prends la main pour écrire.",
          released:
            "Cet onglet est resté caché plus de 30 minutes : le brouillon a été libéré pour l'équipe.",
        },
        // Ce que ferait la prise de main.
        note: {
          other: (name: string) =>
            `Si tu prends la main, ${name} passera en lecture seule. Ce qui n'est pas encore enregistré de son côté restera dans son navigateur.`,
          unknown:
            "Si tu prends la main, la personne qui écrit passera en lecture seule. Ce qui n'est pas encore enregistré de son côté restera dans son navigateur.",
          self: "Si tu reprends la main ici, l'autre onglet passera en lecture seule.",
        },
        take: {
          lost: "Reprendre la main",
          lostSelf: "Reprendre la main ici",
          readOnly: "Prendre la main",
          readOnlySelf: "Prendre la main ici",
          free: "Prendre la main",
          released: "Reprendre la main",
        },
        stay: "Rester en lecture seule",
      },
    },
    // Erreurs de la base (RPC), selon leur code (docs/ARCHITECTURE-CONTENUS.md, « Étape 4 »).
    errors: {
      reserve_a_l_equipe:
        "Ton compte n'a plus accès à l'éditeur. Reconnecte-toi.",
      demande_invalide: "La demande n'est pas valide. Recharge la page.",
      sorte_invalide:
        "Ce type de contenu ou de modèle n'est pas valide. Recharge la page.",
      contenu_introuvable: "Ce contenu n'existe plus.",
      dans_la_corbeille:
        "Ce contenu est dans la Corbeille : restaure-le pour le modifier.",
      verrou_perdu:
        "Quelqu'un d'autre a pris la main sur ce brouillon : tes dernières modifications ne sont pas enregistrées.",
      conflit_revision:
        "Le brouillon a changé ailleurs depuis ta dernière lecture. Copie ton texte, puis recharge la page.",
      reglages_invalides: "Un réglage n'est pas valide pour ce contenu.",
      adresse_invalide:
        "L'adresse de la page ne peut contenir que des lettres minuscules sans accent, des chiffres et des tirets.",
      adresse_prise: "Une autre page a déjà cette adresse.",
      categorie_invalide: "Une des catégories n'existe plus. Recharge la page.",
      brouillon_trop_lourd:
        "Ce brouillon est trop long pour être enregistré (240 Ko au plus). Découpe-le en plusieurs contenus.",
      brouillon_trop_imbrique:
        "Une liste contient trop de niveaux. Réduis les listes dans les listes.",
      forme_invalide:
        "Le brouillon n'a pas la forme attendue : il n'a pas été enregistré.",
      id_en_double:
        "Deux blocs ont le même identifiant. Recharge la page, puis réessaie.",
      fichier_indisponible:
        "Un fichier n'est plus disponible (il est dans la Corbeille ou pas encore prêt). Choisis-en un autre.",
      modele_indisponible: "Un modèle utilisé n'est plus disponible.",
      // Étape 5 : publication, programmation, historique, corbeille.
      acces_a_choisir:
        "Choisis d'abord le niveau d'accès : Gratuit ou une formule.",
      verrou_tenu:
        "Quelqu'un écrit ce brouillon en ce moment : prends la main, ou attends que cette personne ait fini.",
      adresse_manquante: "Choisis l'adresse de la page avant de la publier.",
      son_manquant: "Choisis l'audio de l'épisode avant de le publier.",
      // [D49].
      titre_manquant: "Donne un titre avant de publier.",
      // Étape 7 : [D45].
      image_de_presentation_manquante:
        "Choisis l'image de présentation avant de publier : c'est la vignette des listes de l'app.",
      image_sans_fichier:
        "Un bloc Image n'a pas de fichier : choisis-en un, ou supprime le bloc.",
      fichier_inadapte:
        "Un fichier n'est pas du bon type : une photo ou une image pour un bloc Image ou l'image de présentation, un audio pour un épisode.",
      niveau_invalide:
        "Cette formule n'existe plus. Choisis un autre niveau d'accès.",
      date_passee:
        "Ce moment est déjà passé. Choisis un jour et une heure à venir.",
      version_introuvable:
        "Cette version n'existe plus. Recharge l'historique.",
      version_immuable: "Une version publiée ne se modifie pas.",
      modele_utilise:
        "Ce modèle est encore utilisé dans des brouillons : détache-le d'abord partout.",
      // Étape 6 : modèles de blocs.
      modele_vide:
        "Ce bloc partagé est encore vide : ajoute-lui son bloc dans Modèles de bloc avant de l'insérer.",
      modele_un_seul_bloc:
        "Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, mets-les dans un encadré.",
      bloc_introuvable:
        "Un des blocs choisis n'est pas encore enregistré. Attends la fin de l'enregistrement, puis réessaie.",
      modele_introuvable:
        "Ce modèle n'existe plus, ou ce n'est pas un bloc partagé. Recharge la page.",
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
      waiting: "Publication en attente : quelqu'un écrit le brouillon",
      failed: "Échec de la publication programmée",
      // L'état n'a pas pu être lu (réseau) : « Publier » attend qu'il le soit.
      unknownHint:
        "L'état de publication n'a pas pu être lu : clique pour réessayer.",
    },
    // Éditeur du Fil : la pastille à côté de « Publier » (la phrase entière dans l'infobulle).
    short: {
      draft: "Brouillon",
      withdrawn: "Retiré",
      live: "En ligne",
      modified: "Modifié",
      scheduled: "Programmé",
      due: "En cours",
      waiting: "En attente",
      failed: "Échec",
      unknown: "État inconnu",
    },
    // Bandeau de l'éditeur ([D16], [D31]).
    banner: {
      scheduled: (date: string) =>
        `Programmé le ${date} : ce que tu écris partira à cette heure.`,
      scheduledHint:
        "C'est le dernier brouillon enregistré qui sera publié. Si quelqu'un l'a modifié depuis la programmation et a encore l'éditeur ouvert, la publication attend que cette personne quitte l'éditeur. Au bout d'une heure, la publication programmée échoue.",
      due: (date: string) =>
        `Programmé le ${date} : la publication part dans un instant.`,
      dueHint:
        "Si quelqu'un a modifié ce brouillon depuis la programmation et a encore l'éditeur ouvert, la publication attend que cette personne quitte l'éditeur. Au bout d'une heure, la publication programmée échoue.",
      waiting: (date: string) =>
        `Programmation en attente depuis le ${date} : quelqu'un écrit ce brouillon.`,
      waitingHint:
        "La publication partira dès que cette personne aura quitté l'éditeur. Au bout d'une heure, elle échouera.",
      // La personne devant l'écran tient elle-même le verrou ([D31]).
      waitingMine: (date: string) =>
        `Programmé le ${date}. Si tu as modifié le brouillon depuis, la publication attend que tu quittes l'éditeur.`,
      waitingMineHint:
        "Les modifications enregistrées depuis la programmation retiennent la publication tant que ton éditeur est ouvert, même sans écrire. Au bout d'une heure, la publication programmée échoue.",
      leave: "Quitter l'éditeur",
      failed: "La publication programmée a échoué.",
      failedReason: (reason: string) => `Raison : ${reason}`,
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
      dismissFailure: "Retirer l'échec",
      unpublish: "Retirer de l'app",
      history: "Historique",
    },
    publishDialog: {
      title: "Publier dans l'app ?",
      titleAgain: "Publier les modifications ?",
      description:
        "Les lecteurs verront le brouillon tel qu'il est enregistré maintenant. Tes modifications suivantes n'apparaîtront dans l'app qu'à la prochaine publication. Une publication programmée est annulée.",
      access: "Niveau d'accès",
      address: "Adresse de la page",
      confirm: "Publier",
    },
    // Ce qui manque pour publier ou programmer ([D45], audio d'un épisode), et le conseil [D46].
    requirements: {
      publishTitle: "Pour publier, il manque :",
      scheduleTitle: "Pour programmer, il manque :",
      title: "Le titre.",
      writeTitle: "Écrire le titre",
      cover: "L'image de présentation (la vignette des listes de l'app).",
      coverUnavailable:
        "Une image de présentation disponible (l'actuelle est dans la Corbeille ou pas encore prête).",
      audio: "L'audio de l'épisode.",
      audioUnavailable:
        "Un audio disponible (le fichier actuel est dans la Corbeille ou pas encore prêt).",
      chooseCover: "Choisir l'image",
      chooseAudio: "Choisir l'audio",
      transcript:
        "Conseillé : l'audio n'a pas de transcription. Tu peux publier quand même, et l'ajouter ensuite dans sa fiche de la Médiathèque.",
    },
    levelRequired:
      "Il n'y a pas de niveau d'accès par défaut : choisis Gratuit ou une formule.",
    levelNeedsLock:
      "Pour choisir le niveau d'accès, prends d'abord la main sur le brouillon.",
    needsSaved:
      "Le brouillon n'est pas encore enregistré. Attends la fin de l'enregistrement, puis réessaie.",
    published: (number: number) => `Publié dans l'app (version n° ${number}).`,
    upToDate: "Ce brouillon est déjà en ligne, tel quel.",
    conflict:
      "Le brouillon vient de changer : relis-le, puis publie de nouveau.",
    lockHeld: {
      title: "Quelqu'un écrit ce brouillon",
      description: (name: string) =>
        `${name} écrit ce brouillon en ce moment. Pour publier, reprends la main (${name} passera en lecture seule), ou attends que ${name} ait fini.`,
      take: "Reprendre la main",
    },
    unpublishDialog: {
      title: "Retirer de l'app ?",
      description:
        "Les lecteurs ne verront plus ce contenu. Le brouillon et l'historique sont gardés, et tu pourras le publier de nouveau. Une publication programmée est annulée.",
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
        "Cette heure existe deux fois cette nuit-là (retour à l'heure d'hiver) : la publication partira à la première, encore en heure d'été.",
      confirm: "Programmer",
      done: (date: string) => `Publication programmée le ${date}.`,
      errors: {
        required: "Choisis un jour et une heure.",
        invalid: "Saisis un jour et une heure valides.",
        nonexistent:
          "Cette heure n'existe pas ce jour-là : à 02h00, on passe directement à 03h00 (heure d'été). Choisis une autre heure.",
        past: "Ce moment est déjà passé. Choisis un jour et une heure à venir.",
      },
    },
    unscheduled: "Programmation annulée.",
    failureDismissed: "Échec retiré.",
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
        template: "Bloc partagé mis à jour",
        files: "Fichier, texte alternatif ou transcription mis à jour",
      },
      // Les catégories d'une version (article, épisode), dans l'ordre de la section ([D28]).
      categories: (names: string[]) => `Catégories : ${names.join(", ")}`,
      noCategory: "Aucune catégorie",
      deletedCategories: (count: number) =>
        count === 1 ? "catégorie supprimée" : `${count} catégories supprimées`,
      revert: "Revenir à cette version",
      revertItem: (number: number) => `Revenir à la version n° ${number}`,
      confirm: {
        title: (number: number) => `Revenir à la version n° ${number} ?`,
        // Ce que revert_to_version remplace dépend de la sorte : l'adresse d'une page, les
        // catégories d'un article ou d'un épisode.
        description: (kind: string) =>
          kind === "page"
            ? "Le brouillon sera remplacé par cette version : son contenu, son niveau d'accès et son adresse. Rien ne change dans l'app avant la prochaine publication."
            : kind === "article" || kind === "episode"
              ? "Le brouillon sera remplacé par cette version : son contenu, son niveau d'accès et ses catégories (une catégorie supprimée depuis ne revient pas). Rien ne change dans l'app avant la prochaine publication."
              : "Le brouillon sera remplacé par cette version : son contenu et son niveau d'accès. Rien ne change dans l'app avant la prochaine publication.",
        confirm: "Revenir à cette version",
      },
      needsLock:
        "Pour revenir à une version, prends d'abord la main sur le brouillon.",
      reverted: (number: number) =>
        `Le brouillon reprend la version n° ${number}.`,
      warnings: {
        fichier_retire:
          "Un fichier n'est plus disponible : choisis-en un autre avant de publier.",
        modele_detache:
          "Le modèle d'un bloc partagé n'existe plus : ce bloc est devenu une copie ordinaire.",
        adresse_prise:
          "Une autre page a pris cette adresse entre-temps : le brouillon garde son adresse actuelle.",
      },
      loadFailed: "L'historique n'a pas pu être chargé.",
    },
    settings: {
      title: "Réglages du contenu",
      description:
        "Ils sont enregistrés avec le brouillon et ne changent l'app qu'à la prochaine publication.",
      readOnly:
        "Lecture seule : prends la main sur le brouillon pour modifier les réglages.",
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
        // La dernière formule : il n'y en a pas de plus complète.
        levelHintTop: "Pour les abonnés de cette formule, la plus complète.",
        notChosen: "Pas encore choisi : « Publier » le demandera.",
        notChosenShort: "Choisis un niveau",
        noLevels:
          "Aucune formule d'abonnement pour l'instant : un admin peut en créer dans Paramètres › Formules.",
        loadFailed: "Les formules d'abonnement n'ont pas pu être chargées.",
        live: (name: string) => `En ligne : ${name}`,
        deleted: "formule supprimée",
      },
      slug: {
        label: "Adresse de la page",
        description:
          "Ce que l'app demande pour ouvrir la page : des lettres minuscules sans accent, des chiffres et des tirets.",
        placeholder: "mentions-legales",
        invalid:
          "Des lettres minuscules sans accent, des chiffres et des tirets seulement (pas de tiret au début, à la fin ni deux de suite).",
        tooLong: "L'adresse ne doit pas dépasser 100 caractères.",
        fromTitle: "Reprendre le titre",
        live: (slug: string) => `En ligne : ${slug}`,
        missing: "Choisis l'adresse de la page avant de la publier.",
        taken: (title: string) =>
          `La page « ${title || "Sans titre"} » a déjà cette adresse : choisis-en une autre.`,
        checking: "Vérification de l'adresse…",
        free: "Libre",
      },
      categories: {
        label: "Catégories",
        description:
          "Facultatives : l'app s'en sert pour filtrer. Elles ne changent l'app qu'à la prochaine publication.",
        none: "Aucune catégorie dans cette section pour l'instant.",
        loadFailed: "Les catégories n'ont pas pu être chargées.",
      },
      // Un réglage refusé par la base : le brouillon s'enregistre quand même, sans lui.
      refused:
        "Ce réglage n'a pas été changé. Le reste du brouillon continue d'être enregistré.",
    },
  },

  // Paramètres (admins) : quatre onglets, dont les formules d'abonnement.
  settings: {
    tabs: {
      label: "Onglets des Paramètres",
      admin: "Identité de l'admin",
      app: "Identité de l'app",
      plans: "Formules",
      advanced: "Avancé",
    },
    // Onglet « Identité de l'admin » : le nom de la marque, pour toute l'équipe.
    adminIdentity: {
      // La carte de la marque : son nom et son adresse de contact.
      title: "Marque",
      description:
        "Le nom que ton équipe voit dans le menu, l'onglet du navigateur et l'écran de connexion. L'adresse e-mail de contact s'affiche sur l'écran de connexion, pour que qui a perdu son téléphone ou son invitation puisse te joindre.",
      name: "Le nom de ta marque",
      save: "Enregistrer",
      nameTooLong: "Le nom ne doit pas dépasser 40 caractères.",
      // L'adresse de contact, montrée sur l'écran de connexion à qui a besoin d'aide.
      email: "Adresse e-mail de contact",
      emailPlaceholder: "contact@exemple.fr",
      invalidEmail: "Saisis une adresse e-mail valide.",
      saved: "Marque enregistrée.",
      loadFailed: "La marque n'a pas pu être chargée.",
      // Le logotype et le monogramme, chacun pour fond clair et pour fond sombre : une carte
      // par fichier (le modèle « Cover Art » de shadcn).
      files: {
        // La section des logos : une carte, deux groupes de deux cases (fond clair, fond sombre).
        title: "Logos",
        description:
          "Envoie ton logo pour les fonds clairs et sombres (SVG, PNG ou WebP, 1 Mo au plus). Choisis un fichier ou glisse-le dans une case. Une seule version suffit : elle sert sur les deux fonds. Sans logo, le nom de ta marque s'affiche à la place, ou les logos à défaut s'il n'y a pas de nom.",
        logotype: {
          title: "Logotype",
          use: "menu et connexion",
        },
        monogram: {
          title: "Monogramme",
          use: "onglet et connexion",
        },
        light: "Fond clair",
        dark: "Fond sombre",
        // L'étiquette d'une carte, et le nom de son champ : « Logotype · fond clair ».
        label: (what: string, surface: string) =>
          `${what} · ${surface.toLowerCase()}`,
        choose: "Choisir un fichier",
        // Un fichier glissé au-dessus d'une carte.
        drop: "Dépose le fichier ici",
        replace: "Remplacer",
        remove: "Retirer",
        saved: "Fichier enregistré.",
        removed: "Fichier retiré.",
        // Un SVG aux couleurs modifiables : le décliner aux couleurs des palettes ?
        variants: {
          title: "Décliner ce logo aux couleurs des palettes ?",
          description: (count: number, original: string) =>
            `Ce logo sait changer de couleurs : chacun le verra aux teintes de sa palette, sur fond clair comme sur fond sombre. ${count} palettes en tout ; ${original}, la palette d'origine, garde les couleurs du fichier.`,
          detected: "Couleurs détectées",
          main: "Principale",
          accent: "Accent",
          keep: "Garder tel quel",
          confirm: (count: number) => `Décliner pour les ${count} palettes`,
          done: "Logo enregistré et décliné pour les palettes.",
          // Sous le message : un fichier envoyé sans être décliné, ou retiré, emporte les déclinaisons.
          removed: "Ses déclinaisons par palette ont été retirées.",
          status: (count: number) =>
            `Décliné pour ${count} palette${count > 1 ? "s" : ""}`,
        },
        errors: {
          type: "Choisis un SVG, un PNG ou un WebP.",
          tooBig: "Le fichier dépasse 1 Mo.",
          svg: "Ce SVG n'a pas pu être lu.",
          photoType: "Choisis un JPEG, un PNG ou un WebP.",
          photo: "Cette image n'a pas pu être lue.",
        },
        // La section de l'écran de connexion : l'aperçu (l'image, le voile et le monogramme) et,
        // à côté, l'image et le monogramme animé.
        loginScreen: {
          title: "Écran de connexion",
          description:
            "Le premier écran que voit ton équipe en se connectant. Choisis une image de fond, montrée sur les grands écrans (JPEG, PNG ou WebP, réduite et allégée automatiquement), ou glisse-la sur l'aperçu, puis choisis comment le monogramme s'anime.",
          preview: "Aperçu de l'écran de connexion",
        },
        loginImage: {
          title: "Image de fond",
          formats: "JPEG, PNG ou WebP",
          // Une photo plus lourde est réduite à l'envoi : elle tient toujours dans 1 Mo.
          maxSize: "Réduite et allégée automatiquement",
          choose: "Choisir",
        },
        monogramMotion: {
          title: "Monogramme animé",
          description:
            "Coche les animations que tu veux. Elles tournent en boucle, l'une après l'autre, avec une courte pause après chacune.",
          toggle: "Animer le monogramme",
          on: "Monogramme animé.",
          off: "Monogramme immobile.",
          // Les animations, dans l'ordre où elles se jouent (lib/monogram-motion.ts).
          motions: {
            trace: "Tracé",
            cascade: "Cascade",
            glint: "Lueur",
            shine: "Reflet",
            halo: "Halo",
            sway: "Balancement",
            breathe: "Respiration",
          },
          group: "Animations du monogramme",
          // Une animation grisée : ce que le monogramme pour fond sombre ne permet pas.
          blocked: {
            svg: "« Tracé », « Cascade » et « Lueur » : seulement avec un monogramme en SVG simple (quatre couleurs pleines au plus, sans dégradé ni image).",
            accent:
              "« Lueur » : seulement avec un monogramme qui a une couleur d'accent (une couleur vive à côté du noir, du blanc ou du gris).",
          },
          saved: "Animations enregistrées.",
        },
      },
    },
    // Onglet « Avancé » : la langue de toute l'admin.
    advanced: {
      language: {
        title: "Langue",
        description:
          "La langue de l'admin et de ses pages de connexion, pour toute l'équipe. Chaque membre peut choisir la sienne dans Mon compte.",
        label: "Langue de l'admin",
        hint: "Les membres qui ont choisi leur langue dans Mon compte la gardent.",
        saved: "Langue de l'admin enregistrée.",
        loadFailed: "La langue de l'admin n'a pas pu être chargée.",
      },
    },
    // Un onglet pas encore rempli.
    empty: {
      title: "Rien ici pour l'instant",
      description: "Cet onglet arrive bientôt.",
    },
    accessLevels: {
      title: "Formules d'abonnement",
      description:
        "De la moins complète, en haut, à la plus complète, en bas. Chaque abonné lit les contenus de sa formule et de toutes celles placées au-dessus. Change l'ordre : ce que chacun peut lire suit aussitôt.",
      listLabel: "Formules, de la moins complète à la plus complète",
      empty:
        "Pas encore de formule. Tant qu'il n'y en a pas, tous les contenus restent gratuits.",
      name: "Nom de la nouvelle formule",
      namePlaceholder: "Par exemple : Essentiel",
      addTitle: "Ajouter une formule",
      addDescription:
        "Elle se place en bas, comme la plus complète. Glisse-la ensuite à sa juste place.",
      nameRequired: "Donne un nom à la formule.",
      nameTooLong: "Le nom ne doit pas dépasser 100 caractères.",
      add: "Ajouter",
      added: (name: string) => `Formule « ${name} » ajoutée.`,
      rank: (position: number) => `n° ${position}`,
      rename: "Renommer",
      renameLabel: (name: string) => `Nouveau nom pour ${name}`,
      renamed: "Formule renommée.",
      remove: "Supprimer définitivement",
      actions: (name: string) => `Actions pour ${name}`,
      confirmRemove: {
        title: "Supprimer cette formule ?",
        description: (name: string) =>
          `« ${name} » sera supprimée définitivement. Tu ne peux supprimer qu'une formule qu'aucun abonné n'a, qu'aucun contenu n'utilise (même dans la Corbeille) et qu'aucune version publiée n'a jamais utilisée.`,
        confirm: "Supprimer définitivement",
      },
      removed: (name: string) => `Formule « ${name} » supprimée.`,
      handle: (name: string) => `Déplacer « ${name} »`,
      reordered: "Nouvel ordre enregistré.",
      // Glisser-déposer : annonces lues par les lecteurs d'écran.
      dnd: {
        roleDescription: "formule déplaçable",
        instructions:
          "Pour déplacer une formule, appuie sur Espace ou Entrée sur sa poignée. Déplace-la avec les flèches, puis appuie de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
        start: (name: string) => `Tu as pris « ${name} ».`,
        over: (name: string, position: number, count: number) =>
          `« ${name} » est à la place n° ${position} sur ${count}.`,
        end: (name: string, position: number, count: number) =>
          `« ${name} » déposée à la place n° ${position} sur ${count}.`,
        cancel: (name: string) =>
          `Déplacement annulé : « ${name} » reprend sa place.`,
      },
      loadFailed: "Les formules n'ont pas pu être chargées.",
      errors: {
        formule_utilisee:
          "Impossible de supprimer cette formule : un abonné l'a, un contenu l'utilise (même dans la Corbeille) ou une version publiée de l'historique l'a utilisée. Tu peux la renommer ou la déplacer à la place.",
        nom_en_double: "Une formule porte déjà ce nom.",
        reserve_aux_admins: "Les formules sont réservées aux admins.",
        reserve_a_l_equipe:
          "Tu n'as plus accès aux Paramètres. Reconnecte-toi.",
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

  header: {
    label: "Menu du haut",
    website: "Site web",
    newTab: "(nouvel onglet)",
  },

  help: {
    search: "Rechercher dans l'aide",
    shortcut: { apple: "⌘K", other: "Ctrl K" },
    title: "Aide",
    description:
      "Cherche une fiche d'aide : ce que tu veux faire, en quelques mots.",
    placeholder: "Que veux-tu faire ?",
    empty: "Aucune fiche ne correspond. Essaie d'autres mots.",
    steps: "Étapes",
    notes: "À savoir",
    themes: {
      contenus: "Écrire",
      publication: "Publier",
      mediatheque: "Médiathèque",
      modeles: "Modèles de bloc",
      corbeille: "Corbeille",
      equipe: "Équipe et compte",
    },
  },

  // Les couleurs de chacun, dans Mon compte (noms des thèmes de shadcn, en français).
  // Les couleurs, dans la carte Thème de Mon compte.
  colors: {
    // Les palettes toutes prêtes : un clic choisit la base et l'accent. Leur nom mêle ceux des deux.
    presets: {
      title: "Palettes",
      // Revenir à la palette d'origine (Neutrine).
      reset: "Réinitialiser",
      names: {
        "neutral-none": "Neutrine",
        "stone-orange": "Pierrange",
        "taupe-amber": "Taupambre",
        "olive-green": "Olivert",
        "mist-teal": "Brumelle",
        "mist-sky": "Brumciel",
        "zinc-indigo": "Zindigo",
        "zinc-blue": "Zinbleu",
        "mauve-violet": "Mauvolette",
        "mauve-rose": "Mauvoise",
        "neutral-red": "Neutrouge",
      },
      moods: {
        "neutral-none": "Épuré, intemporel",
        "stone-orange": "Chaleureux, énergique",
        "taupe-amber": "Terreux, doré",
        "olive-green": "Naturel, apaisé",
        "mist-teal": "Calme, frais",
        "mist-sky": "Aérien, lumineux",
        "zinc-indigo": "Net, moderne",
        "zinc-blue": "Classique, rassurant",
        "mauve-violet": "Doux, créatif",
        "mauve-rose": "Tendre, affirmé",
        "neutral-red": "Sobre, contrasté",
      },
    },
    // L'aperçu, à côté du choix : la page d'accueil de l'admin en réduction, avec un travail d'équipe inventé.
    preview: {
      title: "Aperçu",
      description:
        "La palette choisie s'applique à toute l'admin, pour toi seulement.",
      nav: ["Tableau de bord", "Blog", "Podcasts", "Pages", "Médiathèque"],
      initial: "C",
      member: "Camille",
      heading: "Tableau de bord",
      subtitle: "Le travail de l'équipe cette semaine.",
      primary: "Nouvel article",
      stats: [
        { label: "Publiés", value: "24", badge: "+6" },
        { label: "Brouillons", value: "8", badge: "+2" },
      ],
      chart: "Publiés cette semaine",
      list: "Derniers contenus modifiés",
      rows: [
        {
          name: "Respirer avant de répondre",
          meta: "Blog · par Léa, il y a 2 h",
          badge: "En ligne",
        },
        {
          name: "Le calme du matin",
          meta: "Podcasts · par Hugo, hier",
          badge: "Programmé",
        },
        {
          name: "Trouver son rythme",
          meta: "Blog · par Camille, lundi",
          badge: "Brouillon",
        },
      ],
    },
  },

  theme: {
    title: "Thème",
    // Sous le titre de la carte Thème de Mon compte, qui réunit le mode et les couleurs.
    description: "Rien que pour toi, sur ce navigateur.",
    light: "Clair",
    dark: "Sombre",
    system: "Automatique",
    // Le bouton du header : le thème choisi, et celui qui vient au clic.
    switch: (current: string, next: string) =>
      `Thème : ${current}. Passer en ${next.toLowerCase()}`,
  },

  smallScreen: {
    title: "Écran trop petit",
    message:
      "L'admin s'utilise sur un ordinateur. Agrandis la fenêtre ou change d'appareil.",
  },

  notFound: {
    title: "Page introuvable",
    description: "Cette adresse ne correspond à aucune page de l'admin.",
    back: "Retour au Tableau de bord",
  },

  error: {
    title: "Une erreur est survenue",
    description:
      "L'erreur nous a été signalée et nous allons la regarder. Recharge la page pour réessayer.",
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
}

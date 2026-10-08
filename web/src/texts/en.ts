// Tous les textes de l'interface en anglais, la langue de référence : un texte s'écrit
// d'abord ici, puis dans les autres langues (fr.ts). La forme des textes (`Texts`) en est tirée.

export const en = {
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
    close: "Close",
    cancel: "Cancel",
    retry: "Try again",
    save: "Save",
    untitled: "Untitled",
    actions: "Actions",
    clearSearch: "Clear search",
    // « Modifié le 27 sept. 2026 à 14h30 par Anne »
    savedBy: (name: string) => `by ${name}`,
    loading: "Loading…",
    signOut: "Sign out",
    tooManyAttempts: "Too many attempts. Try again in a minute.",
    unexpected:
      "Something went wrong. Check your connection and try again in a moment.",
  },

  // Sélection en masse (Médiathèque, listes de contenus) : les mots qui ne dépendent pas de la page.
  selection: {
    select: (name: string) => `Select ${name}`,
    selectAll: "Select all",
    trash: (count: number) => `Move to Trash (${count})`,
    keptItem: (name: string, detail: string) => `${name} — ${detail}`,
    closeKept: "Dismiss message",
  },

  roles: {
    admin: "Admin",
    editor: "Editor",
  },

  nav: {
    label: "Main menu",
    groups: {
      contents: "Content",
      tools: "Tools",
    },
    // La barre du haut, pendant que la page suivante se prépare.
    pageLoading: "Loading page",
  },

  // Titre et présentation de chaque section, dans le menu et en tête de page.
  sections: {
    home: {
      title: "Dashboard",
      description: "Welcome",
    },
    blog: {
      title: "Blog",
      description: "Posts and categories.",
    },
    podcasts: {
      title: "Podcasts",
      description: "Episodes and categories.",
    },
    pages: {
      title: "Pages",
      description: "Static pages in your app, like About or Privacy Policy.",
    },
    templates: {
      title: "Block templates",
      description: "Reusable blocks for your content.",
    },
    media: {
      title: "Media library",
      description:
        "JPEG, PNG, WebP, GIF, HEIC, AVIF, SVG, Lottie, MP3, M4A, and PDF.",
    },
    trash: {
      title: "Trash",
      description: "Items in the Trash can be restored for 30 days.",
    },
    team: {
      title: "Team",
      description: "Team members and roles.",
    },
    settings: {
      title: "Settings",
      description:
        "Brand your admin and app, set up your plans, and adjust advanced settings.",
    },
    account: {
      title: "My account",
      description: "Your profile, security, and display preferences.",
    },
  },

  // Connexion : e-mail, puis code reçu par e-mail, puis double vérification.
  // Sous la carte des pages de connexion : « © 2026 Ruche · Tous droits réservés ».
  copyright: (year: number, brand: string) =>
    `© ${year} ${brand} · All rights reserved`,
  signIn: {
    title: "Sign in",
    // En bas de l'étape de l'adresse (AuthNote).
    hint: {
      title: "No password needed",
      text: "Enter your email address and we'll send you a 6-digit code to sign in.",
    },
    email: "Email address",
    emailPlaceholder: "name@example.com",
    invalidEmail: "Enter a valid email address.",
    sendCode: "Send me a code",
    codeTitle: "Check your email",
    // Même message que l'adresse fasse partie de l'équipe ou non.
    codeSent: (email: string) =>
      `If ${email} is on the team, a code is on its way. It's valid for 10 minutes.`,
    // Nouvelle demande trop rapprochée : le code déjà envoyé reste valable.
    codeAlreadySent: (email: string) =>
      `If ${email} is on the team, we sent a code less than a minute ago. Enter it, or wait a minute to request a new one.`,
    // Après un rechargement de la page.
    codeStillValid: (email: string) =>
      `If ${email} is on the team, we've sent a code to that address. It's valid for 10 minutes after it was sent.`,
    // Une invitation pas encore acceptée ne permet pas de recevoir un code.
    invitedHint: {
      title: "Got an invitation?",
      text: "Open the link in your invitation email instead, or ask an admin to resend it.",
      // Avec l'adresse de contact de la marque (Paramètres), suivie de l'adresse en lien.
      withContact:
        "Open the link in your invitation email instead, or write to",
    },
    code: "Code from your email",
    invalidCode: "Enter the 6-digit code.",
    wrongCode:
      "This code is incorrect or has expired. Check it, or request a new code.",
    submitCode: "Sign in",
    resendCode: "Send a new code",
    codeResent: "If this address is on the team, a new code is on its way.",
    otherEmail: "Use a different email",
  },

  mfa: {
    // La configuration, en deux étapes qui glissent : le QR code (modèle « Scan to connect your
    // mobile device » de shadcn), puis le premier code de l'app.
    setupTitle: "Scan to connect your phone",
    setupDescription:
      "Open an authenticator app like Google Authenticator or 1Password, add an account, and scan this QR code. You only need to do this once.",
    qrCode: "QR code to scan with your phone's authenticator app",
    secret: "Can't scan it? Enter this key in your app instead:",
    scanned: "Next",
    firstCodeTitle: "Enter the code from your app",
    firstCodeDescription:
      "Your authenticator app now shows a 6-digit code for this admin.",
    backToQr: "Show QR code again",
    setupFailed: "Setup couldn't start. Reload the page and try again.",
    verifyTitle: "Two-step verification",
    verifyDescription:
      "Enter the 6-digit code shown in your phone's authenticator app.",
    code: "Code from your app",
    invalidCode: "Enter the 6-digit code.",
    wrongCode:
      "Incorrect code. Check your phone's clock, then try again with the next code.",
    submit: "Verify",
    // Sous le bouton « Valider », en une ligne (assez court pour la largeur du formulaire).
    lostPhone: "Lost your phone? Ask an admin for a reset.",
    // Avec l'adresse de contact de la marque, suivie de l'adresse en lien.
    lostPhoneContact: "Lost your phone? Write to",
    // Sous « Se déconnecter », en bas de la carte.
    signOutText: "Return to the sign-in screen.",
  },

  invitation: {
    title: "Join the team",
    description: (brand: string) =>
      `An admin has invited you to join the ${brand} admin. Next, you'll set up two-step verification.`,
    accept: "Accept invitation",
    expired:
      "This link has expired or has already been used. If you've already accepted your invitation, sign in with your email address. Otherwise, ask an admin to resend it.",
    incomplete:
      "This invitation link is incomplete. Open the link from your email, or ask an admin to resend your invitation.",
    toSignIn: "Go to sign-in",
  },

  adminOnly: {
    title: "Admins only",
    description:
      "Only team admins can access this section. Ask an admin if you need access.",
    back: "Back to Dashboard",
  },

  account: {
    profile: {
      title: "Profile",
      description: "Your name is shown to your team.",
      name: "Name",
      namePlaceholder: "First and last name",
      nameTooLong: "The name can't be longer than 100 characters.",
      saved: "Name saved.",
      email: "Email address",
      role: "Role",
      // Lu par les lecteurs d'écran devant le rôle.
      rolePrefix: "Role: ",
    },
    language: {
      title: "Language",
      description:
        "The language of the admin, for you only. It also applies to the emails you receive.",
      label: "Admin language",
      // Le membre suit la langue de toute l'admin (Paramètres › Avancé), entre parenthèses.
      sameAsAdmin: (language: string) => `Same as the admin (${language})`,
      failed: "Your language couldn't be saved. Try again.",
    },
    mfa: {
      title: "Two-step verification",
      description:
        "Each time you sign in, you'll enter a code from your phone's authenticator app.",
      configured: "Set up",
      configuredOn: (date: string) => `Set up on ${date}`,
      lostPhone: {
        title: "Lost your phone?",
        text: "Ask an admin to reset your two-step verification.",
      },
    },
  },

  team: {
    invite: "Invite member",
    inviteDescription:
      "They'll get an email with a link to join the team. The link expires after 10 minutes, but you can resend it.",
    email: "Email address",
    emailPlaceholder: "name@example.com",
    invalidEmail: "Enter a valid email address.",
    name: "Name (optional)",
    namePlaceholder: "First and last name",
    nameTooLong: "The name can't be longer than 100 characters.",
    role: "Role",
    sendInvitation: "Send invitation",
    invited: (email: string) => `Invitation sent to ${email}.`,
    loadFailed: "Couldn't load the team list.",
    refreshFailed: "Couldn't refresh the list. It may be out of date.",
    singleAdmin:
      "You're the only admin with two-step verification set up. Make someone else an admin too, so they can reset yours if you lose your phone.",
    columns: {
      member: "Member",
      role: "Role",
      status: "Status",
      lastSignIn: "Last sign-in",
      mfa: "Two-step verification",
    },
    status: {
      invited: "Invitation sent",
      expired: "Invitation expired",
      // Invitation acceptée, double vérification pas encore configurée.
      mfaPending: "Needs two-step verification",
      active: "Active",
    },
    you: "You",
    noName: "No name",
    never: "Never",
    mfaOn: "Set up",
    mfaOff: "Not set up",
    actions: {
      open: (member: string) => `Actions for ${member}`,
      resend: "Resend invitation",
      makeAdmin: "Make admin",
      makeEditor: "Make editor",
      resetMfa: "Reset two-step verification",
      remove: "Remove from team",
    },
    done: {
      resent: "Invitation resent.",
      role: "Role changed.",
      resetMfa:
        "Two-step verification reset. They'll set it up again next time they sign in.",
      removed: "Member removed from the team.",
    },
    confirmRemove: {
      title: "Remove this member?",
      description: (member: string) =>
        `${member} will lose access to the admin, and their account will be deleted. Their content stays, but anything they scheduled won't be published.`,
      confirm: "Remove",
    },
    confirmResetMfa: {
      title: "Reset two-step verification?",
      description: (member: string) =>
        `${member} will be signed out and will need to set up two-step verification again with their phone.`,
      confirm: "Reset",
    },
    // Erreurs renvoyées par la fonction serveur « equipe », selon leur code.
    errors: {
      non_connecte: "You've been signed out. Sign in again to continue.",
      reserve_aux_admins: "Only admins can do this.",
      soi_meme: "You can't do this to your own account. Ask another admin.",
      demande_invalide: "This request isn't valid. Check what you entered.",
      introuvable: "This member is no longer on the team. Reload the list.",
      deja_membre: "This email address is already on the team.",
      deja_acceptee: "This person has already accepted their invitation.",
      dernier_admin:
        "The team needs at least one admin who has accepted their invitation and set up two-step verification. Make someone else an admin first.",
      trop_de_demandes: "Too many emails sent. Try again in a minute.",
    },
  },

  media: {
    upload: "Upload files",
    uploadInput: "Files to upload",
    dropTitle: "Drop files to upload",
    dropHint:
      "Images, SVGs, Lottie animations (.json), audio (MP3, M4A), and PDFs. Maximum file size: 50 MB (5 MB for SVGs and Lottie animations).",
    search: "Search files",
    searchPlaceholder: "Search by name…",
    filters: {
      label: "File type",
      all: "All",
      image: "Images",
      svg: "SVG",
      lottie: "Animations",
      audio: "Audio",
      pdf: "PDF",
      // Ni dans un brouillon ni dans une version en ligne : la règle de la corbeille.
      unused: "Unused",
    },
    // Pastille d'un fichier qui ne sert dans aucun contenu, ou qui sert.
    unused: "Unused",
    used: "In use",
    kinds: {
      image: "Image",
      svg: "SVG",
      lottie: "Animation",
      audio: "Audio",
      pdf: "PDF",
    },
    view: {
      label: "View",
      grid: "Grid",
      list: "List",
    },
    status: {
      pending: "Uploading…",
      interrupted: "Upload interrupted",
      checking: "Checking…",
      ready: "Ready",
    },
    rejectedBecause: (reason: string) => `Rejected: ${reason}`,
    // Unités (web/src/lib/media/format.ts) : « 812 octets », « 3 min 05 s », « 1200 × 800 px ».
    units: {
      bytes: (value: string) => `${value} bytes`,
      kilobytes: (value: string) => `${value} KB`,
      megabytes: (value: string) => `${value} MB`,
      gigabytes: (value: string) => `${value} GB`,
      hoursMinutes: (hours: number, minutes: string) =>
        `${hours} hr ${minutes} min`,
      minutesSeconds: (minutes: number, seconds: string) =>
        `${minutes} min ${seconds} sec`,
      seconds: (seconds: number) => `${seconds} sec`,
      dimensions: (width: number, height: number) => `${width} × ${height} px`,
      percent: (value: number) => `${value}%`,
    },
    // Codes de media.reject_reason (fonction « files » et media_confirm).
    rejectReasons: {
      fichier_incoherent:
        "the uploaded file doesn't match what was expected. Upload it again.",
      fichier_trop_lourd: "the file is too large to be checked (5 MB max).",
      verification_impossible:
        "it couldn't be checked after three tries. Upload it again.",
      svg_illisible: "this SVG can't be read.",
      svg_element_interdit:
        "this SVG contains an element that isn't allowed (script, animation, link…).",
      svg_attribut_interdit:
        "this SVG contains an attribute that isn't allowed (hidden code, unsafe style…).",
      svg_lien_externe: "this SVG loads an external image, font, or style.",
      lottie_illisible: "this animation file can't be read (invalid JSON).",
      lottie_invalide: "this isn't a valid Lottie animation.",
      lottie_lien_externe: "this animation loads an external image or font.",
      inconnue: "the file wasn't accepted.",
    },
    rejectedCleanup:
      "It will be removed from the Media library automatically within 24 hours.",
    columns: {
      preview: "Preview",
      name: "Name",
      kind: "Type",
      size: "Size",
      createdAt: "Added",
      status: "Status",
    },
    open: (name: string) => `Open file details for “${name}”`,
    // Sélection en masse (cases des vignettes et de la liste).
    selection: {
      trashed: (count: number) =>
        count === 1
          ? "1 file moved to the Trash."
          : `${count} files moved to the Trash.`,
      restored: (count: number) =>
        count === 1 ? "1 file restored." : `${count} files restored.`,
      keptTitle: (count: number) =>
        count === 1
          ? "1 file wasn't moved: it's still in use"
          : `${count} files weren't moved: they're still in use`,
      keptHint: (count: number) =>
        count === 1
          ? "Remove it from your content first. Content in the Trash still counts until it's permanently deleted. It stays selected."
          : "Remove them from your content first. Content in the Trash still counts until it's permanently deleted. They stay selected.",
    },
    empty: {
      title: "No files yet",
      description:
        "Upload images, audio, animations, or PDFs to use in your content.",
    },
    noResults: {
      title: "No files found",
      description: "Try a different name or type.",
    },
    noUnused: {
      title: "All files are in use",
      description: "Every file is used in a draft or in published content.",
    },
    tooMany: (count: number) =>
      `Showing the ${count} most recent files. Refine your search to see the rest.`,
    loadFailed: "Couldn't load the Media library.",
    refreshFailed:
      "Couldn't refresh the Media library. It may be slightly out of date.",
    storage: {
      label: "Storage used",
      value: (used: string, total: string) => `${used} of ${total}`,
      alertTitle: "Storage almost full",
      alert: (used: string) =>
        `You're using ${used} of 1 GB. When storage is full, you can't upload new files. Move files you no longer need to the Trash, then empty it.`,
    },
    orphans: {
      title: (count: number) =>
        count === 1
          ? "1 leftover file in storage"
          : `${count} leftover files in storage`,
      description: (date: string) =>
        `Found during the check on ${date}. They're left over from interrupted uploads and take up space without appearing in the Media library.`,
      show: "Show list",
      hide: "Hide list",
      more: (count: number) => `… and ${count} more`,
      clean: "Clean up",
      cleaned: (count: number) =>
        count === 0
          ? "Nothing to delete: these files are less than 24 hours old or are back in the Media library."
          : count === 1
            ? "1 file deleted from storage."
            : `${count} files deleted from storage.`,
    },
    uploads: {
      // Nom de la fenêtre des envois (en bas à droite) pour les lecteurs d'écran.
      title: "Uploads",
      summary: {
        active: (count: number) =>
          count === 1 ? "1 upload in progress" : `${count} uploads in progress`,
        failed: (count: number) =>
          count === 1 ? "1 upload failed" : `${count} uploads failed`,
        ready: (count: number) =>
          count === 1 ? "1 file ready" : `${count} files ready`,
        cancelled: "Uploads canceled",
      },
      collapse: "Collapse the uploads panel",
      expand: "Expand the uploads panel",
      close: "Close the uploads panel",
      cancel: (name: string) => `Cancel upload of ${name}`,
      retry: (name: string) => `Retry upload of ${name}`,
      dismiss: (name: string) => `Remove ${name} from the list`,
      stages: {
        waiting: "Waiting",
        preparing: "Preparing…",
        sending: "Uploading…",
        confirming: "Saving…",
        done: "Ready",
        error: "Failed",
        cancelled: "Canceled",
      },
      checking: "Uploaded, checking…",
      checked: "Checked and ready",
      announcerLabel: "Upload progress",
      // Annonces lues par les lecteurs d'écran (une par étape, pas à chaque pourcentage).
      announce: {
        sending: (name: string) => `Uploading ${name}…`,
        checking: (name: string) => `${name} uploaded. Checking it now.`,
        ready: (name: string) => `${name} uploaded and ready.`,
        rejected: (name: string, reason: string) =>
          `${name} was rejected: ${reason}`,
        failed: (name: string, error: string) =>
          `Upload of ${name} failed. ${error}`,
        cancelled: (name: string) => `Upload of ${name} canceled.`,
      },
      resumable: "Resumable upload",
      gifWarning:
        "Animated GIF: only the first frame is kept. For an animation, use a Lottie file.",
      leaveWarning: "Some files are still uploading.",
    },
    // Refus avant l'envoi (préparation dans le navigateur).
    prepareErrors: {
      type_refuse:
        "This file type isn't supported. Upload an image (JPEG, PNG, WebP, GIF, HEIC, AVIF), an SVG, a Lottie animation (.json), an audio file (MP3, M4A), or a PDF.",
      video_refusee:
        "Videos aren't supported. For audio, upload an MP3 or M4A.",
      fichier_vide: "This file is empty.",
      fichier_trop_lourd: "File too large: 50 MB max.",
      fichier_a_verifier_trop_lourd:
        "File too large: 5 MB max for an SVG or Lottie animation.",
      image_illisible:
        "Your browser can't read this image. Save it as JPEG or PNG, then upload it again.",
      heic_illisible:
        "Your browser can't read HEIC photos (from iPhone). Upload this one from Safari, or save it as JPEG and upload it again.",
      svg_illisible:
        "This SVG can't be read, or it contains code blocked for security reasons.",
      svg_element_interdit:
        "This SVG contains an unsafe element that can't be removed without breaking the image.",
      svg_attribut_interdit:
        "This SVG contains an unsafe attribute that can't be removed without breaking the image.",
      svg_lien_externe:
        "This SVG loads an external image, font, or style that can't be removed.",
      lottie_illisible: "This .json file can't be read: it isn't valid JSON.",
      lottie_invalide:
        "This .json file isn't a valid Lottie animation (layers, size, frame rate…).",
      lottie_lien_externe:
        "This animation loads an external image or font. Export it with embedded images.",
    },
    transferErrors: {
      annule: "Upload canceled.",
      envoi_interrompu:
        "The upload was interrupted. Check your connection, then try again.",
      fichier_trop_lourd: "File too large: 50 MB max.",
      type_refuse: "Storage doesn't accept this file type.",
      envoi_refuse: "Storage refused the upload. Try again in a moment.",
      deja_envoye: "This file has already been uploaded.",
    },
    // « Remplacer… » dans la fiche d'un fichier ([D48]) : un nouveau fichier du même type.
    replace: {
      title: "Replace this file",
      description:
        "Upload a new file of the same type. Once it's ready, it replaces this one in every draft, except drafts being edited right now and content in the Trash. Published content stays as is until you update it.",
      action: "Replace…",
      input: "New file",
      uploading: "Uploading the new file…",
      checking: "Checking the new file…",
      replacing: "Replacing in drafts…",
      replaced: (count: number) =>
        count === 0
          ? "No drafts were changed."
          : count === 1
            ? "Replaced in 1 draft."
            : `Replaced in ${count} drafts.`,
      kept: (count: number) =>
        count === 1
          ? "1 draft wasn't changed: someone is editing it right now."
          : `${count} drafts weren't changed: someone is editing them right now.`,
      keptItem: (title: string, holder: string) =>
        `“${title || "Untitled"}” (${holder})`,
      retryKept: "Retry for these drafts",
      live: (count: number) =>
        count === 1
          ? "1 published item still shows the old file."
          : `${count} published items still show the old file.`,
      push: (count: number) =>
        count === 1
          ? "Update this item in the app"
          : `Update these ${count} items in the app`,
      pushed: (count: number) =>
        count === 1
          ? "1 item updated in the app."
          : `${count} items updated in the app.`,
      oldTrashed:
        "Nothing uses the old file anymore, so it's been moved to the Trash.",
      openNew: "Open the new file",
      rejected: (reason: string) => `The new file was rejected: ${reason}`,
      failed: "The new file couldn't be uploaded.",
    },
    detail: {
      noPreview: "No preview available.",
      openFile: "Open file",
      lottieFailed: "Couldn't load the animation preview.",
      name: "Name",
      nameRequired: "Give the file a name.",
      nameTooLong: "The name can't be longer than 255 characters.",
      alt: "Alt text",
      altHint:
        "Describe the image in one sentence for people who can't see it. Leave it blank if it's purely decorative.",
      altTooLong: "Alt text can't be longer than 1,000 characters.",
      transcript: "Transcript",
      transcriptHint:
        "A text version of the audio for people who can't listen to it.",
      transcriptTooLong:
        "The transcript can't be longer than 200,000 characters.",
      saved: "File details saved.",
      // La carte du nom et du texte alternatif (ou de la transcription).
      description: "Description",
      info: "Info",
      kind: "Type",
      dimensions: "Dimensions",
      duration: "Duration",
      size: "Size",
      createdAt: "Added",
      visibility: "Access",
      public: "Public",
      publicHint: "Used in free published content, or as a featured image.",
      protected: "Protected",
      uses: "Used in",
      usesCount: (count: number) => (count === 1 ? "1 item" : `${count} items`),
      usesLoading: "Checking where it's used…",
      notUsed:
        "This file isn't used in any content yet. You can add it from the editor.",
      usesFailed: "Couldn't load where this file is used.",
      inDraft: "In draft",
      inApp: "In the app",
      usesLive: "Published in the app",
      usesDrafts: "In drafts",
      usesLiveHint:
        "The app shows the published version. Changes to this file's alt text or transcript appear there only after you publish again or update the item in the app.",
      // Textes figés à la publication ([D30], option B).
      outdated: {
        title: (count: number) =>
          count === 1
            ? "1 published item still shows the old text"
            : `${count} published items still show the old text`,
        description:
          "The alt text or transcript changed after they were published. Updating changes only this file's text in the app. Other changes in their drafts stay unpublished.",
        version: (number: number, date: string) =>
          `version ${number}, published ${date}`,
        push: (count: number) =>
          count === 1
            ? "Update this item in the app"
            : `Update these ${count} items in the app`,
        pushed: (count: number) =>
          count === 0
            ? "Nothing to update: the app already shows the latest text."
            : count === 1
              ? "1 item updated in the app."
              : `${count} items updated in the app.`,
        failed: "Couldn't load the items to update in the app.",
      },
      trash: "Move to Trash",
      trashed: "File moved to the Trash.",
      undo: "Undo",
      restored: "File restored.",
      used: "This file is still in use. Remove it from your content first. Content in the Trash still counts until it's permanently deleted.",
    },
    // Erreurs de la base (RPC) et de la fonction « files », selon leur code.
    errors: {
      reserve_a_l_equipe:
        "You no longer have access to the Media library. Sign in again.",
      non_connecte: "You've been signed out. Sign in again to continue.",
      type_refuse: "This file type isn't supported.",
      nom_invalide: "The file name must be between 1 and 255 characters.",
      fichier_vide: "This file is empty.",
      fichier_trop_lourd:
        "File too large: 50 MB max, or 5 MB for an SVG or Lottie animation.",
      fichier_invalide: "The file information isn't valid.",
      fichier_introuvable:
        "This file no longer exists or is in the Trash. Reload the page.",
      fichier_absent: "The file didn't reach storage. Try again in a moment.",
      envoi_expire: "This upload has expired. Upload the file again.",
      fichier_utilise:
        "This file is still in use. Remove it from your content first. Content in the Trash still counts until it's permanently deleted.",
      fichier_pas_pret:
        "The new file isn't ready yet. Wait until it's been checked.",
      type_different: "The new file must be the same type as the old one.",
      effacement_demande:
        "This file is being permanently deleted and can no longer be restored.",
      demande_invalide: "This request isn't valid. Reload the page.",
      reserve_aux_admins: "Only admins can do this.",
      methode_refusee: "This request isn't valid. Reload the page.",
      trop_tot: "Too many requests. Try again in a minute.",
      erreur_serveur:
        "The server couldn't complete the request. Try again in a moment.",
    },
  },

  trash: {
    filters: {
      // Les sections d'où viennent les éléments, avec leurs noms du menu.
      label: "Item type",
      all: "All",
      file: "Media library",
      page: "Pages",
      article: "Blog",
      episode: "Podcasts",
      template: "Block templates",
    },
    itemTypes: {
      file: "File",
      content: "Content",
    },
    // Sorte d'un contenu dans la corbeille.
    contentKinds: {
      article: "Post",
      episode: "Episode",
      page: "Page",
      template: "Block template",
    },
    // Ce qui est parti avec un élément (même lot) : restauré ou effacé avec lui.
    batch: (count: number) =>
      count === 1 ? "with 1 other item" : `with ${count} other items`,
    batchList: (names: string) => `Moved to the Trash together: ${names}.`,
    eraseSelection: (count: number) => `Delete permanently (${count})`,
    confirmSelection: {
      title: (count: number) =>
        count === 1
          ? "Delete this item permanently?"
          : "Delete these items permanently?",
      description: (count: number) =>
        count === 1
          ? "The selected item will be permanently deleted. This can't be undone."
          : `The ${count} selected items will be permanently deleted. This can't be undone.`,
      confirm: "Delete permanently",
    },
    // Seules les pages ont une adresse.
    restoredWithoutAddress: (name: string) =>
      `“${name}” was restored without its URL because another page now uses it. Choose a new URL before you publish it.`,
    restoredDraft: "Restored as a draft. Nothing is put back in the app.",
    open: "Open",
    columns: {
      name: "Name",
      type: "Type",
      deletedAt: "Moved to Trash",
      purgeAt: "Auto-delete",
    },
    deletedBy: (name: string) => `by ${name}`,
    purgeOn: (date: string) => `after ${date}`,
    purgeRefused: "Can't delete: still in use",
    purgeRefusedHint:
      "This file has since been added to content. Restore it, or remove it from that content before you delete it permanently.",
    restore: "Restore",
    restoreItem: (name: string) => `Restore ${name}`,
    // Sans accord : l'élément peut être un fichier, une page, un article…
    restored: (name: string) => `“${name}” restored.`,
    eraseItem: (name: string) => `Delete ${name} permanently`,
    erase: "Delete permanently",
    empty: "Empty Trash",
    emptied: (count: number) =>
      count === 0
        ? "The Trash was already empty."
        : count === 1
          ? "Deleting 1 item…"
          : `Deleting ${count} items…`,
    confirmEmpty: {
      title: "Empty Trash?",
      description: (count: number) =>
        `${count === 1 ? "The item in the Trash" : `All ${count} items in the Trash`} will be permanently deleted. This can't be undone.`,
      confirm: "Empty Trash",
    },
    confirmErase: {
      title: "Delete permanently?",
      description: (name: string) =>
        `“${name}” will be permanently deleted. This can't be undone.`,
      confirm: "Delete permanently",
    },
    emptyState: {
      title: "The Trash is empty",
      description:
        "Anything you move to the Trash shows up here. You can restore it for 30 days.",
    },
    emptyFilter: "No items of this type in the Trash.",
    loadFailed: "Couldn't load the Trash.",
    refreshFailed:
      "Couldn't refresh the Trash. It may be slightly out of date.",
  },

  // Listes des contenus d'une section (Pages, Blog, Podcasts) : étape 7.
  contentList: {
    // Ce qui dépend de la sorte de contenu (genre, nombre).
    kinds: {
      page: {
        submit: "Create page",
        create: "New page",
        createFailed: "Couldn't create the page.",
        // « Nouvelle page » quand des points de départ existent pour les Pages ([D42]).
        blank: "Blank page",
        confirmTrashTitle: "Move this page to Trash?",
        confirmTrash: (title: string) =>
          `“${title}” will be moved to the Trash. If it's published, it'll also be removed from the app, and any scheduled publishing will be canceled. You can restore it as a draft for 30 days.`,
        restored: (title: string) => `“${title}” was restored as a draft.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Move 1 page to Trash?"
            : `Move ${count} pages to Trash?`,
        confirmTrashMany:
          "They'll be moved to the Trash. Any that are published will also be removed from the app, and any scheduled publishing will be canceled. You can restore them as drafts for 30 days.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 page moved to the Trash."
            : `${count} pages moved to the Trash.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 page restored as a draft."
            : `${count} pages restored as drafts.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 page wasn't moved" : `${count} pages weren't moved`,
        keptHint: (count: number) =>
          count === 1 ? "It stays selected." : "They stay selected.",
        emptyTitle: "No pages yet",
        emptyDescription:
          "Create your first page. It opens in the editor, and your changes are saved automatically.",
        search: "Search pages",
        noResults: "No pages match your search or filters.",
      },
      article: {
        submit: "Create post",
        create: "New post",
        createFailed: "Couldn't create the post.",
        blank: "Blank post",
        confirmTrashTitle: "Move this post to Trash?",
        confirmTrash: (title: string) =>
          `“${title}” will be moved to the Trash. If it's published, it'll also be removed from the app, and any scheduled publishing will be canceled. You can restore it as a draft for 30 days.`,
        restored: (title: string) => `“${title}” was restored as a draft.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Move 1 post to Trash?"
            : `Move ${count} posts to Trash?`,
        confirmTrashMany:
          "They'll be moved to the Trash. Any that are published will also be removed from the app, and any scheduled publishing will be canceled. You can restore them as drafts for 30 days.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 post moved to the Trash."
            : `${count} posts moved to the Trash.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 post restored as a draft."
            : `${count} posts restored as drafts.`,
        keptTitle: (count: number) =>
          count === 1 ? "1 post wasn't moved" : `${count} posts weren't moved`,
        keptHint: (count: number) =>
          count === 1 ? "It stays selected." : "They stay selected.",
        emptyTitle: "No posts yet",
        emptyDescription:
          "Create your first post. It opens in the editor, and your changes are saved automatically.",
        search: "Search posts",
        noResults: "No posts match your search or filters.",
      },
      episode: {
        submit: "Create episode",
        create: "New episode",
        createFailed: "Couldn't create the episode.",
        blank: "Blank episode",
        confirmTrashTitle: "Move this episode to Trash?",
        confirmTrash: (title: string) =>
          `“${title}” will be moved to the Trash. If it's published, it'll also be removed from the app, and any scheduled publishing will be canceled. You can restore it as a draft for 30 days.`,
        restored: (title: string) => `“${title}” was restored as a draft.`,
        // Sélection en masse.
        confirmTrashManyTitle: (count: number) =>
          count === 1
            ? "Move 1 episode to Trash?"
            : `Move ${count} episodes to Trash?`,
        confirmTrashMany:
          "They'll be moved to the Trash. Any that are published will also be removed from the app, and any scheduled publishing will be canceled. You can restore them as drafts for 30 days.",
        trashedMany: (count: number) =>
          count === 1
            ? "1 episode moved to the Trash."
            : `${count} episodes moved to the Trash.`,
        restoredMany: (count: number) =>
          count === 1
            ? "1 episode restored as a draft."
            : `${count} episodes restored as drafts.`,
        keptTitle: (count: number) =>
          count === 1
            ? "1 episode wasn't moved"
            : `${count} episodes weren't moved`,
        keptHint: (count: number) =>
          count === 1 ? "It stays selected." : "They stay selected.",
        emptyTitle: "No episodes yet",
        emptyDescription:
          "Create your first episode. It opens in the editor, where you can add its featured image and audio.",
        search: "Search episodes",
        noResults: "No episodes match your search or filters.",
      },
    },
    columns: {
      cover: "Featured image",
      title: "Title",
      publication: "Status",
      categories: "Categories",
      savedAt: "Last saved",
    },
    searchPlaceholder: "Search by title…",
    filters: {
      state: "Status",
      category: "Category",
      states: {
        all: "All statuses",
        draft: "Drafts",
        live: "Published",
        modified: "Changed since publishing",
        withdrawn: "Unpublished",
        scheduled: "Scheduled",
        failed: "Scheduled publishing failed",
      },
      allCategories: "All categories",
      noCategory: "Uncategorized",
      reset: "Clear filters",
    },
    count: (shown: number, total: number) =>
      shown === total
        ? total === 1
          ? "1 item"
          : `${total} items`
        : `${shown} of ${total}`,
    noCategory: "Uncategorized",
    manageCategories: "Categories",
    actions: (title: string) => `Actions for ${title}`,
    open: "Open",
    trash: "Move to Trash",
    confirmTrash: {
      confirm: "Move to Trash",
    },
    trashed: (title: string) => `“${title}” moved to the Trash.`,
    undo: "Undo",
    // Fenêtre « Nouvel article » (…) : le titre, un point de départ, les réglages ([D42]).
    newContent: {
      description:
        "A title is all you need to start. You can change everything else in the editor.",
      // Un article : ses réglages sont dans la colonne « Article » de l'éditeur.
      articleDescription:
        "A title is all you need to start. You can change everything else in the editor, in the “Post” column.",
      starter: "Starter",
      // Une page : l'adresse vient du titre ; déjà prise, la création est bloquée.
      address: (slug: string) => `Page URL: ${slug}`,
      addressTaken: (title: string) =>
        `The page “${title || "Untitled"}” already uses this URL. Try a different title.`,
      addressEmpty:
        "This title doesn't make a valid URL. Add some letters or numbers.",
      starterHint: "Start from a ready-made structure instead of a blank one.",
      settingsFailed: (message: string) =>
        `Your content was created, but its settings weren't saved: ${message} You can fix them in the editor.`,
    },
    // Ordre des listes (Le Fil, Radio Éclaircies, [D47]) : glisser-déposer.
    order: {
      column: "Order",
      handle: (title: string) => `Move “${title}”`,
      filtering: "Clear the search and filters to reorder the list.",
      saved: "New order saved.",
      failed: "Couldn't save the new order. The list is back to how it was.",
      dnd: {
        roleDescription: "draggable item",
        instructions:
          "To move an item, press Space or Enter on its drag handle. Use the arrow keys to move it, then press Space or Enter again to drop it, or Escape to cancel.",
        start: (title: string) => `Picked up “${title}”.`,
        over: (title: string, position: number, count: number) =>
          `“${title}” is in position ${position} of ${count}.`,
        end: (title: string, position: number, count: number) =>
          `Dropped “${title}” in position ${position} of ${count}.`,
        cancel: (title: string) =>
          `Move canceled. “${title}” is back in its place.`,
      },
    },
    // « Réglages » dans le menu d'une ligne : les mêmes réglages que dans l'éditeur.
    settings: {
      action: "Settings",
      save: "Save",
      saved: (title: string) => `Settings saved for “${title}”.`,
      unchanged: "No changes to save.",
      checking: "Checking if someone is editing…",
      heldBy: (name: string) =>
        `${name} is editing this right now. Wait until they're done, or open it to take over.`,
      heldSelf:
        "You're editing this in another tab. Change its settings there.",
      yourselfElsewhere: "You (in another tab)",
    },
    // Colonne Catégories : la première, puis « +2 » pour les autres.
    moreCategories: (count: number) => `+${count}`,
    otherCategories: (names: string) => `Also: ${names}`,
    loadFailed: "Couldn't load the list.",
    refreshFailed: "Couldn't refresh the list. It may be slightly out of date.",
  },

  // Catégories du Blog et des Podcasts (étape 7) : ADMIN § 3, [D28], [D44].
  categories: {
    title: (section: string) => `Categories: ${section}`,
    description: {
      blog: "Readers use them to filter posts in the app. A post can have one, several, or none.",
      podcasts:
        "Readers use them to filter episodes in the app. An episode can have one, several, or none.",
    },
    back: (section: string) => `Back to ${section}`,
    orderTitle: "Order in the app",
    order:
      "The app shows them in this order. Drag the handles to reorder them, or use your keyboard.",
    listLabel: (section: string) => `Categories: ${section}, in app order`,
    empty:
      "No categories yet. They're optional. Add some to let readers filter in the app.",
    name: "New category name",
    namePlaceholder: "e.g. Sleep",
    addTitle: "Add a category",
    addDescription:
      "It's added to the bottom of the list. Then drag it into place.",
    nameRequired: "Give the category a name.",
    nameTooLong: "The name can't be longer than 100 characters.",
    add: "Add",
    added: (name: string) => `Category “${name}” added.`,
    rename: "Rename",
    renameLabel: (name: string) => `New name for ${name}`,
    renamed: "Category renamed.",
    remove: "Delete permanently",
    actions: (name: string) => `Actions for ${name}`,
    // Pastille de chaque catégorie : le nombre de brouillons qui la citent, dans l'infobulle.
    uses: (count: number) =>
      count === 0
        ? "Not used in any draft"
        : count === 1
          ? "Used in 1 draft"
          : `Used in ${count} drafts`,
    confirmRemove: {
      title: "Delete this category?",
      description: (name: string) =>
        `“${name}” will be permanently deleted. Categories don't go to the Trash, so you won't be able to restore it.`,
      uses: (count: number) =>
        count === 1
          ? "It'll be removed from 1 draft, and from the filters in the app right away, even for published content."
          : count > 1
            ? `It'll be removed from ${count} drafts, and from the filters in the app right away, even for published content.`
            : "It'll be removed from the filters in the app right away, even for published content.",
      confirm: "Delete permanently",
    },
    removed: (name: string) => `Category “${name}” deleted.`,
    handle: (name: string) => `Move “${name}”`,
    reordered: "New order saved.",
    // Glisser-déposer : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "draggable category",
      instructions:
        "To move a category, press Space or Enter on its drag handle. Use the arrow keys to move it, then press Space or Enter again to drop it, or Escape to cancel.",
      start: (name: string) => `Picked up “${name}”.`,
      over: (name: string, position: number, count: number) =>
        `“${name}” is in position ${position} of ${count}.`,
      end: (name: string, position: number, count: number) =>
        `Dropped “${name}” in position ${position} of ${count}.`,
      cancel: (name: string) =>
        `Move canceled. “${name}” is back in its place.`,
    },
    loadFailed: "Couldn't load the categories.",
    errors: {
      nom_en_double: "This section already has a category with this name.",
      nom_invalide: "Names must be 1 to 100 characters.",
      introuvable: "This category no longer exists. Reload the page.",
      demande_invalide:
        "The list changed in the meantime. Reload the page and try again.",
      categorie_invalide: "A category can't move to another section.",
      reserve_a_l_equipe:
        "You no longer have access to categories. Sign in again.",
    },
  },

  // Modèles de blocs (étape 6) : page Modèles, éditeur d'un modèle, insertion dans un contenu,
  // « Enregistrer comme modèle ». docs/ADMINISTRATION.md, § 5.
  templates: {
    sorts: {
      style: {
        title: "Preset",
        tab: "Presets",
        description:
          "Insert a pre-styled copy, then write your own text in it. Editing the template doesn't change content you've already written.",
        example: "Example: a “Key takeaways” box.",
      },
      shared: {
        title: "Synced block",
        tab: "Synced blocks",
        description:
          "The same block, with the same text, in several places. Edit it once in the template, and every draft that uses it updates.",
        example:
          "Example: a “Contact” box. A synced block holds a single block. To group several, put them in a box.",
      },
      starter: {
        title: "Starter",
        tab: "Starters",
        description:
          "New content starts with a ready-made structure instead of a blank page.",
        example: "Example: “Interview”.",
      },
    },
    // La section d'un point de départ ([D42]) : la sorte de contenu qu'il sert à créer.
    sections: {
      article: "Blog posts",
      episode: "Podcast episodes",
      chapter: "Method chapters",
      lesson: "Method lessons",
      exercise: "Method exercises",
      page: "Pages",
    },
    list: {
      create: "New template",
      columns: {
        name: "Name",
        type: "Type",
        savedAt: "Last saved",
      },
      // Les onglets : « Tous les modèles », puis un par sorte (texts.templates.sorts.*.tab).
      tabs: {
        label: "Template types",
        all: "All templates",
      },
      untitled: "Unnamed",
      empty: {
        title: "No templates yet",
        description:
          "Create one here, or from any post, episode, or page: select blocks in the Outline, then choose “Save as template”.",
      },
      emptySort: "No templates of this type yet",
      usesLoading: "Checking which drafts use it…",
      actions: (name: string) => `Actions for ${name}`,
      open: "Open",
      trash: "Move to Trash",
      loadFailed: "Couldn't load the templates.",
      refreshFailed:
        "Couldn't refresh the list. It may be slightly out of date.",
      createFailed: "Couldn't create the template.",
      confirmTrash: {
        title: "Move this template to Trash?",
        description: (name: string) =>
          `“${name}” will be moved to the Trash. You can restore it for 30 days. Content you inserted it into keeps its copy.`,
        confirm: "Move to Trash",
      },
      trashed: (name: string) => `“${name}” moved to the Trash.`,
      undo: "Undo",
      restored: (name: string) => `“${name}” restored.`,
      // Sélection en masse.
      confirmTrashManyTitle: (count: number) =>
        count === 1
          ? "Move 1 template to Trash?"
          : `Move ${count} templates to Trash?`,
      confirmTrashMany:
        "They'll be moved to the Trash. You can restore them for 30 days. Content you inserted them into keeps its copy. Synced blocks still in use won't be moved.",
      trashedMany: (count: number) =>
        count === 1
          ? "1 template moved to the Trash."
          : `${count} templates moved to the Trash.`,
      restoredMany: (count: number) =>
        count === 1 ? "1 template restored." : `${count} templates restored.`,
      keptTitle: (count: number) =>
        count === 1
          ? "1 template wasn't moved"
          : `${count} templates weren't moved`,
      keptHint: (count: number) =>
        `For a synced block that's still in use, “Move to Trash” offers “Detach everywhere”. ${count === 1 ? "It stays selected." : "They stay selected."}`,
      // Un bloc partagé utilisé ne se supprime pas (ADMIN § 5).
      used: {
        title: "This template is still in use",
        description:
          "A synced block can't be moved to the Trash while a draft uses it. “Detach everywhere” turns it into a regular copy in each of those drafts, even ones in the Trash, and those copies stop syncing with the template. Published content in the app isn't affected.",
        list: "Drafts using it",
        inTrash: "in the Trash",
        detachAll: "Detach everywhere",
        detached: (count: number) =>
          count === 1
            ? "Detached in 1 draft. You can now move the template to the Trash."
            : `Detached in ${count} drafts. You can now move the template to the Trash.`,
        checkFailed: "Couldn't check which drafts use this template.",
      },
    },
    create: {
      title: "New template",
      description:
        "Choose a type for the template. It can't be changed later. You'll add its blocks in the editor next.",
      name: "Name",
      namePlaceholder: "e.g. Contact",
      nameRequired: "Give the template a name.",
      nameTooLong: "The name can't be longer than 200 characters.",
      sort: "Type",
      section: "Section",
      sectionPlaceholder: "Choose a section",
      sectionHint:
        "This starter is only offered in the section you choose. For example, “New page” only offers page starters.",
      sectionRequired: "Choose a section for the starter.",
      submit: "Create template",
    },
    // Éditeur d'un modèle (le même éditeur plein écran, sans publication).
    editor: {
      nameLabel: "Template name",
      namePlaceholder: "Template name",
      // La carte « Sorte » de la colonne de droite (éditeur du Fil) : un point de départ dit pour
      // quelle section il sert.
      starterFor: (section: string) => `Starter for ${section}`,
      sharedLimit:
        "A synced block holds a single block. To group several, put them in a box.",
      usedIn: (count: number) =>
        count === 0
          ? "Not used in any draft"
          : count === 1
            ? "Used in 1 draft"
            : `Used in ${count} drafts`,
      usesTitle: "Used in",
      usesNone:
        "Add it to a post, episode, or page from “My blocks” in the Blocks panel.",
      usesFailed: "Couldn't load the drafts that use it.",
      inTrash: "in the Trash",
      keepBlock:
        "This template is in use, so its block can't be deleted. To delete the block, first detach the template everywhere: on the Block templates page, choose “Move to Trash” for this template, then “Detach everywhere”.",
      outdated: {
        push: (count: number) =>
          count === 1
            ? "Update this item in the app"
            : `Update these ${count} items in the app`,
        title: (count: number) =>
          count === 1
            ? "Update this item in the app?"
            : `Update these ${count} items in the app?`,
        description: (count: number) =>
          count === 1
            ? "This item is published with an older version of this block. Only this block will be replaced in the app; other changes to its draft won't be published. Nothing changes in the app until you click “Update”."
            : "These items are published with an older version of this block. Only this block will be replaced in the app; other changes to their drafts won't be published. Nothing changes in the app until you click “Update”.",
        version: (number: number, date: string) =>
          `version ${number}, published ${date}`,
        confirm: "Update",
        pushed: (count: number) =>
          count === 0
            ? "Nothing to update: the app already has this block."
            : count === 1
              ? "1 item updated in the app."
              : `${count} items updated in the app.`,
        failed: "Couldn't load the items to update in the app.",
      },
    },
    // Un bloc lié (bloc partagé) dans l'éditeur d'un contenu.
    linked: {
      loading: "Loading template…",
      loadFailed: "Couldn't load the template.",
      missing:
        "This template no longer exists or is in the Trash. Delete this block, or restore the template.",
      empty: "This template is empty.",
      editLabel: (name: string) => `Edit template “${name}”`,
      detachLabel: (name: string) => `Detach from template “${name}”`,
      detached: (name: string) =>
        `Block detached from “${name}”. It's now a regular copy you can edit here.`,
      // Les réglages d'un bloc partagé (glissière du bloc) : deux points courts.
      settings: (name: string) =>
        `This block is synced with the template “${name}”. Edit the template to update it in every draft that uses it.`,
      detachHint:
        "Detaching turns it into a regular copy you can edit here, no longer synced with the template. Other content stays synced.",
    },
    // « Mes blocs », dans les Blocs de l'éditeur.
    insert: {
      emptyTemplate: "Empty. Add blocks to it in Block templates.",
      loadFailed: "Couldn't load the templates.",
    },
    // « Enregistrer comme modèle » : une sélection de blocs (plan, ou bloc choisi).
    saveAs: {
      action: "Save as template…",
      select: "Select blocks",
      stopSelecting: "Cancel selection",
      selectHint:
        "Check the blocks to save as a template, then choose “Save as template”.",
      selectBlock: (label: string) => `Select ${label}`,
      withCount: (count: number) => `Save as template (${count})`,
      title: "Save as template",
      description: (count: number) =>
        count === 1
          ? "The selected block becomes a new template."
          : `The ${count} selected blocks become a new template, in their current order.`,
      sharedOne:
        "For a synced block, select only one block (a box can group several).",
      sharedReplaced:
        "This block is now synced with the template: edits there will show up here too.",
      submit: "Save template",
      saved: (name: string) => `Template “${name}” saved.`,
      open: "Open",
    },
  },

  // Éditeur de blocs (plein écran) : docs/ARCHITECTURE-CONTENUS.md, § 2.7 et § 3.3.
  editor: {
    back: (section: string) => `Back to ${section}`,
    loading: "Opening draft…",
    notFound: {
      title: "Content not found",
      description:
        "This content no longer exists or is in the Trash. Go back to the list.",
    },
    title: {
      label: "Title",
      placeholder: "Title",
    },
    blocks: {
      text: "Text",
      image: "Image",
      box: "Box",
    },
    // Nom d'un bloc dans le plan, les annonces et les boutons.
    blockLabel: {
      text: (excerpt: string) => (excerpt ? `Text “${excerpt}”` : "Empty text"),
      image: "Image",
      // Une section : son aspect, comme dans le plan (« Section avec fond »), et ses blocs.
      box: (look: string, count: number) =>
        count === 0
          ? `${look} (empty)`
          : count === 1
            ? `${look} (1 block)`
            : `${look} (${count} blocks)`,
      linked: (name: string | null) =>
        name ? `Synced block “${name}”` : "Synced block",
    },
    textPlaceholder: "Start writing…",
    add: {
      label: "Add block",
      inBox: "Add to box",
    },
    // Rien ne se dépose dans une section du téléphone (« Ajouter dans la section » est juste
    // dessous) ; ce que dit aussi le plan.
    emptyBox: "This box is empty and won't appear in the app.",
    handle: (label: string) => `Move ${label}`,
    // Glisser-déposer : annonces lues par les lecteurs d'écran.
    dnd: {
      roleDescription: "draggable block",
      instructions:
        "To move a block, press Space or Enter on its drag handle. Use the arrow keys to move it, then press Space or Enter again to drop it, or Escape to cancel.",
      page: "the page",
      box: (position: number) => `the box at position ${position}`,
      start: (label: string) => `Picked up ${label}.`,
      over: (label: string, target: string, container: string) =>
        `${label} is over ${target}, in ${container}.`,
      overZone: (label: string, container: string) =>
        `${label} is in ${container}.`,
      outside: (label: string) => `${label} isn't over a drop zone.`,
      // Accordé à « Bloc » : le nom du bloc peut être masculin (Texte) ou féminin (Image).
      end: (label: string, container: string) =>
        `Dropped ${label} in ${container}.`,
      endOutside: (label: string) =>
        `Dropped ${label} outside the page. It's back where it was.`,
      cancel: (label: string) =>
        `Move canceled. ${label} is back where it was.`,
    },
    outline: {
      title: "Outline",
      empty: "No blocks yet.",
      select: (label: string) => `Go to ${label}`,
      // Le plan de l'éditeur du Fil (ADMIN § 4, « Les finitions »).
      count: (count: number) => (count === 1 ? "1 block" : `${count} blocks`),
      // Une ligne de section : son aspect, puis le nombre de ses blocs.
      box: { fill: "Box with background", border: "Box with border" },
      collapse: (label: string) => `Collapse ${label}`,
      expand: (label: string) => `Expand ${label}`,
      actions: (label: string) => `Actions for ${label}`,
      duplicate: "Duplicate",
      duplicated: (label: string) =>
        `Duplicated ${label}. The copy is just below it.`,
      leaveBox: "Move out of the box",
      left: (label: string) =>
        `Moved ${label} out of the box. It's now just below the box.`,
      remove: "Delete",
      warnings: {
        noFile: "No image yet",
        unavailable: "File unavailable",
        missingTemplate: "Template no longer exists",
        emptyBox: "Empty, not shown in the app",
      },
    },
    toolbar: {
      label: "Formatting toolbar",
      unavailable: "Click in a text block to format it.",
      paragraph: "Paragraph",
      h2: "Heading",
      h3: "Subheading",
      bulletList: "Bulleted list",
      orderedList: "Numbered list",
      bold: "Bold",
      italic: "Italic",
      link: "Link",
      undo: "Undo",
      redo: "Redo",
    },
    link: {
      title: "Link",
      description:
        "Enter a URL that starts with https:// for a website or mailto: for an email address.",
      url: "URL",
      placeholder: "https://example.com",
      invalid: "The URL must start with https:// or mailto:, with no spaces.",
      apply: "Apply",
      remove: "Remove link",
    },
    image: {
      choose: "Choose image",
      replace: "Change image",
      none: "No image yet",
      missing: "Image unavailable. Choose another one.",
      loadFailed: "Couldn't load the image.",
      notReady: "This image isn't ready yet. Choose another one.",
    },
    picker: {
      title: "Choose image",
      description:
        "Choose an image from the Media library, or upload a new one.",
      search: "Search images",
      searchPlaceholder: "Search by name…",
      choose: (name: string) => `Choose ${name}`,
      empty: "No images in the Media library yet. Add one with “Upload image”.",
      noResults: "No images found. Try another name.",
      loadFailed: "Couldn't load the images.",
      upload: "Upload image",
      uploadInput: "Image to upload",
      uploading: (name: string) => `Uploading “${name}”…`,
      uploadingProgress: (name: string, percent: string) =>
        `Uploading “${name}”… ${percent}`,
      uploadFailed: (name: string, error: string) =>
        `Couldn't upload “${name}”. ${error}`,
      notImage: (name: string) =>
        `“${name}” was added to the Media library, but only images can be used here (JPEG, PNG, WebP, GIF, HEIC, or AVIF).`,
    },
    // Le choix de l'audio d'un épisode : mêmes libellés que le choix d'une image, sauf ceux-ci.
    audioPicker: {
      title: "Choose audio",
      description:
        "Choose an audio file from the Media library, or upload a new one (MP3 or M4A).",
      search: "Search audio",
      choose: (name: string) => `Choose ${name}`,
      empty:
        "No audio files in the Media library yet. Add one with “Upload audio”.",
      noResults: "No audio found. Try another name.",
      loadFailed: "Couldn't load the audio files.",
      upload: "Upload audio",
      uploadInput: "Audio to upload",
      notImage: (name: string) =>
        `“${name}” was added to the Media library, but an episode only accepts audio (MP3 or M4A).`,
      noTranscript: "No transcript",
    },
    // Présentation d'un article ou d'un épisode (étape 7) : image de présentation, audio,
    // catégories. [D45], [D46]. Plus de résumé depuis le 03/10/2026.
    presentation: {
      cover: {
        choose: "Choose featured image",
        remove: "Remove featured image",
        removed: "Featured image removed.",
        none: "No featured image yet",
        missing: "Image unavailable. Choose another one.",
        notReady: "This image isn't ready yet. Choose another one.",
        alt: (alt: string) => `Alt text: “${alt}” (set in the Media library)`,
      },
      audio: {
        label: "Audio",
        hint: "Required to publish. Choose an MP3 or M4A file from the Media library. It plays below the episode title in the app.",
        choose: "Choose audio",
        replace: "Change audio",
        remove: "Remove audio",
        removed: "Audio removed.",
        none: "No audio yet",
        missing: "Audio unavailable. Choose another file.",
        notReady: "This audio isn't ready yet. Choose another file.",
        loadFailed: "Couldn't load the audio.",
        duration: (duration: string) => `Duration: ${duration}`,
        noDuration: "Unknown duration",
        transcriptOk: "Transcript added in the Media library.",
        transcriptMissing:
          "No transcript yet. Add one in the file details so people who can't listen can follow along (recommended, not required).",
      },
      // La fiche d'un fichier, dans un nouvel onglet (une image d'un bloc, l'audio d'un épisode).
      openInLibrary: "Open file details in the Media library",
      openFileHint: "(opens in a new tab)",
    },
    // Éditeur du Fil (ADMIN § 4) : le nom des deux colonnes (lecteurs d'écran), le titre de la
    // glissière des Blocs, et celui de la colonne de droite (l'Article, l'Épisode).
    columns: {
      left: "Outline and Blocks",
      right: {
        article: "Post and block settings",
        episode: "Episode and block settings",
        page: "Page and block settings",
        template: "Template and block settings",
      },
      blocks: "Blocks",
      content: {
        article: "Post",
        episode: "Episode",
        page: "Page",
        template: "Template",
      },
    },
    // Le mode Concentration de l'éditeur du Fil : les deux colonnes se cachent.
    focusMode: {
      label: "Focus mode",
      exit: "Exit Focus mode",
      on: "Focus mode on. Press Esc to show the columns again.",
      off: "Focus mode off. The columns are visible again.",
      shortcut: { apple: "⌘ .", other: "Ctrl + ." },
    },
    // L'aperçu de l'éditeur du Fil : la barre d'outils à droite du téléphone, et ce que montre la
    // Lecture (le rendu de l'app reste provisoire tant qu'elle n'est pas dessinée).
    preview: {
      tools: "Preview options",
      device: {
        label: "Device",
        ios: "iPhone · 402 × 874",
        android: "Android · 412 × 915",
      },
      mode: {
        label: "Mode",
        edit: "Edit",
        read: "Preview: as it looks in the app",
      },
      theme: {
        label: "Phone theme",
        light: "Light",
        dark: "Dark",
      },
      largeText: "Large text",
      fit: {
        label: "Screen size",
        adjust:
          "Fit: keeps the phone's width and fits the height to the window",
        full: "Full screen: the whole phone screen, scaled down if needed",
        scale: (percent: number) => `${percent}%`,
        scaleLabel: (percent: number) => `Full screen shown at ${percent}%`,
      },
      reader: {
        label: "Reader",
        subscriber: "View as a subscriber with access",
        visitor: "View as a reader without access",
      },
      screen: { ios: "iPhone preview", android: "Android preview" },
      // L'heure de la barre d'état, comme sur les photos des fabricants.
      time: { ios: "9:41", android: "12:00" },
      minutes: (count: number) => `${count} min read`,
      locked: {
        title: "The rest is for subscribers",
        text: {
          article: (level: string) =>
            `The full post is available with the ${level} plan.`,
          episode: (level: string) =>
            `The full episode is available with the ${level} plan.`,
          page: (level: string) =>
            `The full page is available with the ${level} plan.`,
        },
        textUnknown: {
          article: "The full post is available with the right plan.",
          episode: "The full episode is available with the right plan.",
          page: "The full page is available with the right plan.",
        },
        action: "See plans",
      },
      // En Lecture, on ne prend pas la main : rien ne se modifie.
      reading: "You're in Preview. Switch to Edit to make changes.",
    },
    // Les Blocs de l'éditeur du Fil (en glissière par-dessus le Plan), et le panneau « Mes blocs ».
    library: {
      hint: "Click a block to add it below the selected one (or at the end), or drag it onto the phone.",
      basics: "Basic blocks",
      addLabel: (label: string) => `Add ${label} block`,
      // La glissière des Blocs, par-dessus le Plan (éditeur du Fil).
      close: "Close Blocks",
      // La cible d'un ajout : « Ajouter dans la section ».
      target: {
        box: "Adding to the box: text or images only",
        cancel: "Stop adding to the box",
      },
      mine: {
        title: "My blocks",
        count: (count: number) =>
          count === 0
            ? "No templates"
            : count === 1
              ? "1 template"
              : `${count} templates`,
        back: "Back to Blocks",
        search: "Search blocks",
        searchLabel: "Search My blocks",
        filters: {
          label: "Template type",
          all: "All",
          style: "Presets",
          shared: "Synced blocks",
        },
        style: "Preset: inserts a copy you can edit",
        shared: (count: number) =>
          count === 0
            ? "Synced block: updates with its template"
            : count === 1
              ? "Synced block: updates with its template · used in 1 draft"
              : `Synced block: updates with its template · used in ${count} drafts`,
        insertLabel: (name: string) => `Add “${name}”`,
        empty:
          "No presets or synced blocks yet. Use “Save as template…” in the editor, or create one in Block templates.",
        // Un bloc de « Mes blocs » ajouté au contenu.
        added: (name: string) => `“${name}” added.`,
        noResult: "No templates match your search or filters.",
        manage: "Manage in Block templates",
      },
    },
    article: {
      ready: {
        title: "Ready to publish?",
        count: (done: number, total: number) => `${done} / ${total}`,
        items: {
          title: "Title",
          cover: "Featured image",
          audio: "Audio",
          address: "Page URL",
          access: "Access",
        },
        done: (label: string) => `${label}: done`,
        todo: (label: string) => `${label}: needs attention`,
        // Les points à vérifier du plan : ils n'empêchent pas de publier.
        warnings: (count: number) =>
          count === 1
            ? "1 warning in the Outline"
            : `${count} warnings in the Outline`,
      },
      feed: {
        title: {
          article: "In the Blog list",
          episode: "In the Podcasts list",
        },
        choose: "Choose",
        chooseLabel: "Choose featured image",
        replaceLabel: "Replace featured image",
        hint: {
          article:
            "Required to publish. It also appears at the top of the post.",
          episode:
            "Required to publish. It also appears at the top of the episode.",
        },
      },
      categories: {
        add: "Add",
        addLabel: "Add a category",
      },
      stats: {
        words: (count: string) =>
          count === "1" ? `${count} word` : `${count} words`,
        // En bas de la colonne : court (la phrase entière et la date complète dans l'infobulle).
        // 0 min pour un article vide, comme en Lecture (readingStats).
        short: (minutes: number, words: string) => `${minutes} min · ${words}`,
        readingTip: (minutes: number, words: string) =>
          `About ${minutes} min to read, ${words}`,
        // Un épisode : la durée de son audio au lieu du temps de lecture.
        audioShort: (duration: string, words: string) =>
          `${duration} · ${words}`,
        audioTip: (duration: string, words: string) =>
          `Duration: ${duration}, ${words}`,
        noAudio: "No audio",
        noAudioTip: (words: string) => `No audio yet, ${words}`,
        unknownDuration: "unknown",
        savedAt: (time: string) => `Saved at ${time}`,
        savedOn: (day: string) => `Saved ${day}`,
      },
    },
    settings: {
      label: "Block settings",
      title: (label: string) => `Settings for ${label}`,
      // Éditeur du Fil : la barre d'icônes en bas de la glissière du bloc.
      actions: "Block actions",
      readOnly: "Read-only: you can't make changes.",
      text: "Type directly on the phone. Select words to make them bold, italic, or a link.",
      image: {
        file: "File",
        alt: "Alt text",
        altFromLibrary: "Use the Media library's alt text",
        libraryAlt: (alt: string) => `Media library: “${alt}”`,
        noLibraryAlt: "This image has no alt text in the Media library.",
        altHint:
          "Describe the image in one sentence for people who can't see it.",
      },
      box: {
        look: "Appearance",
        fill: "Background",
        border: "Border",
        hint: "A box can hold text and images, but not another box.",
      },
      moveUp: "Move up",
      moveDown: "Move down",
      // Le premier (ou le dernier) bloc d'une section en sort.
      moveUpOut: "Move up out of the box",
      moveDownOut: "Move down out of the box",
      remove: "Delete block",
      removed: (label: string) => `Block deleted: ${label}.`,
      undo: "Undo",
      // Annoncé après « Monter » ou « Descendre ».
      moved: (position: number, count: number, container: string) =>
        `Block ${position} of ${count}, in ${container}.`,
      inBox: "the box",
    },
    // Enregistrement automatique.
    save: {
      saved: "Saved",
      savedAt: (date: string) => `Saved ${date}`,
      // Lu après « Enregistré » par les lecteurs d'écran.
      savedOn: (date: string) => `${date}`,
      pending: "Saving shortly…",
      saving: "Saving…",
      offline: "Offline, retrying…",
      failed: "Couldn't save",
      stopped: "Saving stopped",
      // Lu par les lecteurs d'écran, seulement quand l'état change vraiment (pas à chaque
      // enregistrement).
      announce: {
        offline:
          "You're offline. Your changes will be saved when you're back online.",
        saved: "All changes saved.",
      },
      leave: {
        title: "Leave without saving?",
        description:
          "Your latest changes haven't been saved yet and will be lost.",
        stay: "Stay",
        confirm: "Leave anyway",
      },
      // Le brouillon a changé ailleurs et sa relecture a échoué : nouvel essai toutes les 3 s.
      rereadFailed:
        "This draft was updated elsewhere but couldn't be reloaded. It's read-only while we keep trying.",
      // L'éditeur fermé, la dernière modification n'a pas pu partir (message gardé à l'écran).
      unsavedAtClose:
        "Your last change couldn't be saved before you left the editor.",
      nearLimit:
        "This draft is close to the maximum size. Consider splitting it into several items.",
      invalidAt: (position: number) =>
        `Block ${position} has an invalid format.`,
    },
    // Un seul membre à la fois sur un brouillon.
    lock: {
      unsaved:
        "Your unsaved changes aren't lost. Copy them before you leave the page.",
      stashKept:
        "The text you hadn't saved before the draft was taken over is still available.",
      dismiss: "Dismiss",
      copy: "Copy my text",
      copied: "Text copied to clipboard. Paste it wherever you like.",
      copyFailed:
        "Couldn't copy. Allow clipboard access in your browser, then try again.",
      someone: "Someone",
      trashed: "This item is in the Trash. Restore it to edit it.",
      failed: "Couldn't check the draft's status. Try again in a moment.",
      reloadFailed:
        "Couldn't reload the draft. Your text is still on screen. Try again in a moment.",
      // Le cadenas à côté de Concentration, et sa fenêtre.
      button: "Read-only",
      dialog: {
        title: {
          lost: (name: string) => `${name} took over`,
          lostUnknown: "Someone took over",
          lostSelf: "You took over in another tab",
          readOnly: (name: string) => `${name} is editing this draft`,
          readOnlySelf: "You're editing this draft in another tab",
          free: "No one is editing this draft",
          released: "This draft was released",
        },
        text: {
          lost: (name: string) =>
            `This draft is now read-only for you. It updates each time ${name} saves.`,
          lostUnknown:
            "This draft is now read-only for you. It updates each time it's saved.",
          lostSelf: "This draft is now read-only in this tab.",
          readOnly: (name: string) =>
            `You're viewing it read-only. It updates each time ${name} saves.`,
          readOnlySelf: "It's read-only in this tab.",
          free: "You're viewing it read-only. Start editing to make changes.",
          released:
            "This tab was in the background for more than 30 minutes, so the draft was released for others to edit.",
        },
        // Ce que ferait la prise de main.
        note: {
          other: (name: string) =>
            `If you take over, ${name} will switch to read-only. Anything they haven't saved yet will stay in their browser.`,
          unknown:
            "If you take over, the person editing will switch to read-only. Anything they haven't saved yet will stay in their browser.",
          self: "If you take over here, the other tab will switch to read-only.",
        },
        take: {
          lost: "Take over",
          lostSelf: "Take over here",
          readOnly: "Take over",
          readOnlySelf: "Take over here",
          free: "Start editing",
          released: "Start editing",
        },
        stay: "Stay read-only",
      },
    },
    // Erreurs de la base (RPC), selon leur code (docs/ARCHITECTURE-CONTENUS.md, « Étape 4 »).
    errors: {
      reserve_a_l_equipe:
        "Your account no longer has access to the editor. Sign in again.",
      demande_invalide: "This request isn't valid. Reload the page.",
      sorte_invalide:
        "This content or template type isn't valid. Reload the page.",
      parent_invalide: "This item can't be placed here.",
      contenu_introuvable: "This item no longer exists.",
      dans_la_corbeille: "This item is in the Trash. Restore it to edit it.",
      verrou_perdu:
        "Someone else took over this draft. Your latest changes weren't saved.",
      conflit_revision:
        "This draft changed elsewhere since you last loaded it. Copy your text, then reload the page.",
      reglages_invalides: "One of the settings isn't valid for this item.",
      adresse_invalide:
        "The page URL can only contain lowercase letters (no accents), numbers, and hyphens.",
      adresse_prise: "Another page already uses this URL.",
      categorie_invalide:
        "One of the categories no longer exists. Reload the page.",
      brouillon_trop_lourd:
        "This draft is too long to save (240 KB max). Split it into several items.",
      brouillon_trop_imbrique:
        "A list is nested too deeply. Remove some levels of nesting.",
      forme_invalide: "This draft has an invalid format, so it wasn't saved.",
      id_en_double:
        "Two blocks have the same ID. Reload the page and try again.",
      fichier_indisponible:
        "A file is no longer available (it's in the Trash or not ready yet). Choose another one.",
      modele_indisponible: "A template in use is no longer available.",
      // Étape 5 : publication, programmation, historique, corbeille.
      acces_a_choisir: "Choose access first: Free or a plan.",
      verrou_tenu:
        "Someone is editing this draft right now. Take over, or wait until they're done.",
      adresse_manquante: "Add a page URL before publishing.",
      son_manquant: "Choose the episode's audio before publishing.",
      // [D49].
      titre_manquant: "Add a title before publishing.",
      // Étape 7 : [D45].
      image_de_presentation_manquante:
        "Choose a featured image before publishing. It's used as the thumbnail in the app's lists.",
      image_sans_fichier:
        "An Image block has no file. Choose one, or delete the block.",
      fichier_inadapte:
        "A file is the wrong type. Image blocks and featured images need an image, and episodes need an audio file.",
      niveau_invalide:
        "This plan no longer exists. Choose another plan, or Free.",
      date_passee: "This time is in the past. Choose a future date and time.",
      version_introuvable:
        "This version no longer exists. Reload the version history.",
      version_immuable: "A published version can't be changed.",
      modele_utilise:
        "This template is still used in drafts. Detach it everywhere first.",
      // Étape 6 : modèles de blocs.
      modele_vide:
        "This synced block is empty. Add a block to it in Block templates before inserting it.",
      modele_un_seul_bloc:
        "A synced block holds a single block. To group several, put them in a box.",
      bloc_introuvable:
        "One of the selected blocks isn't saved yet. Wait for saving to finish, then try again.",
      modele_introuvable:
        "This template no longer exists, or it isn't a synced block. Reload the page.",
    },
  },

  // Publication (étape 5) : barre de publication, programmation, historique, réglages.
  publication: {
    status: {
      label: "Publishing status",
      draft: "Draft",
      withdrawn: "Unpublished",
      live: "Published",
      modified: "Changed since publishing",
      scheduled: (date: string) => `Scheduled for ${date}`,
      // Juste après l'heure prévue : la tâche planifiée n'est peut-être pas encore passée.
      due: "Publishing now",
      waiting: "Waiting to publish: someone is editing the draft",
      failed: "Scheduled publishing failed",
      // L'état n'a pas pu être lu (réseau) : « Publier » attend qu'il le soit.
      unknownHint: "Couldn't load the publishing status. Click to try again.",
    },
    // Éditeur du Fil : la pastille à côté de « Publier » (la phrase entière dans l'infobulle).
    short: {
      draft: "Draft",
      withdrawn: "Unpublished",
      live: "Published",
      modified: "Changed",
      scheduled: "Scheduled",
      due: "Publishing…",
      waiting: "Waiting",
      failed: "Failed",
      unknown: "Unknown status",
    },
    // Bandeau de l'éditeur ([D16], [D31]).
    banner: {
      scheduled: (date: string) =>
        `Scheduled for ${date}. Any changes you save before then will be published too.`,
      scheduledHint:
        "The latest saved draft is what gets published. If someone has edited it since it was scheduled and still has the editor open, publishing waits until they leave the editor. After an hour, scheduled publishing fails.",
      due: (date: string) => `Scheduled for ${date}. Publishing in a moment.`,
      dueHint:
        "If someone has edited this draft since it was scheduled and still has the editor open, publishing waits until they leave the editor. After an hour, scheduled publishing fails.",
      waiting: (date: string) =>
        `Waiting to publish since ${date}: someone is editing this draft.`,
      waitingHint:
        "It'll publish as soon as they leave the editor, or fail after an hour.",
      // La personne devant l'écran tient elle-même le verrou ([D31]).
      waitingMine: (date: string) =>
        `Scheduled for ${date}. If you've edited the draft since then, publishing waits for you to leave the editor.`,
      waitingMineHint:
        "Edits saved since it was scheduled hold publishing while you have the editor open, even if you're not typing. After an hour, scheduled publishing fails.",
      leave: "Leave editor",
      failed: "Scheduled publishing failed.",
      failedReason: (reason: string) => `Reason: ${reason}`,
      failedBy: (name: string) => `Scheduled by ${name}.`,
    },
    // Codes de contents.schedule_error propres à la tâche planifiée (les autres sont ceux de
    // la publication, dans texts.editor.errors).
    scheduleErrors: {
      auteur_parti: "the person who scheduled it is no longer on the team.",
      brouillon_en_cours_d_ecriture:
        "someone was still editing the draft after an hour.",
      erreur_inattendue: "something unexpected went wrong.",
    },
    actions: {
      publish: "Publish",
      more: "More publishing actions",
      schedule: "Schedule…",
      reschedule: "Reschedule…",
      unschedule: "Unschedule",
      dismissFailure: "Dismiss",
      unpublish: "Unpublish",
      history: "Version history",
    },
    publishDialog: {
      title: "Publish to the app?",
      titleAgain: "Publish changes?",
      description:
        "Readers will see the draft as it's saved now. Later edits won't appear in the app until you publish again. Any scheduled publishing is canceled.",
      access: "Access",
      address: "Page URL",
      confirm: "Publish",
    },
    // Ce qui manque pour publier ou programmer ([D45], audio d'un épisode), et le conseil [D46].
    requirements: {
      publishTitle: "Before you can publish, add:",
      scheduleTitle: "Before you can schedule, add:",
      title: "A title.",
      writeTitle: "Add a title",
      cover: "A featured image (the thumbnail in the app's lists).",
      coverUnavailable:
        "An available featured image (the current one is in the Trash or isn't ready yet).",
      audio: "The episode's audio.",
      audioUnavailable:
        "Available audio (the current file is in the Trash or isn't ready yet).",
      chooseCover: "Choose image",
      chooseAudio: "Choose audio",
      transcript:
        "Recommended: add a transcript. You can publish without one and add it later in the file details in the Media library.",
    },
    levelRequired: "Choose access: Free or a plan. There's no default.",
    levelNeedsLock:
      "To set access, start editing the draft first, or take over if someone else is editing.",
    needsSaved: "The draft isn't saved yet. Once it's saved, try again.",
    published: (number: number) => `Published to the app (version ${number}).`,
    upToDate: "No changes to publish.",
    conflict: "The draft just changed. Review it, then publish again.",
    lockHeld: {
      title: "Someone is editing this draft",
      description: (name: string) =>
        `${name} is editing this draft right now. To publish, take over (they'll switch to read-only), or wait until they're done.`,
      take: "Take over",
    },
    unpublishDialog: {
      title: "Unpublish?",
      description:
        "Readers will no longer see this content. The draft and version history are kept, and you can publish it again. Any scheduled publishing is canceled.",
      confirm: "Unpublish",
      done: "Unpublished.",
    },
    scheduleDialog: {
      title: "Schedule publishing",
      description:
        "Choose a date and time (Paris time). The latest saved draft will be published then.",
      date: "Date",
      time: "Time (Paris)",
      summary: (date: string) => `Publishing on ${date}.`,
      ambiguous:
        "This time happens twice that night because clocks fall back. It'll publish at the first one, while daylight saving time is still in effect.",
      confirm: "Schedule",
      done: (date: string) => `Scheduled for ${date}.`,
      errors: {
        required: "Choose a date and time.",
        invalid: "Enter a valid date and time.",
        nonexistent:
          "This time doesn't exist that day: clocks jump from 2:00 AM to 3:00 AM when daylight saving time starts. Choose another time.",
        past: "That time is in the past. Choose a future date and time.",
      },
    },
    unscheduled: "Unscheduled.",
    failureDismissed: "Dismissed.",
    history: {
      title: "Version history",
      description:
        "Published versions, newest first. Restoring a version copies it into the draft without changing anything in the app.",
      empty: "No published versions yet.",
      version: (number: number) => `Version ${number}`,
      by: (name: string) => `by ${name}`,
      live: "Published",
      origins: {
        manual: "Published manually",
        scheduled: "Published on schedule",
        template: "Synced block updated",
        files: "File, alt text, or transcript updated",
      },
      // Les catégories d'une version (article, épisode), dans l'ordre de la section ([D28]).
      categories: (names: string[]) => `Categories: ${names.join(", ")}`,
      noCategory: "No categories",
      deletedCategories: (count: number) =>
        count === 1 ? "deleted category" : `${count} deleted categories`,
      revert: "Restore this version",
      revertItem: (number: number) => `Restore version ${number}`,
      confirm: {
        title: (number: number) => `Restore version ${number}?`,
        // Ce que revert_to_version remplace dépend de la sorte : l'adresse d'une page, les
        // catégories d'un article ou d'un épisode.
        description: (kind: string) =>
          kind === "page"
            ? "This replaces the draft with this version's content, access, and page URL. Nothing changes in the app until you publish again."
            : kind === "article" || kind === "episode"
              ? "This replaces the draft with this version's content, access, and categories (categories deleted since then won't come back). Nothing changes in the app until you publish again."
              : "This replaces the draft with this version's content and access. Nothing changes in the app until you publish again.",
        confirm: "Restore this version",
      },
      needsLock:
        "To restore a version, start editing the draft first, or take over if someone else is editing.",
      reverted: (number: number) => `Draft restored to version ${number}.`,
      warnings: {
        fichier_retire:
          "A file is no longer available. Choose another one before publishing.",
        modele_detache:
          "A synced block's template no longer exists, so the block is now a regular copy.",
        adresse_prise:
          "Another page now uses this URL, so the draft keeps its current one.",
      },
      loadFailed: "Couldn't load the version history.",
    },
    settings: {
      title: "Content settings",
      description:
        "Saved with the draft. Changes appear in the app the next time you publish.",
      readOnly:
        "Read-only. To change settings, start editing the draft first, or take over if someone else is editing.",
      titleLabel: "Title",
      titleRequired: "Add a title.",
      access: {
        label: "Access",
        description:
          "Who can read this content in the app. There's no default.",
        free: "Free",
        freeHint: "Anyone can read it.",
        levelHint: "Subscribers on this plan or higher.",
        // La dernière formule : il n'y en a pas de plus complète.
        levelHintTop: "Subscribers on this plan only (your top plan).",
        notChosen: "Not set yet. You'll be asked when you publish.",
        notChosenShort: "Choose access",
        noLevels:
          "No subscription plans yet. An admin can create them in Settings › Plans.",
        loadFailed: "Couldn't load the subscription plans.",
        live: (name: string) => `Published version: ${name}`,
        deleted: "deleted plan",
      },
      slug: {
        label: "Page URL",
        description:
          "Used by the app to open the page. Lowercase letters (no accents), numbers, and hyphens only.",
        placeholder: "e.g. legal-notice",
        invalid:
          "Use only lowercase letters (no accents), numbers, and single hyphens, with no hyphen at the start or end.",
        tooLong: "The URL can't be longer than 100 characters.",
        fromTitle: "Use title",
        live: (slug: string) => `Published version: ${slug}`,
        missing: "Choose a page URL before publishing.",
        taken: (title: string) =>
          `The page “${title || "Untitled"}” already uses this URL. Choose another one.`,
        checking: "Checking URL…",
        free: "Available",
      },
      categories: {
        label: "Categories",
        description:
          "Optional. Readers can filter by category in the app. Changes appear the next time you publish.",
        none: "No categories in this section yet.",
        loadFailed: "Couldn't load the categories.",
      },
      // Un réglage refusé par la base : le brouillon s'enregistre quand même, sans lui.
      refused:
        "Couldn't change this setting. The rest of the draft is still saving.",
    },
  },

  // Paramètres (admins) : quatre onglets, dont les formules d'abonnement.
  settings: {
    tabs: {
      label: "Settings tabs",
      admin: "Admin branding",
      app: "App branding",
      plans: "Plans",
      advanced: "Advanced",
    },
    // Onglet « Identité de l'admin » : le nom de la marque, pour toute l'équipe.
    adminIdentity: {
      // La carte de la marque : son nom et son adresse de contact.
      title: "Brand",
      description:
        "The name your team sees in the menu, the browser tab, and on the sign-in screen. Your contact email is shown on the sign-in screen so anyone who's lost their phone or invitation can reach you.",
      name: "Brand name",
      save: "Save",
      nameTooLong: "The name can't be longer than 40 characters.",
      // L'adresse de contact, montrée sur l'écran de connexion à qui a besoin d'aide.
      email: "Contact email",
      emailPlaceholder: "contact@example.com",
      invalidEmail: "Enter a valid email address.",
      saved: "Brand settings saved.",
      loadFailed: "Couldn't load brand settings.",
      // Le logotype et le monogramme, chacun pour fond clair et pour fond sombre : une carte
      // par fichier (le modèle « Cover Art » de shadcn).
      files: {
        // La section des logos : une carte, deux groupes de deux cases (fond clair, fond sombre).
        title: "Logos",
        description:
          "Upload your logo for light and dark backgrounds (SVG, PNG, or WebP, up to 1 MB). Choose a file or drag it onto a slot. One version is enough: it's used on both backgrounds. With no logo, your brand name is shown instead, or the default logos if there's no name.",
        logotype: {
          title: "Logo",
          use: "menu and sign-in",
        },
        monogram: {
          title: "Icon",
          use: "browser tab and sign-in",
        },
        light: "Light background",
        dark: "Dark background",
        // L'étiquette d'une carte, et le nom de son champ : « Logotype · fond clair ».
        label: (what: string, surface: string) =>
          `${what} · ${surface.toLowerCase()}`,
        choose: "Choose a file",
        // Un fichier glissé au-dessus d'une carte.
        drop: "Drop file here",
        replace: "Replace",
        remove: "Remove",
        saved: "File saved.",
        removed: "File removed.",
        // Un SVG aux couleurs modifiables : le décliner aux couleurs des palettes ?
        variants: {
          title: "Adapt this logo to each palette?",
          description: (count: number, original: string) =>
            `This logo can be recolored to match each of the ${count} palettes, so everyone sees it in their own colors on light and dark backgrounds. ${original}, the original palette, keeps the file's colors.`,
          detected: "Detected colors",
          main: "Main",
          accent: "Accent",
          keep: "Keep original colors",
          confirm: (count: number) => `Adapt for all ${count} palettes`,
          done: "File saved and adapted to each palette.",
          // Sous le message : un fichier envoyé sans être décliné, ou retiré, emporte les déclinaisons.
          removed: "Its palette versions were removed.",
          status: (count: number) =>
            `Adapted for ${count} palette${count === 1 ? "" : "s"}`,
        },
        errors: {
          type: "Choose an SVG, PNG, or WebP file.",
          tooBig: "The file is larger than 1 MB.",
          svg: "Couldn't read this SVG.",
          photoType: "Choose a JPEG, PNG, or WebP file.",
          photo: "Couldn't read this image.",
        },
        // La section de l'écran de connexion : l'aperçu (l'image, le voile et le monogramme) et,
        // à côté, l'image et le monogramme animé.
        loginScreen: {
          title: "Sign-in screen",
          description:
            "The first thing your team sees when they sign in. Choose a background image, shown on wide screens (JPEG, PNG, or WebP, compressed automatically), or drag one onto the preview, then pick how the icon animates.",
          preview: "Sign-in screen preview",
        },
        loginImage: {
          title: "Background image",
          formats: "JPEG, PNG, or WebP",
          // Une photo plus lourde est réduite à l'envoi : elle tient toujours dans 1 Mo.
          maxSize: "Resized and compressed automatically",
          choose: "Choose",
        },
        monogramMotion: {
          title: "Animated icon",
          description:
            "Select the animations you want. They play in a loop, one after another, with a short pause after each.",
          toggle: "Animate the icon",
          on: "Icon animation turned on.",
          off: "Icon animation turned off.",
          // Les animations, dans l'ordre où elles se jouent (lib/monogram-motion.ts).
          motions: {
            trace: "Trace",
            cascade: "Cascade",
            glint: "Glint",
            shine: "Shine",
            halo: "Halo",
            sway: "Sway",
            breathe: "Breathe",
          },
          group: "Icon animations",
          // Une animation grisée : ce que le monogramme pour fond sombre ne permet pas.
          blocked: {
            svg: "“Trace”, “Cascade”, and “Glint” only work with a simple SVG icon (up to four solid colors, no gradients or images).",
            accent:
              "“Glint” only works with an icon that has an accent color (a bright color, not just black, white, or gray).",
          },
          saved: "Animations saved.",
        },
      },
    },
    // Un onglet pas encore rempli.
    empty: {
      title: "Nothing here yet",
      description: "This tab is coming soon.",
    },
    // Onglet « Avancé » : la langue de toute l'admin.
    advanced: {
      language: {
        title: "Language",
        description:
          "The language of the admin and its sign-in pages for the whole team. Each member can choose their own in My account.",
        label: "Admin language",
        hint: "Members who chose their own language in My account keep it.",
        saved: "Admin language saved.",
        loadFailed: "The admin language couldn't be loaded.",
      },
    },
    accessLevels: {
      title: "Subscription plans",
      description:
        "Plans are listed from lowest at the top to highest at the bottom. Subscribers can read content for their plan and every lower plan. When you change the order, what each subscriber can read updates right away.",
      listLabel: "Plans, from lowest to highest",
      empty: "No plans yet. Until you add one, all content stays free.",
      name: "New plan name",
      namePlaceholder: "e.g. Essential",
      addTitle: "Add a plan",
      addDescription:
        "It's added at the bottom, as your top plan. Then drag it into place.",
      nameRequired: "Give the plan a name.",
      nameTooLong: "The name can't be longer than 100 characters.",
      add: "Add",
      added: (name: string) => `Plan “${name}” added.`,
      rank: (position: number) => `#${position}`,
      rename: "Rename",
      renameLabel: (name: string) => `New name for ${name}`,
      renamed: "Plan renamed.",
      remove: "Delete permanently",
      actions: (name: string) => `Actions for ${name}`,
      confirmRemove: {
        title: "Delete this plan?",
        description: (name: string) =>
          `“${name}” will be permanently deleted. You can only delete a plan that no subscriber has, that no content uses (even in the Trash), and that no published version has ever used.`,
        confirm: "Delete permanently",
      },
      removed: (name: string) => `Plan “${name}” deleted.`,
      handle: (name: string) => `Move “${name}”`,
      reordered: "New order saved.",
      // Glisser-déposer : annonces lues par les lecteurs d'écran.
      dnd: {
        roleDescription: "draggable plan",
        instructions:
          "To move a plan, press Space or Enter on its drag handle. Use the arrow keys to move it, then press Space or Enter again to drop it, or Escape to cancel.",
        start: (name: string) => `Picked up “${name}”.`,
        over: (name: string, position: number, count: number) =>
          `“${name}” is in position ${position} of ${count}.`,
        end: (name: string, position: number, count: number) =>
          `Dropped “${name}” in position ${position} of ${count}.`,
        cancel: (name: string) =>
          `Move canceled. “${name}” is back in its place.`,
      },
      loadFailed: "Couldn't load the plans.",
      errors: {
        formule_utilisee:
          "This plan can't be deleted: a subscriber has it, content uses it (even in the Trash), or a published version in the history used it. You can rename or move it instead.",
        nom_en_double: "A plan with this name already exists.",
        reserve_aux_admins: "Only admins can manage plans.",
        reserve_a_l_equipe:
          "You no longer have access to Settings. Sign in again.",
        demande_invalide:
          "The list changed in the meantime. Reload the page and try again.",
        introuvable: "This plan no longer exists. Reload the page.",
      },
    },
  },

  // Lecteur audio (fiche d'un fichier, présentation d'un épisode).
  audioPlayer: {
    play: (name: string) => `Play ${name}`,
    pause: (name: string) => `Pause ${name}`,
    position: "Playback position",
    mute: "Mute",
    unmute: "Unmute",
    failed: "Couldn't play this audio. Check your connection, then try again.",
  },

  // Menu de l'avatar, en haut à droite de chaque page.
  accountMenu: {
    open: "Account menu",
  },

  header: {
    label: "Top menu",
    website: "Website",
    newTab: "(opens in a new tab)",
  },

  help: {
    search: "Search help",
    shortcut: { apple: "⌘K", other: "Ctrl K" },
    title: "Help",
    description:
      "Describe what you want to do in a few words to find a help article.",
    placeholder: "What do you want to do?",
    empty: "No help articles match. Try different words.",
    steps: "Steps",
    notes: "Good to know",
    themes: {
      contenus: "Writing",
      publication: "Publishing",
      mediatheque: "Media library",
      modeles: "Block templates",
      corbeille: "Trash",
      equipe: "Team and account",
    },
  },

  // Les couleurs de chacun, dans Mon compte (noms des thèmes de shadcn, en français).
  // Les couleurs, dans la carte Thème de Mon compte.
  colors: {
    // Les palettes toutes prêtes : un clic choisit la base et l'accent. Leur nom mêle ceux des deux.
    presets: {
      title: "Palettes",
      // Revenir à la palette d'origine (Neutrine).
      reset: "Reset",
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
        "neutral-none": "Clean, timeless",
        "stone-orange": "Warm, energetic",
        "taupe-amber": "Earthy, golden",
        "olive-green": "Natural, soothing",
        "mist-teal": "Calm, fresh",
        "mist-sky": "Airy, bright",
        "zinc-indigo": "Crisp, modern",
        "zinc-blue": "Classic, reassuring",
        "mauve-violet": "Soft, creative",
        "mauve-rose": "Gentle, confident",
        "neutral-red": "Understated, high-contrast",
      },
    },
    // L'aperçu, à côté du choix : la page d'accueil de l'admin en réduction, avec un travail d'équipe inventé.
    preview: {
      title: "Preview",
      description: "Your palette applies across the admin. Only you see it.",
      nav: ["Dashboard", "Blog", "Podcasts", "Pages", "Media library"],
      initial: "C",
      member: "Camille",
      heading: "Dashboard",
      subtitle: "Your team's work this week.",
      primary: "New post",
      stats: [
        { label: "Published", value: "24", badge: "+6" },
        { label: "Drafts", value: "8", badge: "+2" },
      ],
      chart: "Published this week",
      list: "Recently edited",
      rows: [
        {
          name: "Breathe before you reply",
          meta: "Blog · by Léa, 2h ago",
          badge: "Published",
        },
        {
          name: "Morning calm",
          meta: "Podcasts · by Hugo, yesterday",
          badge: "Scheduled",
        },
        {
          name: "Finding your rhythm",
          meta: "Blog · by Camille, Monday",
          badge: "Draft",
        },
      ],
    },
  },

  theme: {
    title: "Theme",
    // Sous le titre de la carte Thème de Mon compte, qui réunit le mode et les couleurs.
    description: "Applies only to you, in this browser.",
    light: "Light",
    dark: "Dark",
    system: "System",
    // Le bouton du header : le thème choisi, et celui qui vient au clic.
    switch: (current: string, next: string) =>
      `Theme: ${current}. Switch to ${next.toLowerCase()} theme`,
  },

  smallScreen: {
    title: "Screen too small",
    message:
      "The admin is designed for computers. Make your window wider, or switch to a computer.",
  },

  notFound: {
    title: "Page not found",
    description: "This address doesn't match any page in the admin.",
    back: "Back to Dashboard",
  },

  error: {
    title: "Something went wrong",
    description:
      "We've been notified and will look into it. Reload the page and try again.",
    reload: "Reload page",
  },

  dates: {
    // Entre la date et l'heure : « 27 sept. 2026 à 18h42 »
    at: "at",
    // Entre les heures et les minutes : « 18h42 »
    hour: ":",
    // Champs « Jour » et « Heure » (fenêtre « Programmer »).
    dayPlaceholder: "mm/dd/yyyy",
    timePlaceholder: "8:00 AM",
    pickDay: "Pick a date from the calendar",
  },
} as const

// Un texte de chaque langue a la même forme que l'anglais : mêmes clés, mêmes paramètres,
// mais d'autres mots.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { readonly [K in keyof T]: Widen<T[K]> }

export type Texts = Widen<typeof en>

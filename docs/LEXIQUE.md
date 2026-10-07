# Lexique de l'admin

> **Brouillon du 07/10/2026**, rédigé par l'agent rédacteur à partir de tous les textes de l'admin (`web/src/texts.ts`, les fiches de l'aide, les e-mails). Les lignes marquées attendent une décision par QCM.
>
> Il fait foi pour tous les textes, en anglais comme en français : la même chose porte le même nom partout. Un mot nouveau s'y ajoute avant d'apparaître dans l'interface. Les agents `.claude/agents/redacteur-fr.md`, `redacteur-en.md` et `relecteur-en.md` le lisent avant chaque travail. Décision : [ADMINISTRATION.md](ADMINISTRATION.md), § 7, « En anglais et en français ».

## Ton

| | Français | English |
|---|---|---|
| Adresse | Tutoiement, direct et chaleureux | « you », direct and warm, American English |
| Titres, boutons, onglets | Majuscule au premier mot, sans point final | Sentence case, no final period |
| Boutons | Un verbe à l'infinitif, deux à quatre mots | A verb, two to four words |
| Messages | Ce qui s'est passé, puis ce qu'on peut faire | What happened, then what you can do |
| Ponctuation | Espace insécable (U+00A0) avant « : ; ! ? » et à l'intérieur des guillemets « », vérifiée par `web/src/texts.test.ts` ; « … » | No space before punctuation; curly quotes “ ” in texts |
| Majuscules | Les noms de section (Médiathèque, Corbeille) et de l'éditeur (Plan, Blocs, Lecture, Édition, Concentration) ; le geste en minuscule (« mettre à la corbeille ») | Same nouns capitalized (Media library, Trash, Outline…) |

## Lieux de l'admin

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| l'admin | the admin | L'outil web où l'équipe gère l'app. | administration (sauf dans les e-mails), back-office / back office, CMS, dashboard |
| Tableau de bord | Dashboard | Première page après la connexion. | Accueil / Home |
| Blog | Blog | Section des articles et de leurs catégories. | Le Fil / Feed |
| Podcasts | Podcasts | Section des épisodes et de leurs catégories. | Radio Éclaircies, Radio / Podcast (au singulier) |
| Pages | Pages | Section des pages simples de l'app (mentions légales…). | — |
| Modèles de bloc | Block templates | Section des modèles réutilisables. | Modèles de blocs, Modèles (seul, dans un titre), gabarits / Patterns, Templates (seul) |
| Médiathèque | Media library | Section de tous les fichiers envoyés. | Médias, bibliothèque / Media (seul), Assets, Files |
| Corbeille | Trash | Ce qu'on supprime y reste 30 jours avant l'effacement. | Poubelle / Bin, Recycle bin |
| Équipe | Team | Les membres et leurs rôles (admins seulement). | Utilisateurs / Users |
| Paramètres | Settings | Les réglages de toute l'admin (admins seulement). | Configuration / Preferences |
| Mon compte | My account | Profil, double vérification et thème de chaque membre. | Profil (seul) / Profile (seul) |
| Contenus (groupe du menu) | Content | Blog, Podcasts, Pages. | — / Contents |
| Outils (groupe du menu) | Tools | Modèles de bloc, Médiathèque, Corbeille. | — |
| Aide | Help | La recherche des fiches d'aide (⌘ K). | Documentation, FAQ / Docs |
| fiche d'aide | help article | Une réponse courte de l'aide. | article (réservé au Blog) / doc, page |
| Site web | Website | Lien vers le site public. | — / Site |
| Avancé | Advanced | Onglet des Paramètres pour les réglages rares (langue de l'admin…). | — |

## Équipe, accès et connexion

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| membre | member | Une personne de l'équipe qui a accès à l'admin. | utilisateur, collaborateur / user |
| rôle | role | Ce qu'un membre peut faire : Admin ou Éditeur. | droits, profil / permissions |
| Admin (rôle) | Admin | Peut tout faire, Équipe et Paramètres compris. | administrateur / Administrator, Owner |
| Éditeur (rôle) | Editor | Écrit, publie et range, sans Équipe ni Paramètres. | rédacteur, auteur / Author, Contributor |
| inviter, invitation | invite, invitation | Un admin ajoute une personne par un e-mail avec un lien valable 10 minutes. | inscription / sign up |
| renvoyer l'invitation | resend invitation | Envoyer un nouveau lien. | relancer / reinvite |
| retirer de l'équipe | remove from team | Supprimer l'accès et le compte d'un membre. | supprimer le membre / delete user |
| se connecter, connexion | sign in, sign-in | Entrer dans l'admin avec un code reçu par e-mail. | login, s'identifier / log in, login |
| se déconnecter | sign out | Quitter l'admin sur ce navigateur. | — / log out |
| code de connexion | sign-in code | Les 6 chiffres reçus par e-mail, valables 10 minutes. | jeton, OTP / token, OTP, magic code |
| double vérification | two-step verification | Le code de l'app du téléphone, demandé à chaque connexion. | 2FA, MFA, A2F / 2FA, MFA |
| app de double vérification | authenticator app | L'app du téléphone qui affiche le code. | — |
| réinitialiser (la double vérification) | reset | Effacer la configuration d'un membre qui a perdu son téléphone. | — |
| Configurée (double vérification) | Set up | État de la double vérification d'un membre. | Activée, Active / Enabled, Active |
| déconnecté | signed out | Remplace « session » dans les messages. | session / session |

## Contenus

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| contenu | content (au compte : item) | Ce que l'équipe écrit et publie : article, épisode, page ou modèle. | publication, post / contents, entry |
| article | post | Contenu du Blog. | billet, actu |
| épisode | episode | Contenu des Podcasts, avec son audio. | émission, podcast / podcast |
| page | page | Contenu simple de l'app, ouvert par son adresse. | — |
| titre | title | Le nom d'un contenu, exigé pour publier. | — / headline |
| catégorie | category | Propre au Blog ou aux Podcasts ; filtre dans l'app. | thème, étiquette / tag |
| image de présentation | featured image | Image en tête du contenu et vignette des listes de l'app, exigée pour publier. | vignette, couverture / cover, thumbnail |
| audio (d'un épisode) | audio | Le fichier MP3 ou M4A d'un épisode, exigé pour publier. | son, piste / sound, track |
| adresse de la page | page URL | Ce que l'app demande pour ouvrir une page (`mentions-legales`). | slug, permalien / slug, permalink |
| niveau d'accès | access | Qui peut lire : Gratuit ou une formule. | visibilité, droits / visibility, permission |
| Gratuit | Free | Tout le monde peut lire. | public / Public |
| formule | plan | Offre payante, de la moins complète à la plus complète. | abonnement, offre / tier, subscription |
| abonné | subscriber | Lecteur de l'app qui a une formule. | membre (réservé à l'équipe) / member |
| lecteur | reader | Personne qui lit dans l'app. | utilisateur, visiteur / user, visitor |
| réglages (d'un contenu) | settings | Titre, niveau d'accès, catégories, adresse. | paramètres, propriétés / properties |
| ordre (d'une liste) | order | Rang choisi par glisser-déposer, repris par l'app. | tri / sort, rank |

## Éditeur et blocs

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| éditeur | editor | L'écran où l'on écrit un contenu ou un modèle. | builder, constructeur / builder |
| bloc | block | Morceau d'un contenu : Texte, Image ou Encadré. | élément, module / element, component |
| Texte (bloc) | Text | Bloc de texte mis en forme. | Paragraphe / Paragraph |
| Image (bloc) | Image | Bloc qui montre une image de la Médiathèque. | Photo / Photo |
| Encadré (bloc) | Box | Bloc qui regroupe des textes et des images, avec un fond ou une bordure. Le mot « section » ne désigne plus qu'une partie de l'admin. | Section, Boîte / Section, Container, Group |
| intertitre / petit intertitre | heading / subheading | Styles de titre dans un texte. | titre 2, H2 / H2, title |
| Plan | Outline | Colonne de gauche : la liste des blocs, à ranger. | sommaire, structure / layers |
| Blocs (glissière) | Blocks | La glissière qui ajoute un bloc. | bibliothèque / library, inserter |
| Blocs de base | Basic blocks | Texte, Image, Encadré. | — / Core blocks |
| Mes blocs | My blocks | Mises en forme et blocs partagés à insérer. | blocs enregistrés / Saved blocks, Reusable blocks |
| réglages du bloc | block settings | Glissière à droite, pour le bloc choisi. | inspecteur / inspector |
| barre de mise en forme | formatting toolbar | Gras, italique, lien, listes. | mise en forme (seul) / format bar |
| modèle | template | Bloc ou structure réutilisable, de trois types. | gabarit / pattern |
| mise en forme (type de modèle) | preset | Copie déjà mise en forme, à compléter, qui ne suit plus son modèle. | style / style, snippet |
| bloc partagé | synced block | Un seul bloc, identique partout, corrigé une fois dans son modèle. | bloc lié / linked block, reusable block, global block |
| détacher | detach | Faire d'un bloc partagé une copie ordinaire. | délier / unlink |
| point de départ | starter | Modèle qui ouvre un nouveau contenu avec une structure en place. | gabarit / blueprint |
| enregistrer comme modèle | save as template | Créer un modèle à partir de blocs choisis. | — |
| type (de modèle, de fichier) | type | La sorte d'un modèle ou d'un fichier. | sorte, genre / kind, sort |
| texte alternatif | alt text | Phrase qui décrit une image pour qui ne la voit pas. | légende / caption |
| transcription | transcript | Le texte d'un audio, conseillé. | sous-titres / captions |
| point à vérifier | warning | Remarque du plan qui n'empêche pas de publier. | erreur / error |
| Prêt à publier ? | Ready to publish? | Ce qui manque avant de publier. | checklist / checklist |
| enregistrement automatique | autosave | Le brouillon s'enregistre seul. | sauvegarde / backup |
| Édition (mode) | Edit | On écrit dans le téléphone. | — / Write |
| Lecture (mode) | Preview | Le contenu comme dans l'app, sans rien modifier. | Aperçu (déjà pris) / Read mode |
| aperçu | preview | Le téléphone de l'éditeur, ou la vignette d'un fichier. | — |
| Concentration | Focus mode | Cache les deux colonnes de l'éditeur. | mode zen / Zen mode |
| Écran entier / Ajuster | Full screen / Fit | Tout l'écran du téléphone, ou tenir dans la fenêtre. | — |
| Grand texte | Large text | Aperçu avec le texte agrandi du téléphone. | — / Big text |
| prendre, reprendre la main | take over | Devenir la seule personne qui écrit un brouillon. | verrou (à l'écran) / lock, claim |
| lecture seule | read-only | Un brouillon qu'un autre membre écrit. | — / view only |
| libéré (brouillon) | released | Rendu à l'équipe après 30 minutes d'onglet caché. | déverrouillé / unlocked |

## Publication

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| brouillon | draft | La copie de travail d'un contenu ; l'app n'en voit rien. | — / working copy |
| publier | publish | Envoyer dans l'app une copie du brouillon : une nouvelle version. | mettre en ligne (bouton) / push, go live |
| version | version | Copie publiée et numérotée, qui ne change plus. | révision / revision |
| historique | version history | La liste des versions publiées. | — / changelog |
| revenir à cette version | restore this version | Recopier une version dans le brouillon. | restaurer (réservé à la Corbeille) / revert, roll back |
| programmer | schedule | Publier seul au jour et à l'heure choisis, heure de Paris. | planifier / plan |
| annuler la programmation | unschedule | Retirer une publication programmée. | déprogrammer |
| retirer de l'app | unpublish | Ne plus montrer le contenu, en gardant brouillon et historique. | dépublier / hide, take down |
| mettre à jour dans l'app | update in app | Republier seulement un fichier ou un bloc partagé changé. | pousser / push, sync |
| état | status | Où en est un contenu. | statut / state |
| Brouillon | Draft | Jamais publié. | — |
| En ligne | Published | Publié, sans changement depuis. | publié (comme état), dans l'app / Online |
| Modifié | Changed | En ligne, avec un brouillon modifié depuis. | — / Edited, Dirty |
| Retiré | Unpublished | Publié puis retiré. | dépublié / Hidden |
| Programmé | Scheduled | Publication prévue. | planifié / Planned |
| En attente | Waiting | Programmation retardée : quelqu'un écrit le brouillon. | — / On hold |
| En cours | Publishing… | L'heure est passée, la publication n'est pas encore partie. | — |
| Échec | Failed | La publication programmée n'a pas pu partir. | erreur / Error |
| Enregistré le … | Saved … | La date de la dernière modification. | Modifié le (« Modifié » est un état) |

## Fichiers, corbeille et actions communes

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| fichier | file | Image, SVG, Lottie, audio ou PDF de la Médiathèque. | média, ressource / asset |
| fiche (d'un fichier) | file details | Nom, texte alternatif, utilisations, Remplacer. | — / info panel |
| envoyer, envoi | upload | Ajouter des fichiers à la Médiathèque. | importer, télécharger / import |
| fenêtre des envois | uploads panel | Le suivi des envois, en bas à droite. | — / upload queue |
| Prêt | Ready | Fichier vérifié, utilisable. | disponible / Done |
| refusé | rejected | Fichier non accepté après vérification. | — / invalid |
| Utilisé / Non utilisé | In use / Unused | Présent ou absent d'un brouillon et d'une version en ligne. | orphelin / Orphan |
| Public / Protégé | Public / Protected | Lisible par tous, ou par les abonnés concernés. | privé / Private |
| stockage, place occupée | storage, storage used | Ce que les fichiers occupent sur 1 Go. | espace disque / quota |
| poids | size | Taille du fichier en Mo. | — / weight |
| remplacer | replace | Un nouveau fichier du même type à sa place. | changer / swap |
| nettoyer | clean up | Effacer les restes d'envois interrompus. | purger / purge |
| indisponible (fichier) | unavailable | Fichier à la corbeille ou pas encore prêt. | supprimé |
| mettre à la corbeille | move to trash | Supprimer en gardant 30 jours pour restaurer. | supprimer, jeter / delete, trash (verbe) |
| restaurer | restore | Faire revenir de la Corbeille. | récupérer / recover, undelete |
| supprimer définitivement | delete permanently | Sans retour possible (Corbeille, catégorie, formule). | effacer définitivement / erase, purge |
| vider la corbeille | empty trash | Tout supprimer définitivement. | — |
| élément (de la Corbeille) | item | Fichier ou contenu dans la Corbeille. | objet / object |
| lot | batch | Ce qui est parti ensemble dans la Corbeille et en revient ensemble. | groupe / group |
| effacement automatique | auto-delete | La date où la Corbeille efface un élément. | — / purge |
| supprimer | delete | Sans passer par la Corbeille (un bloc d'un brouillon). | — / remove |
| retirer | remove | Enlever sans détruire (image d'un contenu, logo, lien). | supprimer / delete |
| effacer (un champ) | clear | Vider une recherche, des filtres. | — |
| enregistrer | save | Garder les changements. | sauvegarder, valider / submit |
| annuler (un geste) | undo | Défaire le dernier geste. | — / cancel |
| annuler (une fenêtre) | cancel | Fermer sans rien faire. | — / undo |
| dupliquer | duplicate | Copier un bloc juste après lui. | cloner / clone |
| renommer | rename | Changer un nom. | — |
| monter / descendre | move up / move down | Déplacer d'un rang. | — |
| poignée | drag handle | Prise pour ranger par glisser-déposer. | — / grip |

## Identité et apparence

| Français | English | Définition | À éviter (FR / EN) |
|---|---|---|---|
| Identité de l'admin / de l'app | Admin branding / App branding | Onglets des Paramètres. | — / Admin identity |
| marque, nom de la marque | brand, brand name | Le nom affiché partout ; « Ruche » à défaut. Les e-mails, qui ne lisent pas la base, disent « ton administration » / « your admin ». | Declikora (dans les e-mails) |
| Ruche | Ruche | Nom à défaut. Ne se traduit pas, n'apparaît jamais dans les textes. | — / Hive |
| à défaut | default | Ce qui s'affiche quand rien n'est choisi. | — |
| logotype | logo | Le logo complet, dans le menu et à la connexion. | logo (seul) / wordmark |
| monogramme | icon | Le petit signe de la marque : onglet du navigateur, connexion. | favicon, icône / favicon, logomark |
| monogramme animé | animated icon | Le monogramme de l'écran de connexion, animé. | — |
| écran de connexion | sign-in screen | La page de connexion. | page de login / login page |
| image de fond | background image | La photo à droite de l'écran de connexion. | — / cover |
| adresse e-mail de contact | contact email | Montrée à qui a perdu son téléphone ou son invitation. | — / support email |
| thème | theme | Clair, Sombre ou Automatique, propre à chaque membre. | mode, apparence / appearance |
| Automatique | System | Suit le thème de l'ordinateur. | Système / Auto |
| palette | palette | Une base et un accent, propres à chaque membre. Les noms des palettes (Neutrine, Pierrange…) ne se traduisent pas, comme Ruche. | couleurs / color scheme |
| décliner (un logo) | adapt | Faire un logo aux couleurs de chaque palette. | — / generate variants |
| langue | language | La langue de l'admin. | — / locale |

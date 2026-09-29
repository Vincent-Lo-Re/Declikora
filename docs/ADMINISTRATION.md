# Administration : ce qu'on met en place une fois pour toutes

> Décidé le 27/09/2026, par QCM. C'est la référence pour construire `web/`. Quand une décision change, on la change d'abord ici.
>
> Declikora repart de zéro. Rien n'est repris de l'ancien projet (`declikora-project`) sans être redécidé ici, et on emploie des mots courants.

Les sections 1 à 9 sont **décidées**. On coche chaque ligne quand elle est en place. La section 10 regroupe ce qui est **remis à plus tard**.

## Principes

- **Des mots courants** : brouillon, publication, catégorie, chapitre, leçon, modèle, médiathèque, corbeille…
- **La base de données fait la loi.** Chaque droit (qui lit, qui modifie, qui publie) est vérifié par la base elle-même, pas seulement caché dans l'interface. Chaque règle a son test pgTAP.

## 1. Sections du menu

- [x] **Accueil** : une page simple, avec tes brouillons récents et les publications programmées. On y arrive après la connexion.
- [x] **Blog** : les articles et leurs catégories.
- [x] **Podcasts** : les épisodes (le son fait partie de l'épisode) et leurs catégories.
- [x] **Méthodes** : une méthode contient des chapitres, et chaque chapitre contient des leçons. Le chapitre a sa propre introduction en blocs, affichée avant ses leçons. Chaque leçon a son contenu en blocs.
- [x] **Pages** : les pages simples de l'app (aide, mentions légales…).
- [x] **Modèles** : les modèles de blocs (voir § 5).
- [x] **Médiathèque** : tous les fichiers (voir § 6).
- [x] **Corbeille** : une seule, pour tout ce qui a été supprimé (voir § 3).
- [x] **Équipe** et **Paramètres**, réservés aux admins. Les Paramètres contiennent les formules d'abonnement.
- [x] **Mon compte** : double vérification, déconnexion.

## 2. Équipe, connexion et sécurité

- [x] **Deux rôles** :
  - **Admin** : tout ce que fait l'éditeur, plus l'équipe (inviter, changer un rôle, retirer quelqu'un, réinitialiser sa double vérification) et les paramètres (dont les formules d'abonnement).
  - **Éditeur** : écrit, publie, dépublie et supprime les contenus ; vide la corbeille ; gère les catégories, les modèles et la médiathèque.
- [x] **Sur invitation seulement.** Un admin saisit l'e-mail et le rôle de la personne. Personne ne peut s'inscrire seul (inscriptions fermées dans Supabase). Un compte ne reçoit une fiche d'équipe que si son rôle a été posé par la clé secrète (invitation) : un compte créé autrement n'a accès à rien. Le lien d'invitation est valable 10 minutes, comme le code ; « Renvoyer l'invitation » en envoie un nouveau.
- [x] **Connexion sans mot de passe** : on tape son e-mail, puis le code à 6 chiffres reçu par e-mail (valable 10 minutes). La page affiche le même message que l'adresse fasse partie de l'équipe ou non. Limite connue : l'API de Supabase, elle, laisse deviner si une adresse a un compte.
- [x] **Double vérification obligatoire pour tous.** Après le code reçu par e-mail, on saisit le code d'une app du téléphone (Google Authenticator, 1Password…). Elle se configure à la première connexion. Tant qu'elle n'est pas faite, la base refuse tout accès aux données.
- [x] **Téléphone perdu** : un admin réinitialise la double vérification d'un autre membre (ses sessions sont aussitôt fermées). Il faut donc **toujours au moins deux admins** : la page Équipe le rappelle tant qu'il n'y en a qu'un. La base garantit qu'il reste toujours un admin **capable d'agir** (invitation acceptée et double vérification configurée). On ne change pas son propre rôle, et on ne se retire pas soi-même.
- [x] **Premier admin (une seule fois, en production)** : l'inviter depuis le tableau de bord Supabase (Authentication › Users › Invite user), puis, dans l'éditeur SQL, poser son rôle avant qu'il accepte : `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"role":"admin"}' where email = '<son adresse>';`. Aucune adresse n'est écrite dans le dépôt.
- [x] **E-mails** (invitation, code) envoyés par **Brevo**, depuis `ne-pas-repondre@declikora.app` (domaine déjà authentifié dans Brevo : DKIM et DMARC), avec des textes en français.

## 3. Contenus et publication

- [x] **Brouillon, puis publication.** « Publier » envoie une copie figée dans l'app. On peut ensuite modifier le brouillon sans toucher à ce que voient les lecteurs, jusqu'à la publication suivante.
- [x] **Programmer** une publication à une date et une heure.
- [x] **Historique** des versions publiées, avec leur auteur et leur date. « Revenir à cette version » la recopie dans le brouillon.
- [x] **Retirer de l'app** (dépublier), sans supprimer le contenu.
- [x] **Supprimer** : tout ce qu'on supprime (articles, épisodes, méthodes, pages, modèles, fichiers) va dans **la corbeille**, commune à toute l'admin, avec un filtre par type. On peut l'en restaurer pendant 30 jours, puis il est effacé définitivement. S'il était publié, il disparaît aussi de l'app. L'admin et l'éditeur peuvent vider la corbeille avant la fin des 30 jours.
- [x] **Niveaux d'accès** : chaque contenu indique le niveau nécessaire pour le lire, gratuit ou une formule d'abonnement. **Il n'y a pas de niveau par défaut** : tant qu'on n'a pas choisi « Gratuit » ou une formule, « Publier » le demande, pour qu'aucun contenu ne parte gratuitement par oubli. Un admin crée, renomme et range les formules dans les Paramètres, de la moins complète à la plus complète. On en ajoute sans toucher au code.
- [x] **Accès d'une méthode** : un niveau pour toute la méthode, et on peut rendre gratuites quelques leçons, par exemple la première, pour la faire découvrir. L'**introduction d'un chapitre** est gratuite dès qu'une de ses leçons l'est ; sinon, elle suit le niveau de la méthode.
- [x] **Une méthode se publie d'un seul geste** : un seul bouton « Publier », celui de la méthode, envoie sa fiche, son plan et les chapitres et leçons modifiés. Une leçon ou un chapitre neuf reste caché de l'app tant qu'on n'a pas coché « Montrer dans l'app ». Avant de publier, l'admin montre la liste de ce qui va changer dans l'app et demande de confirmer.
- [x] **Catégories** : une liste pour le Blog, une autre pour les Podcasts, gérées par l'équipe. Un contenu peut en avoir une, plusieurs ou aucune (elles sont facultatives), et l'app s'en sert pour filtrer.
- [x] **Pour publier** un article, un épisode ou une méthode, il faut une **image de présentation** (la vignette des listes de l'app) ; le résumé est facultatif. Un épisode doit avoir son audio ; sa **transcription** est conseillée : l'éditeur avertit quand elle manque, comme pour le texte alternatif d'une image.
- [x] **Qui a fait quoi** : chaque version et chaque publication indique son auteur et sa date. Il n'y a pas de journal complet des actions.

## 4. Éditeur

- [x] Un contenu est une suite de **blocs**, qu'on ajoute, qu'on déplace par glisser-déposer et qu'on règle un par un.
- [ ] **Trois blocs au départ.** D'autres pourront s'ajouter ensuite, et l'app mobile devra savoir afficher chacun d'eux.
  - **Texte** : titres, paragraphes, listes, gras, italique, liens.
  - **Image** : l'image, sa légende et son texte alternatif.
  - **Encadré** : un bloc qui contient du texte et des images, avec un fond ou une bordure. Un encadré ne contient pas d'autre encadré.
- [x] **On écrit dans l'aperçu.** Au centre, le contenu tel qu'il apparaîtra sur le téléphone. À droite, les réglages du bloc choisi. À gauche, le plan du contenu (la liste des blocs), qu'on ouvre à la demande.
- [x] **Enregistrement automatique**, quelques secondes après chaque changement. Publier reste un geste volontaire.
- [x] **Un seul membre à la fois sur un brouillon.** Les autres le voient en lecture seule, avec le nom de la personne qui l'édite, et peuvent en reprendre la main.

## 5. Modèles de blocs

- [x] **Trois sortes de modèles.** On choisit la sorte en créant le modèle, et il n'y a rien à choisir à l'insertion.
  - **Mise en forme réutilisable** : on insère une copie déjà mise en forme, puis on y écrit son propre texte. Modifier le modèle ne change pas les contenus déjà écrits. Exemple : un encadré « À retenir ».
  - **Bloc identique partout** : le même bloc, avec le même texte, dans plusieurs contenus. On le corrige une seule fois dans le modèle, et il est corrigé dans tous les brouillons qui l'utilisent. Exemple : un encadré « Contact ». Il contient **un seul bloc** : pour en regrouper plusieurs, on les met dans un Encadré.
  - **Point de départ** : un nouveau contenu s'ouvre avec une structure déjà en place, au lieu d'une page vide. Exemple : « Interview ». Il appartient à **une section**, choisie en le créant (Blog, Podcasts, leçon ou chapitre d'une Méthode, Pages) : « Nouvel épisode » ne propose que les points de départ des Podcasts.
- [x] **Quand un bloc identique est modifié**, l'admin liste les contenus publiés qui l'utilisent et propose « Mettre à jour ces N contenus dans l'app ». Rien ne change dans l'app avant ce clic.
- [x] **Détacher** : dans un contenu, un bloc identique peut devenir une copie ordinaire, modifiable, qui ne suit plus le modèle. Les autres contenus restent liés.
- [x] **Supprimer** : un modèle identique partout ne peut pas être supprimé tant qu'il est utilisé. L'admin montre les contenus concernés, et « Détacher partout » en fait des copies ordinaires. On peut ensuite supprimer le modèle. Les deux autres sortes se suppriment librement, puisque les contenus n'en gardent que des copies.
- [x] **Création** : dans la section Modèles, ou depuis un contenu (on sélectionne des blocs, puis « Enregistrer comme modèle »).
- [x] **Droits** : admin et éditeur.

## 6. Médiathèque

- [x] **Une médiathèque commune**, avec une recherche et des filtres par type. Un fichier peut servir dans plusieurs contenus. On voit où il est utilisé, et on ne peut pas supprimer un fichier encore utilisé.
- [x] **Types de fichiers** : images, SVG, animations Lottie, audios, PDF. Pas de vidéo.
- [x] **Photos réduites automatiquement** avant l'envoi, à environ 300 Ko, sans différence visible. Les SVG, les animations Lottie, les audios et les PDF sont envoyés tels quels.
- [x] **SVG nettoyés à l'envoi** : un SVG peut contenir du code caché, qui est retiré.
- [x] **Informations sur un fichier** : un texte alternatif pour les images, une transcription pour les audios.
- [x] **Protection selon l'accès** : les fichiers des contenus gratuits sont publics. Ceux des contenus réservés sont protégés : l'app ne reçoit qu'un lien temporaire, et seulement pour un abonné du bon niveau. **Exception : l'image de présentation** d'un contenu publié (sa vignette dans les listes de l'app) est toujours publique, même si le contenu est réservé : elle sert de vitrine.
- [x] **Quand un contenu gratuit devient réservé**, ses fichiers redeviennent protégés à la publication suivante, et leurs anciennes adresses cessent de marcher en deux minutes au plus (le cache ne peut pas être vidé avec l'offre gratuite ; environ une minute avec l'offre Pro). Exception : un fichier qui sert encore dans un contenu gratuit publié reste public.
- [ ] **Côté app mobile** : savoir afficher les SVG et les animations Lottie.

## 7. Interface

- [x] **Kit de composants shadcn/ui avec Tailwind CSS**, dans son **style neutre** par défaut, sans couleur de marque.
- [x] **Thèmes clair, sombre et automatique** (qui suit l'ordinateur), au choix de chacun, dans Mon compte et dans le menu de l'avatar.
- [x] **Pensée pour l'ordinateur**, sur des écrans de 13 pouces et plus. Sous 1 024 px de large, un message invite à agrandir la fenêtre ou à passer sur un ordinateur.
- [x] **En français**, avec tous les textes de l'interface dans un seul fichier (`web/src/texts.ts`). L'interface tutoie.
- [x] **Menu à gauche, déplié**, repliable en icônes (avec une infobulle au survol). Rangement : Tableau de bord ; **Contenus** (Le Fil, Radio Éclaircies, Méthodes, Pages) ; **Outils** (Modèles de bloc, Médiathèque, Corbeille) ; en bas, Équipe et Paramètres (admins). En haut à droite, l'avatar du membre (initiale du prénom) ouvre un menu : nom et e-mail, Mon compte, Thème, Se déconnecter (29/09/2026). Icônes Lucide au trait d'un pixel. Noms affichés (29/09/2026) : Tableau de bord, Le Fil, Radio Éclaircies, Modèles de bloc ; les adresses (`/`, `/blog`, `/podcasts`, `/modeles`) et le code gardent les anciens noms.
- [x] **Dans l'éditeur, le menu se cache** : l'éditeur prend tout l'écran, et « ← Blog » (par exemple) ramène à la liste.
- [x] **Police Inter**, livrée avec l'admin, sans appel à Google.
- [x] **Dates courtes** : « 27 sept. 2026 à 14h30 », à l'heure de Paris (heures à la française : « 09h05 », décidé le 29/09/2026).
- [x] **Adresses en français** : `/blog`, `/mediatheque`, `/corbeille`, `/mon-compte`…

## 8. Mise en ligne et garde-fous

- [x] **Vercel**, qui met l'admin en ligne à chaque envoi sur GitHub. Le projet se crée en ligne de commande (`npx vercel login`, puis je configure).
- [x] **Demandes de fusion.** Chaque changement passe par une branche et une demande de fusion (pull request). Les garde-fous tournent, Vercel crée une adresse de test, et on ne fusionne dans `main` qu'avec le feu vert de l'utilisateur et des garde-fous au vert.
- [x] **Réglages GitHub** : une demande de fusion arrive sur `main` en un seul commit (titre et description de la demande), sa branche est supprimée ensuite, et les alertes de sécurité (Dependabot) sont actives.
- [x] **Vercel ne reconstruit l'admin que si `web/` change** (`ignoreCommand` dans `web/vercel.json`).
- [x] **Vercel attend les garde-fous** « Administration » et « Base de données » avant toute mise en production (Deployment Checks).
- [x] **Une adresse provisoire** pendant la construction : `declikora-admin.vercel.app`. Depuis la bascule, elle redirige vers `admin.declikora.app`.
- [x] **Bascule sur `admin.declikora.app`** quand la nouvelle administration est prête, à la place de l'ancienne (faite le 28/09/2026 : domaine ajouté au projet Vercel, enregistrement DNS `admin` chez Cloudflare sans proxy, adresse des e-mails et fonctions serveur mises à jour).
- [x] **Domaine principal : `declikora.app`** (déjà à nous, chez Cloudflare, DNS chez Cloudflare, à renouveler avant le 23/05/2027). `declikora.fr` est aussi à nous (chez Scaleway, à renouveler avant le 02/07/2027) : il pourra rediriger vers `declikora.app`.
- [x] **À chaque envoi sur GitHub** : mise en forme, relecture du code (lint), tests, vérification des types et construction de l'admin, et tests de la base (pgTAP).
- [x] **En-têtes de sécurité** : le navigateur refuse d'afficher l'admin dans un autre site, et n'exécute que ses propres scripts (et ceux de Supabase et Sentry).
- [x] **Tests de parcours**, lancés automatiquement : un robot ouvre l'admin dans un navigateur et refait les parcours principaux (se connecter avec les deux codes, écrire, publier).
- [x] **Alerte en cas d'erreur** dans l'admin en ligne (Sentry), sans données personnelles. Organisation « Declikora » (`declikora-zc`, données en Europe), projet `declikora-admin` (surveillance des erreurs seulement, alerte par e-mail sur les erreurs importantes). L'organisation ne stocke pas les adresses IP, impose le nettoyage des données sensibles, et ne partage rien publiquement. L'identifiant (`VITE_SENTRY_DSN`) et le nom de l'environnement sont dans Vercel.
- [x] **Sauvegarde de la base chaque semaine**, tant que l'offre gratuite n'en fait pas (décidé le 28/09/2026) : les données et la structure partent dans un fichier du dépôt GitHub (privé), gardé 90 jours. Les photos et les audios n'y sont pas : ils restent dans le stockage de Supabase.
- [ ] **Offre Pro de Supabase avant le lancement de l'app.** L'offre gratuite ne suffit pas pour les podcasts (vérifié le 27/09/2026) : 50 Mo au plus par fichier, 1 Go de stockage en tout, 5 Go téléchargés par mois, et un projet mis en pause après une semaine sans activité. L'offre Pro commence à 25 $ par mois, avec 100 Go de stockage.

## 9. Choix techniques

- [x] **Même version de Node partout** (la 24) : ton ordinateur, GitHub et Vercel.
- [x] **Deux environnements** : ton ordinateur (Supabase local) et la production (le projet Supabase « Declikora »). Pas de préproduction, parce que l'offre gratuite de Supabase est limitée à 2 projets actifs, déjà utilisés tous les deux.
- [x] **Fuseau horaire Europe/Paris** pour toutes les dates et les publications programmées.
- [x] **TanStack Query** : garde en mémoire les données déjà chargées, pour que l'admin reste rapide et à jour.
- [x] **React Hook Form + Zod** : gère les formulaires et affiche clairement les erreurs.
- [x] **Types générés depuis la base** après chaque migration (`supabase gen types`), pour que le code connaisse exactement les tables.
- [ ] **Forme de chaque bloc décrite une seule fois**, puis vérifiée par l'admin, par l'app et par la base.
- [x] **Prettier** : met le code en forme automatiquement.
- [x] **Playwright** pour les tests de parcours.
- [x] **Sentry hébergé en Europe.**
- [x] **Icônes Lucide**, celles que shadcn/ui utilise par défaut.

## 10. Remis à plus tard

- **Blocs pour les SVG, les animations Lottie et les PDF** : on les définira en travaillant sur les blocs.
- **Formules d'abonnement** : combien, leurs noms, et le service qui gère le paiement. On le décidera avec l'app mobile.

## 11. Ordre de construction proposé

1. **Socle** : Tailwind et shadcn/ui (style neutre), thèmes, textes en français, navigation, garde-fous GitHub, mise en ligne provisoire sur Vercel, alerte en cas d'erreur.
2. **Connexion et équipe** : e-mails, code par e-mail, double vérification, invitations, rôles, règles de la base et leurs tests.
3. **Médiathèque.**
4. **Éditeur de blocs** (Texte, Image, Encadré), avec l'enregistrement automatique et un seul membre à la fois.
5. **Publication** : brouillon et publication, historique, programmation, dépublier, corbeille, niveaux d'accès (avec les formules dans les Paramètres).
6. **Modèles de blocs.**
7. **Sections** : d'abord Pages, la plus simple, pour roder l'éditeur. Puis Blog, Podcasts, Méthodes, et enfin l'Accueil.
8. **Bascule sur `admin.declikora.app`.** Les tests de parcours s'écrivent au fil de la construction. L'offre Pro de Supabase se prend avant le lancement de l'app.

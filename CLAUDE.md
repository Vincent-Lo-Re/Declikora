# Declikora

Le projet a trois parties. Les deux applications sont en TypeScript et se connectent à Supabase avec `@supabase/supabase-js`.

| Dossier | Rôle | Techno principale |
|---|---|---|
| `web/` | Administration | React + Vite, éditeur Tiptap, glisser-déposer dnd-kit, tests Vitest |
| `mobile/` | App mobile | React Native + Expo, navigation Expo Router |
| `supabase/` | Base et serveur | Postgres, connexion des utilisateurs, stockage de fichiers, fonctions serveur, tests pgTAP |

Chaque dossier a son propre `package.json` et son propre `node_modules` (pas de workspace npm). Le `package.json` de la racine ne contient que le CLI Supabase.

**Nouveau départ.** Declikora reprend le produit de l'ancien dépôt `declikora-project`, mais repart de zéro. Aucun terme, aucune structure ni aucun choix de l'ancien projet n'est repris sans être redécidé. On emploie des mots courants.

**Administration** : les décisions sont dans [docs/ADMINISTRATION.md](docs/ADMINISTRATION.md). À lire avant de travailler sur `web/`.

**Bonnes pratiques** : [docs/BONNES-PRATIQUES.md](docs/BONNES-PRATIQUES.md) fait règle pour tout changement, pour l'utilisateur comme pour moi. Je la relis avant de travailler et je la suis ; une pratique qui change s'y écrit d'abord, avec l'accord de l'utilisateur.

## Versions de référence

Elles ont été vérifiées sur npm et Expo le 2026-09-27. Elles sont épinglées sans `^` dans `web/` et à la racine. Ne les monte pas sans vérifier la compatibilité.

**Administration (`web/`)**
- React 19.3, Vite 8.3, React Router 8.4
- Tiptap 3.31 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`)
- dnd-kit : `@dnd-kit/core` 6.3, `@dnd-kit/sortable` 10.0, `@dnd-kit/utilities` 3.2
- Tailwind CSS 4.3 + shadcn/ui (composants Base UI, style « base-nova », couleur de base neutre), icônes Lucide, police Inter
- Sentry 11 (`@sentry/react`)
- Vitest 5.0 (jsdom + Testing Library)
- ESLint 10.11 + typescript-eslint 8.70, Prettier 3.9
- **TypeScript 6.0, pas la 7** : typescript-eslint n'accepte pas encore la 7 (peer `<6.1.0`).

**App mobile (`mobile/`)** : c'est Expo qui fixe les versions
- Expo SDK 57 (57.0.25), React Native 0.86, React 19.2, Expo Router 57
- Reanimated 4.5, Gesture Handler 2.32, Screens 4.26
- TypeScript 6.0
- ESLint 9 via `eslint-config-expo`, installé par `expo lint`. Ce n'est pas la même version qu'en web, et c'est voulu.
- Ajouter une dépendance **uniquement** avec `npx expo install <paquet>`, jamais `npm install`. Voir aussi `mobile/AGENTS.md`.

**Base et serveur**
- Supabase CLI 2.118 (devDependency à la racine), supabase-js 2.117, Postgres 17

**Node 24 partout** : `.nvmrc` à la racine, `engines` dans les `package.json` (Vercel s'en sert), et les garde-fous GitHub.

## Commandes

```bash
# Administration
cd web && npm run dev          # serveur de dev
cd web && npm run lint         # ESLint
cd web && npm run lint:dead    # code, fichiers et dépendances inutilisés (knip, web/knip.json)
cd web && npm run lint:dup     # copier-coller de plus de 10 lignes (jscpd, web/.jscpd.json)
cd web && npm run format       # Prettier (format:check pour vérifier seulement)
cd web && npm test             # tests (test:watch pour relancer à chaque changement)
cd web && npm run test:e2e     # tests de parcours Playwright (Supabase local démarré, Realtime compris ; la 1re fois : npx playwright install chromium)
cd web && npm run build        # vérification des types + construction
cd web && npx shadcn add <composant>   # ajouter un composant shadcn/ui

# App mobile
cd mobile && npx expo start    # serveur de dev (génère aussi expo-env.d.ts)
cd mobile && npx expo lint
cd mobile && npm run typecheck
cd mobile && npx expo-doctor

# Supabase (Docker doit tourner)
npm run db:start               # démarre Supabase en local
npm run db:reset               # réapplique les migrations
npm run db:test                # tests pgTAP de supabase/tests/ (aides communes : supabase/tests/aides/roles.inc)
npm run functions:test         # fonctions serveur equipe et files (Deno via npx : format, lint, types, tests)
npm run functions:integration  # fonction files contre le Supabase local : vrais envois, tâche « fichiers » (~1 min)
cd web && npm run db:types     # après chaque migration : régénère web/src/lib/database.types.ts (+ Prettier)
cd web && npm run blocks:generate  # après chaque changement de blocks/ : types, validateurs, cas pgTAP, empreinte et, si le schéma a changé, nouvelle migration
npm run db:stop
```

## Configuration

- `web/.env` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (modèle dans `web/.env.example`)
- `mobile/.env` : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (modèle dans `mobile/.env.example`)
- Les fichiers `.env` sont ignorés par git. Par défaut, ils pointent vers le Supabase **local**. Les valeurs du projet en ligne sont en commentaire dans les `.env.example`.
- Projet Supabase en ligne : « Declikora », réf. `kajocxepxgaquculhrky` (https://kajocxepxgaquculhrky.supabase.co). Ne pas le confondre avec « Declikora-Project » (`qmjmfkepmvdusgwynltg`), qui appartient à un autre dépôt.
- Côté client, n'utiliser que la clé **publishable** (`sb_publishable_…`). La clé secrète (`sb_secret_…`) ne doit jamais se retrouver dans `web/` ni dans `mobile/`.
- Le client Supabase est dans `web/src/lib/supabase.ts` et `mobile/src/lib/supabase.ts`.

## Façon de travailler

- **Jamais directement sur `main`.** Chaque chantier a sa branche. Quand l'utilisateur dit « commite et pousse », je pousse la branche et j'ouvre une demande de fusion (pull request) sur GitHub.
- Les garde-fous (`.github/workflows/garde-fous.yml`) tournent sur chaque demande de fusion, et Vercel crée une adresse de test. Vercel ne met en production que si les garde-fous « Administration » et « Base de données » sont au vert (Deployment Checks) : si on renomme un de ces jobs, il faut aussi mettre à jour ce réglage dans Vercel.
- **Je ne fusionne que si tous les garde-fous sont au vert** (`gh pr checks`). L'offre GitHub gratuite ne permet pas de l'imposer sur un dépôt privé : c'est à moi de le respecter. Depuis le 27/09/2026, l'utilisateur m'a donné carte blanche pour construire ce qui est décidé dans docs/ADMINISTRATION.md : je fusionne moi-même quand tout est vert, sans attendre « fusionne ». Depuis le 28/09/2026, l'utilisateur essaie d'abord chaque modification sur l'admin locale : je ne fusionne qu'après son accord (docs/BONNES-PRATIQUES.md, § 1). Je fusionne une étape seulement quand la précédente est en ligne (base et fonctions), pour que l'admin en production reste cohérente avec sa base.
- La fusion se fait en un seul commit (`gh pr merge --squash`), avec le titre et la description de la demande : ils doivent donc être soignés. La branche est ensuite supprimée par GitHub.
- **Admin en ligne : https://admin.declikora.app** (projet Vercel `declikora-admin` ; enregistrement DNS `admin` chez Cloudflare, en CNAME vers Vercel, sans proxy). L'ancienne adresse `declikora-admin.vercel.app` y redirige. Une nouvelle adresse de l'admin doit aussi être ajoutée aux origines acceptées des fonctions `equipe` et `files` (`cors.ts`, puis `functions deploy`) et aux redirections de `[remotes.production.auth]` (`config push`).
- Services en ligne : Vercel `declikora-admin` (équipe `vincent-lo-re`, dossier `web`), Sentry `declikora-zc` / projet `declikora-admin` (Europe), Supabase « Declikora » (Paris), Brevo (e-mails, expéditeur `ne-pas-repondre@declikora.app`). Domaine : `declikora.app` (Cloudflare) ; `declikora.fr` (Scaleway) est aussi à nous. L'utilisateur m'a donné la main sur GitHub, Supabase, Vercel, Sentry et Brevo via Chrome ; chaque changement de réglage se fait avec son accord. Je ne saisis jamais de clé secrète (clé SMTP de Brevo…) : c'est l'utilisateur qui la colle.

## Administration : où ranger le code

- `web/src/texts.ts` : **tous** les textes de l'interface, en français. Aucun texte en dur dans les composants.
- `web/src/navigation.ts` : les sections (adresse en français, icône) et le rangement du menu. `web/src/routes.tsx` : les pages.
- `web/src/components/ui/` : les composants shadcn/ui (on peut les modifier ; leurs textes passent aussi par `texts.ts`). Seuls les morceaux et les variantes qui servent y restent.
- Briques communes (à réutiliser avant d'en écrire une autre) :
  - `web/src/components/load-state.tsx` : une liste pas encore chargée (lignes grises, ou message d'échec et « Réessayer ») ;
  - `web/src/components/ordered-names.tsx` : une liste de noms rangée par glisser-déposer, renommée, complétée, avec suppression confirmée (Catégories, Formules) : la liste au centre, l'ajout dans une colonne à droite (`lg:grid-cols-list-aside`) ;
  - `web/src/blocks/components/media-state.tsx` : une image à ses proportions, et un fichier choisi qui ne s'affiche pas (bloc Image, présentation) ;
  - la sélection en masse : `web/src/lib/bulk-trash.ts` (cocher, « Tout sélectionner » sur les lignes affichées, mise à la corbeille une par une où un refus attendu garde la ligne, « Annuler »), `web/src/components/bulk-selection.tsx` (case « Tout sélectionner » dans l'en-tête de la colonne des cases, bouton « Mettre à la corbeille (n) », lignes gardées) et `web/src/components/trash-dialog.tsx` (confirmation) : Médiathèque, listes de contenus et Modèles de bloc ; pour des contenus, tout passe par `components/contents/use-contents-selection.ts` (la base garde un contenu que quelqu'un d'autre écrit, ou un modèle encore utilisé : `keptContentDetail`) ;
  - `web/src/components/list-sorting.tsx` (`SortableList` : une liste à plat rangée par glisser-déposer, souris et clavier, annonces en français ; Catégories, Formules, et les lignes de `components/contents/sortable-rows.tsx` pour Le Fil, Radio Éclaircies et Méthodes, [D47] : `contents_reorder`) ;
  - `web/src/components/contents/row-cells.tsx` : les cellules « Dernière modification » (la date seule) et l'image de présentation des listes (Le Fil, Radio Éclaircies, Méthodes ; vignette de la Médiathèque ; images lues par `use-covers.ts`) ;
  - `web/src/components/search-input.tsx` (recherche avec notre bouton « Effacer la recherche »), `date-time-fields.tsx` (jour « 25/10/2099 » avec le calendrier, heure « 08h00 » ; lus par `parseDayInput` et `parseTimeInput` de `lib/dates.ts`), `media/audio-player.tsx` (lecteur audio) ;
  - `web/src/lib/auth.ts` (tous les appels de Supabase Auth des pages), `lib/people.ts` (nom affiché, initiale), `lib/errors.ts` (`errorMessage`), `lib/focus.ts` (`focusSoon`), `lib/refresh.ts` (relecture après une corbeille), `components/icon-badge.tsx` (une pastille avec une icône seule, son sens dans l'infobulle : état et utilisation des fichiers) ;
  - dans `texts.common`, les mots qui ne dépendent pas de la page (Réessayer, Enregistrer, Sans titre, Actions, « par … ») ; dans `web/src/index.css`, les jetons (`text-warning`, `bg-status-*`) et les utilitaires nommés (`grid-cols-media`, `grid-cols-label-value`, `grid-cols-list-aside`, `max-h-picker`, `pb-page`) ; `PageHeader` (`components/page-header.tsx`) met l'icône de la section devant le titre (`icon={sections.x.icon}`).
- `web/src/lib/dates.ts` : toutes les dates s'affichent avec `formatDateTime` (« 27 sept. 2026 à 14h30 », heure de Paris).
- `web/src/lib/media/format.ts` : tailles, durées, dimensions et pourcentages (« 12,5 Mo », « 3 min 05 s ») ; les unités sont dans `texts.media.units`.
- L'interface tutoie la personne (« Agrandis la fenêtre… »).
- `web/vercel.json` : en-têtes de sécurité (CSP). Un nouveau service appelé par le navigateur doit y être ajouté.
- `web/src/lib/media/` : la médiathèque sans React (reconnaissance des fichiers, réduction des photos, nettoyage des SVG, vérification des Lottie, envoi standard ou reprenable, file d'envoi, appels à la base et à la fonction `files`). Les écrans sont dans `web/src/pages/media-page.tsx`, `trash-page.tsx` et `web/src/components/media/` ; les envois se suivent dans la fenêtre des envois (`upload-window.tsx`, en bas à droite de toutes les pages avec le menu, montée dans `AppLayout`). Sélection en masse : une case par fichier (au survol d'une vignette, en première colonne de la liste), « Tout sélectionner » sur les fichiers affichés (case seule, avec son infobulle : en-tête de la colonne des cases, ou au-dessus de la grille), puis « Mettre à la corbeille (n) » fichier par fichier (`use-bulk-trash.ts`, avec les briques communes de la sélection en masse) ; un fichier encore utilisé est gardé, coché, et listé. « Remplacer… » dans la fiche d'un fichier (`components/media/replace-file.tsx`, [D48]) : le nouveau fichier passe par la file d'envoi, puis `replaceMedia` (brouillons) et, sur demande, `replaceMediaLive` (ce qui est en ligne) ; l'ancien part à la corbeille quand plus rien ne l'utilise. Le bouton « Non utilisés » et le badge « Non utilisé » lisent la colonne calculée `media_in_use` de la base (même règle que la corbeille). Après un envoi, une mise à la corbeille, un vidage ou « Nettoyer », l'admin appelle `files` avec la session (`kickFiles()` / `callFiles()`), puis relit les données (TanStack Query). De même après `publish` (si `needs_file_sync`), `unpublish` et `trash` d'un contenu (si `needs_file_sync`) : c'est ce qui rend un fichier public ou protégé tout de suite.
- Modèles de blocs : `web/src/lib/contents/templates.ts` (appels à la base) et `web/src/blocks/templates.ts` (copie, détachement, insertion, règle « un seul bloc », sans React). Les écrans : `web/src/pages/templates-page.tsx`, `web/src/components/templates/`, et l'éditeur plein écran (`editor-page.tsx`, sans publication quand `kind = template`). Un bloc lié s'affiche par `web/src/blocks/components/static-block.tsx`. Dans les tests de parcours, une page se crée par `createBlankPage` (`web/e2e/support/fixtures.ts`), qui passe par « Page vide » s'il existe des points de départ.
- Les tests Vitest des SVG lisent les fichiers types de `supabase/functions/files/fixtures/` (autorisés dans `vite.config.ts`, pendant les tests seulement) : un SVG nettoyé par l'admin doit rester accepté par le serveur. De même, `web/src/blocks/validators.test.ts` lit les cas partagés de `blocks/cases/`.
- Éditeur de blocs (étape 4) :
  - `web/src/blocks/` : sans React, `draft.ts` (créer, trouver, déplacer, préparer un brouillon : `cleanTextDoc` puis le validateur généré, 240 000 octets au plus), `dnd.ts` (règles de dépôt et détection des cibles), `registry.ts` (les blocs qu'on ajoute), `labels.ts`, `text/` (configuration de Tiptap et `cleanTextDoc`) ; avec React, `components/` (aperçu : `block-canvas.tsx` pour le glisser-déposer, un fichier par bloc, `preview.css` avec les mesures de `blocks.tokens.json`).
  - `web/src/lib/editor/` : `autosave.ts` (enregistrement automatique) et `edit-lock.ts` (verrou et sa machine d'états), sans React, testés avec de fausses minuteries ; les hooks `web/src/hooks/use-autosave.ts` et `use-edit-lock.ts` les branchent.
  - `web/src/lib/contents/api.ts` : table `contents`, RPC `content_create`, `save_draft`, `lock_*`, Realtime sur `edit_locks` (codes d'erreur dans `texts.editor.errors`).
  - Écrans : `web/src/pages/editor-page.tsx` (plein écran, hors `AppLayout`, chargé à part), `web/src/pages/content-list-page.tsx`, `web/src/components/editor/` (barre de mise en forme, plan, réglages, bandeau du verrou, choix d'une image).
  - Un nouveau bloc : son schéma dans `blocks/`, `npm run blocks:generate`, une entrée dans `registry.ts`, son affichage (`BlockBody` de `block-canvas.tsx`) et ses réglages (`components/editor/block-settings.tsx`).
  - L'éditeur du Fil (`kind = article`, `feed` dans `editor-page.tsx`, ADMIN § 4) : à gauche, les onglets Plan (`OutlinePanel`) et Blocs (`components/editor/blocks-library.tsx`, avec « Mes blocs » : `lib/contents/saved-blocks.ts`) ; à droite, « Article » (`components/editor/article-panel.tsx` : `readyItems` de `lib/contents/requirements.ts`, `FEED_SUMMARY_MAX` et `readingStats` de `blocks/draft.ts`) et « Bloc choisi » (`BlockSettings`), l'onglet suivant le bloc choisi. Au centre, `components/editor/feed-preview.tsx` : le cadre du téléphone (`.blocks-device` de `preview.css`, thème par `data-blocks-theme`), la barre de l'aperçu et la Lecture (`ReadView`) ; les choix sont dans `lib/editor/preview.ts`. Finitions : le plan (`OutlinePanel` avec `feed` : intertitres, points à vérifier, menu « … », lignes rangées par glisser-déposer avec `useBlockDrag` de `blocks/components/use-block-drag.ts`, partagé avec l'aperçu ; règles dans `lib/editor/outline.ts`), « / » dans un texte vide (`text-block.tsx`, `slash` du contexte des blocs ; `lib/editor/slash.ts`), un bloc glissé depuis l'onglet Blocs (glisser-déposer du navigateur, `lib/editor/library-drag.ts`) et la Concentration (`lib/editor/focus-mode.ts`). Les autres éditeurs gardent la présentation à droite et la glissière Réglages.
- Publication (étape 5) :
  - `web/src/lib/contents/publication.ts` : état de publication (`publicationStatus` : brouillon, en ligne, modifié, retiré ; programmé, en attente, échec), `publish`, `unpublish`, `schedule`, `unschedule`, historique (`versions`), `revert_to_version`, `trash` et `restore` d'un contenu. Codes d'erreur dans `texts.editor.errors`, échecs de programmation dans `texts.publication.scheduleErrors`.
  - Réglages du contenu (niveau d'accès, adresse d'une page) : partent avec le brouillon par `save_draft`, sous le verrou ; seuls les réglages changés sont envoyés (`settingsDiff` de `lib/contents/api.ts` : le niveau n'est envoyé qu'une fois choisi, [D41]), et un envoi rejoué repart avec les mêmes. `lib/contents/slug.ts` : règles de l'adresse.
  - `web/src/lib/dates.ts` : `parisToInstant` et `toParisParts` pour programmer (heure de Paris ↔ instant ; une heure qui n'existe pas au passage à l'heure d'été est refusée, l'heure doublée d'octobre prend la première).
  - `web/src/lib/access-levels.ts` (formules, page `/parametres` : `web/src/components/settings/access-levels-card.tsx`) ; `web/src/lib/trash.ts` (lots et filtre par type de la Corbeille).
  - Écrans : `web/src/components/editor/publication.tsx` (barre de publication, bandeau de programmation, fenêtres Publier, Programmer, Retirer, refus [D14]) avec son hook `use-publication.ts`, `content-settings-sheet.tsx`, `history-sheet.tsx`, `access-level-choice.tsx`.
  - Après `publish` (si `needs_file_sync`), `unpublish` (si `needs_file_sync`), `trash` (si `needs_file_sync`), `empty_trash` et `media_push` : `kickFiles()`, puis relire (TanStack Query : `contentKeys.publication`, `versions`, listes, `mediaKeys` « uses » et « outdated »).
- Sections (étape 7, partie 7a) :
  - Listes : `web/src/pages/content-list-page.tsx` (Blog, Podcasts, Pages : colonnes, recherche et filtres de `web/src/lib/contents/list-filters.ts`, sélection en masse vers la corbeille (un contenu que quelqu'un d'autre écrit est gardé, `keptContentDetail`), « Nouvel article » (…) : fenêtre `components/contents/new-content-dialog.tsx` avec titre, point de départ [D42] et réglages, puis l'éditeur ; « Réglages » d'une ligne : `components/contents/list-settings-sheet.tsx`) ; textes par sorte dans `texts.contentList.kinds`. Les réglages hors de l'éditeur (création, liste, cases du plan d'une méthode) passent par `web/src/lib/contents/settings.ts` : save_draft sous le verrou, pris le temps de l'enregistrement puis rendu. Les champs des réglages (titre, niveau, catégories, adresse) sont `ContentSettingsFields` de `content-settings-sheet.tsx`, partagés par la glissière et la fenêtre.
  - Catégories : `web/src/lib/categories.ts` (table `categories`, `categories_reorder`), hook `web/src/hooks/use-categories.ts`, écran `web/src/pages/categories-page.tsx` (`/blog/categories`, `/podcasts/categories`). Celles d'un contenu : réglage `category_ids` de `save_draft` (`ContentSettings.categoryIds`, dans `content-settings-sheet.tsx`).
  - Présentation d'un article ou d'un épisode (image de présentation, résumé, audio, [D46]) : `web/src/components/editor/presentation.tsx` ; ce qui manque pour publier ([D45], audio) : `web/src/lib/contents/requirements.ts`, montré par les fenêtres de `publication.tsx`. `MediaPicker` choisit une image ou un audio (`kind`).
  - Accueil : `web/src/pages/home-page.tsx`, lectures dans `web/src/lib/contents/home.ts`. `/mediatheque?fichier=<id>` ouvre la fiche d'un fichier (`mediaFilePath`).
  - Éditeurs : `contentEditorPath` (`web/src/navigation.ts`) mène un article à `/blog/<id>`, un épisode à `/podcasts/<id>`, une méthode à `/methodes/<id>`, un chapitre à `/methodes/chapitres/<id>` et une leçon à `/methodes/lecons/<id>` (`methodElementPath`).
  - Parcours Playwright : `web/e2e/sections.spec.ts` (Blog, Podcasts, Pages, Accueil). Ce que voit l'app : `appFeed` et `appCategories` de `web/e2e/support/sections.ts` (clé publishable, comme un anonyme) ; un audio dont le navigateur lit la durée : `silentMp3(secondes)` de `web/e2e/support/media.ts`.
- Méthodes (étape 7, partie 7b) :
  - une méthode, ses chapitres et ses leçons sont des lignes de `contents` ; le plan publié est `versions.outline` de la version en ligne de la méthode (`[{ chapterId, versionId, lessons: [{ lessonId, versionId }] }]`), et `private.live` en tire les chapitres et les leçons en ligne avec leur niveau réel (leçon gratuite, introduction [D43]) ;
  - RPC : `publish` et `schedule` d'une méthode (fiche, plan et éléments cochés, [D29]), `publish_preview` (à afficher avant de publier ou de programmer), `outline_reorder` (ranger l'arbre, sous le verrou de la méthode), `unpublish` et `trash` d'un chapitre ou d'une leçon ; lecture de l'app `app_method`. Contrat : docs/ARCHITECTURE-CONTENUS.md, « Fait à l'étape 7, partie 7b, base » ; tests `supabase/tests/45_methodes_droits.test.sql` et `46_methodes_regles.test.sql`.
  - Admin, sans React : `web/src/lib/contents/outline.ts` (l'arbre, ses déplacements et ses règles de dépôt, le plan en ligne, `elementState` : « en ligne », « modifié », « neuf », « sera retiré », « retiré », « caché ») et `web/src/lib/contents/methods.ts` (lecture de l'arbre, `publish_preview`, `outline_reorder`, `setElementFlags` : une case cochée depuis le plan est un réglage `in_app` / `is_free` de `save_draft`, sous le verrou de l'élément, pris puis rendu).
  - Écrans : la liste est `content-list-page.tsx` (`kind="method"` : niveau d'accès, taille du plan) ; l'écran d'une méthode est l'éditeur plein écran (`editor-page.tsx`, `kind="method"` : sa fiche dans l'aperçu et son plan à droite, sans blocs [D4]) ; le plan : `web/src/components/methods/method-outline.tsx` (dnd-kit, un `SortableContext` pour les chapitres et un par chapitre, zone de dépôt d'un chapitre vide, annonces dans `texts.methods.dnd`), `new-element-dialog.tsx` (« Nouveau chapitre », « Nouvelle leçon », points de départ [D42]) ; la liste des changements avant de publier ou de programmer : `method-changes.tsx` (branchée par `MethodPublication` de `use-publication.ts`) ; un chapitre ou une leçon : le même éditeur, sans barre de publication, avec `element-banner.tsx` et les cases dans `content-settings-sheet.tsx` (`ContentSettings.inApp`, `isFree`). « Modifié depuis la publication » d'une méthode vient de `publish_preview` (`use-method-pending.ts` pour les listes), jamais de la seule révision de sa fiche.
  - Parcours Playwright : `web/e2e/methodes.spec.ts` ; `appMethod`, `appOutline`, `createAccessLevel`, `lessonOrder`, `chapterOrder`, `methodVersions` dans `web/e2e/support/methods.ts` (`appContent` de `support/publication.ts` pour un chapitre ou une leçon).

## Mise en production de la base et des fonctions

- **C'est l'utilisateur qui lance les commandes de production** (`config push`, `db push`, `functions deploy`) : le garde-fou de Claude Code refuse que je les lance. Je prépare les commandes exactes, et je vérifie ensuite en lecture seule (`config diff`, appels à `public.ping()`, codes de retour des fonctions).
- Elles se lancent depuis **`~/Projets/Declikora-deploiement`**, une copie de travail de `main` réservée aux déploiements (jamais de fichiers en cours d'une autre étape). Avant chaque déploiement : `git -C ~/Projets/Declikora-deploiement fetch origin && git -C ~/Projets/Declikora-deploiement merge --ff-only origin/main`. Son `supabase/.temp` doit contenir `project-ref` **et** `pooler-url` (connexion IPv4 à la base ; sans lui, `db push` échoue sur « IPv6 is not supported »).
- Le SMTP de Brevo doit être branché dans le tableau de bord **avant** le premier `config push` : sur l'offre gratuite, Supabase refuse de modifier les modèles d'e-mails avec son service d'envoi intégré.
- Créer un compte en production (premier admin) se fait de la main de l'utilisateur (tableau de bord, puis SQL de docs/ADMINISTRATION.md § 2).
- **La base avant l'admin** : un changement avec une migration (ou une fonction) se fusionne en deux demandes : la migration seule, puis `db push` par l'utilisateur, puis l'admin qui s'en sert (docs/BONNES-PRATIQUES.md, § 1).
- Ordre : `npx supabase config diff` (relire), `npx supabase config push` (réglages d'auth : le bloc `[remotes.production]` de `supabase/config.toml` surcharge site_url et redirections), vérifier dans le tableau de bord que les inscriptions restent fermées, puis `npx supabase db push`, puis `npx supabase functions deploy <nom>`.
- Ne jamais déclarer `[auth.email.smtp]` dans `config.toml` : un `config push` effacerait le SMTP de Brevo réglé à la main dans le tableau de bord.
- La fonction `equipe` a `verify_jwt = false` et vérifie elle-même la session et `is_admin()`.
- La fonction `files` a aussi `verify_jwt = false` : sans session de membre, elle ne fait que le travail décidé par la base (modes `kick` et `audit`, avec un frein en base) ; avec un membre aal2 (`is_staff()`), tous les modes. Déploiement : `npx supabase functions deploy files`.
- Tâches planifiées (pg_cron + pg_net) : **rien à régler en ligne**. La tâche `publications` (chaque minute, `private.run_due_publications()`) publie les programmations dues. L'adresse de `files` et la clé publishable de production sont écrites par la migration dans `private.settings` ; `supabase/seed.sql` (local seulement, jamais poussé par `db push`) les remplace par les valeurs locales. Aucun secret n'est rangé dans la base.
- Le workflow planifié `.github/workflows/garder-actif.yml` appelle chaque jour `public.ping()` en production (clé publishable) pour éviter la pause du projet gratuit. Il ne tourne que depuis `main`.
- **Sauvegarde** (l'offre gratuite n'en fait pas) : `.github/workflows/sauvegarde.yml`, chaque lundi à 03:30 GMT ou à la main (Actions › « Sauvegarde de la base » › Run workflow). Il lit la base par le secret GitHub `SUPABASE_DB_URL` (chaîne « Session pooler », mot de passe compris, créée par l'utilisateur) et garde 90 jours un artifact : `roles.sql`, `structure.sql`, `donnees.sql` (schémas `public` et `private`) et `comptes.csv` (comptes sans aucun secret). Les fichiers du stockage n'y sont pas. Restauration : base vide aux migrations à jour (`db push`), puis `psql "<url>" -f donnees.sql` (le fichier coupe les déclencheurs le temps de l'import) ; les comptes se recréent par invitation.

## Conventions

- Schéma de la base : uniquement par des migrations dans `supabase/migrations/` (`npx supabase migration new <nom>`). Chaque table doit avoir sa politique RLS et un test pgTAP dans `supabase/tests/`, puis `cd web && npm run db:types` (le garde-fou « Base de données » refuse des types pas à jour).
- Forme des blocs : source unique dans `blocks/` (`blocks.schema.json` en draft-07 écrit à la main, `blocks.tokens.json`, cas partagés `cases/*.json` avec `{ description, variant, valid, data }`). Jamais de `oneOf`/`anyOf`/`allOf`/`format` (pg_jsonschema 0.3.3 : validation exponentielle, formats ignorés) : les unions s'écrivent en `if`/`then`/`else` sur `type`, avec `tsType` pour les types. On ne fait qu'ajouter. Tout ce qui en est tiré (`blocks/generated/`, `web/src/blocks/generated/`, `supabase/tests/aides/blocs-cas.inc`, migrations `…_schema_blocs.sql`) est produit par `cd web && npm run blocks:generate` et ne se modifie pas à la main ; les garde-fous le relancent (job « Administration ») et comparent l'empreinte de la base (job « Base de données »).
- Toute fonction créée par une migration : retirer l'`EXECUTE` à `public` et `anon` (et `authenticated` si elle n'est pas appelée par l'admin), et ne jamais rendre une fonction de `private` exécutable par `anon` ou `authenticated` (sauf `reader_can_open`) : `supabase/tests/05_prive.test.sql` le vérifie. Seules exceptions dans `public` pour `anon` : `ping()` et les lectures de l'app `app_*` (`security definer`, `stable`, `search_path` vide, qui ne lisent que ce qui est en ligne par `private.live`) ; une nouvelle `app_*` s'ajoute à la liste fermée de `05_prive.test.sql`.
- Tests pgTAP : un fichier par sujet, qui commence par `begin;` puis `\ir aides/roles.inc` (profils anonyme, éditeur aal1/aal2, admin, lecteur sans fiche). Les aides portent l'extension `.inc` : `supabase test db` lance tout `.sql` et `.pg`, sous-dossiers compris. Pour la publication, `aides/publication.inc` (contenus nommés, `pg_temp.save`, `pg_temp.publish`, fichiers, formules et catégories de départ ; `pg_temp.cover()` en « extra » de `pg_temp.draft` : un article ou un épisode ne se publie ni ne se programme sans image de présentation, [D45]). Une version ne se vide jamais (`TRUNCATE` refusé) : `pg_temp.empty_contents()` supprime les contenus, et leurs versions partent en cascade. Deux sessions (verrous de ligne) : `40_corbeille_concurrence.test.sql` ouvre la seconde par `dblink` (mot de passe local `postgres`), valide ses données puis les efface ; un tel fichier ne vide jamais `media` (un `TRUNCATE` bloquerait la seconde session).
- Routes mobiles dans `mobile/src/app/`. Le reste du code (composants, hooks, utilitaires) va en dehors de `src/app/`.
- Avant de dire qu'une tâche est finie, lancer le lint, la vérification des types et les tests de la partie touchée.

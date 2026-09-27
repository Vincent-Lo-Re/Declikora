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
cd web && npm run format       # Prettier (format:check pour vérifier seulement)
cd web && npm test             # tests (test:watch pour relancer à chaque changement)
cd web && npm run test:e2e     # tests de parcours Playwright (Supabase local démarré ; la 1re fois : npx playwright install chromium)
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
- **Je ne fusionne que si tous les garde-fous sont au vert** (`gh pr checks`). L'offre GitHub gratuite ne permet pas de l'imposer sur un dépôt privé : c'est à moi de le respecter. Depuis le 27/09/2026, l'utilisateur m'a donné carte blanche pour construire ce qui est décidé dans docs/ADMINISTRATION.md : je fusionne moi-même quand tout est vert, sans attendre « fusionne », et je déploie ce que l'étape demande (migrations, fonctions, config d'auth).
- La fusion se fait en un seul commit (`gh pr merge --squash`), avec le titre et la description de la demande : ils doivent donc être soignés. La branche est ensuite supprimée par GitHub.
- Services en ligne : Vercel `declikora-admin` (équipe `vincent-lo-re`, dossier `web`), Sentry `declikora-zc` / projet `declikora-admin` (Europe), Supabase « Declikora » (Paris), Brevo (e-mails, expéditeur `ne-pas-repondre@declikora.app`). Domaine : `declikora.app` (Cloudflare) ; `declikora.fr` (Scaleway) est aussi à nous. L'utilisateur m'a donné la main sur GitHub, Supabase, Vercel, Sentry et Brevo via Chrome ; chaque changement de réglage se fait avec son accord. Je ne saisis jamais de clé secrète (clé SMTP de Brevo…) : c'est l'utilisateur qui la colle.

## Administration : où ranger le code

- `web/src/texts.ts` : **tous** les textes de l'interface, en français. Aucun texte en dur dans les composants.
- `web/src/navigation.ts` : les sections (adresse en français, icône) et le rangement du menu. `web/src/routes.tsx` : les pages.
- `web/src/components/ui/` : les composants shadcn/ui (on peut les modifier ; leurs textes passent aussi par `texts.ts`).
- `web/src/lib/dates.ts` : toutes les dates s'affichent avec `formatDateTime` (« 27 sept. 2026 à 14:30 », heure de Paris).
- `web/src/lib/media/format.ts` : tailles, durées, dimensions et pourcentages (« 12,5 Mo », « 3 min 05 s ») ; les unités sont dans `texts.media.units`.
- L'interface tutoie la personne (« Agrandis la fenêtre… »).
- `web/vercel.json` : en-têtes de sécurité (CSP). Un nouveau service appelé par le navigateur doit y être ajouté.
- `web/src/lib/media/` : la médiathèque sans React (reconnaissance des fichiers, réduction des photos, nettoyage des SVG, vérification des Lottie, envoi standard ou reprenable, file d'envoi, appels à la base et à la fonction `files`). Les écrans sont dans `web/src/pages/media-page.tsx`, `trash-page.tsx` et `web/src/components/media/`. Après un envoi, une mise à la corbeille, un vidage ou « Nettoyer », l'admin appelle `files` avec la session (`kickFiles()` / `callFiles()`), puis relit les données (TanStack Query).
- Les tests Vitest des SVG lisent les fichiers types de `supabase/functions/files/fixtures/` (autorisés dans `vite.config.ts`, pendant les tests seulement) : un SVG nettoyé par l'admin doit rester accepté par le serveur.

## Mise en production de la base et des fonctions

- Ordre : `npx supabase config diff` (relire), `npx supabase config push` (réglages d'auth : le bloc `[remotes.production]` de `supabase/config.toml` surcharge site_url et redirections), vérifier dans le tableau de bord que les inscriptions restent fermées, puis `npx supabase db push`, puis `npx supabase functions deploy <nom>`.
- Ne jamais déclarer `[auth.email.smtp]` dans `config.toml` : un `config push` effacerait le SMTP de Brevo réglé à la main dans le tableau de bord.
- La fonction `equipe` a `verify_jwt = false` et vérifie elle-même la session et `is_admin()`.
- La fonction `files` a aussi `verify_jwt = false` : sans session de membre, elle ne fait que le travail décidé par la base (modes `kick` et `audit`, avec un frein en base) ; avec un membre aal2 (`is_staff()`), tous les modes. Déploiement : `npx supabase functions deploy files`.
- Tâches planifiées (pg_cron + pg_net) : **rien à régler en ligne**. L'adresse de `files` et la clé publishable de production sont écrites par la migration dans `private.settings` ; `supabase/seed.sql` (local seulement, jamais poussé par `db push`) les remplace par les valeurs locales. Aucun secret n'est rangé dans la base.
- Le workflow planifié `.github/workflows/garder-actif.yml` appelle chaque jour `public.ping()` en production (clé publishable) pour éviter la pause du projet gratuit. Il ne tourne que depuis `main`.

## Conventions

- Schéma de la base : uniquement par des migrations dans `supabase/migrations/` (`npx supabase migration new <nom>`). Chaque table doit avoir sa politique RLS et un test pgTAP dans `supabase/tests/`, puis `cd web && npm run db:types` (le garde-fou « Base de données » refuse des types pas à jour).
- Toute fonction créée par une migration : retirer l'`EXECUTE` à `public` et `anon` (et `authenticated` si elle n'est pas appelée par l'admin), et ne jamais rendre une fonction de `private` exécutable par `anon` ou `authenticated` (sauf `reader_can_open`) : `supabase/tests/05_prive.test.sql` le vérifie.
- Tests pgTAP : un fichier par sujet, qui commence par `begin;` puis `\ir aides/roles.inc` (profils anonyme, éditeur aal1/aal2, admin, lecteur sans fiche). Les aides portent l'extension `.inc` : `supabase test db` lance tout `.sql` et `.pg`, sous-dossiers compris.
- Routes mobiles dans `mobile/src/app/`. Le reste du code (composants, hooks, utilitaires) va en dehors de `src/app/`.
- Avant de dire qu'une tâche est finie, lancer le lint, la vérification des types et les tests de la partie touchée.

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
npm run db:test                # tests pgTAP de supabase/tests/
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
- **Je ne fusionne que quand l'utilisateur dit « fusionne », et seulement si tous les garde-fous sont au vert** (`gh pr checks`). L'offre GitHub gratuite ne permet pas de l'imposer sur un dépôt privé : c'est à moi de le respecter.
- La fusion se fait en un seul commit (`gh pr merge --squash`), avec le titre et la description de la demande : ils doivent donc être soignés. La branche est ensuite supprimée par GitHub.
- Services en ligne : Vercel `declikora-admin` (équipe `vincent-lo-re`, dossier `web`), Sentry `declikora-zc` / projet `declikora-admin` (Europe), Supabase « Declikora » (Paris), Brevo (e-mails, expéditeur `ne-pas-repondre@declikora.app`). Domaine : `declikora.app` (Cloudflare) ; `declikora.fr` (Scaleway) est aussi à nous. L'utilisateur m'a donné la main sur GitHub, Supabase, Vercel, Sentry et Brevo via Chrome ; chaque changement de réglage se fait avec son accord. Je ne saisis jamais de clé secrète (clé SMTP de Brevo…) : c'est l'utilisateur qui la colle.

## Administration : où ranger le code

- `web/src/texts.ts` : **tous** les textes de l'interface, en français. Aucun texte en dur dans les composants.
- `web/src/navigation.ts` : les sections (adresse en français, icône) et le rangement du menu. `web/src/routes.tsx` : les pages.
- `web/src/components/ui/` : les composants shadcn/ui (on peut les modifier ; leurs textes passent aussi par `texts.ts`).
- `web/src/lib/dates.ts` : toutes les dates s'affichent avec `formatDateTime` (« 27 sept. 2026 à 14:30 », heure de Paris).
- L'interface tutoie la personne (« Agrandis la fenêtre… »).
- `web/vercel.json` : en-têtes de sécurité (CSP). Un nouveau service appelé par le navigateur doit y être ajouté.

## Conventions

- Schéma de la base : uniquement par des migrations dans `supabase/migrations/` (`npx supabase migration new <nom>`). Chaque table doit avoir sa politique RLS et un test pgTAP dans `supabase/tests/`.
- Routes mobiles dans `mobile/src/app/`. Le reste du code (composants, hooks, utilitaires) va en dehors de `src/app/`.
- Avant de dire qu'une tâche est finie, lancer le lint, la vérification des types et les tests de la partie touchée.

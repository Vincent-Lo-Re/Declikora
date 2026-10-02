# Bonnes pratiques de développement

> Adoptées le 28/09/2026. Elles font règle pour tout changement du dépôt (code, base, fonctions, tests, documentation), qu'il soit fait par l'utilisateur ou par Claude. Quand une pratique change, on la change d'abord ici, avec l'accord de l'utilisateur.
>
> Le détail est ailleurs : les décisions dans [ADMINISTRATION.md](ADMINISTRATION.md), l'architecture dans [ARCHITECTURE-CONTENUS.md](ARCHITECTURE-CONTENUS.md), les commandes et l'emplacement du code dans [CLAUDE.md](../CLAUDE.md).

## 1. Façon de travailler

- **Une branche par chantier**, jamais de travail directement sur `main`. Chaque chantier passe par une demande de fusion, fusionnée en un seul commit (`gh pr merge --squash`) : son titre et sa description doivent donc être soignés.
- **Essai en local d'abord** : l'utilisateur essaie la modification sur l'admin locale (Supabase local et `npm run dev`). On ne la fusionne qu'après son accord.
- **Garde-fous au vert avant toute fusion** : « Administration », « Base de données », « Fonctions serveur » et « Parcours ».
- **Une fusion à la fois** : on attend que la précédente soit en ligne avant de fusionner la suivante. Sur `main`, les garde-fous ne s'arrêtent jamais l'un l'autre (`.github/workflows/garde-fous.yml`) : Vercel ne met une fusion en ligne que si ses propres garde-fous sont verts.
- **Décisions par QCM**, puis écrites dans `docs/`. On emploie des mots courants, et rien de l'ancien projet (`declikora-project`) n'est repris sans être redécidé.
- **Offres gratuites** tant qu'aucun abonnement n'a été décidé.
- **Mise en production de la base et des fonctions** : c'est l'utilisateur qui lance les commandes, depuis `~/Projets/Declikora-deploiement`, dans l'ordre `config push`, `db push`, `functions deploy`. Une étape n'est fusionnée que lorsque la précédente est en ligne.
- **La base avant l'admin** : un changement qui a besoin d'une migration (ou d'une fonction serveur) se fusionne en deux fois. D'abord une demande de fusion avec la migration seule, sans rien changer à l'admin, puis `db push` (ou `functions deploy`). Ensuite seulement, la demande de fusion de l'admin qui s'en sert. Vercel met l'admin en ligne dès que les garde-fous de `main` sont verts : sans cet ordre, l'admin en ligne appelle une base qui n'est pas prête (arrivé le 29/09/2026 avec la Médiathèque).

## 2. Interface (React, shadcn/ui, Tailwind CSS)

- **Réutiliser avant d'écrire** : les briques communes sont listées dans `CLAUDE.md` (« Briques communes »). Dès qu'un morceau apparaît une deuxième fois, on l'extrait. Le garde-fou refuse un copier-coller de plus de 10 lignes (jscpd).
- **Rien n'est laissé à l'apparence du navigateur** quand l'admin a son composant : les infobulles passent par `Tooltip` (ESLint refuse l'attribut `title`), la recherche par `SearchInput`, le jour et l'heure par `DayField` et `TimeField` (« 25/10/2099 », « 08h00 »), l'audio par `AudioPlayer` ; les barres de défilement suivent le thème (`web/src/index.css`). Seuls restent au navigateur la fenêtre « Quitter le site ? » et le choix des fichiers, qu'on ne peut pas remplacer.
- **shadcn/ui : seulement ce qui sert.** Après `npx shadcn add`, on retire les morceaux et les variantes inutilisés.
- **Composants shadcn/ui** (sur Base UI) avant tout sur-mesure, adaptés dans `web/src/components/ui/`. Icônes Lucide, avec un trait d'un pixel pour toute l'admin (`LucideProvider` dans `web/src/components/app-providers.tsx`) : pas d'épaisseur réglée icône par icône. **Seule exception** (02/10/2026) : un logo de marque, là où il désigne cette marque et nulle part ailleurs, tiré de Simple Icons (licence CC0) dans `web/src/components/brand-icons.tsx`, dessiné en contour d'un pixel comme les icônes Lucide ; aujourd'hui, Apple et Android dans l'aperçu du téléphone. Jamais dans l'app publique.
- **Couleurs : seulement des jetons du thème**, jamais la palette de Tailwind (`amber-500`, `emerald-500`…). **Pas de valeur arbitraire chiffrée** (`w-[390px]`) : un jeton, ou un utilitaire nommé dans `web/src/index.css`. ESLint refuse les deux, comme le style en ligne (les exceptions autorisées se marquent sur leur ligne, avec la raison).
- **Jetons du thème** pour les couleurs (`bg-card`, `text-muted-foreground`, `text-destructive`, `text-warning`, pastilles `bg-status-live`, `bg-status-modified`, `bg-status-new`, `bg-status-removing`…, dans `web/src/index.css`) et **échelle Tailwind** pour les tailles et les espacements : aucune couleur ni valeur en dur. Les thèmes clair et sombre suivent alors tout seuls.
- **Pas de style en ligne**, sauf pour une valeur qui change en direct (position pendant un glisser-déposer, mesure d'un élément). Ce qui se calcule à partir d'une mesure se déclare en CSS (`web/src/index.css`), avec les jetons.
- **Tous les textes dans `web/src/texts.ts`**, en français, en tutoyant la personne. Aucun texte en dur dans un composant. Les mots qui ne dépendent pas de la page (Réessayer, Enregistrer, Sans titre…) sont dans `texts.common`. Quand on retire un usage, on retire aussi son texte.
- **Dates** avec `formatDateTime` (heure de Paris) ; **tailles, durées et pourcentages** avec `web/src/lib/media/format.ts`.
- **Accessibilité** :
  - chaque zone et chaque bouton a un nom ;
  - après une action, le focus va à un endroit logique, jamais perdu en haut de la page ;
  - les changements importants sont annoncés aux lecteurs d'écran (`role="status"`) ;
  - le glisser-déposer marche aussi au clavier ;
  - les animations se coupent si l'ordinateur le demande (`motion-reduce`).
- **Logique à part** : les règles pures vont dans `web/src/lib/`, sans React, et se testent seules. Un fichier de composant n'exporte que des composants. **Les pages et les composants n'appellent jamais Supabase** : tout passe par `lib/` (`lib/auth.ts` pour la connexion).
- **Données** avec TanStack Query : des clés rangées (`mediaKeys`, `contentKeys`…), jamais écrites sur place, et une relecture après chaque écriture. **Formulaires** avec React Hook Form et Zod.
- **Écran d'ordinateur** : l'admin est faite pour 1 024 px de large au moins.
- **Un nouveau service appelé par le navigateur** s'ajoute aux règles de sécurité (CSP) de `web/vercel.json`.

## 3. TypeScript et qualité du code

- **TypeScript strict** : `import type` pour les types, ni `enum` ni paramètres-propriétés (`erasableSyntaxOnly`).
- **Types tirés de la base** : `cd web && npm run db:types` après chaque migration.
- **Versions épinglées** sans `^` ; on n'en monte une qu'après avoir vérifié la compatibilité. Node 24 partout.
- **Lint (ESLint), mise en forme (Prettier), types et tests** passent avant chaque envoi.
- **Noms en anglais dans le code, commentaires en français**, qui expliquent le pourquoi plutôt que le comment.
- **Un fichier n'exporte que ce qui sert ailleurs**, et rien ne reste inutilisé : le garde-fou le vérifie (knip, configuré par `web/knip.json` ; `npm run lint:dead`).
- **Une règle métier chiffrée** (durée, longueur maximale…) se définit une seule fois, et tout le reste s'en sert (`TITLE_MAX`, `MAX_NAME_LENGTH`, `isLockAlive`…).

## 4. Base de données (Supabase, Postgres)

- **Le schéma ne change que par des migrations** (`supabase/migrations/`), jamais à la main en ligne.
- **Chaque table a ses règles d'accès (RLS) et son test pgTAP.** La base fait la loi : l'interface ne fait que cacher ce qu'on n'a pas le droit de faire.
- **Les écritures sensibles passent par des fonctions de la base** (RPC). Elles vérifient le rôle, la double vérification et la révision, et renvoient des erreurs au code stable (`P0001` et un message court), traduites dans `texts.ts`.
- **Fonctions `security definer`** avec un `search_path` vide, et sans `EXECUTE` pour `public` ni `anon`. Le schéma `private` n'est jamais exécutable par `anon` ni `authenticated` (sauf `reader_can_open`). `anon` n'exécute qu'une liste fermée (`ping` et les `app_*`), vérifiée par `supabase/tests/05_prive.test.sql`.
- **Forme des blocs** : décrite une seule fois dans `blocks/`, puis `cd web && npm run blocks:generate`. On ne fait qu'ajouter ; ni `oneOf`, ni `anyOf`, ni `format`.
- **Aucun secret rangé dans la base**, tâches planifiées comprises.

## 5. Fonctions serveur et fichiers

- **Les fonctions `equipe` et `files` vérifient elles-mêmes** la session et le rôle, n'acceptent que les origines connues (`cors.ts`) et peuvent être relancées sans risque.
- **La clé secrète reste côté serveur** ; le navigateur et l'app n'ont que la clé publishable.
- **SVG et Lottie** : nettoyés ou vérifiés dans l'admin, puis vérifiés par le serveur avec une liste blanche. Les fichiers restent protégés, sauf ceux d'un contenu gratuit en ligne et les images de présentation.

## 6. Tests

- **Vitest** pour la logique et les écrans, avec des données et une horloge simulées.
- **Playwright** pour les parcours complets, sur le Supabase local. Les comptes de test sont créés puis effacés par les tests, qui peuvent se rejouer.
- **pgTAP** pour les droits et les règles de la base ; **Deno** pour les fonctions serveur.
- **Chaque changement arrive avec ses tests**, et un comportement retiré emporte les siens.
- **Avant de dire « fini »** : lint, types et tests de la partie touchée.
- **Les essais locaux de l'utilisateur sont protégés** : ni remise à zéro de la base locale (`db:reset`), ni lancement de tous les parcours Playwright sans le prévenir (ils vident la corbeille, par exemple). Une nouvelle migration s'applique avec `npx supabase migration up`.

## 7. Sécurité et production

- **Double vérification obligatoire** pour toute l'équipe, et fiche d'équipe **sur invitation seulement**.
- **Aucun secret dans le dépôt ni dans le navigateur.** Les secrets sont saisis par l'utilisateur lui-même (tableaux de bord, secrets GitHub).
- **Vercel ne met en ligne** que si les garde-fous « Administration » et « Base de données » sont verts.
- **Suivi** : Sentry (en Europe, sans données personnelles), sauvegarde de la base chaque semaine, et un appel chaque jour pour que le projet gratuit ne se mette pas en pause.
- **Dependabot** surveille les dépendances. Une alerte se traite par une mise à jour vérifiée, jamais par un correctif forcé qui casse le reste.
- **Offre Pro de Supabase** avant le lancement de l'app.

## 8. App mobile (plus tard)

- On ne l'attaque qu'une fois l'administration terminée.
- Dépendances ajoutées avec `npx expo install`, jamais `npm install`. Les écrans vont dans `mobile/src/app/`, le reste en dehors, et les mêmes règles s'appliquent.

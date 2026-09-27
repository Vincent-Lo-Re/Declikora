# Contenus : architecture (étapes 3 à 7)

> Rédigé le 27/09/2026, révisé le même jour après deux relectures critiques. Références : `docs/ADMINISTRATION.md` (cité **« ADMIN § n »**) et `CLAUDE.md`. Un renvoi « § n » ou « § n.m » sans autre mention désigne une partie de **ce** document.
> Point de départ : l'étape 2 (branche `etape-2-connexion`) est considérée comme faite, avec `public.profiles`, les rôles `admin` et `editor`, et `public.is_staff()` / `public.is_admin()`, qui exigent la double vérification (aal2) et que `anon` ne peut pas exécuter. La règle « fiche d'équipe sur invitation seulement » y est en place : un compte ne reçoit une fiche que si son rôle a été posé dans `app_metadata` par la clé secrète (§ 6.0, point 1).
> Cadre : l'offre **gratuite** de Supabase (500 Mo de base, 1 Go de fichiers, 50 Mo par fichier, pas de transformation d'images, pas de vidage du cache CDN) et Vercel Hobby. L'offre Pro reste prévue avant le lancement de l'app (ADMIN § 8), mais rien ici n'en dépend.
> Chaque partie commence par un **En bref** pour une lecture sans connaissances techniques. Le détail qui suit s'adresse au développeur. Les choix que j'ai faits sans toi sont notés **[Dn]** et regroupés au § 8.1 ; les questions qui n'appartiennent qu'à toi sont au § 8.2.

## En bref

1. Tout ce qui s'écrit (article, épisode, méthode, chapitre, leçon, page, modèle) est rangé dans **une seule table**. On écrit donc une seule fois l'éditeur, l'enregistrement automatique, le verrou « un seul à la fois » et la corbeille.
2. Chaque contenu a **un brouillon**. « Publier » en fait une **copie figée**, que l'app lit. Les copies successives forment l'historique.
3. Une méthode se publie **d'un seul geste**, avec son plan (ordre des chapitres et des leçons) et toutes les leçons modifiées. C'est un choix à valider (question 4) : une leçon neuve reste cachée tant qu'on n'a pas coché « Montrer dans l'app », et l'admin montre la liste de ce qui va partir avant de publier.
4. La forme des blocs est décrite **une seule fois**. L'admin, l'app et la base vérifient chacune ce même fichier.
5. Tout fichier arrive **protégé**. Il ne devient public que quand un contenu gratuit publié l'utilise, et redevient protégé sinon. Sans l'offre Pro, son ancienne adresse publique peut encore marcher quelques minutes : c'est une question pour toi (question 5).
6. Les publications programmées, la vidange de la corbeille et le rangement des fichiers se font **dans Supabase**, par des tâches planifiées et une seule fonction serveur.
7. L'app ne lit jamais les tables : elle appelle quelques **fonctions de lecture** qui ne renvoient que ce qui est publié, et seulement ce que le lecteur a le droit de voir.
8. Construction en 5 étapes (3 à 7), chacune avec ses migrations, ses écrans et ses tests, lancés automatiquement sur GitHub. **Cinq questions** restent pour toi (§ 8.2).

---

## 1. Modèle de données

> **En bref** : sept tables pour les contenus et les fichiers, plus deux petites tables techniques (verrou d'édition et contrôle des fichiers). Un contenu est une ligne avec son brouillon ; chaque publication est une ligne à part, qu'on ne modifie jamais.

### 1.1 Conventions

- **Noms en anglais**, comme `profiles` à l'étape 2 **[D1]**. Tous les libellés restent en français dans `web/src/texts.ts`.
- **Schéma `public`** : les tables (RLS active partout) et les fonctions appelables (RPC). **Schéma `private`**, non exposé par l'API (`config.toml` n'expose que `public` et `graphql_public`) : les fonctions internes, les vues de calcul et les schémas JSON. Toute fonction `security definer` a `set search_path = ''` et des noms qualifiés (`public.contents`…).
- **Droits de départ**, comme pour `profiles` : `revoke all … from anon, authenticated`, puis on ne rend que ce qui est listé au § 3.1. Dans `private`, la migration de l'étape 3 retire aussi l'`EXECUTE` que Postgres donne par défaut à `PUBLIC` sur toute nouvelle fonction (§ 4.5).
- **Les politiques écrivent `(select public.is_staff())`** et sont déclarées `to authenticated`. `anon` n'a pas le droit d'exécuter `is_staff()` : une politique qui l'appellerait pour `anon` lèverait une erreur de droits.
- **Chaque RPC de l'admin** est `security definer`, son `EXECUTE` est retiré à `public` et `anon`, et sa première ligne refuse si `not public.is_staff()` (ou `is_admin()`). Ce garde n'est **que** dans la RPC publique : le travail lui-même est dans une fonction interne sans garde (`private.do_publish(content_id, author_id, origin)`, `private.do_unpublish…`), que la RPC appelle avec `auth.uid()` et que les tâches planifiées appellent avec l'auteur voulu. Sous pg_cron, `auth.uid()` et `auth.jwt()` sont nuls et `is_staff()` vaut faux (§ 3.8).
- **Les erreurs** suivent la forme de l'étape 2 : un `message` court et stable (`verrou_perdu`, `conflit_revision`, `fichier_utilise`, `adresse_prise`…) que l'interface traduit via `texts.ts`, et un `detail` en français.
- **Fonctions réservées à la fonction Edge** : comme `team_members()` à l'étape 2, ce sont des fonctions `public.files_*` en `security definer`, dont l'`EXECUTE` est retiré à `public`, `anon` et `authenticated` et accordé à `service_role` seulement (§ 3.7). La fonction Edge ne peut pas appeler une fonction de `private` par l'API, même avec la clé secrète.
- **Dates** en `timestamptz`. L'affichage à l'heure de Paris reste le travail de `formatDateTime`.
- **Auteurs** :
  - dans `contents` et `media`, `created_by`, `draft_saved_by`, `deleted_by`, `scheduled_by` référencent `public.profiles(id)` `on delete set null`. Le garde de corbeille de `contents` laisse passer ces mises à `null` (§ 3.2) ;
  - dans `versions`, `published_by` est un simple `uuid` **sans clé étrangère**, et le nom est recopié dans `published_by_name`. Une version ne change jamais : une clé `on delete set null` serait une modification, refusée par son trigger, et bloquerait le retrait d'un membre qui a déjà publié ;
  - dans `edit_locks`, `holder_id` → `profiles` `on delete set null` : retirer un membre libère ses verrous.

### 1.2 Vue d'ensemble

| Table | Rôle | Créée à l'étape |
|---|---|---|
| `media` | La médiathèque. | 3 |
| `media_audit` | Le résultat du contrôle hebdomadaire des fichiers orphelins. | 3 |
| `contents` | Tout ce qui s'écrit, avec son brouillon unique et son état (en ligne, programmé, corbeille). | 4 |
| `edit_locks` | Qui écrit quel brouillon en ce moment (verrou « un seul à la fois »). | 4 |
| `categories`, `content_categories` | Les catégories du Blog et des Podcasts, et leur lien avec les brouillons. | 4 (l'écran arrive à l'étape 7) |
| `versions` | Les copies figées : ce que lit l'app, et l'historique. | 5 |
| `access_levels` | Les formules d'abonnement, rangées de la moins complète à la plus complète. « Gratuit » n'est pas une ligne. | 5 |
| `reader_access` | **Provisoire** : la formule de chaque lecteur, pour écrire et tester les règles des contenus réservés. Vide jusqu'au choix du paiement. | 5 |

### 1.3 `access_levels` (formules)

- `id uuid`, `name text` (non vide, unique), `rank int` avec `unique (rank) deferrable initially deferred`, pour réordonner en une transaction.
- Écriture : `is_admin()` seulement (insertion, renommage). Le rangement passe par `access_levels_reorder(ids uuid[])`, qui réécrit tous les rangs d'un coup.
- **Suppression** : ADMIN § 3 ne prévoit que créer, renommer et ranger. J'ajoute la suppression d'une formule **inutilisée** (aucune ligne de `contents` ni de `versions` ne s'en sert : `on delete restrict`), pour réparer une formule créée par erreur **[D32]**. On peut toujours renommer ou déplacer.
- Les versions figent l'**identifiant** de la formule, pas son rang : réordonner les formules change tout de suite ce que chaque abonné peut ouvrir **[D2]**. C'est un réglage de l'admin, pas une modification de contenu.

### 1.4 `reader_access` (lecteurs), provisoire

ADMIN § 10 remet à plus tard les formules et le service de paiement. Cette table n'est **qu'un support provisoire** pour écrire et tester dès l'étape 5 les règles des contenus réservés (qui lit quoi) **[D37]**. Sa forme (liens vers `auth.users`, date de fin, origine) et la façon dont elle sera remplie seront revues quand le paiement sera choisi ; les règles de lecture, elles, ne dépendent que de `private.reader_rank()`.

- `user_id` (clé primaire, → `auth.users` `on delete cascade`), `access_level_id` (→ `access_levels` `restrict`), `valid_until timestamptz null`, `source text`.
- Écrite **uniquement avec la clé secrète**. Un lecteur lit sa propre ligne ; `authenticated` n'a aucun droit d'écriture.
- `private.reader_rank()` (`security definer`, `stable`) renvoie le rang de la formule en cours de validité de `auth.uid()`, ou `null` (anonyme, ou sans abonnement).
- Les lecteurs de l'app auront un compte : dans le même projet Supabase ou non, c'est la question 3 (§ 8.2).

### 1.5 `categories` et `content_categories`

- `categories` : `id`, `section text check (section in ('blog','podcasts'))`, `name`, `position int`, `unique (section, lower(name))`.
- `content_categories (content_id, category_id)` en clé primaire, `on delete cascade` des deux côtés. Un trigger vérifie que la section correspond à la sorte : Blog pour un article, Podcasts pour un épisode. Les autres sortes n'ont pas de catégorie.
- Créées **à l'étape 4**, avec `contents`, parce que `save_draft` les écrit et que `publish` (étape 5) les recopie. L'écran de gestion des catégories arrive à l'étape 7 ; d'ici là, la table peut rester vide.
- Ce sont les catégories **du brouillon**. À la publication, leurs identifiants sont recopiés dans `versions.category_ids` : l'app filtre sur ce qui est publié.
- Supprimer une catégorie est une vraie suppression : la corbeille d'ADMIN § 3 ne liste pas les catégories **[D28]**. Elle quitte les brouillons par cascade ; dans l'app, les fonctions de lecture ignorent les identifiants qui n'existent plus. L'historique affiche « catégorie supprimée ».

### 1.6 `contents` (la table commune)

| Colonne | Détail |
|---|---|
| `id uuid` | |
| `kind text` | `article`, `episode`, `method`, `chapter`, `lesson`, `page`, `template`. Ne change jamais (trigger). |
| `parent_id uuid` → `contents` `on delete cascade` | obligatoire pour `chapter` (parent : une méthode) et `lesson` (parent : un chapitre), interdit sinon. Un trigger vérifie la sorte du parent. |
| `position int` | ordre dans le parent (voir la contrainte d'exclusion ci-dessous) |
| `in_app bool not null default false` | chapitres et leçons : « Montrer dans l'app » à la prochaine publication de la méthode. **Décoché à la création**, pour qu'une leçon à moitié écrite ne parte pas avec les autres (§ 1.8, [D29]) |
| `draft jsonb` | **le brouillon unique** (forme au § 2.2) |
| `title text` | colonne générée : `draft->>'title'` (listes, recherche) |
| `draft_rev int` | augmente à chaque changement du brouillon (contrôle de conflit) |
| `draft_saved_at`, `draft_saved_by` | dernier enregistrement |
| `access_level_id uuid null` → `access_levels` `restrict` | `article`, `episode`, `method`, `page` seulement (`null` = gratuit). La clé étrangère est ajoutée à l'étape 5 |
| `is_free bool default false` | `lesson` seulement : leçon gratuite dans une méthode réservée |
| `slug text` | `page` seulement : l'adresse que l'app demande (`mentions-legales`…), **dans le brouillon**. L'adresse en ligne est celle de la version publiée (`versions.slug`, § 1.7). `unique (slug) where kind = 'page' and deleted_at is null` |
| `template_sort text` | `template` seulement : `style` (mise en forme réutilisable), `shared` (bloc identique partout) ou `starter` (point de départ). Ne change jamais (trigger). |
| `live_version_id uuid null` | la version que lit l'app (`null` = pas dans l'app). Sortes « racines » seulement : `article`, `episode`, `method`, `page`. |
| `first_published_at timestamptz` | date de la première publication : l'app trie sur elle, pour qu'une correction ne remonte pas un article en tête **[D27]** |
| `scheduled_at`, `scheduled_by`, `scheduled_rev int`, `scheduled_set_at`, `schedule_error text` | publication programmée (sortes racines seulement) : l'heure, qui l'a programmée, la révision du brouillon et le moment où elle l'a fait (§ 3.8, [D31]), et l'éventuel échec |
| `deleted_at`, `deleted_by`, `trash_batch uuid` | corbeille ; le lot sert à restaurer ensemble une méthode, ses chapitres et ses leçons |
| `draft_media_ids uuid[]`, `draft_template_ids uuid[]` | tenus par trigger à partir de `draft` |
| `created_at`, `created_by` | |

**Contraintes**
- `check` sur chaque combinaison de sorte : `parent_id`, `in_app` (chapitre, leçon), `is_free` (leçon), `slug` (page), `template_sort` (modèle, obligatoire), `access_level_id`, `live_version_id`, `scheduled_at` (sortes racines ; toujours `null` pour un chapitre, une leçon ou un modèle).
- **Ordre dans le parent** : `exclude using btree (parent_id with =, position with =) where (deleted_at is null) deferrable initially deferred`. Une contrainte d'exclusion accepte à la fois un `where` et `deferrable`, ce que ne permet pas un index unique partiel. Les éléments dans la corbeille ne comptent donc pas : on peut renuméroter les leçons restantes 1, 2, 3 après en avoir supprimé une. `restore` replace l'élément **en fin de liste** de son parent.
- **Clé étrangère composite** `(live_version_id, id) → versions (id, content_id)`, `on delete set null (live_version_id)` (Postgres 15+) : un contenu ne peut pas pointer vers la version d'un autre. Ajoutée à l'étape 5.
- `check (octet_length(draft::text) <= 262144)` : 256 Ko par brouillon, pour ménager les 500 Mo de base **[D35]**. Un long article fait quelques dizaines de Ko ; les images ne sont que des références.

**Index** : `(kind, deleted_at, draft_saved_at desc)` pour les listes et l'Accueil ; `(parent_id, position)` ; `(scheduled_at) where scheduled_at is not null` ; GIN sur `draft_media_ids` et `draft_template_ids`.

Pourquoi une seule table, modèles compris ? Toutes ces sortes ont besoin des mêmes choses : un brouillon en blocs, l'enregistrement automatique, le verrou, la corbeille et le « où est-il utilisé ». Le prix est une série de `check` par sorte, écrits une fois et testés par pgTAP **[D3]**.

### 1.7 `versions` (copies figées et historique)

| Colonne | Détail |
|---|---|
| `id`, `content_id` → `contents` `on delete cascade` | `unique (id, content_id)` pour la clé composite ci-dessus |
| `number int` | 1, 2, 3… par contenu, `unique (content_id, number)` |
| `origin text` | `manual`, `scheduled`, `template` (mise à jour d'un modèle), `outline` (retrait d'un chapitre ou d'une leçon, § 3.4), `files` (mise à jour des textes de la médiathèque, si tu choisis cette option de [D30]) |
| `body jsonb` | copie figée du brouillon : modèles liés **résolus**, textes alternatifs **résolus** (§ 2.4), vérifiée par le schéma `published` |
| `body_hash text` | empreinte SHA-256 du corps résolu, de `files` et de `is_free` : sert à savoir si un chapitre ou une leçon a vraiment changé (§ 3.4) |
| `files jsonb` | pour chaque fichier cité : `kind`, `mime`, `alt`, `transcript`, `width`, `height`, `duration_s`, **figés** au moment de la publication ([D30]) |
| `access_level_id` → `access_levels` `restrict`, `is_free` | accès figé |
| `slug text` | pages seulement : l'adresse figée, celle que cherche `app_page` |
| `category_ids uuid[]` | catégories figées (GIN) |
| `media_ids uuid[]` | tous les fichiers cités, couverture et audio compris (GIN) |
| `template_ids uuid[]` | modèles `shared` recopiés dans la version (GIN) |
| `block_types text[]` | sortes de blocs utilisées, pour prévenir quand une ancienne app ne sait pas les afficher |
| `outline jsonb` | méthodes seulement : le plan figé (§ 1.8) |
| `draft_rev int` | révision du brouillon d'origine (affichage « modifié depuis la publication ») |
| `published_at`, `published_by` (uuid, sans clé étrangère, § 1.1), `published_by_name` | auteur et date ; le nom est recopié |

- **Une version ne change jamais** : aucun droit `update`/`delete` pour personne, plus des triggers `before update` et `before truncate` qui lèvent toujours une erreur. Aucune clé étrangère de `versions` n'a d'action `set null` ou `cascade` qui la modifierait. Elle ne disparaît qu'en cascade, quand son contenu est effacé définitivement.
- Les modèles n'ont jamais de version (§ 2.5).

### 1.8 Les méthodes

- Une méthode, chacun de ses chapitres et chacune de ses leçons sont **des lignes distinctes** de `contents`. Chacune a son brouillon, son verrou (deux membres peuvent écrire deux leçons en même temps) et son historique.
- Le brouillon d'une méthode porte sa fiche (titre, résumé, image de présentation) ; sa liste de blocs reste vide pour l'instant **[D4]**. L'introduction d'un chapitre, c'est le brouillon en blocs de la ligne `chapter`.
- **Un seul bouton « Publier », celui de la méthode** **[D29]**, à valider (question 4 du § 8.2). Il publie la fiche, le plan et **tous** les chapitres et leçons modifiés qui ont « Montrer dans l'app » coché. Conséquence : corriger une virgule dans la leçon 1 envoie aussi dans l'app les autres leçons modifiées depuis la dernière publication. Deux garde-fous le rendent sûr :
  - une leçon ou un chapitre **neuf** est créé avec « Montrer dans l'app » **décoché** : on le coche quand il est prêt ;
  - avant de publier (ou de programmer) une méthode, l'admin affiche **la liste des éléments qui vont changer dans l'app** (neufs, modifiés, retirés), avec qui les a modifiés et quand, et demande de confirmer.
  - (Un élément tenu en ce moment par un autre membre bloque la publication, [D14].)
- La version de la méthode porte le **plan figé** :

```json
[
  { "chapterId": "…", "versionId": "…",
    "lessons": [ { "lessonId": "…", "versionId": "…" } ] }
]
```

  Chaque `versionId` pointe vers la version d'un chapitre ou d'une leçon. Celles qui n'ont pas changé depuis la dernière publication sont **réutilisées**, pas recopiées : on ne duplique pas trente leçons pour une virgule. « Pas changé » se juge sur le contenu **résolu** (§ 3.4), pas seulement sur `draft_rev`. Un trigger vérifie, à l'insertion, que chaque `versionId` existe et appartient bien à un enfant de cette méthode.
- Les chapitres et les leçons n'ont donc pas de `live_version_id` : ce qui est en ligne, c'est ce que cite le plan de la version en ligne de la méthode. **Réordonner ou déplacer une leçon ne change l'app qu'à la publication suivante**, comme tout le reste (ADMIN § 3).
- **Niveau d'une leçon** : `null` (gratuit) si la version de la leçon a `is_free`, sinon celui de la version de la méthode. **Introduction d'un chapitre** : calculée par `private.chapter_intro_level()` ; en attendant la décision d'ADMIN § 10, elle suit le niveau de la méthode (le choix prudent) **[D5]**. Tout cela est calculé à un seul endroit, la vue `private.live` (§ 3.2).

### 1.9 `media` (médiathèque)

| Colonne | Détail |
|---|---|
| `id uuid` | |
| `kind text` | `image`, `svg`, `lottie`, `audio`, `pdf` (pas de vidéo) |
| `name text` | nom d'origine (recherche par `ilike`, suffisante à cette échelle) |
| `path text` | `<id>/<nom-nettoyé>.<ext>`, le même dans les deux buckets |
| `mime`, `size_bytes`, `width`, `height`, `duration_s` | lus dans le navigateur ; l'app s'en sert pour réserver la place sans saut d'affichage |
| `alt text` | images et SVG seulement (`check`) |
| `transcript text` | audios seulement (`check`) |
| `status text` | `pending` (envoi en cours), `checking` (SVG ou Lottie en vérification), `ready`, `rejected` |
| `reject_reason text`, `check_attempts int default 0` | pourquoi un fichier a été refusé ; nombre de vérifications ratées (§ 4.3) |
| `is_public bool default false` | dans quel bucket le fichier se trouve **réellement** |
| `created_at/by`, `deleted_at/by`, `purge_requested_at`, `purge_error text` | corbeille, effacement demandé, et raison d'un effacement refusé (§ 3.7) |

- `check` entre `kind` et `mime` : `image` → `image/jpeg`, `image/png`, `image/webp` ; `svg` → `image/svg+xml` ; `lottie` → `application/json` ; `audio` → `audio/mpeg`, `audio/mp4` ; `pdf` → `application/pdf`. Le navigateur annonce parfois d'autres noms pour les mêmes formats (`audio/x-m4a` ou `audio/m4a` pour un `.m4a` depuis Safari ou macOS, `audio/mp3` pour un `.mp3`) : l'admin **normalise le type** d'après l'extension et les premiers octets avant l'envoi, et c'est ce type normalisé qui est déclaré à Storage et à la base **[D33]**.
- `check (size_bytes <= 52428800)`, et `check (kind not in ('svg', 'lottie') or size_bytes <= 5242880)` : 5 Mo au plus pour un SVG ou un Lottie, pour que la fonction Edge puisse le vérifier (§ 4.3) **[D39]**.
- Index : `(kind, deleted_at, created_at desc)`.
- **Un fichier ne se remplace jamais** : une nouvelle version d'une image est un nouveau fichier, avec un nouvel `id` et une nouvelle adresse. Cela évite les problèmes de cache et permet à l'app de garder ses images en cache par `id`.
- **« Où il est utilisé »** : `private.media_uses(id)` renvoie les lignes de `contents` dont `draft_media_ids` contient l'id (brouillons, modèles et contenus en corbeille compris), plus les versions **en ligne** (d'après `private.live`) dont `media_ids` le contient. Les anciennes versions de l'historique ne comptent pas **[D6]**.

### 1.10 `edit_locks` (verrou « un seul à la fois »)

- `content_id` (clé primaire, → `contents` `on delete cascade`), `holder_id` (→ `profiles` `on delete set null`, `null` = libre), `taken_at`, `heartbeat_at`, `draft_rev int`.
- Le verrou est **libre** si `holder_id` est `null`, et **périmé** si `heartbeat_at < now() - interval '90 seconds'`. Relâcher un verrou **ne supprime pas la ligne** : `holder_id` passe à `null` (un `UPDATE`, que Realtime peut filtrer par contenu et soumettre à la RLS). La tâche `menage` efface les lignes libres depuis plus d'un jour.
- `draft_rev` est recopié à chaque enregistrement : c'est la seule chose qu'écoutent ceux qui regardent en lecture seule, ce qui garde les messages Realtime minuscules (on n'envoie jamais le brouillon lui-même).
- Comme les modèles sont des lignes de `contents`, ils ont le même verrou.

### 1.11 `media_audit`

`checked_at`, `orphan_paths text[]` : les objets Storage sans ligne `media` (restes d'un envoi interrompu), trouvés par le contrôle hebdomadaire (§ 3.7). Lecture par l'équipe, affichage dans la Médiathèque **pour toute l'équipe**, avec « Nettoyer » : ADMIN § 2 confie la médiathèque à l'éditeur comme à l'admin.

---

## 2. Format des blocs

> **En bref** : un contenu est une liste de blocs (Texte, Image, Encadré). Leur forme est décrite dans un seul fichier, d'où l'on tire automatiquement les vérifications de l'admin, de l'app et de la base. Ajouter un bloc (SVG, animation, PDF) revient à compléter ce fichier et à écrire son affichage.

### 2.1 Une seule description, vérifiée à trois endroits

- **Source** : `blocks/blocks.schema.json` à la racine du dépôt, écrit à la main en **JSON Schema draft-07** **[D7]**. Zod 4 est déjà une dépendance de `web/` (avec React Hook Form, ADMIN § 9) et `z.toJSONSchema()` sait produire du draft-07 (`target: "draft-7"`). J'écris pourtant le schéma à la main, pour deux raisons :
  - la **maîtrise exacte** du résultat : la récursion des listes, `additionalProperties: false` partout, les trois variantes qui partagent les mêmes `definitions`. Le schéma est lu par trois outils différents (Ajv, pg_jsonschema, l'app) ; on relit ce qu'ils reçoivent, pas ce qu'un convertisseur en tire ;
  - **aucune dépendance au convertisseur** : une nouvelle version de Zod ne peut pas changer en silence ce que vérifie la base.
  Le draft-07 reste la version la plus sûre pour la crate de pg_jsonschema 0.3.3. Zod reste l'outil des formulaires.
- **Trois variantes**, qui partagent les mêmes `definitions` :
  - `draft` : brouillon d'un contenu (image sans fichier acceptée, bloc `linked` accepté au premier niveau) ;
  - `template` : brouillon d'un modèle (pas de bloc `linked`, pour éviter les chaînes et les boucles) ;
  - `published` : copie figée (fichier obligatoire, `alt` résolu, marqueur `altFromLibrary` accepté, pas de `linked`).
- **Génération** : `cd web && npm run blocks:generate` (script `web/scripts/blocks-generate.mjs`, avec `ajv`, `json-schema-to-typescript` et `esbuild` en dépendances de développement de `web/`) **[D8]** produit :
  1. les types TypeScript dans `web/src/blocks/generated/` et `mobile/src/blocks/generated/` ;
  2. des **validateurs Ajv « standalone »** (du JavaScript déjà compilé, sans `new Function` à l'exécution, donc compatible avec Hermes) pour l'admin et pour l'app. Le code standalone importe encore quelques aides d'Ajv (`ajv/dist/runtime/ucs2length` dès qu'il y a un `maxLength`, `equal`…), et `mobile/` a son propre `node_modules` : le script produit donc un fichier **autonome**, en ESM (`code: { esm: true }`), dans lequel esbuild inclut ces aides. L'app n'a pas besoin d'`ajv` ; à défaut, on l'ajouterait à `mobile/` avec `npx expo install ajv`. Le chargement sous Hermes est vérifié à l'étape 4 ;
  3. quand le schéma a changé, une **nouvelle migration** qui recrée `private.blocks_schema(variant text)` et `private.blocks_schema_hash()` (fonctions `immutable` qui renvoient le JSON et son empreinte SHA-256) ;
  4. `blocks/generated/schema.sha256`.
- **Base** : le trigger du brouillon et la fonction de publication appellent `jsonschema_validation_errors(private.blocks_schema(…), …)` (pg_jsonschema 0.3.3) et renvoient une erreur lisible. Les variantes « compilées » n'existent pas en 0.3.3 : on ne s'en sert pas.
- **Admin** : le validateur généré tourne avant chaque enregistrement ; les types viennent des fichiers générés.
- **App** : elle valide **chaque bloc reçu** avec le validateur généré. Un bloc invalide ou inconnu est remplacé par l'encart « Mets à jour l'app pour voir ce passage ».
- **Garde-fous** (sans lire les migrations, donc robuste quand plusieurs migrations touchent le schéma) :
  - job « Administration » : relance `blocks:generate`, puis `git diff --exit-code` ;
  - job « Base de données » : après le démarrage de la base, compare `select private.blocks_schema_hash()` au contenu de `blocks/generated/schema.sha256`.
- **Premier test de l'étape 4** : un test pgTAP qui prouve que pg_jsonschema 0.3.3 applique bien les `$ref` récursifs du draft-07 (listes imbriquées). S'il échoue, on déplie la récursion sur trois niveaux de listes, ce qui suffit pour l'app.

### 2.2 Forme d'un brouillon

```json
{
  "v": 1,
  "title": "Bien respirer",
  "summary": "…",
  "cover": { "mediaId": "c0de…" },
  "audio": null,
  "blocks": [
    { "id": "3f2c…", "type": "text", "doc": { "type": "doc", "content": [ … ] } },
    { "id": "8a91…", "type": "image", "mediaId": "c0de…", "caption": "…", "alt": null },
    { "id": "b7e4…", "type": "box", "look": "fill",
      "blocks": [ { "id": "…", "type": "text", "doc": { … } } ] },
    { "id": "d1a0…", "type": "linked", "templateId": "9e7f…" }
  ]
}
```

- **`id`** : un UUID créé par l'admin (`crypto.randomUUID()`). Il ne change jamais, même quand on déplace le bloc ; il sert au glisser-déposer, au plan, au bloc sélectionné et aux modèles. Un trigger vérifie qu'aucun `id` n'apparaît deux fois dans le document (encadrés compris) : JSON Schema ne sait pas le faire.
- **Convention `mediaId` / `templateId`** : toute référence à un fichier est une clé `mediaId`, y compris l'image de présentation (`cover`) et le son d'un épisode (`audio`) ; toute référence à un modèle est une clé `templateId`. La requête `jsonb_path_query(draft, 'strict $.**.mediaId')` retrouve donc tous les fichiers, y compris ceux des blocs à venir, sans rien changer **[D9]**.
- **`v`** n'augmente que pour un changement qui casse l'existant, avec une migration SQL qui transforme brouillons et versions. Ajouter un bloc ne change pas `v`.

### 2.3 Les trois blocs de départ

- **Texte** (`text`) : `doc` est un JSON ProseMirror (format Tiptap) **restreint** :
  - nœuds : `doc`, `paragraph`, `heading` (`level` 2 ou 3 : le titre du contenu fait office de niveau 1), `bulletList`, `orderedList` (`start` seulement), `listItem` (premier enfant : un `paragraph`), `hardBreak`, `text` ;
  - marques : `bold`, `italic`, `link` avec seulement `href`, qui doit commencer par `https://` ou `mailto:` **[D10]** ;
  - `additionalProperties: false` partout.
  - Côté admin : `StarterKit.configure({ blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, heading: { levels: [2, 3] }, link: { openOnClick: false, protocols: ['https', 'mailto'], isAllowedUri } })`. Tiptap retire au collage ce qui sort du schéma. Avant l'enregistrement, `cleanTextDoc()` retire `target`, `rel` et `class` des liens et `type` des listes numérotées : ce sont des choix d'affichage.
- **Image** (`image`) : `mediaId` (peut être `null` dans un brouillon), `caption` (texte simple, sans mise en forme, 300 caractères au plus, ou `null`) **[D34]**, `alt` (`null` = reprendre le texte alternatif de la médiathèque, sinon un texte propre à ce contenu).
- **Encadré** (`box`) : `look` vaut `fill` (fond) ou `border` (bordure) ; `blocks` n'accepte **que** `text` et `image`. Le schéma rend donc impossible un encadré dans un encadré, et un bloc lié dans un encadré.
- **Lié** (`linked`) : `{ id, type: "linked", templateId }`, au premier niveau d'un brouillon de contenu seulement (§ 2.5).

### 2.4 Dans une version publiée

La publication transforme le brouillon :
- chaque `linked` est remplacé par une **copie** du bloc unique du modèle ; la copie garde l'`id` du bloc lié, reçoit de nouveaux `id` à l'intérieur (si le même modèle apparaît deux fois, les `id` restent uniques) et porte un marqueur `"templateId"` ;
- chaque `alt` à `null` est remplacé par le texte alternatif actuel de la médiathèque (chaîne vide s'il n'y en a pas), et le bloc reçoit `"altFromLibrary": true`. Ce marqueur permet à « Revenir à cette version » de remettre `alt: null` (le bloc suit de nouveau la médiathèque) ; l'app l'ignore ;
- `files` fige les informations de chaque fichier cité (texte alternatif, transcription, dimensions, durée).

**Texte alternatif et transcription figés** **[D30]**. ADMIN § 6 présente ces informations comme propres au fichier. Avec ce choix, les corriger dans la Médiathèque change aussitôt les brouillons, mais ne change l'app qu'à la prochaine publication de chaque contenu concerné. La fiche du fichier le dit (« Déjà publié dans N contenus : ils garderont l'ancien texte jusqu'à leur prochaine publication »). Ce choix change le travail quotidien, d'où deux options pour toi :
- A) **Figé** (ci-dessus) : la copie figée d'ADMIN § 3 est tenue jusqu'au bout ; corriger une transcription oblige à republier chaque contenu ;
- B) **Figé, avec un raccourci** (ma proposition) : la fiche du fichier propose « Mettre à jour ces N contenus dans l'app », comme pour un bloc identique (ADMIN § 5). Le geste écrit pour chaque contenu en ligne une nouvelle version, égale à la version en ligne, dont seuls les textes du fichier sont remplacés (`origin = 'files'`, sur le modèle de `template_push`, § 3.5). Le reste du brouillon ne part jamais par ce geste.

L'app ne voit que des blocs `text`, `image` et `box`, jamais `linked`.

### 2.5 Modèles de blocs

Les modèles sont des lignes `kind = 'template'` de `contents` : même éditeur, même verrou, même corbeille, même enregistrement automatique. Ils ne se publient pas.

| Sorte (ADMIN § 5) | Insertion | Modifier le modèle | Suppression |
|---|---|---|---|
| `style` (mise en forme réutilisable) | copie des blocs, avec de nouveaux `id` | ne change rien ailleurs | libre (corbeille) |
| `starter` (point de départ) | le nouveau contenu s'ouvre avec une copie | ne change rien ailleurs | libre (corbeille) |
| `shared` (bloc identique partout) | un bloc `linked` | **tous les brouillons le voient aussitôt**, puisqu'ils n'ont qu'une référence | refusée tant qu'un brouillon le cite |

- Un modèle `shared` contient **exactement un bloc** **[D11]** : pour en regrouper plusieurs, on les met dans un Encadré. C'est la lecture littérale de « le même bloc » (ADMIN § 5).
- La sorte se choisit à la création et ne change plus (trigger).

### 2.6 Ajouter un bloc (SVG, animation Lottie, PDF…)

1. Ajouter sa définition au schéma, avec son `mediaId` (par exemple `svg` : `mediaId`, `alt` ; `animation` : `mediaId`, `loop`, `autoplay` ; `pdf` : `mediaId`, `label`). On ne fait **qu'ajouter** : un nouveau schéma ne revérifie pas les lignes existantes, donc on ne durcit jamais une règle déjà en place.
2. Lancer `blocks:generate` (types, validateurs, migration).
3. Admin : une entrée dans `web/src/blocks/registry.ts` (`type`, libellé, icône, `create()`, aperçu-éditeur, réglages, `allowedInBox`).
4. App : une entrée dans `mobile/src/blocks/registry.tsx`.
5. Tests : cas valides et invalides partagés (`blocks/cases/*.json`) lus par Vitest et par pgTAP, plus le rendu.

Tant qu'une ancienne app ne connaît pas le bloc, elle affiche l'encart « Mets à jour l'app ». Grâce à `versions.block_types`, l'admin peut prévenir avant de publier un bloc récent.

### 2.7 Affichage dans l'admin

- **On écrit dans l'aperçu** (ADMIN § 4) : au centre, un cadre à la largeur d'un téléphone (environ 390 px) ; à droite, les réglages du bloc choisi ; à gauche, **le plan du contenu (la liste des blocs), un panneau qu'on ouvre et qu'on ferme, fermé par défaut**. Chaque bloc Texte y est une instance Tiptap (`immediatelyRender: false`, `shouldRerenderOnTransaction: false`, `useEditorState` pour la barre d'outils), avec `editable = false` quand on n'a pas le verrou.
- **Fidélité** : `blocks/blocks.tokens.json` décrit tailles de texte, espacements, couleurs et bordures des encadrés. `blocks:generate` en tire des variables CSS pour l'aperçu de l'admin et des constantes pour l'app **[D12]** : les deux rendus partent des mêmes valeurs.
- **Glisser-déposer** (dnd-kit 6.3 / sortable 10) : un `DndContext`, un `SortableContext` pour la liste principale et un par encadré, chacun entouré d'une zone de dépôt (pour déposer dans un encadré vide). `onDragOver` refuse qu'un `box` ou un `linked` entre dans un encadré. `DragOverlay`, `KeyboardSensor` + `sortableKeyboardCoordinates`, et des annonces en français pour les lecteurs d'écran.
  - **Le glisser-déposer part d'une poignée**, jamais du bloc entier : `setActivatorNodeRef` et les `listeners` de `useSortable` sont posés sur la poignée seulement. Sinon, taper Espace ou Entrée dans un bloc Texte démarrerait un déplacement au clavier (l'événement remonte de la zone éditable), et la souris ne pourrait plus sélectionner du texte. `PointerSensor` a en plus une contrainte d'activation (`distance: 5`).
- **Bloc lié** : affiché avec un liseré et la mention « Modèle : Contact », avec « Modifier le modèle » et « Détacher ».
- Les SVG ne s'affichent qu'avec `<img>`, qui n'exécute jamais de script.

---

## 3. Règles tenues par la base, fonctions et tâches planifiées

> **En bref** : la base refuse elle-même tout ce qui est interdit : écrire sans la double vérification, écrire un brouillon tenu par quelqu'un d'autre, publier un bloc mal formé, supprimer un fichier ou un modèle utilisé, modifier une version publiée. Les gestes (enregistrer, publier, programmer, supprimer…) sont des fonctions de la base ; l'interface ne fait que les appeler.

### 3.1 Droits (RLS)

| Table | Lecture | Écriture directe | Le reste |
|---|---|---|---|
| `contents`, `versions` | `is_staff()` | **aucune** | tout par RPC |
| `edit_locks` | `is_staff()` | aucune | `lock_*` |
| `media` | `is_staff()` | `update (name, alt, transcript)` pour `is_staff()`, fichiers hors corbeille (droits par colonne) | envoi, corbeille : RPC ; `status`, `is_public`, effacement : fonction Edge seulement (fonctions `files_*`) |
| `categories` | `is_staff()` | `is_staff()` | |
| `content_categories` | `is_staff()` | aucune | `save_draft` |
| `access_levels` | `is_staff()` | `is_admin()` | `access_levels_reorder` |
| `reader_access` | le lecteur, sa propre ligne | aucune pour `authenticated` ; clé secrète seulement | |
| `media_audit` | `is_staff()` | aucune | fonction Edge |

`anon` n'a **aucun droit** sur ces tables, et un éditeur qui n'a pas passé la double vérification (aal1) non plus.

**Compte sans fiche d'équipe.** Toute la sécurité de l'admin repose sur `is_staff()`, c'est-à-dire sur l'existence d'une fiche `profiles`. Depuis l'étape 2, `handle_new_user()` ne crée une fiche que si le rôle a été posé dans `app_metadata` par la clé secrète (invitation par la fonction `equipe`, ou premier admin posé à la main) : un compte lecteur, ou tout compte créé autrement, n'a pas de fiche et `is_staff()` est faux pour lui, même en aal2 (testé dans `10_equipe.test.sql`).

### 3.2 Triggers et fonctions internes

- **Brouillon** (`before insert or update of draft on contents`) :
  1. choisit la variante (`template` pour un modèle, `draft` sinon) et vérifie la forme ; refuse avec la liste des erreurs ;
  2. vérifie l'unicité des `id` de blocs ;
  3. recalcule `draft_media_ids` et `draft_template_ids` ;
  4. verrouille en partage les lignes `media` citées (`select … for share`), puis refuse un fichier inconnu, pas `ready` ou dans la corbeille, et un modèle inconnu, dans la corbeille ou qui n'est pas `shared`. Le verrou de ligne empêche qu'un autre membre mette le même fichier à la corbeille pendant ce temps (`media_trash` prend `for update`, § 3.6) ;
  5. pour un modèle `shared`, exige exactement un bloc.
- **`contents`** : sorte et `template_sort` immuables ; parent de la bonne sorte.
- **Garde de corbeille** sur `contents` (`before update`) : un contenu dans la corbeille ne change pas, **sauf** dans trois cas, vérifiés colonne par colonne :
  1. `restore` (qui vide `deleted_at`) ;
  2. une colonne d'auteur (`created_by`, `draft_saved_by`, `deleted_by`, `scheduled_by`) qui passe à `null`, toutes les autres colonnes restant identiques : c'est l'effet de `on delete set null` quand on retire un membre de l'équipe ;
  3. `template_detach_all` (§ 3.5), qui ne change que `draft`, `draft_rev`, `draft_template_ids`, `draft_saved_at` et `draft_saved_by`. La fonction le signale par un réglage local à la transaction (`set_config('declikora.detach_all', 'on', true)`) ; aucune écriture directe n'étant permise sur `contents`, seul le code de la base peut le poser.
- **`versions`** : immuables (`before update`, `before truncate`) ; plan d'une méthode cohérent (§ 1.8).
- **`media`** : `before delete` refuse si `media_uses` n'est pas vide (seconde ligne de défense).
- **`private.live`** (vue interne, jamais exposée) : toutes les versions **en ligne**, avec `content_id`, `kind`, `version_id`, `method_id` et le **niveau réel** (`level_id`, `level_rank`, `null` = gratuit) :
  - une ligne racine hors corbeille dont `live_version_id` est renseigné ;
  - chaque chapitre et chaque leçon cités par le plan de la version en ligne d'une méthode (hors corbeille) ;
  - niveau réel : celui de la version pour une racine ; pour une leçon, `null` si sa version a `is_free`, sinon celui de la méthode ; pour une introduction, `private.chapter_intro_level()`.
  Toutes les autres fonctions (visibilité des fichiers, lecture de l'app, « où il est utilisé ») s'appuient sur cette vue.

### 3.3 Enregistrement automatique et verrou

**Côté base**
- `lock_take(content_id, force bool)` : réussit si le verrou est libre (`holder_id` nul), périmé, déjà à soi, ou si `force` (« Reprendre la main », après confirmation). Sinon renvoie le nom de la personne.
- `lock_heartbeat(content_id)` toutes les 20 s ; `lock_release(content_id)` en quittant (`fetch(…, { keepalive: true })`), qui passe `holder_id` à `null` sans supprimer la ligne ; sinon le verrou expire au bout de **90 s** **[D13]**.
- `lock_status(content_id)` : nom de la personne et `draft_rev`, pour le repli sans Realtime.
- `save_draft(content_id, base_rev, draft jsonb, settings jsonb)` : `settings` contient le niveau d'accès, `is_free`, `in_app`, le `slug` et les catégories. Refuse `verrou_perdu` si l'appelant ne tient pas le verrou, `conflit_revision` si `base_rev <> draft_rev`, `adresse_prise` si le `slug` est déjà celui d'une autre page, et tout contenu dans la corbeille. Sinon écrit, augmente `draft_rev`, recopie `draft_rev` dans `edit_locks`, et renvoie la nouvelle révision. **Tous les réglages passent par là**, sous le verrou : personne ne peut changer le titre ou le niveau d'accès d'un brouillon qu'un autre est en train d'écrire. Aucun de ces réglages ne change l'app avant la publication, `slug` compris (§ 1.7).

**Côté admin**
- Enregistrement 1,5 s après la dernière frappe, et au plus tard toutes les 10 s pendant qu'on écrit. Une seule requête à la fois ; la plus récente attend son tour.
- État affiché : « Enregistré à 14:32 », « Enregistrement… », « Hors ligne, nouvel essai… » (essais de plus en plus espacés). Le navigateur prévient avant de quitter la page si un changement n'est pas enregistré.
- Hook `useAutosave`, avec TanStack Query pour garder la dernière révision connue.
- **Signe de vie** : toutes les 20 s, **et aussitôt** que l'onglet redevient visible (`visibilitychange`). Chrome ralentit fortement les minuteries d'un onglet caché depuis plus de 5 minutes (environ une par minute) : avec une expiration à 90 s, un éditeur resté ouvert dans un onglet caché garde son verrou. Un onglet caché depuis plus de 30 minutes relâche volontairement le verrou ; au retour, l'éditeur tente de le reprendre, ou passe en lecture seule si quelqu'un d'autre l'a pris.
- **Realtime** (Postgres Changes, RLS réservée à l'équipe) sur `edit_locks` seulement, jamais sur `contents` **[D13]**. On n'écoute que les `INSERT` et `UPDATE` filtrés par `content_id=eq.…` : Postgres Changes ne sait pas filtrer les `DELETE` ni leur appliquer la RLS, c'est pourquoi la libération est un `UPDATE` :
  - celui qui lit voit le nom de celui qui écrit ; quand `draft_rev` change, il recharge le brouillon ; quand `holder_id` passe à `null`, il peut prendre la main ;
  - celui qui écrit voit aussitôt « Claire a repris la main » : l'éditeur passe en lecture seule, et ce qu'il n'avait pas encore enregistré reste dans son navigateur, avec « Copier mon texte » ;
  - si Realtime est coupé, l'admin revient à `lock_status` toutes les 30 s. Dans tous les cas, c'est la base qui tranche (`verrou_perdu`).
- Presence n'est pas utilisé : il n'est pas stocké en base, qui ne pourrait donc pas s'en servir pour faire respecter le verrou.
- **Programmé** : quand le contenu (ou sa méthode) a une publication programmée, l'éditeur affiche un bandeau permanent « Programmé le 3 oct. 2026 à 08:00 : ce que tu écris partira à cette heure » (§ 3.8).

### 3.4 Publication

- **`publish(content_id, expected_rev)`** (sortes racines) vérifie `is_staff()`, puis appelle `private.do_publish(content_id, auth.uid(), 'manual')`, qui :
  1. refuse si un **autre** membre tient un verrou actif sur le contenu (ou, pour une méthode, sur un de ses chapitres ou une de ses leçons) : l'admin propose alors « Reprendre la main » **[D14]**. Un verrou libre ou le sien suffit ;
  2. refuse si `draft_rev <> expected_rev` (« Le brouillon vient de changer, relis-le avant de publier ») ; l'admin termine d'abord son enregistrement en attente ;
  3. verrouille en partage les lignes `media` citées (`for share`, comme le trigger du brouillon) et vérifie les fichiers (existants, `ready`, hors corbeille) et, pour un épisode, la présence du son ; pour une page, la présence d'un `slug` qui n'est pas déjà celui d'une **autre page en ligne** (`adresse_prise`) ;
  4. résout les blocs liés et les textes alternatifs, fige `files` et `slug`, calcule `body_hash`, valide avec la variante `published` ;
  5. écrit la version, met à jour `live_version_id`, `first_published_at` si c'est la première fois, et efface `scheduled_at` et `schedule_error` ;
  6. **pour une méthode** ([D29]) : dans la même transaction, prend chaque chapitre et chaque leçon hors corbeille dont « Montrer dans l'app » est coché, **résout** son brouillon (modèles liés, textes alternatifs, `files`) et calcule son empreinte. Si elle est égale à `body_hash` de sa dernière version, cette version est **réutilisée** ; sinon une nouvelle version est écrite. Comparer le contenu résolu, et non `draft_rev` seul, garantit qu'un modèle `shared` ou un texte alternatif modifié depuis part bien, comme pour un article. Puis la version de la méthode est écrite avec son plan figé. Si un seul élément est invalide, rien n'est publié, et l'erreur nomme l'élément (« Leçon 3 : image sans fichier »).
  Elle renvoie `needs_file_sync` : l'admin appelle alors aussitôt la fonction Edge `files` (§ 3.7).
- **`publish_preview(content_id)`** : pour une méthode, la liste des éléments qui vont changer dans l'app (neufs, modifiés, retirés), avec l'auteur et la date du dernier enregistrement de chacun. L'admin l'affiche avant de publier ou de programmer (§ 1.8).
- Le texte alternatif n'est **pas** obligatoire pour publier : l'éditeur affiche un avertissement sur l'image **[D15]**.
- **`unpublish(content_id)`** (« Retirer de l'app ») :
  - sorte racine : `live_version_id = null`, programmation annulée, historique gardé ;
  - **chapitre ou leçon** : passe `in_app` à `false` et, si la méthode est en ligne, écrit une nouvelle version de la méthode (`origin = 'outline'`) identique à celle en ligne, sans cet élément **[D26]**. Pour le remettre, on recoche « Montrer dans l'app » puis on publie la méthode.
- **`schedule(content_id, at timestamptz)`** et **`unschedule(content_id)`** : sortes racines seulement, `at > now()`. `schedule` enregistre aussi `scheduled_by`, `scheduled_rev = draft_rev` et `scheduled_set_at = now()`. L'admin convertit l'heure de Paris en `timestamptz` (`web/src/lib/dates.ts`) ; la base compare avec `now()`, donc le fuseau GMT de pg_cron ne compte pas. La programmation publiera **le dernier brouillon enregistré à l'heure dite** **[D16]**, sauf si quelqu'un est en train de l'écrire à ce moment-là **[D31]** (§ 3.8) ; la barre de publication et le bandeau de l'éditeur le rappellent.
- **`revert_to_version(version_id)`** (« Revenir à cette version ») : exige de tenir le verrou. Recopie dans le brouillon le `body`, le niveau, `is_free`, le `slug` et les catégories qui existent encore, puis :
  - retransforme en `linked` chaque copie marquée `templateId` dont le modèle `shared` existe encore **hors corbeille** ; pour les autres (modèle en corbeille ou effacé), **retire le marqueur** : le bloc devient une copie ordinaire, sinon `draft_template_ids` le reprendrait et le trigger du brouillon refuserait tout le retour ;
  - remplace par `null` tout `mediaId` d'un fichier **absent, dans la corbeille ou pas `ready`** (avec D6, un fichier cité seulement par l'historique peut être dans la corbeille sans être encore effacé). Le bloc affiche « Fichier supprimé, choisis-en un autre », et la publication le refuse tant qu'il en reste ;
  - remet `alt: null` sur chaque image marquée `altFromLibrary` (§ 2.4), et retire ce marqueur : le bloc suit de nouveau la médiathèque.
  Augmente `draft_rev`. Pour une méthode, seule la fiche revient : le plan reste celui du brouillon, et chaque chapitre ou leçon a son propre historique **[D17]**.

### 3.5 Modèles

- **`content_create(kind, parent_id, from_template_id)`** : crée un contenu ; avec un modèle `starter`, recopie ses blocs avec de nouveaux `id`. Un chapitre ou une leçon naît avec « Montrer dans l'app » décoché, en fin de liste de son parent.
- **`template_create_from(content_id, block_ids[], name, sort)`** : « Enregistrer comme modèle ». Pour `shared`, un seul bloc.
- **`template_outdated(template_id)`** : les contenus **en ligne** (racines, et chapitres ou leçons cités par un plan en ligne) dont la copie figée (marquée `templateId`) diffère du bloc actuel du modèle, **et dont le brouillon cite encore le modèle** (`draft_template_ids @> array[template_id]` ; pour un chapitre ou une leçon, le brouillon de l'élément). Un contenu où l'on a détaché le bloc justement pour qu'il ne suive plus le modèle n'est donc pas proposé, même tant qu'il n'a pas été republié. On compare les JSON sans les `id`. L'admin affiche « Mettre à jour ces N contenus dans l'app ».
- **`template_push(template_id)`** : pour chacun des contenus de `template_outdated` (même condition sur le brouillon), écrit une nouvelle version = **la version en ligne** dont seules les copies du modèle sont remplacées (`origin = 'template'`, auteur = le membre qui clique). Le reste du brouillon ne part jamais par ce geste. Pour une leçon ou un chapitre, écrit aussi une nouvelle version de la méthode dont le plan pointe vers la nouvelle version, toutes les autres étant réutilisées.
- **Détacher** : dans l'éditeur, le `linked` devient une copie ordinaire (même `id` au premier niveau, nouveaux `id` à l'intérieur), enregistrée normalement.
- **`template_detach_all(template_id)`** (« Détacher partout ») : fait de même dans tous les brouillons, corbeille comprise (le garde de corbeille le permet, § 3.2). Refuse si l'un d'eux est tenu par un autre membre, et le nomme. Augmente `draft_rev` de chacun ; l'éditeur de l'appelant se recharge s'il est concerné. Le modèle devient ensuite supprimable.

### 3.6 Corbeille

- Vue **`trash_items`** (`security_invoker = true`) : `type`, `id`, `title`, `deleted_at`, `deleted_by`, `purge_at = deleted_at + 30 jours`, pour les contenus (chapitres et leçons compris, avec leur méthode entre parenthèses), les modèles et les fichiers. Elle **exclut les fichiers dont l'effacement est déjà demandé** (`purge_requested_at` rempli). Le filtre par type se fait sur cette vue.
- **`trash(content_id)`** : retire de l'app (`live_version_id = null`, programmation annulée). Une méthode emporte ses chapitres et ses leçons dans le même `trash_batch`. Un chapitre ou une leçon peut aussi être supprimé seul (ADMIN § 3 ne cite que les articles, épisodes, méthodes, pages, modèles et fichiers) : il sort du plan en ligne comme avec `unpublish` **[D36]**. Un modèle `shared` cité par un brouillon est refusé (`modele_utilise`, avec la liste).
- **`restore(content_id)`** : restaure tout le lot, **en brouillon, sans republier** **[D18]** : publier reste un geste volontaire (ADMIN § 4). Refuse de restaurer une leçon dont le chapitre ou la méthode est encore dans la corbeille. Un chapitre ou une leçon revient **en fin de liste** de son parent, avec « Montrer dans l'app » décoché. Une page dont l'adresse (`slug`) a été reprise entre-temps revient **sans adresse**, avec un avertissement : on en choisit une autre avant de la publier.
- **`media_trash(id)`** verrouille d'abord la ligne `media` (`for update`), puis refuse tant que `media_uses` n'est pas vide (`fichier_utilise`, avec la liste). Avec le `for share` du trigger du brouillon et de `publish`, un fichier ne peut pas être mis à la corbeille pendant qu'un autre membre l'insère.
- **`media_restore(id)`** : refuse un fichier dont l'effacement est déjà demandé.
- **`empty_trash(items jsonb default null)`** : efface définitivement la sélection, ou tout (`null`). Admin et éditeur.
- **`private.purge_trash()`** : efface ce qui est dans la corbeille depuis plus de 30 jours. Les contenus et les modèles partent en SQL (la cascade emporte versions, catégories et verrous). Pour les fichiers, elle ne fait que remplir `purge_requested_at` : un `DELETE` SQL sur `storage.objects` est bloqué par Supabase, c'est la fonction Edge qui efface par l'API Storage.

### 3.7 Une seule fonction Edge : `files`

Elle travaille avec supabase-js et la clé secrète, par lots de 50, et elle est **idempotente** (elle relit l'état avant chaque action, on peut la relancer sans risque). `verify_jwt = false` dans `config.toml`, comme `equipe`, parce qu'elle vérifie elle-même ses deux appelants :
- **pg_cron**, via `net.http_post`, avec un secret rangé dans Vault et comparé à sa variable d'environnement ;
- **un membre de l'équipe**, avec son JWT : elle appelle `rpc('is_staff')` avec ce jeton (donc aal2) avant d'agir. L'admin l'appelle juste après un envoi, une publication, une dépublication, « Vider la corbeille » ou « Nettoyer », pour que le changement soit immédiat.

**Comment elle parle à la base.** L'API n'expose que `public` et `graphql_public` : `rpc()` ne peut pas atteindre une fonction de `private`, même avec la clé secrète. La fonction passe donc par des fonctions `public.files_*` en `security definer`, dont l'`EXECUTE` est retiré à `public`, `anon` et `authenticated` et accordé à `service_role` seulement, comme `team_members()` à l'étape 2 :
- `files_worklist()` : le travail à faire (fichiers à vérifier, à déplacer d'après `private.files_to_move()`, à effacer, envois abandonnés) ;
- `files_mark_checked(id, status, reason)`, `files_mark_moved(id, is_public)`, `files_mark_purged(id)`, `files_mark_purge_failed(id, reason)` ;
- `files_record_audit(paths text[])`.
Le plan de l'étape 3 les crée avec leurs tests de droits.

Ses tâches :
1. **Vérifier** les fichiers `checking` (§ 4.3) et les passer à `ready` ou `rejected`.
2. **Déplacer** les fichiers donnés par `files_worklist()` (`move(path, path, { destinationBucket })`), puis mettre `is_public` à jour.
3. **Effacer** les fichiers dont `deleted_at` **et** `purge_requested_at` sont tous deux remplis quand elle relit la ligne (`remove()`), puis supprimer la ligne. Si la base refuse la suppression (le trigger `before delete` trouve un usage), elle **n'insiste pas** : elle note la raison dans `purge_error`, vide `purge_requested_at`, et le fichier réapparaît dans la Corbeille avec « Effacement impossible : encore utilisé ».
4. **Nettoyer** les envois `pending` et les fichiers `rejected` de plus de 24 h (objet et ligne).
5. **Contrôle hebdomadaire** (mode `audit`) : liste les objets des deux buckets dont le chemin n'est pas exactement le `path` d'une ligne `media`, et écrit le résultat dans `media_audit`.
6. **Nettoyer les orphelins** (mode `clean`, sur demande d'un membre) : efface les objets du dernier contrôle, après avoir revérifié qu'ils n'ont toujours pas de ligne `media` et qu'ils ont plus de 24 h.

Déplacer et effacer sont des attentes réseau, pas du calcul : la limite de 2 s de processeur n'est pas en jeu. La vérification d'un SVG est une simple analyse de texte, sur 5 Mo au plus (§ 4.3).

### 3.8 Tâches planifiées (pg_cron)

Vercel Hobby ne lance ses tâches qu'une fois par jour, à une heure près : tout ce qui est fréquent se fait dans Supabase.

| Tâche | Fréquence | Action |
|---|---|---|
| `publications` | chaque minute | `private.run_due_publications()` : prend les contenus dont `scheduled_at <= now()` avec `for update skip locked`, et traite chacun dans son propre bloc d'exception (voir ci-dessous). Une programmation en retard (après une pause du projet) part au passage suivant. |
| `fichiers` | chaque minute | `private.kick_files()` : appelle la fonction Edge **seulement s'il y a du travail** (fichiers `checking`, `files_to_move()` non vide, effacements demandés, envois abandonnés). Quelques dizaines d'appels par jour au plus. |
| `corbeille` | chaque jour à 02:00 GMT | `private.purge_trash()` |
| `audit-fichiers` | chaque dimanche à 03:00 GMT | appelle `files` en mode `audit` |
| `menage` | chaque semaine | efface `cron.job_run_details` de plus de 14 jours, les réponses `net._http_response` de plus de 7 jours et les lignes libres de `edit_locks` |

**Publication programmée pendant qu'on écrit** **[D31]**, rattachée à D16 et à valider avec elle. Pour chaque contenu dû, `run_due_publications` :
1. vérifie que `scheduled_by` est toujours dans `profiles` ; sinon, échec « auteur parti de l'équipe » ;
2. **attend si quelqu'un écrit** : si un membre, quel qu'il soit, tient un verrou actif sur le contenu (ou, pour une méthode, sur un de ses éléments) **et** que ce brouillon a changé depuis la programmation (`draft_rev <> scheduled_rev`, ou, pour un élément, `draft_saved_at > scheduled_set_at`), elle ne publie pas cette minute-ci et réessaie à la suivante. Au bout d'une heure d'attente, échec « brouillon en cours d'écriture ». C'est la même prudence que D14 pour la publication manuelle, sans personne devant l'écran pour trancher ;
3. sinon, appelle `private.do_publish(content_id, scheduled_by, 'scheduled')`. La fonction interne n'a pas le garde `is_staff()`, qui serait toujours faux sous pg_cron (§ 1.1).
En cas d'échec (fichier supprimé, brouillon invalide, auteur parti, attente trop longue), elle remplit `schedule_error` et vide `scheduled_at` ; l'Accueil l'affiche. Les autres options étaient de publier quand même (texte à moitié écrit possible) ou de publier la révision `scheduled_rev` (il faudrait la copier au moment de programmer, ce que D16 évite).

L'adresse de la fonction Edge et le secret sont rangés dans Vault (`vault.create_secret`), avec des valeurs différentes en local et en ligne. En ligne, c'est toi qui colles le secret.

### 3.9 Contre la mise en pause du projet gratuit

Une tâche **Vercel quotidienne** (autorisée en Hobby), `web/api/garder-actif.ts`, protégée par `CRON_SECRET`, appelle une fois par jour la fonction de lecture `app_access_levels()` avec la clé publishable : c'est une vraie requête à la base **[D19]**. Elle n'est utile que tant qu'on est en offre gratuite ; on la retire au passage à Pro. (On ne sait pas si l'activité de pg_cron compte comme activité ; mieux vaut ne pas en dépendre.)

---

## 4. Fichiers : stockage et visibilité

> **En bref** : deux « tiroirs » de fichiers, l'un public, l'autre protégé. Tout arrive dans le tiroir protégé. Un fichier passe dans le tiroir public seulement quand un contenu gratuit publié l'utilise, et revient dans le tiroir protégé dès que ce n'est plus le cas. Les abonnés reçoivent des liens temporaires pour le tiroir protégé.

### 4.1 Deux buckets

| Bucket | Accès | Limite | Types acceptés |
|---|---|---|---|
| `files-public` | public (adresse fixe, sans jeton) | 50 MiB | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `application/json`, `audio/mpeg`, `audio/mp4`, `application/pdf` |
| `files-protected` | privé (lien temporaire ou session) | 50 MiB | les mêmes |

- Liste de types **exacte**, pas de `image/*` ni `audio/*` **[D33]**. Les images que le navigateur sait lire dans un autre format (GIF, HEIC dans Safari…) ne sont pas refusées : la réduction des photos (§ 4.2) les convertit en WebP ou JPEG. Un GIF animé perd son animation, et l'admin le dit avant l'envoi (les animations passeront par Lottie). Les audios sont envoyés avec leur type normalisé (§ 1.9).
- Créés **par migration** (`insert into storage.buckets … on conflict (id) do update`), donc à l'identique en local et en ligne, et testés par `db:reset` **[D20]**. Ils ne sont pas déclarés dans `config.toml`, pour garder une seule source.
- Le chemin est `<media_id>/<nom-nettoyé>.<ext>`, **le même dans les deux buckets**.
- Les Lottie sont acceptés en `.json` seulement pour l'instant (pas `.lottie`, qui est une archive).

### 4.2 Envoi

1. **`media_create(kind, name, mime, size, width, height, duration_s)`** crée la ligne `pending` (`created_by = auth.uid()`) et renvoie son chemin. Elle refuse un SVG ou un Lottie de plus de 5 Mo.
2. **Préparation dans le navigateur** : les photos sont réduites à environ 300 Ko (canvas, WebP, JPEG en repli, 2 000 px au plus sur le grand côté) ; les SVG sont nettoyés avec DOMPurify (profil SVG) ; les types audio sont normalisés ; dimensions et durée sont lues.
3. **Envoi toujours dans `files-protected`**, avec `cacheControl: '300'` **[D21]** : standard jusqu'à 6 Mo, reprenable (TUS, `tus-js-client`) au-delà, pour les audios. Pas d'`upsert`.
4. **`media_confirm(id)`** vérifie dans `storage.objects` que l'objet existe, que sa taille et son type correspondent, puis passe la ligne à `ready` (image, audio, PDF) ou `checking` (SVG, Lottie). L'admin appelle aussitôt `files`, qui vérifie en quelques secondes.

**Politiques de `storage.objects`**
- `INSERT` sur `files-protected`, `to authenticated` : `(select public.is_staff())` **et** `name` est **exactement** le `path` d'une ligne `media` `pending` **créée par la même personne** (et non seulement son premier dossier). On ne peut donc déposer aucun autre objet dans le dossier pendant l'envoi.
- Aucune politique `UPDATE` ni `DELETE`, et aucune politique d'écriture sur `files-public` : seule la fonction Edge (clé secrète) déplace et efface.
- `SELECT` sur `files-protected` : voir § 4.5.

### 4.3 Vérification côté serveur des SVG et des Lottie

Le nettoyage se fait dans le navigateur, mais la base ne fait pas confiance au navigateur : un fichier `checking` ne peut entrer dans aucun bloc tant que la fonction Edge ne l'a pas passé à `ready`, et `status` n'est modifiable que par elle.
- **SVG** : la fonction **refuse** (sans réécrire) un fichier qui contient `<script`, un attribut `on…=`, `javascript:`, `<foreignObject`, `<iframe`, `<embed`, `<object`, ou un `href` / `xlink:href` qui n'est ni local (`#…`) ni une image en `data:image/(png|jpeg|webp)`. Une analyse de texte suffit : un SVG passé par DOMPurify passe toujours ; un SVG envoyé en contournant l'admin est refusé.
- **Lottie** : JSON valide, avec `v`, `w`, `h` et `layers`. Les « expressions » ne sont pas refusées : l'app ne les exécute pas.
- **Taille** : 5 Mo au plus pour les deux (`check` sur `media` et refus dans `media_create`, [D39]). Télécharger puis analyser un fichier de 50 Mo dépasserait la mémoire (256 Mo) ou les 2 s de processeur de la fonction.
- **Échecs répétés** : chaque vérification ratée (délai, erreur) augmente `check_attempts`. Au troisième échec, le fichier passe à `rejected` (« Vérification impossible ») : `kick_files` ne le rappelle pas sans fin.
- En cas de refus : `rejected`, avec la raison affichée dans la Médiathèque. Le fichier est nettoyé au bout de 24 h.

### 4.4 La règle « public ou protégé »

- **Règle** : un fichier doit être public **si et seulement s'il** figure dans `media_ids` d'une version de `private.live` dont le niveau réel est gratuit (`null`). Une leçon gratuite compte comme un contenu gratuit **[D24]**.
- **`private.files_to_move()`** compare cette règle à `media.is_public` en une seule requête ensembliste, lue par la fonction Edge à travers `public.files_worklist()` (§ 3.7). Il n'y a aucune colonne « voulue » à tenir à jour.
- **Retour en protégé** : quand un contenu gratuit devient réservé et qu'on le republie, ses fichiers ne sont plus dans une version gratuite en ligne : la fonction Edge les déplace vers `files-protected`. Un fichier encore utilisé par un autre contenu gratuit en ligne reste public, puisque la règle le couvre toujours (exception prévue par ADMIN § 6).
- **Image de présentation d'un contenu réservé** : elle suit la règle stricte d'ADMIN § 6 et reste **protégée**. Les non-abonnés voient une vignette neutre dans les listes de l'app. C'est une question pour toi (question 1 du § 8.2).

### 4.5 Qui peut lire un fichier protégé

Deux politiques `SELECT` sur `files-protected` :
- `to authenticated using ((select public.is_staff()))` : l'équipe ;
- `to anon, authenticated using (private.reader_can_open(name))` : les lecteurs.

`private.reader_can_open(object_name)` (`security definer`, `stable`) lit l'`id` du fichier dans le premier dossier (s'il n'a pas la forme d'un UUID, elle renvoie faux), puis vérifie qu'une version de `private.live` qui cite ce fichier est gratuite **ou** d'un rang atteint par `private.reader_rank()`. Le cas « gratuit » couvre la minute où un fichier gratuit attend encore d'être déplacé vers le bucket public : aucun trou d'affichage.

**Droits sur le schéma `private`.** Pour que la politique puisse appeler cette fonction, `anon` et `authenticated` reçoivent `usage` sur `private`. Or Postgres donne par défaut `EXECUTE` à `PUBLIC` sur toute nouvelle fonction : sans précaution, toutes les fonctions internes (`purge_trash`, `run_due_publications`, `kick_files`, `do_publish`…, en `security definer`) deviendraient exécutables par ces rôles. La migration de l'étape 3 écrit donc, avant de créer la moindre fonction dans `private` :
- `alter default privileges in schema private revoke execute on functions from public;`
- `revoke execute on all functions in schema private from public, anon, authenticated;`
puis ne rend `execute` qu'à `private.reader_can_open` (et, plus tard, à `private.reader_rank`, qu'elle appelle). Un test pgTAP vérifie qu'aucune autre fonction de `private` n'est exécutable par `anon` ni `authenticated`, et le refait à chaque étape.

L'app appelle elle-même `createSignedUrls(paths, durée)` avec sa session (anonyme ou abonné) : la base décide, aucune fonction Edge n'est consommée.

### 4.6 Cache et anciennes adresses

- L'offre gratuite a le CDN « basique » : sans vidage possible, une ancienne adresse publique peut encore marcher pendant la durée du `cacheControl`. Avec **300 s**, un fichier redevenu protégé (ou effacé) reste joignable **5 minutes au plus** à son ancienne adresse publique, plus la minute au plus avant que la tâche `fichiers` ne le déplace quand l'admin n'a pas pu appeler `files` lui-même : **6 minutes au pire**.
- C'est un **écart** à une décision validée d'ADMIN § 6 (« leurs anciennes adresses cessent de marcher »). Je ne l'ai donc pas tranché seul : c'est la question 5 du § 8.2. Le Smart CDN de l'offre Pro ramène la fenêtre à environ 60 s. En attendant ta réponse, rien n'est écrit comme acquis dans `docs/ADMINISTRATION.md`.
- Comme un fichier ne se remplace jamais (§ 1.9), un cache court ne ralentit pas l'app : elle garde ses images en cache par `id`.

---

## 5. Ce que lira l'app mobile

> **En bref** : l'app demande « la liste des articles », « ce contenu », « le plan de cette méthode »… La base ne répond qu'avec ce qui est publié, et ne donne le contenu réservé qu'aux abonnés du bon niveau. La façon dont les lecteurs auront un compte et un abonnement reste à décider avec le paiement.

### 5.1 Les fonctions de lecture

Des RPC `security definer`, `stable`, exécutables par `anon` et `authenticated`, qui ne lisent que `private.live` :

| RPC | Renvoie |
|---|---|
| `app_feed(section, category_id, before, lim)` | articles ou épisodes en ligne, triés par `first_published_at`, 50 au plus par page : `id`, `versionId`, titre, résumé, couverture, catégories existantes, niveau (`name`, `rank`) ou `null`, `locked`, dates |
| `app_content(id)` | la version en ligne (racine, chapitre ou leçon) : titre, résumé, niveau, `locked`, `blockTypes`, et **seulement si** c'est gratuit ou si `reader_rank()` suffit : `blocks`, le son d'un épisode. Plus une table `files` : `mediaId → { kind, mime, path, alt, transcript, width, height, durationS }` (informations figées). Sans le niveau : `locked: true`, et `files` ne contient que la couverture. **L'emplacement (public ou protégé) n'y figure pas** : il peut changer sans nouvelle version. |
| `app_file_locations(mediaIds uuid[])` | pour chaque fichier que l'appelant a le droit de voir (cité par une version en ligne gratuite, ou d'un rang qu'il atteint, ou couverture d'un contenu en ligne), son emplacement réel : `public` ou `protected` |
| `app_method(id)` | la fiche et le plan figé : chapitres (titre, `locked` de l'introduction) et leçons (titre, `isFree`, `locked`), dans l'ordre. On ouvre ensuite chaque élément avec `app_content`. |
| `app_page(slug)` | la page **en ligne** dont la version porte ce `slug` (`versions.slug`), comme `app_content`. Changer l'adresse dans le brouillon ne change rien avant la publication. |
| `app_categories(section)`, `app_access_levels()` | pour les filtres et l'affichage des niveaux |

`versionId` sert de clé de cache pour `app_content` (TanStack Query côté app) : il change à chaque publication. `app_file_locations` n'est gardé en cache qu'une minute.

### 5.2 Fichiers

- L'emplacement d'un fichier peut changer sans que la version du contenu change : le fichier F sert à l'article gratuit A et à l'article réservé B ; quand on retire A de l'app, F redevient protégé, mais la version de B reste la même. D'où `app_file_locations`, appelé à part et gardé une minute seulement.
- **Public** : l'app calcule l'adresse avec `getPublicUrl` (aucun appel réseau).
- **Protégé** : `createSignedUrls(paths, 3600)` pour les images et PDF, 6 h pour un audio **[D22]**.
- **En cas d'échec** de chargement (fichier déplacé entre-temps), l'app essaie l'autre emplacement (adresse publique, puis lien temporaire, ou l'inverse) et invalide `app_file_locations`.
- `expo-image` avec `cacheKey = mediaId`, pour que le cache survive au changement de jeton et d'emplacement.

### 5.3 Affichage

- **Registre des blocs** `mobile/src/blocks/registry.tsx`, avec les validateurs générés (fichier autonome, § 2.1) : un bloc invalide ou inconnu devient l'encart « Mets à jour l'app ».
- **Texte** : un rendu maison récursif du JSON restreint (une centaine de lignes, sans dépendance) : `<Text>` imbriqués pour le gras, l'italique et les liens (ouverts avec `expo-web-browser`), `<View>` pour les listes. Tiptap ne tourne pas en natif, et les bibliothèques existantes sont peu suivies.
- **Image** : `expo-image`, avec la place réservée grâce aux dimensions. **Encadré** : `<View>` avec les constantes de `blocks.tokens.json`.
- À venir : SVG avec `react-native-svg` 15.15.4 (plus fiable qu'`expo-image` sur iOS pour certains arcs), Lottie avec `lottie-react-native` ~7.3.8 (à vérifier avec `npx expo-doctor`), son avec `expo-audio`, PDF ouvert avec `expo-web-browser`. Tous s'installent avec `npx expo install`.

### 5.4 Lecteurs et paiement

- ADMIN § 10 remet le paiement à plus tard. `reader_access` n'est qu'un support provisoire ([D37], § 1.4) : sa forme et la façon de la remplir (par exemple une fonction Edge qui recevrait les notifications du service de paiement) seront décidées avec lui.
- **Comptes lecteurs** : les inscriptions sont fermées dans Supabase (ADMIN § 2), alors que les abonnés auront besoin d'un compte. C'est la question 3 du § 8.2 : dans le même projet Supabase, ou ailleurs.
- **Si c'est dans le même projet**, la sécurité de l'admin n'est tenue qu'à une condition, écrite noir sur blanc : `handle_new_user()` ne crée une fiche d'équipe **que pour une invitation** (§ 6.0, point 1). C'est le cas depuis l'étape 2 : un lecteur inscrit n'a aucune fiche d'équipe.

---

## 6. Plan de construction par étape (3 à 7) : migrations, écrans, tests

> **En bref** : chaque étape livre quelque chose d'utilisable et testé. Les fondations qui serviront à tout (tiroirs de fichiers, fonction serveur, tâches planifiées, corbeille, tests automatiques sur GitHub) sont posées dès l'étape 3, pour ne rien refaire ensuite.

### 6.0 Ce qui doit exister dès l'étape 3

1. **Une fiche d'équipe seulement sur invitation** : fait à l'étape 2. `handle_new_user()` ne crée une fiche que si `app_metadata.role` a été posé par la clé secrète ; un compte non invité n'a pas de fiche et `is_staff()` est faux pour lui même en aal2 (test pgTAP). Le premier admin est créé à la main (ADMIN § 2) ; en local, les tests créent leurs comptes avec ce repère.
2. Le schéma `private`, ses droits par défaut (§ 4.5), la façon d'écrire les RPC (§ 1.1) et les codes d'erreur.
3. Les extensions `pg_cron`, `pg_net` et `pg_jsonschema` (cette dernière servira à l'étape 4). pgTAP reste réservé aux tests, comme à l'étape 2.
4. Les deux buckets, le chemin `<id>/<nom>`, `cacheControl: '300'` (en attendant la question 5), les politiques Storage.
5. La fonction Edge `files` complète (vérifier, déplacer, effacer, nettoyer, contrôler), ses fonctions `public.files_*` réservées à `service_role`, ses secrets dans Vault, les tâches `fichiers`, `corbeille`, `audit-fichiers` et `menage`.
6. Les colonnes de corbeille, la vue `trash_items` (fichiers seulement au début) et la page Corbeille, déjà générique. ADMIN § 11 place la corbeille à l'étape 5 (Publication) : je l'avance à l'étape 3 pour les fichiers seulement, parce qu'une médiathèque sans corbeille ne permettrait ni de supprimer ni de restaurer **[D38]**. Elle devient complète à l'étape 5.
7. La convention `mediaId`, `private.media_uses()` et `private.files_to_move()`. Elles renvoient une liste vide tant que `contents` et `versions` n'existent pas, puis sont remplacées (`create or replace`) aux étapes 4 et 5 sans rien changer côté admin.
8. Des **aides pgTAP** pour simuler un anonyme, un éditeur aal1, un éditeur aal2, un admin et un **lecteur** (un compte sans fiche, avec ou sans ligne `reader_access`), en réglant `request.jwt.claims` comme dans `10_equipe.test.sql`. Elles ne sont utilisables qu'une fois le point 1 en place. Elles sont rangées dans un fichier inclus par chaque test (`\ir`) ; la façon exacte dont `supabase test db` choisit ses fichiers est à confirmer au début de l'étape.
9. **Un test de droits par table**, à chaque étape, sur le modèle de `10_equipe.test.sql` : pour chacun des cinq profils ci-dessus, ce qu'il peut lire et écrire (`table_privs_are`, `column_privs_are`, puis des lectures et écritures réelles sous chaque rôle), et `function_privs_are` pour chaque RPC.
10. **Types générés** (ADMIN § 9) : un script `npm run db:types` dans `web/` régénère `web/src/lib/database.types.ts` depuis la base locale (`supabase gen types typescript --local`, puis Prettier), et son équivalent `mobile/src/lib/database.types.ts` pour les RPC `app_*`. On le lance **après chaque migration**, à chaque étape.
11. **Tests automatiques sur GitHub** (ADMIN § 8, « lancés automatiquement ») : voir le tableau ci-dessous.

**Ajouts aux garde-fous** (`.github/workflows/garde-fous.yml`)

| Où | Ce qui tourne | Dès l'étape |
|---|---|---|
| job « Base de données » | Supabase démarré en entier (`supabase start`, sans Studio), et non plus seulement la base : les politiques de Storage, les buckets créés par migration et la fonction Edge en ont besoin. À vérifier au début de l'étape 3 : les tests pgTAP qui touchent `storage.*` ont-ils besoin de plus que `supabase db start` ? | 3 |
| job « Base de données » | tests pgTAP (déjà là) | 2 |
| job « Base de données » | `supabase functions serve` en arrière-plan, puis les tests Deno de `files` (et ceux d'`equipe`, qui ne tournent pas encore sur GitHub : `npm run functions:test`) | 3 |
| job « Base de données » | contrôle des types générés : `db:types`, puis `git diff --exit-code` sur les deux fichiers | 3 |
| job « Base de données » | contrôle de l'empreinte du schéma des blocs (§ 2.1) | 4 |
| job « Administration » | `blocks:generate`, puis `git diff --exit-code` | 4 |
| nouveau job « Parcours » | Supabase local avec le seed (comptes de test et leurs secrets de double vérification, qui ne servent qu'en local), l'admin construite puis servie, et Playwright. Ce job ne bloque la mise en production que si on l'ajoute aux Deployment Checks de Vercel, ce qui se fait avec ton accord. | 3 |

Tout reste dans les étapes du job « Base de données » plutôt que dans de nouveaux jobs, sauf Playwright : les Deployment Checks de Vercel attendent les noms « Administration » et « Base de données », qu'on ne change pas.

### Étape 3 : Médiathèque

- **Migrations** : extensions, schéma `private` et ses droits par défaut ; table `media` (RLS, droits par colonne, `check` dont la taille des SVG et Lottie, trigger `before delete`) ; `media_audit` ; buckets et politiques Storage (chemin exact à l'envoi ; `reader_can_open` renvoie faux pour l'instant) ; RPC `media_create`, `media_confirm`, `media_trash` (avec `for update`), `media_restore`, `empty_trash`, `media_uses` ; vue `trash_items` ; `private.purge_trash`, `private.kick_files`, `private.files_to_move` ; fonctions `public.files_worklist`, `files_mark_checked`, `files_mark_moved`, `files_mark_purged`, `files_mark_purge_failed`, `files_record_audit`, réservées à `service_role` ; tâches cron ; secrets Vault (valeurs locales dans le seed).
- **Fonction Edge** : `files`, avec ses tests Deno (comme `equipe`) : SVG piégés, Lottie invalides ou trop lourds, troisième échec de vérification, idempotence, effacement refusé par la base (pas de boucle), refus d'un appel sans secret ni JWT aal2.
- **Types** : `db:types` (web et mobile).
- **Garde-fous** : Supabase complet, tests Deno, contrôle des types, job « Parcours » (§ 6.0).
- **Écrans** :
  - `/mediatheque` : grille et liste, recherche, filtres par type, occupation totale (alerte à 800 Mo) ;
  - envoi par glisser-déposer, avec réduction des photos (conversion des GIF et HEIC), nettoyage des SVG, normalisation des types audio, envoi reprenable des audios, état « Vérification… » puis « Refusé : raison » ;
  - fiche : texte alternatif, transcription, « Utilisé dans » (vide pour l'instant), dimensions et durée ;
  - `/corbeille` avec le filtre « Fichiers », Restaurer, Vider, et « Effacement impossible » ;
  - dans la Médiathèque, pour toute l'équipe, les fichiers orphelins de `media_audit` avec « Nettoyer ».
- **Tests** :
  - pgTAP, droits par table (§ 6.0, point 9) : `media` (anonyme, éditeur aal1 et lecteur ne voient rien ; seules les colonnes `name`, `alt` et `transcript` sont modifiables par l'équipe, et seulement hors corbeille ; `status`, `is_public`, `purge_requested_at` ne le sont pas) ; `media_audit` (lecture par l'équipe aal2 seulement, aucune écriture par `authenticated`) ; fonctions `files_*` non exécutables par `anon` ni `authenticated` ; aucune fonction de `private` exécutable par `anon` ni `authenticated`, sauf `reader_can_open` ;
  - pgTAP, règles : un compte non invité n'a pas de fiche et `is_staff()` est faux même en aal2 ; un envoi est refusé à un autre chemin que celui de la ligne `pending` qu'on a créée (même dans son dossier), dans le bucket public, ou sans aal2 ; `update` et `delete` directs refusés sur `storage.objects` ; `kind` et `mime` incohérents refusés ; SVG ou Lottie de plus de 5 Mo refusé ; `media_confirm` refuse un objet absent ou de mauvaise taille ; un fichier dont l'effacement est demandé n'est plus dans `trash_items` et ne se restaure plus ; la purge ne prend que ce qui a plus de 30 jours ; les tâches cron existent.
  - Vitest : réduction d'une photo (taille visée), conversion d'un GIF, normalisation `audio/x-m4a` → `audio/mp4`, nettoyage d'un SVG piégé, choix TUS au-delà de 6 Mo, textes.
  - Playwright : se connecter avec les deux codes, envoyer une image, saisir son texte alternatif, la supprimer puis la restaurer.

### Étape 4 : Éditeur de blocs

- **Migrations** : table `contents` complète (toutes les sortes et toutes les colonnes, contrainte d'exclusion sur `(parent_id, position)` ; la clé composite vers `versions` et la clé vers `access_levels` arriveront à l'étape 5), `edit_locks` (`holder_id` nullable) et sa publication Realtime ; **`categories` et `content_categories`** (sans écran) ; schéma de blocs généré (`private.blocks_schema`, `private.blocks_schema_hash`) ; triggers de forme, d'usage (avec `for share`), de sorte et de corbeille ; RPC `content_create`, `save_draft`, `lock_take`, `lock_heartbeat`, `lock_release`, `lock_status` ; `media_uses` étendu aux brouillons.
- **Code** :
  - `blocks/` : `blocks.schema.json`, `blocks.tokens.json`, cas de test ; `web/scripts/blocks-generate.mjs` (validateurs autonomes en ESM) et le contrôle dans les garde-fous ;
  - `web/src/blocks/` : registre, éditeurs Texte, Image et Encadré, `cleanTextDoc` ;
  - éditeur plein écran (le menu se cache, « ← Pages » ramène à la liste) : aperçu téléphone au centre, réglages à droite, **plan à gauche dans un panneau qu'on ouvre et ferme, fermé par défaut** ; glisser-déposer par une poignée ; bandeau de lecture seule avec « Reprendre la main » ;
  - hooks `useAutosave` et `useEditLock` (signe de vie au retour sur l'onglet, relâche après 30 minutes cachées) ;
  - une liste « Pages » minimale (créer, ouvrir) pour essayer l'éditeur, que l'étape 7 complète.
- **Types** : `db:types`. **Garde-fous** : `blocks:generate` et empreinte du schéma.
- **App** : vérifier qu'un validateur généré se charge sous Hermes (dans un écran de test de `mobile/`).
- **Tests** :
  - pgTAP, droits par table : `contents` (aucune écriture directe pour personne ; lecture refusée à l'anonyme, à l'éditeur aal1 et au lecteur) ; `edit_locks` (lecture réservée à l'équipe aal2, aucune écriture directe) ; `categories` (écriture refusée à l'anonyme, à l'aal1 et au lecteur, permise à l'équipe aal2) ; `content_categories` (lecture par l'équipe, aucune écriture directe) ; RPC non exécutables par `anon`.
  - pgTAP, règles : **d'abord la récursion draft-07 dans pg_jsonschema** ; brouillon invalide refusé (encadré dans un encadré, bloc lié dans un encadré, titre de niveau 1, lien `javascript:`, `id` en double, fichier `checking` ou dans la corbeille) ; `save_draft` refusé sans verrou, avec une révision périmée ou sur un contenu dans la corbeille ; catégorie de la mauvaise section refusée ; verrou périmé (90 s), repris, relâché (la ligne reste, `holder_id` nul) ; renuméroter les leçons après en avoir mis une à la corbeille ; `draft_media_ids` calculé ; un fichier utilisé ne va plus à la corbeille ; **retirer un membre** qui a créé et mis un contenu à la corbeille (les colonnes d'auteur passent à `null`, rien d'autre ne change) ; un éditeur aal1 ne peut rien appeler.
  - Vitest : validateurs générés contre les cas partagés ; `cleanTextDoc` ; le contenu collé est nettoyé par Tiptap ; `useAutosave` avec de fausses minuteries (1,5 s, 10 s, une requête à la fois, hors ligne) ; machine d'états du verrou (dont le retour sur un onglet caché) ; règle de dépôt dans un encadré ; Espace et Entrée dans un bloc Texte ne déclenchent pas de déplacement.
  - Playwright : écrire, déplacer un bloc par sa poignée, recharger et retrouver son texte ; deux navigateurs : le second est en lecture seule, voit le texte changer, reprend la main, et le premier bascule en lecture seule avec « Copier mon texte » ; le premier quitte, et le second voit le verrou libéré.

### Étape 5 : Publication

- **Migrations** : `versions` (immuable, `published_by` sans clé étrangère, `slug`, `body_hash`) et la clé composite ; `access_levels`, `access_levels_reorder`, `reader_access` (provisoire), `private.reader_rank` ; clé de `contents.access_level_id` ; `private.live` (racines ; le plan des méthodes arrive à l'étape 7) ; variante `published` (avec `altFromLibrary`) ; `private.do_publish` et les RPC `publish`, `unpublish`, `schedule`, `unschedule`, `revert_to_version`, `trash`, `restore`, `empty_trash` étendu aux contenus ; tâche `publications` (attente pendant l'écriture, [D31]) ; vraies versions de `files_to_move`, `media_uses` et `reader_can_open` ; RPC `app_content`, `app_file_locations`, `app_page`, `app_access_levels` ; si tu choisis l'option B de [D30], la RPC `media_push`.
- **Vercel** : `web/api/garder-actif.ts` et la tâche quotidienne (§ 3.9).
- **Types** : `db:types` (web et mobile, pour les RPC `app_*`).
- **Écrans** :
  - barre de publication : Publier, Programmer (date et heure de Paris), Retirer de l'app, états « Modifié depuis la publication », « Programmé le… », « Programmation en attente : quelqu'un écrit », « Programmation échouée » ; bandeau « ce que tu écris partira à cette heure » dans l'éditeur ;
  - panneau Historique : numéro, auteur, date, origine, « Revenir à cette version » ;
  - réglage du niveau d'accès dans l'éditeur ;
  - `/parametres` (admins) : formules, avec ajout, renommage, rangement par glisser-déposer, suppression si inutilisée ;
  - Corbeille complète (filtres par type, lots).
- **Tests** :
  - pgTAP, droits par table : `versions` (lecture refusée à l'anonyme, à l'aal1 et au lecteur ; aucune écriture pour personne) ; `contents` et `versions` illisibles directement par `anon` et par un aal1 ; `access_levels` (lecture par l'équipe, écriture par l'admin seulement, refusée à l'éditeur) ; `reader_access` (un lecteur ne lit que sa ligne, aucune écriture par `authenticated`) ; RPC `app_*` exécutables par `anon`, les autres non.
  - pgTAP, règles : une version ne se modifie ni ne se vide ; **retirer un membre qui a publié** (sa version reste intacte, son nom recopié aussi) ; un contenu ne peut pas pointer vers la version d'un autre ; l'app (`anon`) ne voit ni brouillon ni contenu dans la corbeille ; un contenu réservé renvoie `locked` à un anonyme et à un abonné de rang trop bas, les blocs à un abonné du bon rang ; politique Storage sur un fichier protégé (anonyme, abonné, équipe) ; `files_to_move` quand on passe de gratuit à réservé et retour, y compris « encore utilisé par un contenu gratuit » et la minute d'attente couverte par `reader_can_open` ; `app_file_locations` suit le déplacement sans nouvelle version ; programmation, rattrapage, échec affiché, **attente quand un membre écrit après la programmation, publication quand le verrou est libre, échec au bout d'une heure** ; `publish()` refusé sous pg_cron sans passer par `do_publish` ; purge à 30 jours ; auteur, nom recopié et origine des versions ; `publish` refusé si un autre membre écrit ; restaurer ne republie pas ; `revert_to_version` avec un fichier dans la corbeille (le `mediaId` devient `null`) et avec `altFromLibrary` (l'`alt` revient à `null`) ; changer le `slug` du brouillon ne change pas `app_page` ; une page restaurée dont l'adresse est prise revient sans adresse ; un éditeur ne touche pas aux formules ; une formule utilisée ne se supprime pas ; texte alternatif figé à la publication ; mise à la corbeille d'un fichier pendant qu'un brouillon l'insère (deux sessions : une seule réussit).
  - Vitest : conversion de l'heure de Paris en `timestamptz` (y compris aux changements d'heure), états de la barre de publication.
  - Playwright : écrire, publier, modifier le brouillon et vérifier (par la RPC de l'app) que l'app montre toujours l'ancienne version, republier, revenir à une version, programmer.

### Étape 6 : Modèles de blocs

- **Migrations** : règles `template_sort` (déjà en `check`), bloc unique pour `shared`, variante `template` ; résolution des `linked` dans `do_publish` ; RPC `template_create_from`, `template_outdated`, `template_push` (tous deux limités aux brouillons qui citent encore le modèle), `template_detach_all` (avec le passage autorisé par le garde de corbeille), `content_create(from_template_id)` ; refus de mettre à la corbeille un modèle `shared` utilisé.
- **Types** : `db:types`.
- **Écrans** : `/modeles` (liste par sorte) ; « Enregistrer comme modèle » sur une sélection de blocs ; insertion depuis le panneau des blocs ; bloc lié encadré avec « Modifier le modèle » et « Détacher » ; « Mettre à jour ces N contenus dans l'app » ; « Détacher partout » ; choix d'un point de départ à la création d'un contenu.
- **Tests** :
  - pgTAP, droits : les RPC de modèles refusées à l'anonyme, à l'aal1 et au lecteur.
  - pgTAP, règles : la sorte ne change pas ; `shared` a un seul bloc ; pas de `linked` dans un modèle ni dans un encadré ; `template_push` ne publie pas le reste du brouillon et part de la version en ligne ; `template_outdated` ignore les `id` ; **détacher le bloc dans un contenu publié, puis vérifier qu'il n'est plus proposé à la mise à jour** ; `template_detach_all` refuse quand un brouillon est tenu par un autre, et passe sur un brouillon dans la corbeille ; suppression refusée puis permise ; `revert_to_version` rétablit le lien, et retire le marqueur quand le modèle est dans la corbeille.
  - Vitest : résolution, détachement.
  - Playwright : corriger un encadré « Contact », le voir changer dans deux brouillons, mettre à jour l'app.

### Étape 7 : Sections

- **Pages** : liste complète, `slug`, publication ; `app_page`.
- **Blog** : écran des catégories (les tables existent depuis l'étape 4), liste filtrable, image de présentation, résumé ; `app_feed`, `app_categories`.
- **Podcasts** : son obligatoire à la publication, durée, transcription (dans la fiche du fichier).
- **Méthodes** : plan figé dans `private.live` et `do_publish` (réutilisation selon `body_hash`) ; `publish_preview` et la confirmation avant publication ([D29], selon ta réponse à la question 4) ; `unpublish` et `trash` d'un chapitre ou d'une leçon (`origin = 'outline'`) ; `template_push` pour les leçons ; `app_method`. Écran d'arbre (chapitres et leçons déplaçables avec dnd-kit, sur le modèle de l'exemple « Tree »), introduction de chapitre, cases « Leçon gratuite » et « Montrer dans l'app » (décochée à la création), état de chaque élément (« modifié depuis la publication »). **Trancher la question d'ADMIN § 10** et ajuster `private.chapter_intro_level()`.
- **Accueil** : mes brouillons récents (`draft_saved_by = moi`), publications programmées, programmations en attente ou échouées.
- **Types** : `db:types`.
- **Tests** :
  - pgTAP : parent de la bonne sorte ; catégorie de la bonne section ; plan figé (réordonner ne change rien avant publication) ; leçons inchangées réutilisées ; **leçon dont le modèle `shared` ou le texte alternatif a changé : republiée, pas réutilisée** ; une leçon neuve n'apparaît pas tant que « Montrer dans l'app » n'est pas coché ; `publish_preview` liste neufs, modifiés et retirés ; niveau réel des leçons et des introductions ; retrait d'une leçon ; restauration d'un lot (en fin de liste) ; programmation d'une méthode pendant qu'on écrit une de ses leçons ; épisode sans son refusé ; deux pages en ligne ne peuvent pas avoir la même adresse.
  - Playwright : un parcours complet par section.

---

## 7. Limites de l'offre gratuite et risques

> **En bref** : l'offre gratuite suffit pour construire et essayer l'admin, pas pour lancer l'app avec des podcasts : c'est déjà prévu (passage à Pro avant le lancement). Les autres risques sont connus et ont une parade.

| Limite ou risque | Conséquence | Parade |
|---|---|---|
| **Base de 500 Mo** | Chaque version est une copie. Estimation : 300 contenus × 15 versions × 15 Ko ≈ 70 Mo avant compression (Postgres compresse les gros JSON). | 256 Ko par brouillon ; leçons inchangées réutilisées ; purge des journaux cron et pg_net ; taille de la base affichée dans les Paramètres (alerte à 400 Mo). L'historique est gardé en entier pour l'instant ; si l'alerte sonne, on garde les 20 dernières versions par contenu, jamais celles citées par un plan en ligne **[D23]**. |
| **1 Go de fichiers, 50 Mo par fichier, 5 Go téléchargés par mois** | Suffisant pour des photos réduites, pas pour des podcasts. | Offre Pro avant le lancement (ADMIN § 8). D'ici là, épisodes de test courts. Occupation affichée dans la Médiathèque. |
| **Pas de vidage du cache CDN** | Ancienne adresse publique joignable 5 min au plus (+ 1 min de déplacement au pire). Écart à ADMIN § 6. | **Question 5 du § 8.2**, pas encore tranchée. `cacheControl: '300'` en attendant ; Smart CDN avec Pro (environ 60 s). |
| **Pause après une semaine sans activité** | Les publications programmées ne partent pas pendant la pause. | Tâche Vercel quotidienne (§ 3.9) ; rattrapage automatique au redémarrage ; Pro avant le lancement. |
| **Fonctions Edge : 500 000 appels, sans dépassement possible ; 256 Mo de mémoire, 2 s de processeur** | Au-delà, il faudrait payer ; un gros fichier ne pourrait pas être vérifié. | `kick_files` n'appelle que s'il y a du travail ; la lecture des fichiers protégés n'utilise pas de fonction ; SVG et Lottie limités à 5 Mo, trois essais au plus. Quelques milliers d'appels par mois. |
| **Realtime : 200 connexions, 2 M messages par mois** | Sans effet à l'échelle de l'équipe. | On n'écoute que `edit_locks` (lignes minuscules, sans `DELETE`) ; repli sur des appels réguliers. |
| **pg_net est asynchrone, sans garantie de livraison** | Un appel à `files` peut se perdre. | `files` est idempotente et relancée chaque minute tant qu'il reste du travail. La requête n'est mise en file que si la transaction est validée (à confirmer par un test local). |
| **pg_jsonschema 0.3.3** | Prise en charge du draft-07 et des `$ref` récursifs à confirmer ; le schéma est relu à chaque contrôle. | Premier test de l'étape 4, repli prévu (§ 2.1). Les brouillons font quelques dizaines de Ko. |
| **Schéma qui change** | Les lignes existantes ne sont pas revérifiées. | On ne fait qu'ajouter ; un changement cassant passe par une migration des données et `v: 2`. |
| **Vérification des SVG par analyse de texte** | Moins fine qu'un vrai nettoyage. | Elle refuse, elle ne réécrit pas : au pire, un SVG légitime mais exotique est refusé. L'admin et l'app n'exécutent jamais de script SVG (`<img>`, `react-native-svg`). |
| **Ajv « standalone » sous Hermes** | À vérifier dans l'app. | Fichier autonome (aides d'Ajv incluses) ; repli : `@cfworker/json-schema` (JavaScript pur). |
| **lottie-react-native** | Version à confirmer avec `npx expo-doctor`. | Installation avec `npx expo install`. |
| **Pas de préproduction** (2 projets gratuits déjà pris) | Tout se teste en local. | pgTAP, tests Deno, Vitest et Playwright contre Supabase local, **lancés sur GitHub à chaque demande de fusion** (§ 6.0). |
| **Fuseau de pg_cron en GMT** | Une heure de Paris mal convertie décalerait la publication. | Tout en `timestamptz` ; test des changements d'heure. |
| **Onglet caché** | Chrome ralentit les minuteries : le signe de vie peut tomber à une fois par minute. | Expiration à 90 s, signe de vie au retour sur l'onglet, relâche après 30 minutes cachées. |
| **Reprise de la main** | Celui qui la perd peut perdre au plus 1,5 s de frappe côté serveur. | Son texte reste dans son navigateur (« Copier mon texte »). |
| **Comptes hors équipe** | Un compte lecteur ne doit jamais devenir membre de l'équipe. | Fait à l'étape 2 : fiche d'équipe sur invitation seulement, avec son test. |
| **Équipe** | Tant qu'il n'y a qu'un admin, personne ne peut réinitialiser sa double vérification (ADMIN § 2), et les tests de parcours ont besoin de deux comptes. | Premier admin : **Vincent Lo Re**, créé à la main (procédure dans ADMIN § 2). **Inviter un second admin** avant d'utiliser l'admin en ligne. En local, les comptes de test et leur secret de double vérification viennent du seed. |

---

## 8. Décisions prises en autonomie (à relire par l'utilisateur)

> **En bref** : voici les choix que j'ai faits sans te demander, pour que tu puisses les valider ou les changer, puis cinq questions qui n'appartiennent qu'à toi.

### 8.1 Décisions

| n° | Décision | Pourquoi |
|---|---|---|
| D1 | Tables et colonnes en anglais, comme `profiles` ; libellés en français dans `texts.ts` | Cohérence avec l'étape 2 |
| D2 | Les versions figent la formule, pas son rang : réordonner les formules change tout de suite qui peut lire quoi | Le rang est un réglage, pas du contenu |
| D3 | Une seule table `contents` pour toutes les sortes, modèles compris | Un seul éditeur, verrou, corbeille et enregistrement à écrire |
| D4 | Une méthode n'a qu'une fiche (titre, résumé, image), sans blocs pour l'instant | ADMIN § 1 ne prévoit d'introduction que pour les chapitres |
| D5 | L'introduction d'un chapitre suit le niveau de la méthode, en attendant ta décision (ADMIN § 10), réglée dans une seule fonction | Choix prudent, facile à changer |
| D6 | Un fichier est « utilisé » s'il est cité par un brouillon (corbeille et modèles compris) ou une version en ligne ; l'historique ne protège pas les fichiers | Sinon un fichier ne pourrait plus jamais être supprimé |
| D7 | La forme des blocs est un JSON Schema draft-07 écrit à la main (pas un schéma Zod converti, bien que Zod 4 sache produire du draft-07) | Maîtrise exacte du schéma (récursion, `additionalProperties`, trois variantes), aucune dépendance au convertisseur, draft-07 le plus sûr pour pg_jsonschema |
| D8 | Le générateur vit dans `web/` (`npm run blocks:generate`), la source dans `blocks/` à la racine ; les validateurs de l'app sont des fichiers autonomes | `web/` a déjà l'outillage ; la racine ne garde que le CLI Supabase ; `mobile/` n'a pas besoin d'`ajv` |
| D9 | Toute référence de fichier s'appelle `mediaId` (couverture et son compris), toute référence de modèle `templateId` | Les blocs futurs sont suivis sans rien changer |
| D10 | Titres de niveau 2 et 3 seulement ; liens `https:` et `mailto:` seulement, sans `target` ni `rel` | Le titre du contenu est le niveau 1 ; sécurité des liens |
| D11 | Un modèle « bloc identique partout » contient exactement un bloc (on regroupe dans un Encadré) | Lecture littérale de « le même bloc » (ADMIN § 5) |
| D12 | `blocks.tokens.json` partagé entre l'aperçu de l'admin et l'app | Un aperçu vraiment fidèle |
| D13 | Verrou tenu en base (signe de vie 20 s et au retour sur l'onglet, expiration 90 s, relâché après 30 minutes d'onglet caché) ; libérer = vider `holder_id` ; suivi en direct par Realtime sur `edit_locks` seulement, avec repli toutes les 30 s ; pas de Presence | Réaction immédiate sans messages lourds ; résiste au ralentissement des onglets cachés ; Realtime ne filtre pas les suppressions |
| D14 | Publier est refusé si un **autre** membre écrit le contenu (ou un élément de la méthode) ; si le verrou est libre ou à soi, on publie sans le prendre | Évite de publier un texte en cours d'écriture, sans obliger à « reprendre la main » quand personne n'écrit |
| D15 | Le texte alternatif n'est pas obligatoire pour publier ; l'éditeur avertit | Pas de règle non décidée |
| D16 | Une publication programmée publie le brouillon enregistré à l'heure dite, pas une copie faite au moment de programmer (voir D31) | Les corrections faites entre-temps partent ; pas de copie en double |
| D17 | « Revenir à cette version » d'une méthode ne ramène que sa fiche ; le plan et chaque leçon ont leur propre historique | Simple et prévisible |
| D18 | Restaurer depuis la corbeille ramène le contenu en brouillon, sans le republier | « Publier reste un geste volontaire » (ADMIN § 4) |
| D19 | Une tâche Vercel quotidienne évite la mise en pause du projet gratuit | pg_cron ne compte peut-être pas comme activité |
| D20 | Les buckets sont créés par migration, pas déclarés dans `config.toml` | Une seule source, identique en local et en ligne |
| D21 | Fichiers envoyés avec un cache de 5 minutes (`cacheControl: '300'`) ; un fichier ne se remplace jamais | Fenêtre la plus courte sans Pro ni surcoût de requêtes ; **l'écart qui en résulte avec ADMIN § 6 est la question 5** |
| D22 | Liens temporaires : 1 h pour les images et PDF, 6 h pour un audio | Un épisode s'écoute sans coupure |
| D23 | Historique gardé en entier, avec une alerte à 400 Mo et une règle de purge prête | Rien ne presse à cette taille |
| D24 | Tout fichier est d'abord protégé ; il ne devient public que quand un contenu gratuit en ligne l'utilise ; une leçon gratuite compte comme gratuite | Lecture directe d'ADMIN § 6 |
| D25 | Les SVG sont nettoyés dans le navigateur **et** vérifiés par la fonction Edge (refus, sans réécriture) ; les Lottie sont vérifiés de la même façon, sans refuser les « expressions » | La base fait la loi sans nettoyage lourd côté serveur |
| D26 | Seules les leçons et chapitres peuvent être retirés un par un de l'app (`in_app`), par une nouvelle version de la méthode | « Retirer de l'app » doit marcher aussi pour une leçon |
| D27 | L'app trie les listes sur la date de **première** publication | Une correction ne remonte pas un vieil article |
| D28 | Supprimer une catégorie est définitif (pas de corbeille) ; l'app ignore les catégories disparues | La corbeille d'ADMIN § 3 ne liste pas les catégories |
| **D29** | **Une méthode se publie d'un seul geste, chapitres et leçons modifiés compris.** Conséquence : une leçon en cours d'écriture part en ligne avec les autres si « Montrer dans l'app » est coché. Garde-fous : case décochée à la création, liste des changements à confirmer avant de publier ou de programmer. **À valider : question 4.** | Plan versionné (rien ne bouge dans l'app avant la publication), un seul état en ligne cohérent pour la méthode |
| **D30** | **Texte alternatif et transcription figés à la publication** : les corriger dans la Médiathèque ne change l'app qu'après republication. Option proposée : « Mettre à jour ces N contenus dans l'app » sur la fiche du fichier (§ 2.4) | Tient la copie figée d'ADMIN § 3 ; le raccourci évite de republier chaque contenu |
| **D31** | **Publication programmée pendant qu'on écrit** : si un membre tient un verrou actif et que le brouillon a changé depuis la programmation, elle attend de minute en minute, au plus une heure, puis échoue (« brouillon en cours d'écriture ») ; bandeau permanent dans l'éditeur. Lié à D16 | Même prudence que D14, alors que personne n'est devant l'écran |
| **D32** | Une formule d'abonnement **inutilisée** peut être supprimée (ADMIN § 3 ne prévoit que créer, renommer, ranger) | Réparer une formule créée par erreur ; une formule utilisée reste protégée |
| **D33** | Types de fichiers en liste fermée (JPEG, PNG, WebP, SVG, JSON Lottie, MP3, M4A/MP4 audio, PDF). Les autres images que le navigateur sait lire (GIF, HEIC) sont converties en WebP ou JPEG à la réduction ; un GIF animé perd son animation, avec un avertissement. Les types audio sont normalisés avant l'envoi (`audio/x-m4a` → `audio/mp4`) | ADMIN § 6 dit « images, audios » : on accepte ce que le navigateur sait lire, sans laisser entrer de format que l'app ne sait pas afficher |
| **D34** | Légende d'image : texte simple, 300 caractères au plus | Une légende courte, sans mise en forme, s'affiche partout pareil |
| **D35** | Brouillon limité à 256 Ko | Ménager les 500 Mo de base ; un long article en fait quelques dizaines |
| **D36** | Un chapitre ou une leçon peut être mis seul à la corbeille (ADMIN § 3 ne cite que les articles, épisodes, méthodes, pages, modèles et fichiers) | Supprimer une leçon sans supprimer la méthode |
| **D37** | `reader_access` (formule de chaque lecteur, liée à `auth.users`, avec date de fin et origine) est **provisoire** : elle sert à écrire et tester les règles des contenus réservés. À revoir quand le paiement sera choisi (ADMIN § 10) | Tester dès l'étape 5 qui peut lire quoi, sans préjuger du paiement |
| **D38** | La page Corbeille arrive à l'étape 3 (fichiers seulement), et non à l'étape 5 comme dans ADMIN § 11 | Une médiathèque doit pouvoir supprimer et restaurer |
| **D39** | SVG et Lottie limités à 5 Mo ; trois vérifications ratées → fichier refusé | La fonction Edge doit pouvoir les vérifier (256 Mo, 2 s de processeur) |

### 8.2 Questions pour toi

1. **Image de présentation d'un contenu réservé.** A) Protégée (lecture stricte d'ADMIN § 6, choix actuel) : les non-abonnés voient une vignette neutre dans les listes. B) Toujours publique, comme une vitrine : l'app est plus engageante, mais c'est une exception à ADMIN § 6.
2. **Introduction d'un chapitre** (ADMIN § 10) : elle suit aujourd'hui le niveau de la méthode. À trancher à l'étape 7 : doit-elle devenir gratuite quand une de ses leçons l'est ?
3. **Des comptes lecteurs dans le même projet Supabase, alors que les inscriptions sont fermées (ADMIN § 2).** Les abonnés de l'app auront besoin d'un compte. A) Dans le même projet : il faudra ouvrir les inscriptions (ou créer les comptes par le service de paiement), et la sécurité de l'admin repose alors entièrement sur la règle « fiche d'équipe sur invitation seulement » (§ 6.0, point 1), qui est en place depuis l'étape 2. B) Ailleurs (autre projet ou autre service) : l'admin reste isolé, mais le projet gratuit est limité à 2 projets actifs, déjà pris (ADMIN § 9). À décider avec le paiement.
4. **Publier une méthode (D29).** A) Un seul geste pour toute la méthode (proposition actuelle), avec la case « Montrer dans l'app » décochée pour toute leçon neuve et la liste des changements à confirmer avant de publier. B) Un bouton « Publier » par leçon et par chapitre, qui publie cet élément seul (nouvelle version de la leçon, et nouvelle version de la méthode dont le plan en ligne pointe vers elle), le bouton de la méthode ne publiant que sa fiche et son plan (ordre, ajouts, retraits). B tient mot pour mot la promesse d'ADMIN § 3 (un brouillon ne touche l'app qu'à **sa** publication), au prix de deux sortes de publication à expliquer. Je recommande A pour sa simplicité, mais B est plus fidèle au texte.
5. **Anciennes adresses d'un fichier redevenu protégé** (ADMIN § 6 : elles « cessent de marcher »). Sans l'offre Pro, le cache du CDN ne peut pas être vidé. A) Accepter jusqu'à 6 minutes pendant l'offre gratuite (5 min de cache + 1 min de déplacement au pire), ramenées à environ 60 s par le Smart CDN de l'offre Pro, et l'écrire dans ADMIN § 6. B) Cache d'une minute (`cacheControl: '60'`) : 2 minutes au pire, mais davantage de requêtes qui passent le cache (l'app garde de toute façon ses images en cache par `id`). C) Autre parade à ton idée. Tant que tu n'as pas répondu, rien n'est écrit comme acquis dans ADMIN.

### 8.3 Ce qui a été corrigé par rapport aux propositions

- `public.is_staff()` (et non `private.is_staff()`), dans des politiques `to authenticated` seulement ; les politiques ouvertes à `anon` n'appellent que `private.reader_can_open`, et aucune autre fonction de `private` n'est exécutable par `anon` ni `authenticated`.
- Un anonyme peut lire un fichier gratuit qui n'a pas encore été déplacé (`reader_can_open` couvre le cas gratuit).
- Le plan d'une méthode est versionné (rien ne change dans l'app avant la publication), et un chapitre ou une leçon peut être retiré seul. La façon de publier une méthode est soumise à ta décision (D29, question 4).
- Le texte alternatif et la transcription sont figés dans la version (D30, avec un raccourci proposé).
- Le brouillon ne peut citer ni un fichier `pending`, `checking` ou dans la corbeille, ni un modèle dans la corbeille : la base le refuse, verrous de ligne compris.
- La politique d'envoi exige le chemin exact d'une ligne `pending` créée par la même personne.
- Types de fichiers en liste exacte, avec conversion et normalisation (D33) ; SVG et Lottie vérifiés côté serveur, 5 Mo au plus.
- Réglages (niveau, catégories, `slug`…) modifiés seulement sous le verrou, par `save_draft`, et sans effet sur l'app avant la publication.
- Realtime n'écoute qu'une petite table, jamais le brouillon, et jamais de suppression.
- Schéma des blocs en draft-07, et garde-fou par empreinte, qui ne lit pas les migrations.
- Restaurer ne republie pas ; l'image de présentation réservée n'est pas rendue publique sans ta décision.
- L'app valide les blocs (validateurs générés, autonomes), elle ne reçoit pas seulement des types.
- Les chapitres et les leçons apparaissent dans la corbeille, et un lot se restaure d'un coup.
- Retirer un membre de l'équipe ne bute plus sur l'immuabilité des versions ni sur la corbeille.
- La fonction Edge passe par des fonctions `public.files_*` réservées à la clé secrète, puisque l'API n'expose pas `private`.
- Une fiche d'équipe n'est créée que sur invitation, condition posée avant tout compte lecteur.

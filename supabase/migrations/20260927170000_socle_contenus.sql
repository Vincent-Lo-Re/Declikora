-- Socle des contenus (étapes 3 à 7) : extensions, schéma interne « private » et réglages des
-- tâches planifiées. Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.1, § 3.8, § 4.5 et § 6.0).

-- ---------------------------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------------------------

-- pg_net : appels HTTP depuis la base (la requête part après la validation de la transaction).
-- Ses fonctions restent dans le schéma « net », que l'extension crée elle-même et que l'API
-- n'expose pas.
create extension if not exists pg_net with schema extensions;

-- pg_cron : tâches planifiées (fuseau GMT). Attention : « drop extension pg_cron » supprimerait
-- toutes les tâches.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- pg_jsonschema : vérification de la forme des blocs (étape 4).
create extension if not exists pg_jsonschema with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Schéma interne « private »
-- ---------------------------------------------------------------------------------------------

-- Fonctions internes, vues de calcul et réglages. L'API ne l'expose pas (config.toml n'expose
-- que public et graphql_public) : même la clé secrète ne peut pas y appeler une fonction.
create schema if not exists private;

comment on schema private is
  'Fonctions internes et réglages. Non exposé par l''API. Seule private.reader_can_open est '
  'exécutable par anon et authenticated (politiques de Storage).';

-- anon et authenticated ont besoin d'« usage » pour que les politiques de Storage puissent
-- appeler private.reader_can_open. En contrepartie, AUCUNE autre fonction de ce schéma ne doit
-- leur être exécutable : Postgres donne par défaut EXECUTE à PUBLIC sur toute nouvelle fonction.
-- On retire donc ce droit par défaut AVANT de créer la moindre fonction ici, puis on ne rend
-- EXECUTE qu'à reader_can_open. Un test pgTAP (05_prive.test.sql) le vérifie à chaque étape.
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Attention : un « alter default privileges IN SCHEMA private revoke … from public » serait SANS
-- effet. Des droits par défaut propres à un schéma ne peuvent qu'AJOUTER aux droits par défaut
-- globaux, et l'EXECUTE de PUBLIC en fait partie (documentation de ALTER DEFAULT PRIVILEGES).
-- On le retire donc globalement, pour les fonctions que créera postgres (le rôle des
-- migrations). Dans public, rien ne change : Supabase y donne EXECUTE à anon, authenticated et
-- service_role par des droits par défaut propres au schéma, que chaque migration retire
-- fonction par fonction. Les déclencheurs ne vérifient pas ce droit quand ils se déclenchent.
alter default privileges for role postgres revoke execute on functions from public;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Réglages des tâches planifiées
-- ---------------------------------------------------------------------------------------------

-- Une seule ligne. Les valeurs sont PUBLIQUES (adresse de la fonction « files » et clé
-- publishable, déjà présente dans l'admin) : aucun secret n'est rangé ici, et rien n'est à
-- régler à la main en ligne.
-- - Cette migration écrit les valeurs de PRODUCTION (projet « Declikora »).
-- - supabase/seed.sql, qui ne tourne qu'en local (db start, start, db reset ; jamais db push),
--   les remplace par les valeurs locales.
-- La fonction « files » ne fait, sans session de membre, que le travail décidé par la base
-- (idempotent), avec un frein tenu ici (dernier passage) : connaître l'adresse et la clé ne
-- permet rien d'autre.
create table private.settings (
  id boolean primary key default true check (id),
  -- Adresse complète de la fonction Edge « files ».
  files_url text not null check (files_url ~ '^https?://'),
  -- Clé publishable du projet (en-tête apikey). Jamais la clé secrète.
  publishable_key text not null check (publishable_key like 'sb_publishable_%'),
  -- Frein anti-abus des appels sans session de membre (voir public.files_claim_run).
  files_last_kick_at timestamptz,
  files_last_audit_at timestamptz
);

comment on table private.settings is
  'Réglages publics des tâches planifiées (adresse de la fonction files, clé publishable) et '
  'frein anti-abus. Valeurs de production ici, valeurs locales dans supabase/seed.sql.';

alter table private.settings enable row level security;
revoke all on private.settings from public, anon, authenticated;

insert into private.settings (files_url, publishable_key)
values (
  'https://kajocxepxgaquculhrky.supabase.co/functions/v1/files',
  'sb_publishable_nwCD7WH9Btl4RDEWktB4zw_lcRYwrI_'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Réveil du projet gratuit
-- ---------------------------------------------------------------------------------------------

-- Une vraie requête à la base, sans rien écrire, appelée une fois par jour par le workflow
-- GitHub « Garder le projet actif » (.github/workflows/garder-actif.yml) avec la clé
-- publishable. Seule fonction du schéma public exécutable par anon à l'étape 3.
create function public.ping()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true
$$;

comment on function public.ping() is
  'Répond vrai, sans rien lire ni écrire : sert à garder le projet gratuit actif.';

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated, service_role;

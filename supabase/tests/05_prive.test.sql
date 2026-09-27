-- Schéma interne « private » et fonctions exposées : aucune fonction n'est exécutable par anon
-- ni authenticated sans l'avoir voulu. À garder à jour à chaque étape (§ 4.5 et § 6.0).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(16);

select has_schema('private', 'le schéma private existe');
select ok(
  not ('private' = any (
    string_to_array(coalesce(current_setting('pgrst.db_schemas', true), 'public,graphql_public'), ',')
  )),
  'private n''est pas exposé par l''API'
);
select schema_privs_are('private', 'anon', array['USAGE'], 'anon : usage seulement sur private');
select schema_privs_are(
  'private', 'authenticated', array['USAGE'], 'authenticated : usage seulement sur private'
);

-- Droits par défaut : une nouvelle fonction de private n'est exécutable par personne d'autre.
create function private.test_default_privileges() returns int language sql as 'select 1';
select ok(
  not has_function_privilege('anon', 'private.test_default_privileges()', 'execute')
    and not has_function_privilege('authenticated', 'private.test_default_privileges()', 'execute'),
  'une nouvelle fonction de private n''est pas exécutable par anon ni authenticated'
);
drop function private.test_default_privileges();

select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and has_function_privilege('anon', p.oid, 'execute')
    order by 1
  ),
  array['private.reader_can_open(text)'],
  'private : seule reader_can_open est exécutable par anon'
);
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and has_function_privilege('authenticated', p.oid, 'execute')
    order by 1
  ),
  array['private.reader_can_open(text)'],
  'private : seule reader_can_open est exécutable par authenticated'
);
select is(
  array(
    select c.relname::text
    from pg_class c
    where c.relnamespace = 'private'::regnamespace
      and c.relkind in ('r', 'v', 'm', 'p')
      and (has_table_privilege('anon', c.oid, 'select, insert, update, delete')
        or has_table_privilege('authenticated', c.oid, 'select, insert, update, delete'))
  ),
  array[]::text[],
  'private : aucune table ni vue accessible à anon ou authenticated'
);

-- Schéma public : les fonctions exécutables par anon sont une liste fermée.
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('anon', p.oid, 'execute')
    order by 1
  ),
  array['ping()'],
  'public : seule ping est exécutable par anon'
);

-- Les fonctions de déclencheur et les fonctions files_* ne sont pas appelables par l'API.
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and has_function_privilege('authenticated', p.oid, 'execute')
      and (p.proname like 'files\_%' or p.prorettype = 'trigger'::regtype)
    order by 1
  ),
  array[]::text[],
  'public : aucune fonction files_* ni de déclencheur exécutable par authenticated'
);

-- Réglages des tâches planifiées : valeurs publiques, une seule ligne.
select is((select count(*)::int from private.settings), 1, 'réglages : une seule ligne');
select ok(
  (select publishable_key like 'sb_publishable_%' from private.settings),
  'réglages : la clé rangée est une clé publishable (jamais la clé secrète)'
);
select is(
  (select files_url from private.settings),
  'http://kong:8000/functions/v1/files',
  'réglages : en local, le seed vise la fonction files par la passerelle du réseau Docker'
);

-- Réveil du projet gratuit.
select pg_temp.as_anon();
select ok(public.ping(), 'anon : ping répond vrai');
select pg_temp.as_postgres();
select volatility_is('public', 'ping', array[]::text[], 'stable', 'ping ne modifie rien (stable)');

-- Extensions de l'étape 3.
select ok(
  (select count(*) = 3 from pg_extension where extname in ('pg_cron', 'pg_net', 'pg_jsonschema')),
  'extensions pg_cron, pg_net et pg_jsonschema actives'
);

select * from finish();
rollback;

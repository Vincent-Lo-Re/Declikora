-- Publication (étape 5) : droits par table et par fonction, pour les cinq profils (§ 6.0, point
-- 9) : anonyme, éditeur aal1, éditeur aal2, admin (aal2) et compte sans fiche d'équipe (lecteur),
-- plus la clé secrète. versions : lecture par l'équipe, aucune écriture pour personne ;
-- access_levels : lecture par l'équipe, écriture par les admins ; reader_access : chacun sa
-- ligne, aucune écriture par authenticated ; RPC de l'admin pour l'équipe en aal2 ; lectures de
-- l'app (app_*) pour anon.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(97);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();

-- Deux formules, une page gratuite en ligne (adresse « aide »), un article réservé en ligne
-- (formule « Complet »), un article jamais publié (les deux avec leur image de présentation,
-- [D45]). Le lecteur a la formule « Complet ».
insert into public.media (id, kind, name, path, mime, size_bytes, status, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'image', 'couverture.webp',
    '10000000-0000-4000-8000-000000000001/couverture.webp', 'image/webp', 1000, 'ready',
    pg_temp.person_id('editor'));
insert into public.access_levels (id, name) values
  ('40000000-0000-4000-8000-000000000001', 'Essentiel'),
  ('40000000-0000-4000-8000-000000000002', 'Complet');
insert into public.contents (id, kind, draft, slug, access_chosen, created_by, draft_saved_by) values
  ('20000000-0000-4000-8000-000000000001', 'page', '{"v":1,"title":"Aide","blocks":[]}', 'aide',
    true, pg_temp.person_id('editor'), pg_temp.person_id('editor'));
insert into public.contents (id, kind, draft, access_level_id, access_chosen, created_by) values
  ('20000000-0000-4000-8000-000000000002', 'article', '{"v":1,"title":"Réservé","blocks":[],"cover":{"mediaId":"10000000-0000-4000-8000-000000000001"}}',
    '40000000-0000-4000-8000-000000000002', true, pg_temp.person_id('editor')),
  ('20000000-0000-4000-8000-000000000003', 'article', '{"v":1,"title":"Brouillon","blocks":[],"cover":{"mediaId":"10000000-0000-4000-8000-000000000001"}}',
    null, true, pg_temp.person_id('editor'));
select private.do_publish('20000000-0000-4000-8000-000000000001', pg_temp.person_id('editor'), 'manual');
select private.do_publish('20000000-0000-4000-8000-000000000002', pg_temp.person_id('editor'), 'manual');
insert into public.edit_locks (content_id, holder_id, taken_at) values
  ('20000000-0000-4000-8000-000000000003', pg_temp.person_id('editor'), now());
insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), '40000000-0000-4000-8000-000000000002', 'test');

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.versions'::regclass, 'public.access_levels'::regclass,
      'public.reader_access'::regclass)),
  'RLS active sur versions, access_levels et reader_access'
);
select table_privs_are('public', 'versions', 'anon', array[]::text[], 'anon : aucun droit sur versions');
select table_privs_are('public', 'access_levels', 'anon', array[]::text[], 'anon : aucun droit sur access_levels');
select table_privs_are('public', 'reader_access', 'anon', array[]::text[], 'anon : aucun droit sur reader_access');
select table_privs_are(
  'public', 'versions', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de versions'
);
select table_privs_are(
  'public', 'reader_access', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de reader_access (clé secrète pour écrire)'
);
select table_privs_are(
  'public', 'access_levels', 'authenticated', array['SELECT', 'DELETE'],
  'authenticated : lecture et suppression de access_levels au niveau de la table'
);
select column_privs_are(
  'public', 'access_levels', 'name', 'authenticated', array['SELECT', 'INSERT', 'UPDATE'],
  'authenticated : le nom d''une formule s''écrit'
);
select column_privs_are(
  'public', 'access_levels', 'rank', 'authenticated', array['SELECT'],
  'authenticated : le rang ne s''écrit que par access_levels_reorder'
);
select column_privs_are(
  'public', 'contents', 'access_chosen', 'authenticated', array['SELECT'],
  'authenticated : le choix du niveau ne s''écrit que par save_draft'
);
select ok(
  not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('versions', 'access_levels', 'reader_access')),
  'Realtime : ni versions, ni formules, ni lecteurs ne sont publiés'
);

select function_privs_are(
  'public', 'publish', array['uuid', 'integer'], 'anon', array[]::text[], 'anon : ne peut pas appeler publish'
);
select function_privs_are(
  'public', 'publish', array['uuid', 'integer'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler publish'
);
select function_privs_are(
  'public', 'unpublish', array['uuid'], 'anon', array[]::text[], 'anon : ne peut pas appeler unpublish'
);
select function_privs_are(
  'public', 'unpublish', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler unpublish'
);
select function_privs_are(
  'public', 'schedule', array['uuid', 'timestamp with time zone'], 'anon', array[]::text[],
  'anon : ne peut pas appeler schedule'
);
select function_privs_are(
  'public', 'schedule', array['uuid', 'timestamp with time zone'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler schedule'
);
select function_privs_are(
  'public', 'unschedule', array['uuid'], 'anon', array[]::text[], 'anon : ne peut pas appeler unschedule'
);
select function_privs_are(
  'public', 'unschedule', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler unschedule'
);
select function_privs_are(
  'public', 'revert_to_version', array['uuid', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler revert_to_version'
);
select function_privs_are(
  'public', 'revert_to_version', array['uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler revert_to_version'
);
select function_privs_are(
  'public', 'access_levels_reorder', array['uuid[]'], 'anon', array[]::text[],
  'anon : ne peut pas appeler access_levels_reorder'
);
select function_privs_are(
  'public', 'access_levels_reorder', array['uuid[]'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler access_levels_reorder (la fonction vérifie is_admin)'
);
select function_privs_are(
  'public', 'app_content', array['uuid'], 'anon', array['EXECUTE'], 'anon : peut appeler app_content'
);
select function_privs_are(
  'public', 'app_page', array['text'], 'anon', array['EXECUTE'], 'anon : peut appeler app_page'
);
select function_privs_are(
  'public', 'app_access_levels', array[]::text[], 'anon', array['EXECUTE'],
  'anon : peut appeler app_access_levels'
);
select function_privs_are(
  'public', 'app_content', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler app_content (lecteur abonné)'
);
select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('publish', 'unpublish', 'schedule', 'unschedule', 'revert_to_version',
        'access_levels_reorder', 'app_content', 'app_page', 'app_access_levels', 'save_draft')),
  10,
  'une seule signature par RPC (PostgREST choisit sans ambiguïté)'
);
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in ('do_publish', 'run_due_publications', 'reader_rank', 'app_content_json',
        'require_admin', 'publish_scope', 'resolve_linked', 'resolve_alt', 'resolve_alts',
        'body_to_draft', 'block_to_draft', 'media_available', 'active_writer', 'media_ids_of',
        'settings_already_applied', 'access_levels_before_write', 'access_levels_before_delete',
        'versions_immutable')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  ),
  array[]::text[],
  'fonctions internes de l''étape 5 (do_publish, reader_rank…) : ni anon ni authenticated'
);
select ok(
  not has_table_privilege('anon', 'private.live', 'select')
    and not has_table_privilege('authenticated', 'private.live', 'select'),
  'private.live : illisible par anon et authenticated'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme : rien des tables, seulement ce qui est en ligne par les app_*
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok('select * from public.versions', '42501', null, 'anon : versions illisible');
select throws_ok('select * from public.access_levels', '42501', null, 'anon : access_levels illisible');
select throws_ok('select * from public.reader_access', '42501', null, 'anon : reader_access illisible');
select throws_ok('select * from public.contents', '42501', null, 'anon : contents illisible (étape 5 aussi)');
select throws_ok(
  $$select public.publish('20000000-0000-4000-8000-000000000003', 1)$$, '42501', null,
  'anon : publish refusé'
);
select throws_ok(
  $$select public.unpublish('20000000-0000-4000-8000-000000000001')$$, '42501', null,
  'anon : unpublish refusé'
);
select throws_ok(
  $$select public.access_levels_reorder(array['40000000-0000-4000-8000-000000000002'::uuid])$$,
  '42501', null, 'anon : access_levels_reorder refusé'
);
select throws_ok(
  $$select private.do_publish('20000000-0000-4000-8000-000000000003', null, 'manual')$$, '42501', null,
  'anon : do_publish inaccessible'
);
select is(
  (public.app_content('20000000-0000-4000-8000-000000000001') ->> 'title'), 'Aide',
  'anon : app_content lit une page gratuite en ligne'
);
select is(
  (public.app_page('aide') ->> 'id'), '20000000-0000-4000-8000-000000000001',
  'anon : app_page trouve la page par son adresse'
);
select ok(
  public.app_content('20000000-0000-4000-8000-000000000003') is null,
  'anon : un brouillon jamais publié n''existe pas pour l''app'
);
select is(
  (public.app_content('20000000-0000-4000-8000-000000000002') ->> 'locked')::boolean, true,
  'anon : un contenu réservé est verrouillé'
);
select is(
  (select array_agg(name order by rank) from public.app_access_levels()),
  array['Essentiel', 'Complet'],
  'anon : app_access_levels donne les formules dans l''ordre'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.versions), 0, 'éditeur aal1 : ne voit aucune version');
select is((select count(*)::int from public.access_levels), 0, 'éditeur aal1 : ne voit aucune formule');
select is((select count(*)::int from public.reader_access), 0, 'éditeur aal1 : ne voit aucun lecteur');
select throws_ok(
  $$insert into public.access_levels (name) values ('Aal1')$$, '42501', null,
  'éditeur aal1 : aucune formule ajoutée'
);
select throws_ok(
  $$select public.publish('20000000-0000-4000-8000-000000000003', 1)$$, '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : publish refusé (même en tenant le verrou)'
);
select throws_ok(
  $$select public.unpublish('20000000-0000-4000-8000-000000000001')$$, '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : unpublish refusé'
);
select throws_ok(
  $$select public.schedule('20000000-0000-4000-8000-000000000003', now() + interval '1 day')$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : schedule refusé'
);
select throws_ok(
  $$select public.unschedule('20000000-0000-4000-8000-000000000003')$$, '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : unschedule refusé'
);
select throws_ok(
  $$select public.revert_to_version((select live_version_id from public.contents limit 1))$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : revert_to_version refusé'
);
select throws_ok(
  $$select public.access_levels_reorder(array[]::uuid[])$$, '42501', 'reserve_aux_admins',
  'éditeur aal1 : access_levels_reorder refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Lecteur (compte sans fiche d'équipe, aal2) : sa ligne, et ce que sa formule ouvre dans l'app
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('reader');
select is((select count(*)::int from public.versions), 0, 'lecteur : ne voit aucune version');
select is((select count(*)::int from public.access_levels), 0, 'lecteur : ne lit pas la table des formules');
select is(
  (select array_agg(user_id) from public.reader_access), array[pg_temp.person_id('reader')],
  'lecteur : lit sa propre ligne de reader_access'
);
select throws_ok(
  $$insert into public.reader_access (user_id, access_level_id)
    values (auth.uid(), '40000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'lecteur : n''écrit pas dans reader_access'
);
select throws_ok(
  $$update public.reader_access set access_level_id = '40000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'lecteur : ne change pas sa formule'
);
select throws_ok(
  $$delete from public.reader_access$$, '42501', null, 'lecteur : ne supprime pas sa ligne'
);
select throws_ok(
  $$insert into public.access_levels (name) values ('Lecteur')$$, '42501', null,
  'lecteur : aucune formule ajoutée'
);
select throws_ok(
  $$select public.publish('20000000-0000-4000-8000-000000000003', 1)$$, '42501', 'reserve_a_l_equipe',
  'lecteur : publish refusé'
);
select throws_ok(
  $$select public.schedule('20000000-0000-4000-8000-000000000003', now() + interval '1 day')$$,
  '42501', 'reserve_a_l_equipe', 'lecteur : schedule refusé'
);
select throws_ok(
  $$select public.access_levels_reorder(array[]::uuid[])$$, '42501', 'reserve_aux_admins',
  'lecteur : access_levels_reorder refusé'
);
select is(
  (public.app_content('20000000-0000-4000-8000-000000000002') ->> 'locked')::boolean, false,
  'lecteur abonné « Complet » : le contenu réservé est ouvert'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is((select count(*)::int from public.versions), 2, 'éditeur aal2 : lit les versions');
select is((select count(*)::int from public.access_levels), 2, 'éditeur aal2 : lit les formules');
select is((select count(*)::int from public.reader_access), 0, 'éditeur aal2 : ne lit pas les lecteurs');
select throws_ok(
  $$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev)
    values ('20000000-0000-4000-8000-000000000003', 1, 'manual', '{}', repeat('0', 64), 1)$$,
  '42501', null, 'éditeur aal2 : pas d''insertion directe de version'
);
select throws_ok(
  $$update public.versions set origin = 'files'$$, '42501', null,
  'éditeur aal2 : pas de modification directe de version'
);
select throws_ok(
  $$delete from public.versions$$, '42501', null, 'éditeur aal2 : pas de suppression de version'
);
select throws_ok(
  $$update public.contents set live_version_id = null$$, '42501', null,
  'éditeur aal2 : ne retire pas un contenu de l''app sans RPC'
);
select throws_ok(
  $$update public.contents set access_chosen = true$$, '42501', null,
  'éditeur aal2 : ne choisit pas le niveau sans save_draft'
);
select throws_ok(
  $$insert into public.access_levels (name) values ('Éditeur')$$, '42501', null,
  'éditeur aal2 : n''ajoute pas de formule'
);
select is(
  pg_temp.affected($$update public.access_levels set name = 'Renommée' where true$$), 0,
  'éditeur aal2 : ne renomme aucune formule'
);
select is(
  pg_temp.affected($$delete from public.access_levels where true$$), 0,
  'éditeur aal2 : ne supprime aucune formule'
);
select throws_ok(
  $$select public.access_levels_reorder(array['40000000-0000-4000-8000-000000000002'::uuid,
    '40000000-0000-4000-8000-000000000001'::uuid])$$,
  '42501', 'reserve_aux_admins', 'éditeur aal2 : ne range pas les formules'
);
select throws_ok(
  $$insert into public.reader_access (user_id, access_level_id)
    values (auth.uid(), '40000000-0000-4000-8000-000000000002')$$,
  '42501', null, 'éditeur aal2 : ne s''abonne pas lui-même'
);
select lives_ok(
  $$select public.publish('20000000-0000-4000-8000-000000000003', 1)$$,
  'éditeur aal2 : publish permis'
);
select lives_ok(
  $$select public.schedule('20000000-0000-4000-8000-000000000003', now() + interval '1 day')$$,
  'éditeur aal2 : schedule permis'
);
select ok(
  public.unschedule('20000000-0000-4000-8000-000000000003'), 'éditeur aal2 : unschedule permis'
);
select lives_ok(
  $$select public.unpublish('20000000-0000-4000-8000-000000000003')$$,
  'éditeur aal2 : unpublish permis'
);
select lives_ok(
  $$select public.revert_to_version(
    (select id from public.versions where content_id = '20000000-0000-4000-8000-000000000003'))$$,
  'éditeur aal2 : revert_to_version permis en tenant le verrou'
);

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2) : les formules
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select lives_ok(
  $$insert into public.access_levels (name) values ('  Essai ')$$,
  'admin : ajoute une formule (nom seulement)'
);
create temporary table new_level on commit drop as
  select id from public.access_levels where name = 'Essai';
select is(
  (select rank from public.access_levels where name = 'Essai'), 3,
  'admin : la nouvelle formule va en fin de liste'
);
select is(
  pg_temp.affected($$update public.access_levels set name = 'Découverte'
    where id = (select id from new_level)$$),
  1,
  'admin : renomme une formule'
);
select throws_ok(
  $$update public.access_levels set rank = 9$$, '42501', null,
  'admin : pas de changement direct du rang'
);
select is(
  (select array_agg(name order by rank) from public.access_levels_reorder(array[
    (select id from new_level),
    '40000000-0000-4000-8000-000000000001'::uuid,
    '40000000-0000-4000-8000-000000000002'::uuid])),
  array['Découverte', 'Essentiel', 'Complet'],
  'admin : range les formules'
);
select is(
  pg_temp.affected($$delete from public.access_levels where id = (select id from new_level)$$),
  1,
  'admin : supprime une formule inutilisée ([D32])'
);
select throws_ok(
  $$delete from public.access_levels where id = '40000000-0000-4000-8000-000000000002'$$,
  'P0001', 'formule_utilisee', 'admin : une formule utilisée ne se supprime pas'
);
select throws_ok(
  $$update public.versions set origin = 'files'$$, '42501', null,
  'admin : pas de modification directe de version'
);
select is((select count(*)::int from public.reader_access), 0, 'admin : ne lit pas les lecteurs');

-- ---------------------------------------------------------------------------------------------
-- Clé secrète : ni les RPC de l'admin, ni aucune modification de version ; lecture de l'app
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  $$select public.publish('20000000-0000-4000-8000-000000000003', 3)$$, '42501', 'reserve_a_l_equipe',
  'service_role : publish refusé'
);
select throws_ok(
  $$select public.access_levels_reorder(array[]::uuid[])$$, '42501', 'reserve_aux_admins',
  'service_role : access_levels_reorder refusé'
);
select throws_ok(
  $$update public.versions set origin = 'files'$$, 'P0001', 'version_immuable',
  'service_role : une version ne se modifie pas (déclencheur)'
);
select throws_ok(
  $$delete from public.versions$$, 'P0001', 'version_immuable',
  'service_role : une version ne se supprime pas (déclencheur)'
);
select lives_ok(
  $$insert into public.reader_access (user_id, access_level_id, source)
    values (pg_temp.person_id('editor2'), '40000000-0000-4000-8000-000000000001', 'paiement')$$,
  'service_role : écrit un abonnement de lecteur (clé secrète)'
);
select is(
  (public.app_content('20000000-0000-4000-8000-000000000001') ->> 'kind'), 'page',
  'service_role : app_content'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

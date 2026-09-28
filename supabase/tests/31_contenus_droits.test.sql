-- Contenus, verrous et catégories : droits par table et par fonction, pour les cinq profils
-- (§ 6.0, point 9) : anonyme, éditeur aal1, éditeur aal2, admin (aal2) et compte sans fiche
-- d'équipe (lecteur). Aucune écriture directe sur contents, edit_locks ni content_categories :
-- tout passe par les RPC, qui refusent d'abord ce qui n'est pas l'équipe en aal2.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(97);

select pg_temp.create_people();
select pg_temp.empty_contents();

-- Un article (verrou tenu par l'éditeur), une catégorie du Blog qui lui est attachée.
insert into public.contents (id, kind, draft, created_by, draft_saved_by) values
  ('20000000-0000-4000-8000-000000000001', 'article', '{"v":1,"title":"Respirer","blocks":[]}',
    pg_temp.person_id('editor'), pg_temp.person_id('editor'));
insert into public.edit_locks (content_id, holder_id, taken_at) values
  ('20000000-0000-4000-8000-000000000001', pg_temp.person_id('editor'), now());
insert into public.categories (id, section, name) values
  ('30000000-0000-4000-8000-000000000001', 'blog', 'Sommeil');
insert into public.content_categories (content_id, category_id) values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select ok(
  (select bool_and(relrowsecurity) from pg_class
    where oid in ('public.contents'::regclass, 'public.edit_locks'::regclass,
      'public.categories'::regclass, 'public.content_categories'::regclass)),
  'RLS active sur contents, edit_locks, categories et content_categories'
);
select table_privs_are('public', 'contents', 'anon', array[]::text[], 'anon : aucun droit sur contents');
select table_privs_are('public', 'edit_locks', 'anon', array[]::text[], 'anon : aucun droit sur edit_locks');
select table_privs_are('public', 'categories', 'anon', array[]::text[], 'anon : aucun droit sur categories');
select table_privs_are(
  'public', 'content_categories', 'anon', array[]::text[], 'anon : aucun droit sur content_categories'
);
select table_privs_are(
  'public', 'contents', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de contents (tout le reste par RPC)'
);
select table_privs_are(
  'public', 'edit_locks', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de edit_locks (lock_* seulement)'
);
select table_privs_are(
  'public', 'content_categories', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de content_categories (save_draft seulement)'
);
select table_privs_are(
  'public', 'categories', 'authenticated', array['SELECT', 'DELETE'],
  'authenticated : lecture et suppression de categories au niveau de la table'
);
select column_privs_are(
  'public', 'categories', 'name', 'authenticated', array['SELECT', 'INSERT', 'UPDATE'],
  'authenticated : le nom d''une catégorie s''écrit'
);
select column_privs_are(
  'public', 'categories', 'position', 'authenticated', array['SELECT', 'INSERT', 'UPDATE'],
  'authenticated : la position d''une catégorie s''écrit'
);
select column_privs_are(
  'public', 'categories', 'section', 'authenticated', array['SELECT', 'INSERT'],
  'authenticated : la section se choisit à la création, sans modification'
);
select column_privs_are(
  'public', 'categories', 'id', 'authenticated', array['SELECT'],
  'authenticated : l''identifiant d''une catégorie ne s''écrit pas'
);
select column_privs_are(
  'public', 'contents', 'draft', 'authenticated', array['SELECT'],
  'authenticated : le brouillon ne s''écrit pas directement'
);
select column_privs_are(
  'public', 'contents', 'deleted_at', 'authenticated', array['SELECT'],
  'authenticated : la corbeille ne s''écrit pas directement'
);

-- Realtime : edit_locks seulement, jamais contents (on n'envoie jamais le brouillon).
select ok(
  exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'edit_locks'),
  'Realtime : edit_locks est publiée'
);
select ok(
  not exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename in ('contents', 'content_categories', 'categories')),
  'Realtime : ni contents, ni les catégories ne sont publiées'
);

-- RPC de l'admin : authenticated seulement (la fonction vérifie ensuite is_staff).
select function_privs_are(
  'public', 'content_create', array['text', 'uuid', 'text', 'text', 'uuid', 'text'], 'anon', array[]::text[],
  'anon : ne peut pas appeler content_create'
);
select function_privs_are(
  'public', 'content_create', array['text', 'uuid', 'text', 'text', 'uuid', 'text'], 'authenticated',
  array['EXECUTE'], 'authenticated : peut appeler content_create'
);
select function_privs_are(
  'public', 'save_draft', array['uuid', 'integer', 'jsonb', 'jsonb', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler save_draft'
);
select function_privs_are(
  'public', 'save_draft', array['uuid', 'integer', 'jsonb', 'jsonb', 'uuid'], 'authenticated',
  array['EXECUTE'], 'authenticated : peut appeler save_draft'
);
select function_privs_are(
  'public', 'lock_take', array['uuid', 'boolean', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler lock_take'
);
select function_privs_are(
  'public', 'lock_take', array['uuid', 'boolean', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler lock_take'
);
select function_privs_are(
  'public', 'lock_heartbeat', array['uuid', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler lock_heartbeat'
);
select function_privs_are(
  'public', 'lock_heartbeat', array['uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler lock_heartbeat'
);
select function_privs_are(
  'public', 'lock_release', array['uuid', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler lock_release'
);
select function_privs_are(
  'public', 'lock_release', array['uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler lock_release'
);
select function_privs_are(
  'public', 'lock_status', array['uuid', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler lock_status'
);
select function_privs_are(
  'public', 'lock_status', array['uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler lock_status'
);
select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('content_create', 'save_draft', 'lock_take', 'lock_heartbeat',
        'lock_release', 'lock_status')),
  6,
  'une seule signature par RPC (PostgREST choisit sans ambiguïté)'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok('select * from public.contents', '42501', null, 'anon : contents illisible');
select throws_ok('select * from public.edit_locks', '42501', null, 'anon : edit_locks illisible');
select throws_ok('select * from public.categories', '42501', null, 'anon : categories illisible');
select throws_ok(
  'select * from public.content_categories', '42501', null, 'anon : content_categories illisible'
);
select throws_ok(
  $$select public.content_create('page')$$, '42501', null, 'anon : content_create refusé'
);
select throws_ok(
  $$select public.lock_status('20000000-0000-4000-8000-000000000001')$$, '42501', null,
  'anon : lock_status refusé'
);
select throws_ok(
  $$insert into public.categories (section, name) values ('blog', 'Anonyme')$$, '42501', null,
  'anon : aucune catégorie ajoutée'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1), et compte sans fiche (lecteur, même en aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.contents), 0, 'éditeur aal1 : ne voit aucun contenu');
select is((select count(*)::int from public.edit_locks), 0, 'éditeur aal1 : ne voit aucun verrou');
select is((select count(*)::int from public.categories), 0, 'éditeur aal1 : ne voit aucune catégorie');
select is(
  (select count(*)::int from public.content_categories), 0,
  'éditeur aal1 : ne voit aucune catégorie de contenu'
);
select throws_ok(
  $$insert into public.categories (section, name) values ('blog', 'Aal1')$$, '42501', null,
  'éditeur aal1 : aucune catégorie ajoutée'
);
select is(
  pg_temp.affected($$update public.categories set name = 'aal1' where true$$), 0,
  'éditeur aal1 : ne renomme aucune catégorie'
);
select is(
  pg_temp.affected($$delete from public.categories where true$$), 0,
  'éditeur aal1 : ne supprime aucune catégorie'
);
select throws_ok(
  $$select public.content_create('page')$$, '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : content_create refusé'
);
select throws_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000001', 1, '{"v":1,"title":"x","blocks":[]}')$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : save_draft refusé (même en tenant le verrou)'
);
select throws_ok(
  $$select public.lock_take('20000000-0000-4000-8000-000000000001')$$, '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : lock_take refusé'
);
select throws_ok(
  $$select public.lock_heartbeat('20000000-0000-4000-8000-000000000001')$$, '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : lock_heartbeat refusé'
);
select throws_ok(
  $$select public.lock_release('20000000-0000-4000-8000-000000000001')$$, '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : lock_release refusé'
);
select throws_ok(
  $$select public.lock_status('20000000-0000-4000-8000-000000000001')$$, '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : lock_status refusé'
);
select throws_ok(
  $$select public.media_uses('10000000-0000-4000-8000-000000000001')$$, '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : media_uses refusé'
);

select pg_temp.as_person('reader');
select is((select count(*)::int from public.contents), 0, 'lecteur : ne voit aucun contenu');
select is((select count(*)::int from public.edit_locks), 0, 'lecteur : ne voit aucun verrou');
select is((select count(*)::int from public.categories), 0, 'lecteur : ne voit aucune catégorie');
select is(
  (select count(*)::int from public.content_categories), 0,
  'lecteur : ne voit aucune catégorie de contenu'
);
select throws_ok(
  $$insert into public.categories (section, name) values ('blog', 'Lecteur')$$, '42501', null,
  'lecteur : aucune catégorie ajoutée'
);
select is(
  pg_temp.affected($$update public.categories set name = 'lecteur' where true$$), 0,
  'lecteur : ne renomme aucune catégorie'
);
select is(
  pg_temp.affected($$delete from public.categories where true$$), 0,
  'lecteur : ne supprime aucune catégorie'
);
select throws_ok(
  $$select public.content_create('page')$$, '42501', 'reserve_a_l_equipe',
  'lecteur : content_create refusé'
);
select throws_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000001', 1, '{"v":1,"title":"x","blocks":[]}')$$,
  '42501', 'reserve_a_l_equipe', 'lecteur : save_draft refusé'
);
select throws_ok(
  $$select public.lock_take('20000000-0000-4000-8000-000000000001', true)$$, '42501',
  'reserve_a_l_equipe', 'lecteur : lock_take refusé, même en forçant'
);
select throws_ok(
  $$select public.lock_status('20000000-0000-4000-8000-000000000001')$$, '42501',
  'reserve_a_l_equipe', 'lecteur : lock_status refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select title from public.contents where id = '20000000-0000-4000-8000-000000000001'),
  'Respirer', 'éditeur aal2 : lit les contenus (titre tiré du brouillon)'
);
select is((select count(*)::int from public.edit_locks), 1, 'éditeur aal2 : lit les verrous');
select is((select count(*)::int from public.categories), 1, 'éditeur aal2 : lit les catégories');
select is(
  (select count(*)::int from public.content_categories), 1,
  'éditeur aal2 : lit les catégories des contenus'
);
select throws_ok(
  $$insert into public.contents (kind, draft) values ('page', '{"v":1,"title":"x","blocks":[]}')$$,
  '42501', null, 'éditeur aal2 : pas d''insertion directe dans contents'
);
select throws_ok(
  $$update public.contents set draft = '{"v":1,"title":"x","blocks":[]}'$$, '42501', null,
  'éditeur aal2 : pas de modification directe du brouillon'
);
select throws_ok(
  $$update public.contents set deleted_at = now()$$, '42501', null,
  'éditeur aal2 : pas de mise à la corbeille directe'
);
select throws_ok(
  $$delete from public.contents$$, '42501', null, 'éditeur aal2 : pas de suppression directe'
);
select throws_ok(
  $$update public.edit_locks set holder_id = null$$, '42501', null,
  'éditeur aal2 : pas de modification directe d''un verrou'
);
select throws_ok(
  $$insert into public.edit_locks (content_id) values ('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'éditeur aal2 : pas d''insertion directe d''un verrou'
);
select throws_ok(
  $$delete from public.edit_locks$$, '42501', null,
  'éditeur aal2 : pas de suppression directe d''un verrou'
);
select throws_ok(
  $$insert into public.content_categories (content_id, category_id)
    values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'éditeur aal2 : pas d''écriture directe des catégories d''un contenu'
);
select throws_ok(
  $$delete from public.content_categories$$, '42501', null,
  'éditeur aal2 : pas de suppression directe des catégories d''un contenu'
);
select lives_ok(
  $$insert into public.categories (section, name) values ('podcasts', 'Méditation')$$,
  'éditeur aal2 : ajoute une catégorie'
);
select is(
  pg_temp.affected(
    $$update public.categories set name = 'Méditations', position = 5
      where name = 'Méditation'$$
  ),
  1,
  'éditeur aal2 : renomme et range une catégorie'
);
select throws_ok(
  $$update public.categories set section = 'blog'$$, '42501', null,
  'éditeur aal2 : ne change pas la section d''une catégorie'
);
select is(
  pg_temp.affected($$delete from public.categories where name = 'Méditations'$$),
  1,
  'éditeur aal2 : supprime une catégorie'
);
select lives_ok(
  $$select public.lock_status('20000000-0000-4000-8000-000000000001')$$,
  'éditeur aal2 : lock_status permis'
);
select lives_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000001', 1, '{"v":1,"title":"Respirer mieux","blocks":[]}')$$,
  'éditeur aal2 : save_draft permis en tenant le verrou'
);
select lives_ok($$select public.content_create('page')$$, 'éditeur aal2 : content_create permis');
select lives_ok(
  $$select public.media_uses('10000000-0000-4000-8000-000000000001')$$,
  'éditeur aal2 : media_uses permis'
);

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2) : les mêmes droits que l'éditeur sur les contenus
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select is(
  (select count(*)::int from public.contents where kind = 'article'), 1, 'admin : lit les contenus'
);
select is((select count(*)::int from public.edit_locks), 2, 'admin : lit les verrous');
select throws_ok(
  $$update public.contents set draft_rev = 99$$, '42501', null,
  'admin : pas de modification directe de contents'
);
select throws_ok(
  $$update public.edit_locks set holder_id = auth.uid()$$, '42501', null,
  'admin : pas de modification directe d''un verrou'
);
select throws_ok(
  $$insert into public.content_categories (content_id, category_id)
    values ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'admin : pas d''écriture directe des catégories d''un contenu'
);
select lives_ok(
  $$insert into public.categories (section, name) values ('blog', 'Alimentation')$$,
  'admin : ajoute une catégorie'
);
select throws_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000001', 2, '{"v":1,"title":"Admin","blocks":[]}')$$,
  'P0001', 'verrou_perdu', 'admin : n''enregistre pas un brouillon tenu par un autre'
);
select lives_ok(
  $$select public.lock_take('20000000-0000-4000-8000-000000000001', true)$$,
  'admin : reprend la main (force)'
);
select lives_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000001', 2, '{"v":1,"title":"Admin","blocks":[]}')$$,
  'admin : enregistre ensuite'
);

-- Retour de l'éditeur : il a perdu la main.
select pg_temp.as_person('editor');
select ok(
  not public.lock_heartbeat('20000000-0000-4000-8000-000000000001'),
  'éditeur aal2 : son signe de vie répond faux après la reprise de la main'
);

-- ---------------------------------------------------------------------------------------------
-- Clé secrète : les RPC de l'admin ne lui sont pas ouvertes (is_staff faux)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  $$select public.content_create('page')$$, '42501', 'reserve_a_l_equipe',
  'service_role : content_create refusé'
);
select throws_ok(
  $$select public.lock_take('20000000-0000-4000-8000-000000000001', true)$$, '42501',
  'reserve_a_l_equipe', 'service_role : lock_take refusé'
);
select pg_temp.as_postgres();

-- Fonctions internes de l'étape 4 : ni anon ni authenticated.
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in ('lock_ttl', 'lock_state', 'empty_draft', 'blocks_with_new_ids',
        'contents_check_kind', 'contents_trash_guard', 'contents_check_draft',
        'categories_before_write', 'content_categories_check', 'media_uses')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  ),
  array[]::text[],
  'fonctions internes de l''étape 4 : non exécutables par anon ni authenticated'
);
select is(
  (select count(*)::int from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in ('lock_ttl', 'lock_state', 'empty_draft', 'blocks_with_new_ids',
        'contents_check_kind', 'contents_trash_guard', 'contents_check_draft',
        'categories_before_write', 'content_categories_check')),
  9,
  'fonctions internes de l''étape 4 : toutes présentes dans private'
);

select * from finish();
rollback;

-- Médiathèque : droits par table et par fonction, pour les cinq profils (§ 6.0, point 9) :
-- anonyme, éditeur aal1, éditeur aal2, admin (aal2) et compte sans fiche d'équipe (lecteur).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(75);

select pg_temp.create_people();
-- On part d'une médiathèque vide (la base de développement peut contenir des fichiers).
select pg_temp.empty_media_library();

-- Un fichier prêt, un fichier dans la corbeille, un contrôle des orphelins.
insert into public.media (id, kind, name, path, mime, size_bytes, status, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'image', 'photo.webp',
    '10000000-0000-4000-8000-000000000001/photo.webp', 'image/webp', 1000, 'ready',
    pg_temp.person_id('editor')),
  ('10000000-0000-4000-8000-000000000002', 'audio', 'son.mp3',
    '10000000-0000-4000-8000-000000000002/son.mp3', 'audio/mpeg', 2000, 'ready',
    pg_temp.person_id('editor'));
update public.media
set deleted_at = now(), deleted_by = pg_temp.person_id('editor')
where id = '10000000-0000-4000-8000-000000000002';
insert into public.media_audit (orphan_paths) values (array['files-protected/x/reste.png']);

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select ok(
  (select relrowsecurity from pg_class where oid = 'public.media'::regclass),
  'RLS active sur media'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.media_audit'::regclass),
  'RLS active sur media_audit'
);
select table_privs_are('public', 'media', 'anon', array[]::text[], 'anon : aucun droit sur media');
select table_privs_are(
  'public', 'media', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de media au niveau de la table'
);
select column_privs_are(
  'public', 'media', 'name', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated : le nom est modifiable'
);
select column_privs_are(
  'public', 'media', 'alt', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated : le texte alternatif est modifiable'
);
select column_privs_are(
  'public', 'media', 'transcript', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated : la transcription est modifiable'
);
select column_privs_are(
  'public', 'media', 'status', 'authenticated', array['SELECT'],
  'authenticated : l''état n''est pas modifiable'
);
select column_privs_are(
  'public', 'media', 'is_public', 'authenticated', array['SELECT'],
  'authenticated : l''emplacement n''est pas modifiable'
);
select column_privs_are(
  'public', 'media', 'purge_requested_at', 'authenticated', array['SELECT'],
  'authenticated : la demande d''effacement n''est pas modifiable'
);
select column_privs_are(
  'public', 'media', 'deleted_at', 'authenticated', array['SELECT'],
  'authenticated : la corbeille ne se modifie pas directement'
);
select table_privs_are(
  'public', 'media_audit', 'anon', array[]::text[], 'anon : aucun droit sur media_audit'
);
select table_privs_are(
  'public', 'media_audit', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de media_audit'
);
select table_privs_are(
  'public', 'trash_items', 'anon', array[]::text[], 'anon : aucun droit sur trash_items'
);
select table_privs_are(
  'public', 'trash_items', 'authenticated', array['SELECT'],
  'authenticated : lecture seule de trash_items'
);
select ok(
  (select 'security_invoker=true' = any (reloptions) from pg_class
    where oid = 'public.trash_items'::regclass),
  'trash_items applique les politiques de l''appelant (security_invoker)'
);

-- RPC de l'admin : authenticated seulement (la fonction vérifie ensuite is_staff).
select function_privs_are(
  'public', 'media_create', array['text', 'text', 'text', 'bigint', 'integer', 'integer', 'numeric'],
  'anon', array[]::text[], 'anon : ne peut pas appeler media_create'
);
select function_privs_are(
  'public', 'media_create', array['text', 'text', 'text', 'bigint', 'integer', 'integer', 'numeric'],
  'authenticated', array['EXECUTE'], 'authenticated : peut appeler media_create'
);
select function_privs_are(
  'public', 'media_confirm', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_confirm'
);
select function_privs_are(
  'public', 'media_trash', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_trash'
);
select function_privs_are(
  'public', 'media_restore', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_restore'
);
select function_privs_are(
  'public', 'empty_trash', array['jsonb'], 'anon', array[]::text[],
  'anon : ne peut pas appeler empty_trash'
);
select function_privs_are(
  'public', 'media_uses', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_uses'
);
select function_privs_are(
  'public', 'media_storage_used', array[]::text[], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_storage_used'
);
select function_privs_are(
  'public', 'empty_trash', array['jsonb'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler empty_trash'
);

-- Fonctions de la fonction Edge « files » : service_role seulement.
select function_privs_are(
  'public', 'files_worklist', array['integer'], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler files_worklist'
);
select function_privs_are(
  'public', 'files_worklist', array['integer'], 'anon', array[]::text[],
  'anon : ne peut pas appeler files_worklist'
);
select function_privs_are(
  'public', 'files_worklist', array['integer'], 'service_role', array['EXECUTE'],
  'service_role : peut appeler files_worklist'
);
select is(
  array(
    select p.proname::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname like 'files\_%'
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute')
        or not has_function_privilege('service_role', p.oid, 'execute'))
  ),
  array[]::text[],
  'toutes les fonctions files_* : service_role seulement'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok('select * from public.media', '42501', null, 'anon : media illisible');
select throws_ok('select * from public.media_audit', '42501', null, 'anon : media_audit illisible');
select throws_ok('select * from public.trash_items', '42501', null, 'anon : trash_items illisible');
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 10)$$,
  '42501', null, 'anon : media_create refusé'
);
select throws_ok(
  $$select public.empty_trash()$$, '42501', null, 'anon : empty_trash refusé'
);
select throws_ok(
  $$update public.media set name = 'x'$$, '42501', null, 'anon : aucune modification'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1), et compte sans fiche (lecteur, même en aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.media), 0, 'éditeur aal1 : ne voit aucun fichier');
select is((select count(*)::int from public.media_audit), 0, 'éditeur aal1 : ne voit aucun contrôle');
select is((select count(*)::int from public.trash_items), 0, 'éditeur aal1 : corbeille vide');
select is(
  pg_temp.affected($$update public.media set name = 'aal1' where true$$), 0,
  'éditeur aal1 : ne modifie aucun fichier'
);
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 10)$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : media_create refusé'
);
select throws_ok(
  $$select public.media_trash('10000000-0000-4000-8000-000000000001')$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : media_trash refusé'
);
select throws_ok(
  $$select public.media_storage_used()$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : media_storage_used refusé'
);
select throws_ok(
  $$select public.files_worklist()$$, '42501', null, 'éditeur aal1 : files_worklist refusé'
);

select pg_temp.as_person('reader');
select ok(not public.is_staff(), 'lecteur (compte sans fiche) : is_staff est faux, même en aal2');
select is((select count(*)::int from public.media), 0, 'lecteur : ne voit aucun fichier');
select is((select count(*)::int from public.media_audit), 0, 'lecteur : ne voit aucun contrôle');
select is((select count(*)::int from public.trash_items), 0, 'lecteur : corbeille vide');
select is(
  pg_temp.affected($$update public.media set alt = 'lecteur' where true$$), 0,
  'lecteur : ne modifie aucun fichier'
);
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 10)$$,
  '42501', 'reserve_a_l_equipe', 'lecteur : media_create refusé'
);
select throws_ok(
  $$select public.empty_trash()$$, '42501', 'reserve_a_l_equipe', 'lecteur : empty_trash refusé'
);
select throws_ok(
  $$select public.files_claim_run('kick')$$, '42501', null, 'lecteur : files_claim_run refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is((select count(*)::int from public.media), 2, 'éditeur aal2 : voit les fichiers');
select is((select count(*)::int from public.media_audit), 1, 'éditeur aal2 : voit les contrôles');
select is(
  (select array_agg(title) from public.trash_items), array['son.mp3'],
  'éditeur aal2 : voit la corbeille'
);
select is(
  (select deleted_by_name from public.trash_items), 'editeur@tests.local',
  'corbeille : qui a supprimé (nom, sinon e-mail)'
);
select is(
  pg_temp.affected(
    $$update public.media set name = '  Photo du lac  ', alt = 'Un lac'
      where id = '10000000-0000-4000-8000-000000000001'$$
  ),
  1,
  'éditeur aal2 : modifie le nom et le texte alternatif'
);
select is(
  pg_temp.affected(
    $$update public.media set transcript = 'Bonjour' where id = '10000000-0000-4000-8000-000000000002'$$
  ),
  0,
  'éditeur aal2 : ne modifie pas un fichier dans la corbeille'
);
select throws_ok(
  $$update public.media set status = 'ready'$$, '42501', null,
  'éditeur aal2 : ne modifie pas l''état'
);
select throws_ok(
  $$update public.media set is_public = true$$, '42501', null,
  'éditeur aal2 : ne modifie pas l''emplacement'
);
select throws_ok(
  $$update public.media set purge_requested_at = now()$$, '42501', null,
  'éditeur aal2 : ne demande pas l''effacement directement'
);
select throws_ok(
  $$update public.media set deleted_at = null$$, '42501', null,
  'éditeur aal2 : ne sort pas un fichier de la corbeille directement'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('image', 'a', 'a/a.png', 'image/png', 1)$$,
  '42501', null, 'éditeur aal2 : pas d''insertion directe'
);
select throws_ok(
  $$delete from public.media$$, '42501', null, 'éditeur aal2 : pas de suppression directe'
);
select throws_ok(
  $$insert into public.media_audit (orphan_paths) values ('{}')$$, '42501', null,
  'éditeur aal2 : n''écrit pas dans media_audit'
);
select throws_ok(
  $$delete from public.media_audit$$, '42501', null,
  'éditeur aal2 : n''efface pas media_audit'
);
select throws_ok(
  $$select public.files_mark_moved('10000000-0000-4000-8000-000000000001', true)$$,
  '42501', null, 'éditeur aal2 : files_mark_moved refusé'
);
select lives_ok($$select public.media_storage_used()$$, 'éditeur aal2 : media_storage_used permis');

select pg_temp.as_postgres();
select is(
  (select name || ' / ' || alt from public.media where id = '10000000-0000-4000-8000-000000000001'),
  'Photo du lac / Un lac',
  'nom nettoyé (espaces autour) et texte alternatif enregistrés'
);

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2) : mêmes droits que l'éditeur sur la médiathèque
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select is((select count(*)::int from public.media), 2, 'admin : voit les fichiers');
select is(
  pg_temp.affected(
    $$update public.media set alt = 'Un grand lac' where id = '10000000-0000-4000-8000-000000000001'$$
  ),
  1,
  'admin : modifie le texte alternatif'
);
select throws_ok(
  $$update public.media set status = 'rejected'$$, '42501', null,
  'admin : ne modifie pas l''état'
);
select throws_ok(
  $$select public.files_audit()$$, '42501', null, 'admin : files_audit refusé'
);
select is((select count(*)::int from public.trash_items), 1, 'admin : voit la corbeille');

-- ---------------------------------------------------------------------------------------------
-- Clé secrète (fonction Edge)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select lives_ok($$select public.files_worklist()$$, 'service_role : files_worklist permis');
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 10)$$,
  '42501', null, 'service_role : les RPC de l''admin ne lui sont pas ouvertes'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

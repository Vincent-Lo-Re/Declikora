-- Storage : buckets et politiques de la médiathèque (§ 4.1, § 4.2 et § 4.5).
-- Les politiques sont testées directement sur storage.objects : `supabase db start` applique
-- aussi les migrations de Storage. Les vrais envois par l'API sont vérifiés par les tests
-- d'intégration de la fonction « files ».
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(29);

select pg_temp.create_people();
-- On part d'une médiathèque vide (la base de développement peut contenir des fichiers).
select pg_temp.empty_media_library();

-- ---------------------------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------------------------

select results_eq(
  $$select id, public, file_size_limit from storage.buckets
    where id in ('files-public', 'files-protected') order by id$$,
  $$values ('files-protected', false, 52428800::bigint), ('files-public', true, 52428800::bigint)$$,
  'deux buckets : public et protégé, 50 Mio par fichier'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'files-protected'),
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/json',
    'audio/mpeg', 'audio/mp4', 'application/pdf'],
  'types acceptés : liste exacte (protégé)'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'files-public'),
  (select allowed_mime_types from storage.buckets where id = 'files-protected'),
  'types acceptés : les mêmes dans les deux buckets'
);

-- ---------------------------------------------------------------------------------------------
-- Envoi : au chemin exact d'une ligne « pending » créée par soi
-- ---------------------------------------------------------------------------------------------

insert into public.media (id, kind, name, path, mime, size_bytes, status, created_by) values
  ('50000000-0000-4000-8000-000000000001', 'image', 'moi.png',
    '50000000-0000-4000-8000-000000000001/moi.png', 'image/png', 10, 'pending',
    pg_temp.person_id('editor')),
  ('50000000-0000-4000-8000-000000000002', 'image', 'autre.png',
    '50000000-0000-4000-8000-000000000002/autre.png', 'image/png', 10, 'pending',
    pg_temp.person_id('editor2')),
  ('50000000-0000-4000-8000-000000000003', 'image', 'pret.png',
    '50000000-0000-4000-8000-000000000003/pret.png', 'image/png', 10, 'ready',
    pg_temp.person_id('editor')),
  ('50000000-0000-4000-8000-000000000004', 'image', 'jete.png',
    '50000000-0000-4000-8000-000000000004/jete.png', 'image/png', 10, 'pending',
    pg_temp.person_id('editor'));
update public.media set deleted_at = now() where id = '50000000-0000-4000-8000-000000000004';

create function pg_temp.upload(bucket text, object_name text)
returns void
language sql
as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values (bucket, object_name, auth.uid()::text, '{"size": 10, "mimetype": "image/png"}')
$$;
grant execute on function pg_temp.upload(text, text) to public;

select pg_temp.as_anon();
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/moi.png')$$,
  '42501', null, 'anonyme : aucun envoi'
);

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/moi.png')$$,
  '42501', null, 'éditeur aal1 : envoi refusé, même au bon chemin'
);

select pg_temp.as_person('reader');
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/moi.png')$$,
  '42501', null, 'lecteur : envoi refusé'
);

select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/autre-nom.png')$$,
  '42501', null, 'éditeur aal2 : autre nom dans son propre dossier refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/moi.png/x.png')$$,
  '42501', null, 'éditeur aal2 : sous-dossier refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-public', '50000000-0000-4000-8000-000000000001/moi.png')$$,
  '42501', null, 'éditeur aal2 : bucket public refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000002/autre.png')$$,
  '42501', null, 'éditeur aal2 : chemin d''un envoi créé par un autre membre refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000003/pret.png')$$,
  '42501', null, 'éditeur aal2 : chemin d''un fichier déjà prêt refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000004/jete.png')$$,
  '42501', null, 'éditeur aal2 : chemin d''un envoi mis à la corbeille refusé'
);
select throws_ok(
  $$select pg_temp.upload('files-protected', 'hors-mediatheque.png')$$,
  '42501', null, 'éditeur aal2 : objet sans ligne media refusé'
);
select lives_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000001/moi.png')$$,
  'éditeur aal2 : envoi accepté au chemin exact de sa ligne « pending »'
);

select pg_temp.as_person('editor2');
select lives_ok(
  $$select pg_temp.upload('files-protected', '50000000-0000-4000-8000-000000000002/autre.png')$$,
  'autre éditeur : envoi accepté à son propre chemin'
);

-- ---------------------------------------------------------------------------------------------
-- Aucune modification ni suppression directe
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('files-public', '50000000-0000-4000-8000-000000000003/pret.png',
    pg_temp.person_id('editor')::text, '{"size": 10, "mimetype": "image/png"}');

select pg_temp.as_person('editor');
select is(
  pg_temp.affected($$update storage.objects set name = name || '.bis' where true$$), 0,
  'éditeur aal2 : aucune modification directe d''un objet'
);
select is(
  pg_temp.affected(
    $$update storage.objects set bucket_id = 'files-public'
      where name = '50000000-0000-4000-8000-000000000001/moi.png'$$
  ),
  0,
  'éditeur aal2 : ne déplace pas un objet vers le bucket public'
);
-- Supabase bloque tout DELETE SQL sur storage.objects (déclencheur protect_delete), sauf si on
-- le lève pour la session : on le lève, pour vérifier qu'aucune politique ne le permet.
select set_config('storage.allow_delete_query', 'true', true);
select is(
  pg_temp.affected($$delete from storage.objects where true$$), 0,
  'éditeur aal2 : aucune suppression directe d''un objet (aucune politique DELETE)'
);
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$delete from storage.objects where true$$), 0,
  'admin : aucune suppression directe d''un objet'
);
select set_config('storage.allow_delete_query', 'false', true);
select pg_temp.as_postgres();
select is(
  (select count(*)::int from storage.objects where bucket_id in ('files-public', 'files-protected')),
  3,
  'les objets sont toujours là'
);
select results_eq(
  $$select p.cmd::text from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects' and p.policyname like 'Médiathèque%'
    order by 1$$,
  $$values ('INSERT'), ('SELECT'), ('SELECT')$$,
  'politiques de la médiathèque sur storage.objects : un envoi et deux lectures, rien d''autre'
);

-- ---------------------------------------------------------------------------------------------
-- Lecture
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select count(*)::int from storage.objects where bucket_id in ('files-public', 'files-protected')),
  3, 'éditeur aal2 : lit les objets des deux buckets'
);
select pg_temp.as_person('admin');
select is(
  (select count(*)::int from storage.objects where bucket_id in ('files-public', 'files-protected')),
  3, 'admin : lit les objets des deux buckets'
);
select pg_temp.as_person('editor', 'aal1');
select is(
  (select count(*)::int from storage.objects where bucket_id in ('files-public', 'files-protected')),
  0, 'éditeur aal1 : ne lit aucun objet'
);
select pg_temp.as_person('reader');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'),
  0, 'lecteur : ne lit aucun objet protégé (aucun contenu en ligne ne les cite ; voir 37_fichiers_publics)'
);
select pg_temp.as_anon();
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'),
  0, 'anonyme : ne lit aucun objet protégé'
);
select ok(
  not private.reader_can_open('50000000-0000-4000-8000-000000000001/moi.png'),
  'anonyme : reader_can_open exécutable, et faux pour un fichier qu''aucun contenu en ligne ne cite'
);
select throws_ok(
  $$select private.kick_files()$$, '42501', null,
  'anonyme : les autres fonctions de private restent interdites'
);
select pg_temp.as_postgres();

-- La politique d'envoi compare bien le nom de l'OBJET au chemin de la ligne (et non media.name).
select ok(
  (select pg_get_expr(p.polwithcheck, p.polrelid) like '%(m.path = objects.name)%'
    from pg_policy p
    where p.polrelid = 'storage.objects'::regclass
      and p.polname = 'Médiathèque : envoi au chemin exact d''un fichier en attente créé par soi'),
  'politique d''envoi : m.path = objects.name (nom qualifié)'
);

select * from finish();
rollback;

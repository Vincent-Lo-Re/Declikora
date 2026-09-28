-- Corbeille des contenus, fichiers publics et textes figés (étape 5, partie n° 2) : droits par
-- fonction pour les cinq profils (§ 6.0, point 9) et la clé secrète. trash, restore,
-- media_outdated et media_push : équipe en aal2 seulement ; app_file_locations : tout le monde
-- (lecture de l'app) ; trash_items : l'équipe voit les contenus de la corbeille, personne d'autre.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(54);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Un article gratuit en ligne (image « photo », couverture « fond »), un brouillon.
select pg_temp.as_person('editor');
select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.save(
  'article',
  pg_temp.draft(
    jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000b1', pg_temp.mid('photo'))),
    'Café',
    jsonb_build_object('cover', jsonb_build_object('mediaId', pg_temp.mid('fond')))
  ),
  '{"access_level_id": null}'
);
select pg_temp.publish('article');
select pg_temp.create_content('brouillon', 'article', content_title => 'Brouillon');
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'trash', array['uuid'], 'anon', array[]::text[], 'anon : ne peut pas appeler trash'
);
select function_privs_are(
  'public', 'trash', array['uuid'], 'authenticated', array['EXECUTE'], 'authenticated : peut appeler trash'
);
select function_privs_are(
  'public', 'restore', array['uuid'], 'anon', array[]::text[], 'anon : ne peut pas appeler restore'
);
select function_privs_are(
  'public', 'restore', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler restore'
);
select function_privs_are(
  'public', 'media_outdated', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_outdated'
);
select function_privs_are(
  'public', 'media_outdated', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler media_outdated'
);
select function_privs_are(
  'public', 'media_push', array['uuid'], 'anon', array[]::text[], 'anon : ne peut pas appeler media_push'
);
select function_privs_are(
  'public', 'media_push', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler media_push'
);
select function_privs_are(
  'public', 'app_file_locations', array['uuid[]'], 'anon', array['EXECUTE'],
  'anon : peut appeler app_file_locations (lecture de l''app)'
);
select function_privs_are(
  'public', 'app_file_locations', array['uuid[]'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler app_file_locations'
);
select ok(
  (select p.prosecdef and p.provolatile = 's' from pg_proc p
    where p.oid = 'public.app_file_locations(uuid[])'::regprocedure),
  'app_file_locations : security definer et stable (ne modifie rien)'
);
select ok(
  not has_function_privilege('anon', 'private.visible_media(uuid[])', 'execute')
    and not has_function_privilege('authenticated', 'private.public_media()', 'execute')
    and not has_function_privilege('authenticated', 'private.media_stale_live(uuid)', 'execute'),
  'les fonctions internes de la règle des fichiers ne sont pas appelables par l''API'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('brouillon')), '42501', null, 'anonyme : trash refusé'
);
select throws_ok(
  format('select public.restore(%L)', pg_temp.cid('brouillon')), '42501', null, 'anonyme : restore refusé'
);
select throws_ok(
  format('select public.media_outdated(%L)', pg_temp.mid('photo')), '42501', null,
  'anonyme : media_outdated refusé'
);
select throws_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), '42501', null,
  'anonyme : media_push refusé'
);
select is(
  (select array_agg(media_id order by media_id)
    from public.app_file_locations(array[pg_temp.mid('photo'), pg_temp.mid('fond'), pg_temp.mid('son')])),
  array[pg_temp.mid('photo'), pg_temp.mid('fond')],
  'anonyme : app_file_locations donne les fichiers d''un contenu gratuit en ligne, pas les autres'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : trash refusé'
);
select throws_ok(
  format('select public.restore(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : restore refusé'
);
select throws_ok(
  format('select public.media_outdated(%L)', pg_temp.mid('photo')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : media_outdated refusé'
);
select throws_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : media_push refusé'
);
select is(
  (select count(*)::int from public.app_file_locations(array[pg_temp.mid('photo')])), 1,
  'éditeur aal1 : app_file_locations répond comme à un lecteur'
);

-- ---------------------------------------------------------------------------------------------
-- Lecteur (compte sans fiche d'équipe)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('reader');
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'lecteur : trash refusé'
);
select throws_ok(
  format('select public.restore(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'lecteur : restore refusé'
);
select throws_ok(
  format('select public.media_outdated(%L)', pg_temp.mid('photo')), '42501', 'reserve_a_l_equipe',
  'lecteur : media_outdated refusé'
);
select throws_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), '42501', 'reserve_a_l_equipe',
  'lecteur : media_push refusé'
);
select is(
  (select count(*)::int from public.app_file_locations(array[pg_temp.mid('photo'), pg_temp.mid('fond')])), 2,
  'lecteur : app_file_locations permis'
);

-- ---------------------------------------------------------------------------------------------
-- Clé secrète (fonction Edge) : pas un membre de l'équipe
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'clé secrète : trash refusé (réservé à l''équipe)'
);
select throws_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), '42501', 'reserve_a_l_equipe',
  'clé secrète : media_push refusé'
);
select is(
  (select count(*)::int from public.app_file_locations(array[pg_temp.mid('photo')])), 1,
  'clé secrète : app_file_locations permis'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur aal2 : tout est permis
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select trashed from public.trash(pg_temp.cid('brouillon'))), 1, 'éditeur aal2 : trash permis'
);
select is(
  (select count(*)::int from public.trash_items where item_type = 'content'), 1,
  'éditeur aal2 : voit le contenu dans la corbeille'
);
select lives_ok(
  format('select public.media_outdated(%L)', pg_temp.mid('photo')), 'éditeur aal2 : media_outdated permis'
);
select lives_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), 'éditeur aal2 : media_push permis'
);
select is(
  (select count(*)::int from public.app_file_locations(array[pg_temp.mid('photo')])), 1,
  'éditeur aal2 : app_file_locations permis'
);

-- Personne d'autre ne voit la corbeille, ni ne restaure.
select pg_temp.as_person('editor', 'aal1');
select is(
  (select count(*)::int from public.trash_items), 0, 'éditeur aal1 : corbeille vide (rien de lisible)'
);
select pg_temp.as_person('reader');
select is((select count(*)::int from public.trash_items), 0, 'lecteur : corbeille vide');
select throws_ok(
  format('select public.restore(%L)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'lecteur : ne restaure pas un contenu de la corbeille'
);
select throws_ok(
  format('select public.empty_trash(%L::jsonb)',
    jsonb_build_array(jsonb_build_object('type', 'content', 'id', pg_temp.cid('brouillon')))),
  '42501', 'reserve_a_l_equipe', 'lecteur : ne vide pas la corbeille'
);
select pg_temp.as_anon();
select throws_ok('select * from public.trash_items', '42501', null, 'anonyme : trash_items illisible');
select pg_temp.as_postgres();
select ok(
  (select deleted_at is not null from public.contents where id = pg_temp.cid('brouillon')),
  'le contenu est toujours dans la corbeille'
);

-- ---------------------------------------------------------------------------------------------
-- Admin aal2
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select is(
  (select count(*)::int from public.trash_items where item_type = 'content'), 1,
  'admin : voit le contenu dans la corbeille'
);
select is(
  (select restored from public.restore(pg_temp.cid('brouillon'))), 1, 'admin : restore permis'
);
select is(
  (select trashed from public.trash(pg_temp.cid('brouillon'))), 1, 'admin : trash permis'
);
select is(
  public.empty_trash(jsonb_build_array(jsonb_build_object('type', 'content', 'id', pg_temp.cid('brouillon')))),
  1, 'admin : empty_trash efface un contenu'
);
select lives_ok(
  format('select public.media_outdated(%L)', pg_temp.mid('photo')), 'admin : media_outdated permis'
);
select lives_ok(
  format('select public.media_push(%L)', pg_temp.mid('photo')), 'admin : media_push permis'
);

-- ---------------------------------------------------------------------------------------------
-- Politique de Storage : lecture par un lecteur (la règle elle-même : 39_fichiers_publics)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id, metadata)
select 'files-protected', m.path, pg_temp.person_id('editor')::text,
  jsonb_build_object('size', 1000, 'mimetype', m.mime)
from public.media m;

select pg_temp.as_anon();
select is(
  (select array_agg(name order by name) from storage.objects where bucket_id = 'files-protected'),
  array[pg_temp.mid('photo') || '/photo.webp', pg_temp.mid('fond') || '/fond.webp'],
  'anonyme : lit seulement les objets protégés d''un contenu gratuit en ligne'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-public'), 0,
  'anonyme : la politique ne concerne pas le bucket public (servi sans politique)'
);
select pg_temp.as_person('reader');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'), 2,
  'lecteur sans formule : les mêmes objets'
);
select pg_temp.as_person('editor', 'aal1');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'), 2,
  'éditeur aal1 : comme un lecteur (pas comme l''équipe)'
);
select pg_temp.as_person('editor');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'), 5,
  'éditeur aal2 : tous les objets protégés'
);
select pg_temp.as_person('admin');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'), 5,
  'admin : tous les objets protégés'
);
select pg_temp.as_service();
select is(
  (select count(*)::int from storage.objects where bucket_id = 'files-protected'), 5,
  'clé secrète : tous les objets (ignore les politiques)'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

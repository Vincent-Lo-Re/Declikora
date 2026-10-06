-- Médiathèque : règles tenues par la base (envoi, confirmation, corbeille, effacement, purge).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(56);

select pg_temp.create_people();
-- On part d'une médiathèque vide (la base de développement peut contenir des fichiers).
select pg_temp.empty_media_library();

-- ---------------------------------------------------------------------------------------------
-- Contraintes de la table
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('image', 'a', 'x/a.svg', 'image/svg+xml', 10)$$,
  '23514', null, 'sorte et type incohérents refusés (image en image/svg+xml)'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('audio', 'a', 'x/a.m4a', 'audio/x-m4a', 10)$$,
  '23514', null, 'type non normalisé refusé (audio/x-m4a)'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('svg', 'a', 'x/a.svg', 'image/svg+xml', 5242881)$$,
  '23514', null, 'SVG de plus de 5 Mo refusé'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('lottie', 'a', 'x/a.json', 'application/json', 5242881)$$,
  '23514', null, 'Lottie de plus de 5 Mo refusé'
);
select lives_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('pdf', 'a', 'x/a.pdf', 'application/pdf', 52428800)$$,
  'PDF de 50 Mo accepté'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes)
    values ('pdf', 'b', 'x/b.pdf', 'application/pdf', 52428801)$$,
  '23514', null, 'fichier de plus de 50 Mo refusé'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes, alt)
    values ('audio', 'a', 'x/a.mp3', 'audio/mpeg', 10, 'texte')$$,
  '23514', null, 'texte alternatif refusé sur un audio'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes, transcript)
    values ('image', 'a', 'x/a.png', 'image/png', 10, 'texte')$$,
  '23514', null, 'transcription refusée sur une image'
);
select throws_ok(
  $$insert into public.media (kind, name, path, mime, size_bytes, status)
    values ('image', 'a', 'x/c.png', 'image/png', 10, 'rejected')$$,
  '23514', null, 'un fichier refusé a toujours une raison'
);

-- ---------------------------------------------------------------------------------------------
-- media_create
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');

select throws_ok(
  $$select public.media_create('image', 'a.gif', 'image/gif', 10)$$,
  'P0001', 'type_refuse', 'media_create : type refusé (GIF non converti)'
);
select throws_ok(
  $$select public.media_create('svg', 'a.svg', 'image/png', 10)$$,
  'P0001', 'type_refuse', 'media_create : sorte et type incohérents'
);
select throws_ok(
  $$select public.media_create('svg', 'grand.svg', 'image/svg+xml', 5242881)$$,
  'P0001', 'fichier_trop_lourd', 'media_create : SVG de plus de 5 Mo refusé'
);
select throws_ok(
  $$select public.media_create('lottie', 'grand.json', 'application/json', 6000000)$$,
  'P0001', 'fichier_trop_lourd', 'media_create : Lottie de plus de 5 Mo refusé'
);
select throws_ok(
  $$select public.media_create('audio', 'long.mp3', 'audio/mpeg', 52428801)$$,
  'P0001', 'fichier_trop_lourd', 'media_create : plus de 50 Mo refusé'
);
select throws_ok(
  $$select public.media_create('image', '   ', 'image/png', 10)$$,
  'P0001', 'nom_invalide', 'media_create : nom vide refusé'
);
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 0)$$,
  'P0001', 'fichier_vide', 'media_create : fichier vide refusé'
);
select throws_ok(
  $$select public.media_create('pdf', 'a.pdf', 'application/pdf', 10, 100, 100)$$,
  'P0001', 'fichier_invalide', 'media_create : dimensions refusées sur un PDF'
);
select throws_ok(
  $$select public.media_create('image', 'a.png', 'image/png', 10, null, null, 3.5)$$,
  'P0001', 'fichier_invalide', 'media_create : durée refusée sur une image'
);

create temporary table created_media on commit drop as
select * from public.media_create('image', '  Été à Noël (2).JPG ', 'image/jpeg', 1234, 800, 600);
grant select on created_media to public;

select is((select status from created_media), 'pending', 'media_create : ligne « pending »');
select is(
  (select created_by from created_media), pg_temp.person_id('editor'),
  'media_create : créée par l''appelant'
);
select is((select name from created_media), 'Été à Noël (2).JPG', 'media_create : nom d''origine gardé');
select is(
  (select path from created_media),
  (select id::text from created_media) || '/ete-a-noel-2.jpg',
  'media_create : chemin <id>/<nom-nettoyé>.<ext>'
);
select is(
  (select path from public.media_create('audio', '...', 'audio/mp4', 10) m) ~ '^[0-9a-f-]{36}/fichier\.m4a$',
  true,
  'media_create : nom sans lettre ni chiffre : « fichier », extension tirée du type'
);

-- Nom en Unicode décomposé (NFD : lettre puis accent séparé), comme le donnent souvent macOS et
-- Safari : gardé en NFC, pour que la recherche « été » le trouve et que le chemin reste lisible.
create temporary table nfd_media on commit drop as
select * from public.media_create('image', U&'E\0301te\0301 a\0300 la plage.png', 'image/png', 10);
grant select on nfd_media to public;
select is(
  (select name from nfd_media), U&'\00C9t\00E9 \00E0 la plage.png',
  'media_create : nom en NFD gardé en NFC'
);
select is(
  (select path from nfd_media), (select id::text from nfd_media) || '/ete-a-la-plage.png',
  'media_create : nom en NFD, chemin sans tiret à la place des accents'
);
select is(
  (select count(*)::int from public.media where name ilike U&'%\00E9t\00E9%' and id = (select id from nfd_media)),
  1,
  'recherche « été » (NFC) : le fichier envoyé en NFD est trouvé'
);
update public.media set name = U&'Cafe\0301.png' where id = (select id from nfd_media);
select is(
  (select name from public.media where id = (select id from nfd_media)), U&'Caf\00E9.png',
  'renommage en NFD : gardé en NFC (déclencheur)'
);

-- ---------------------------------------------------------------------------------------------
-- media_confirm
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  format('select public.media_confirm(%L)', (select id from created_media)),
  'P0001', 'fichier_absent', 'media_confirm : objet absent de Storage'
);

select pg_temp.as_postgres();
insert into storage.objects (bucket_id, name, owner_id, metadata)
select 'files-protected', path, pg_temp.person_id('editor')::text,
  '{"size": 1234, "mimetype": "image/jpeg", "cacheControl": "max-age=60"}'
from created_media;

-- Un SVG et une image dont l'objet ne correspond pas à l'envoi annoncé.
insert into public.media (id, kind, name, path, mime, size_bytes, created_by) values
  ('20000000-0000-4000-8000-000000000001', 'svg', 'logo.svg',
    '20000000-0000-4000-8000-000000000001/logo.svg', 'image/svg+xml', 500,
    pg_temp.person_id('editor')),
  ('20000000-0000-4000-8000-000000000002', 'image', 'faux.png',
    '20000000-0000-4000-8000-000000000002/faux.png', 'image/png', 500,
    pg_temp.person_id('editor')),
  ('20000000-0000-4000-8000-000000000003', 'image', 'vieux.png',
    '20000000-0000-4000-8000-000000000003/vieux.png', 'image/png', 500,
    pg_temp.person_id('editor')),
  ('20000000-0000-4000-8000-000000000004', 'image', 'deguise.png',
    '20000000-0000-4000-8000-000000000004/deguise.png', 'image/png', 500,
    pg_temp.person_id('editor'));
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('files-protected', '20000000-0000-4000-8000-000000000001/logo.svg',
    pg_temp.person_id('editor')::text, '{"size": 500, "mimetype": "image/svg+xml"}'),
  ('files-protected', '20000000-0000-4000-8000-000000000002/faux.png',
    pg_temp.person_id('editor')::text, '{"size": 999, "mimetype": "image/png"}'),
  ('files-protected', '20000000-0000-4000-8000-000000000003/vieux.png',
    pg_temp.person_id('editor')::text, '{"size": 500, "mimetype": "image/png"}'),
  -- Bonne taille, mais un SVG envoyé à la place de l'image annoncée : il échapperait à la
  -- vérification de la fonction « files » s'il passait « ready ».
  ('files-protected', '20000000-0000-4000-8000-000000000004/deguise.png',
    pg_temp.person_id('editor')::text, '{"size": 500, "mimetype": "image/svg+xml"}');
update public.media set status_changed_at = now() - interval '23 hours 30 minutes'
where id = '20000000-0000-4000-8000-000000000003';

select pg_temp.as_person('editor');
select is(
  (select status from public.media_confirm((select id from created_media))), 'ready',
  'media_confirm : image conforme prête'
);
select is(
  (select status from public.media_confirm((select id from created_media))), 'ready',
  'media_confirm : rejouable'
);
select is(
  (select status from public.media_confirm('20000000-0000-4000-8000-000000000001')), 'checking',
  'media_confirm : SVG en vérification (fonction files)'
);
select is(
  (select status || ' ' || reject_reason
    from public.media_confirm('20000000-0000-4000-8000-000000000002')),
  'rejected fichier_incoherent',
  'media_confirm : objet de mauvaise taille refusé'
);
select is(
  (select status || ' ' || reject_reason
    from public.media_confirm('20000000-0000-4000-8000-000000000004')),
  'rejected fichier_incoherent',
  'media_confirm : objet d''un autre type (SVG au lieu de PNG) refusé'
);
select throws_ok(
  $$select public.media_confirm('20000000-0000-4000-8000-000000000003')$$,
  'P0001', 'envoi_expire', 'media_confirm : envoi de près de 24 h refusé'
);
select throws_ok(
  $$select public.media_confirm('30000000-0000-4000-8000-000000000000')$$,
  'P0001', 'fichier_introuvable', 'media_confirm : fichier inconnu'
);

-- ---------------------------------------------------------------------------------------------
-- Corbeille
-- ---------------------------------------------------------------------------------------------

select is(
  (select count(*)::int from public.media_uses((select id from created_media))), 0,
  'media_uses : vide à l''étape 3'
);
select ok(
  (select deleted_at is not null and deleted_by = pg_temp.person_id('editor')
    from public.media_trash((select id from created_media))),
  'media_trash : dans la corbeille, avec son auteur'
);
select is(
  (select count(*)::int from public.trash_items where id = (select id from created_media)), 1,
  'le fichier apparaît dans la corbeille'
);
select is(
  (select purge_at from public.trash_items where id = (select id from created_media)),
  now() + interval '30 days',
  'effacement automatique prévu 30 jours après'
);
select is(
  pg_temp.affected(format('update public.media set alt = %L where id = %L', 'x', (select id from created_media))),
  0,
  'un fichier dans la corbeille ne se modifie pas'
);
select ok(
  (select deleted_at is null from public.media_restore((select id from created_media))),
  'media_restore : sorti de la corbeille'
);
select is(
  (select count(*)::int from public.trash_items), 0, 'corbeille de nouveau vide'
);

-- Vider la corbeille : sélection, puis tout.
select public.media_trash((select id from created_media));
select public.media_trash('20000000-0000-4000-8000-000000000001');
select throws_ok(
  $$select public.empty_trash('[{"type": "category", "id": "20000000-0000-4000-8000-000000000001"}]')$$,
  'P0001', 'demande_invalide', 'empty_trash : type inconnu refusé'
);
select is(
  public.empty_trash('[{"type": "file", "id": "20000000-0000-4000-8000-000000000001"}]'), 1,
  'empty_trash : la sélection'
);
select is(
  (select array_agg(id) from public.trash_items), array[(select id from created_media)],
  'un fichier dont l''effacement est demandé n''est plus dans la corbeille'
);
select throws_ok(
  $$select public.media_restore('20000000-0000-4000-8000-000000000001')$$,
  'P0001', 'effacement_demande', 'un fichier dont l''effacement est demandé ne se restaure plus'
);
select is(public.empty_trash(), 1, 'empty_trash : tout le reste');
select is((select count(*)::int from public.trash_items), 0, 'corbeille vide');

-- Un fichier utilisé ne part pas à la corbeille et ne s'efface pas. À l'étape 3 rien ne
-- l'utilise encore : on simule un usage (annulé par le rollback final).
select pg_temp.as_postgres();
create or replace function private.media_uses(target_media_id uuid)
returns table (
  content_id uuid, kind text, title text, in_draft boolean, in_app boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select gen_random_uuid(), 'article', 'Bien respirer', true, false
  where target_media_id = '20000000-0000-4000-8000-000000000002'
$$;
update public.media set status = 'ready', reject_reason = null
where id = '20000000-0000-4000-8000-000000000002';

select pg_temp.as_person('editor');
select is(
  (select title from public.media_uses('20000000-0000-4000-8000-000000000002')), 'Bien respirer',
  'media_uses : la liste des contenus'
);
select throws_like(
  $$select public.media_trash('20000000-0000-4000-8000-000000000002')$$,
  'fichier_utilise', 'media_trash : refusé tant que le fichier est utilisé'
);
select pg_temp.as_postgres();
select throws_ok(
  $$delete from public.media where id = '20000000-0000-4000-8000-000000000002'$$,
  'P0001', 'fichier_utilise', 'déclencheur : un fichier utilisé ne s''efface pas'
);

-- ---------------------------------------------------------------------------------------------
-- Purge automatique (tâche « corbeille ») : seulement au-delà de 30 jours
-- ---------------------------------------------------------------------------------------------

insert into public.media (id, kind, name, path, mime, size_bytes, status, deleted_at) values
  ('40000000-0000-4000-8000-000000000001', 'pdf', 'ancien.pdf',
    '40000000-0000-4000-8000-000000000001/ancien.pdf', 'application/pdf', 10, 'ready',
    now() - interval '31 days'),
  ('40000000-0000-4000-8000-000000000002', 'pdf', 'recent.pdf',
    '40000000-0000-4000-8000-000000000002/recent.pdf', 'application/pdf', 10, 'ready',
    now() - interval '29 days');
select is(private.purge_trash(), 1, 'purge : un seul fichier de plus de 30 jours');
select ok(
  (select purge_requested_at is not null from public.media
    where id = '40000000-0000-4000-8000-000000000001'),
  'purge : effacement demandé au-delà de 30 jours'
);
select ok(
  (select purge_requested_at is null from public.media
    where id = '40000000-0000-4000-8000-000000000002'),
  'purge : rien avant 30 jours'
);

-- ---------------------------------------------------------------------------------------------
-- Tâches planifiées
-- ---------------------------------------------------------------------------------------------

select results_eq(
  $$select jobname::text, schedule::text, command::text from cron.job order by jobname$$,
  $$values
    ('audit-fichiers', '0 3 * * 0', 'select private.audit_files()'),
    ('corbeille', '0 2 * * *', 'select private.purge_trash()'),
    ('fichiers', '* * * * *', 'select private.kick_files()'),
    ('menage', '0 4 * * 0', 'select private.housekeeping()'),
    ('publications', '* * * * *', 'select private.run_due_publications()')$$,
  'les cinq tâches planifiées existent (publications : étape 5)'
);
select lives_ok($$select private.housekeeping()$$, 'le ménage tourne');

select * from finish();
rollback;

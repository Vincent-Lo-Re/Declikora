-- Travail de la fonction « files », tel que la base le décide et l'enregistre (§ 3.7, § 4.3,
-- § 4.4), et tâche « fichiers » (pg_cron + pg_net).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(43);

select pg_temp.create_people();

-- On part d'une médiathèque vide (la base de développement peut contenir des fichiers).
select pg_temp.empty_media_library();
update private.settings set files_last_kick_at = null, files_last_audit_at = null;

-- ---------------------------------------------------------------------------------------------
-- Frein anti-abus (appels sans session de membre)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select ok(public.files_claim_run('kick'), 'frein : premier passage « kick » permis');
select ok(not public.files_claim_run('kick'), 'frein : second passage « kick » refusé aussitôt');
select ok(public.files_claim_run('audit'), 'frein : premier contrôle permis');
select ok(not public.files_claim_run('audit'), 'frein : second contrôle refusé aussitôt');
select ok(not public.files_claim_run('clean'), 'frein : « clean » jamais permis sans membre');
select pg_temp.as_postgres();
update private.settings set files_last_kick_at = now() - interval '21 seconds';
select pg_temp.as_service();
select ok(public.files_claim_run('kick'), 'frein : « kick » de nouveau permis après 20 s');
select pg_temp.as_postgres();
update private.settings set files_last_audit_at = now() - interval '59 minutes';
select pg_temp.as_service();
select ok(not public.files_claim_run('audit'), 'frein : contrôle refusé avant une heure');
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Pas de travail : la tâche « fichiers » n'appelle rien
-- ---------------------------------------------------------------------------------------------

select ok(not private.files_have_work(), 'médiathèque vide : aucun travail');
select is(private.kick_files(), null, 'kick_files : aucun appel sans travail');

-- ---------------------------------------------------------------------------------------------
-- La liste du travail
-- ---------------------------------------------------------------------------------------------

insert into public.media (id, kind, name, path, mime, size_bytes, status, created_by) values
  -- à vérifier
  ('60000000-0000-4000-8000-000000000001', 'svg', 'a.svg',
    '60000000-0000-4000-8000-000000000001/a.svg', 'image/svg+xml', 10, 'checking',
    pg_temp.person_id('editor')),
  -- public alors qu'aucun contenu gratuit en ligne ne l'utilise : à rendre protégé
  ('60000000-0000-4000-8000-000000000002', 'image', 'b.png',
    '60000000-0000-4000-8000-000000000002/b.png', 'image/png', 10, 'ready',
    pg_temp.person_id('editor')),
  -- effacement demandé
  ('60000000-0000-4000-8000-000000000003', 'pdf', 'c.pdf',
    '60000000-0000-4000-8000-000000000003/c.pdf', 'application/pdf', 10, 'ready',
    pg_temp.person_id('editor')),
  -- envoi abandonné depuis plus de 24 h
  ('60000000-0000-4000-8000-000000000004', 'image', 'd.png',
    '60000000-0000-4000-8000-000000000004/d.png', 'image/png', 10, 'pending',
    pg_temp.person_id('editor')),
  -- envoi en cours : rien à faire
  ('60000000-0000-4000-8000-000000000005', 'image', 'e.png',
    '60000000-0000-4000-8000-000000000005/e.png', 'image/png', 10, 'pending',
    pg_temp.person_id('editor')),
  -- prêt et protégé : rien à faire
  ('60000000-0000-4000-8000-000000000006', 'image', 'f.png',
    '60000000-0000-4000-8000-000000000006/f.png', 'image/png', 10, 'ready',
    pg_temp.person_id('editor'));
update public.media set is_public = true where id = '60000000-0000-4000-8000-000000000002';
update public.media set deleted_at = now(), purge_requested_at = now()
where id = '60000000-0000-4000-8000-000000000003';
update public.media set status_changed_at = now() - interval '25 hours'
where id = '60000000-0000-4000-8000-000000000004';

select pg_temp.as_service();
select results_eq(
  $$select action, media_id, to_public from public.files_worklist()$$,
  $$values
    ('check', '60000000-0000-4000-8000-000000000001'::uuid, null::boolean),
    ('move', '60000000-0000-4000-8000-000000000002'::uuid, false),
    ('purge', '60000000-0000-4000-8000-000000000003'::uuid, null::boolean),
    ('discard', '60000000-0000-4000-8000-000000000004'::uuid, null::boolean)$$,
  'files_worklist : vérifier, déplacer, effacer, nettoyer, dans cet ordre'
);
select is(
  (select count(*)::int from public.files_worklist(2)), 2, 'files_worklist : lot limité'
);
select pg_temp.as_postgres();
select ok(private.files_have_work(), 'il y a du travail');

-- La tâche « fichiers » met en file un appel à la fonction, avec la clé publishable.
select isnt(private.kick_files(), null, 'kick_files : un appel quand il y a du travail');
select results_eq(
  $$select url, method::text, headers ->> 'apikey', headers ->> 'Content-Type',
      convert_from(body, 'utf8')::jsonb ->> 'mode'
    from net.http_request_queue order by id desc limit 1$$,
  $$values ('http://kong:8000/functions/v1/files'::text, 'POST'::text,
    'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'::text, 'application/json'::text,
    'kick'::text)$$,
  'kick_files : POST { mode: kick } vers l''adresse des réglages, clé publishable en apikey'
);
select ok(
  (select not (headers ? 'Authorization') from net.http_request_queue order by id desc limit 1),
  'kick_files : pas d''en-tête Authorization (la clé publishable n''est pas un JWT)'
);

-- ---------------------------------------------------------------------------------------------
-- Vérification d'un SVG ou d'un Lottie
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select is(
  public.files_mark_checked('60000000-0000-4000-8000-000000000001', false, 'svg_element_interdit'),
  'rejected', 'files_mark_checked : refusé'
);
select is(
  (select reject_reason from public.media where id = '60000000-0000-4000-8000-000000000001'),
  'svg_element_interdit', 'la raison du refus est enregistrée'
);
select is(
  public.files_mark_checked('60000000-0000-4000-8000-000000000001', true),
  'rejected', 'files_mark_checked : sans effet sur un fichier qui n''est plus en vérification'
);

-- Trois vérifications ratées : refusé, et plus jamais rappelé.
select pg_temp.as_postgres();
insert into public.media (id, kind, name, path, mime, size_bytes, status) values
  ('60000000-0000-4000-8000-000000000007', 'lottie', 'g.json',
    '60000000-0000-4000-8000-000000000007/g.json', 'application/json', 10, 'checking');
select pg_temp.as_service();
select is(
  public.files_mark_check_failed('60000000-0000-4000-8000-000000000007', 'délai dépassé'),
  'checking', 'premier échec : toujours en vérification'
);
select is(
  (select count(*)::int from public.files_worklist()
    where media_id = '60000000-0000-4000-8000-000000000007'),
  0, 'après un échec, la base attend avant de le reproposer (pas de boucle)'
);
select pg_temp.as_postgres();
update public.media set sync_failed_at = now() - interval '11 minutes'
where id = '60000000-0000-4000-8000-000000000007';
select pg_temp.as_service();
select is(
  (select action from public.files_worklist() where media_id = '60000000-0000-4000-8000-000000000007'),
  'check', '10 minutes après, il est reproposé'
);
select is(
  public.files_mark_check_failed('60000000-0000-4000-8000-000000000007', 'délai dépassé'),
  'checking', 'deuxième échec : toujours en vérification'
);
select is(
  public.files_mark_check_failed('60000000-0000-4000-8000-000000000007', 'délai dépassé'),
  'rejected', 'troisième échec : refusé'
);
select is(
  (select reject_reason || ' ' || check_attempts from public.media
    where id = '60000000-0000-4000-8000-000000000007'),
  'verification_impossible 3', 'raison « verification_impossible », trois essais'
);
select is(
  public.files_mark_check_failed('60000000-0000-4000-8000-000000000007', 'encore'),
  'rejected', 'un quatrième échec ne change plus rien'
);

-- ---------------------------------------------------------------------------------------------
-- Déplacement
-- ---------------------------------------------------------------------------------------------

select ok(public.files_mark_moved('60000000-0000-4000-8000-000000000002', false), 'files_mark_moved');
select is(
  (select is_public from public.media where id = '60000000-0000-4000-8000-000000000002'),
  false, 'le fichier est noté dans le bucket protégé'
);
select ok(
  not public.files_mark_moved('60000000-0000-4000-8000-000000000005', true),
  'un fichier qui n''est pas prêt ne devient jamais public'
);
select is(
  (select count(*)::int from public.files_worklist() where action = 'move'), 0,
  'plus rien à déplacer'
);

-- ---------------------------------------------------------------------------------------------
-- Effacement
-- ---------------------------------------------------------------------------------------------

select ok(
  public.files_mark_erased('60000000-0000-4000-8000-000000000003'),
  'files_mark_erased : effacement demandé, ligne supprimée'
);
select ok(
  public.files_mark_erased('60000000-0000-4000-8000-000000000003'),
  'files_mark_erased : rejouable (la ligne n''existe plus)'
);
select ok(
  public.files_mark_erased('60000000-0000-4000-8000-000000000004'),
  'files_mark_erased : envoi abandonné depuis plus de 24 h, ligne supprimée'
);
select ok(
  not public.files_mark_erased('60000000-0000-4000-8000-000000000005'),
  'files_mark_erased : refuse un envoi en cours'
);
select ok(
  not public.files_mark_erased('60000000-0000-4000-8000-000000000006'),
  'files_mark_erased : refuse un fichier prêt, hors corbeille'
);
select is(
  (select count(*)::int from public.media where id in (
    '60000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000006')),
  2, 'les fichiers refusés sont toujours là'
);

-- Effacement refusé par la base : le fichier est encore utilisé (usage simulé, annulé par le
-- rollback final). La raison est notée, la demande retirée : aucune boucle.
select pg_temp.as_postgres();
insert into public.media (id, kind, name, path, mime, size_bytes, status, deleted_at, purge_requested_at)
values
  ('60000000-0000-4000-8000-000000000008', 'image', 'h.png',
    '60000000-0000-4000-8000-000000000008/h.png', 'image/png', 10, 'ready', now(), now()),
  ('60000000-0000-4000-8000-000000000009', 'image', 'i.png',
    '60000000-0000-4000-8000-000000000009/i.png', 'image/png', 10, 'ready', now(), now());
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
  where target_media_id in (
    '60000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000009')
$$;

select pg_temp.as_service();
select ok(
  not public.files_mark_erased('60000000-0000-4000-8000-000000000008'),
  'effacement refusé par la base (fichier utilisé) : faux, sans erreur'
);
select results_eq(
  $$select purge_requested_at is null, purge_error from public.media
    where id = '60000000-0000-4000-8000-000000000008'$$,
  $$values (true, 'fichier_utilise'::text)$$,
  'raison notée et demande retirée'
);
select is(
  (select count(*)::int from public.files_worklist()
    where media_id in ('60000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000009')),
  0, 'la liste refuse d''avance un effacement de fichier utilisé, sans toucher à l''objet'
);
select is(
  (select purge_error from public.media where id = '60000000-0000-4000-8000-000000000009'),
  'fichier_utilise', 'le refus d''avance est noté aussi'
);
select pg_temp.as_postgres();
select is(
  (select array_agg(purge_error order by id) from public.trash_items
    where id in ('60000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000009')),
  array['fichier_utilise', 'fichier_utilise'],
  'les fichiers réapparaissent dans la corbeille avec « Effacement impossible »'
);

-- ---------------------------------------------------------------------------------------------
-- Contrôle des orphelins et nettoyage
-- ---------------------------------------------------------------------------------------------

insert into storage.objects (bucket_id, name, metadata, created_at) values
  ('files-protected', '60000000-0000-4000-8000-000000000006/f.png', '{"size": 10}', now() - interval '2 days'),
  ('files-protected', '70000000-0000-4000-8000-000000000001/reste.png', '{"size": 10}', now() - interval '2 days'),
  ('files-public', '70000000-0000-4000-8000-000000000002/recent.png', '{"size": 10}', now());

select pg_temp.as_service();
select is(public.files_audit(), 2, 'contrôle : deux objets sans ligne media');
select is(
  (select orphan_paths from public.media_audit order by id desc limit 1),
  array['files-protected/70000000-0000-4000-8000-000000000001/reste.png',
    'files-public/70000000-0000-4000-8000-000000000002/recent.png'],
  'contrôle : chemins « bucket/chemin » enregistrés'
);
select results_eq(
  $$select bucket_id, name from public.files_orphans()$$,
  $$values ('files-protected'::text, '70000000-0000-4000-8000-000000000001/reste.png'::text)$$,
  'nettoyage : seulement les orphelins de plus de 24 h'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

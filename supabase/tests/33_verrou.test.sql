-- Verrou « un seul à la fois » (docs/ARCHITECTURE-CONTENUS.md, § 1.10 et § 3.3, [D13]) :
-- prendre, signe de vie, périmé au bout de 90 s, reprendre la main, relâcher (la ligne reste),
-- état pour le repli sans Realtime, ménage des lignes anciennes.
-- Rappel : now() ne change pas dans une transaction ; les verrous périmés sont simulés en
-- reculant heartbeat_at (en postgres).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(59);

select pg_temp.create_people();
select pg_temp.empty_contents();

-- Une page créée par l'éditeur (il en tient le verrou), et une page sans ligne de verrou.
select pg_temp.as_person('editor');
create temporary table page as select (public.content_create('page', title => 'Aide')).id;
grant select on page to public;
select pg_temp.as_postgres();
insert into public.contents (id, kind, draft) values
  ('20000000-0000-4000-8000-000000000002', 'page', '{"v":1,"title":"Sans verrou","blocks":[]}');

create function pg_temp.page_id()
returns uuid
language sql
stable
as $$
  select id from page
$$;

-- Recule le dernier signe de vie du verrou de la page.
create function pg_temp.age_lock(seconds integer)
returns void
language sql
security definer
as $$
  update public.edit_locks set heartbeat_at = now() - make_interval(secs => seconds)
  where content_id = pg_temp.page_id()
$$;
grant execute on function pg_temp.page_id(), pg_temp.age_lock(integer) to public;

-- ---------------------------------------------------------------------------------------------
-- Prendre et garder
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select row(mine, holder_id, holder_name, is_active, draft_rev)::text
    from public.lock_status(pg_temp.page_id())),
  row(true, pg_temp.person_id('editor'), 'editeur@tests.local', true, 1)::text,
  'lock_status : le créateur tient le verrou (nom, sinon e-mail)'
);
select is(
  (select mine from public.lock_take(pg_temp.page_id())), true,
  'lock_take : reprendre son propre verrou réussit'
);
select ok(public.lock_heartbeat(pg_temp.page_id()), 'lock_heartbeat : vrai pour le détenteur');

select pg_temp.as_person('editor2');
select is(
  (select row(mine, holder_id, holder_name, is_active)::text
    from public.lock_take(pg_temp.page_id())),
  row(false, pg_temp.person_id('editor'), 'editeur@tests.local', true)::text,
  'lock_take : refusé si un autre écrit ; renvoie son nom'
);
select is(
  (select holder_id from public.edit_locks where content_id = pg_temp.page_id()),
  pg_temp.person_id('editor'),
  'lock_take refusé : le verrou n''a pas changé'
);
select ok(not public.lock_heartbeat(pg_temp.page_id()), 'lock_heartbeat : faux pour un autre');
select ok(not public.lock_release(pg_temp.page_id()), 'lock_release : faux pour un autre, sans effet');
select is(
  (select holder_id from public.edit_locks where content_id = pg_temp.page_id()),
  pg_temp.person_id('editor'),
  'lock_release d''un autre : le verrou reste à son détenteur'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 1, '{"v":1,"title":"x","blocks":[]}')$$,
  'P0001', 'verrou_perdu', 'save_draft : refusé à celui qui ne tient pas le verrou'
);

-- Pas encore périmé à 89 s.
select pg_temp.age_lock(89);
select is(
  (select mine from public.lock_take(pg_temp.page_id())), false,
  'lock_take : un verrou vu il y a 89 s est encore actif'
);

-- Périmé au-delà de 90 s : n'importe qui le prend.
select pg_temp.age_lock(91);
select is(
  (select is_active from public.lock_status(pg_temp.page_id())), false,
  'lock_status : un verrou sans signe de vie depuis 91 s n''est plus actif'
);
select is(
  (select row(mine, holder_id, is_active)::text from public.lock_take(pg_temp.page_id())),
  row(true, pg_temp.person_id('editor2'), true)::text,
  'lock_take : un verrou périmé se prend sans forcer'
);
select is(
  (select taken_at from public.edit_locks where content_id = pg_temp.page_id()),
  now(),
  'lock_take : l''heure de prise est celle du nouveau détenteur'
);

-- Le premier a perdu la main.
select pg_temp.as_person('editor');
select ok(not public.lock_heartbeat(pg_temp.page_id()), 'l''ancien détenteur : signe de vie faux');
select is(
  (select row(mine, holder_name)::text from public.lock_status(pg_temp.page_id())),
  row(false, 'editeur2@tests.local')::text,
  'l''ancien détenteur : lock_status nomme le nouveau'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 1, '{"v":1,"title":"x","blocks":[]}')$$,
  'P0001', 'verrou_perdu', 'l''ancien détenteur ne peut plus enregistrer'
);

-- « Reprendre la main » : force.
select is(
  (select row(mine, holder_id)::text from public.lock_take(pg_temp.page_id(), true)),
  row(true, pg_temp.person_id('editor'))::text,
  'lock_take(force) : reprendre la main à un verrou actif'
);
select is(
  (select draft_rev from public.save_draft(pg_temp.page_id(), 1, '{"v":1,"title":"Repris","blocks":[]}')),
  2,
  'après la reprise de la main, l''enregistrement passe'
);
select is(
  (select row(draft_rev, heartbeat_at)::text from public.edit_locks where content_id = pg_temp.page_id()),
  row(2, now())::text,
  'save_draft : recopie la révision dans le verrou et vaut signe de vie'
);

-- Un verrou périmé mais que personne n'a repris reste celui de son détenteur.
select pg_temp.age_lock(300);
select ok(public.lock_heartbeat(pg_temp.page_id()), 'verrou périmé non repris : le signe de vie le ranime');
select pg_temp.age_lock(300);
select is(
  (select draft_rev from public.save_draft(pg_temp.page_id(), 2, '{"v":1,"title":"Revenu","blocks":[]}')),
  3,
  'verrou périmé non repris : l''enregistrement passe encore'
);

-- ---------------------------------------------------------------------------------------------
-- Relâcher
-- ---------------------------------------------------------------------------------------------

select ok(public.lock_release(pg_temp.page_id()), 'lock_release : vrai pour le détenteur');
select is(
  (select row(holder_id, taken_at, draft_rev)::text from public.edit_locks where content_id = pg_temp.page_id()),
  row(null::uuid, null::timestamptz, 3)::text,
  'lock_release : la ligne reste, holder_id et taken_at passent à null (un UPDATE, pour Realtime)'
);
select is(
  (select row(mine, holder_id, holder_name, is_active, draft_rev)::text
    from public.lock_status(pg_temp.page_id())),
  row(false, null::uuid, null::text, false, 3)::text,
  'lock_status : verrou libre'
);
select ok(not public.lock_release(pg_temp.page_id()), 'lock_release : faux quand on ne le tient plus');
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 3, '{"v":1,"title":"x","blocks":[]}')$$,
  'P0001', 'verrou_perdu', 'après lock_release, on n''enregistre plus'
);

select pg_temp.as_person('editor2');
select is(
  (select mine from public.lock_take(pg_temp.page_id())), true,
  'un verrou libre se prend sans forcer'
);

-- Contenu sans ligne de verrou (ménage passé) : libre, et lock_take crée la ligne.
select is(
  (select row(mine, holder_id, is_active, draft_rev)::text
    from public.lock_status('20000000-0000-4000-8000-000000000002')),
  row(false, null::uuid, false, 1)::text,
  'lock_status : un contenu sans ligne de verrou est libre'
);
select throws_ok(
  $$select public.save_draft('20000000-0000-4000-8000-000000000002', 1, '{"v":1,"title":"x","blocks":[]}')$$,
  'P0001', 'verrou_perdu', 'save_draft : refusé sans ligne de verrou'
);
select is(
  (select mine from public.lock_take('20000000-0000-4000-8000-000000000002')), true,
  'lock_take : crée la ligne de verrou'
);
select is(
  (select count(*)::int from public.edit_locks where content_id = '20000000-0000-4000-8000-000000000002'),
  1,
  'lock_take : une seule ligne par contenu'
);

-- Contenus inconnus ou dans la corbeille.
select throws_ok(
  $$select public.lock_take('20000000-0000-4000-8000-0000000000ff')$$, 'P0001', 'contenu_introuvable',
  'lock_take : contenu inconnu'
);
select throws_ok(
  $$select public.lock_status('20000000-0000-4000-8000-0000000000ff')$$, 'P0001', 'contenu_introuvable',
  'lock_status : contenu inconnu'
);
select ok(
  not public.lock_heartbeat('20000000-0000-4000-8000-0000000000ff'),
  'lock_heartbeat : faux pour un contenu inconnu'
);
select pg_temp.as_postgres();
update public.contents
set deleted_at = now(), trash_batch = gen_random_uuid()
where id = '20000000-0000-4000-8000-000000000002';
select pg_temp.as_person('editor');
select throws_ok(
  $$select public.lock_take('20000000-0000-4000-8000-000000000002', true)$$, 'P0001',
  'dans_la_corbeille', 'lock_take : refusé sur un contenu dans la corbeille, même en forçant'
);

-- ---------------------------------------------------------------------------------------------
-- Deux ouvertures de l'éditeur par le même membre (deux onglets)
-- ---------------------------------------------------------------------------------------------

-- editor2 tient le verrou de la page, sans ouverture de l'éditeur (null). Onglet A, puis B.
select pg_temp.as_person('editor2');
select is(
  (select mine from public.lock_take(pg_temp.page_id(), false, 'a0000000-0000-4000-8000-00000000000a'::uuid)), true,
  'lock_take : le même membre prend la main depuis une ouverture de l''éditeur'
);
select is(
  (select holder_session from public.edit_locks where content_id = pg_temp.page_id()), 'a0000000-0000-4000-8000-00000000000a'::uuid,
  'lock_take : l''ouverture de l''éditeur est rangée dans le verrou'
);
select is(
  (select row(mine, holder_id, is_active)::text from public.lock_status(pg_temp.page_id(), 'b0000000-0000-4000-8000-00000000000b'::uuid)),
  row(false, pg_temp.person_id('editor2'), true)::text,
  'lock_status : une autre ouverture du même membre ne tient pas le verrou'
);
select is(
  (select mine from public.lock_take(pg_temp.page_id(), false, 'b0000000-0000-4000-8000-00000000000b'::uuid)), true,
  'lock_take : un autre onglet du même membre prend la main sans forcer'
);
select ok(
  not public.lock_heartbeat(pg_temp.page_id(), 'a0000000-0000-4000-8000-00000000000a'::uuid),
  'l''ancien onglet : signe de vie faux (il passe en lecture seule)'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 3, '{"v":1,"title":"A","blocks":[]}', null,
    'a0000000-0000-4000-8000-00000000000a')$$,
  'P0001', 'verrou_perdu', 'l''ancien onglet ne peut plus enregistrer'
);
select ok(
  not public.lock_release(pg_temp.page_id(), 'a0000000-0000-4000-8000-00000000000a'::uuid),
  'fermer l''ancien onglet ne relâche pas le verrou'
);
select is(
  (select row(holder_id, holder_session)::text from public.edit_locks
    where content_id = pg_temp.page_id()),
  row(pg_temp.person_id('editor2'), 'b0000000-0000-4000-8000-00000000000b'::uuid)::text,
  'le nouvel onglet garde la main'
);
select ok(public.lock_heartbeat(pg_temp.page_id(), 'b0000000-0000-4000-8000-00000000000b'::uuid), 'le nouvel onglet : signe de vie vrai');

-- Réponse perdue : le même envoi, rejoué, renvoie la révision déjà enregistrée.
select is(
  (select draft_rev from public.save_draft(pg_temp.page_id(), 3,
    '{"v":1,"title":"B","blocks":[]}', null, 'b0000000-0000-4000-8000-00000000000b'::uuid)),
  4,
  'save_draft : enregistre depuis l''onglet qui tient la main'
);
select is(
  (select row(draft_rev, draft_saved_at)::text from public.save_draft(pg_temp.page_id(), 3,
    '{"v":1,"blocks":[],"title":"B"}', null, 'b0000000-0000-4000-8000-00000000000b'::uuid)),
  row(4, now())::text,
  'save_draft : le même envoi rejoué (réponse perdue) renvoie la révision déjà enregistrée'
);
select is(
  (select draft_rev from public.contents where id = pg_temp.page_id()), 4,
  'save_draft rejoué : rien n''est réécrit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 3, '{"v":1,"title":"B2","blocks":[]}', null,
    'b0000000-0000-4000-8000-00000000000b')$$,
  'P0001', 'conflit_revision', 'save_draft : un autre brouillon sur la révision d''avant reste un conflit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 3, '{"v":1,"title":"B","blocks":[]}',
    '{"is_free": true}', 'b0000000-0000-4000-8000-00000000000b')$$,
  'P0001', 'conflit_revision', 'save_draft : un envoi rejoué avec des réglages reste un conflit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.page_id(), 2, '{"v":1,"title":"B","blocks":[]}', null,
    'b0000000-0000-4000-8000-00000000000b')$$,
  'P0001', 'conflit_revision', 'save_draft : deux révisions de retard, c''est un conflit'
);
select ok(
  public.lock_release(pg_temp.page_id(), 'b0000000-0000-4000-8000-00000000000b'::uuid),
  'lock_release : vrai pour l''ouverture qui tient le verrou'
);
select is(
  (select row(holder_id, holder_session)::text from public.edit_locks
    where content_id = pg_temp.page_id()),
  row(null::uuid, null::uuid)::text,
  'lock_release : l''ouverture est effacée avec le détenteur'
);

-- ---------------------------------------------------------------------------------------------
-- Realtime et ménage
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_postgres();
select ok(
  exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'edit_locks'),
  'Realtime : edit_locks est publiée (INSERT et UPDATE filtrés par content_id)'
);
select is(
  (select relreplident::text from pg_class where oid = 'public.edit_locks'::regclass),
  'd',
  'Realtime : identité de réplication par défaut (on n''écoute pas les DELETE)'
);
select is(
  (select count(*)::int from pg_policies
    where schemaname = 'public' and tablename = 'edit_locks' and cmd = 'SELECT'
      and roles = '{authenticated}' and qual like '%is_staff()%'),
  1,
  'Realtime : les messages suivent la politique de lecture (équipe en aal2)'
);

update public.edit_locks set heartbeat_at = now() - interval '25 hours'
where content_id = '20000000-0000-4000-8000-000000000002';
select private.housekeeping();
select is(
  (select count(*)::int from public.edit_locks where content_id = '20000000-0000-4000-8000-000000000002'),
  0,
  'ménage : une ligne sans signe de vie depuis plus d''un jour est effacée'
);
select is(
  (select count(*)::int from public.edit_locks where content_id = pg_temp.page_id()),
  1,
  'ménage : une ligne récente reste'
);
select is(
  (select jobname from cron.job where jobname = 'menage'),
  'menage',
  'ménage : la tâche hebdomadaire existe'
);
select is(
  private.lock_ttl(), interval '90 seconds', 'un verrou est périmé au bout de 90 s'
);

select * from finish();
rollback;

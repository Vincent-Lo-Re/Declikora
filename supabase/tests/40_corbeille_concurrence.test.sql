-- Mise à la corbeille d'un fichier PENDANT qu'un brouillon l'insère (docs/ARCHITECTURE-CONTENUS.md,
-- § 3.2 point 4, § 3.6) : deux sessions, une seule réussit.
-- Le verrou de ligne (for share dans le déclencheur du brouillon, for update dans media_trash)
-- ne se voit qu'entre deux sessions : la seconde est ouverte par dblink, sur la même base. Elle ne
-- voit que ce qui est validé : ses fichiers et son contenu sont donc validés (autocommit), puis
-- effacés à la fin (et au début, s'il reste quelque chose d'un essai interrompu).
-- Ce fichier ne vide pas la médiathèque : un TRUNCATE garderait un verrou exclusif sur media
-- jusqu'à la fin, et la seconde session l'attendrait. lock_timeout (ici) et statement_timeout
-- (seconde session) changent une attente en erreur : le test ne peut pas rester bloqué.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(8);

select pg_temp.create_people();

create extension if not exists dblink with schema extensions;

-- La seconde session : même serveur, même base, par l'adresse où ce test est connecté (mot de
-- passe local par défaut de Supabase : dblink exige un mot de passe).
select extensions.dblink_connect(
  'autre',
  format(
    'host=%s port=%s dbname=%s user=postgres password=postgres',
    host(inet_server_addr()), inet_server_port(), current_database()
  )
);
select extensions.dblink_exec('autre', 'set statement_timeout = ''10s''');

-- X : inséré par la seconde session ; Y : mis à la corbeille par la seconde session.
create function pg_temp.fixture(which text)
returns uuid
language sql
immutable
as $$
  select case which
    when 'x' then '10000000-0000-4000-8000-00000000c0c1'::uuid
    when 'y' then '10000000-0000-4000-8000-00000000c0c2'::uuid
    when 'contenu' then '20000000-0000-4000-8000-00000000c0c3'::uuid
  end
$$;
grant execute on function pg_temp.fixture(text) to public;

-- Nettoyage (début et fin) : dans la seconde session, validé.
create function pg_temp.clean_fixtures()
returns void
language sql
as $$
  select extensions.dblink_exec('autre', format(
    'delete from public.contents where id = %L', pg_temp.fixture('contenu')
  ));
  select extensions.dblink_exec('autre', format(
    'delete from public.media where id in (%L, %L)', pg_temp.fixture('x'), pg_temp.fixture('y')
  ));
$$;
select pg_temp.clean_fixtures();

select extensions.dblink_exec('autre', format(
  $$insert into public.media (id, kind, name, path, mime, size_bytes, status) values
    (%1$L, 'image', 'x.webp', %1$L || '/x.webp', 'image/webp', 1000, 'ready'),
    (%2$L, 'image', 'y.webp', %2$L || '/y.webp', 'image/webp', 1000, 'ready')$$,
  pg_temp.fixture('x'), pg_temp.fixture('y')
));
select is(
  (select count(*)::int from public.media where id in (pg_temp.fixture('x'), pg_temp.fixture('y'))), 2,
  'les deux fichiers de la seconde session sont visibles ici'
);

-- Un brouillon (dans CE test) pour insérer Y.
select pg_temp.as_person('editor');
create temporary table art as
  select (public.content_create(kind => 'article', title => 'Ici')).id;
grant select on art to public;
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- 1. La seconde session insère X dans un brouillon ; ici, on met X à la corbeille en même temps
-- ---------------------------------------------------------------------------------------------

select extensions.dblink_exec('autre', 'begin');
select extensions.dblink_exec('autre', format(
  $$insert into public.contents (id, kind, draft) values (%L, 'article', %L::jsonb)$$,
  pg_temp.fixture('contenu'),
  jsonb_build_object('v', 1, 'title', 'Là-bas', 'blocks', jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-00000000c0c4', 'type', 'image', 'mediaId', pg_temp.fixture('x'),
    'caption', null, 'alt', null
  )))
));

select pg_temp.as_person('editor');
set local lock_timeout = '300ms';
select throws_ok(
  format('select public.media_trash(%L)', pg_temp.fixture('x')), '55P03', null,
  'media_trash attend la fin de l''insertion (verrou for share du brouillon)'
);
select pg_temp.as_postgres();
select extensions.dblink_exec('autre', 'commit');

select pg_temp.as_person('editor');
select throws_ok(
  format('select public.media_trash(%L)', pg_temp.fixture('x')), 'P0001', 'fichier_utilise',
  'une fois l''insertion validée, la mise à la corbeille est refusée : une seule réussit'
);
select pg_temp.as_postgres();
select ok(
  (select deleted_at is null from public.media where id = pg_temp.fixture('x')),
  'X n''est pas dans la corbeille'
);

-- ---------------------------------------------------------------------------------------------
-- 2. La seconde session met Y à la corbeille ; ici, on insère Y en même temps
-- ---------------------------------------------------------------------------------------------

select extensions.dblink_exec('autre', 'begin');
select * from extensions.dblink('autre', format(
  'select 1 from public.media where id = %L for update', pg_temp.fixture('y')
)) as locked (one integer);
select extensions.dblink_exec('autre', format(
  'update public.media set deleted_at = now() where id = %L', pg_temp.fixture('y')
));

select pg_temp.as_person('editor');
select throws_ok(
  format(
    'select public.save_draft(%L, 1, %L::jsonb)',
    (select id from art),
    jsonb_build_object('v', 1, 'title', 'Ici', 'blocks', jsonb_build_array(
      jsonb_build_object('id', '00000000-0000-4000-8000-00000000c0c5', 'type', 'image',
        'mediaId', pg_temp.fixture('y'), 'caption', null, 'alt', null)
    ))
  ),
  '55P03', null,
  'le brouillon attend la fin de la mise à la corbeille (verrou for update de media_trash)'
);
select pg_temp.as_postgres();
select extensions.dblink_exec('autre', 'commit');

select pg_temp.as_person('editor');
select throws_ok(
  format(
    'select public.save_draft(%L, 1, %L::jsonb)',
    (select id from art),
    jsonb_build_object('v', 1, 'title', 'Ici', 'blocks', jsonb_build_array(
      jsonb_build_object('id', '00000000-0000-4000-8000-00000000c0c5', 'type', 'image',
        'mediaId', pg_temp.fixture('y'), 'caption', null, 'alt', null)
    ))
  ),
  'P0001', 'fichier_indisponible',
  'une fois la mise à la corbeille validée, l''insertion est refusée : une seule réussit'
);
set local lock_timeout = 0;
select pg_temp.as_postgres();
select is(
  (select draft_rev from public.contents where id = (select id from art)), 1,
  'le brouillon n''a pas changé'
);

-- Nettoyage de ce que la seconde session a validé.
select pg_temp.clean_fixtures();
select is(
  (select count(*)::int from public.media where id in (pg_temp.fixture('x'), pg_temp.fixture('y'))), 0,
  'nettoyage : les fichiers de la seconde session sont effacés'
);
select extensions.dblink_disconnect('autre');

select * from finish();
rollback;

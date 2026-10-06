-- L'ancien système des méthodes retiré de la base (06/10/2026 ; docs/ADMINISTRATION.md, § 1,
-- « Méthodes, refaites en écrans ») : plus de méthode, de chapitre, de leçon ni d'exercice ;
-- plus de parent, de place, de « Montrer dans l'app », de « Leçon gratuite », de plan figé ni de
-- révision de toute la méthode ; plus de fonctions des méthodes. Les points de départ d'un
-- chapitre, d'une leçon ou d'un exercice restent (pour les méthodes refaites).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(25);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- ---------------------------------------------------------------------------------------------
-- Les sortes retirées
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select throws_ok(
  $$select public.content_create('method')$$, 'P0001', 'sorte_invalide',
  'une méthode ne se crée plus'
);
select throws_ok(
  $$select public.content_create('chapter')$$, 'P0001', 'sorte_invalide',
  'un chapitre non plus'
);
select throws_ok(
  $$select public.content_create('lesson')$$, 'P0001', 'sorte_invalide',
  'une leçon non plus'
);
select throws_ok(
  $$select public.content_create('exercise')$$, 'P0001', 'sorte_invalide',
  'un exercice non plus'
);

-- Le point de départ d'une leçon reste, pour les méthodes refaites.
select lives_ok(
  $$insert into ids (name, id)
    select 'depart_lecon', (public.content_create(
      kind => 'template', title => 'Leçon type', template_sort => 'starter', template_for => 'lesson'
    )).id$$,
  'un point de départ des leçons se crée encore'
);
select is(
  (select template_for from public.contents where id = pg_temp.cid('depart_lecon')), 'lesson',
  'il garde sa section : lesson'
);

-- ---------------------------------------------------------------------------------------------
-- Les colonnes retirées
-- ---------------------------------------------------------------------------------------------

select hasnt_column('public', 'contents', 'parent_id', 'contents : plus de parent');
select hasnt_column('public', 'contents', 'position', 'contents : plus de place dans un parent');
select hasnt_column('public', 'contents', 'in_app', 'contents : plus de « Montrer dans l''app »');
select hasnt_column('public', 'contents', 'is_free', 'contents : plus de « Leçon gratuite »');
select hasnt_column('public', 'versions', 'is_free', 'versions : plus de « Leçon gratuite »');
select hasnt_column('public', 'versions', 'outline', 'versions : plus de plan figé');
select hasnt_column('public', 'edit_locks', 'method_rev', 'edit_locks : plus de révision de la méthode');
select hasnt_column('public', 'trash_items', 'parent_title', 'la Corbeille : plus de titre du parent');

-- ---------------------------------------------------------------------------------------------
-- Les fonctions retirées
-- ---------------------------------------------------------------------------------------------

select hasnt_function('public', 'app_method', 'app_method n''existe plus');
select hasnt_function('public', 'publish_preview', 'publish_preview n''existe plus');
select hasnt_function('public', 'outline_reorder', 'outline_reorder n''existe plus');
select hasnt_function('private', 'method_of', 'private.method_of n''existe plus');
select hasnt_function('private', 'lock_scope', 'private.lock_scope n''existe plus');
select hasnt_function('private', 'publish_scope', 'private.publish_scope n''existe plus');
select hasnt_function(
  'public', 'content_create', array['text', 'uuid', 'text', 'text', 'uuid', 'text'],
  'content_create n''a plus de parent_id (une seule signature pour PostgREST)'
);

-- ---------------------------------------------------------------------------------------------
-- Les réglages retirés, et l'origine « outline » d'une version
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.create_content('article', 'article', 'Café')$$, 'un article'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"in_app": true}')$$,
  'P0001', 'reglages_invalides', 'save_draft : « Montrer dans l''app » est refusé'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"is_free": true}')$$,
  'P0001', 'reglages_invalides', 'save_draft : « Leçon gratuite » est refusé'
);

select pg_temp.as_postgres();
select throws_ok(
  $$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev)
    values (pg_temp.cid('article'), 1, 'outline', '{}', repeat('0', 64), 1)$$,
  '23514', 'new row for relation "versions" violates check constraint "versions_origin_check"',
  'une version n''a plus l''origine « outline »'
);

select * from finish();
rollback;

-- Sections (étape 7, partie 7a) : droits par fonction pour les cinq profils (§ 6.0, point 9) et
-- la clé secrète. categories_reorder : équipe en aal2 seulement ; app_feed et app_categories :
-- lectures de l'app, pour tout le monde (anon compris), qui ne donnent que ce qui est en ligne.
-- Accueil : lecture directe de contents sous RLS (mes brouillons récents, programmations à venir
-- ou en attente, échecs), réservée à l'équipe en aal2.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(45);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

insert into public.categories (id, section, name) values
  ('30000000-0000-4000-8000-000000000003', 'podcasts', 'Musique');
insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), pg_temp.lid('complet'), 'test');

-- Un article gratuit en ligne (Sommeil), un article réservé en ligne (Complet), un brouillon
-- jamais publié, un article programmé, un article dont la programmation a échoué, un article
-- dans la corbeille ; editor2 écrit un autre brouillon.
select pg_temp.as_person('editor');
select pg_temp.create_content('libre', 'article', content_title => 'Libre');
select pg_temp.save('libre', pg_temp.draft('[]', 'Libre', pg_temp.cover()),
  jsonb_build_object('access_level_id', null, 'category_ids', jsonb_build_array(pg_temp.catid('sommeil'))));
select pg_temp.publish('libre');
select pg_temp.create_content('reserve', 'article', content_title => 'Réservé');
select pg_temp.save('reserve', pg_temp.draft('[]', 'Réservé', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('complet')));
select pg_temp.publish('reserve');
select pg_temp.create_content('brouillon', 'article', content_title => 'Brouillon');
select pg_temp.create_content('prog', 'article', content_title => 'Programmé');
select pg_temp.save('prog', pg_temp.draft('[]', 'Programmé', pg_temp.cover()), '{"access_level_id": null}');
select public.schedule(pg_temp.cid('prog'), now() + interval '1 day');
select pg_temp.create_content('echec', 'article', content_title => 'Échoué');
select pg_temp.create_content('jete', 'article', content_title => 'Jeté');
select public.trash(pg_temp.cid('jete'));
select pg_temp.as_person('editor2');
select pg_temp.create_content('autre', 'page', content_title => 'Autre');
select pg_temp.as_postgres();
update public.contents
set schedule_error = 'fichier_indisponible', scheduled_by = pg_temp.person_id('editor')
where id = pg_temp.cid('echec');
update public.edit_locks set holder_id = null, holder_session = null, taken_at = null;

-- Les trois listes de l'Accueil, telles que l'admin les lit (titres triés).
create function pg_temp.home(list text)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(c.title order by c.title), '{}')
  from public.contents c
  where c.deleted_at is null
    and case list
      when 'mine' then c.draft_saved_by = (select auth.uid())
      when 'scheduled' then c.scheduled_at is not null
      when 'failed' then c.scheduled_at is null and c.schedule_error is not null
    end
$$;

-- Titres et verrou des éléments de la liste du Blog.
create function pg_temp.blog()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg((x ->> 'title') || ':' || (x ->> 'locked') order by x ->> 'title'), '{}')
  from jsonb_array_elements(public.app_feed('blog') -> 'items') x
$$;

grant execute on function pg_temp.home(text), pg_temp.blog() to public;

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'categories_reorder', array['text', 'uuid[]'], 'anon', array[]::text[],
  'anon : ne peut pas appeler categories_reorder'
);
select function_privs_are(
  'public', 'categories_reorder', array['text', 'uuid[]'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler categories_reorder'
);
select function_privs_are(
  'public', 'app_feed', array['text', 'uuid', 'text', 'integer'], 'anon', array['EXECUTE'],
  'anon : peut appeler app_feed'
);
select function_privs_are(
  'public', 'app_feed', array['text', 'uuid', 'text', 'integer'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler app_feed'
);
select function_privs_are(
  'public', 'app_categories', array['text'], 'anon', array['EXECUTE'],
  'anon : peut appeler app_categories'
);
select function_privs_are(
  'public', 'app_categories', array['text'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler app_categories'
);
select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('categories_reorder', 'app_feed', 'app_categories')),
  3,
  'une seule signature par RPC (PostgREST choisit sans ambiguïté)'
);
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('categories_reorder', 'app_feed', 'app_categories')
      and not (p.prosecdef and 'search_path=""' = any (p.proconfig))
  ),
  array[]::text[],
  'security definer et search_path vide'
);
select is(
  (select provolatile::text from pg_proc where oid = 'public.app_feed(text,uuid,text,integer)'::regprocedure),
  's',
  'app_feed ne modifie rien (stable)'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  '42501', null, 'anonyme : categories_reorder refusé'
);
select is(pg_temp.blog(), array['Libre:false', 'Réservé:true'], 'anonyme : la liste du Blog, le réservé verrouillé');
select is(
  (select array_agg(name order by name) from public.app_categories('blog')), array['Cuisine', 'Sommeil'],
  'anonyme : les catégories du Blog'
);
select is(
  (select array_agg(name) from public.app_categories('podcasts')), array['Musique'],
  'anonyme : les catégories des Podcasts'
);
select throws_ok(
  $$select pg_temp.home('mine')$$, '42501', null, 'anonyme : l''Accueil ne se lit pas (contents)'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : categories_reorder refusé'
);
select is(pg_temp.blog(), array['Libre:false', 'Réservé:true'], 'éditeur aal1 : lit l''app comme un anonyme');
select is(
  (select count(*)::int from public.app_categories('blog')), 2, 'éditeur aal1 : app_categories'
);
select is(pg_temp.home('mine'), '{}'::text[], 'éditeur aal1 : aucun brouillon à l''Accueil');
select is(pg_temp.home('scheduled'), '{}'::text[], 'éditeur aal1 : aucune programmation');
select is(pg_temp.home('failed'), '{}'::text[], 'éditeur aal1 : aucun échec');

-- ---------------------------------------------------------------------------------------------
-- Lecteur (compte sans fiche d'équipe, formule « Complet »)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('reader');
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  '42501', 'reserve_a_l_equipe', 'lecteur : categories_reorder refusé'
);
select is(pg_temp.blog(), array['Libre:false', 'Réservé:false'], 'lecteur « Complet » : le réservé est ouvert');
select is(
  (select count(*)::int from public.app_categories('blog')), 2, 'lecteur : app_categories'
);
select is(pg_temp.home('mine'), '{}'::text[], 'lecteur : aucun brouillon à l''Accueil');
select is(pg_temp.home('scheduled'), '{}'::text[], 'lecteur : aucune programmation');
select is(pg_temp.home('failed'), '{}'::text[], 'lecteur : aucun échec');
select is(
  (select count(*)::int from public.categories), 0, 'lecteur : ne lit pas la table des catégories'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select results_eq(
  format('select name, position from public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  $$values ('Cuisine'::text, 0), ('Sommeil'::text, 1)$$,
  'éditeur aal2 : categories_reorder permis'
);
select is(
  pg_temp.home('mine'), array['Brouillon', 'Échoué', 'Libre', 'Programmé', 'Réservé'],
  'éditeur aal2 : ses brouillons (ni ceux d''editor2, ni la corbeille)'
);
select is(pg_temp.home('scheduled'), array['Programmé'], 'éditeur aal2 : les programmations de l''équipe');
select is(pg_temp.home('failed'), array['Échoué'], 'éditeur aal2 : les programmations échouées');
select is(
  (select p.email from public.contents c join public.profiles p on p.id = c.scheduled_by
    where c.id = pg_temp.cid('prog')),
  'editeur@tests.local',
  'éditeur aal2 : qui a programmé (profiles, par scheduled_by)'
);
select is(pg_temp.blog(), array['Libre:false', 'Réservé:true'], 'éditeur aal2 : l''app le traite comme un anonyme');

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select results_eq(
  format('select name from public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('sommeil'), pg_temp.catid('cuisine')),
  $$values ('Sommeil'::text), ('Cuisine'::text)$$,
  'admin : categories_reorder permis'
);
select is(pg_temp.home('mine'), '{}'::text[], 'admin : aucun brouillon à lui');
select is(pg_temp.home('scheduled'), array['Programmé'], 'admin : les programmations de l''équipe');
select is(pg_temp.home('failed'), array['Échoué'], 'admin : les programmations échouées');

select pg_temp.as_person('editor2');
select is(pg_temp.home('mine'), array['Autre'], 'editor2 : seulement son brouillon');

-- ---------------------------------------------------------------------------------------------
-- Clé secrète : le rangement n'est pas un geste de la fonction Edge
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  '42501', 'reserve_a_l_equipe', 'service_role : categories_reorder refusé'
);
select is(
  (select jsonb_array_length(public.app_feed('blog') -> 'items')), 2, 'service_role : app_feed'
);

-- ---------------------------------------------------------------------------------------------
-- Ce que l'app ne voit jamais (brouillon, corbeille), quel que soit le profil
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select is(
  (select count(*)::int from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid in (pg_temp.cid('brouillon'), pg_temp.cid('prog'), pg_temp.cid('jete'))),
  0,
  'anonyme : ni brouillon, ni programmé pas encore publié, ni corbeille'
);
select pg_temp.as_person('reader');
select is(
  (select count(*)::int from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid in (pg_temp.cid('brouillon'), pg_temp.cid('prog'), pg_temp.cid('jete'))),
  0,
  'lecteur : ni brouillon, ni programmé pas encore publié, ni corbeille'
);
select pg_temp.as_person('editor');
select is(
  (select count(*)::int from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid in (pg_temp.cid('brouillon'), pg_temp.cid('prog'), pg_temp.cid('jete'))),
  0,
  'équipe : l''app ne lui montre pas non plus les brouillons'
);

-- Les deux lectures de l'app refusent une section inconnue, pour tout le monde.
select pg_temp.as_anon();
select throws_ok(
  $$select public.app_feed('pages')$$, 'P0001', 'demande_invalide', 'anonyme : section inconnue (app_feed)'
);
select throws_ok(
  $$select * from public.app_categories('pages')$$, 'P0001', 'demande_invalide',
  'anonyme : section inconnue (app_categories)'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

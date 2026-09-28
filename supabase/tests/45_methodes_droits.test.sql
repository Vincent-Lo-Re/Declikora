-- Méthodes (étape 7, partie 7b) : droits par fonction pour les cinq profils (§ 6.0, point 9) et
-- la clé secrète. publish_preview et outline_reorder : équipe en aal2 seulement ; publish,
-- schedule, unpublish et trash d'une méthode, d'un chapitre ou d'une leçon : équipe en aal2
-- seulement ; app_method : lecture de l'app, pour tout le monde (anon compris), qui ne donne que
-- ce qui est en ligne ; app_content d'une leçon ou d'une introduction : selon son niveau réel.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(58);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), pg_temp.lid('complet'), 'test');

-- Une méthode « Complet » en ligne : un chapitre, une leçon gratuite, une leçon réservée ; une
-- méthode jamais publiée.
select pg_temp.as_person('editor');
select pg_temp.create_content('m', 'method', content_title => 'Respirer');
select pg_temp.save('m', pg_temp.draft('[]', 'Respirer', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('complet')));
select pg_temp.create_content('c', 'chapter', 'm', 'Bases');
select pg_temp.save('c', pg_temp.draft('[]', 'Bases'), '{"in_app": true}');
select pg_temp.create_content('libre', 'lesson', 'c', 'Libre');
select pg_temp.save('libre', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000002a1', 'Ouvert')), 'Libre'), '{"in_app": true, "is_free": true}');
select pg_temp.create_content('reservee', 'lesson', 'c', 'Réservée');
select pg_temp.save('reservee', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000002b1', 'Fermé')), 'Réservée'), '{"in_app": true}');
select pg_temp.publish('m');
select pg_temp.create_content('brouillon', 'method', content_title => 'Brouillon');
select pg_temp.as_postgres();
update public.edit_locks set holder_id = null, holder_session = null, taken_at = null;

-- Le plan de la méthode, tel que outline_reorder l'attend.
create function pg_temp.outline()
returns jsonb
language sql
stable
as $$
  select jsonb_build_array(jsonb_build_object(
    'chapterId', pg_temp.cid('c'),
    'lessonIds', jsonb_build_array(pg_temp.cid('reservee'), pg_temp.cid('libre'))
  ))
$$;

-- Les leçons de la méthode vues par l'app : « titre:verrouillée ».
create function pg_temp.app_lessons()
returns text[]
language sql
stable
as $$
  select coalesce(array_agg((le ->> 'title') || ':' || (le ->> 'locked') order by n), '{}')
  from jsonb_array_elements(public.app_method(pg_temp.cid('m')) #> '{chapters,0,lessons}')
    with ordinality l (le, n)
$$;

grant execute on function pg_temp.outline(), pg_temp.app_lessons() to public;

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'publish_preview', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler publish_preview'
);
select function_privs_are(
  'public', 'publish_preview', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler publish_preview'
);
select function_privs_are(
  'public', 'outline_reorder', array['uuid', 'jsonb', 'uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler outline_reorder'
);
select function_privs_are(
  'public', 'outline_reorder', array['uuid', 'jsonb', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler outline_reorder'
);
select function_privs_are(
  'public', 'app_method', array['uuid'], 'anon', array['EXECUTE'], 'anon : peut appeler app_method'
);
select function_privs_are(
  'public', 'app_method', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler app_method'
);
select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('publish_preview', 'outline_reorder', 'app_method')),
  3,
  'une seule signature par RPC (PostgREST choisit sans ambiguïté)'
);
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('publish_preview', 'outline_reorder', 'app_method')
      and not (p.prosecdef and 'search_path=""' = any (p.proconfig))
  ),
  array[]::text[],
  'security definer et search_path vide'
);
select is(
  (select provolatile::text from pg_proc where oid = 'public.app_method(uuid)'::regprocedure),
  's',
  'app_method ne modifie rien (stable)'
);
select is(
  (select array_agg(tgname::text order by tgname) from pg_trigger
    where tgrelid = 'public.versions'::regclass and not tgisinternal),
  array['versions_immutable', 'versions_no_truncate', 'versions_outline'],
  'versions : le plan est vérifié à l''insertion (et une version reste immuable)'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok(
  format('select * from public.publish_preview(%L)', pg_temp.cid('m')), '42501', null,
  'anonyme : publish_preview refusé'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  '42501', null, 'anonyme : outline_reorder refusé'
);
select throws_ok(
  format('select public.unpublish(%L)', pg_temp.cid('libre')), '42501', null,
  'anonyme : retirer une leçon refusé'
);
select is(pg_temp.app_lessons(), array['Libre:false', 'Réservée:true'], 'anonyme : la leçon gratuite seule est ouverte');
select is(
  array[public.app_content(pg_temp.cid('libre')) -> 'locked', public.app_content(pg_temp.cid('reservee')) -> 'locked'],
  array['false'::jsonb, 'true'::jsonb],
  'anonyme : app_content d''une leçon selon son niveau réel'
);
select is(
  public.app_content(pg_temp.cid('c')) -> 'locked', 'false'::jsonb,
  'anonyme : l''introduction du chapitre est ouverte ([D43])'
);
select ok(public.app_method(pg_temp.cid('brouillon')) is null, 'anonyme : une méthode jamais publiée n''existe pas');

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  format('select * from public.publish_preview(%L)', pg_temp.cid('m')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : publish_preview refusé'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : outline_reorder refusé'
);
select throws_ok(
  format('select * from public.publish(%L, 1)', pg_temp.cid('brouillon')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : publier une méthode refusé'
);
select throws_ok(
  format('select public.schedule(%L, now() + interval ''1 day'')', pg_temp.cid('m')), '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : programmer une méthode refusé'
);
select throws_ok(
  format('select public.unpublish(%L)', pg_temp.cid('libre')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : retirer une leçon refusé'
);
select throws_ok(
  format('select * from public.trash(%L)', pg_temp.cid('libre')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : mettre une leçon à la corbeille refusé'
);
select is(pg_temp.app_lessons(), array['Libre:false', 'Réservée:true'], 'éditeur aal1 : lit l''app comme un anonyme');
select is((select count(*)::int from public.contents), 0, 'éditeur aal1 : ne lit pas les contenus');

-- ---------------------------------------------------------------------------------------------
-- Lecteur (compte sans fiche d'équipe, formule « Complet »)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('reader');
select throws_ok(
  format('select * from public.publish_preview(%L)', pg_temp.cid('m')), '42501', 'reserve_a_l_equipe',
  'lecteur : publish_preview refusé'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  '42501', 'reserve_a_l_equipe', 'lecteur : outline_reorder refusé'
);
select throws_ok(
  format('select public.unpublish(%L)', pg_temp.cid('libre')), '42501', 'reserve_a_l_equipe',
  'lecteur : retirer une leçon refusé'
);
select throws_ok(
  format('select * from public.trash(%L)', pg_temp.cid('libre')), '42501', 'reserve_a_l_equipe',
  'lecteur : mettre une leçon à la corbeille refusé'
);
select is(pg_temp.app_lessons(), array['Libre:false', 'Réservée:false'], 'lecteur « Complet » : tout est ouvert');
select is(
  public.app_content(pg_temp.cid('reservee')) #>> '{blocks,0,doc,content,0,content,0,text}', 'Fermé',
  'lecteur « Complet » : les blocs de la leçon réservée'
);
select is(public.app_method(pg_temp.cid('m')) -> 'locked', 'false'::jsonb, 'lecteur « Complet » : la méthode est ouverte');
select is((select count(*)::int from public.versions), 0, 'lecteur : ne lit pas les versions');

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select count(*)::int from public.publish_preview(pg_temp.cid('m'))), 0,
  'éditeur aal2 : publish_preview permis (rien à publier)'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  'P0001', 'verrou_perdu', 'éditeur aal2 : outline_reorder demande le verrou de la méthode'
);
select lives_ok($$select public.lock_take(pg_temp.cid('m'))$$, 'éditeur aal2 : prend la main sur la méthode');
select is(
  (select array_agg(position order by position) from public.outline_reorder(pg_temp.cid('m'), pg_temp.outline())
    where kind = 'lesson'),
  array[1, 2],
  'éditeur aal2 : outline_reorder permis'
);
select results_eq(
  format('select element_id, change from public.publish_preview(%L)', pg_temp.cid('m')),
  format('values (%L::uuid, %L::text)', pg_temp.cid('m'), 'reordered'),
  'éditeur aal2 : publish_preview voit le nouveau rangement'
);
select lives_ok(
  format('select public.publish(%L, %s)', pg_temp.cid('m'), pg_temp.rev('m')), 'éditeur aal2 : publier la méthode'
);
select lives_ok(
  format('select public.unpublish(%L)', pg_temp.cid('reservee')), 'éditeur aal2 : retirer une leçon'
);
select is(pg_temp.app_lessons(), array['Libre:false'], 'la leçon retirée n''est plus dans l''app');

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select is(
  (select count(*)::int from public.publish_preview(pg_temp.cid('m'))), 0, 'admin : publish_preview permis'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  'P0001', 'verrou_perdu', 'admin : l''éditeur tient la méthode, admin doit prendre la main'
);
select lives_ok(
  format('select * from public.trash(%L)', pg_temp.cid('reservee')), 'admin : mettre une leçon à la corbeille'
);
select lives_ok(
  format('select * from public.restore(%L)', pg_temp.cid('reservee')), 'admin : la restaurer'
);
select lives_ok(
  format('select public.schedule(%L, now() + interval ''1 day'')', pg_temp.cid('m')),
  'admin : programmer la méthode'
);

-- ---------------------------------------------------------------------------------------------
-- Clé secrète : ni aperçu, ni rangement ; l'app se lit
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  format('select * from public.publish_preview(%L)', pg_temp.cid('m')), '42501', 'reserve_a_l_equipe',
  'service_role : publish_preview refusé'
);
select throws_ok(
  format('select * from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), pg_temp.outline()),
  '42501', 'reserve_a_l_equipe', 'service_role : outline_reorder refusé'
);
select is(pg_temp.app_lessons(), array['Libre:false'], 'service_role : app_method (aucune formule : réservé verrouillé)');

-- ---------------------------------------------------------------------------------------------
-- Ce que l'app ne voit jamais (brouillon, élément décoché, corbeille), quel que soit le profil
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('neuve', 'lesson', 'c', 'Neuve');
select pg_temp.save('neuve', pg_temp.draft('[]', 'Neuve'));
select pg_temp.as_anon();
select ok(public.app_content(pg_temp.cid('neuve')) is null, 'anonyme : une leçon neuve n''existe pas');
select ok(public.app_content(pg_temp.cid('reservee')) is null, 'anonyme : une leçon retirée n''existe pas');
select pg_temp.as_person('reader');
select ok(public.app_content(pg_temp.cid('neuve')) is null, 'lecteur : une leçon neuve n''existe pas');
select is(pg_temp.app_lessons(), array['Libre:false'], 'lecteur : seulement le plan en ligne');
select pg_temp.as_person('editor');
select ok(public.app_content(pg_temp.cid('neuve')) is null, 'équipe : l''app ne lui montre pas non plus les brouillons');
select pg_temp.as_person('editor', 'aal1');
select ok(public.app_method(pg_temp.cid('brouillon')) is null, 'éditeur aal1 : pas de méthode en brouillon');

-- Les fonctions internes ne sont pas appelables par l'API.
select pg_temp.as_postgres();
select ok(
  not has_function_privilege('anon', 'private.do_publish_method(public.contents,uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'private.remove_from_live_outline(uuid,uuid[],uuid)', 'execute')
    and not has_function_privilege('authenticated', 'private.replace_in_live_outline(uuid,jsonb,uuid,text)', 'execute')
    and not has_function_privilege('authenticated', 'private.element_version(public.contents,uuid,text,uuid)', 'execute')
    and not has_function_privilege('authenticated', 'private.insert_version(public.versions,text,uuid,jsonb)', 'execute')
    and not has_function_privilege('anon', 'private.chapter_intro_level(uuid,jsonb)', 'execute'),
  'private : les fonctions internes des méthodes ne sont pas exécutables par anon ni authenticated'
);
select ok(
  not has_table_privilege('anon', 'private.live', 'select')
    and not has_table_privilege('authenticated', 'private.live', 'select'),
  'private.live reste inaccessible à anon et authenticated'
);
select is(
  (select count(*)::int from private.live where method_id = pg_temp.cid('m')), 2,
  'private.live : le chapitre et la leçon en ligne'
);

select * from finish();
rollback;

-- Modèles de blocs (étape 6) : droits par fonction pour les cinq profils (§ 6.0, point 9) et la
-- clé secrète. content_create (avec template_for), template_create_from, template_outdated,
-- template_push et template_detach_all : équipe en aal2 seulement (éditeur et admin).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(57);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Deux blocs identiques partout (« Contact », « Horaires »), une page en ligne qui les utilise,
-- puis « Contact » corrigé : la page est à mettre à jour.
select pg_temp.as_person('editor');
select pg_temp.create_content('contact', 'template', content_title => 'Contact', sort => 'shared');
select pg_temp.save('contact', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001a1', 'Écris-nous')), 'Contact'
));
select pg_temp.create_content('horaires', 'template', content_title => 'Horaires', sort => 'shared');
select pg_temp.save('horaires', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001a2', 'De 9 h à 18 h')), 'Horaires'
));
select pg_temp.create_content('page', 'page', content_title => 'Aide');
select pg_temp.save(
  'page',
  pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-0000000001b1', 'type', 'linked', 'templateId', pg_temp.cid('contact')),
    jsonb_build_object('id', '00000000-0000-4000-8000-0000000001b2', 'type', 'linked', 'templateId', pg_temp.cid('horaires'))
  ), 'Aide'),
  '{"slug": "aide", "access_level_id": null}'
);
select pg_temp.publish('page');
select pg_temp.save('contact', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001a1', 'Écris-nous vite')), 'Contact'
));
select pg_temp.as_postgres();
-- Personne n'écrit plus ces brouillons (le verrou de la création est rendu).
update public.edit_locks set holder_id = null, holder_session = null, taken_at = null;

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'content_create', array['text', 'uuid', 'text', 'text', 'uuid', 'text'], 'anon',
  array[]::text[], 'anon : ne peut pas appeler content_create'
);
select function_privs_are(
  'public', 'content_create', array['text', 'uuid', 'text', 'text', 'uuid', 'text'], 'authenticated',
  array['EXECUTE'], 'authenticated : peut appeler content_create'
);
select function_privs_are(
  'public', 'template_create_from', array['uuid', 'uuid[]', 'text', 'text', 'text'], 'anon',
  array[]::text[], 'anon : ne peut pas appeler template_create_from'
);
select function_privs_are(
  'public', 'template_create_from', array['uuid', 'uuid[]', 'text', 'text', 'text'], 'authenticated',
  array['EXECUTE'], 'authenticated : peut appeler template_create_from'
);
select function_privs_are(
  'public', 'template_outdated', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler template_outdated'
);
select function_privs_are(
  'public', 'template_outdated', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler template_outdated'
);
select function_privs_are(
  'public', 'template_push', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler template_push'
);
select function_privs_are(
  'public', 'template_push', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler template_push'
);
select function_privs_are(
  'public', 'template_detach_all', array['uuid'], 'anon', array[]::text[],
  'anon : ne peut pas appeler template_detach_all'
);
select function_privs_are(
  'public', 'template_detach_all', array['uuid'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler template_detach_all'
);
select is(
  (select count(*)::int from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('content_create', 'template_create_from', 'template_outdated', 'template_push',
        'template_detach_all')),
  5,
  'une seule signature par RPC (PostgREST choisit sans ambiguïté)'
);
select is(
  array(
    select p.oid::regprocedure::text
    from pg_proc p
    where p.pronamespace = 'private'::regnamespace
      and p.proname in ('leaf_for_comparison', 'block_for_comparison', 'template_copy',
        'detached_copy', 'resolve_alt_frozen', 'resolve_alts_frozen', 'template_stale_live',
        'contents_check_kind', 'contents_check_draft', 'body_to_draft')
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  ),
  array[]::text[],
  'fonctions internes de l''étape 6 : ni anon ni authenticated'
);

-- ---------------------------------------------------------------------------------------------
-- Anonyme
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select throws_ok(
  $$select public.content_create('template', template_sort => 'starter', template_for => 'page')$$,
  '42501', null, 'anonyme : content_create refusé'
);
select throws_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Copie', 'style'),
  '42501', null, 'anonyme : template_create_from refusé'
);
select throws_ok(
  format('select public.template_outdated(%L)', pg_temp.cid('contact')), '42501', null,
  'anonyme : template_outdated refusé'
);
select throws_ok(
  format('select public.template_push(%L)', pg_temp.cid('contact')), '42501', null,
  'anonyme : template_push refusé'
);
select throws_ok(
  format('select public.template_detach_all(%L)', pg_temp.cid('horaires')), '42501', null,
  'anonyme : template_detach_all refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  $$select public.content_create('template', template_sort => 'starter', template_for => 'page')$$,
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : content_create refusé'
);
select throws_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Copie', 'style'),
  '42501', 'reserve_a_l_equipe', 'éditeur aal1 : template_create_from refusé'
);
select throws_ok(
  format('select public.template_outdated(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : template_outdated refusé'
);
select throws_ok(
  format('select public.template_push(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'éditeur aal1 : template_push refusé'
);
select throws_ok(
  format('select public.template_detach_all(%L)', pg_temp.cid('horaires')), '42501',
  'reserve_a_l_equipe', 'éditeur aal1 : template_detach_all refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Lecteur (compte sans fiche d'équipe)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('reader');
select throws_ok(
  $$select public.content_create('template', template_sort => 'starter', template_for => 'page')$$,
  '42501', 'reserve_a_l_equipe', 'lecteur : content_create refusé'
);
select throws_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Copie', 'style'),
  '42501', 'reserve_a_l_equipe', 'lecteur : template_create_from refusé'
);
select throws_ok(
  format('select public.template_outdated(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'lecteur : template_outdated refusé'
);
select throws_ok(
  format('select public.template_push(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'lecteur : template_push refusé'
);
select throws_ok(
  format('select public.template_detach_all(%L)', pg_temp.cid('horaires')), '42501',
  'reserve_a_l_equipe', 'lecteur : template_detach_all refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Clé secrète (fonction Edge) : ce ne sont pas des gestes de l'équipe
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_service();
select throws_ok(
  $$select public.content_create('template', template_sort => 'starter', template_for => 'page')$$,
  '42501', 'reserve_a_l_equipe', 'service_role : content_create refusé'
);
select throws_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Copie', 'style'),
  '42501', 'reserve_a_l_equipe', 'service_role : template_create_from refusé'
);
select throws_ok(
  format('select public.template_outdated(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'service_role : template_outdated refusé'
);
select throws_ok(
  format('select public.template_push(%L)', pg_temp.cid('contact')), '42501', 'reserve_a_l_equipe',
  'service_role : template_push refusé'
);
select throws_ok(
  format('select public.template_detach_all(%L)', pg_temp.cid('horaires')), '42501',
  'reserve_a_l_equipe', 'service_role : template_detach_all refusé'
);

-- Rien n'a changé : aucune version de plus, aucun modèle de plus, les blocs toujours liés.
select pg_temp.as_postgres();
select is(
  (select count(*)::int from public.versions where content_id = pg_temp.cid('page')), 1,
  'refus : aucune version écrite'
);
select is(
  (select count(*)::int from public.contents where kind = 'template'), 2,
  'refus : aucun modèle créé'
);
select is(
  (select array(select x from unnest(draft_template_ids) x order by x) from public.contents
    where id = pg_temp.cid('page')),
  array(select x from unnest(array[pg_temp.cid('contact'), pg_temp.cid('horaires')]) x order by x),
  'refus : les blocs sont toujours liés'
);

-- ---------------------------------------------------------------------------------------------
-- Éditeur (aal2) : tout est permis
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select array_agg(content_id) from public.template_outdated(pg_temp.cid('contact'))),
  array[pg_temp.cid('page')],
  'éditeur : template_outdated liste la page en ligne'
);
select is(
  (select count(*)::int from public.template_push(pg_temp.cid('contact'))), 1,
  'éditeur : template_push met la page à jour'
);
select is(
  (select origin from public.versions v join public.contents c on c.live_version_id = v.id
    where c.id = pg_temp.cid('page')),
  'template',
  'éditeur : la nouvelle version vient du modèle'
);
select lives_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Copie de contact', 'style'),
  'éditeur : template_create_from permis'
);
select lives_ok(
  $$select public.content_create('template', title => 'Interview', template_sort => 'starter', template_for => 'page')$$,
  'éditeur : un point de départ des pages se crée'
);
select lives_ok(
  format('select public.template_detach_all(%L)', pg_temp.cid('horaires')),
  'éditeur : template_detach_all permis'
);
select is(
  (select draft_template_ids from public.contents where id = pg_temp.cid('page')),
  array[pg_temp.cid('contact')],
  'éditeur : « Horaires » n''est plus cité par la page'
);

-- ---------------------------------------------------------------------------------------------
-- Admin (aal2) : tout est permis
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select mine from public.lock_take(pg_temp.cid('contact'));
select pg_temp.save('contact', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001a1', 'Écris-nous demain')), 'Contact'
));
select is(
  (select count(*)::int from public.template_outdated(pg_temp.cid('contact'))), 1,
  'admin : template_outdated permis'
);
select is(
  (select count(*)::int from public.template_push(pg_temp.cid('contact'))), 1,
  'admin : template_push permis'
);
select is(
  (select published_by from public.versions v join public.contents c on c.live_version_id = v.id
    where c.id = pg_temp.cid('page')),
  pg_temp.person_id('admin'),
  'admin : auteur de la nouvelle version'
);
select lives_ok(
  format('select public.template_create_from(%L, array[%L::uuid], %L, %L, %L)',
    pg_temp.cid('page'), '00000000-0000-4000-8000-0000000001b1', 'Départ', 'starter', 'article'),
  'admin : template_create_from d''un point de départ des articles'
);
select lives_ok(
  $$select public.content_create('template', title => 'Rappel', template_sort => 'shared')$$,
  'admin : un bloc identique partout se crée'
);
select pg_temp.as_postgres();
update public.edit_locks set holder_id = null, holder_session = null, taken_at = null;
select pg_temp.as_person('admin');
select is(
  (select count(*)::int from public.template_detach_all(pg_temp.cid('contact'))), 1,
  'admin : template_detach_all permis'
);
select is(
  (select draft_template_ids from public.contents where id = pg_temp.cid('page')),
  '{}'::uuid[],
  'admin : la page ne cite plus aucun modèle'
);
select lives_ok(
  format('select public.trash(%L)', pg_temp.cid('contact')),
  'admin : le modèle détaché partout va à la corbeille'
);

-- ---------------------------------------------------------------------------------------------
-- Lecture directe : colonne template_for (équipe seulement)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select array_agg(template_for order by template_for) from public.contents
    where kind = 'template' and template_sort = 'starter'),
  array['article', 'page'],
  'éditeur : lit la section des points de départ'
);
select pg_temp.as_person('editor', 'aal1');
select is(
  (select count(*)::int from public.contents), 0,
  'éditeur aal1 : ne lit aucun modèle'
);
select pg_temp.as_person('reader');
select is((select count(*)::int from public.contents), 0, 'lecteur : ne lit aucun modèle');
select pg_temp.as_anon();
select throws_ok('select template_for from public.contents', '42501', null, 'anonyme : contents illisible');

select pg_temp.as_postgres();
select column_privs_are(
  'public', 'contents', 'template_for', 'authenticated', array['SELECT'],
  'authenticated : template_for se lit seulement (aucune écriture directe)'
);
select column_privs_are(
  'public', 'contents', 'template_for', 'anon', array[]::text[],
  'anon : aucun droit sur template_for'
);
select throws_ok(
  $$update public.contents set template_for = 'article' where kind = 'template' and template_for = 'page'$$,
  'P0001', 'sorte_immuable', 'la section d''un point de départ ne change pas (même en postgres)'
);

select * from finish();
rollback;

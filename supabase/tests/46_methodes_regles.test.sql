-- Méthodes (étape 7, partie 7b) : règles. Parent de la bonne sorte ; [D41] et [D45] pour la
-- méthode ; plan figé (réordonner ne change rien avant la publication) ; élément neuf absent tant
-- que « Montrer dans l'app » n'est pas coché ; leçons inchangées réutilisées ; leçon dont le
-- modèle partagé ou le texte alternatif a changé : republiée ; template_push et media_push pour
-- une leçon (nouvelle version de la méthode) ; publish_preview (neufs, modifiés, rangés
-- autrement, retirés, problèmes) ; niveau réel des leçons et des introductions ([D43]) ;
-- app_method et app_content ; fichiers d'une leçon gratuite publics, d'une leçon réservée
-- protégés ; [D14] ; erreur qui nomme l'élément ; retrait d'une leçon ([D26]) ; corbeille d'une
-- leçon seule ([D36]) et restauration d'un lot en fin de liste ; programmation d'une méthode
-- pendant qu'on écrit une de ses leçons ([D31]) ; outline_reorder ; plan vérifié à l'insertion ;
-- points de départ des chapitres et des leçons ([D42]) ; « Revenir à cette version » ([D17]).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(142);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Le lecteur a la formule la moins complète ; la méthode sera « Complet ».
insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), pg_temp.lid('essentiel'), 'test');

-- ---------------------------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------------------------

create temporary table kept (label text primary key, id uuid);
grant all on kept to public;

create function pg_temp.keep(label text, id uuid)
returns uuid
language sql
as $$
  insert into kept (label, id) values (label, id)
  on conflict on constraint kept_pkey do update set id = excluded.id
  returning id
$$;

create function pg_temp.kept(wanted text)
returns uuid
language sql
stable
as $$
  select k.id from kept k where k.label = wanted
$$;

-- La version d'un chapitre ou d'une leçon citée par le plan en ligne (private.live), ou null.
create function pg_temp.cited(content_name text)
returns uuid
language sql
stable
security definer
as $$
  select l.version_id from private.live l where l.content_id = pg_temp.cid(content_name)
$$;

-- Nombre de versions d'un contenu.
create function pg_temp.versions_of(content_name text)
returns integer
language sql
stable
security definer
as $$
  select count(*)::int from public.versions v where v.content_id = pg_temp.cid(content_name)
$$;

-- Origine d'une version.
create function pg_temp.origin_of(version_id uuid)
returns text
language sql
stable
security definer
as $$
  select v.origin from public.versions v where v.id = version_id
$$;

-- Le plan tel que le lit l'app (app_method) : « Chapitre », puis « Chapitre/Leçon ».
create function pg_temp.app_plan(method_name text)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(t.label order by t.n), '{}')
  from (
    select ch ->> 'title' as label, c.cn * 100 as n
    from jsonb_array_elements(public.app_method(pg_temp.cid(method_name)) -> 'chapters')
      with ordinality c (ch, cn)
    union all
    select (ch ->> 'title') || '/' || (le ->> 'title'), c.cn * 100 + l.ln
    from jsonb_array_elements(public.app_method(pg_temp.cid(method_name)) -> 'chapters')
      with ordinality c (ch, cn)
    cross join lateral jsonb_array_elements(ch -> 'lessons') with ordinality l (le, ln)
  ) t
$$;

-- publish_preview en bref : « Titre:change » dans l'ordre.
create function pg_temp.preview(method_name text)
returns text[]
language sql
as $$
  select coalesce(array_agg(coalesce(p.title, '-') || ':' || p.change order by p.ordinality), '{}')
  from public.publish_preview(pg_temp.cid(method_name)) with ordinality p
$$;

-- Le texte du premier paragraphe du bloc n° n (à partir de 0) d'un contenu dans l'app.
create function pg_temp.app_text(content_name text, n integer)
returns text
language sql
stable
as $$
  select public.app_content(pg_temp.cid(content_name)) -> 'blocks' -> n #>> '{doc,content,0,content,0,text}'
$$;

-- Un bloc lié à un modèle.
create function pg_temp.linked_block(id text, template_name text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object('id', id, 'type', 'linked', 'templateId', pg_temp.cid(template_name))
$$;

-- Libère tous les verrous (personne n'écrit).
create function pg_temp.free_locks()
returns void
language sql
security definer
as $$
  update public.edit_locks set holder_id = null, holder_session = null, taken_at = null
$$;

grant execute on function
  pg_temp.keep(text, uuid),
  pg_temp.kept(text),
  pg_temp.cited(text),
  pg_temp.versions_of(text),
  pg_temp.origin_of(uuid),
  pg_temp.app_plan(text),
  pg_temp.preview(text),
  pg_temp.app_text(text, integer),
  pg_temp.linked_block(text, text),
  pg_temp.free_locks()
to public;

-- ---------------------------------------------------------------------------------------------
-- Une méthode, deux chapitres, trois leçons ; parent de la bonne sorte
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('tpl', 'template', content_title => 'Contact', sort => 'shared');
select pg_temp.save('tpl', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001f1', 'Écris-nous')), 'Contact'
));
select pg_temp.create_content('m', 'method', content_title => 'Respirer');
select pg_temp.create_content('c1', 'chapter', 'm', 'Bases');
select pg_temp.create_content('c2', 'chapter', 'm', 'Plus loin');
select pg_temp.create_content('l1', 'lesson', 'c1', 'Souffle');
select pg_temp.create_content('l2', 'lesson', 'c1', 'Posture');
select pg_temp.create_content('l3', 'lesson', 'c2', 'Rythme');

select throws_ok(
  $$select pg_temp.create_content('x', 'lesson', 'm')$$, 'P0001', 'parent_invalide',
  'une leçon ne se crée pas directement dans une méthode'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'chapter', 'c1')$$, 'P0001', 'parent_invalide',
  'un chapitre ne se crée pas dans un chapitre'
);
select pg_temp.as_postgres();
select throws_ok(
  format('update public.contents set parent_id = %L where id = %L', pg_temp.cid('m'), pg_temp.cid('l1')),
  'P0001', 'parent_invalide', 'une leçon ne passe pas directement dans une méthode'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- [D41] et [D45] pour la méthode ; aucun élément coché
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$select pg_temp.publish('m')$$, 'P0001', 'acces_a_choisir', 'méthode : niveau d''accès à choisir ([D41])'
);
select lives_ok(
  format($$select pg_temp.save('m', pg_temp.draft('[]', 'Respirer'), '{"access_level_id": %s}')$$,
    to_jsonb(pg_temp.lid('complet'))),
  'méthode « Complet », sans image de présentation'
);
select throws_ok(
  $$select pg_temp.publish('m')$$, 'P0001', 'image_de_presentation_manquante',
  '[D45] : une méthode sans image de présentation ne se publie pas'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('m'), now() + interval '1 day')$$, 'P0001',
  'image_de_presentation_manquante', '[D45] : ni ne se programme'
);
select lives_ok(
  $$select pg_temp.save('m', pg_temp.draft('[]', 'Respirer', pg_temp.cover()))$$, 'l''image choisie'
);
select is(
  pg_temp.preview('m'), array['Respirer:new'], 'publish_preview : une méthode jamais publiée est neuve'
);
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se publie, sans élément coché');
select is((pg_temp.live('m')).outline, '[]'::jsonb, 'plan figé vide');
select is(
  pg_temp.app_plan('m'), '{}'::text[],
  'aucun chapitre ni leçon dans l''app tant que « Montrer dans l''app » n''est pas coché'
);
select is(
  (select count(*)::int from public.versions v
    where v.content_id in (pg_temp.cid('c1'), pg_temp.cid('c2'), pg_temp.cid('l1'), pg_temp.cid('l2'), pg_temp.cid('l3'))),
  0,
  'aucune version de chapitre ni de leçon'
);

-- ---------------------------------------------------------------------------------------------
-- Première publication avec le plan
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.save('c1', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000001c1', 'Pour commencer')), 'Bases'), '{"in_app": true}')$$,
  'chapitre 1 coché, avec son introduction'
);
select lives_ok(
  $$select pg_temp.save('l1', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000001a1', 'Inspire'),
      pg_temp.image_block('00000000-0000-4000-8000-0000000001a2', pg_temp.mid('photo')),
      pg_temp.linked_block('00000000-0000-4000-8000-0000000001a3', 'tpl')), 'Souffle'),
    '{"in_app": true, "is_free": true}')$$,
  'leçon 1 cochée, gratuite : texte, image qui suit la médiathèque, bloc partagé'
);
select lives_ok(
  $$select pg_temp.save('l2', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000001b1', 'Dos droit'),
      pg_temp.image_block('00000000-0000-4000-8000-0000000001b2', pg_temp.mid('vieux'), 'Une chaise')), 'Posture'),
    '{"in_app": true}')$$,
  'leçon 2 cochée, réservée'
);
select lives_ok(
  $$select pg_temp.save('c2', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000001c2', 'Aller plus loin')), 'Plus loin'))$$,
  'chapitre 2 décoché'
);
select lives_ok(
  $$select pg_temp.save('l3', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000001d1', 'Un, deux')), 'Rythme'), '{"in_app": true}')$$,
  'leçon 3 cochée, dans le chapitre décoché'
);
select is(
  pg_temp.preview('m'), array['Bases:new', 'Souffle:new', 'Posture:new'],
  'publish_preview : les éléments neufs, dans l''ordre'
);
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se publie avec son plan');
select is(
  pg_temp.app_plan('m'), array['Bases', 'Bases/Souffle', 'Bases/Posture'],
  'plan figé : les éléments cochés dans l''ordre ; une leçon cochée dans un chapitre décoché ne part pas'
);
select is(pg_temp.preview('m'), '{}'::text[], 'publish_preview : rien juste après la publication');
select is(
  pg_temp.origin_of(pg_temp.cited('l1')), 'manual', 'la leçon a sa propre version (publication manuelle)'
);
select pg_temp.keep('l1_v1', pg_temp.cited('l1'));
select pg_temp.keep('c1_v1', pg_temp.cited('c1'));
select pg_temp.keep('l2_v1', pg_temp.cited('l2'));

-- ---------------------------------------------------------------------------------------------
-- Niveau réel ([D43]) et lecture par l'app
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('l1')) -> 'locked', 'false'::jsonb,
  'anonyme : la leçon gratuite d''une méthode réservée est ouverte'
);
select is(
  array[public.app_content(pg_temp.cid('l1')) -> 'level', public.app_content(pg_temp.cid('l1')) -> 'isFree',
    to_jsonb(jsonb_array_length(public.app_content(pg_temp.cid('l1')) -> 'blocks')),
    public.app_content(pg_temp.cid('l1')) -> 'methodId', public.app_content(pg_temp.cid('l1')) -> 'kind'],
  array['null'::jsonb, 'true'::jsonb, '3'::jsonb, to_jsonb(pg_temp.cid('m')), '"lesson"'::jsonb],
  'leçon gratuite : niveau null, isFree, ses trois blocs, sa méthode'
);
select is(
  pg_temp.app_text('l1', 2), 'Écris-nous', 'le bloc partagé est recopié dans la version de la leçon'
);
select is(
  array[public.app_content(pg_temp.cid('l2')) -> 'locked', public.app_content(pg_temp.cid('l2')) #> '{level,name}',
    public.app_content(pg_temp.cid('l2')) -> 'blocks'],
  array['true'::jsonb, '"Complet"'::jsonb, 'null'::jsonb],
  'anonyme : la leçon réservée est verrouillée, sans blocs'
);
select is(
  array[public.app_content(pg_temp.cid('c1')) -> 'level', public.app_content(pg_temp.cid('c1')) -> 'locked'],
  array['null'::jsonb, 'false'::jsonb],
  '[D43] : l''introduction d''un chapitre qui a une leçon gratuite en ligne est gratuite'
);
select is(public.app_content(pg_temp.cid('l3')), null, 'une leçon absente du plan n''existe pas pour l''app');
select is(public.app_content(pg_temp.cid('c2')), null, 'un chapitre décoché n''existe pas pour l''app');
select is(
  public.app_method(pg_temp.cid('m')) - 'chapters' - 'files' - 'publishedAt' - 'firstPublishedAt',
  jsonb_build_object(
    'id', pg_temp.cid('m'), 'versionId', (pg_temp.live('m')).id, 'kind', 'method', 'title', 'Respirer',
    'cover', jsonb_build_object('mediaId', pg_temp.mid('couverture')),
    'level', jsonb_build_object('id', pg_temp.lid('complet'), 'name', 'Complet', 'rank', 2), 'locked', true
  ),
  'app_method : la fiche, son niveau, verrouillée pour un anonyme'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.app_method(pg_temp.cid('m')) -> 'files') k),
  array[pg_temp.mid('couverture')::text],
  'app_method : files ne contient que les images de présentation'
);
select is(
  (select array_agg((ch ->> 'title') || ':' || (ch ->> 'locked') || ':' || (ch -> 'level' is not null and ch -> 'level' <> 'null'::jsonb)
    order by n)
    from jsonb_array_elements(public.app_method(pg_temp.cid('m')) -> 'chapters') with ordinality c (ch, n)),
  array['Bases:false:false'],
  'app_method : l''introduction du chapitre 1 est ouverte ([D43])'
);
select is(
  (select array_agg((le ->> 'title') || ':' || (le ->> 'isFree') || ':' || (le ->> 'locked') || ':' || (le ->> 'versionId')
    order by n)
    from jsonb_array_elements(public.app_method(pg_temp.cid('m')) #> '{chapters,0,lessons}') with ordinality l (le, n)),
  array['Souffle:true:false:' || pg_temp.kept('l1_v1'), 'Posture:false:true:' || pg_temp.kept('l2_v1')],
  'app_method : les leçons dans l''ordre, isFree, locked, versionId'
);
select ok(
  public.app_method(pg_temp.cid('l1')) is null and public.app_method('20000000-0000-4000-8000-0000000000ff') is null,
  'app_method : null pour une leçon ou un contenu inconnu'
);

select pg_temp.as_person('reader');
select is(
  public.app_content(pg_temp.cid('l2')) -> 'locked', 'true'::jsonb,
  'lecteur « Essentiel » : la leçon « Complet » reste verrouillée'
);
select pg_temp.as_postgres();
update public.reader_access set access_level_id = pg_temp.lid('complet') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select is(
  array[public.app_content(pg_temp.cid('l2')) -> 'locked', public.app_method(pg_temp.cid('m')) -> 'locked'],
  array['false'::jsonb, 'false'::jsonb],
  'lecteur « Complet » : la leçon réservée et la méthode sont ouvertes'
);

-- ---------------------------------------------------------------------------------------------
-- Fichiers : leçon gratuite publique, leçon réservée protégée ([D24], question 1)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_postgres();
select results_eq(
  $$select media_id, to_public from private.files_to_move() order by media_id$$,
  format('values (%L::uuid, true), (%L::uuid, true)', pg_temp.mid('photo'), pg_temp.mid('couverture')),
  'fichiers à rendre publics : l''image de la leçon gratuite et l''image de présentation (pas celle de la leçon réservée)'
);
select pg_temp.as_anon();
select ok(
  private.reader_can_open(pg_temp.mid('photo') || '/photo.webp'),
  'anonyme : le fichier de la leçon gratuite se lit'
);
select ok(
  not private.reader_can_open(pg_temp.mid('vieux') || '/vieux.webp'),
  'anonyme : le fichier de la leçon réservée est protégé'
);
select is(
  array(select media_id from public.app_file_locations(array[pg_temp.mid('photo'), pg_temp.mid('vieux')])),
  array[pg_temp.mid('photo')],
  'anonyme : app_file_locations ne donne que le fichier de la leçon gratuite'
);
select pg_temp.as_person('reader');
select ok(
  private.reader_can_open(pg_temp.mid('vieux') || '/vieux.webp'),
  'lecteur « Complet » : le fichier de la leçon réservée se lit'
);
select pg_temp.as_person('editor');
select is(
  (select array_agg(u.kind || ':' || u.in_draft || ':' || u.in_app) from public.media_uses(pg_temp.mid('vieux')) u),
  array['lesson:true:true'],
  '« Où il est utilisé » : la leçon, en brouillon et en ligne'
);

-- ---------------------------------------------------------------------------------------------
-- Plan figé : ranger ne change rien avant la publication ; publish_preview
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  format(
    'select public.outline_reorder(%L, %L::jsonb)',
    pg_temp.cid('m'),
    jsonb_build_array(
      jsonb_build_object('chapterId', pg_temp.cid('c1'), 'lessonIds', jsonb_build_array(pg_temp.cid('l2'), pg_temp.cid('l1'))),
      jsonb_build_object('chapterId', pg_temp.cid('c2'), 'lessonIds', jsonb_build_array(pg_temp.cid('l3')))
    )
  ),
  'la leçon 2 passe avant la leçon 1'
);
select is(
  (select array_agg(position order by position) from public.contents where parent_id = pg_temp.cid('c1')),
  array[1, 2], 'positions réécrites 1, 2'
);
select is(
  (select position from public.contents where id = pg_temp.cid('l2')), 1, 'la leçon 2 est la première'
);
select is(
  pg_temp.app_plan('m'), array['Bases', 'Bases/Souffle', 'Bases/Posture'],
  'réordonner ne change rien dans l''app avant la publication'
);
select is(pg_temp.preview('m'), array['Respirer:reordered'], 'publish_preview : le plan est rangé autrement');

-- Un autre membre modifie la leçon 2, sous le verrou de la méthode ; le chapitre 2 est coché.
select public.lock_release(pg_temp.cid('m'));
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('m'));
select pg_temp.save('l2', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000001b1', 'Dos bien droit'),
  pg_temp.image_block('00000000-0000-4000-8000-0000000001b2', pg_temp.mid('vieux'), 'Une chaise')), 'Posture'));
select public.lock_release(pg_temp.cid('m'));
select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'));
select pg_temp.save('c2', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000001c2', 'Aller plus loin')), 'Plus loin'), '{"in_app": true}');
select is(
  pg_temp.preview('m'),
  array['Respirer:reordered', 'Posture:modified', 'Plus loin:new', 'Rythme:new'],
  'publish_preview : rangé autrement, modifié, neufs (dans l''ordre du plan à venir)'
);
select results_eq(
  format($$select kind, chapter_id, chapter_title, draft_saved_by_name, problem
    from public.publish_preview(%L) where element_id in (%L, %L) order by chapter_title$$,
    pg_temp.cid('m'), pg_temp.cid('l2'), pg_temp.cid('l3')),
  format($$values ('lesson'::text, %L::uuid, 'Bases'::text, 'editeur2@tests.local'::text, null::text),
    ('lesson', %L::uuid, 'Plus loin', 'editeur@tests.local', null)$$, pg_temp.cid('c1'), pg_temp.cid('c2')),
  'publish_preview : le chapitre, qui a enregistré en dernier, aucun problème'
);

-- [D14] : un autre membre écrit la leçon 3 (avec le verrou de la leçon, celui de l'admin d'avant
-- la méthode sur une seule page).
select public.lock_release(pg_temp.cid('m'));
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('l3'));
select pg_temp.as_person('editor');
select is(
  pg_temp.error_of($$select pg_temp.publish('m')$$),
  'verrou_tenu | editeur2@tests.local écrit ce brouillon : reprends la main ou attends qu''il ait fini. | editeur2@tests.local',
  '[D14] : un autre membre écrit une leçon, la méthode ne se publie pas'
);
select pg_temp.as_person('editor2');
select public.lock_release(pg_temp.cid('l3'));
select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'));

-- Un élément invalide : rien n'est publié, l'erreur le nomme.
select pg_temp.save('l3', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000001d1', 'Un, deux'),
  pg_temp.image_block('00000000-0000-4000-8000-0000000001d2', null)), 'Rythme'));
select results_eq(
  format($$select change, problem from public.publish_preview(%L) where element_id = %L$$,
    pg_temp.cid('m'), pg_temp.cid('l3')),
  $$values ('new'::text, 'image_sans_fichier'::text)$$,
  'publish_preview : le problème de la leçon est signalé avant de publier'
);
select is(
  pg_temp.error_of($$select pg_temp.publish('m')$$),
  'image_sans_fichier | Chapitre 2, leçon 1 « Rythme » : Une image n''a pas de fichier : bloc n° 2. | '
    || pg_temp.cid('l3'),
  'un élément invalide : la publication est refusée, l''erreur nomme l''élément (hint : son identifiant)'
);
select is(pg_temp.versions_of('m'), 2, 'rien n''est publié (méthode)');
select is(pg_temp.versions_of('l2'), 1, 'rien n''est publié (leçon modifiée)');
select pg_temp.save('l3', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000001d1', 'Un, deux')), 'Rythme'));

-- Deuxième publication.
select lives_ok($$select pg_temp.publish('m')$$, 'deuxième publication');
select is(
  pg_temp.app_plan('m'), array['Bases', 'Bases/Posture', 'Bases/Souffle', 'Plus loin', 'Plus loin/Rythme'],
  'après la publication : le nouvel ordre et les nouveaux éléments'
);
select is(pg_temp.cited('l1'), pg_temp.kept('l1_v1'), 'leçon inchangée : sa version est réutilisée');
select is(pg_temp.versions_of('l1'), 1, 'leçon inchangée : aucune copie');
select is(pg_temp.cited('c1'), pg_temp.kept('c1_v1'), 'chapitre inchangé : sa version est réutilisée');
select isnt(pg_temp.cited('l2'), pg_temp.kept('l2_v1'), 'leçon modifiée : nouvelle version');
select is(pg_temp.versions_of('l2'), 2, 'leçon modifiée : deux versions');
select is(pg_temp.preview('m'), '{}'::text[], 'publish_preview : plus rien à publier');
select pg_temp.as_anon();
select is(
  array[public.app_content(pg_temp.cid('c2')) #> '{level,name}', public.app_content(pg_temp.cid('c2')) -> 'locked'],
  array['"Complet"'::jsonb, 'true'::jsonb],
  '[D43] : l''introduction d''un chapitre sans leçon gratuite a le niveau de la méthode'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Modèle partagé et texte alternatif changés : la leçon repart, pas la version d'avant
-- ---------------------------------------------------------------------------------------------

select pg_temp.save('tpl', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001f1', 'Écris-nous vite')), 'Contact'
));
select is(pg_temp.preview('m'), array['Souffle:modified'], 'modèle changé : la leçon qui le cite est modifiée');
select is(
  (select array_agg(kind) from public.template_outdated(pg_temp.cid('tpl'))), array['lesson'],
  'template_outdated : la leçon en ligne'
);
select pg_temp.keep('l2_v2', pg_temp.cited('l2'));
select pg_temp.keep('m_before_push', (pg_temp.live('m')).id);
select is(
  (select array_agg(content_id) from public.template_push(pg_temp.cid('tpl'))), array[pg_temp.cid('l1')],
  'template_push : la leçon est mise à jour'
);
select is(pg_temp.origin_of(pg_temp.cited('l1')), 'template', 'la leçon a une version « modèle »');
select is(
  array[(pg_temp.live('m')).origin, ((pg_temp.live('m')).number)::text],
  array['template', '4'],
  'la méthode a une nouvelle version dont le plan pointe vers la nouvelle leçon'
);
select is(pg_temp.cited('l2'), pg_temp.kept('l2_v2'), 'template_push : les autres éléments sont réutilisés');
select pg_temp.as_anon();
select is(pg_temp.app_text('l1', 2), 'Écris-nous vite', 'l''app lit la leçon mise à jour');
select pg_temp.as_person('editor');
select is(pg_temp.preview('m'), '{}'::text[], 'après template_push, rien d''autre à publier');

select pg_temp.save('tpl', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001f1', 'Écris-nous demain')), 'Contact'
));
select lives_ok($$select pg_temp.publish('m')$$, 'le modèle change encore : la méthode se publie');
select is(
  array[pg_temp.versions_of('l1'), pg_temp.versions_of('l2')], array[3, 2],
  'la leçon dont le modèle a changé est republiée ; l''autre est réutilisée'
);
select pg_temp.as_anon();
select is(pg_temp.app_text('l1', 2), 'Écris-nous demain', 'l''app lit le nouveau texte du modèle');

select pg_temp.as_postgres();
update public.media set alt = 'Un chat roux' where id = pg_temp.mid('photo');
select pg_temp.as_person('editor');
select is(pg_temp.preview('m'), array['Souffle:modified'], 'texte alternatif changé : la leçon est modifiée');
select is(
  (select array_agg(kind) from public.media_outdated(pg_temp.mid('photo'))), array['lesson'],
  'media_outdated : la leçon en ligne'
);
select is(
  (select array_agg(content_id) from public.media_push(pg_temp.mid('photo'))), array[pg_temp.cid('l1')],
  'media_push : la leçon est mise à jour'
);
select is(
  array[pg_temp.origin_of(pg_temp.cited('l1')), (pg_temp.live('m')).origin],
  array['files', 'files'],
  'media_push : nouvelle version de la leçon et de la méthode'
);
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('l1')) #>> '{blocks,1,alt}', 'Un chat roux',
  'l''app lit le nouveau texte alternatif'
);
select pg_temp.as_person('editor');
select is(pg_temp.preview('m'), '{}'::text[], 'après media_push, rien d''autre à publier');

select pg_temp.as_postgres();
update public.media set alt = 'Un chat noir' where id = pg_temp.mid('photo');
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.publish('m')$$, 'le texte alternatif change encore : la méthode se publie');
select is(
  array[pg_temp.versions_of('l1'), pg_temp.versions_of('l2')], array[5, 2],
  'la leçon dont le texte alternatif a changé est republiée, pas réutilisée'
);
select is(
  (select v.files #>> array[pg_temp.mid('photo')::text, 'alt'] from public.versions v where v.id = pg_temp.cited('l1')),
  'Un chat noir', 'le nouveau texte est figé dans la version'
);

-- ---------------------------------------------------------------------------------------------
-- Retirer une leçon de l'app ([D26])
-- ---------------------------------------------------------------------------------------------

select public.lock_release(pg_temp.cid('m'));
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('m'));
select pg_temp.as_person('editor');
select throws_ok(
  format('select public.unpublish(%L)', pg_temp.cid('l2')), 'P0001', 'verrou_tenu',
  'retirer une leçon pendant qu''un autre membre écrit la méthode est refusé'
);
select pg_temp.as_person('editor2');
select public.lock_release(pg_temp.cid('m'));
select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'));
select lives_ok(format('select public.unpublish(%L)', pg_temp.cid('l2')), 'la leçon 2 est retirée de l''app');
select is(
  array[(pg_temp.live('m')).origin, (select in_app::text from public.contents where id = pg_temp.cid('l2'))],
  array['outline', 'false'],
  'retrait : nouvelle version de la méthode (outline), « Montrer dans l''app » décoché'
);
select is(
  pg_temp.app_plan('m'), array['Bases', 'Bases/Souffle', 'Plus loin', 'Plus loin/Rythme'],
  'retrait : la leçon n''est plus dans le plan de l''app'
);
select pg_temp.as_anon();
select is(public.app_content(pg_temp.cid('l2')), null, 'retrait : l''app ne lit plus la leçon');
select pg_temp.as_person('editor');
select is(pg_temp.versions_of('m'), 8, 'la méthode a huit versions');
select lives_ok(format('select public.unpublish(%L)', pg_temp.cid('l2')), 'retrait rejouable');
select is(pg_temp.versions_of('m'), 8, 'retrait rejoué : aucune version de plus');
select is(pg_temp.preview('m'), '{}'::text[], 'retrait : le plan en ligne est le plan à venir');

-- [D43] : sans sa leçon gratuite, l'introduction du chapitre 1 prend le niveau de la méthode.
select lives_ok(format('select public.unpublish(%L)', pg_temp.cid('l1')), 'la leçon gratuite est retirée');
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('c1')) -> 'locked', 'true'::jsonb,
  '[D43] : l''introduction du chapitre 1 n''est plus gratuite'
);
select pg_temp.as_postgres();
select results_eq(
  $$select media_id, to_public from private.files_to_move() order by media_id$$,
  format('values (%L::uuid, true)', pg_temp.mid('couverture')),
  'le fichier de la leçon retirée n''a plus à être public'
);

-- ---------------------------------------------------------------------------------------------
-- Corbeille d'une leçon seule ([D36]) ; restauration d'un lot en fin de liste
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('l4', 'lesson', 'c2', 'Pause');
select pg_temp.save('l4', pg_temp.draft('[]', 'Pause'), '{"in_app": true}');
select lives_ok($$select pg_temp.publish('m')$$, 'la leçon 4 est publiée');
select is(
  pg_temp.app_plan('m'), array['Bases', 'Plus loin', 'Plus loin/Rythme', 'Plus loin/Pause'],
  'le plan avec la leçon 4'
);
select results_eq(
  format('select trashed from public.trash(%L)', pg_temp.cid('l3')), $$values (1)$$,
  'la leçon 3 part seule à la corbeille'
);
select is(
  array[(pg_temp.live('m')).origin, array_to_string(pg_temp.app_plan('m'), ',')],
  array['outline', 'Bases,Plus loin,Plus loin/Pause'],
  '[D36] : nouvelle version de la méthode sans la leçon 3'
);
select results_eq(
  format('select restored from public.restore(%L)', pg_temp.cid('l3')), $$values (1)$$,
  'la leçon 3 est restaurée'
);
select is(
  (select array[position, in_app::int] from public.contents where id = pg_temp.cid('l3')), array[3, 0],
  'restaurée en fin de liste de son chapitre, « Montrer dans l''app » décoché'
);
select is(
  pg_temp.app_plan('m'), array['Bases', 'Plus loin', 'Plus loin/Pause'], 'restaurée sans être republiée ([D18])'
);

select results_eq(
  format('select trashed from public.trash(%L)', pg_temp.cid('c1')), $$values (3)$$,
  'le chapitre 1 part à la corbeille avec ses deux leçons'
);
select is(
  pg_temp.app_plan('m'), array['Plus loin', 'Plus loin/Pause'], '[D36] : le chapitre sort du plan en ligne'
);
select results_eq(
  format('select restored from public.restore(%L)', pg_temp.cid('c1')), $$values (3)$$,
  'le lot du chapitre 1 est restauré'
);
select is(
  (select array_agg(title || ':' || position || ':' || in_app::text order by position) from public.contents
    where parent_id = pg_temp.cid('m')),
  array['Plus loin:2:true', 'Bases:3:false'],
  'le chapitre revient en fin de liste, « Montrer dans l''app » décoché'
);
select is(
  (select array_agg(title || ':' || position || ':' || in_app::text order by position) from public.contents
    where parent_id = pg_temp.cid('c1')),
  array['Posture:1:false', 'Souffle:2:false'],
  'ses leçons gardent leur place et leurs réglages'
);
select is(pg_temp.app_plan('m'), array['Plus loin', 'Plus loin/Pause'], 'rien ne change dans l''app');

-- ---------------------------------------------------------------------------------------------
-- Programmer une méthode pendant qu'on écrit une de ses leçons ([D31])
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select public.schedule(pg_temp.cid('m'), now() + interval '1 day')$$, 'la méthode se programme'
);
select pg_temp.free_locks();
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('l4'));
select pg_temp.save('l4', pg_temp.draft(jsonb_build_array(
  pg_temp.text_block('00000000-0000-4000-8000-0000000001e1', 'Souffle un peu')), 'Pause'));
select pg_temp.as_postgres();
update public.contents
set scheduled_at = now() - interval '1 minute', scheduled_set_at = now() - interval '2 minutes'
where id = pg_temp.cid('m');
select is(private.run_due_publications(), 0, '[D31] : une leçon est en cours d''écriture, la tâche attend');
select ok(
  (select scheduled_at is not null and schedule_error is null from public.contents where id = pg_temp.cid('m')),
  'la programmation reste en attente'
);
select pg_temp.as_person('editor2');
select public.lock_release(pg_temp.cid('l4'));
select pg_temp.as_postgres();
select is(private.run_due_publications(), 1, 'la leçon quittée, la méthode se publie à la minute suivante');
select is(
  array[(pg_temp.live('m')).origin, pg_temp.origin_of(pg_temp.cited('l4'))],
  array['scheduled', 'scheduled'],
  'version programmée de la méthode et de la leçon modifiée'
);
select pg_temp.as_person('reader');
select is(pg_temp.app_text('l4', 0), 'Souffle un peu', 'le dernier brouillon de la leçon est parti ([D16])');

-- ---------------------------------------------------------------------------------------------
-- outline_reorder : verrou, plan à jour, demande, déplacement d'une leçon
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('m2', 'method', content_title => 'Dormir');
select pg_temp.create_content('m2c', 'chapter', 'm2', 'Le soir');
select pg_temp.create_content('m2l', 'lesson', 'm2c', 'Lumière');
select pg_temp.as_person('editor2');
select throws_ok(
  format('select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), '[]'), 'P0001', 'verrou_perdu',
  'ranger sans tenir le verrou de la méthode est refusé'
);
select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'));
select throws_ok(
  format('select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'),
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'lessonIds', '[]'::jsonb))),
  'P0001', 'plan_perime', 'un plan qui oublie des éléments est refusé'
);
select throws_ok(
  format('select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'), '[{"chapterId": "x"}]'),
  'P0001', 'demande_invalide', 'un plan mal formé est refusé'
);
select throws_ok(
  format('select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('l4'), '[]'),
  'P0001', 'sorte_invalide', 'seule une méthode se range'
);
select throws_ok(
  format(
    'select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'),
    jsonb_build_array(
      jsonb_build_object('chapterId', pg_temp.cid('c2'),
        'lessonIds', jsonb_build_array(pg_temp.cid('l4'), pg_temp.cid('l3'), pg_temp.cid('m2l'))),
      jsonb_build_object('chapterId', pg_temp.cid('c1'),
        'lessonIds', jsonb_build_array(pg_temp.cid('l2'), pg_temp.cid('l1')))
    )
  ),
  'P0001', 'plan_perime', 'une leçon d''une autre méthode est refusée'
);
select results_eq(
  format(
    'select content_id, parent_id, position from public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'),
    jsonb_build_array(
      jsonb_build_object('chapterId', pg_temp.cid('c1'),
        'lessonIds', jsonb_build_array(pg_temp.cid('l2'), pg_temp.cid('l4'), pg_temp.cid('l1'))),
      jsonb_build_object('chapterId', pg_temp.cid('c2'), 'lessonIds', jsonb_build_array(pg_temp.cid('l3')))
    )
  ),
  format(
    'values (%L::uuid, %L::uuid, 1), (%L, %L, 1), (%L, %L, 2), (%L, %L, 3), (%L, %L, 2), (%L, %L, 1)',
    pg_temp.cid('c1'), pg_temp.cid('m'),
    pg_temp.cid('l2'), pg_temp.cid('c1'),
    pg_temp.cid('l4'), pg_temp.cid('c1'),
    pg_temp.cid('l1'), pg_temp.cid('c1'),
    pg_temp.cid('c2'), pg_temp.cid('m'),
    pg_temp.cid('l3'), pg_temp.cid('c2')
  ),
  'une leçon passe dans un autre chapitre ; chapitres puis leçons, dans l''ordre'
);
select lives_ok(
  $$set constraints public.contents_position_unique immediate$$,
  'les nouvelles places respectent l''ordre unique dans chaque parent (contrainte vérifiée tout de suite)'
);
select is(
  pg_temp.app_plan('m'), array['Plus loin', 'Plus loin/Pause'], 'déplacer une leçon ne change rien dans l''app'
);
select is(
  pg_temp.preview('m'), array['Pause:removed'],
  'publish_preview : la leçon passée dans un chapitre décoché sortira du plan'
);

-- ---------------------------------------------------------------------------------------------
-- Le plan figé est vérifié à l'insertion
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.as_postgres();
select throws_ok(
  format($$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
    values (%L, 1, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1, '[]')$$, pg_temp.cid('article')),
  'P0001', 'plan_invalide', 'seule une méthode a un plan'
);
select throws_ok(
  format($$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
    values (%L, 1, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1, null)$$, pg_temp.cid('m2')),
  'P0001', 'plan_invalide', 'une version de méthode a un plan'
);
select throws_ok(
  format($$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
    values (%L, 1, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1, %L)$$,
    pg_temp.cid('m2'),
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'),
      'lessons', '[]'::jsonb))),
  'P0001', 'plan_invalide', 'un plan ne cite pas le chapitre d''une autre méthode'
);
select throws_ok(
  format($$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
    values (%L, 8, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1, %L)$$,
    pg_temp.cid('m'),
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('l4'),
      'lessons', '[]'::jsonb))),
  'P0001', 'plan_invalide', 'un plan ne cite que les versions de ses éléments'
);
select throws_ok(
  format($$insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
    values (%L, 8, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1, '[{"chapterId": 1}]')$$,
    pg_temp.cid('m')),
  'P0001', 'plan_invalide', 'un plan mal formé est refusé'
);

-- Essaie un plan pour une méthode (au besoin après une nouvelle version d'un élément), puis
-- annule tout : 'plan_accepte' si le déclencheur l'a laissé passer.
create function pg_temp.try_outline(
  method_name text, plan jsonb, new_version_of text default null, new_version_id uuid default null
)
returns void
language plpgsql
as $$
begin
  if new_version_of is not null then
    insert into public.versions (id, content_id, number, origin, body, body_hash, draft_rev)
    values (new_version_id, pg_temp.cid(new_version_of), 999, 'manual',
      '{"v":1,"title":"x","blocks":[]}', repeat('b', 64), 1);
  end if;
  insert into public.versions (content_id, number, origin, body, body_hash, draft_rev, outline)
  values (pg_temp.cid(method_name), 999, 'manual', '{"v":1,"title":"x","blocks":[]}', repeat('a', 64), 1,
    plan);
  raise exception using errcode = 'P0001', message = 'plan_accepte';
end;
$$;

select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'),
      'lessons', jsonb_build_array(
        jsonb_build_object('lessonId', pg_temp.cid('l4'), 'versionId', pg_temp.cited('l4')))))),
  'P0001', 'plan_accepte', 'témoin : un plan qui cite ses propres éléments passe le contrôle'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(
      jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'), 'lessons', '[]'::jsonb),
      jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'), 'lessons', '[]'::jsonb))),
  'P0001', 'plan_invalide', 'un plan ne cite pas deux fois le même chapitre'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'),
      'lessons', jsonb_build_array(
        jsonb_build_object('lessonId', pg_temp.cid('l4'), 'versionId', pg_temp.cited('l4')),
        jsonb_build_object('lessonId', pg_temp.cid('l4'), 'versionId', pg_temp.cited('l4')))))),
  'P0001', 'plan_invalide', 'un plan ne cite pas deux fois la même leçon'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L, %L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'),
      'lessons', jsonb_build_array(
        jsonb_build_object('lessonId', pg_temp.cid('l3'), 'versionId', '00000000-0000-4000-8000-0000000009a1')))),
    'l3', '00000000-0000-4000-8000-0000000009a1'),
  'P0001', 'plan_accepte', 'témoin : une nouvelle version d''une leçon de la méthode peut être citée'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L, %L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c2'), 'versionId', pg_temp.cited('c2'),
      'lessons', jsonb_build_array(
        jsonb_build_object('lessonId', pg_temp.cid('m2l'), 'versionId', '00000000-0000-4000-8000-0000000009a2')))),
    'm2l', '00000000-0000-4000-8000-0000000009a2'),
  'P0001', 'plan_invalide', 'un plan ne cite pas la leçon d''une autre méthode, même avec sa version'
);

-- ---------------------------------------------------------------------------------------------
-- Points de départ des chapitres et des leçons ([D42]) ; « Revenir à cette version » ([D17])
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.keep('starter', (public.content_create(
  'template', title => 'Leçon type', template_sort => 'starter', template_for => 'lesson'
)).id);
select public.save_draft(pg_temp.kept('starter'), 1, pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000001e9', 'Objectif')), 'Leçon type'));
select is(
  (select c.draft #>> '{blocks,0,doc,content,0,content,0,text}' from public.content_create(
    'lesson', pg_temp.cid('c2'), 'Nouvelle', from_template_id => pg_temp.kept('starter')) c),
  'Objectif', '[D42] : « Nouvelle leçon » part du point de départ des leçons'
);
select throws_ok(
  format($$select public.content_create('chapter', %L, 'Nouveau', from_template_id => %L)$$,
    pg_temp.cid('m'), pg_temp.kept('starter')),
  'P0001', 'modele_indisponible', '[D42] : pas pour un chapitre'
);

select pg_temp.save('m', pg_temp.draft('[]', 'Respirer mieux', pg_temp.cover()));
select results_eq(
  format('select warnings from public.revert_to_version(%L)',
    (select v.id from public.versions v where v.content_id = pg_temp.cid('m') and v.number = 1)),
  $$values ('{}'::text[])$$,
  '« Revenir à cette version » de la méthode'
);
select is(
  (select array[title, (select count(*)::text from public.contents where parent_id = pg_temp.cid('c1'))]
    from public.contents where id = pg_temp.cid('m')),
  array['Respirer', '3'],
  '[D17] : seule la fiche revient, le plan du brouillon reste'
);

select pg_temp.save('m', pg_temp.draft('[]', 'Respirer', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('essentiel')));
select is(
  pg_temp.preview('m'), array['Respirer:modified', 'Pause:removed'],
  'publish_preview : un autre niveau d''accès modifie la fiche'
);

-- ---------------------------------------------------------------------------------------------
-- Retirer la méthode : ses éléments quittent l'app avec elle
-- ---------------------------------------------------------------------------------------------

select lives_ok(format('select public.unpublish(%L)', pg_temp.cid('m')), 'la méthode est retirée de l''app');
select pg_temp.as_anon();
select ok(
  public.app_method(pg_temp.cid('m')) is null and public.app_content(pg_temp.cid('l4')) is null
    and public.app_content(pg_temp.cid('c2')) is null,
  'retirée : l''app ne voit plus la méthode, ni ses chapitres, ni ses leçons'
);
select pg_temp.as_person('editor');
select is(
  (pg_temp.preview('m'))[1], 'Respirer:new', 'publish_preview : une méthode retirée repart comme neuve'
);
select pg_temp.as_postgres();

select * from finish();
rollback;

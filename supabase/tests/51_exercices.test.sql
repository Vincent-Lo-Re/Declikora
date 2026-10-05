-- Méthodes : les exercices (04/10/2026 ; docs/ADMINISTRATION.md, § 1, « Exercices »). Un exercice
-- dans une leçon (parent, réglages : ni « Gratuit » ni niveau) ; points de départ « exercice »
-- ([D42]) ; publish_preview (neufs, modifiés, rangés autrement, avec leur leçon) ; publication de
-- la méthode avec les exercices cochés des leçons cochées, versions réutilisées ([D29]) ; niveau
-- d'un exercice = celui de sa leçon (app_content, fichiers publics ou protégés) ; app_content
-- d'une leçon (ses exercices, à montrer en bas) et d'un exercice (sa leçon) ; app_method (nombre
-- d'exercices par leçon, plus de résumé) ; outline_reorder (exercice qui change de leçon,
-- ancienne forme de demande, plan périmé) ; retrait de l'app ([D26]) ; corbeille avec sa leçon,
-- seul, et restauration ; nom d'un exercice dans une erreur et titre obligatoire ([D49]) ; plan
-- vérifié à l'insertion.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(68);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Le lecteur a la formule « Complet », celle de la méthode.
insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), pg_temp.lid('complet'), 'test');

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

-- La version d'un élément citée par le plan en ligne (private.live), ou null.
create function pg_temp.cited(content_name text)
returns uuid
language sql
stable
security definer
as $$
  select l.version_id from private.live l where l.content_id = pg_temp.cid(content_name)
$$;

-- publish_preview en bref : « Titre:change », et « Titre:change@Leçon » pour un exercice.
create function pg_temp.preview(method_name text)
returns text[]
language sql
as $$
  select coalesce(
    array_agg(
      coalesce(p.title, '-') || ':' || p.change || coalesce('@' || p.lesson_title, '')
      order by p.ordinality
    ),
    '{}'
  )
  from public.publish_preview(pg_temp.cid(method_name)) with ordinality p
$$;

-- Le plan figé en ligne d'une méthode, leçon par leçon : « Leçon:Exercice, Exercice ».
create function pg_temp.live_exercises(method_name text)
returns text[]
language sql
stable
security definer
as $$
  select coalesce(
    array_agg(
      le.title || ':' || coalesce(
        (
          select string_agg(ex.title, ', ' order by e.k)
          from jsonb_array_elements(private.outline_exercises(lo.lesson_entry))
            with ordinality e (exercise_entry, k)
          join public.contents ex on ex.id = (e.exercise_entry ->> 'exerciseId')::uuid
        ),
        ''
      )
      order by co.n, lo.m
    ),
    '{}'
  )
  from public.contents c
  join public.versions v on v.id = c.live_version_id
  cross join lateral jsonb_array_elements(v.outline) with ordinality co (chapter_entry, n)
  cross join lateral jsonb_array_elements(co.chapter_entry -> 'lessons') with ordinality lo (lesson_entry, m)
  join public.contents le on le.id = (lo.lesson_entry ->> 'lessonId')::uuid
  where c.id = pg_temp.cid(method_name)
$$;

-- Les exercices d'une leçon dans l'app (app_content) : leurs titres, dans l'ordre.
create function pg_temp.app_exercises(lesson_name text)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(e ->> 'title' order by n), '{}')
  from jsonb_array_elements(public.app_content(pg_temp.cid(lesson_name)) -> 'exercises')
    with ordinality x (e, n)
$$;

-- Les exercices hors corbeille, dans le plan de l'admin : « Titre@Leçon#place ».
create function pg_temp.tree()
returns text[]
language sql
stable
security definer
as $$
  select coalesce(
    array_agg(ex.title || '@' || le.title || '#' || ex.position order by le.position, ex.position),
    '{}'
  )
  from public.contents ex
  join public.contents le on le.id = ex.parent_id
  where ex.kind = 'exercise' and ex.deleted_at is null
$$;

-- Demande de outline_reorder avec les exercices : une seule méthode, un seul chapitre (c1).
create function pg_temp.reorder_request(lessons jsonb)
returns text
language sql
stable
as $$
  select format(
    'select public.outline_reorder(%L, %L::jsonb)',
    pg_temp.cid('m'),
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'lessons', lessons))
  )
$$;

-- Une leçon et ses exercices, pour reorder_request.
create function pg_temp.lesson_entry(lesson_name text, exercise_names text[])
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'lessonId', pg_temp.cid(lesson_name),
    'exerciseIds', coalesce(
      (select jsonb_agg(pg_temp.cid(x) order by n) from unnest(exercise_names) with ordinality u (x, n)),
      '[]'::jsonb
    )
  )
$$;

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

grant execute on function
  pg_temp.keep(text, uuid),
  pg_temp.kept(text),
  pg_temp.cited(text),
  pg_temp.preview(text),
  pg_temp.live_exercises(text),
  pg_temp.app_exercises(text),
  pg_temp.tree(),
  pg_temp.reorder_request(jsonb),
  pg_temp.lesson_entry(text, text[]),
  pg_temp.try_outline(text, jsonb, text, uuid)
to public;

-- ---------------------------------------------------------------------------------------------
-- Un exercice dans une leçon
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('m', 'method', content_title => 'Respirer');
select pg_temp.create_content('c1', 'chapter', 'm', 'Bases');
select pg_temp.create_content('l1', 'lesson', 'c1', 'Souffle');
select pg_temp.create_content('l2', 'lesson', 'c1', 'Posture');

select lives_ok(
  $$select pg_temp.create_content('e1', 'exercise', 'l1', 'Inspirer')$$,
  'un exercice se crée dans une leçon'
);
select pg_temp.create_content('e2', 'exercise', 'l1', 'Expirer');
select pg_temp.create_content('e3', 'exercise', 'l2', 'Se tenir droit');
select is(
  (select array[kind, position::text, in_app::text, is_free::text]
    from public.contents where id = pg_temp.cid('e2')),
  array['exercise', '2', 'false', 'false'],
  'le deuxième exercice de sa leçon, « Montrer dans l''app » décoché à la création'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'exercise', 'c1')$$, 'P0001', 'parent_invalide',
  'un exercice ne se crée pas dans un chapitre'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'exercise', 'm')$$, 'P0001', 'parent_invalide',
  'ni dans une méthode'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'exercise')$$, 'P0001', 'parent_invalide',
  'ni sans parent'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'lesson', 'l1')$$, 'P0001', 'parent_invalide',
  'une leçon ne se crée pas dans une leçon'
);
select throws_ok(
  $$select pg_temp.save('e1', pg_temp.draft('[]', 'Inspirer'), '{"is_free": true}')$$,
  'P0001', 'reglages_invalides', 'un exercice n''a pas de case « Gratuit » : il suit sa leçon'
);
select throws_ok(
  format($$select pg_temp.save('e1', pg_temp.draft('[]', 'Inspirer'), '{"access_level_id": %s}')$$,
    to_jsonb(pg_temp.lid('complet'))),
  'P0001', 'reglages_invalides', 'ni de niveau d''accès'
);
select pg_temp.as_postgres();
select throws_ok(
  format('update public.contents set parent_id = %L where id = %L', pg_temp.cid('c1'), pg_temp.cid('e1')),
  'P0001', 'parent_invalide', 'un exercice ne passe pas dans un chapitre'
);
select pg_temp.as_person('editor');

-- Point de départ d'un exercice ([D42]).
insert into ids (name, id)
select 'starter', (public.content_create(
  'template', title => 'Exercice type', template_sort => 'starter', template_for => 'exercise'
)).id;
select pg_temp.save('starter', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000005a1', 'Ferme les yeux')),
  'Exercice type'
));
insert into ids (name, id)
select 'e4', (public.content_create(
  'exercise', pg_temp.cid('l2'), 'Depuis le modèle', from_template_id => pg_temp.cid('starter')
)).id;
select is(
  (select draft #>> '{blocks,0,doc,content,0,content,0,text}' from public.contents where id = pg_temp.cid('e4')),
  'Ferme les yeux',
  'un exercice se crée depuis un point de départ « exercice » ([D42])'
);
select throws_ok(
  format($$select public.content_create('lesson', %L, 'Mauvais', from_template_id => %L)$$,
    pg_temp.cid('c1'), pg_temp.cid('starter')),
  'P0001', 'modele_indisponible', 'une leçon ne part pas d''un point de départ d''exercice'
);

-- ---------------------------------------------------------------------------------------------
-- Publication de la méthode avec ses exercices
-- ---------------------------------------------------------------------------------------------

-- Méthode « Complet » ; leçon 1 gratuite, leçon 2 réservée ; e2 décoché.
select pg_temp.save('m', pg_temp.draft('[]', 'Respirer', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('complet')));
select pg_temp.save('c1', pg_temp.draft('[]', 'Bases'), '{"in_app": true}');
select pg_temp.save('l1', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000005b1', 'Le souffle')), 'Souffle'
), '{"in_app": true, "is_free": true}');
select pg_temp.save('l2', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000005b2', 'Le dos')), 'Posture'
), '{"in_app": true}');
select lives_ok(
  $$select pg_temp.save('e1', pg_temp.draft(jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-0000000005c1', 'Par le nez'),
      pg_temp.image_block('00000000-0000-4000-8000-0000000005c2', pg_temp.mid('photo'))),
    'Inspirer', pg_temp.cover('fond')), '{"in_app": true}')$$,
  'exercice 1 coché : un texte, une image, une image de présentation'
);
select pg_temp.save('e2', pg_temp.draft('[]', 'Expirer'));
select pg_temp.save('e3', pg_temp.draft(jsonb_build_array(
  pg_temp.image_block('00000000-0000-4000-8000-0000000005d1', pg_temp.mid('vieux'), 'Une chaise')),
  'Se tenir droit'), '{"in_app": true}');
select pg_temp.save('e4', (select draft from public.contents where id = pg_temp.cid('e4')), '{"in_app": true}');

select is(
  pg_temp.preview('m'),
  array['Respirer:new', 'Bases:new', 'Souffle:new', 'Inspirer:new@Souffle', 'Posture:new',
    'Se tenir droit:new@Posture', 'Depuis le modèle:new@Posture'],
  'publish_preview : les exercices cochés, après leur leçon ; l''exercice décoché n''y est pas'
);
select is(
  (select array[chapter_title, lesson_title, kind]
    from public.publish_preview(pg_temp.cid('m')) where element_id = pg_temp.cid('e1')),
  array['Bases', 'Souffle', 'exercise'],
  'publish_preview : un exercice nomme son chapitre et sa leçon'
);
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se publie avec ses exercices');
select is(
  pg_temp.live_exercises('m'),
  array['Souffle:Inspirer', 'Posture:Se tenir droit, Depuis le modèle'],
  'plan figé : les exercices cochés de chaque leçon, dans l''ordre'
);
select is(pg_temp.cited('e2'), null, 'l''exercice décoché n''est pas en ligne');

-- ---------------------------------------------------------------------------------------------
-- Ce que lit l'app ; le niveau d'un exercice est celui de sa leçon
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select is(
  (select jsonb_build_object('locked', x -> 'locked', 'level', x -> 'level', 'lessonId', x -> 'lessonId',
      'methodId', x -> 'methodId', 'blocks', jsonb_array_length(x -> 'blocks'),
      'exercises', x -> 'exercises', 'summary', x ? 'summary')
    from public.app_content(pg_temp.cid('e1')) x),
  jsonb_build_object('locked', false, 'level', null, 'lessonId', pg_temp.cid('l1'),
    'methodId', pg_temp.cid('m'), 'blocks', 2, 'exercises', null, 'summary', false),
  'anonyme : l''exercice d''une leçon gratuite est gratuit, avec sa leçon et sa méthode'
);
select is(
  (select jsonb_build_object('locked', x -> 'locked', 'level', x #>> '{level,name}',
      'blocks', x -> 'blocks', 'lessonId', x -> 'lessonId')
    from public.app_content(pg_temp.cid('e3')) x),
  jsonb_build_object('locked', true, 'level', 'Complet', 'blocks', null, 'lessonId', pg_temp.cid('l2')),
  'anonyme : l''exercice d''une leçon réservée est réservé, sans blocs'
);
select is(public.app_content(pg_temp.cid('e2')), null, 'un exercice décoché n''existe pas pour l''app');
select is(
  pg_temp.app_exercises('l1'), array['Inspirer'],
  'app_content d''une leçon : ses exercices en ligne, à montrer en bas'
);
select is(
  pg_temp.app_exercises('l2'), array['Se tenir droit', 'Depuis le modèle'],
  'dans l''ordre du plan, même quand la leçon est verrouillée'
);
select is(
  (select jsonb_build_object('locked', e -> 'locked', 'level', e #>> '{level,name}', 'versionId', e -> 'versionId')
    from jsonb_array_elements(public.app_content(pg_temp.cid('l2')) -> 'exercises') e limit 1),
  jsonb_build_object('locked', true, 'level', 'Complet', 'versionId', pg_temp.cited('e3')),
  'chaque exercice listé : sa version, son niveau, verrouillé pour un anonyme'
);
select ok(
  public.app_content(pg_temp.cid('l1')) -> 'files' ? pg_temp.mid('fond')::text,
  'l''image de présentation d''un exercice est dans files de sa leçon'
);
select is(
  public.app_content(pg_temp.cid('c1')) -> 'exercises', 'null'::jsonb,
  'un chapitre n''a pas de liste d''exercices'
);
select is(
  (select array_agg((le ->> 'title') || ':' || (le ->> 'exerciseCount') order by c.n, l.m)
    from jsonb_array_elements(public.app_method(pg_temp.cid('m')) -> 'chapters') with ordinality c (ch, n)
    cross join lateral jsonb_array_elements(ch -> 'lessons') with ordinality l (le, m)),
  array['Souffle:1', 'Posture:2'],
  'app_method : chaque leçon donne son nombre d''exercices'
);
select ok(
  not (public.app_method(pg_temp.cid('m')) ? 'summary')
    and not (public.app_method(pg_temp.cid('m')) #> '{chapters,0,lessons,0}' ? 'exercises')
    and not (public.app_method(pg_temp.cid('m')) -> 'files' ? pg_temp.mid('fond')::text),
  'app_method : ni résumé, ni liste d''exercices, ni leurs images'
);
select pg_temp.as_person('reader');
select is(
  public.app_content(pg_temp.cid('e3')) -> 'locked', 'false'::jsonb,
  'lecteur « Complet » : l''exercice réservé est ouvert'
);

select pg_temp.as_postgres();
select ok(
  exists (select 1 from private.files_to_move() where media_id = pg_temp.mid('photo') and to_public),
  'l''image d''un exercice d''une leçon gratuite devient publique'
);
select ok(
  not exists (select 1 from private.files_to_move() where media_id = pg_temp.mid('vieux')),
  'celle d''un exercice d''une leçon réservée reste protégée'
);
select pg_temp.as_anon();
select ok(
  not private.reader_can_open(pg_temp.mid('vieux') || '/vieux.webp'),
  'anonyme : le fichier de l''exercice réservé ne se lit pas'
);
select pg_temp.as_person('reader');
select ok(
  private.reader_can_open(pg_temp.mid('vieux') || '/vieux.webp'),
  'lecteur « Complet » : il se lit'
);
select pg_temp.as_person('editor');
select is(
  (select array_agg(u.kind || ':' || u.in_draft || ':' || u.in_app || ':' || u.parent_title)
    from public.media_uses(pg_temp.mid('vieux')) u),
  array['exercise:true:true:Posture'],
  '« Où il est utilisé » : l''exercice, dans sa leçon'
);

-- ---------------------------------------------------------------------------------------------
-- Republier : un exercice inchangé garde sa version
-- ---------------------------------------------------------------------------------------------

select pg_temp.keep('e1', pg_temp.cited('e1'));
select pg_temp.keep('e3', pg_temp.cited('e3'));
select pg_temp.save('e3', pg_temp.draft(jsonb_build_array(
  pg_temp.image_block('00000000-0000-4000-8000-0000000005d1', pg_temp.mid('vieux'), 'Une chaise haute')),
  'Se tenir droit'));
select is(
  pg_temp.preview('m'), array['Se tenir droit:modified@Posture'],
  'publish_preview : seul l''exercice modifié'
);
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se republie');
select is(pg_temp.cited('e1'), pg_temp.kept('e1'), 'un exercice inchangé garde sa version');
select isnt(pg_temp.cited('e3'), pg_temp.kept('e3'), 'l''exercice modifié a une nouvelle version');

-- ---------------------------------------------------------------------------------------------
-- Nom d'un exercice dans une erreur ; titre obligatoire
-- ---------------------------------------------------------------------------------------------

select pg_temp.save('e3', pg_temp.draft(jsonb_build_array(
  pg_temp.image_block('00000000-0000-4000-8000-0000000005d1', pg_temp.mid('vieux'), 'Une chaise haute')),
  ''));
select is(
  split_part(pg_temp.error_of($$select pg_temp.publish('m')$$), ' | ', 2),
  'Chapitre 1, leçon 2, exercice 1 « Sans titre » : Donne un titre à l''exercice avant de '
    'publier la méthode.',
  'un exercice sans titre bloque la méthode, et l''erreur le nomme par sa place'
);
select pg_temp.save('e3', pg_temp.draft(jsonb_build_array(
  pg_temp.image_block('00000000-0000-4000-8000-0000000005d1', pg_temp.mid('vieux'), 'Une chaise haute')),
  'Se tenir droit'));

-- ---------------------------------------------------------------------------------------------
-- outline_reorder : un exercice change de leçon
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  pg_temp.reorder_request(jsonb_build_array(
    pg_temp.lesson_entry('l1', array['e4', 'e1', 'e2']),
    pg_temp.lesson_entry('l2', array['e3'])
  )),
  'un exercice passe dans une autre leçon, en tête'
);
select is(
  pg_temp.tree(),
  array['Depuis le modèle@Souffle#1', 'Inspirer@Souffle#2', 'Expirer@Souffle#3', 'Se tenir droit@Posture#1'],
  'sa leçon et sa place sont enregistrées'
);
select is(
  pg_temp.live_exercises('m'),
  array['Souffle:Inspirer', 'Posture:Se tenir droit, Depuis le modèle'],
  'l''app ne change pas avant la publication'
);
select is(pg_temp.preview('m'), array['Respirer:reordered'], 'publish_preview : rangé autrement');
select lives_ok(
  format('select public.outline_reorder(%L, %L::jsonb)', pg_temp.cid('m'),
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'),
      'lessonIds', jsonb_build_array(pg_temp.cid('l2'), pg_temp.cid('l1'))))),
  'l''ancienne forme de demande (sans les exercices) range les leçons'
);
select is(
  pg_temp.tree(),
  array['Se tenir droit@Posture#1', 'Depuis le modèle@Souffle#1', 'Inspirer@Souffle#2', 'Expirer@Souffle#3'],
  'et laisse les exercices dans leur leçon, à leur place'
);
select throws_ok(
  pg_temp.reorder_request(jsonb_build_array(
    pg_temp.lesson_entry('l2', array['e3']),
    pg_temp.lesson_entry('l1', array['e4', 'e1'])
  )),
  'P0001', 'plan_perime', 'un exercice manque à la demande : plan périmé'
);
select throws_ok(
  pg_temp.reorder_request(jsonb_build_array(jsonb_build_object('lessonId', pg_temp.cid('l1')))),
  'P0001', 'demande_invalide', 'une leçon sans exerciseIds : demande mal formée'
);
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se publie, rangée autrement');
select is(
  pg_temp.live_exercises('m'),
  array['Posture:Se tenir droit', 'Souffle:Depuis le modèle, Inspirer'],
  'l''exercice suit sa nouvelle leçon dans l''app'
);
select pg_temp.as_anon();
select is(
  (select jsonb_build_object('lessonId', x -> 'lessonId', 'level', x -> 'level')
    from public.app_content(pg_temp.cid('e4')) x),
  jsonb_build_object('lessonId', pg_temp.cid('l1'), 'level', null),
  'app_content : sa nouvelle leçon, et son niveau (gratuite)'
);
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Retrait de l'app ([D26]) ; corbeille ; restauration
-- ---------------------------------------------------------------------------------------------

select lives_ok(format('select public.unpublish(%L)', pg_temp.cid('e1')), 'un exercice est retiré de l''app');
select is(
  pg_temp.live_exercises('m'),
  array['Posture:Se tenir droit', 'Souffle:Depuis le modèle'],
  'le plan en ligne le perd aussitôt'
);
select is(
  (select array[(pg_temp.live('m')).origin, in_app::text] from public.contents where id = pg_temp.cid('e1')),
  array['outline', 'false'],
  'par une nouvelle version de la méthode (origine « plan ») ; « Montrer dans l''app » décoché'
);

select results_eq(
  format('select trashed from public.trash(%L)', pg_temp.cid('l1')), $$values (4)$$,
  'une leçon part à la corbeille avec ses trois exercices'
);
select is(pg_temp.live_exercises('m'), array['Posture:Se tenir droit'], 'hors du plan en ligne avec eux');
select is(
  (select array_agg(title || ':' || coalesce(parent_title, '-') || ':' || batch_root order by title)
    from public.trash_items where item_type = 'content'),
  array['Depuis le modèle:Respirer:false', 'Expirer:Respirer:false', 'Inspirer:Respirer:false',
    'Souffle:Respirer:true'],
  'la Corbeille : chaque exercice porte le titre de sa méthode ; la leçon est ce qu''on y a mis'
);
select results_eq(
  format('select restored from public.restore(%L)', pg_temp.cid('l1')), $$values (4)$$,
  'la leçon revient avec ses exercices'
);

select results_eq(
  format('select trashed from public.trash(%L)', pg_temp.cid('e3')), $$values (1)$$,
  'un exercice seul part à la corbeille'
);
select results_eq(
  format('select trashed from public.trash(%L)', pg_temp.cid('l2')), $$values (1)$$,
  'puis sa leçon'
);
select is(
  split_part(pg_temp.error_of(format('select public.restore(%L)', pg_temp.cid('e3'))), ' | ', 2),
  'Restaure d''abord la leçon « Posture ».',
  'l''exercice ne revient pas avant sa leçon'
);
select results_eq(
  format('select restored from public.restore(%L)', pg_temp.cid('l2')), $$values (1)$$,
  'la leçon revient'
);
select results_eq(
  format('select restored from public.restore(%L)', pg_temp.cid('e3')), $$values (1)$$,
  'puis l''exercice'
);
select is(
  (select array[position::text, in_app::text] from public.contents where id = pg_temp.cid('e3')),
  array['1', 'false'],
  'en fin de sa leçon (vide), « Montrer dans l''app » décoché'
);

-- ---------------------------------------------------------------------------------------------
-- Le plan figé est vérifié à l'insertion
-- ---------------------------------------------------------------------------------------------

-- Republier : Posture et Se tenir droit reviennent dans le plan en ligne (la corbeille a rendu
-- leurs verrous).
select public.lock_take(pg_temp.cid('e3'), false, null);
select public.lock_take(pg_temp.cid('l2'), false, null);
select pg_temp.save('e3', (select draft from public.contents where id = pg_temp.cid('e3')), '{"in_app": true}');
select pg_temp.save('l2', (select draft from public.contents where id = pg_temp.cid('l2')), '{"in_app": true}');
select pg_temp.publish('m');

select pg_temp.create_content('m2', 'method', content_title => 'Dormir');
select pg_temp.create_content('m2c', 'chapter', 'm2', 'Le soir');
select pg_temp.create_content('m2l', 'lesson', 'm2c', 'Le lit');
select pg_temp.create_content('m2e', 'exercise', 'm2l', 'Compter');
select pg_temp.as_postgres();

select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2'),
        'exercises', jsonb_build_array(
          jsonb_build_object('exerciseId', pg_temp.cid('e3'), 'versionId', pg_temp.cited('e3')))))))),
  'P0001', 'plan_accepte', 'témoin : un plan qui cite ses propres exercices passe le contrôle'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2')))))),
  'P0001', 'plan_accepte', 'témoin : une leçon d''un plan d''avant, sans "exercises", passe aussi'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2'),
        'exercises', jsonb_build_array(
          jsonb_build_object('exerciseId', pg_temp.cid('e3'), 'versionId', pg_temp.cited('e3')),
          jsonb_build_object('exerciseId', pg_temp.cid('e3'), 'versionId', pg_temp.cited('e3')))))))),
  'P0001', 'plan_invalide', 'un plan ne cite pas deux fois le même exercice'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L, %L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2'),
        'exercises', jsonb_build_array(jsonb_build_object(
          'exerciseId', pg_temp.cid('m2e'), 'versionId', '00000000-0000-4000-8000-0000000009e1')))))),
    'm2e', '00000000-0000-4000-8000-0000000009e1'),
  'P0001', 'plan_invalide', 'un plan ne cite pas l''exercice d''une autre méthode, même avec sa version'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2'),
        'exercises', jsonb_build_array(jsonb_build_object('exerciseId', pg_temp.cid('e3')))))))),
  'P0001', 'plan_invalide', 'un exercice sans version : plan mal formé'
);
select throws_ok(
  format('select pg_temp.try_outline(%L, %L)', 'm',
    jsonb_build_array(jsonb_build_object('chapterId', pg_temp.cid('c1'), 'versionId', pg_temp.cited('c1'),
      'lessons', jsonb_build_array(jsonb_build_object(
        'lessonId', pg_temp.cid('l2'), 'versionId', pg_temp.cited('l2'), 'exercises', '{}'::jsonb))))),
  'P0001', 'plan_invalide', '"exercises" qui n''est pas une liste : plan mal formé'
);

select * from finish();
rollback;

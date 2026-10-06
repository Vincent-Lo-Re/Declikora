-- Contenus : règles tenues par la base (docs/ARCHITECTURE-CONTENUS.md, § 1.5, § 1.6, § 3.2,
-- § 3.3, § 3.5 et § 6, « Étape 4 ») : création, forme et usage du brouillon, enregistrement
-- sous le verrou, réglages, catégories, sorte, corbeille, « Où il est utilisé » et retrait d'un
-- membre de l'équipe.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(97);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();

-- ---------------------------------------------------------------------------------------------
-- Aides de ce fichier
-- ---------------------------------------------------------------------------------------------

-- Les contenus créés par les RPC, par nom.
create temporary table ids (name text primary key, id uuid not null);
grant all on ids to public;

create function pg_temp.cid(content_name text)
returns uuid
language sql
stable
as $$
  select id from ids where name = content_name
$$;

-- Crée un contenu avec content_create (sous le rôle courant) et le range sous ce nom.
create function pg_temp.create_content(
  content_name text,
  content_kind text,
  content_title text default '',
  sort text default null,
  starter_name text default null,
  for_kind text default null
)
returns uuid
language plpgsql
as $$
declare
  created uuid;
begin
  select (public.content_create(
    kind => content_kind,
    title => content_title,
    template_sort => sort,
    from_template_id => pg_temp.cid(starter_name),
    template_for => for_kind
  )).id into created;
  insert into ids (name, id) values (content_name, created);
  return created;
end;
$$;

-- Révision actuelle d'un contenu (lue en postgres, sans les politiques).
create function pg_temp.rev(content_name text)
returns integer
language sql
stable
security definer
as $$
  select draft_rev from public.contents where id = pg_temp.cid(content_name)
$$;

-- Enregistre un brouillon (sous le rôle courant) à la révision actuelle.
create function pg_temp.save(content_name text, draft jsonb, settings jsonb default null)
returns integer
language sql
as $$
  select (public.save_draft(pg_temp.cid(content_name), pg_temp.rev(content_name), draft, settings)).draft_rev
$$;

-- Un brouillon avec ces blocs.
create function pg_temp.draft(blocks jsonb, title text default 'Titre', extra jsonb default '{}')
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('v', 1, 'title', title, 'blocks', blocks) || extra
$$;

-- Un bloc Texte d'un paragraphe.
create function pg_temp.text_block(id text, body text default 'Bonjour')
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', id, 'type', 'text',
    'doc', jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', body))
    )))
  )
$$;

-- Un bloc Image.
create function pg_temp.image_block(id text, media_id text)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', id, 'type', 'image', 'mediaId', media_id, 'caption', null, 'alt', null
  )
$$;

-- Message et détail de l'erreur levée par une commande (null si elle réussit).
create function pg_temp.error_of(command text)
returns text
language plpgsql
as $$
declare
  detail text;
begin
  execute command;
  return null;
exception
  when others then
    get stacked diagnostics detail = pg_exception_detail;
    return sqlerrm || ' | ' || coalesce(detail, '');
end;
$$;

grant execute on function
  pg_temp.cid(text),
  pg_temp.create_content(text, text, text, text, text, text),
  pg_temp.rev(text),
  pg_temp.save(text, jsonb, jsonb),
  pg_temp.draft(jsonb, text, jsonb),
  pg_temp.text_block(text, text),
  pg_temp.image_block(text, text),
  pg_temp.error_of(text)
to public;

-- Fichiers : une image prête, un SVG en vérification, une image dans la corbeille, un audio prêt.
insert into public.media (id, kind, name, path, mime, size_bytes, status, created_by) values
  ('10000000-0000-4000-8000-000000000001', 'image', 'lac.webp',
    '10000000-0000-4000-8000-000000000001/lac.webp', 'image/webp', 1000, 'ready',
    pg_temp.person_id('editor')),
  ('10000000-0000-4000-8000-000000000002', 'svg', 'logo.svg',
    '10000000-0000-4000-8000-000000000002/logo.svg', 'image/svg+xml', 1000, 'checking',
    pg_temp.person_id('editor')),
  ('10000000-0000-4000-8000-000000000003', 'image', 'vieux.webp',
    '10000000-0000-4000-8000-000000000003/vieux.webp', 'image/webp', 1000, 'ready',
    pg_temp.person_id('editor')),
  ('10000000-0000-4000-8000-000000000004', 'audio', 'voix.mp3',
    '10000000-0000-4000-8000-000000000004/voix.mp3', 'audio/mpeg', 1000, 'ready',
    pg_temp.person_id('editor'));
update public.media set deleted_at = now(), deleted_by = pg_temp.person_id('editor')
where id = '10000000-0000-4000-8000-000000000003';

-- Catégories : une du Blog, une des Podcasts.
insert into public.categories (id, section, name) values
  ('30000000-0000-4000-8000-000000000001', 'blog', 'Sommeil'),
  ('30000000-0000-4000-8000-000000000002', 'podcasts', 'Entretiens');

-- ---------------------------------------------------------------------------------------------
-- content_create
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');

select lives_ok($$select pg_temp.create_content('page', 'page', content_title => 'Aide')$$, 'une page est créée');
select is(
  (select draft from public.contents where id = pg_temp.cid('page')),
  '{"v":1,"title":"Aide","cover":null,"audio":null,"blocks":[]}'::jsonb,
  'création : brouillon vide avec le titre donné'
);
select is(
  (select array[draft_rev::text, created_by::text, draft_saved_by::text, title, kind]
    from public.contents where id = pg_temp.cid('page')),
  array['1', pg_temp.person_id('editor')::text, pg_temp.person_id('editor')::text, 'Aide', 'page'],
  'création : révision 1, auteur, titre et sorte'
);
select is(
  (select holder_id from public.edit_locks where content_id = pg_temp.cid('page')),
  pg_temp.person_id('editor'),
  'création : l''auteur tient aussitôt le verrou'
);
select lives_ok(
  $$select pg_temp.create_content('article', 'article', content_title => e'  Café  ')$$,
  'un article est créé'
);
select is(
  (select title from public.contents where id = pg_temp.cid('article')),
  normalize('Café', NFC),
  'création : titre nettoyé (espaces autour, Unicode composé)'
);
select lives_ok($$select pg_temp.create_content('episode', 'episode')$$, 'un épisode est créé');
select throws_ok(
  $$select public.content_create('video')$$, 'P0001', 'sorte_invalide', 'sorte inconnue refusée'
);
select throws_ok(
  $$select public.content_create('template')$$, 'P0001', 'sorte_invalide',
  'un modèle sans sorte de modèle est refusé'
);
select throws_ok(
  $$select public.content_create('page', template_sort => 'style')$$, 'P0001', 'sorte_invalide',
  'une sorte de modèle sur une page est refusée'
);
select throws_ok(
  $$select public.content_create('template', template_sort => 'autre')$$, 'P0001', 'sorte_invalide',
  'sorte de modèle inconnue refusée'
);
select throws_ok(
  $$select public.content_create('page', title => repeat('a', 201))$$, 'P0001', 'demande_invalide',
  'titre de 201 caractères refusé'
);
select lives_ok(
  $$select pg_temp.create_content('style', 'template', sort => 'style')$$,
  'un modèle « mise en forme » est créé'
);
select lives_ok(
  $$select pg_temp.create_content('shared', 'template', sort => 'shared')$$,
  'un modèle « bloc partagé » est créé'
);
select lives_ok(
  $$select pg_temp.create_content('starter', 'template', content_title => 'Interview', sort => 'starter', for_kind => 'article')$$,
  'un modèle « point de départ » (des articles, [D42]) est créé'
);

-- Point de départ : ses blocs sont recopiés avec de nouveaux identifiants, encadrés compris.
select lives_ok(
  $$select pg_temp.save('starter', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001', 'Question'),
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000002', 'type', 'box', 'look', 'fill',
      'blocks', jsonb_build_array(
        pg_temp.image_block('00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001')
      ))
  ), 'Interview'))$$,
  'le point de départ reçoit ses blocs'
);
select lives_ok(
  $$select pg_temp.create_content('from-starter', 'article', content_title => 'Entretien', starter_name => 'starter')$$,
  'un article est créé depuis le point de départ'
);
select is(
  (select jsonb_build_array(
      draft ->> 'title',
      draft #>> '{blocks,0,doc,content,0,content,0,text}',
      draft #>> '{blocks,1,blocks,0,mediaId}'
    )
    from public.contents where id = pg_temp.cid('from-starter')),
  '["Entretien", "Question", "10000000-0000-4000-8000-000000000001"]'::jsonb,
  'point de départ : blocs recopiés, titre du nouveau contenu'
);
select ok(
  (select draft #>> '{blocks,0,id}' <> '00000000-0000-4000-8000-000000000001'
      and draft #>> '{blocks,1,id}' <> '00000000-0000-4000-8000-000000000002'
      and draft #>> '{blocks,1,blocks,0,id}' <> '00000000-0000-4000-8000-000000000003'
      and draft #>> '{blocks,1,blocks,0,id}' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    from public.contents where id = pg_temp.cid('from-starter')),
  'point de départ : nouveaux identifiants, dans les encadrés aussi'
);
select is(
  (select draft_media_ids from public.contents where id = pg_temp.cid('from-starter')),
  array['10000000-0000-4000-8000-000000000001'::uuid],
  'point de départ : les fichiers de la copie sont suivis'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'article', starter_name => 'style')$$, 'P0001',
  'modele_indisponible', 'un modèle « mise en forme » n''est pas un point de départ'
);
select throws_ok(
  $$select pg_temp.create_content('x', 'template', sort => 'style', starter_name => 'starter')$$,
  'P0001', 'modele_indisponible', 'un modèle ne se crée pas depuis un point de départ'
);

-- ---------------------------------------------------------------------------------------------
-- Forme du brouillon
-- ---------------------------------------------------------------------------------------------

select is(
  pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001')
  ), 'Aide')),
  2,
  'enregistrement : la révision augmente'
);
select matches(
  pg_temp.error_of($$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'box', 'look', 'fill',
      'blocks', jsonb_build_array(jsonb_build_object(
        'id', '00000000-0000-4000-8000-000000000002', 'type', 'box', 'look', 'border', 'blocks', '[]'::jsonb
      )))
  )))$$),
  '^forme_invalide \| .*"box" is not one of \["text","image"\]',
  'encadré dans un encadré refusé, avec un message précis'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'box', 'look', 'fill',
      'blocks', jsonb_build_array(jsonb_build_object(
        'id', '00000000-0000-4000-8000-000000000002', 'type', 'linked',
        'templateId', pg_temp.cid('shared')
      )))
  )))$$,
  'P0001', 'forme_invalide', 'bloc lié dans un encadré refusé'
);
select matches(
  pg_temp.error_of($$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001', 'type', 'text',
    'doc', '{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Titre"}]}]}'::jsonb
  ))))$$),
  '^forme_invalide \| .*1 is not one of \[2,3\]',
  'titre de niveau 1 refusé'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001', 'type', 'text',
    'doc', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"clic","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}'::jsonb
  ))))$$,
  'P0001', 'forme_invalide', 'lien javascript: refusé'
);
select throws_ok(
  $$select pg_temp.save('page', '{"v":1,"blocks":[]}')$$, 'P0001', 'forme_invalide',
  'brouillon sans titre refusé'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001'),
    pg_temp.text_block('00000000-0000-4000-8000-000000000001')
  )))$$,
  'P0001', 'id_en_double', 'deux blocs avec le même identifiant refusés'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001'),
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000002', 'type', 'box', 'look', 'fill',
      'blocks', jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-000000000001')))
  )))$$,
  'P0001', 'id_en_double', 'identifiant en double entre la page et un encadré refusé'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002')
  )))$$,
  'P0001', 'fichier_indisponible', 'fichier en vérification refusé'
);
select matches(
  pg_temp.error_of($$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003')
  )))$$),
  '^fichier_indisponible \| .*vieux\.webp',
  'fichier dans la corbeille refusé, et nommé'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide',
    '{"cover": {"mediaId": "10000000-0000-4000-8000-0000000000ff"}}'))$$,
  'P0001', 'fichier_indisponible', 'image de présentation inconnue refusée'
);
select lives_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000001', null),
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000002', 'type', 'box', 'look', 'border',
      'blocks', jsonb_build_array(
        pg_temp.image_block('00000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001')
      ))
  ), 'Aide', '{"audio": {"mediaId": "10000000-0000-4000-8000-000000000004"}}'))$$,
  'image sans fichier, image prête dans un encadré et son : accepté'
);
select is(
  (select draft_media_ids from public.contents where id = pg_temp.cid('page')),
  array['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004']::uuid[],
  'draft_media_ids : tous les mediaId, encadrés et son compris'
);
select lives_ok(
  $$select pg_temp.save('shared', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001', 'Écris-nous')
  ), 'Contact'))$$,
  'le modèle « bloc partagé » reçoit son bloc'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'linked',
      'templateId', pg_temp.cid('shared'))
  ), 'Café'))$$,
  'bloc lié à un modèle « bloc partagé » accepté'
);
select is(
  (select draft_template_ids from public.contents where id = pg_temp.cid('article')),
  array[pg_temp.cid('shared')],
  'draft_template_ids : le modèle cité'
);
select throws_ok(
  $$select pg_temp.save('episode', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'linked',
      'templateId', pg_temp.cid('style'))
  )))$$,
  'P0001', 'modele_indisponible', 'bloc lié à un modèle « mise en forme » refusé'
);
select throws_ok(
  $$select pg_temp.save('episode', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'linked',
      'templateId', pg_temp.cid('page'))
  )))$$,
  'P0001', 'modele_indisponible', 'bloc lié à autre chose qu''un modèle refusé'
);
select throws_ok(
  $$select pg_temp.save('style', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000001', 'type', 'linked',
      'templateId', pg_temp.cid('shared'))
  )))$$,
  'P0001', 'forme_invalide', 'bloc lié dans un modèle refusé (variante template)'
);
select throws_ok(
  $$select pg_temp.save('episode', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001', repeat('a', 270000))
  )))$$,
  'P0001', 'brouillon_trop_lourd', 'brouillon de plus de 256 Ko refusé'
);
select lives_ok(
  $$select pg_temp.save('episode', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001', repeat('a', 240000))
  )))$$,
  'brouillon de 240 000 caractères accepté'
);

-- Au-delà d'une trentaine de niveaux de listes, pg_jsonschema ne sait plus relire le document.
create function pg_temp.deep_draft(depth integer)
returns jsonb
language plpgsql
immutable
as $$
declare
  item jsonb := '{"type":"listItem","content":[{"type":"paragraph"}]}';
begin
  for i in 1..depth loop
    item := jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(
      '{"type":"paragraph"}'::jsonb,
      jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(item))
    ));
  end loop;
  return pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000001', 'type', 'text',
    'doc', jsonb_build_object('type', 'doc', 'content', jsonb_build_array(
      jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(item))
    ))
  )));
end;
$$;
grant execute on function pg_temp.deep_draft(integer) to public;
select lives_ok($$select pg_temp.save('episode', pg_temp.deep_draft(25))$$, '25 niveaux de listes acceptés');
select throws_ok(
  $$select pg_temp.save('episode', pg_temp.deep_draft(40))$$, 'P0001', 'brouillon_trop_imbrique',
  '40 niveaux de listes refusés (brouillon_trop_imbrique)'
);

-- ---------------------------------------------------------------------------------------------
-- Enregistrement : verrou, révision, corbeille
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$select public.save_draft(pg_temp.cid('page'), 1, pg_temp.draft('[]'))$$, 'P0001',
  'conflit_revision', 'révision périmée refusée (conflit_revision)'
);
select throws_ok(
  $$select public.save_draft('20000000-0000-4000-8000-0000000000ff', 1, pg_temp.draft('[]'))$$,
  'P0001', 'contenu_introuvable', 'contenu inconnu refusé'
);
select throws_ok(
  $$select public.save_draft(pg_temp.cid('page'), 1, null)$$, 'P0001', 'demande_invalide',
  'brouillon manquant refusé'
);
select throws_ok(
  $$select public.save_draft(pg_temp.cid('page'), pg_temp.rev('page'), pg_temp.draft('[]'), '[]')$$,
  'P0001', 'demande_invalide', 'réglages qui ne sont pas un objet refusés'
);
select is(
  (select array[l.draft_rev, c.draft_rev] from public.edit_locks l
    join public.contents c on c.id = l.content_id where c.id = pg_temp.cid('page')),
  array[3, 3],
  'enregistrement : la révision est recopiée dans le verrou (Realtime)'
);

select pg_temp.as_person('editor2');
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Pris'))$$, 'P0001', 'verrou_perdu',
  'enregistrement refusé sans le verrou (verrou_perdu)'
);

-- ---------------------------------------------------------------------------------------------
-- Réglages (sous le verrou, par save_draft)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"slug": "cafe"}')$$,
  'P0001', 'reglages_invalides', 'adresse refusée sur un article'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"slug": "Aide !"}')$$,
  'P0001', 'adresse_invalide', 'adresse mal formée refusée'
);
select lives_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"slug": "aide"}')$$,
  'page : adresse enregistrée'
);
select lives_ok($$select pg_temp.create_content('page2', 'page')$$, 'une seconde page');
select throws_ok(
  $$select pg_temp.save('page2', pg_temp.draft('[]'), '{"slug": "aide"}')$$,
  'P0001', 'adresse_prise', 'adresse déjà prise par une autre page refusée'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"access_level_id": "30000000-0000-4000-8000-000000000001"}')$$,
  'P0001', 'niveau_invalide', 'niveau d''accès : une formule qui n''existe pas est refusée (étape 5)'
);
select lives_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"access_level_id": null}')$$,
  'niveau d''accès null (gratuit) accepté'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"couleur": "bleu"}')$$,
  'P0001', 'reglages_invalides', 'réglage inconnu refusé'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'), '{"slug": 5}')$$,
  'P0001', 'reglages_invalides', 'réglage du mauvais type refusé'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'),
    '{"category_ids": ["30000000-0000-4000-8000-000000000001"]}')$$,
  'article : catégorie du Blog acceptée'
);
select is(
  (select array_agg(category_id) from public.content_categories where content_id = pg_temp.cid('article')),
  array['30000000-0000-4000-8000-000000000001'::uuid],
  'article : catégorie enregistrée'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'))$$,
  'sans la clé category_ids, les catégories ne changent pas'
);
select is(
  (select count(*)::int from public.content_categories where content_id = pg_temp.cid('article')),
  1,
  'catégories gardées quand la clé est absente'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'),
    '{"category_ids": ["30000000-0000-4000-8000-000000000002"]}')$$,
  'P0001', 'categorie_invalide', 'article : catégorie des Podcasts refusée'
);
select throws_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'),
    '{"category_ids": ["30000000-0000-4000-8000-000000000001"]}')$$,
  'P0001', 'categorie_invalide', 'page : aucune catégorie'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'),
    '{"category_ids": ["30000000-0000-4000-8000-0000000000ff"]}')$$,
  'P0001', 'categorie_invalide', 'catégorie inconnue refusée'
);
select lives_ok(
  $$select pg_temp.save('episode', pg_temp.draft('[]'),
    '{"category_ids": ["30000000-0000-4000-8000-000000000002"]}')$$,
  'épisode : catégorie des Podcasts acceptée'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"category_ids": []}')$$,
  'article : liste vide'
);
select is(
  (select count(*)::int from public.content_categories where content_id = pg_temp.cid('article')),
  0,
  'article : catégories retirées'
);

-- ---------------------------------------------------------------------------------------------
-- Sorte et contraintes (écritures de la base elle-même, en postgres)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_postgres();
select throws_ok(
  $$update public.contents set kind = 'page' where id = pg_temp.cid('article')$$,
  'P0001', 'sorte_immuable', 'la sorte d''un contenu ne change pas'
);
select throws_ok(
  $$update public.contents set template_sort = 'shared' where id = pg_temp.cid('style')$$,
  'P0001', 'sorte_immuable', 'la sorte d''un modèle ne change pas'
);
select throws_ok(
  $$update public.contents set live_version_id = gen_random_uuid() where id = pg_temp.cid('style')$$,
  '23514', null, 'un modèle n''a pas de version en ligne (check)'
);
select throws_ok(
  $$update public.contents set draft = '{"v":1,"title":"x","blocks":[]}' || jsonb_build_object('summary', repeat('a', 262200))
    where id = pg_temp.cid('article')$$,
  'P0001', 'brouillon_trop_lourd', 'la taille est vérifiée aussi hors de save_draft'
);
select throws_ok(
  $$insert into public.content_categories (content_id, category_id)
    values (pg_temp.cid('page'), '30000000-0000-4000-8000-000000000001')$$,
  'P0001', 'categorie_invalide', 'catégorie sur une page refusée (déclencheur)'
);
select throws_ok(
  $$update public.categories set section = 'podcasts' where id = '30000000-0000-4000-8000-000000000001'$$,
  'P0001', 'categorie_invalide', 'la section d''une catégorie ne change pas'
);
select throws_ok(
  $$insert into public.categories (section, name) values ('blog', ' sommeil ')$$,
  '23505', null, 'deux catégories du même nom dans une section refusées (casse et espaces ignorées)'
);
insert into public.categories (section, name) values ('blog', e'  Méditation ');
select is(
  (select name || ':' || position from public.categories where section = 'blog' and name <> 'Sommeil'),
  normalize('Méditation', NFC) || ':1',
  'catégorie : nom nettoyé, en fin de liste de sa section'
);

-- La seconde page va à la corbeille.
update public.contents
set deleted_at = now(), deleted_by = pg_temp.person_id('editor'), trash_batch = gen_random_uuid()
where id = pg_temp.cid('page2');

-- ---------------------------------------------------------------------------------------------
-- Corbeille : un contenu dans la corbeille ne change pas
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$update public.contents set draft = '{"v":1,"title":"Changé","blocks":[]}' where id = pg_temp.cid('page2')$$,
  'P0001', 'dans_la_corbeille', 'le brouillon d''un contenu dans la corbeille ne change pas'
);
select throws_ok(
  $$update public.contents set slug = 'autre' where id = pg_temp.cid('page2')$$,
  'P0001', 'dans_la_corbeille', 'ses réglages non plus'
);
select set_config('declikora.detach_all', 'on', true);
select lives_ok(
  $$update public.contents set draft = '{"v":1,"title":"Détaché","blocks":[]}', draft_rev = draft_rev + 1
    where id = pg_temp.cid('page2')$$,
  '« Détacher partout » peut changer le brouillon d''un contenu dans la corbeille'
);
select throws_ok(
  $$update public.contents set slug = 'autre' where id = pg_temp.cid('page2')$$,
  'P0001', 'dans_la_corbeille', '« Détacher partout » ne change que le brouillon'
);
select set_config('declikora.detach_all', '', true);
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.save('page2', pg_temp.draft('[]'))$$, 'P0001', 'dans_la_corbeille',
  'save_draft refusé sur un contenu dans la corbeille'
);

-- ---------------------------------------------------------------------------------------------
-- « Où il est utilisé » : les brouillons, corbeille et modèles compris
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.save('page', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')
  ), 'Aide', '{"audio": {"mediaId": "10000000-0000-4000-8000-000000000004"}}'))$$,
  'la page cite de nouveau l''image et le son'
);
select is(
  (select array_agg(u.title || ':' || u.kind || ':' || u.in_draft || ':' || u.in_app order by u.title)
    from public.media_uses('10000000-0000-4000-8000-000000000001') u),
  array['Aide:page:true:false', 'Entretien:article:true:false', 'Interview:template:true:false'],
  'media_uses : les brouillons et les modèles qui citent le fichier'
);
select throws_ok(
  $$select public.media_trash('10000000-0000-4000-8000-000000000001')$$, 'P0001', 'fichier_utilise',
  'un fichier cité par un brouillon ne va pas à la corbeille'
);
select is(
  (select array_agg(u.title order by u.title)
    from public.media_uses('10000000-0000-4000-8000-000000000004') u),
  array['Aide'],
  'media_uses : le son d''un brouillon compte aussi'
);
select lives_ok(
  $$select pg_temp.save('page', pg_temp.draft('[]', 'Aide'))$$, 'la page ne cite plus aucun fichier'
);
select lives_ok(
  $$select public.media_trash('10000000-0000-4000-8000-000000000004')$$,
  'le fichier qui n''est plus cité va à la corbeille'
);
select pg_temp.as_postgres();
update public.contents
set deleted_at = now(), deleted_by = pg_temp.person_id('editor'), trash_batch = gen_random_uuid()
where id = pg_temp.cid('from-starter');
select is(
  (select array_agg(u.title order by u.title)
    from private.media_uses('10000000-0000-4000-8000-000000000001') u),
  array['Entretien', 'Interview'],
  'media_uses : un brouillon dans la corbeille compte encore'
);
select throws_ok(
  $$delete from public.media where id = '10000000-0000-4000-8000-000000000001'$$,
  'P0001', 'fichier_utilise', 'un fichier cité ne s''efface pas (seconde ligne de défense)'
);

-- ---------------------------------------------------------------------------------------------
-- Retirer un membre qui a créé et mis un contenu à la corbeille
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor2');
select lives_ok(
  $$select pg_temp.create_content('parti', 'article', content_title => 'Écrit par un membre parti')$$,
  'un autre éditeur crée un article'
);
select lives_ok(
  $$select pg_temp.save('parti', pg_temp.draft('[]', 'Écrit par un membre parti'))$$,
  'et l''enregistre'
);
select pg_temp.as_postgres();
update public.contents
set deleted_at = now(), deleted_by = pg_temp.person_id('editor2'), trash_batch = gen_random_uuid()
where id = pg_temp.cid('parti');
create temporary table before_removal as
select to_jsonb(c) - array['created_by', 'draft_saved_by', 'deleted_by'] as row_data
from public.contents c where c.id = pg_temp.cid('parti');

select lives_ok(
  $$delete from auth.users where id = pg_temp.person_id('editor2')$$,
  'retirer le membre (son compte) est permis'
);
select is(
  (select array[created_by, draft_saved_by, deleted_by] from public.contents where id = pg_temp.cid('parti')),
  array[null, null, null]::uuid[],
  'retrait d''un membre : les colonnes d''auteur passent à null'
);
select is(
  (select to_jsonb(c) - array['created_by', 'draft_saved_by', 'deleted_by']
    from public.contents c where c.id = pg_temp.cid('parti')),
  (select row_data from before_removal),
  'retrait d''un membre : rien d''autre ne change (le contenu reste dans la corbeille)'
);
select is(
  (select holder_id from public.edit_locks where content_id = pg_temp.cid('parti')),
  null,
  'retrait d''un membre : ses verrous sont libérés (la ligne reste)'
);

select * from finish();
rollback;

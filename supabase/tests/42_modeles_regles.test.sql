-- Modèles de blocs (étape 6) : règles tenues par la base (docs/ARCHITECTURE-CONTENUS.md, § 2.5,
-- § 3.2, § 3.4, § 3.5, « Étape 6 », D11 et D42) : section d'un point de départ, sorte fixe, un
-- seul bloc dans un bloc partagé (qui naît vide et ne s'insère pas tant qu'il l'est),
-- pas de bloc lié dans un modèle ni dans un encadré, « Enregistrer comme modèle », mise à jour
-- dans l'app (template_outdated ignore les id ; template_push part de la version en ligne et ne
-- publie pas le reste du brouillon), détachement dans un contenu publié, « Détacher partout »
-- (refusé si un autre écrit, possible dans la corbeille), suppression refusée puis permise, et
-- « Revenir à cette version » (lien rétabli, ou marqueur retiré).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(136);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- ---------------------------------------------------------------------------------------------
-- Aides de ce fichier
-- ---------------------------------------------------------------------------------------------

-- Un modèle (sous le rôle courant, qui tient ensuite son verrou), rangé sous ce nom.
create function pg_temp.create_template(
  content_name text,
  content_title text,
  sort text,
  for_kind text default null
)
returns uuid
language plpgsql
as $$
declare
  created uuid;
begin
  select (public.content_create(
    kind => 'template', title => content_title, template_sort => sort, template_for => for_kind
  )).id into created;
  insert into ids (name, id) values (content_name, created);
  return created;
end;
$$;

-- Un bloc lié à un modèle nommé.
create function pg_temp.linked(id text, template_name text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object('id', id, 'type', 'linked', 'templateId', pg_temp.cid(template_name))
$$;

-- Le bloc du modèle « Contact » : un encadré avec un texte et l'image « photo » (qui suit la
-- médiathèque : alt null), avec ces identifiants.
create function pg_temp.contact_block(body text, box_id text, text_id text, image_id text)
returns jsonb
language sql
stable
as $$
  select pg_temp.box_block(box_id, jsonb_build_array(
    pg_temp.text_block(text_id, body),
    pg_temp.image_block(image_id, pg_temp.mid('photo'))
  ))
$$;

-- La copie publiée de ce bloc pour le bloc lié linked_id (§ 2.4) : id intérieurs tirés du bloc
-- lié, texte alternatif résolu (« Un chat ») et marqués.
create function pg_temp.contact_copy(body text, linked_id text, text_id text, image_id text)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', linked_id, 'type', 'box', 'look', 'fill', 'templateId', pg_temp.cid('contact'),
    'blocks', jsonb_build_array(
      pg_temp.text_block(md5(linked_id || '/' || text_id)::uuid::text, body),
      jsonb_build_object(
        'id', md5(linked_id || '/' || image_id)::uuid::text, 'type', 'image',
        'mediaId', pg_temp.mid('photo'), 'caption', null, 'alt', 'Un chat', 'altFromLibrary', true
      )
    )
  )
$$;

-- Le texte du premier bloc d'un encadré (ou d'un texte) d'un corps ou d'un brouillon.
create function pg_temp.text_of(block jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    block #>> '{blocks,0,doc,content,0,content,0,text}',
    block #>> '{doc,content,0,content,0,text}'
  )
$$;

-- Toutes les révisions de la base (lues sans les politiques) : pour vérifier qu'un refus ne
-- change rien.
create function pg_temp.version_count()
returns integer
language sql
stable
security definer
as $$
  select count(*)::int from public.versions
$$;

grant execute on function
  pg_temp.create_template(text, text, text, text),
  pg_temp.linked(text, text),
  pg_temp.contact_block(text, text, text, text),
  pg_temp.contact_copy(text, text, text, text),
  pg_temp.text_of(jsonb),
  pg_temp.version_count()
to public;

select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Section d'un point de départ ([D42])
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$select public.content_create('template', template_sort => 'starter')$$, 'P0001', 'sorte_invalide',
  'un point de départ sans section est refusé'
);
select throws_ok(
  $$select public.content_create('template', template_sort => 'style', template_for => 'page')$$,
  'P0001', 'sorte_invalide', 'une section sur une mise en forme est refusée'
);
select throws_ok(
  $$select public.content_create('page', template_for => 'page')$$, 'P0001', 'sorte_invalide',
  'une section sur une page est refusée'
);
select throws_ok(
  $$select public.content_create('template', template_sort => 'starter', template_for => 'method')$$,
  'P0001', 'sorte_invalide', 'une sorte inconnue n''a pas de point de départ'
);
select lives_ok(
  $$select pg_temp.create_template('depart_page', 'Interview', 'starter', 'page')$$,
  'un point de départ des pages'
);
select lives_ok(
  $$select pg_temp.save('depart_page', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000901', 'Question'),
    pg_temp.box_block('00000000-0000-4000-8000-000000000902', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000903', 'Réponse')))
  ), 'Interview'))$$,
  'le point de départ reçoit ses blocs'
);
select lives_ok(
  $$select pg_temp.create_template('depart_article', 'Recette', 'starter', 'article')$$,
  'un point de départ des articles'
);
select is(
  (select array[template_sort, template_for] from public.contents where id = pg_temp.cid('depart_page')),
  array['starter', 'page'],
  'la section du point de départ est enregistrée'
);
select lives_ok(
  $$insert into ids select 'depuis_depart', (public.content_create('page', title => 'Entretien',
    from_template_id => pg_temp.cid('depart_page'))).id$$,
  'une page se crée depuis un point de départ des pages'
);
select is(
  (select jsonb_build_array(pg_temp.text_of(draft -> 'blocks' -> 0), pg_temp.text_of(draft -> 'blocks' -> 1),
      draft #>> '{blocks,0,id}' <> '00000000-0000-4000-8000-000000000901',
      draft #>> '{blocks,1,blocks,0,id}' <> '00000000-0000-4000-8000-000000000903')
    from public.contents where id = pg_temp.cid('depuis_depart')),
  '["Question", "Réponse", true, true]'::jsonb,
  'point de départ : blocs recopiés avec de nouveaux identifiants'
);
select throws_ok(
  $$select public.content_create('article', from_template_id => pg_temp.cid('depart_page'))$$,
  'P0001', 'modele_indisponible', 'un point de départ des pages ne crée pas un article'
);
select throws_ok(
  $$select public.content_create('page', from_template_id => pg_temp.cid('depart_article'))$$,
  'P0001', 'modele_indisponible', 'un point de départ des articles ne crée pas une page'
);

select pg_temp.as_postgres();
select throws_ok(
  $$update public.contents set template_for = 'article' where id = pg_temp.cid('depart_page')$$,
  'P0001', 'sorte_immuable', 'la section d''un point de départ ne change pas'
);
select throws_ok(
  $$update public.contents set template_sort = 'style' where id = pg_temp.cid('depart_page')$$,
  'P0001', 'sorte_immuable', 'la sorte d''un modèle ne change pas'
);
select throws_ok(
  $$insert into public.contents (kind, draft, template_sort)
    values ('template', private.empty_draft('Sans section'), 'starter')$$,
  '23514', null, 'la base refuse un point de départ sans section (contrainte)'
);
select throws_ok(
  $$insert into public.contents (kind, draft, template_sort, template_for)
    values ('template', private.empty_draft('Mise en forme'), 'style', 'page')$$,
  '23514', null, 'la base refuse une section sur un autre modèle (contrainte)'
);

-- ---------------------------------------------------------------------------------------------
-- Bloc partagé : un seul bloc ([D11])
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select lives_ok(
  $$select pg_temp.create_template('contact', 'Contact', 'shared')$$,
  'un bloc partagé est créé'
);
select is(
  (select jsonb_array_length(draft -> 'blocks') from public.contents where id = pg_temp.cid('contact')),
  0, 'il naît vide'
);
select lives_ok(
  $$select pg_temp.create_content('p1', 'page', content_title => 'Accueil')$$, 'une page'
);
select matches(
  pg_temp.error_of($$select pg_temp.save('p1', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000d02', 'contact'))))$$),
  '^modele_vide \| .*Contact',
  'un bloc partagé vide ne s''insère pas (modele_vide, et il est nommé)'
);
select is(
  pg_temp.facts_of($$select pg_temp.save('p1', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000d02', 'contact'))))$$),
  '{"code": "modele_vide", "hint": ["Contact"]}'::jsonb,
  'modele_vide : hint, les titres des modèles en tableau JSON'
);
select throws_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000a02', 'Un'),
    pg_temp.text_block('00000000-0000-4000-8000-000000000a04', 'Deux')), 'Contact'))$$,
  'P0001', 'modele_un_seul_bloc', 'deux blocs dans un bloc partagé : refusé'
);
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Écris-nous',
    '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02',
    '00000000-0000-4000-8000-000000000a03')), 'Contact'))$$,
  'un seul bloc (un encadré qui en regroupe plusieurs) : accepté'
);
select lives_ok(
  $$select pg_temp.save('p1', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000d01', 'Bonjour'),
    pg_temp.linked('00000000-0000-4000-8000-000000000d02', 'contact')), 'Accueil'),
    '{"slug": "accueil", "access_level_id": null}')$$,
  'le bloc partagé, maintenant rempli, s''insère'
);
select matches(
  pg_temp.error_of($$select pg_temp.save('contact', pg_temp.draft('[]', 'Contact'))$$),
  '^modele_utilise \| .*Accueil',
  'un bloc partagé utilisé garde son bloc (modele_utilise, avec la liste)'
);
select is(
  pg_temp.facts_of($$select pg_temp.save('contact', pg_temp.draft('[]', 'Contact'))$$),
  '{"code": "modele_utilise", "hint": ["Accueil"]}'::jsonb,
  'modele_utilise (brouillon) : hint, les titres des contenus en tableau JSON'
);
select lives_ok(
  $$select pg_temp.create_template('libre', 'Libre', 'shared')$$, 'un autre bloc partagé'
);
select lives_ok(
  $$select pg_temp.save('libre', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000b91', 'Libre')), 'Libre'))$$,
  'il reçoit son bloc'
);
select lives_ok(
  $$select pg_temp.save('libre', pg_temp.draft('[]', 'Libre'))$$,
  'inutilisé, il peut être vidé'
);
select throws_ok(
  $$select pg_temp.save('libre', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000b92', 'contact')), 'Libre'))$$,
  'P0001', 'forme_invalide', 'pas de bloc lié dans un modèle'
);
select throws_ok(
  $$select pg_temp.save('p1', pg_temp.draft(jsonb_build_array(
    pg_temp.box_block('00000000-0000-4000-8000-000000000d09', jsonb_build_array(
      pg_temp.linked('00000000-0000-4000-8000-000000000d08', 'contact'))))))$$,
  'P0001', 'forme_invalide', 'pas de bloc lié dans un encadré'
);

-- ---------------------------------------------------------------------------------------------
-- « Enregistrer comme modèle » (template_create_from)
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.create_content('source', 'article', content_title => 'Source')$$, 'un article'
);
select lives_ok(
  $$select pg_temp.save('source', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000c01', 'À retenir'),
    pg_temp.box_block('00000000-0000-4000-8000-000000000c02', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000c03', 'Dans l''encadré'))),
    pg_temp.linked('00000000-0000-4000-8000-000000000c04', 'contact'),
    pg_temp.image_block('00000000-0000-4000-8000-000000000c05', pg_temp.mid('fond'))), 'Source'))$$,
  'son brouillon : texte, encadré, bloc lié, image'
);
create temporary table source_rev on commit drop as select pg_temp.rev('source') as rev;
select lives_ok(
  $$insert into ids select 'retenir', (public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c04', '00000000-0000-4000-8000-000000000c01']::uuid[],
    e'  À retenir  ', 'style')).id$$,
  'une mise en forme faite de deux blocs choisis'
);
select is(
  (select array[kind, template_sort, coalesce(template_for, 'aucune'), title, created_by::text]
    from public.contents where id = pg_temp.cid('retenir')),
  array['template', 'style', 'aucune', normalize('À retenir', NFC), pg_temp.person_id('editor')::text],
  'modèle créé : sorte, sans section, nom nettoyé, auteur'
);
select is(
  (select jsonb_build_array(draft #>> '{blocks,0,type}', pg_temp.text_of(draft -> 'blocks' -> 0),
      draft #>> '{blocks,1,type}', pg_temp.text_of(draft -> 'blocks' -> 1), draft #> '{blocks,1}' ? 'templateId')
    from public.contents where id = pg_temp.cid('retenir')),
  '["text", "À retenir", "box", "Écris-nous", false]'::jsonb,
  'dans l''ordre du brouillon ; le bloc lié devient une copie ordinaire du bloc du modèle'
);
select is(
  (select count(*)::int
    from public.contents c,
      jsonb_path_query(c.draft, 'strict $.**.id') i
    where c.id = pg_temp.cid('retenir')
      and i #>> '{}' in ('00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000c04',
        '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02',
        '00000000-0000-4000-8000-000000000a03')),
  0,
  'de nouveaux identifiants partout, dans les encadrés aussi'
);
select is(
  (select array[cardinality(draft_template_ids), cardinality(draft_media_ids)]
    from public.contents where id = pg_temp.cid('retenir')),
  array[0, 1],
  'le modèle ne cite aucun modèle, et suit le fichier de la copie'
);
select ok(
  not exists (select 1 from public.edit_locks where content_id = pg_temp.cid('retenir')),
  'aucun verrou n''est pris sur le modèle créé (on reste dans son éditeur)'
);
select is(
  pg_temp.rev('source'), (select rev from source_rev),
  'le brouillon d''origine ne change pas'
);
select lives_ok(
  $$insert into ids select 'encadre', (public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c02']::uuid[], 'Encadré', 'shared')).id$$,
  'un bloc partagé fait d''un seul bloc'
);
select lives_ok(
  $$insert into ids select 'depart_recette', (public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000c05']::uuid[],
    'Recette', 'starter', 'article')).id$$,
  'un point de départ des articles'
);
select is(
  (select template_for from public.contents where id = pg_temp.cid('depart_recette')), 'article',
  'le point de départ a sa section'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000c02']::uuid[],
    'Deux', 'shared')$$,
  'P0001', 'modele_un_seul_bloc', 'un bloc partagé de deux blocs : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-0000000000ff']::uuid[], 'Inconnu', 'style')$$,
  'P0001', 'bloc_introuvable', 'un bloc qui n''est pas dans le brouillon enregistré : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c03']::uuid[], 'Intérieur', 'style')$$,
  'P0001', 'bloc_introuvable', 'un bloc d''un encadré (pas au premier niveau) : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'), '{}'::uuid[], 'Rien', 'style')$$,
  'P0001', 'demande_invalide', 'aucun bloc choisi : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01', '00000000-0000-4000-8000-000000000c01']::uuid[],
    'Double', 'style')$$,
  'P0001', 'demande_invalide', 'un bloc choisi deux fois : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01']::uuid[], '   ', 'style')$$,
  'P0001', 'demande_invalide', 'un modèle sans nom : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01']::uuid[], 'Départ', 'starter')$$,
  'P0001', 'sorte_invalide', 'un point de départ sans section : refusé'
);
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('source'),
    array['00000000-0000-4000-8000-000000000c01']::uuid[], 'Autre', 'autre')$$,
  'P0001', 'sorte_invalide', 'une sorte inconnue : refusée'
);
select lives_ok(
  $$select pg_temp.create_content('jetee', 'article', content_title => 'Jetée')$$, 'un article de plus'
);
select lives_ok(
  $$select pg_temp.save('jetee', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000c11', 'Adieu')), 'Jetée'))$$,
  'avec un texte'
);
select lives_ok($$select public.trash(pg_temp.cid('jetee'))$$, 'mis à la corbeille');
select throws_ok(
  $$select public.template_create_from(pg_temp.cid('jetee'),
    array['00000000-0000-4000-8000-000000000c11']::uuid[], 'Jeté', 'style')$$,
  'P0001', 'dans_la_corbeille', 'depuis un contenu dans la corbeille : refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Mise à jour dans l'app : template_outdated (ignore les id) et template_push
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.publish('p1')$$, 'la page « Accueil » est publiée (version n° 1)');
select is(
  (pg_temp.live('p1')).body -> 'blocks' -> 1,
  pg_temp.contact_copy('Écris-nous', '00000000-0000-4000-8000-000000000d02',
    '00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-000000000a03'),
  'la version en ligne porte une copie du modèle'
);
create temporary table p1_v1 on commit drop as select (pg_temp.live('p1')).*;
select is(
  (select count(*)::int from public.template_outdated(pg_temp.cid('contact'))), 0,
  'juste publiée : rien à mettre à jour (id intérieurs et texte alternatif figé ne comptent pas)'
);
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Écris-nous',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le modèle change seulement les identifiants de ses blocs'
);
select is(
  (select count(*)::int from public.template_outdated(pg_temp.cid('contact'))), 0,
  'template_outdated ignore les id'
);
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Écris-nous vite',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le texte du modèle est corrigé'
);
select is(
  (select array[content_id::text, title, version_number::text, (version_id = (select id from p1_v1))::text]
    from public.template_outdated(pg_temp.cid('contact'))),
  array[pg_temp.cid('p1')::text, 'Accueil', '1', 'true'],
  'template_outdated liste la page en ligne, avec sa version'
);
select lives_ok(
  $$select pg_temp.save('p1', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000d01', 'Brouillon pas prêt'),
    pg_temp.linked('00000000-0000-4000-8000-000000000d02', 'contact')), 'Accueil modifié'))$$,
  'le brouillon de la page change aussi (pas prêt à partir)'
);
select is(
  (select array_agg(version_number) from public.template_push(pg_temp.cid('contact'))),
  array[2],
  'template_push : une nouvelle version pour la page'
);
select is(
  (select array[origin, published_by::text, (draft_rev = (select draft_rev from p1_v1))::text,
      (access_level_id is null)::text, slug]
    from public.versions where id = (pg_temp.live('p1')).id),
  array['template', pg_temp.person_id('editor')::text, 'true', 'true', 'accueil'],
  'version : origine « template », auteur, révision, niveau et adresse de la version en ligne'
);
select is(
  (pg_temp.live('p1')).body -> 'blocks',
  jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000d01', 'Bonjour'),
    pg_temp.contact_copy('Écris-nous vite', '00000000-0000-4000-8000-000000000d02',
      '00000000-0000-4000-8000-000000000b02', '00000000-0000-4000-8000-000000000b03')
  ),
  'part de la version en ligne : seule la copie du modèle change, pas le reste du brouillon'
);
select is(
  (pg_temp.live('p1')).body ->> 'title', 'Accueil',
  'le titre du brouillon ne part pas non plus'
);
select pg_temp.as_anon();
select is(
  (select jsonb_build_array(p -> 'versionId', pg_temp.text_of(p -> 'blocks' -> 0), pg_temp.text_of(p -> 'blocks' -> 1))
    from (select public.app_page('accueil') as p) x),
  jsonb_build_array(to_jsonb((pg_temp.live('p1')).id), 'Bonjour', 'Écris-nous vite'),
  'l''app (anonyme) lit la nouvelle version'
);
select pg_temp.as_person('editor');
select is(
  (select count(*)::int from public.template_outdated(pg_temp.cid('contact'))), 0,
  'plus rien à mettre à jour'
);
select is(
  (select count(*)::int from public.template_push(pg_temp.cid('contact'))), 0,
  'template_push est rejouable (aucune ligne)'
);

-- Même calcul que la publication : une page dont le brouillon n'a pas changé, mise à jour puis
-- republiée, donne la même version.
select lives_ok($$select pg_temp.create_content('p2', 'page', content_title => 'Deux')$$, 'une seconde page');
select lives_ok(
  $$select pg_temp.save('p2', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000e01', 'contact')), 'Deux'),
    '{"slug": "deux", "access_level_id": null}')$$,
  'elle utilise le modèle'
);
select lives_ok($$select pg_temp.publish('p2')$$, 'et elle est publiée');
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Trois',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le modèle change encore'
);
select is(
  (select array_agg(title order by title) from public.template_outdated(pg_temp.cid('contact'))),
  array['Accueil', 'Deux'],
  'les deux pages sont à mettre à jour'
);
select is(
  (select count(*)::int from public.template_push(pg_temp.cid('contact'))), 2,
  'les deux pages sont mises à jour'
);
create temporary table p2_pushed on commit drop as select (pg_temp.live('p2')).*;
select lives_ok($$select pg_temp.publish('p2')$$, 'la seconde page est republiée telle quelle');
select is(
  (select array[(v.body = p.body)::text, (v.body_hash = p.body_hash)::text, (v.files = p.files)::text]
    from public.versions v, p2_pushed p where v.id = (pg_temp.live('p2')).id),
  array['true', 'true', 'true'],
  'la version mise à jour est celle qu''aurait donnée la publication (corps, empreinte, fichiers)'
);

-- Fichiers ([D30]) : un fichier déjà cité par la version garde son texte figé ; un fichier cité
-- pour la première fois est figé maintenant.
select pg_temp.as_postgres();
update public.media set alt = 'Un chien' where id = pg_temp.mid('photo');
select pg_temp.as_person('editor');
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.box_block(
    '00000000-0000-4000-8000-000000000b01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000b02', 'Quatre'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000b03', pg_temp.mid('photo')),
      pg_temp.image_block('00000000-0000-4000-8000-000000000b04', pg_temp.mid('fond'))))), 'Contact'))$$,
  'le modèle ajoute l''image « fond »'
);
select is(
  (select count(*)::int from public.template_push(pg_temp.cid('contact'))), 2,
  'mise à jour des deux pages'
);
select is(
  (select jsonb_build_array(
      (pg_temp.live('p1')).body #>> '{blocks,1,blocks,1,alt}',
      (pg_temp.live('p1')).body #>> '{blocks,1,blocks,2,alt}',
      (pg_temp.live('p1')).body #> '{blocks,1,blocks,2,altFromLibrary}',
      (pg_temp.live('p1')).files #>> array[pg_temp.mid('photo')::text, 'alt'],
      (pg_temp.live('p1')).files ? pg_temp.mid('fond')::text)),
  '["Un chat", "", true, "Un chat", true]'::jsonb,
  'texte figé gardé pour « photo », « fond » figé maintenant'
);
select is(
  (pg_temp.live('p1')).media_ids,
  array(select x from unnest(array[pg_temp.mid('photo'), pg_temp.mid('fond')]) x order by x),
  'version : les fichiers cités, triés'
);
select pg_temp.as_postgres();
update public.media set alt = 'Un chat' where id = pg_temp.mid('photo');
select pg_temp.as_person('editor');

-- Un bloc du modèle qui ne pourrait pas être publié : tout le geste est refusé.
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.box_block(
    '00000000-0000-4000-8000-000000000b01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000b02', 'Cinq'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000b03', null)))), 'Contact'))$$,
  'le modèle a une image sans fichier'
);
create temporary table count_before on commit drop as select pg_temp.version_count() as n;
select throws_ok(
  $$select public.template_push(pg_temp.cid('contact'))$$, 'P0001', 'image_sans_fichier',
  'template_push refuse un modèle qui ne pourrait pas être publié'
);
select is(pg_temp.version_count(), (select n from count_before), 'refus : aucune version écrite');
-- Un son dans un bloc Image du modèle, puis un fichier qui n'est plus prêt : refusés, nommés.
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.box_block(
    '00000000-0000-4000-8000-000000000b01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000b02', 'Cinq'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000b03', pg_temp.mid('son'))))), 'Contact'))$$,
  'le modèle cite un son dans un bloc Image'
);
select is(
  pg_temp.facts_of($$select public.template_push(pg_temp.cid('contact'))$$),
  '{"code": "fichier_inadapte", "hint": ["son.mp3"]}'::jsonb,
  'template_push, fichier_inadapte : hint, les noms des fichiers en tableau JSON'
);
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.box_block(
    '00000000-0000-4000-8000-000000000b01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000b02', 'Cinq'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000b03', pg_temp.mid('vieux'))))), 'Contact'))$$,
  'le modèle cite « vieux »'
);
select pg_temp.as_postgres();
update public.media set status = 'checking' where id = pg_temp.mid('vieux');
select pg_temp.as_person('editor');
select is(
  pg_temp.facts_of($$select public.template_push(pg_temp.cid('contact'))$$),
  '{"code": "fichier_indisponible", "hint": [{"name": "vieux.webp", "state": "pending"}]}'::jsonb,
  'template_push, fichier_indisponible : hint, chaque fichier et son état en JSON'
);
select pg_temp.as_postgres();
update public.media set status = 'ready' where id = pg_temp.mid('vieux');
select pg_temp.as_person('editor');
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Six',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le modèle est réparé'
);

-- ---------------------------------------------------------------------------------------------
-- Détacher dans un contenu publié : il n'est plus proposé à la mise à jour
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('p3', 'page', content_title => 'Trois')$$, 'une troisième page');
select lives_ok(
  $$select pg_temp.save('p3', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000f01', 'contact'),
    pg_temp.linked('00000000-0000-4000-8000-000000000f02', 'contact')), 'Trois'),
    '{"slug": "trois", "access_level_id": null}')$$,
  'elle utilise deux fois le modèle'
);
select lives_ok($$select pg_temp.publish('p3')$$, 'et elle est publiée');
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Sept',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le modèle change'
);
-- « Détacher » dans l'éditeur : le bloc lié devient une copie ordinaire (même id au premier
-- niveau, nouveaux id à l'intérieur), enregistrée normalement.
select lives_ok(
  $$select pg_temp.save('p3', pg_temp.draft(jsonb_build_array(
    pg_temp.box_block('00000000-0000-4000-8000-000000000f01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000f11', 'Six'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000f12', pg_temp.mid('photo')))),
    pg_temp.linked('00000000-0000-4000-8000-000000000f02', 'contact')), 'Trois'))$$,
  'le premier bloc est détaché dans le brouillon'
);
select ok(
  pg_temp.cid('p3') in (select content_id from public.template_outdated(pg_temp.cid('contact'))),
  'le second bloc suit encore le modèle : la page est proposée'
);
select lives_ok($$select public.template_push(pg_temp.cid('contact'))$$, 'mise à jour');
select is(
  (select jsonb_build_array(pg_temp.text_of(b -> 0), b -> 0 ->> 'templateId', pg_temp.text_of(b -> 1))
    from (select (pg_temp.live('p3')).body -> 'blocks' as b) x),
  jsonb_build_array('Six', pg_temp.cid('contact')::text, 'Sept'),
  'seule la copie encore liée dans le brouillon est remplacée'
);
select lives_ok(
  $$select pg_temp.save('p3', pg_temp.draft(jsonb_build_array(
    pg_temp.box_block('00000000-0000-4000-8000-000000000f01', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000f11', 'Six'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000f12', pg_temp.mid('photo')))),
    pg_temp.box_block('00000000-0000-4000-8000-000000000f02', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000f21', 'Sept'),
      pg_temp.image_block('00000000-0000-4000-8000-000000000f22', pg_temp.mid('photo'))))), 'Trois'))$$,
  'le second bloc est détaché à son tour (sans republier)'
);
select lives_ok(
  $$select pg_temp.save('contact', pg_temp.draft(jsonb_build_array(pg_temp.contact_block('Huit',
    '00000000-0000-4000-8000-000000000b01', '00000000-0000-4000-8000-000000000b02',
    '00000000-0000-4000-8000-000000000b03')), 'Contact'))$$,
  'le modèle change encore'
);
select is(
  (select array_agg(title order by title) from public.template_outdated(pg_temp.cid('contact'))),
  array['Accueil', 'Deux'],
  'la page détachée n''est plus proposée, même avant d''être republiée'
);

-- ---------------------------------------------------------------------------------------------
-- Suppression refusée, « Détacher partout », puis suppression permise
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('p4', 'page', content_title => 'Quatre')$$, 'une quatrième page');
select lives_ok(
  $$select pg_temp.save('p4', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000f41', 'contact')), 'Quatre'))$$,
  'elle utilise le modèle'
);
select lives_ok($$select public.trash(pg_temp.cid('p4'))$$, 'puis elle part à la corbeille');
select matches(
  pg_temp.error_of($$select public.trash(pg_temp.cid('contact'))$$),
  '^modele_utilise \| .*Accueil.*Deux.*Quatre',
  'un bloc partagé utilisé ne va pas à la corbeille (brouillon dans la corbeille compris)'
);

-- Un autre membre écrit « Deux » : « Détacher partout » est refusé, et le nomme.
select pg_temp.as_postgres();
update public.edit_locks
set holder_id = pg_temp.person_id('editor2'), holder_session = null, taken_at = now(), heartbeat_at = now()
where content_id = pg_temp.cid('p2');
select pg_temp.as_person('editor');
select matches(
  pg_temp.error_of($$select public.template_detach_all(pg_temp.cid('contact'))$$),
  '^verrou_tenu \| editeur2@tests\.local écrit « Deux ».* \| editeur2@tests\.local$',
  'refusé si un autre membre écrit un des brouillons (detail : la personne et le contenu ; hint : la personne)'
);
select is(
  (select draft_template_ids from public.contents where id = pg_temp.cid('p1')),
  array[pg_temp.cid('contact')],
  'refus : rien n''est détaché'
);
select pg_temp.as_postgres();
update public.edit_locks set heartbeat_at = now() - interval '91 seconds'
where content_id = pg_temp.cid('p2');
create temporary table before_detach on commit drop as
  select id, draft_rev, deleted_at from public.contents where id in (pg_temp.cid('p1'), pg_temp.cid('p4'));
grant select on before_detach to public;

select pg_temp.as_person('editor');
select is(
  (select array_agg(content_id order by content_id) from public.template_detach_all(pg_temp.cid('contact'))),
  array(select x from unnest(array[pg_temp.cid('p1'), pg_temp.cid('p2'), pg_temp.cid('p4'),
    pg_temp.cid('source')]) x order by x),
  'verrou périmé : « Détacher partout » détache les quatre brouillons (corbeille comprise)'
);
select is(
  (select jsonb_build_array(b ->> 'id', b ->> 'type', b ? 'templateId', pg_temp.text_of(b),
      b #>> '{blocks,0,id}' not in ('00000000-0000-4000-8000-000000000b02',
        md5('00000000-0000-4000-8000-000000000d02/00000000-0000-4000-8000-000000000b02')::uuid::text),
      b #>> '{blocks,1,alt}')
    from (select draft -> 'blocks' -> 1 as b from public.contents where id = pg_temp.cid('p1')) x),
  '["00000000-0000-4000-8000-000000000d02", "box", false, "Huit", true, null]'::jsonb,
  'copie ordinaire : même id au premier niveau, nouveaux id à l''intérieur, sans marqueur, alt qui suit la médiathèque'
);
select is(
  (select array[cardinality(c.draft_template_ids), c.draft_rev - b.draft_rev, l.draft_rev - c.draft_rev]
    from public.contents c
    join before_detach b on b.id = c.id
    join public.edit_locks l on l.content_id = c.id
    where c.id = pg_temp.cid('p1')),
  array[0, 1, 0],
  'le brouillon ne cite plus le modèle, change de révision, et le verrou le dit (Realtime)'
);
select is(
  (select array[(c.deleted_at = b.deleted_at)::text, (c.draft_rev - b.draft_rev)::text,
      c.draft #>> '{blocks,0,type}', cardinality(c.draft_template_ids)::text]
    from public.contents c join before_detach b on b.id = c.id
    where c.id = pg_temp.cid('p4')),
  array['true', '1', 'box', '0'],
  'dans la corbeille : détaché aussi, et toujours dans la corbeille'
);
select is(
  (pg_temp.live('p1')).template_ids, array[pg_temp.cid('contact')],
  'les versions publiées ne changent pas'
);
select is(
  coalesce(current_setting('declikora.detach_all', true), ''), '',
  'le passage du garde de corbeille est refermé après le geste'
);
select pg_temp.as_postgres();
select throws_ok(
  $$update public.contents set draft = jsonb_set(draft, '{title}', '"Autre"') where id = pg_temp.cid('p4')$$,
  'P0001', 'dans_la_corbeille', 'un brouillon dans la corbeille ne change plus ensuite'
);
select pg_temp.as_person('editor');
select lives_ok(
  $$select public.trash(pg_temp.cid('contact'))$$,
  'le modèle détaché partout va à la corbeille'
);
select is(
  (select count(*)::int from public.template_detach_all(pg_temp.cid('contact'))), 0,
  '« Détacher partout » est rejouable (aucune ligne)'
);
select is(
  (select count(*)::int from public.template_outdated(pg_temp.cid('contact'))), 0,
  'un modèle dans la corbeille n''a rien à mettre à jour'
);
select throws_ok(
  $$select public.template_push(pg_temp.cid('retenir'))$$, 'P0001', 'modele_introuvable',
  'template_push : une mise en forme n''est pas un bloc partagé'
);
select throws_ok(
  $$select public.template_detach_all('20000000-0000-4000-8000-0000000000ff')$$, 'P0001',
  'modele_introuvable', 'template_detach_all : modèle inconnu'
);
select is(
  (select count(*)::int from public.template_outdated('20000000-0000-4000-8000-0000000000ff')), 0,
  'template_outdated : modèle inconnu, aucune ligne'
);
select lives_ok(
  $$select public.trash(pg_temp.cid('retenir'))$$,
  'une mise en forme se supprime librement (les contenus n''en gardent que des copies)'
);

-- ---------------------------------------------------------------------------------------------
-- « Revenir à cette version » : le lien revient, ou le marqueur est retiré
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.create_template('bandeau', 'Bandeau', 'shared')$$, 'un bloc partagé « Bandeau »'
);
select lives_ok(
  $$select pg_temp.save('bandeau', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000b51', 'Bandeau')), 'Bandeau'))$$,
  'avec son bloc'
);
select lives_ok($$select pg_temp.create_content('r1', 'article', content_title => 'Retour')$$, 'un article');
select lives_ok(
  $$select pg_temp.save('r1', pg_temp.draft(jsonb_build_array(
    pg_temp.linked('00000000-0000-4000-8000-000000000b61', 'bandeau')), 'Retour', pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'il utilise « Bandeau »'
);
select lives_ok($$select pg_temp.publish('r1')$$, 'version n° 1');
create temporary table r1_v1 on commit drop as select (pg_temp.live('r1')).id as id;
select lives_ok(
  $$select pg_temp.save('r1', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000b61', 'Bandeau')), 'Retour'))$$,
  'le bloc est détaché dans le brouillon'
);
select is(
  (select warnings from public.revert_to_version((select id from r1_v1))), '{}'::text[],
  'revenir à la version n° 1 : sans avertissement'
);
select is(
  (select draft -> 'blocks' -> 0 from public.contents where id = pg_temp.cid('r1')),
  pg_temp.linked('00000000-0000-4000-8000-000000000b61', 'bandeau'),
  'le lien est rétabli'
);
select lives_ok($$select public.template_detach_all(pg_temp.cid('bandeau'))$$, 'détaché partout');
select lives_ok($$select public.trash(pg_temp.cid('bandeau'))$$, 'puis mis à la corbeille');
select is(
  (select warnings from public.revert_to_version((select id from r1_v1))), array['modele_detache'],
  'revenir à la version n° 1, le modèle dans la corbeille : avertissement'
);
select is(
  (select draft -> 'blocks' -> 0 from public.contents where id = pg_temp.cid('r1')),
  pg_temp.text_block('00000000-0000-4000-8000-000000000b61', 'Bandeau'),
  'la copie devient ordinaire, sans le marqueur templateId'
);
select lives_ok($$select public.restore(pg_temp.cid('bandeau'))$$, 'le modèle est restauré');
select mine from public.lock_take(pg_temp.cid('bandeau'));
select lives_ok(
  $$select pg_temp.save('bandeau', pg_temp.draft('[]', 'Bandeau'))$$,
  'inutilisé, il est vidé'
);
select is(
  (select warnings from public.revert_to_version((select id from r1_v1))), array['modele_detache'],
  'revenir à la version n° 1, le modèle vide : copie ordinaire (sinon le retour serait refusé)'
);

select * from finish();
rollback;

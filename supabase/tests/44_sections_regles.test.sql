-- Sections (étape 7, partie 7a) : règles.
--   - [D45] : image de présentation obligatoire pour publier ou programmer un article, un
--     épisode ; plus de résumé (retiré le 04/10/2026) ; rien pour une page ; le son d'un
--     épisode (son_manquant, fichier_inadapte, fichier_indisponible) ; échec d'une programmation
--     dont l'image a été retirée ensuite ;
--   - catégories : [D44] facultatives, rangement (categories_reorder), suppression définitive
--     ([D28]) que l'app ignore, catégorie de la bonne section ;
--   - app_feed : ordre de la liste (list_position, 30/09/2026), pagination par curseur (égalités
--     comprises), filtre par catégorie, contenu réservé verrouillé mais listé avec sa vignette
--     seule (jamais l'image de ses blocs ni son son), durée d'un épisode, brouillon, retrait et
--     corbeille jamais listés ; app_categories.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(102);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

insert into public.categories (id, section, name) values
  ('30000000-0000-4000-8000-000000000003', 'podcasts', 'Musique');
-- Un second son (qu'un test rend indisponible), et une durée pour le premier.
insert into public.media (id, kind, name, path, mime, size_bytes, status, duration_s, created_by) values
  ('10000000-0000-4000-8000-000000000006', 'audio', 'son2.mp3',
    '10000000-0000-4000-8000-000000000006/son2.mp3', 'audio/mpeg', 1000, 'ready', 61, pg_temp.person_id('editor'));
update public.media set duration_s = 754.5 where id = pg_temp.mid('son');

-- Les noms (dans l'ordre) des éléments d'une page de app_feed.
create function pg_temp.names(feed jsonb)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(i.name order by x.n), '{}')
  from jsonb_array_elements(feed -> 'items') with ordinality x (item, n)
  join ids i on i.id = (x.item ->> 'id')::uuid
$$;

-- Toute la liste, page par page (taille « lim ») : noms, et nombre de pages.
create function pg_temp.all_pages(section text, lim integer, category uuid default null)
returns text[]
language plpgsql
as $$
declare
  cursor_text text;
  page jsonb;
  result text[] := '{}';
  pages integer := 0;
begin
  loop
    page := public.app_feed(section, category, cursor_text, lim);
    pages := pages + 1;
    result := result || pg_temp.names(page);
    cursor_text := page ->> 'nextCursor';
    exit when cursor_text is null or pages > 20;
  end loop;
  return result || array['pages:' || pages];
end;
$$;

-- Un contenu prêt : créé, réglé (gratuit par défaut), enregistré avec son image de présentation.
create function pg_temp.ready(
  content_name text,
  content_kind text,
  title text,
  settings jsonb default '{"access_level_id": null}',
  extra jsonb default '{}'
)
returns void
language plpgsql
as $$
begin
  perform pg_temp.create_content(content_name, content_kind, content_title => title);
  perform pg_temp.save(
    content_name,
    pg_temp.draft(jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-000000000001', 'Texte')),
      title, pg_temp.cover() || extra),
    settings
  );
end;
$$;

-- Place dans la liste fixée (ce que ferait un rangement par glisser-déposer).
create function pg_temp.place(content_name text, at integer)
returns void
language sql
security definer
as $$
  update public.contents set list_position = at where id = pg_temp.cid(content_name)
$$;

grant execute on function
  pg_temp.names(jsonb),
  pg_temp.all_pages(text, integer, uuid),
  pg_temp.ready(text, text, text, jsonb, jsonb),
  pg_temp.place(text, integer)
to public;

-- ---------------------------------------------------------------------------------------------
-- [D45] : image de présentation
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.create_content('nu', 'article', content_title => 'Nu')$$, 'un article');
select lives_ok(
  $$select pg_temp.save('nu', pg_temp.draft(jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-000000000002')), 'Nu'),
    '{"access_level_id": null}')$$,
  'gratuit, sans image de présentation'
);
select throws_ok(
  $$select pg_temp.publish('nu')$$, 'P0001', 'image_de_presentation_manquante',
  'un article sans image de présentation ne se publie pas'
);
select matches(
  pg_temp.error_of($$select pg_temp.publish('nu')$$), 'image de présentation de l''article',
  'le détail nomme l''article'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('nu'), now() + interval '1 day')$$, 'P0001',
  'image_de_presentation_manquante', 'ni ne se programme'
);
select is(
  (select scheduled_at from public.contents where id = pg_temp.cid('nu')), null, 'rien n''est programmé'
);
select lives_ok(
  $$select pg_temp.save('nu', pg_temp.draft('[]', 'Nu', jsonb_build_object('cover', null)))$$,
  'une image de présentation vide (null)'
);
select throws_ok(
  $$select pg_temp.publish('nu')$$, 'P0001', 'image_de_presentation_manquante', 'vide, elle manque aussi'
);
select lives_ok(
  $$select pg_temp.save('nu', pg_temp.draft('[]', 'Nu', pg_temp.cover('son')))$$,
  'un son en image de présentation (le brouillon l''accepte)'
);
select throws_ok(
  $$select pg_temp.publish('nu')$$, 'P0001', 'fichier_inadapte',
  'un son en image de présentation ne se publie pas'
);
select lives_ok($$select pg_temp.save('nu', pg_temp.draft('[]', 'Nu', pg_temp.cover()))$$, 'avec une image');
select lives_ok($$select pg_temp.publish('nu')$$, 'l''article se publie');
select is(
  (select array[(x ? 'summary')::text, x #>> '{cover,mediaId}'] from public.app_content(pg_temp.cid('nu')) x),
  array['false', pg_temp.mid('couverture')::text],
  'l''app : plus de résumé (retiré le 04/10/2026), l''image de présentation'
);
select is(
  (pg_temp.live('nu')).cover_media_id, pg_temp.mid('couverture'), 'la version retient l''image de présentation'
);

-- Épisode : l'image, puis le son.
select lives_ok($$select pg_temp.create_content('ep', 'episode', content_title => 'Épisode')$$, 'un épisode');
select lives_ok($$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode'), '{"access_level_id": null}')$$, 'gratuit, vide');
select throws_ok(
  $$select pg_temp.publish('ep')$$, 'P0001', 'image_de_presentation_manquante',
  'un épisode sans image ni son : l''image d''abord'
);
select matches(
  pg_temp.error_of($$select pg_temp.publish('ep')$$), 'image de présentation de l''épisode',
  'le détail nomme l''épisode'
);
select lives_ok($$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover()))$$, 'avec une image');
select throws_ok($$select pg_temp.publish('ep')$$, 'P0001', 'son_manquant', 'un épisode sans son ne se publie pas');
select throws_ok(
  $$select public.schedule(pg_temp.cid('ep'), now() + interval '1 day')$$, 'P0001', 'son_manquant',
  'ni ne se programme'
);
select lives_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover()
    || jsonb_build_object('audio', jsonb_build_object('mediaId', pg_temp.mid('photo')))))$$,
  'une image en guise de son (le brouillon l''accepte)'
);
select throws_ok($$select pg_temp.publish('ep')$$, 'P0001', 'fichier_inadapte', 'une image en guise de son est refusée');
select lives_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover()
    || jsonb_build_object('audio', jsonb_build_object('mediaId', '10000000-0000-4000-8000-000000000006'))))$$,
  'le second son'
);
select pg_temp.as_postgres();
update public.media set status = 'checking' where id = '10000000-0000-4000-8000-000000000006';
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.publish('ep')$$, 'P0001', 'fichier_indisponible', 'un son qui n''est plus prêt est refusé'
);
select pg_temp.as_postgres();
update public.media set status = 'ready' where id = '10000000-0000-4000-8000-000000000006';
select pg_temp.as_person('editor');
select lives_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover()
    || jsonb_build_object('audio', jsonb_build_object('mediaId', pg_temp.mid('son')))),
    jsonb_build_object('category_ids', jsonb_build_array('30000000-0000-4000-8000-000000000003')))$$,
  'le premier son, catégorie Musique'
);
select lives_ok($$select pg_temp.publish('ep')$$, 'l''épisode se publie');
select is(
  ((pg_temp.live('ep')).files #>> array[pg_temp.mid('son')::text, 'durationS'])::numeric, 754.5,
  'la durée du son est figée dans la version'
);

-- Une page n'a besoin d'aucune image.
select lives_ok($$select pg_temp.create_content('aide', 'page', content_title => 'Aide')$$, 'une page');
select lives_ok(
  $$select pg_temp.save('aide', pg_temp.draft('[]', 'Aide'), '{"access_level_id": null, "slug": "aide"}')$$,
  'gratuite, avec une adresse, sans image'
);
select lives_ok($$select public.schedule(pg_temp.cid('aide'), now() + interval '1 day')$$, 'elle se programme');
select lives_ok($$select pg_temp.publish('aide')$$, 'et se publie');

-- Les sortes qui exigent une image de présentation.
select pg_temp.as_postgres();
select is(
  array[private.cover_required('article'), private.cover_required('episode'),
    private.cover_required('page'), private.cover_required('template')],
  array[true, true, false, false],
  'image de présentation exigée : article et épisode seulement'
);

-- Programmée avec son image, puis l'image retirée : la tâche échoue, l'Accueil le montre.
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready('plus_tard', 'article', 'Plus tard')$$, 'un article prêt');
select lives_ok($$select public.schedule(pg_temp.cid('plus_tard'), now() + interval '1 hour')$$, 'programmé');
select lives_ok($$select pg_temp.save('plus_tard', pg_temp.draft('[]', 'Plus tard'))$$, 'l''image est retirée ensuite');
select public.lock_release(pg_temp.cid('plus_tard'));
select pg_temp.as_postgres();
update public.contents set scheduled_at = now() - interval '1 minute' where id = pg_temp.cid('plus_tard');
select is(private.run_due_publications(), 0, 'la tâche ne publie rien');
select is(
  (select array[coalesce(scheduled_at::text, 'aucune'), schedule_error] from public.contents
    where id = pg_temp.cid('plus_tard')),
  array['aucune', 'image_de_presentation_manquante'],
  'échec affiché : image_de_presentation_manquante'
);

-- ---------------------------------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select category_ids from pg_temp.live('nu')), '{}'::uuid[],
  '[D44] : un article sans catégorie se publie'
);
select throws_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover()),
    jsonb_build_object('category_ids', jsonb_build_array(pg_temp.catid('sommeil'))))$$,
  'P0001', 'categorie_invalide', 'un épisode ne prend pas une catégorie du Blog'
);
insert into public.categories (section, name) values ('blog', 'Méditation');
select is(
  (select array_agg(name || ':' || position order by position) from public.categories where section = 'blog'),
  array['Sommeil:0', 'Cuisine:1', 'Méditation:2'],
  'une nouvelle catégorie va en fin de liste'
);
select throws_ok(
  $$insert into public.categories (section, name) values ('blog', 'méditation')$$, '23505', null,
  'un nom en double dans la section est refusé (casse comprise)'
);
select lives_ok(
  $$insert into public.categories (section, name) values ('podcasts', 'Méditation')$$,
  'le même nom dans l''autre section est permis'
);
select results_eq(
  format(
    'select name, position from public.categories_reorder(''blog'', array[%L, %L, %L]::uuid[])',
    (select id from public.categories where section = 'blog' and name = 'Méditation'),
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')
  ),
  $$values ('Méditation'::text, 0), ('Cuisine'::text, 1), ('Sommeil'::text, 2)$$,
  'categories_reorder : nouvel ordre, positions 0, 1, 2'
);
select is(
  (select array_agg(name) from public.app_categories('blog')), array['Méditation', 'Cuisine', 'Sommeil'],
  'app_categories suit le rangement'
);
select is(
  (select array_agg(name order by position) from public.categories where section = 'podcasts'),
  array['Musique', 'Méditation'],
  'les Podcasts ne bougent pas'
);
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil')),
  'P0001', 'demande_invalide', 'categories_reorder : une catégorie manque'
);
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil'), pg_temp.catid('sommeil')),
  'P0001', 'demande_invalide', 'categories_reorder : une catégorie en double'
);
select throws_ok(
  format('select public.categories_reorder(''blog'', array[%L, %L, %L]::uuid[])',
    pg_temp.catid('cuisine'), pg_temp.catid('sommeil'), '30000000-0000-4000-8000-000000000003'),
  'P0001', 'demande_invalide', 'categories_reorder : une catégorie d''une autre section'
);
select throws_ok(
  $$select public.categories_reorder('pages', '{}')$$, 'P0001', 'demande_invalide',
  'categories_reorder : section inconnue'
);
select throws_ok(
  $$select public.categories_reorder('blog', null)$$, 'P0001', 'demande_invalide',
  'categories_reorder : liste absente'
);

-- ---------------------------------------------------------------------------------------------
-- app_feed : ordre, pagination, filtres, verrou
-- ---------------------------------------------------------------------------------------------

-- a1 … a4 gratuits ; r réservé (Complet) ; a1 et r dans Sommeil, a2 dans Cuisine. Puis un
-- brouillon jamais publié, un article retiré de l'app et un article mis à la corbeille.
select lives_ok($$select pg_temp.ready('a1', 'article', 'Un',
  jsonb_build_object('access_level_id', null, 'category_ids', jsonb_build_array(pg_temp.catid('sommeil'))))$$, 'a1');
select lives_ok($$select pg_temp.ready('a2', 'article', 'Deux',
  jsonb_build_object('access_level_id', null, 'category_ids', jsonb_build_array(pg_temp.catid('cuisine'))))$$, 'a2');
select lives_ok($$select pg_temp.ready('a3', 'article', 'Trois')$$, 'a3');
select lives_ok($$select pg_temp.ready('a4', 'article', 'Quatre')$$, 'a4');
-- r a aussi une image dans ses blocs (photo) : app_feed ne doit en rien dire.
select lives_ok($$select pg_temp.ready('r', 'article', 'Réservé',
  jsonb_build_object('access_level_id', pg_temp.lid('complet'),
    'category_ids', jsonb_build_array(pg_temp.catid('sommeil'))),
  jsonb_build_object('blocks', jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000001', 'Texte'),
    pg_temp.image_block('00000000-0000-4000-8000-000000000002', pg_temp.mid('photo')))))$$, 'r');
select pg_temp.publish(n) from unnest(array['a1', 'a2', 'a3', 'a4', 'r']) n;
select pg_temp.ready('jamais', 'article', 'Jamais publié');
select pg_temp.ready('retire', 'article', 'Retiré');
select pg_temp.publish('retire');
select public.unpublish(pg_temp.cid('retire'));
select pg_temp.ready('jete', 'article', 'Jeté');
select pg_temp.publish('jete');
select public.trash(pg_temp.cid('jete'));

-- Places dans la liste (rangement de l'équipe) : a4 en tête, puis r, a2 = a3 (égalité), a1, nu.
select pg_temp.place('a4', -3);
select pg_temp.place('r', 0);
select pg_temp.place('a2', 4);
select pg_temp.place('a3', 4);
select pg_temp.place('a1', 7);
select pg_temp.place('nu', 9);

select pg_temp.as_anon();
select is(
  (select array[n[1], n[2], least(n[3], n[4]), greatest(n[3], n[4]), n[5], n[6], cardinality(n)::text]
    from pg_temp.names(public.app_feed('blog')) n),
  array['a4', 'r', 'a2', 'a3', 'a1', 'nu', '6'],
  'dans l''ordre de la liste ; ni brouillon, ni retiré, ni corbeille'
);
-- À place égale : par identifiant (croissant).
select is(
  (select array_agg(x ->> 'id') from jsonb_array_elements(public.app_feed('blog') -> 'items') with ordinality x (x, n)
    where n in (3, 4)),
  (select array_agg(x::text order by x) from unnest(array[pg_temp.cid('a2'), pg_temp.cid('a3')]) x),
  'à place égale : par identifiant'
);
select is(public.app_feed('blog') -> 'nextCursor', 'null'::jsonb, 'une seule page : pas de curseur');
select is(
  pg_temp.all_pages('blog', 2),
  pg_temp.names(public.app_feed('blog')) || array['pages:3'],
  'par pages de 2 : les mêmes éléments, sans doublon ni oubli (égalité comprise), en trois pages'
);
select is(
  pg_temp.all_pages('blog', 1),
  pg_temp.names(public.app_feed('blog')) || array['pages:6'],
  'par pages de 1 : six pages'
);
select is(
  (select jsonb_array_length(public.app_feed('blog', null, null, 3) -> 'items')), 3, 'lim : taille de la page'
);
select is(
  (public.app_feed('blog', null, null, 6) -> 'nextCursor'), 'null'::jsonb,
  'la dernière page pleine n''a pas de curseur'
);
select is(
  pg_temp.names(public.app_feed('blog', null, public.app_feed('blog', null, null, 2) ->> 'nextCursor', 50)),
  (pg_temp.names(public.app_feed('blog')))[3:6],
  'le curseur de la première page donne la suite'
);
select is(
  (select jsonb_array_length(public.app_feed('blog', null, null, null) -> 'items')), 6,
  'lim absent : 20 par défaut'
);

-- Republier ne remonte pas un article : il garde sa place.
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.save('nu', pg_temp.draft('[]', 'Nu corrigé', pg_temp.cover()))$$, 'nu corrigé');
select lives_ok($$select pg_temp.publish('nu')$$, 'et republié');
select pg_temp.as_anon();
select is(
  (pg_temp.names(public.app_feed('blog')))[6], 'nu', 'une correction ne remonte pas l''article'
);
select is(
  (select x ->> 'title' from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('nu')),
  'Nu corrigé',
  'mais l''app lit bien la nouvelle version'
);

-- Filtre par catégorie.
select is(
  pg_temp.names(public.app_feed('blog', pg_temp.catid('sommeil'))), array['r', 'a1'],
  'filtre Sommeil'
);
select is(
  pg_temp.all_pages('blog', 1, pg_temp.catid('sommeil')), array['r', 'a1', 'pages:2'],
  'filtre Sommeil, page par page'
);
select is(
  pg_temp.names(public.app_feed('blog', '30000000-0000-4000-8000-000000000003')), '{}'::text[],
  'une catégorie des Podcasts dans le Blog : rien'
);
select is(
  pg_temp.names(public.app_feed('blog', '30000000-0000-4000-8000-0000000000ff')), '{}'::text[],
  'une catégorie inconnue : rien'
);

-- Un contenu réservé : listé, verrouillé, avec sa vignette seulement.
select is(
  (select jsonb_build_object('locked', x -> 'locked', 'level', x #>> '{level,name}',
      'files', (select array_agg(k) from jsonb_object_keys(x -> 'files') k),
      'blocks', x ? 'blocks', 'audio', x ? 'audio', 'summary', x ? 'summary',
      'cover', x #>> '{cover,mediaId}', 'categories', x -> 'categoryIds')
    from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('r')),
  jsonb_build_object('locked', true, 'level', 'Complet', 'files', jsonb_build_array(pg_temp.mid('couverture')),
    'blocks', false, 'audio', false, 'summary', false,
    'cover', pg_temp.mid('couverture'), 'categories', jsonb_build_array(pg_temp.catid('sommeil'))),
  'réservé, pour un anonyme : verrouillé, sa formule, sa vignette et rien d''autre'
);
select ok(
  (pg_temp.live('r')).files ? pg_temp.mid('photo')::text,
  'la version de r fige aussi l''image de ses blocs (le contrôle suivant n''est pas vide de sens)'
);
select is(
  position(pg_temp.mid('photo')::text in public.app_feed('blog')::text), 0,
  'app_feed ne dit rien de l''image des blocs (ni identifiant, ni chemin, ni texte alternatif)'
);
select is(
  (select x #> array['files', pg_temp.mid('couverture')::text, 'path']
    from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('r')),
  to_jsonb(pg_temp.mid('couverture') || '/couverture.webp'),
  'la vignette a son chemin (informations figées)'
);
select is(
  (select array_agg(x -> 'locked') from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid <> pg_temp.cid('r')),
  array_fill('false'::jsonb, array[5]),
  'les gratuits ne sont pas verrouillés'
);
select pg_temp.as_postgres();
insert into public.reader_access (user_id, access_level_id, source) values
  (pg_temp.person_id('reader'), pg_temp.lid('essentiel'), 'test');
select pg_temp.as_person('reader');
select is(
  (select x -> 'locked' from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('r')),
  'true'::jsonb,
  'lecteur « Essentiel » : le réservé « Complet » reste verrouillé'
);
select pg_temp.as_postgres();
update public.reader_access set access_level_id = pg_temp.lid('complet') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select is(
  (select x -> 'locked' from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('r')),
  'false'::jsonb,
  'lecteur « Complet » : ouvert'
);

-- Une catégorie supprimée ([D28]) : définitif, les brouillons la perdent, l'app l'ignore.
select pg_temp.as_person('editor');
select is(
  pg_temp.affected(format('delete from public.categories where id = %L', pg_temp.catid('sommeil'))), 1,
  'l''équipe supprime une catégorie'
);
select is(
  (select count(*)::int from public.content_categories where category_id = pg_temp.catid('sommeil')), 0,
  'elle quitte les brouillons'
);
select is(
  (select count(*)::int from public.trash_items where title = 'Sommeil'), 0, 'elle ne va pas dans la corbeille'
);
select ok(
  (pg_temp.live('r')).category_ids @> array[pg_temp.catid('sommeil')],
  'la version publiée garde l''identifiant (une version ne change jamais)'
);
select pg_temp.as_anon();
select is(
  (select x -> 'categoryIds' from jsonb_array_elements(public.app_feed('blog') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('r')),
  '[]'::jsonb,
  'app_feed ignore la catégorie disparue'
);
select is(
  public.app_content(pg_temp.cid('a1')) -> 'categoryIds', '[]'::jsonb, 'app_content aussi'
);
select is(
  pg_temp.names(public.app_feed('blog', pg_temp.catid('sommeil'))), '{}'::text[],
  'filtrer sur une catégorie disparue : rien'
);
select is(
  (select array_agg(name) from public.app_categories('blog')), array['Méditation', 'Cuisine'],
  'app_categories ne la montre plus'
);

-- Podcasts : les épisodes seulement, avec leur durée.
select is(pg_temp.names(public.app_feed('podcasts')), array['ep'], 'la liste des Podcasts : les épisodes');
select is(
  (select array[x ->> 'kind', ((x ->> 'durationS')::numeric = 754.5)::text, x #>> '{categoryIds,0}']
    from jsonb_array_elements(public.app_feed('podcasts') -> 'items') x),
  array['episode', 'true', '30000000-0000-4000-8000-000000000003'],
  'un épisode : sa sorte, la durée de son son, sa catégorie'
);
select is(
  pg_temp.names(public.app_feed('podcasts', '30000000-0000-4000-8000-000000000003')), array['ep'],
  'filtre Musique'
);
select is(
  (select x -> 'durationS' from jsonb_array_elements(public.app_feed('blog') -> 'items') x limit 1),
  'null'::jsonb,
  'un article n''a pas de durée'
);

-- Un épisode réservé, avec son son et une image dans ses blocs : sa vignette seulement, jamais
-- son son (ni pour lui, ni pour l'épisode gratuit).
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready('epr', 'episode', 'Épisode réservé',
  jsonb_build_object('access_level_id', pg_temp.lid('complet')),
  jsonb_build_object('audio', jsonb_build_object('mediaId', pg_temp.mid('son')),
    'blocks', jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-000000000003', pg_temp.mid('photo')))))$$, 'epr');
select lives_ok($$select pg_temp.publish('epr')$$, 'l''épisode réservé se publie');
select ok(
  (pg_temp.live('epr')).files ?& array[pg_temp.mid('son')::text, pg_temp.mid('photo')::text],
  'sa version fige le son et l''image des blocs'
);
select pg_temp.as_anon();
select is(
  (select array[x ->> 'locked', ((x ->> 'durationS')::numeric = 754.5)::text,
      (select string_agg(k, ',') from jsonb_object_keys(x -> 'files') k)]
    from jsonb_array_elements(public.app_feed('podcasts') -> 'items') x
    where (x ->> 'id')::uuid = pg_temp.cid('epr')),
  array['true', 'true', pg_temp.mid('couverture')::text],
  'épisode réservé, pour un anonyme : verrouillé, sa durée, et sa vignette seule dans files'
);
select is(
  (select array_agg(distinct k) from jsonb_array_elements(public.app_feed('podcasts') -> 'items') x,
    jsonb_object_keys(x -> 'files') k),
  array[pg_temp.mid('couverture')::text],
  'aucun épisode ne livre d''autre fichier que sa vignette'
);
select is(
  array[position(pg_temp.mid('son')::text in public.app_feed('podcasts')::text),
    position(pg_temp.mid('photo')::text in public.app_feed('podcasts')::text)],
  array[0, 0],
  'ni le son ni l''image des blocs n''apparaissent dans app_feed (identifiant, chemin, transcription)'
);

-- Demandes invalides.
select throws_ok($$select public.app_feed('blog', null, null, 0)$$, 'P0001', 'demande_invalide', 'lim 0 refusé');
select throws_ok($$select public.app_feed('blog', null, null, 51)$$, 'P0001', 'demande_invalide', 'lim 51 refusé');
select throws_ok($$select public.app_feed('blog', null, 'abc')$$, 'P0001', 'demande_invalide', 'curseur mal formé refusé');
select throws_ok($$select public.app_feed(null)$$, 'P0001', 'demande_invalide', 'section absente refusée');
select pg_temp.as_postgres();

select * from finish();
rollback;

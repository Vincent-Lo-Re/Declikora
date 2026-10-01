-- Ordre des listes et remplacement d'un fichier (30/09/2026).
--   - list_position : un article, un épisode ou une méthode neuf arrive en tête de sa liste ;
--     une page n'a pas de place ; contents_reorder (équipe en aal2) range la liste complète hors
--     corbeille ; l'ordre de l'app est testé dans 44_sections_regles.test.sql.
--   - media_replace : le nouveau fichier (même type, prêt) remplace l'ancien dans les brouillons,
--     sauf celui que quelqu'un écrit ; ce qui est en ligne ne change pas. media_replace_live :
--     une nouvelle version en ligne avec le nouveau fichier.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(21);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- ---------------------------------------------------------------------------------------------
-- Ordre des listes
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('a', 'article', content_title => 'A');
select pg_temp.create_content('b', 'article', content_title => 'B');
select pg_temp.create_content('c', 'article', content_title => 'C');
select pg_temp.create_content('m', 'method', content_title => 'M');
select pg_temp.create_content('p', 'page', content_title => 'P');

-- Les titres des articles, dans l'ordre de la liste.
create function pg_temp.article_order()
returns text[]
language sql
security definer
as $$
  select array_agg(c.title order by c.list_position, c.id)
  from public.contents c
  where c.kind = 'article' and c.deleted_at is null
$$;
grant execute on function pg_temp.article_order() to public;

select is(pg_temp.article_order(), array['C', 'B', 'A'], 'un article neuf arrive en tête de sa liste');
select ok(
  (select list_position is not null from public.contents where id = pg_temp.cid('m')),
  'une méthode a aussi une place'
);
select is(
  (select list_position from public.contents where id = pg_temp.cid('p')), null,
  'une page n''a pas de place'
);

select pg_temp.as_anon();
select throws_ok(
  $$select public.contents_reorder('article', '{}')$$, '42501', null,
  'anonyme : contents_reorder refusé'
);
select pg_temp.as_person('editor', 'aal1');
select throws_ok(
  $$select public.contents_reorder('article', '{}')$$, '42501', 'reserve_a_l_equipe',
  'éditeur avant la double vérification : refusé'
);

select pg_temp.as_person('editor');
select throws_ok(
  format('select public.contents_reorder(%L, %L)', 'article', array[pg_temp.cid('a'), pg_temp.cid('c')]),
  'P0001', 'demande_invalide', 'une liste incomplète est refusée'
);
select throws_ok(
  format('select public.contents_reorder(%L, %L)', 'article',
    array[pg_temp.cid('a'), pg_temp.cid('b'), pg_temp.cid('m')]),
  'P0001', 'demande_invalide', 'un contenu d''une autre section est refusé'
);
select throws_ok(
  format('select public.contents_reorder(%L, %L)', 'page', array[pg_temp.cid('p')]),
  'P0001', 'demande_invalide', 'une page ne se range pas'
);
select lives_ok(
  format('select public.contents_reorder(%L, %L)', 'article',
    array[pg_temp.cid('a'), pg_temp.cid('c'), pg_temp.cid('b')]),
  'la liste complète se range'
);
select is(pg_temp.article_order(), array['A', 'C', 'B'], 'le nouvel ordre est gardé');

-- Un contenu mis à la corbeille n'est plus dans la liste à ranger, et garde sa place.
select public.trash(pg_temp.cid('c'));
select lives_ok(
  format('select public.contents_reorder(%L, %L)', 'article', array[pg_temp.cid('b'), pg_temp.cid('a')]),
  'sans ce qui est dans la corbeille'
);
select is(pg_temp.article_order(), array['B', 'A'], 'rangée sans lui');

-- ---------------------------------------------------------------------------------------------
-- Remplacer un fichier
-- ---------------------------------------------------------------------------------------------

-- « x » est en ligne avec « photo » dans ses blocs ; « y » est un brouillon qui l'utilise ;
-- « z » aussi, mais editor2 l'écrit en ce moment.
select pg_temp.create_content('x', 'article', content_title => 'X');
select pg_temp.save('x', pg_temp.draft(
  jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000c1', pg_temp.mid('photo'))),
  'X', pg_temp.cover()), '{"access_level_id": null}');
select pg_temp.publish('x');
select public.lock_release(pg_temp.cid('x'));
select pg_temp.create_content('y', 'page', content_title => 'Y');
select pg_temp.save('y', pg_temp.draft(
  jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000c2', pg_temp.mid('photo'))), 'Y'));
select public.lock_release(pg_temp.cid('y'));
select pg_temp.create_content('z', 'page', content_title => 'Z');
select pg_temp.save('z', pg_temp.draft(
  jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000c3', pg_temp.mid('photo'))), 'Z'));
select public.lock_release(pg_temp.cid('z'));
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('z'));

select pg_temp.as_anon();
select throws_ok(
  $$select public.media_replace(gen_random_uuid(), gen_random_uuid())$$, '42501', null,
  'anonyme : media_replace refusé'
);

select pg_temp.as_person('editor');
select throws_ok(
  format('select public.media_replace(%L, %L)', pg_temp.mid('photo'), pg_temp.mid('son')),
  'P0001', 'type_different', 'une image ne se remplace que par une image'
);
select pg_temp.as_postgres();
update public.media set status = 'checking' where id = pg_temp.mid('vieux');
select pg_temp.as_person('editor');
select throws_ok(
  format('select public.media_replace(%L, %L)', pg_temp.mid('photo'), pg_temp.mid('vieux')),
  'P0001', 'fichier_pas_pret', 'le nouveau fichier doit être prêt'
);

select is(
  public.media_replace(pg_temp.mid('photo'), pg_temp.mid('fond')),
  jsonb_build_object(
    'replaced', 2,
    'kept', jsonb_build_array(jsonb_build_object(
      'id', pg_temp.cid('z'), 'title', 'Z', 'holder', 'editeur2@tests.local'
    ))
  ),
  'deux brouillons remplacés ; celui qu''editor2 écrit est gardé, avec son nom'
);
select is(
  (select array_agg(c.title order by c.title) from public.contents c
    where c.draft_media_ids @> array[pg_temp.mid('fond')]),
  array['X', 'Y'],
  'les brouillons de X et Y utilisent le nouveau fichier'
);
select ok(
  (select c.draft_media_ids @> array[pg_temp.mid('photo')] from public.contents c where c.id = pg_temp.cid('z')),
  'Z garde l''ancien'
);
select ok(
  (pg_temp.live('x')).media_ids @> array[pg_temp.mid('photo')],
  'ce qui est en ligne ne change pas'
);

select is(
  (select count(*)::int from public.media_replace_live(pg_temp.mid('photo'), pg_temp.mid('fond'))),
  1,
  'media_replace_live : une nouvelle version pour X'
);
select ok(
  (select v.media_ids @> array[pg_temp.mid('fond')]
      and not v.media_ids @> array[pg_temp.mid('photo')]
      and v.files ? pg_temp.mid('fond')::text
      and not v.files ? pg_temp.mid('photo')::text
      and v.origin = 'files'
    from pg_temp.live('x') v),
  'la version en ligne montre le nouveau fichier (blocs et informations figées)'
);

select * from finish();
rollback;

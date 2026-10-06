-- Le titre est obligatoire pour publier (02/10/2026) : article, épisode et page. Un titre fait d'espaces ne compte pas. Refus à la publication et dès la
-- programmation ; un contenu titré se publie.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(14);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');
select lives_ok(
  $$select pg_temp.create_content('sans', 'article')$$, 'un article sans titre'
);
select lives_ok(
  $$select pg_temp.save('sans', pg_temp.draft(jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-000000000001')),
    '', pg_temp.cover()), '{"access_level_id": null}')$$,
  'gratuit, avec son image de présentation, mais sans titre'
);
select throws_ok(
  $$select pg_temp.publish('sans')$$, 'P0001', 'titre_manquant',
  'un article sans titre ne se publie pas'
);
select matches(
  pg_temp.error_of($$select pg_temp.publish('sans')$$), 'titre à l''article',
  'le détail nomme l''article'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('sans'), now() + interval '1 day')$$, 'P0001',
  'titre_manquant', 'ni ne se programme'
);
select is(
  (select scheduled_at from public.contents where id = pg_temp.cid('sans')), null,
  'rien n''est programmé'
);

select lives_ok(
  $$select pg_temp.save('sans', pg_temp.draft('[]', E'  \t ', pg_temp.cover()))$$,
  'un titre fait d''espaces'
);
select throws_ok(
  $$select pg_temp.publish('sans')$$, 'P0001', 'titre_manquant', 'des espaces ne font pas un titre'
);

-- Le titre passe avant l'image de présentation : on apprend d'abord ce qui manque en premier.
select lives_ok(
  $$select pg_temp.save('sans', pg_temp.draft('[]', ''))$$, 'ni titre ni image'
);
select throws_ok(
  $$select pg_temp.publish('sans')$$, 'P0001', 'titre_manquant', 'le titre est demandé d''abord'
);

select lives_ok(
  $$select pg_temp.save('sans', pg_temp.draft('[]', 'Bien dormir', pg_temp.cover()))$$,
  'le titre écrit'
);
select isnt(pg_temp.publish('sans'), null, 'l''article titré se publie');

-- Les autres sortes : même règle, chacune son message.
reset role;
select is(
  (select array_agg(pg_temp.error_of(format(
    $$select private.check_publish_requirements(%L, '{"title": ""}')$$, kind)) order by n)
   from unnest(array['episode', 'page']) with ordinality k (kind, n)),
  array[
    'titre_manquant | Donne un titre à l''épisode avant de le publier. | ',
    'titre_manquant | Donne un titre à la page avant de la publier. | '
  ],
  'épisode et page : titre obligatoire'
);
select is(
  pg_temp.error_of($$select private.check_publish_requirements('page', '{"title": "À propos"}')$$),
  null,
  'une page titrée passe (elle n''a pas d''image de présentation à fournir)'
);

select * from finish();
rollback;

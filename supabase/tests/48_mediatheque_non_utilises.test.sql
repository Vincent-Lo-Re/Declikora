-- « Non utilisés » de la médiathèque : la colonne calculée public.media_in_use(media), que la
-- liste de l'admin lit et filtre. Même règle que la corbeille (private.media_uses) : brouillon
-- ou version en ligne ; l'Historique ne compte pas. Équipe en aal2 seulement.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(12);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Un article en ligne : « photo » dans ses blocs, « couverture » en image de présentation.
-- « vieux » n'était que dans sa première version (Historique). « fond » est dans un brouillon
-- jamais publié. « son » ne sert nulle part.
select pg_temp.as_person('editor');
select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.save(
  'article',
  pg_temp.draft(
    jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-0000000000b1', pg_temp.mid('photo')),
      pg_temp.image_block('00000000-0000-4000-8000-0000000000b2', pg_temp.mid('vieux'))
    ),
    'Café',
    pg_temp.cover()
  ),
  '{"access_level_id": null}'
);
select pg_temp.publish('article');
select pg_temp.save(
  'article',
  pg_temp.draft(
    jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000b1', pg_temp.mid('photo'))),
    'Café',
    pg_temp.cover()
  )
);
select pg_temp.publish('article');
select pg_temp.create_content('brouillon', 'article', content_title => 'Brouillon');
select pg_temp.save(
  'brouillon',
  pg_temp.draft(
    jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000b3', pg_temp.mid('fond'))),
    'Brouillon'
  )
);
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Structure des droits
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'media_in_use', array['media'], 'anon', array[]::text[],
  'anon : ne peut pas appeler media_in_use'
);
select function_privs_are(
  'public', 'media_in_use', array['media'], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler media_in_use (colonne calculée de la liste)'
);
select ok(
  (select p.prosecdef and p.provolatile = 's' and p.proconfig = array['search_path=""']
    from pg_proc p where p.oid = 'public.media_in_use(public.media)'::regprocedure),
  'media_in_use : security definer, stable, search_path vide'
);

-- ---------------------------------------------------------------------------------------------
-- Équipe (aal2) : la règle
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select array_agg(m.name order by m.name) from public.media m where public.media_in_use(m)),
  array['couverture.webp', 'fond.webp', 'photo.webp'],
  'éditeur : utilisés = en ligne (blocs et image de présentation) ou dans un brouillon'
);
select is(
  (select array_agg(m.name order by m.name) from public.media m where not public.media_in_use(m)),
  array['son.mp3', 'vieux.webp'],
  'éditeur : non utilisés = nulle part, ou seulement dans l''Historique'
);

-- La liste de l'admin (PostgREST) : la colonne calculée se lit comme une colonne, avec le
-- filtre de la page.
select is(
  (select array_agg(m.name order by m.name) from public.media m
    where m.kind = 'image' and public.media_in_use(m) is false),
  array['vieux.webp'],
  'éditeur : le filtre se combine avec le type'
);

-- Retirée du brouillon, l'image redevient non utilisée ; un contenu mis à la corbeille garde
-- ses fichiers (comme media_trash : il peut revenir).
select pg_temp.save(
  'brouillon',
  pg_temp.draft(jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000000b4')), 'Brouillon')
);
select is(
  (select public.media_in_use(m) from public.media m where m.id = pg_temp.mid('fond')),
  false,
  'éditeur : une image retirée du brouillon n''est plus utilisée'
);
select public.trash(pg_temp.cid('article'));
select is(
  (select public.media_in_use(m) from public.media m where m.id = pg_temp.mid('photo')),
  true,
  'éditeur : un fichier d''un contenu mis à la corbeille reste utilisé'
);

-- ---------------------------------------------------------------------------------------------
-- Autres profils
-- ---------------------------------------------------------------------------------------------

-- Une ligne de media faite à la main (identifiant d'un fichier utilisé) : sans lire la table,
-- que ces profils ne voient pas.
select pg_temp.as_person('editor', 'aal1');
select is(
  public.media_in_use(jsonb_populate_record(null::public.media, jsonb_build_object('id', pg_temp.mid('photo')))),
  null,
  'éditeur aal1 : pas de réponse (null)'
);

select pg_temp.as_person('reader');
select is(
  public.media_in_use(jsonb_populate_record(null::public.media, jsonb_build_object('id', pg_temp.mid('photo')))),
  null,
  'lecteur : pas de réponse, même pour un fichier utilisé'
);

select pg_temp.as_postgres();
select is(
  public.media_in_use(jsonb_populate_record(null::public.media, jsonb_build_object('id', pg_temp.mid('photo')))),
  null,
  'sans session : pas de réponse (null)'
);

select pg_temp.as_anon();
select throws_ok(
  'select public.media_in_use(null::public.media)',
  '42501', null, 'anonyme : media_in_use refusé'
);

select * from finish();
rollback;

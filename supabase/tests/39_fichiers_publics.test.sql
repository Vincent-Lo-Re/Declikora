-- Fichiers publics ou protégés (docs/ARCHITECTURE-CONTENUS.md, § 4.4, § 4.5, § 5.1, § 5.2,
-- [D24], question 1) et textes figés d'un fichier ([D30] option B) :
--   - private.files_to_move : gratuit → réservé → gratuit, « encore utilisé par un contenu
--     gratuit », image de présentation d'un contenu réservé toujours publique, retrait de l'app
--     et corbeille qui la rendent protégée ;
--   - private.reader_can_open et la politique de Storage : anonyme, abonné du bon rang, rang trop
--     bas, abonnement expiré, équipe, éditeur aal1 ; la minute d'attente avant le déplacement ;
--   - app_file_locations suit le déplacement sans nouvelle version ;
--   - media_outdated et media_push.
-- Le déplacement lui-même (fonction « files ») est simulé ici par files_mark_moved ; le vrai
-- passage est vérifié par npm run functions:integration.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(74);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Les objets des quatre fichiers, tous dans le bucket protégé (comme après l'envoi).
insert into storage.objects (bucket_id, name, owner_id, metadata)
select 'files-protected', m.path, pg_temp.person_id('editor')::text,
  jsonb_build_object('size', 1000, 'mimetype', m.mime)
from public.media m;

-- Ce que la fonction « files » doit déplacer : « nom:public » ou « nom:protected ».
create function pg_temp.moves()
returns text[]
language sql
stable
security definer
as $$
  select coalesce(
    array_agg(split_part(m.name, '.', 1) || ':' || case when f.to_public then 'public' else 'protected' end
      order by m.name),
    '{}'
  )
  from private.files_to_move() f
  join public.media m on m.id = f.media_id
$$;

-- La fonction « files » a fait son travail (déplacements notés comme elle le fait).
create function pg_temp.apply_moves()
returns integer
language sql
security definer
as $$
  select count(public.files_mark_moved(f.media_id, f.to_public))::int from private.files_to_move() f
$$;

-- Le lecteur courant peut-il lire l'objet protégé de ce fichier ?
create function pg_temp.can_open(media_name text)
returns boolean
language sql
stable
as $$
  select private.reader_can_open(pg_temp.mid(media_name) || '/' || media_name || case media_name when 'son' then '.mp3' else '.webp' end)
$$;

-- Nombre d'objets protégés de ce fichier que le rôle courant voit par Storage (politiques).
create function pg_temp.sees(media_name text)
returns integer
language sql
stable
as $$
  select count(*)::int from storage.objects
  where bucket_id = 'files-protected' and name like pg_temp.mid(media_name) || '/%'
$$;

-- Emplacements donnés par l'app pour ces fichiers : « nom:public » ou « nom:protected ».
create function pg_temp.locations(media_names text[])
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(n.name || ':' || l.location order by n.name), '{}')
  from public.app_file_locations(array(select pg_temp.mid(x) from unnest(media_names) x)) l
  join unnest(media_names) n (name) on pg_temp.mid(n.name) = l.media_id
$$;

grant execute on function
  pg_temp.moves(), pg_temp.apply_moves(), pg_temp.can_open(text), pg_temp.sees(text),
  pg_temp.locations(text[])
to public;

select is(pg_temp.moves(), '{}'::text[], 'rien en ligne : aucun fichier à rendre public');

-- ---------------------------------------------------------------------------------------------
-- Contenu gratuit : ses fichiers deviennent publics
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('a', 'article', content_title => 'Article A');
select pg_temp.save(
  'a',
  pg_temp.draft(
    jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-0000000000a1', pg_temp.mid('photo')),
      pg_temp.box_block('00000000-0000-4000-8000-0000000000a2', jsonb_build_array(
        pg_temp.image_block('00000000-0000-4000-8000-0000000000a3', pg_temp.mid('photo'), 'Perso')
      ))
    ),
    'Article A',
    jsonb_build_object('cover', jsonb_build_object('mediaId', pg_temp.mid('fond')))
  ),
  '{"access_level_id": null}'
);
select is(
  (select needs_file_sync from public.publish(pg_temp.cid('a'), pg_temp.rev('a'))), true,
  'publier un contenu gratuit : needs_file_sync'
);
select is(pg_temp.moves(), array['fond:public', 'photo:public'], 'ses fichiers doivent devenir publics');

-- La minute d'attente : l'objet est encore dans le bucket protégé, et tout le monde peut le lire.
select pg_temp.as_anon();
select ok(pg_temp.can_open('photo'), 'anonyme : reader_can_open couvre la minute d''attente (gratuit)');
select is(pg_temp.sees('photo'), 1, 'anonyme : Storage laisse lire l''objet protégé pendant ce temps');
select is(
  pg_temp.locations(array['photo', 'fond', 'son', 'vieux']), array['fond:protected', 'photo:protected'],
  'app_file_locations : encore protégés, et seulement les fichiers en ligne'
);
select pg_temp.as_postgres();
select is(pg_temp.apply_moves(), 2, 'la fonction « files » les déplace');
select pg_temp.as_anon();
select is(
  pg_temp.locations(array['photo', 'fond']), array['fond:public', 'photo:public'],
  'app_file_locations suit le déplacement'
);
select pg_temp.as_postgres();
select is(
  (select count(*)::int from public.versions where content_id = pg_temp.cid('a')), 1,
  '... sans nouvelle version du contenu'
);
select is(pg_temp.moves(), '{}'::text[], 'plus rien à déplacer');

-- ---------------------------------------------------------------------------------------------
-- Contenu réservé : seule l'image de présentation est publique (question 1, réponse B)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('e', 'episode', content_title => 'Épisode');
select pg_temp.save(
  'e',
  pg_temp.draft(
    '[]', 'Épisode',
    jsonb_build_object(
      'cover', jsonb_build_object('mediaId', pg_temp.mid('vieux')),
      'audio', jsonb_build_object('mediaId', pg_temp.mid('son'))
    )
  ),
  jsonb_build_object('access_level_id', pg_temp.lid('complet'))
);
select pg_temp.publish('e');
select is(
  pg_temp.moves(), array['vieux:public'],
  'réservé : l''image de présentation devient publique, pas le son'
);
select pg_temp.as_postgres();
select pg_temp.apply_moves();

select pg_temp.as_anon();
select ok(not pg_temp.can_open('son'), 'anonyme : le son d''un contenu réservé est protégé');
select is(pg_temp.sees('son'), 0, 'anonyme : Storage refuse l''objet');
select ok(pg_temp.can_open('vieux'), 'anonyme : l''image de présentation d''un contenu réservé se lit');
select is(
  pg_temp.locations(array['son', 'vieux']), array['vieux:public'],
  'anonyme : app_file_locations ne donne que l''image de présentation'
);

select pg_temp.as_person('reader');
select ok(not pg_temp.can_open('son'), 'lecteur sans formule : le son est protégé');
select pg_temp.as_postgres();
insert into public.reader_access (user_id, access_level_id) values (pg_temp.person_id('reader'), pg_temp.lid('essentiel'));
select pg_temp.as_person('reader');
select ok(not pg_temp.can_open('son'), 'abonné de rang trop bas : le son est protégé');
select is(pg_temp.sees('son'), 0, 'abonné de rang trop bas : Storage refuse l''objet');
select is(pg_temp.locations(array['son']), '{}'::text[], 'abonné de rang trop bas : pas d''emplacement');
select pg_temp.as_postgres();
update public.reader_access set access_level_id = pg_temp.lid('complet') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select ok(pg_temp.can_open('son'), 'abonné du bon rang : le son se lit');
select is(pg_temp.sees('son'), 1, 'abonné du bon rang : Storage laisse lire l''objet');
select is(
  pg_temp.locations(array['son', 'vieux']), array['son:protected', 'vieux:public'],
  'abonné du bon rang : le son est protégé (lien temporaire), l''image publique'
);
select pg_temp.as_postgres();
update public.reader_access set valid_until = now() - interval '1 second' where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select ok(not pg_temp.can_open('son'), 'abonnement expiré : le son est protégé');
select pg_temp.as_postgres();
update public.reader_access set valid_until = null where user_id = pg_temp.person_id('reader');
-- [D2] : réordonner les formules change tout de suite ce que chaque abonné peut ouvrir.
update public.reader_access set access_level_id = pg_temp.lid('essentiel') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('admin');
select public.access_levels_reorder(array[pg_temp.lid('complet'), pg_temp.lid('essentiel')]);
select pg_temp.as_person('reader');
select ok(pg_temp.can_open('son'), 'formules réordonnées : « Essentiel » ouvre maintenant le son');
select pg_temp.as_person('admin');
select public.access_levels_reorder(array[pg_temp.lid('essentiel'), pg_temp.lid('complet')]);
select pg_temp.as_person('reader');
select ok(not pg_temp.can_open('son'), 'et plus après le retour à l''ordre d''avant');

select pg_temp.as_person('editor');
select ok(not pg_temp.can_open('son'), 'équipe : reader_can_open ne la concerne pas (pas de formule)');
select is(pg_temp.sees('son'), 1, 'équipe aal2 : Storage laisse lire l''objet (politique de l''équipe)');
select pg_temp.as_person('editor', 'aal1');
select is(pg_temp.sees('son'), 0, 'éditeur aal1 : Storage refuse l''objet');
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Gratuit → réservé → gratuit, et « encore utilisé par un contenu gratuit »
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('f', 'article', content_title => 'Article F');
select pg_temp.save(
  'f',
  pg_temp.draft(jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000f1', pg_temp.mid('photo'))), 'Article F', pg_temp.cover('photo')),
  '{"access_level_id": null}'
);
select pg_temp.publish('f');
select is(pg_temp.moves(), '{}'::text[], 'un second contenu gratuit avec la même photo : rien à déplacer');

select pg_temp.save('a', (select draft from public.contents where id = pg_temp.cid('a')),
  jsonb_build_object('access_level_id', pg_temp.lid('complet')));
select is(
  (select needs_file_sync from public.publish(pg_temp.cid('a'), pg_temp.rev('a'))), false,
  'A devient réservé : rien à déplacer'
);
select is(
  pg_temp.moves(), '{}'::text[],
  'la photo reste publique : encore utilisée par un contenu gratuit (F) ; la couverture de A aussi'
);
select pg_temp.as_anon();
select ok(pg_temp.can_open('photo'), 'anonyme : la photo se lit toujours (F est gratuit)');
select pg_temp.as_person('editor');
select is(public.unpublish(pg_temp.cid('f')), true, 'retirer F de l''app : needs_file_sync');
select is(pg_temp.moves(), array['photo:protected'], 'la photo doit redevenir protégée');
select pg_temp.as_service();
select results_eq(
  format('select action, to_public from public.files_worklist() where media_id = %L', pg_temp.mid('photo')),
  $$values ('move', false)$$,
  'files_worklist (fonction « files ») : déplacer la photo vers le bucket protégé'
);
select pg_temp.as_anon();
select ok(not pg_temp.can_open('photo'), 'anonyme : la photo de A (réservé) n''est plus lisible');
select is(pg_temp.locations(array['photo']), '{}'::text[], 'anonyme : plus d''emplacement pour la photo');
select pg_temp.as_person('reader');
select is(
  pg_temp.locations(array['photo']), '{}'::text[],
  'abonné « Essentiel » : pas la photo de A (« Complet »)'
);
select pg_temp.as_postgres();
update public.reader_access set access_level_id = pg_temp.lid('complet') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select is(
  pg_temp.locations(array['photo']), array['photo:public'],
  'abonné « Complet » : la photo est encore dans le bucket public (pas encore déplacée)'
);
select pg_temp.as_postgres();
select pg_temp.apply_moves();
select pg_temp.as_person('reader');
select is(
  pg_temp.locations(array['photo']), array['photo:protected'],
  'app_file_locations suit le retour dans le bucket protégé, sans nouvelle version'
);
select ok(pg_temp.can_open('photo'), 'abonné « Complet » : la photo protégée se lit');

select pg_temp.as_person('editor');
select pg_temp.save('a', (select draft from public.contents where id = pg_temp.cid('a')), '{"access_level_id": null}');
select pg_temp.publish('a');
select is(pg_temp.moves(), array['photo:public'], 'A redevient gratuit : la photo doit redevenir publique');
select pg_temp.as_postgres();
select pg_temp.apply_moves();

-- ---------------------------------------------------------------------------------------------
-- Image de présentation : retrait de l'app et corbeille
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select public.unpublish(pg_temp.cid('e'));
select is(
  pg_temp.moves(), array['vieux:protected'],
  'retirer un contenu réservé de l''app : son image de présentation redevient protégée'
);
select pg_temp.as_anon();
select ok(not pg_temp.can_open('vieux'), 'anonyme : l''image de présentation n''est plus lisible');
select pg_temp.as_postgres();
select pg_temp.apply_moves();
select pg_temp.as_person('editor');
select pg_temp.publish('e');
select is(pg_temp.moves(), array['vieux:public'], 'republié : de nouveau publique');
select pg_temp.as_postgres();
select pg_temp.apply_moves();
select pg_temp.as_person('editor');
select is(
  (select needs_file_sync from public.trash(pg_temp.cid('e'))), true,
  'mettre le contenu à la corbeille : needs_file_sync'
);
select is(
  pg_temp.moves(), array['vieux:protected'],
  'mis à la corbeille : son image de présentation redevient protégée'
);
select pg_temp.as_postgres();
select pg_temp.apply_moves();

-- ---------------------------------------------------------------------------------------------
-- reader_can_open et app_file_locations : cas limites
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_anon();
select ok(not private.reader_can_open(null), 'reader_can_open : nom absent');
select ok(not private.reader_can_open('pas-un-uuid/photo.webp'), 'reader_can_open : dossier qui n''est pas un identifiant');
select ok(
  not private.reader_can_open(pg_temp.mid('photo') || '/autre.webp'),
  'reader_can_open : autre objet dans le dossier d''un fichier public'
);
select ok(
  not private.reader_can_open(pg_temp.mid('photo')::text),
  'reader_can_open : le dossier seul'
);
select is(
  (select count(*)::int from public.app_file_locations(null)), 0, 'app_file_locations(null) : rien'
);
select throws_ok(
  $$select public.app_file_locations(array(select gen_random_uuid() from generate_series(1, 501)))$$,
  'P0001', 'demande_invalide', 'app_file_locations : 500 fichiers au plus par appel'
);
select is(
  (select count(*)::int from public.app_file_locations(array(select gen_random_uuid() from generate_series(1, 500)))),
  0, 'app_file_locations : des fichiers inconnus sont ignorés'
);
select pg_temp.as_postgres();

-- ---------------------------------------------------------------------------------------------
-- Textes figés d'un fichier : media_outdated et media_push ([D30] option B)
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('e2', 'episode', content_title => 'Épisode gratuit');
select pg_temp.save(
  'e2',
  pg_temp.draft('[]', 'Épisode gratuit', pg_temp.cover('fond') || jsonb_build_object('audio', jsonb_build_object('mediaId', pg_temp.mid('son')))),
  '{"access_level_id": null}'
);
select pg_temp.publish('e2');
select is(pg_temp.moves(), array['son:public'], 'un épisode gratuit : son son devient public');
select pg_temp.as_postgres();
select pg_temp.apply_moves();
select pg_temp.as_person('editor');

select is(
  (select count(*)::int from public.media_outdated(pg_temp.mid('photo'))), 0,
  'media_outdated : aucun contenu en ligne n''a d''ancien texte'
);
update public.media set alt = 'Un chat roux' where id = pg_temp.mid('photo');
select results_eq(
  format('select content_id, kind, title, version_number from public.media_outdated(%L)', pg_temp.mid('photo')),
  format('values (%L::uuid, ''article'', ''Article A'', 3)', pg_temp.cid('a')),
  'media_outdated : A (en ligne) a l''ancien texte ; F (retiré) n''est pas proposé'
);

-- Le brouillon de A change ensuite : media_push ne le publie pas.
select pg_temp.save('a', jsonb_set((select draft from public.contents where id = pg_temp.cid('a')), '{title}', '"Titre pas publié"'));
select results_eq(
  format('select content_id, version_number from public.media_push(%L)', pg_temp.mid('photo')),
  format('values (%L::uuid, 4)', pg_temp.cid('a')),
  'media_push : une nouvelle version pour A'
);
select pg_temp.as_postgres();
select results_eq(
  format(
    $$select v.origin, v.body ->> 'title', v.draft_rev = prev.draft_rev, v.published_by,
        v.published_by_name, c.live_version_id = v.id
      from public.versions v
      join public.versions prev on prev.content_id = v.content_id and prev.number = 3
      join public.contents c on c.id = v.content_id
      where v.content_id = %L and v.number = 4$$,
    pg_temp.cid('a')
  ),
  format(
    $$values ('files', 'Article A', true, %L::uuid, 'editeur@tests.local', true)$$,
    pg_temp.person_id('editor')
  ),
  'media_push : origine « files », en ligne, même corps (le brouillon n''est pas publié), même révision'
);
select is(
  (select array[
      body #>> '{blocks,0,alt}', body #>> '{blocks,1,blocks,0,alt}', files #>> array[pg_temp.mid('photo')::text, 'alt']
    ]
    from public.versions where content_id = pg_temp.cid('a') and number = 4),
  array['Un chat roux', 'Perso', 'Un chat roux'],
  'media_push : le texte qui suit la médiathèque et files changent ; le texte propre au contenu reste'
);
select is(
  (select (v.body - 'blocks') = (prev.body - 'blocks')
      and v.media_ids = prev.media_ids and v.cover_media_id = prev.cover_media_id
      and v.access_level_id is not distinct from prev.access_level_id
      and v.category_ids = prev.category_ids and v.block_types = prev.block_types
      and (v.files - pg_temp.mid('photo')::text) = (prev.files - pg_temp.mid('photo')::text)
    from public.versions v
    join public.versions prev on prev.content_id = v.content_id and prev.number = 3
    where v.content_id = pg_temp.cid('a') and v.number = 4),
  true,
  'media_push : tout le reste de la version en ligne est recopié'
);
select is(
  (select body_hash = encode(sha256(convert_to(jsonb_build_array(body, files)::text, 'UTF8')), 'hex')
    from public.versions where content_id = pg_temp.cid('a') and number = 4),
  true,
  'media_push : empreinte recalculée'
);
select ok(
  (select extensions.jsonb_matches_schema(private.blocks_schema('published'), body)
    from public.versions where content_id = pg_temp.cid('a') and number = 4),
  'media_push : la version a toujours la forme « published »'
);
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('a')) #>> array['files', pg_temp.mid('photo')::text, 'alt'], 'Un chat roux',
  'l''app lit le nouveau texte'
);
select pg_temp.as_person('editor');
select is(
  (select count(*)::int from public.media_outdated(pg_temp.mid('photo'))), 0,
  'media_outdated : plus rien à mettre à jour'
);
select is(
  (select count(*)::int from public.media_push(pg_temp.mid('photo'))), 0, 'media_push : rejouable'
);
select isnt(
  (select draft_rev from public.contents where id = pg_temp.cid('a')),
  (select v.draft_rev from public.versions v join public.contents c on c.live_version_id = v.id where c.id = pg_temp.cid('a')),
  '« Modifié depuis la publication » reste vrai'
);

-- Transcription d'un son, et un contenu réservé en ligne.
update public.media set transcript = 'Bonjour à toutes et à tous' where id = pg_temp.mid('son');
select results_eq(
  format('select content_id from public.media_outdated(%L)', pg_temp.mid('son')),
  format('values (%L::uuid)', pg_temp.cid('e2')),
  'media_outdated : la transcription figée de l''épisode en ligne (pas celui de la corbeille)'
);
select is(
  (select count(*)::int from public.media_push(pg_temp.mid('son'))), 1, 'media_push : l''épisode'
);
select is(
  (select v.files #>> array[pg_temp.mid('son')::text, 'transcript'] from public.versions v
    join public.contents c on c.live_version_id = v.id where c.id = pg_temp.cid('e2')),
  'Bonjour à toutes et à tous',
  'media_push : transcription mise à jour'
);
-- Un texte effacé (null) se met aussi à jour.
update public.media set alt = null where id = pg_temp.mid('photo');
select is(
  (select count(*)::int from public.media_push(pg_temp.mid('photo'))), 1, 'texte alternatif effacé : A mis à jour'
);
select is(
  (select array[v.body #>> '{blocks,0,alt}', coalesce(v.files #>> array[pg_temp.mid('photo')::text, 'alt'], 'null')]
    from public.versions v join public.contents c on c.live_version_id = v.id where c.id = pg_temp.cid('a')),
  array['', 'null'],
  'texte effacé : chaîne vide dans le bloc (comme à la publication), null dans files'
);
select throws_ok(
  $$select public.media_push('10000000-0000-4000-8000-0000000000ff')$$, 'P0001', 'fichier_introuvable',
  'media_push : fichier inconnu'
);
select is(
  pg_temp.moves(), '{}'::text[], 'media_push ne change pas l''emplacement des fichiers'
);

select * from finish();
rollback;

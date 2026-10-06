-- Publication : règles tenues par la base (docs/ARCHITECTURE-CONTENUS.md, § 1.3, § 1.6, § 1.7,
-- § 2.4, § 3.3, § 3.4, § 5.1, « Étape 5 ») : niveau d'accès à choisir ([D41]), réglages et rejeu
-- de save_draft, publication (verrou d'un autre membre [D14], révision, fichiers, adresse, son),
-- versions figées et immuables, blocs liés résolus, textes alternatifs figés ([D30]), retrait
-- de l'app, lecture par l'app (verrouillage selon la formule, [D2]), « Revenir à cette version »,
-- formules ([D32]) et « Où il est utilisé ».
-- La programmation (tâche « publications », [D16], [D31]) est dans 36_programmation.test.sql.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(167);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Niveau d'accès : pas de niveau par défaut ([D41])
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('article', 'article', content_title => 'Café')$$, 'un article');
select is(
  (select array[access_chosen::text, coalesce(access_level_id::text, 'gratuit')]
    from public.contents where id = pg_temp.cid('article')),
  array['false', 'gratuit'],
  'un contenu neuf n''a pas de niveau choisi'
);
select throws_ok(
  $$select pg_temp.publish('article')$$, 'P0001', 'acces_a_choisir',
  'publier sans avoir choisi le niveau est refusé'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('article'), now() + interval '1 day')$$, 'P0001', 'acces_a_choisir',
  'programmer sans avoir choisi le niveau est refusé'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"access_level_id": "gratuit"}')$$,
  'P0001', 'reglages_invalides', 'niveau : un identifiant mal formé est refusé'
);
select throws_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'),
    '{"access_level_id": "40000000-0000-4000-8000-0000000000ff"}')$$,
  'P0001', 'niveau_invalide', 'niveau : une formule inconnue est refusée'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'), '{"access_level_id": null}')$$,
  'niveau : « Gratuit » (null) se choisit'
);
select is(
  (select array[access_chosen::text, coalesce(access_level_id::text, 'gratuit')]
    from public.contents where id = pg_temp.cid('article')),
  array['true', 'gratuit'],
  'Gratuit : le niveau est choisi, sans formule'
);
select lives_ok(
  $$select pg_temp.save('article', pg_temp.draft('[]', 'Café'),
    jsonb_build_object('access_level_id', pg_temp.lid('complet')))$$,
  'niveau : une formule se choisit'
);
select is(
  (select access_level_id from public.contents where id = pg_temp.cid('article')),
  pg_temp.lid('complet'),
  'formule enregistrée'
);
select lives_ok($$select pg_temp.create_content('tpl', 'template', sort => 'shared')$$, 'un modèle « bloc partagé »');
select throws_ok(
  $$select pg_temp.save('tpl', pg_temp.draft('[]'), '{"access_level_id": null}')$$,
  'P0001', 'reglages_invalides', 'niveau : refusé sur un modèle'
);

-- ---------------------------------------------------------------------------------------------
-- Rejeu de save_draft avec des réglages (réponse perdue, étendu à l'étape 5)
-- ---------------------------------------------------------------------------------------------

create temporary table replay (rev integer) on commit drop;
grant all on replay to public;
insert into replay select pg_temp.rev('article');

select is(
  (select draft_rev from public.save_draft(pg_temp.cid('article'), (select rev from replay),
    pg_temp.draft('[]', 'Café'),
    jsonb_build_object('access_level_id', pg_temp.lid('essentiel'), 'category_ids',
      jsonb_build_array(pg_temp.catid('sommeil'))))),
  (select rev + 1 from replay),
  'enregistrement avec le niveau et les catégories'
);
select is(
  (select draft_rev from public.save_draft(pg_temp.cid('article'), (select rev from replay),
    pg_temp.draft('[]', 'Café'),
    jsonb_build_object('category_ids', jsonb_build_array(pg_temp.catid('sommeil')),
      'access_level_id', pg_temp.lid('essentiel')))),
  (select rev + 1 from replay),
  'rejeu du même envoi avec ses réglages : la révision déjà enregistrée, sans conflit'
);
select is(pg_temp.rev('article'), (select rev + 1 from replay), 'rejeu : rien n''est réécrit');
select throws_ok(
  $$select public.save_draft(pg_temp.cid('article'), (select rev from replay),
    pg_temp.draft('[]', 'Café'), jsonb_build_object('access_level_id', pg_temp.lid('complet')))$$,
  'P0001', 'conflit_revision', 'rejeu avec d''autres réglages : conflit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.cid('article'), (select rev from replay),
    pg_temp.draft('[]', 'Café'), '{"access_level_id": null}')$$,
  'P0001', 'conflit_revision', 'rejeu qui demande « Gratuit » alors qu''une formule est en place : conflit'
);

-- L'adresse d'une page (panneau « Réglages du contenu ») : son rejeu aussi est reconnu.
select lives_ok($$select pg_temp.create_content('rp', 'page', content_title => 'Rejeu')$$, 'une page pour le rejeu de l''adresse');
create temporary table replay_page (rev integer) on commit drop;
grant all on replay_page to public;
insert into replay_page select pg_temp.rev('rp');
select is(
  (select draft_rev from public.save_draft(pg_temp.cid('rp'), (select rev from replay_page),
    pg_temp.draft('[]', 'Rejeu'), '{"slug": "rejeu", "access_level_id": null}')),
  (select rev + 1 from replay_page),
  'page : enregistrement avec l''adresse et le niveau'
);
select is(
  (select draft_rev from public.save_draft(pg_temp.cid('rp'), (select rev from replay_page),
    pg_temp.draft('[]', 'Rejeu'), '{"slug": "rejeu", "access_level_id": null}')),
  (select rev + 1 from replay_page),
  'rejeu du même envoi avec l''adresse : la révision déjà enregistrée, sans conflit'
);
select is(
  (select array[draft_rev::text, slug] from public.contents where id = pg_temp.cid('rp')),
  array[(select rev + 1 from replay_page)::text, 'rejeu'],
  'rejeu de l''adresse : rien n''est réécrit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.cid('rp'), (select rev from replay_page),
    pg_temp.draft('[]', 'Rejeu'), '{"slug": "autre"}')$$,
  'P0001', 'conflit_revision', 'rejeu avec une autre adresse : conflit'
);
select throws_ok(
  $$select public.save_draft(pg_temp.cid('rp'), (select rev from replay_page),
    pg_temp.draft('[]', 'Rejeu'), '{"slug": null}')$$,
  'P0001', 'conflit_revision', 'rejeu qui retire l''adresse alors qu''elle est en place : conflit'
);

-- ---------------------------------------------------------------------------------------------
-- Publier : révision, verrou d'un autre membre ([D14])
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.save('article',
    pg_temp.draft(
      jsonb_build_array(
        pg_temp.text_block('00000000-0000-4000-8000-000000000001'),
        pg_temp.image_block('00000000-0000-4000-8000-000000000002', pg_temp.mid('fond')),
        pg_temp.box_block('00000000-0000-4000-8000-000000000003', jsonb_build_array(
          pg_temp.image_block('00000000-0000-4000-8000-000000000004', pg_temp.mid('photo'), 'Propre')
        ))
      ),
      'Café',
      jsonb_build_object('cover', jsonb_build_object('mediaId', pg_temp.mid('photo')))
    ))$$,
  'l''article reçoit ses blocs et son image de présentation'
);
select throws_ok(
  $$select public.publish(pg_temp.cid('article'), null)$$, 'P0001', 'demande_invalide',
  'publier sans révision attendue est refusé'
);
select throws_ok(
  $$select public.publish(pg_temp.cid('article'), pg_temp.rev('article') - 1)$$, 'P0001', 'conflit_revision',
  'publier une révision dépassée est refusé'
);

select pg_temp.as_postgres();
update public.edit_locks
set holder_id = pg_temp.person_id('editor2'), holder_session = null, heartbeat_at = now()
where content_id = pg_temp.cid('article');
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.publish('article')$$, 'P0001', 'verrou_tenu',
  'publier pendant qu''un autre membre écrit est refusé ([D14])'
);
select matches(
  pg_temp.error_of($$select pg_temp.publish('article')$$),
  'editeur2@tests\.local écrit ce brouillon.*\| editeur2@tests\.local$',
  'verrou_tenu : le détail et l''indice nomment la personne'
);
select pg_temp.as_postgres();
update public.edit_locks set heartbeat_at = now() - interval '91 seconds'
where content_id = pg_temp.cid('article');
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.publish('article')$$, 'un verrou périmé d''un autre membre ne bloque pas');
select pg_temp.as_postgres();
update public.edit_locks
set holder_id = pg_temp.person_id('editor'), holder_session = null, heartbeat_at = now()
where content_id = pg_temp.cid('article');
select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- La version écrite
-- ---------------------------------------------------------------------------------------------

select is(
  (select array[v.number::text, v.origin, v.published_by::text, v.published_by_name,
      v.draft_rev::text, v.access_level_id::text]
    from pg_temp.live('article') v),
  array['1', 'manual', pg_temp.person_id('editor')::text, 'editeur@tests.local',
    pg_temp.rev('article')::text, pg_temp.lid('essentiel')::text],
  'version : numéro, origine, auteur et son nom recopié, révision d''origine, niveau figé'
);
select is(
  (select array[(first_published_at is not null)::text, (live_version_id = (pg_temp.live('article')).id)::text]
    from public.contents where id = pg_temp.cid('article')),
  array['true', 'true'],
  'contenu : en ligne, avec sa date de première publication'
);
select is(
  (pg_temp.live('article')).media_ids,
  array[pg_temp.mid('photo'), pg_temp.mid('fond')],
  'version : tous les fichiers cités (couverture comprise), triés'
);
select is(
  (pg_temp.live('article')).cover_media_id, pg_temp.mid('photo'),
  'version : l''image de présentation est recopiée'
);
select is(
  (pg_temp.live('article')).block_types, array['box', 'image', 'text'],
  'version : les sortes de blocs utilisées'
);
select is(
  (pg_temp.live('article')).category_ids, array[pg_temp.catid('sommeil')],
  'version : les catégories du brouillon sont figées'
);
select ok((pg_temp.live('article')).body_hash ~ '^[0-9a-f]{64}$', 'version : empreinte SHA-256');
select is(
  (pg_temp.live('article')).body -> 'blocks' -> 1,
  pg_temp.image_block('00000000-0000-4000-8000-000000000002', pg_temp.mid('fond'), '')
    || '{"altFromLibrary": true}',
  'version : texte alternatif repris de la médiathèque (vide) et marqué altFromLibrary'
);
select is(
  (pg_temp.live('article')).body #> '{blocks,2,blocks,0}',
  pg_temp.image_block('00000000-0000-4000-8000-000000000004', pg_temp.mid('photo'), 'Propre'),
  'version : un texte alternatif propre au contenu est gardé, sans marqueur'
);
select is(
  (pg_temp.live('article')).files -> pg_temp.mid('photo')::text,
  jsonb_build_object('kind', 'image', 'mime', 'image/webp', 'path', pg_temp.mid('photo') || '/photo.webp',
    'alt', 'Un chat', 'transcript', null, 'width', null, 'height', null, 'durationS', null),
  'version : informations du fichier figées (files)'
);
select pg_temp.as_postgres();
select ok(
  extensions.jsonb_matches_schema(private.blocks_schema('published'), (pg_temp.live('article')).body),
  'version : le corps a la forme « published »'
);
select pg_temp.as_person('editor');

-- Texte alternatif figé ([D30]) : le corriger dans la médiathèque ne change pas la version.
update public.media set alt = 'Un chien' where id = pg_temp.mid('photo');
update public.media set alt = 'Fond bleu' where id = pg_temp.mid('fond');
select is(
  array[(pg_temp.live('article')).files #>> array[pg_temp.mid('photo')::text, 'alt'],
    (pg_temp.live('article')).body #>> '{blocks,1,alt}'],
  array['Un chat', ''],
  'texte alternatif figé : la version garde l''ancien texte'
);
select is(
  public.app_content(pg_temp.cid('article')) #>> array['files', pg_temp.mid('photo')::text, 'alt'],
  'Un chat',
  'texte alternatif figé : l''app lit l''ancien texte jusqu''à la prochaine publication'
);

select pg_temp.as_postgres();
update public.contents set first_published_at = '2026-01-01 08:00+01' where id = pg_temp.cid('article');
select pg_temp.as_person('editor');
select is(
  (select array[version_number::text, (needs_file_sync is not null)::text]
    from public.publish(pg_temp.cid('article'), pg_temp.rev('article'))),
  array['2', 'true'],
  'republier : version 2, needs_file_sync renseigné'
);
select is(
  array[(pg_temp.live('article')).files #>> array[pg_temp.mid('photo')::text, 'alt'],
    (pg_temp.live('article')).body #>> '{blocks,1,alt}'],
  array['Un chien', 'Fond bleu'],
  'republier : les nouveaux textes alternatifs partent'
);
select is(
  (select first_published_at from public.contents where id = pg_temp.cid('article')),
  '2026-01-01 08:00+01'::timestamptz,
  'republier : la date de première publication ne change pas ([D27])'
);
select is(
  (select count(*)::int from public.versions where content_id = pg_temp.cid('article')), 2,
  'republier : l''historique garde la version 1'
);

-- ---------------------------------------------------------------------------------------------
-- Publier : ce qui est refusé
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('vide', 'article')$$, 'un article aux images vides');
select lives_ok(
  $$select pg_temp.save('vide', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000011'),
    pg_temp.image_block('00000000-0000-4000-8000-000000000012', null),
    pg_temp.box_block('00000000-0000-4000-8000-000000000013', jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-000000000014', null)))
  ), extra => pg_temp.cover()), '{"access_level_id": null}')$$,
  'un brouillon peut avoir des images sans fichier'
);
select throws_ok(
  $$select pg_temp.publish('vide')$$, 'P0001', 'image_sans_fichier',
  'publier une image sans fichier est refusé'
);
select matches(
  pg_temp.error_of($$select pg_temp.publish('vide')$$), 'bloc n° 2, bloc n° 3',
  'image_sans_fichier : le détail donne la place des blocs (encadrés compris)'
);

select lives_ok($$select pg_temp.create_content('mauvais', 'article')$$, 'un article qui cite un son comme image');
select lives_ok(
  $$select pg_temp.save('mauvais', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000021', pg_temp.mid('son'))),
    extra => pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'le brouillon l''accepte (le déclencheur ne regarde que la disponibilité)'
);
select throws_ok(
  $$select pg_temp.publish('mauvais')$$, 'P0001', 'fichier_inadapte',
  'publier un son dans un bloc Image est refusé'
);

select lives_ok($$select pg_temp.create_content('indispo', 'article')$$, 'un article qui cite un fichier');
select lives_ok(
  $$select pg_temp.save('indispo', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000031', pg_temp.mid('vieux'))),
    extra => pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'brouillon avec « vieux »'
);
select pg_temp.as_postgres();
update public.media set status = 'checking' where id = pg_temp.mid('vieux');
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.publish('indispo')$$, 'P0001', 'fichier_indisponible',
  'publier un fichier qui n''est plus prêt est refusé'
);
select pg_temp.as_postgres();
update public.media set status = 'ready' where id = pg_temp.mid('vieux');
select pg_temp.as_person('editor');

select lives_ok($$select pg_temp.create_content('ep', 'episode')$$, 'un épisode');
select lives_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', extra => pg_temp.cover()), '{"access_level_id": null}')$$,
  'épisode gratuit, avec son image de présentation, sans son'
);
select throws_ok($$select pg_temp.publish('ep')$$, 'P0001', 'son_manquant', 'un épisode sans son ne se publie pas');
select lives_ok(
  $$select pg_temp.save('ep', pg_temp.draft('[]', 'Épisode', pg_temp.cover() || jsonb_build_object('audio',
    jsonb_build_object('mediaId', pg_temp.mid('son')))))$$,
  'épisode : son choisi'
);
select lives_ok($$select pg_temp.publish('ep')$$, 'un épisode avec son se publie');
select is(
  (pg_temp.live('ep')).files #>> array[pg_temp.mid('son')::text, 'transcript'], 'Bonjour à tous',
  'épisode : la transcription est figée'
);

select throws_ok($$select pg_temp.publish('tpl')$$, 'P0001', 'sorte_invalide', 'un modèle ne se publie pas');
select throws_ok(
  $$select public.publish('20000000-0000-4000-8000-0000000000ff', 1)$$, 'P0001', 'contenu_introuvable',
  'publier un contenu inconnu'
);

-- ---------------------------------------------------------------------------------------------
-- Pages : adresse
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('p1', 'page', content_title => 'Aide')$$, 'une page');
select lives_ok($$select pg_temp.save('p1', pg_temp.draft('[]', 'Aide'), '{"access_level_id": null}')$$, 'page gratuite');
select throws_ok($$select pg_temp.publish('p1')$$, 'P0001', 'adresse_manquante', 'une page sans adresse ne se publie pas');
select lives_ok($$select pg_temp.save('p1', pg_temp.draft('[]', 'Aide'), '{"slug": "aide"}')$$, 'adresse « aide »');
select lives_ok($$select pg_temp.publish('p1')$$, 'la page se publie');
select is((pg_temp.live('p1')).slug, 'aide', 'l''adresse est figée dans la version');
select lives_ok(
  $$select pg_temp.save('p1', pg_temp.draft('[]', 'Aide (nouvelle)'), '{"slug": "aide-2"}')$$,
  'l''adresse du brouillon change'
);
select is(
  public.app_page('aide') ->> 'id', pg_temp.cid('p1')::text,
  'changer l''adresse du brouillon ne change pas app_page : l''ancienne adresse marche encore'
);
select ok(public.app_page('aide-2') is null, 'la nouvelle adresse n''existe pas avant la publication');
select is(public.app_page('aide') ->> 'title', 'Aide', 'app_page donne la version en ligne, pas le brouillon');
select lives_ok($$select pg_temp.create_content('p2', 'page', content_title => 'Autre')$$, 'une seconde page');
select lives_ok(
  $$select pg_temp.save('p2', pg_temp.draft('[]', 'Autre'), '{"slug": "aide", "access_level_id": null}')$$,
  'la seconde page prend « aide » dans son brouillon (la première ne l''a plus)'
);
select throws_ok(
  $$select pg_temp.publish('p2')$$, 'P0001', 'adresse_prise',
  'elle ne se publie pas : une autre page en ligne a cette adresse'
);

-- ---------------------------------------------------------------------------------------------
-- Blocs liés : résolus en copies figées
-- ---------------------------------------------------------------------------------------------

select lives_ok(
  $$select pg_temp.save('tpl', pg_temp.draft(jsonb_build_array(
    pg_temp.box_block('00000000-0000-4000-8000-000000000041', jsonb_build_array(
      pg_temp.text_block('00000000-0000-4000-8000-000000000042', 'Contact'))))))$$,
  'le modèle contient un encadré'
);
select lives_ok($$select pg_temp.create_content('lie', 'article')$$, 'un article qui utilise le modèle');
select lives_ok(
  $$select pg_temp.save('lie', pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000051', 'type', 'linked', 'templateId', pg_temp.cid('tpl'))),
    extra => pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'brouillon avec un bloc lié'
);
select lives_ok($$select pg_temp.publish('lie')$$, 'un contenu avec un bloc lié se publie');
select is(
  (pg_temp.live('lie')).body -> 'blocks' -> 0,
  jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000051', 'type', 'box', 'look', 'fill',
    'templateId', pg_temp.cid('tpl'),
    'blocks', jsonb_build_array(pg_temp.text_block(
      md5('00000000-0000-4000-8000-000000000051/00000000-0000-4000-8000-000000000042')::uuid::text,
      'Contact'))
  ),
  'bloc lié : copie du modèle, id du bloc lié, marqueur templateId, id intérieurs tirés du bloc lié'
);
select is((pg_temp.live('lie')).template_ids, array[pg_temp.cid('tpl')], 'version : modèles cités');
create temporary table first_hash on commit drop as select (pg_temp.live('lie')).body_hash as hash;
select lives_ok($$select pg_temp.publish('lie')$$, 'republier sans rien changer');
select is(
  (pg_temp.live('lie')).body_hash, (select hash from first_hash),
  'empreinte identique d''une publication à l''autre (copies stables)'
);
select pg_temp.as_postgres();
update public.contents set deleted_at = now(), trash_batch = gen_random_uuid() where id = pg_temp.cid('tpl');
select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.publish('lie')$$, 'P0001', 'modele_indisponible',
  'modèle dans la corbeille : la publication est refusée'
);
select pg_temp.as_postgres();
update public.contents set deleted_at = null, trash_batch = null where id = pg_temp.cid('tpl');

-- ---------------------------------------------------------------------------------------------
-- Une version ne change jamais ; un contenu ne pointe que vers ses versions
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$update public.versions set origin = 'files' where content_id = pg_temp.cid('article')$$,
  'P0001', 'version_immuable', 'même postgres ne modifie pas une version'
);
select throws_ok(
  $$delete from public.versions where content_id = pg_temp.cid('article')$$,
  'P0001', 'version_immuable', 'ni ne la supprime'
);
set local client_min_messages = warning;
select throws_ok(
  $$truncate public.versions cascade$$, 'P0001', 'version_immuable', 'ni ne vide la table'
);
reset client_min_messages;
select throws_ok(
  $$update public.contents set live_version_id = (pg_temp.live('p1')).id where id = pg_temp.cid('article')$$,
  '23503', null, 'un contenu ne peut pas pointer vers la version d''un autre'
);

-- Retirer un membre qui a publié : sa version reste intacte, son nom aussi.
select pg_temp.as_person('editor2');
select lives_ok($$select pg_temp.create_content('par2', 'page', content_title => 'Par Claire')$$, 'editor2 écrit une page');
select lives_ok(
  $$select pg_temp.save('par2', pg_temp.draft('[]', 'Par Claire'), '{"slug": "claire", "access_level_id": null}')$$,
  'editor2 règle la page'
);
select lives_ok($$select pg_temp.publish('par2')$$, 'editor2 publie');
select pg_temp.as_postgres();
create temporary table before_removal on commit drop as
  select to_jsonb(v) as row from public.versions v where v.content_id = pg_temp.cid('par2');
delete from public.profiles where id = pg_temp.person_id('editor2');
select is(
  (select to_jsonb(v) from public.versions v where v.content_id = pg_temp.cid('par2')),
  (select row from before_removal),
  'retrait d''un membre qui a publié : sa version est intacte'
);
select is(
  (select array[published_by::text, published_by_name] from public.versions where content_id = pg_temp.cid('par2')),
  array[pg_temp.person_id('editor2')::text, 'editeur2@tests.local'],
  'retrait d''un membre : son identifiant et son nom recopié restent'
);
select is(
  (select array[coalesce(created_by::text, 'aucun'), (live_version_id is not null)::text]
    from public.contents where id = pg_temp.cid('par2')),
  array['aucun', 'true'],
  'retrait d''un membre : le contenu reste en ligne, sans auteur'
);

-- ---------------------------------------------------------------------------------------------
-- Lecture par l'app
-- ---------------------------------------------------------------------------------------------

-- « article » : formule Essentiel (rang 1). « reserve » : formule Complet (rang 2).
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.create_content('reserve', 'article', content_title => 'Réservé')$$, 'un article réservé');
select lives_ok(
  $$select pg_temp.save('reserve', pg_temp.draft(jsonb_build_array(
    pg_temp.text_block('00000000-0000-4000-8000-000000000061', 'Secret'),
    pg_temp.image_block('00000000-0000-4000-8000-000000000062', pg_temp.mid('fond'))),
    'Réservé',
    jsonb_build_object('cover', jsonb_build_object('mediaId', pg_temp.mid('photo')))),
    jsonb_build_object('access_level_id', pg_temp.lid('complet'),
      'category_ids', jsonb_build_array(pg_temp.catid('sommeil'), pg_temp.catid('cuisine'))))$$,
  'formule Complet, deux catégories'
);
select lives_ok($$select pg_temp.publish('reserve')$$, 'l''article réservé se publie');

select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('reserve')) - 'publishedAt' - 'firstPublishedAt',
  jsonb_build_object(
    'id', pg_temp.cid('reserve'), 'versionId', (pg_temp.live('reserve')).id, 'kind', 'article',
    'title', 'Réservé',
    'cover', jsonb_build_object('mediaId', pg_temp.mid('photo')), 'slug', null,
    'level', jsonb_build_object('id', pg_temp.lid('complet'), 'name', 'Complet', 'rank', 2),
    'locked', true, 'blockTypes', jsonb_build_array('image', 'text'),
    'blocks', null, 'audio', null,
    'files', jsonb_build_object(pg_temp.mid('photo')::text,
      (pg_temp.live('reserve')).files -> pg_temp.mid('photo')::text),
    'categoryIds', jsonb_build_array(pg_temp.catid('sommeil'), pg_temp.catid('cuisine'))
  ),
  'anonyme : contenu réservé verrouillé, sans blocs ni son ; seule l''image de présentation dans files'
);
select is(
  public.app_content(pg_temp.cid('ep')) #>> '{audio,mediaId}', pg_temp.mid('son')::text,
  'anonyme : le son d''un épisode gratuit'
);
select is(
  (public.app_content(pg_temp.cid('vide'))), null, 'anonyme : un brouillon jamais publié n''existe pas'
);

select pg_temp.as_person('reader');
select is(
  (public.app_content(pg_temp.cid('reserve')) ->> 'locked')::boolean, true,
  'lecteur sans abonnement : verrouillé'
);
select pg_temp.as_postgres();
insert into public.reader_access (user_id, access_level_id) values (pg_temp.person_id('reader'), pg_temp.lid('essentiel'));
select pg_temp.as_person('reader');
select is(
  (public.app_content(pg_temp.cid('reserve')) ->> 'locked')::boolean, true,
  'abonné « Essentiel » (rang trop bas) : verrouillé'
);
select is(
  (public.app_content(pg_temp.cid('article')) ->> 'locked')::boolean, false,
  'abonné « Essentiel » : un contenu « Essentiel » est ouvert'
);
select pg_temp.as_postgres();
update public.reader_access set access_level_id = pg_temp.lid('complet') where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select is(
  public.app_content(pg_temp.cid('reserve')) -> 'blocks',
  (pg_temp.live('reserve')).body -> 'blocks',
  'abonné « Complet » : les blocs'
);
select is(
  (select array_agg(k order by k) from jsonb_object_keys(public.app_content(pg_temp.cid('reserve')) -> 'files') k),
  array[pg_temp.mid('photo')::text, pg_temp.mid('fond')::text],
  'abonné « Complet » : tous les fichiers'
);
select pg_temp.as_postgres();
update public.reader_access set valid_until = now() - interval '1 second' where user_id = pg_temp.person_id('reader');
select pg_temp.as_person('reader');
select is(
  (public.app_content(pg_temp.cid('reserve')) ->> 'locked')::boolean, true,
  'abonnement échu : verrouillé'
);
select pg_temp.as_postgres();
update public.reader_access set valid_until = null, access_level_id = pg_temp.lid('essentiel')
where user_id = pg_temp.person_id('reader');

-- Réordonner les formules change tout de suite ce que chacun peut lire ([D2]).
select pg_temp.as_person('admin');
select lives_ok(
  $$select public.access_levels_reorder(array[pg_temp.lid('complet'), pg_temp.lid('essentiel')])$$,
  'admin : Complet passe avant Essentiel'
);
select pg_temp.as_person('reader');
select is(
  (public.app_content(pg_temp.cid('reserve')) ->> 'locked')::boolean, false,
  'après le rangement, l''abonné « Essentiel » (rang 2) ouvre le contenu « Complet » (rang 1)'
);

-- Une catégorie supprimée disparaît de l'app ([D28]) ; le brouillon ne change pas l'app.
select pg_temp.as_person('editor');
delete from public.categories where id = pg_temp.catid('cuisine');
select lives_ok(
  $$select pg_temp.save('reserve', pg_temp.draft('[]', 'Réservé (brouillon)'))$$,
  'le brouillon change'
);
select pg_temp.as_anon();
select is(
  public.app_content(pg_temp.cid('reserve')) -> 'categoryIds', jsonb_build_array(pg_temp.catid('sommeil')),
  'app : seules les catégories qui existent encore'
);
select is(
  public.app_content(pg_temp.cid('reserve')) ->> 'title', 'Réservé',
  'app : le brouillon modifié ne change rien avant la publication'
);

-- Un contenu dans la corbeille disparaît de l'app.
select pg_temp.as_postgres();
update public.contents set deleted_at = now(), trash_batch = gen_random_uuid() where id = pg_temp.cid('ep');
select pg_temp.as_anon();
select ok(public.app_content(pg_temp.cid('ep')) is null, 'app : un contenu dans la corbeille n''existe plus');
select pg_temp.as_person('editor');
select throws_ok(
  $$select public.publish(pg_temp.cid('ep'), pg_temp.rev('ep'))$$, 'P0001', 'dans_la_corbeille',
  'publier un contenu dans la corbeille est refusé'
);
select throws_ok(
  $$select public.unpublish(pg_temp.cid('ep'))$$, 'P0001', 'dans_la_corbeille',
  'retirer de l''app un contenu dans la corbeille est refusé'
);

-- ---------------------------------------------------------------------------------------------
-- « Où il est utilisé » : les versions en ligne comptent
-- ---------------------------------------------------------------------------------------------

select is(
  (select array[in_draft, in_app] from public.media_uses(pg_temp.mid('fond'))
    where content_id = pg_temp.cid('reserve')),
  array[false, true],
  'un fichier retiré du brouillon mais encore en ligne est « dans l''app »'
);
select is(
  (select array[in_draft, in_app] from public.media_uses(pg_temp.mid('fond'))
    where content_id = pg_temp.cid('article')),
  array[true, true],
  'un fichier du brouillon et de la version en ligne : les deux'
);
-- Un fichier cité SEULEMENT par une version en ligne ne va pas à la corbeille ; retiré de l'app,
-- il y va.
select pg_temp.as_postgres();
insert into public.media (id, kind, name, path, mime, size_bytes, status) values
  ('10000000-0000-4000-8000-000000000009', 'image', 'seul.webp',
    '10000000-0000-4000-8000-000000000009/seul.webp', 'image/webp', 1000, 'ready');
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.create_content('solo', 'article')$$, 'un article qui seul cite « seul »');
select lives_ok(
  $$select pg_temp.save('solo', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000009')),
    extra => pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'brouillon avec « seul »'
);
select lives_ok($$select pg_temp.publish('solo')$$, 'publié');
select lives_ok($$select pg_temp.save('solo', pg_temp.draft('[]'))$$, 'le brouillon ne le cite plus');
select is(
  (select array_agg(array[content_id::text, in_draft::text, in_app::text])
    from public.media_uses('10000000-0000-4000-8000-000000000009')),
  array[array[pg_temp.cid('solo')::text, 'false', 'true']],
  'où il est utilisé : dans l''app seulement'
);
select throws_ok(
  $$select public.media_trash('10000000-0000-4000-8000-000000000009')$$, 'P0001', 'fichier_utilise',
  'un fichier cité par une version en ligne ne va pas à la corbeille'
);
select lives_ok($$select public.unpublish(pg_temp.cid('solo'))$$, 'l''article est retiré de l''app');
select lives_ok(
  $$select public.media_trash('10000000-0000-4000-8000-000000000009')$$,
  'le fichier, cité seulement par l''historique, va à la corbeille ([D6])'
);

-- ---------------------------------------------------------------------------------------------
-- Retirer de l'app
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select lives_ok(
  $$select public.schedule(pg_temp.cid('p1'), now() + interval '1 day')$$, 'la page est programmée'
);
select lives_ok($$select public.unpublish(pg_temp.cid('p1'))$$, 'retirer la page de l''app');
select is(
  (select array[coalesce(live_version_id::text, 'aucune'), coalesce(scheduled_at::text, 'aucune')]
    from public.contents where id = pg_temp.cid('p1')),
  array['aucune', 'aucune'],
  'retrait : plus de version en ligne, programmation annulée'
);
select is(
  (select count(*)::int from public.versions where content_id = pg_temp.cid('p1')), 1,
  'retrait : l''historique est gardé'
);
select ok(public.app_page('aide') is null, 'retrait : l''app ne trouve plus la page');
select lives_ok($$select public.unpublish(pg_temp.cid('p1'))$$, 'retrait rejouable');
select lives_ok($$select pg_temp.publish('p2')$$, 'l''adresse « aide » est libre : la seconde page se publie');
select throws_ok(
  $$select public.unpublish(pg_temp.cid('tpl'))$$, 'P0001', 'sorte_invalide',
  'un modèle ne se retire pas de l''app'
);
select throws_ok(
  $$select public.unpublish('20000000-0000-4000-8000-0000000000ff')$$, 'P0001', 'contenu_introuvable',
  'retirer un contenu inconnu'
);

-- ---------------------------------------------------------------------------------------------
-- Revenir à une version
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.create_content('rv', 'article', content_title => 'Retour')$$, 'un article pour revenir en arrière');
select lives_ok(
  $$select pg_temp.save('rv', pg_temp.draft(jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000071', 'type', 'linked', 'templateId', pg_temp.cid('tpl')),
    pg_temp.image_block('00000000-0000-4000-8000-000000000072', pg_temp.mid('fond')),
    pg_temp.image_block('00000000-0000-4000-8000-000000000073', pg_temp.mid('vieux'), 'Ancien'),
    pg_temp.box_block('00000000-0000-4000-8000-000000000074', jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-000000000075', pg_temp.mid('vieux'))))),
    'Retour', pg_temp.cover('fond')),
    jsonb_build_object('access_level_id', pg_temp.lid('essentiel'),
      'category_ids', jsonb_build_array(pg_temp.catid('sommeil'))))$$,
  'bloc lié, image qui suit la médiathèque, fichier « vieux », Essentiel, Sommeil'
);
select lives_ok($$select pg_temp.publish('rv')$$, 'version 1');
create temporary table rv1 on commit drop as select (pg_temp.live('rv')).id as id;
select lives_ok(
  $$select pg_temp.save('rv', pg_temp.draft('[]', 'Tout effacé'), '{"access_level_id": null, "category_ids": []}')$$,
  'le brouillon est vidé, gratuit, sans catégorie'
);
-- « vieux » part à la corbeille (cité seulement par l'historique… et par la version en ligne,
-- d'où le passage par postgres).
select pg_temp.as_postgres();
update public.media set deleted_at = now() where id = pg_temp.mid('vieux');

select pg_temp.as_person('admin');
select throws_ok(
  $$select public.revert_to_version((select id from rv1))$$, 'P0001', 'verrou_perdu',
  'revenir à une version sans tenir le verrou est refusé'
);
select pg_temp.as_person('editor');
select throws_ok(
  $$select public.revert_to_version('20000000-0000-4000-8000-0000000000ff')$$, 'P0001', 'version_introuvable',
  'version inconnue'
);
create temporary table rv_rev on commit drop as select pg_temp.rev('rv') as rev;
select is(
  (select warnings from public.revert_to_version((select id from rv1))),
  array['fichier_retire'],
  'revenir à la version 1 : un fichier a été retiré'
);
select is(
  (select draft -> 'blocks' from public.contents where id = pg_temp.cid('rv')),
  jsonb_build_array(
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000071', 'type', 'linked', 'templateId', pg_temp.cid('tpl')),
    pg_temp.image_block('00000000-0000-4000-8000-000000000072', pg_temp.mid('fond')),
    pg_temp.image_block('00000000-0000-4000-8000-000000000073', null, 'Ancien'),
    pg_temp.box_block('00000000-0000-4000-8000-000000000074', jsonb_build_array(
      pg_temp.image_block('00000000-0000-4000-8000-000000000075', null)))
  ),
  'retour : le bloc lié revient, alt null de nouveau (sans marqueur), fichier dans la corbeille remplacé par null'
);
select is(
  (select array[title, access_chosen::text, coalesce(access_level_id::text, 'gratuit'), (draft_rev = (select rev + 1 from rv_rev))::text]
    from public.contents where id = pg_temp.cid('rv')),
  array['Retour', 'true', pg_temp.lid('essentiel')::text, 'true'],
  'retour : titre, niveau (choisi) et nouvelle révision'
);
select is(
  (select array_agg(category_id) from public.content_categories where content_id = pg_temp.cid('rv')),
  array[pg_temp.catid('sommeil')],
  'retour : les catégories qui existent encore'
);
select is(
  (select live_version_id from public.contents where id = pg_temp.cid('rv')), (select id from rv1),
  'retour : rien n''est republié'
);
select is(
  (select draft_rev from public.edit_locks where content_id = pg_temp.cid('rv')), pg_temp.rev('rv'),
  'retour : la révision est recopiée dans le verrou (Realtime)'
);
select pg_temp.as_postgres();
update public.contents set deleted_at = now(), trash_batch = gen_random_uuid() where id = pg_temp.cid('tpl');
select pg_temp.as_person('editor');
select is(
  (select warnings from public.revert_to_version((select id from rv1))),
  array['fichier_retire', 'modele_detache'],
  'retour avec le modèle dans la corbeille : la copie devient ordinaire'
);
select is(
  (select draft -> 'blocks' -> 0 from public.contents where id = pg_temp.cid('rv')),
  jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000071', 'type', 'box', 'look', 'fill',
    'blocks', jsonb_build_array(pg_temp.text_block(
      md5('00000000-0000-4000-8000-000000000071/00000000-0000-4000-8000-000000000042')::uuid::text,
      'Contact'))
  ),
  'retour : copie ordinaire, sans le marqueur templateId'
);
select pg_temp.as_postgres();
update public.contents set deleted_at = null, trash_batch = null where id = pg_temp.cid('tpl');
update public.media set deleted_at = null where id = pg_temp.mid('vieux');

-- Page : l'adresse de la version revient, sauf si une autre page l'a prise entre-temps.
select pg_temp.as_person('editor');
select is(
  (select warnings from public.revert_to_version((select id from public.versions where content_id = pg_temp.cid('p1')))),
  array['adresse_prise'],
  'retour d''une page dont l''adresse est prise : avertissement'
);
select is(
  (select slug from public.contents where id = pg_temp.cid('p1')), 'aide-2',
  'retour : l''adresse du brouillon est gardée'
);

-- Une copie de modèle qui contient une image, redevenue un bloc lié : son fichier n'est pas
-- « retiré » (le bloc lié ne cite aucun fichier, le modèle le cite toujours).
select lives_ok(
  $$select pg_temp.create_content('tpl_img', 'template', content_title => 'Bandeau', sort => 'shared')$$,
  'un modèle « bloc partagé » avec une image'
);
select lives_ok(
  $$select pg_temp.save('tpl_img', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000081', pg_temp.mid('fond'), 'Bandeau'))))$$,
  'le modèle contient une image'
);
select lives_ok($$select pg_temp.create_content('rvi', 'article', content_title => 'Retour image')$$, 'un article qui utilise ce modèle');
select lives_ok(
  $$select pg_temp.save('rvi', pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000082', 'type', 'linked', 'templateId', pg_temp.cid('tpl_img'))),
    extra => pg_temp.cover('fond')),
    '{"access_level_id": null}')$$,
  'brouillon avec le bloc lié'
);
select lives_ok($$select pg_temp.publish('rvi')$$, 'version 1 (la copie cite le fichier)');
select is((pg_temp.live('rvi')).media_ids, array[pg_temp.mid('fond')], 'version : le fichier de la copie est cité');
select is(
  (select warnings from public.revert_to_version((pg_temp.live('rvi')).id)),
  '{}'::text[],
  'retour : la copie redevient un bloc lié, sans avertissement « fichier retiré »'
);
select is(
  (select draft -> 'blocks' from public.contents where id = pg_temp.cid('rvi')),
  jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-000000000082', 'type', 'linked', 'templateId', pg_temp.cid('tpl_img'))),
  'retour : le bloc lié revient'
);

-- ---------------------------------------------------------------------------------------------
-- Formules
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('admin');
select lives_ok($$insert into public.access_levels (name) values (e' Premiuḿ ')$$, 'admin : une troisième formule');
select is(
  (select array[name, rank::text] from public.access_levels where rank = 3),
  array[normalize(e'Premiuḿ', NFC), '3'],
  'formule : nom nettoyé (espaces, Unicode composé), en fin de liste'
);
select throws_ok(
  $$insert into public.access_levels (name) values ('complet')$$, '23505', null,
  'formule : deux noms identiques (à la casse près) sont refusés'
);
select throws_ok(
  $$select public.access_levels_reorder(array[pg_temp.lid('complet'), pg_temp.lid('essentiel')])$$,
  'P0001', 'demande_invalide', 'rangement : il manque une formule'
);
select throws_ok(
  $$select public.access_levels_reorder(array[pg_temp.lid('complet'), pg_temp.lid('complet'), pg_temp.lid('essentiel')])$$,
  'P0001', 'demande_invalide', 'rangement : une formule en double'
);
select throws_ok(
  $$delete from public.access_levels where id = pg_temp.lid('essentiel')$$, 'P0001', 'formule_utilisee',
  'une formule utilisée par un brouillon ne se supprime pas'
);
-- « complet » : plus aucun brouillon ne s'en sert, seulement une version en ligne.
select pg_temp.as_postgres();
update public.contents set access_level_id = null where access_level_id = pg_temp.lid('complet');
select pg_temp.as_person('admin');
select throws_ok(
  $$delete from public.access_levels where id = pg_temp.lid('complet')$$, 'P0001', 'formule_utilisee',
  'une formule utilisée seulement par une version ne se supprime pas non plus'
);
select is(
  pg_temp.affected($$delete from public.access_levels where rank = 3$$), 1,
  'une formule inutilisée se supprime'
);

select * from finish();
rollback;

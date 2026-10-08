-- Corbeille des contenus (docs/ARCHITECTURE-CONTENUS.md, § 3.6, [D18]) : mise à la corbeille
-- (retrait de l'app, programmation annulée, verrou d'un autre membre, modèle utilisé),
-- restauration en brouillon sans republier (adresse prise), trash_items, empty_trash (liste
-- explicite, cascade des versions) et purge à 30 jours.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(44);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');

-- ---------------------------------------------------------------------------------------------
-- Mettre à la corbeille un article en ligne et programmé
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('article', 'article', content_title => 'Café');
select pg_temp.save(
  'article',
  pg_temp.draft(
    jsonb_build_array(pg_temp.image_block('00000000-0000-4000-8000-0000000000b1', pg_temp.mid('photo'))),
    'Café',
    pg_temp.cover('photo')
  ),
  '{"access_level_id": null}'
);
select pg_temp.publish('article');
select public.schedule(pg_temp.cid('article'), now() + interval '1 day');
-- La fonction « files » a déjà rendu la photo publique.
select pg_temp.as_postgres();
update public.media set is_public = true where id = pg_temp.mid('photo');

-- Un autre membre écrit l'article : la mise à la corbeille attend qu'il ait fini (comme [D14]).
select pg_temp.as_person('editor');
select public.lock_release(pg_temp.cid('article'));
select pg_temp.as_person('editor2');
select public.lock_take(pg_temp.cid('article'));
select pg_temp.as_person('editor');
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('article')), 'P0001', 'verrou_tenu',
  'un autre membre écrit : mise à la corbeille refusée'
);
select is(
  pg_temp.error_of(format('select public.trash(%L)', pg_temp.cid('article'))),
  'verrou_tenu | editeur2@tests.local écrit ce brouillon : attends qu''il ait fini, ou reprends la main. | editeur2@tests.local',
  'verrou_tenu : le nom (ou l''e-mail) de la personne dans detail et hint'
);
-- Sans nom ni e-mail : hint vide, jamais un mot de français (l'admin écrit « Quelqu'un »).
select pg_temp.as_postgres();
update public.profiles set email = '' where id = pg_temp.person_id('editor2');
select pg_temp.as_person('editor');
select is(
  pg_temp.facts_of(format('select public.trash(%L)', pg_temp.cid('article'))),
  '{"code": "verrou_tenu", "hint": ""}'::jsonb,
  'verrou_tenu : sans nom ni e-mail, hint vide (et toujours refusé)'
);
select pg_temp.as_postgres();
update public.profiles set email = 'editeur2@tests.local' where id = pg_temp.person_id('editor2');
select pg_temp.as_person('editor');
select pg_temp.as_person('editor2');
select public.lock_release(pg_temp.cid('article'));
select public.lock_take(pg_temp.cid('article'));
-- Son propre verrou ne gêne pas : l'éditeur 2 le met à la corbeille.
select results_eq(
  format('select trashed, needs_file_sync from public.trash(%L)', pg_temp.cid('article')),
  $$values (1, true)$$,
  'trash : un élément, et la photo doit redevenir protégée (needs_file_sync)'
);
select pg_temp.as_postgres();
select is(
  (select array[
      (live_version_id is null)::text, (scheduled_at is null)::text, (scheduled_by is null)::text,
      (scheduled_rev is null)::text, (schedule_error is null)::text, (deleted_at is not null)::text,
      (trash_batch is not null)::text, deleted_by::text
    ]
    from public.contents where id = pg_temp.cid('article')),
  array['true', 'true', 'true', 'true', 'true', 'true', 'true', pg_temp.person_id('editor2')::text],
  'trash : retiré de l''app, programmation annulée, dans la corbeille avec son auteur'
);
select is(
  (select count(*)::int from public.versions where content_id = pg_temp.cid('article')), 1,
  'trash : l''historique est gardé'
);
select is(
  (select holder_id from public.edit_locks where content_id = pg_temp.cid('article')), null,
  'trash : le verrou est libéré'
);
select results_eq(
  $$select media_id, to_public from private.files_to_move()$$,
  format('values (%L::uuid, false)', pg_temp.mid('photo')),
  'trash : la photo doit redevenir protégée'
);
select pg_temp.as_anon();
select is(public.app_content(pg_temp.cid('article')), null, 'trash : l''app ne voit plus l''article');
select pg_temp.as_person('editor');
select results_eq(
  format('select trash_batch, trashed, needs_file_sync from public.trash(%L)', pg_temp.cid('article')),
  format(
    'values (%L::uuid, 0, false)',
    (select trash_batch from public.contents where id = pg_temp.cid('article'))
  ),
  'trash : rejouable (même lot, rien de plus)'
);
select throws_ok(
  format('select public.trash(%L)', '20000000-0000-4000-8000-0000000000ff'), 'P0001', 'contenu_introuvable',
  'trash : contenu inconnu'
);
select throws_ok(
  format('select public.publish(%L, %s)', pg_temp.cid('article'), pg_temp.rev('article')),
  'P0001', 'dans_la_corbeille', 'un contenu dans la corbeille ne se publie pas'
);
select throws_ok(
  format('select public.schedule(%L, now() + interval ''1 day'')', pg_temp.cid('article')),
  'P0001', 'dans_la_corbeille', 'un contenu dans la corbeille ne se programme pas'
);
select results_eq(
  format(
    $$select item_type, kind, title, batch_root, deleted_by_name,
        purge_at = deleted_at + interval '30 days'
      from public.trash_items where id = %L$$,
    pg_temp.cid('article')
  ),
  $$values ('content', 'article', 'Café', true, 'editeur2@tests.local', true)$$,
  'trash_items : le contenu, son auteur et la date d''effacement automatique'
);

-- ---------------------------------------------------------------------------------------------
-- Restaurer : en brouillon, sans republier ([D18])
-- ---------------------------------------------------------------------------------------------

select results_eq(
  format('select restored, warnings from public.restore(%L)', pg_temp.cid('article')),
  $$values (1, '{}'::text[])$$,
  'restore : un élément, sans avertissement'
);
select pg_temp.as_postgres();
select is(
  (select array[
      (deleted_at is null)::text, (deleted_by is null)::text, (trash_batch is null)::text,
      (live_version_id is null)::text, (scheduled_at is null)::text
    ]
    from public.contents where id = pg_temp.cid('article')),
  array['true', 'true', 'true', 'true', 'true'],
  'restore : hors de la corbeille, toujours hors de l''app, sans programmation'
);
select pg_temp.as_anon();
select is(public.app_content(pg_temp.cid('article')), null, 'restore : l''app ne voit toujours rien');
select pg_temp.as_person('editor');
select results_eq(
  format('select restored, warnings from public.restore(%L)', pg_temp.cid('article')),
  $$values (0, '{}'::text[])$$,
  'restore : rejouable'
);
select throws_ok(
  format('select public.restore(%L)', '20000000-0000-4000-8000-0000000000ff'), 'P0001', 'contenu_introuvable',
  'restore : contenu inconnu'
);
select lives_ok(
  $$select public.lock_take(pg_temp.cid('article'))$$, 'après la restauration, on reprend la main'
);
select is(
  (select version_number from public.publish(pg_temp.cid('article'), pg_temp.rev('article'))), 2,
  'republier est un geste volontaire, qui marche après la restauration'
);

-- ---------------------------------------------------------------------------------------------
-- Pages : adresse reprise entre-temps
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('p1', 'page', content_title => 'Aide');
select pg_temp.save('p1', pg_temp.draft('[]', 'Aide'), '{"slug": "aide"}');
select pg_temp.create_content('p3', 'page', content_title => 'Contact');
select pg_temp.save('p3', pg_temp.draft('[]', 'Contact'), '{"slug": "contact"}');
select public.trash(pg_temp.cid('p1'));
select public.trash(pg_temp.cid('p3'));
select pg_temp.create_content('p2', 'page', content_title => 'Aide 2');
select lives_ok(
  $$select pg_temp.save('p2', pg_temp.draft('[]', 'Aide 2'), '{"slug": "aide"}')$$,
  'l''adresse d''une page dans la corbeille est libre'
);
select results_eq(
  format('select restored, warnings from public.restore(%L)', pg_temp.cid('p1')),
  $$values (1, array['adresse_retiree'])$$,
  'restore : une page dont l''adresse est prise revient avec un avertissement'
);
select results_eq(
  format('select id, slug from public.contents where id in (%L, %L) order by title', pg_temp.cid('p1'), pg_temp.cid('p2')),
  format('values (%L::uuid, null::text), (%L::uuid, ''aide'')', pg_temp.cid('p1'), pg_temp.cid('p2')),
  'la page restaurée revient sans adresse ; l''autre garde la sienne'
);
select results_eq(
  format('select restored, warnings from public.restore(%L)', pg_temp.cid('p3')),
  $$values (1, '{}'::text[])$$,
  'une page dont l''adresse est libre revient sans avertissement'
);
select is(
  (select slug from public.contents where id = pg_temp.cid('p3')), 'contact', 'et garde son adresse'
);

-- ---------------------------------------------------------------------------------------------
-- Modèle « bloc partagé » utilisé
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('tpl', 'template', content_title => 'Contact', sort => 'shared');
select pg_temp.save('tpl', pg_temp.draft(jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000000c1')), 'Contact'));
select pg_temp.create_content('lie', 'article', content_title => 'Avec contact');
select pg_temp.save(
  'lie',
  pg_temp.draft(jsonb_build_array(jsonb_build_object(
    'id', '00000000-0000-4000-8000-0000000000c2', 'type', 'linked', 'templateId', pg_temp.cid('tpl')
  )), 'Avec contact')
);
select is(
  pg_temp.error_of(format('select public.trash(%L)', pg_temp.cid('tpl'))),
  'modele_utilise | Ce modèle est utilisé dans : Avec contact. | ["Avec contact"]',
  'un modèle « bloc partagé » cité par un brouillon ne part pas à la corbeille'
);
select is(
  pg_temp.facts_of(format('select public.trash(%L)', pg_temp.cid('tpl'))),
  '{"code": "modele_utilise", "hint": ["Avec contact"]}'::jsonb,
  'modele_utilise : hint, les titres des contenus en tableau JSON'
);
select public.trash(pg_temp.cid('lie'));
select throws_ok(
  format('select public.trash(%L)', pg_temp.cid('tpl')), 'P0001', 'modele_utilise',
  'un brouillon dans la corbeille compte encore'
);
select is(
  public.empty_trash(jsonb_build_array(jsonb_build_object('type', 'content', 'id', pg_temp.cid('lie')))), 1,
  'empty_trash : le brouillon qui citait le modèle est effacé'
);
select is(
  (select trashed from public.trash(pg_temp.cid('tpl'))), 1, 'le modèle part alors à la corbeille'
);
select is(
  (select kind from public.trash_items where id = pg_temp.cid('tpl')), 'template',
  'trash_items : un modèle'
);

-- ---------------------------------------------------------------------------------------------
-- Vider la corbeille : liste explicite, cascade
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('publie', 'article', content_title => 'Publié');
select pg_temp.save('publie', pg_temp.draft('[]', 'Publié', pg_temp.cover()), '{"access_level_id": null, "category_ids": ["30000000-0000-4000-8000-000000000001"]}');
select pg_temp.publish('publie');
select public.trash(pg_temp.cid('publie'));
select is(
  public.empty_trash(jsonb_build_array(
    jsonb_build_object('type', 'content', 'id', pg_temp.cid('publie')),
    jsonb_build_object('type', 'content', 'id', pg_temp.cid('article'))
  )),
  1,
  'empty_trash : seuls les contenus de la liste qui sont dans la corbeille'
);
select pg_temp.as_postgres();
select results_eq(
  format(
    $$select (select count(*)::int from public.contents where id = %1$L),
      (select count(*)::int from public.versions where content_id = %1$L),
      (select count(*)::int from public.content_categories where content_id = %1$L),
      (select count(*)::int from public.edit_locks where content_id = %1$L)$$,
    pg_temp.cid('publie')
  ),
  $$values (0, 0, 0, 0)$$,
  'empty_trash : le contenu, ses versions, ses catégories et son verrou sont effacés'
);
select ok(
  (select deleted_at is null from public.contents where id = pg_temp.cid('article')),
  'empty_trash : un contenu hors corbeille n''est pas touché'
);
select pg_temp.as_person('editor');
select throws_ok(
  $$select public.empty_trash('[{"type": "contenu", "id": "20000000-0000-4000-8000-000000000001"}]')$$,
  'P0001', 'demande_invalide', 'empty_trash : type inconnu refusé'
);
select throws_ok(
  $$select public.empty_trash('[{"type": "content", "id": "pas-un-uuid"}]')$$,
  'P0001', 'demande_invalide', 'empty_trash : identifiant mal formé refusé'
);

-- Un fichier et un contenu ensemble ; puis tout le reste (null).
select public.media_trash(pg_temp.mid('vieux'));
select public.trash(pg_temp.cid('p3'));
select is(
  public.empty_trash(jsonb_build_array(
    jsonb_build_object('type', 'content', 'id', pg_temp.cid('p3')),
    jsonb_build_object('type', 'file', 'id', pg_temp.mid('vieux'))
  )),
  2,
  'empty_trash : un contenu et un fichier dans la même liste'
);
select ok(
  (select purge_requested_at is not null from public.media where id = pg_temp.mid('vieux')),
  'le fichier attend son effacement par la fonction « files »'
);
select public.trash(pg_temp.cid('p1'));
select public.trash(pg_temp.cid('p2'));
select is(public.empty_trash(), 3, 'empty_trash() : tout le reste (deux pages et le modèle)');
select is(
  (select count(*)::int from public.trash_items), 0, 'la corbeille est vide'
);

-- ---------------------------------------------------------------------------------------------
-- Purge à 30 jours
-- ---------------------------------------------------------------------------------------------

select pg_temp.create_content('vieux_contenu', 'article', content_title => 'Ancien');
select pg_temp.create_content('recent', 'article', content_title => 'Récent');
select public.trash(pg_temp.cid('vieux_contenu'));
select public.trash(pg_temp.cid('recent'));
select pg_temp.as_postgres();
-- Le garde de corbeille refuse de modifier un contenu dans la corbeille : levé le temps de
-- vieillir la date (annulé par le rollback final).
set local session_replication_role = replica;
update public.contents set deleted_at = now() - interval '31 days' where id = pg_temp.cid('vieux_contenu');
set local session_replication_role = origin;
select is(private.purge_trash(), 1, 'purge : seulement le contenu de plus de 30 jours');
select results_eq(
  format(
    'select (select count(*)::int from public.contents where id = %L), (select count(*)::int from public.contents where id = %L)',
    pg_temp.cid('vieux_contenu'), pg_temp.cid('recent')
  ),
  $$values (0, 1)$$,
  'purge : le contenu ancien est effacé, le récent reste'
);

-- La tâche « publications » ignore un contenu dans la corbeille (programmation déjà vidée).
select ok(
  (select scheduled_at is null from public.contents where id = pg_temp.cid('recent')),
  'un contenu dans la corbeille n''a jamais de programmation'
);

select * from finish();
rollback;

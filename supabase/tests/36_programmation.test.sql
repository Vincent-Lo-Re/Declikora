-- Publication programmée (docs/ARCHITECTURE-CONTENUS.md, § 3.4, § 3.8, « Étape 5 ») : schedule et
-- unschedule, tâche « publications » (private.run_due_publications) : dernier brouillon publié à
-- l'heure dite ([D16]), attente pendant qu'un membre écrit puis publication quand le verrou est
-- libre, échec au bout d'une heure ([D31]), rattrapage, échec affiché sans bloquer les autres,
-- auteur parti ; publish() refusé sous pg_cron.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(66);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- Un article gratuit, prêt à publier (avec son image de présentation, [D45]), créé et réglé par
-- l'éditeur (qui garde le verrou).
create function pg_temp.ready_article(content_name text, title text default 'Titre')
returns void
language plpgsql
as $$
begin
  perform pg_temp.create_content(content_name, 'article', content_title => title);
  perform pg_temp.save(
    content_name,
    pg_temp.draft(
      jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-000000000001')), title, pg_temp.cover()
    ),
    '{"access_level_id": null}'
  );
end;
$$;

-- L'heure de la programmation est venue (il y a « ago ») : ce que ferait le temps qui passe.
create function pg_temp.make_due(content_name text, ago interval default interval '1 minute')
returns void
language sql
security definer
as $$
  update public.contents set scheduled_at = now() - ago where id = pg_temp.cid(content_name)
$$;

-- État de la programmation : heure (« aucune » si vide) et échec (« aucun »).
create function pg_temp.schedule_state(content_name text)
returns text[]
language sql
stable
security definer
as $$
  select array[
    case when scheduled_at is null then 'aucune' else 'programmée' end,
    coalesce(schedule_error, 'aucun')
  ]
  from public.contents where id = pg_temp.cid(content_name)
$$;

create function pg_temp.versions_of(content_name text)
returns integer
language sql
stable
security definer
as $$
  select count(*)::int from public.versions where content_id = pg_temp.cid(content_name)
$$;

grant execute on function
  pg_temp.ready_article(text, text),
  pg_temp.make_due(text, interval),
  pg_temp.schedule_state(text),
  pg_temp.versions_of(text)
to public;

-- ---------------------------------------------------------------------------------------------
-- schedule et unschedule
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready_article('a1')$$, 'un article gratuit');
select throws_ok(
  $$select public.schedule(pg_temp.cid('a1'), now() - interval '1 minute')$$, 'P0001', 'date_passee',
  'programmer dans le passé est refusé'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('a1'), now())$$, 'P0001', 'date_passee',
  'programmer à l''instant même est refusé'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('a1'), null)$$, 'P0001', 'demande_invalide',
  'programmer sans heure est refusé'
);
select throws_ok(
  $$select public.schedule('20000000-0000-4000-8000-0000000000ff', now() + interval '1 day')$$,
  'P0001', 'contenu_introuvable', 'programmer un contenu inconnu'
);
select lives_ok($$select pg_temp.create_content('m', 'method')$$, 'une méthode');
select throws_ok(
  $$select public.schedule(pg_temp.cid('m'), now() + interval '1 day')$$, 'P0001', 'sorte_invalide',
  'une méthode ne se programme pas encore (étape 7)'
);
select is(
  public.schedule(pg_temp.cid('a1'), '2030-10-03 08:00+02'), '2030-10-03 08:00+02'::timestamptz,
  'programmer : l''instant enregistré est renvoyé'
);
select is(
  (select array[scheduled_at::text, scheduled_by::text, scheduled_rev::text, (scheduled_set_at = now())::text]
    from public.contents where id = pg_temp.cid('a1')),
  array['2030-10-03 08:00:00+02'::timestamptz::text, pg_temp.person_id('editor')::text,
    pg_temp.rev('a1')::text, 'true'],
  'programmer : heure, auteur, révision et moment de la programmation'
);
select lives_ok(
  $$select public.schedule(pg_temp.cid('a1'), '2030-10-04 08:00+02')$$, 'reprogrammer remplace l''heure'
);
select is(
  (select scheduled_at from public.contents where id = pg_temp.cid('a1')), '2030-10-04 08:00+02'::timestamptz,
  'une seule programmation par contenu'
);
select ok(public.unschedule(pg_temp.cid('a1')), 'annuler la programmation');
select is(pg_temp.schedule_state('a1'), array['aucune', 'aucun'], 'programmation annulée');
select ok(not public.unschedule(pg_temp.cid('a1')), 'annuler de nouveau : rien à faire (faux)');
select lives_ok(
  $$select public.schedule(pg_temp.cid('a1'), now() + interval '1 day')$$, 'programmer de nouveau'
);
select lives_ok($$select pg_temp.publish('a1')$$, 'publier à la main avant l''heure');
select is(pg_temp.schedule_state('a1'), array['aucune', 'aucun'], 'publier efface la programmation');

-- ---------------------------------------------------------------------------------------------
-- La tâche publie le DERNIER brouillon enregistré ([D16])
-- ---------------------------------------------------------------------------------------------

select lives_ok($$select pg_temp.ready_article('a2', 'Avant')$$, 'un deuxième article');
select lives_ok($$select public.schedule(pg_temp.cid('a2'), now() + interval '1 hour')$$, 'programmé');
select lives_ok(
  $$select pg_temp.save('a2', pg_temp.draft('[]', 'Corrigé après la programmation', pg_temp.cover()))$$,
  'le brouillon est corrigé après la programmation'
);
select ok(public.lock_release(pg_temp.cid('a2')), 'puis l''éditeur quitte le brouillon (verrou libre)');

select pg_temp.as_postgres();
select pg_temp.make_due('a2');
select is(private.run_due_publications(), 1, 'la tâche publie le contenu dû');
select is(
  (select array[v.origin, v.published_by::text, v.body ->> 'title', v.draft_rev::text]
    from pg_temp.live('a2') v),
  array['scheduled', pg_temp.person_id('editor')::text, 'Corrigé après la programmation',
    pg_temp.rev('a2')::text],
  'version programmée : origine, auteur de la programmation, dernier brouillon enregistré'
);
select is(pg_temp.schedule_state('a2'), array['aucune', 'aucun'], 'programmation effacée après la publication');
select is(private.run_due_publications(), 0, 'passage suivant : plus rien à publier');

-- ---------------------------------------------------------------------------------------------
-- Quelqu'un écrit à l'heure dite ([D31])
-- ---------------------------------------------------------------------------------------------

-- a3 : l'éditeur écrit encore (verrou actif) et a changé le brouillon depuis la programmation.
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready_article('a3')$$, 'un troisième article');
select lives_ok($$select public.schedule(pg_temp.cid('a3'), now() + interval '1 hour')$$, 'programmé');
select lives_ok($$select pg_temp.save('a3', pg_temp.draft('[]', 'En cours', pg_temp.cover()))$$, 'écrit après la programmation');
-- a4 : quelqu'un tient le verrou, mais le brouillon n'a pas changé depuis la programmation.
select lives_ok($$select pg_temp.ready_article('a4')$$, 'un quatrième article');
select lives_ok($$select public.schedule(pg_temp.cid('a4'), now() + interval '1 hour')$$, 'programmé, sans changement ensuite');

select pg_temp.as_postgres();
select pg_temp.make_due('a3', interval '5 minutes');
select pg_temp.make_due('a4', interval '5 minutes');
select is(private.run_due_publications(), 1, 'un seul des deux part');
select is(
  array[pg_temp.versions_of('a3'), pg_temp.versions_of('a4')], array[0, 1],
  'a3 attend (on y écrit depuis la programmation) ; a4 part (verrou tenu, brouillon inchangé)'
);
select is(pg_temp.schedule_state('a3'), array['programmée', 'aucun'], 'a3 reste programmé, sans échec');
select is(private.run_due_publications(), 0, 'minute suivante : a3 attend toujours');

-- Un autre membre qui écrit bloque aussi (quel qu'il soit).
update public.edit_locks set holder_id = pg_temp.person_id('editor2'), heartbeat_at = now()
where content_id = pg_temp.cid('a3');
select is(private.run_due_publications(), 0, 'un autre membre qui écrit : a3 attend encore');

-- Le verrou se libère : la publication part au passage suivant, avec le dernier brouillon.
update public.edit_locks set holder_id = null, holder_session = null, taken_at = null
where content_id = pg_temp.cid('a3');
select is(private.run_due_publications(), 1, 'verrou libre : a3 part');
select is((pg_temp.live('a3')).body ->> 'title', 'En cours', 'a3 : le dernier brouillon enregistré');

-- Un verrou périmé (plus de 90 s sans signe de vie) ne fait pas attendre.
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready_article('a5')$$, 'un cinquième article');
select lives_ok($$select public.schedule(pg_temp.cid('a5'), now() + interval '1 hour')$$, 'programmé');
select lives_ok($$select pg_temp.save('a5', pg_temp.draft('[]', 'Oublié', pg_temp.cover()))$$, 'écrit, puis l''onglet est abandonné');
select pg_temp.as_postgres();
update public.edit_locks set heartbeat_at = now() - interval '91 seconds' where content_id = pg_temp.cid('a5');
select pg_temp.make_due('a5');
select is(private.run_due_publications(), 1, 'verrou périmé : a5 part');

-- Au bout d'une heure d'attente : échec « brouillon en cours d'écriture ».
select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready_article('a6')$$, 'un sixième article');
select lives_ok($$select public.schedule(pg_temp.cid('a6'), now() + interval '1 hour')$$, 'programmé');
select lives_ok($$select pg_temp.save('a6', pg_temp.draft('[]', 'Toujours en cours', pg_temp.cover()))$$, 'écrit sans fin');
select pg_temp.as_postgres();
select pg_temp.make_due('a6', interval '61 minutes');
select is(private.run_due_publications(), 0, 'plus d''une heure d''attente : rien ne part');
select is(
  pg_temp.schedule_state('a6'), array['aucune', 'brouillon_en_cours_d_ecriture'],
  'échec affiché, programmation vidée'
);
select is(pg_temp.versions_of('a6'), 0, 'a6 : aucune version');

-- ---------------------------------------------------------------------------------------------
-- Rattrapage, échecs, auteur parti
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select lives_ok($$select pg_temp.ready_article('a7')$$, 'un article sans souci');
select lives_ok($$select public.schedule(pg_temp.cid('a7'), now() + interval '1 hour')$$, 'programmé');
select lives_ok($$select pg_temp.create_content('a8', 'article')$$, 'un article avec une image vide');
select lives_ok(
  $$select pg_temp.save('a8', pg_temp.draft(jsonb_build_array(
    pg_temp.image_block('00000000-0000-4000-8000-000000000002', null)), extra => pg_temp.cover()),
    '{"access_level_id": null}')$$,
  'réglé, mais l''image n''a pas de fichier'
);
select lives_ok($$select public.schedule(pg_temp.cid('a8'), now() + interval '1 hour')$$, 'programmé quand même');
select ok(public.lock_release(pg_temp.cid('a7')) and public.lock_release(pg_temp.cid('a8')), 'verrous rendus');

select pg_temp.as_person('editor2');
select lives_ok($$select pg_temp.ready_article('a9')$$, 'editor2 écrit un article');
select lives_ok($$select public.schedule(pg_temp.cid('a9'), now() + interval '1 hour')$$, 'editor2 le programme');

select pg_temp.as_postgres();
-- Projet en pause pendant trois heures : les programmations dues partent au passage suivant.
select pg_temp.make_due('a7', interval '3 hours');
select pg_temp.make_due('a8', interval '3 hours');
select pg_temp.make_due('a9', interval '3 hours');
delete from public.profiles where id = pg_temp.person_id('editor2');
select is(private.run_due_publications(), 1, 'rattrapage : a7 part malgré le retard ; les deux autres échouent');
select is(pg_temp.versions_of('a7'), 1, 'a7 publié');
select is(
  pg_temp.schedule_state('a8'), array['aucune', 'image_sans_fichier'],
  'a8 : l''échec (code stable) est affiché, sans bloquer les autres'
);
select is(pg_temp.schedule_state('a9'), array['aucune', 'auteur_parti'], 'a9 : l''auteur a quitté l''équipe');

select pg_temp.as_person('editor');
select ok(public.unschedule(pg_temp.cid('a8')), 'annuler efface l''échec affiché');
select is(pg_temp.schedule_state('a8'), array['aucune', 'aucun'], 'a8 : plus d''échec');

-- Un contenu mis à la corbeille ne part pas.
select lives_ok($$select pg_temp.ready_article('a10')$$, 'un dernier article');
select lives_ok($$select public.schedule(pg_temp.cid('a10'), now() + interval '1 hour')$$, 'programmé');
select pg_temp.as_postgres();
select pg_temp.make_due('a10');
update public.contents set deleted_at = now(), trash_batch = gen_random_uuid() where id = pg_temp.cid('a10');
select is(private.run_due_publications(), 0, 'un contenu dans la corbeille ne part pas');

-- ---------------------------------------------------------------------------------------------
-- Sous pg_cron (ni jeton ni session) : les RPC de l'admin refusent
-- ---------------------------------------------------------------------------------------------

select throws_ok(
  $$select public.publish(pg_temp.cid('a1'), pg_temp.rev('a1'))$$, '42501', 'reserve_a_l_equipe',
  'publish() refusé sans membre (sous pg_cron, la tâche passe par private.do_publish)'
);
select throws_ok(
  $$select public.schedule(pg_temp.cid('a1'), now() + interval '1 day')$$, '42501', 'reserve_a_l_equipe',
  'schedule() refusé sans membre'
);

select * from finish();
rollback;

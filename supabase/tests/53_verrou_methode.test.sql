-- Une personne à la fois sur toute la méthode (06/10/2026 ; docs/ADMINISTRATION.md, § 4, « Une
-- méthode sur une seule page ») : le verrou de la méthode suffit pour écrire ses chapitres, ses
-- leçons et ses exercices (save_draft, revert_to_version) ; un nouvel élément ne reçoit pas de
-- verrou ; les autres lisent (lock_status, lock_take, save_draft, content_create, trash) ; la même
-- personne dans une autre ouverture ; reprendre la main, sur un élément ou sur la méthode ; verrou
-- périmé ; method_rev ; publication programmée qui attend ; « Détacher partout » et
-- « Remplacer » d'un fichier.
-- Rappel : now() ne change pas dans une transaction ; les verrous périmés sont simulés en
-- reculant heartbeat_at (en postgres).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(39);

select pg_temp.create_people();
select pg_temp.empty_media_library();
select pg_temp.empty_contents();
\ir aides/publication.inc

-- ---------------------------------------------------------------------------------------------
-- Aides
-- ---------------------------------------------------------------------------------------------

-- Deux ouvertures de l'éditeur.
create function pg_temp.s1()
returns uuid
language sql
immutable
as $$
  select '50000000-0000-4000-8000-000000000001'::uuid
$$;

create function pg_temp.s2()
returns uuid
language sql
immutable
as $$
  select '50000000-0000-4000-8000-000000000002'::uuid
$$;

-- Qui tient le verrou d'un contenu : son e-mail, « libre », ou « aucune ligne ».
create function pg_temp.holder(content_name text)
returns text
language sql
stable
security definer
as $$
  select coalesce(
    (
      select coalesce(p.email, 'libre')
      from public.edit_locks l
      left join public.profiles p on p.id = l.holder_id
      where l.content_id = pg_temp.cid(content_name)
    ),
    'aucune ligne'
  )
$$;

-- Vrai si le dernier signe de vie du verrou d'un contenu est de maintenant.
create function pg_temp.fresh(content_name text)
returns boolean
language sql
stable
security definer
as $$
  select heartbeat_at = now() from public.edit_locks where content_id = pg_temp.cid(content_name)
$$;

-- Recule le dernier signe de vie du verrou d'un contenu.
create function pg_temp.age_lock(content_name text, seconds integer)
returns void
language sql
security definer
as $$
  update public.edit_locks set heartbeat_at = now() - make_interval(secs => seconds)
  where content_id = pg_temp.cid(content_name)
$$;

-- Enregistre un brouillon (sous le rôle courant) depuis une ouverture de l'éditeur.
create function pg_temp.save_in(
  content_name text, session uuid, draft jsonb, settings jsonb default null
)
returns integer
language sql
as $$
  select (public.save_draft(
    pg_temp.cid(content_name), pg_temp.rev(content_name), draft, settings, session
  )).draft_rev
$$;

-- method_rev du verrou de la méthode, gardé par mark() et comparé par bumped().
create temporary table marks (rev integer);
grant all on marks to public;

create function pg_temp.method_rev()
returns integer
language sql
stable
security definer
as $$
  select method_rev from public.edit_locks where content_id = pg_temp.cid('m')
$$;

create function pg_temp.mark()
returns void
language sql
as $$
  delete from marks;
  insert into marks select pg_temp.method_rev();
$$;

create function pg_temp.bumped()
returns boolean
language sql
stable
as $$
  select pg_temp.method_rev() > (select rev from marks)
$$;

-- La dernière version d'un contenu.
create function pg_temp.last_version(content_name text)
returns uuid
language sql
stable
security definer
as $$
  select id from public.versions where content_id = pg_temp.cid(content_name)
  order by number desc limit 1
$$;

grant execute on function
  pg_temp.s1(),
  pg_temp.s2(),
  pg_temp.holder(text),
  pg_temp.fresh(text),
  pg_temp.age_lock(text, integer),
  pg_temp.save_in(text, uuid, jsonb, jsonb),
  pg_temp.method_rev(),
  pg_temp.mark(),
  pg_temp.bumped(),
  pg_temp.last_version(text)
to public;

-- ---------------------------------------------------------------------------------------------
-- Une méthode, un chapitre, deux leçons, un exercice : un seul verrou, celui de la méthode
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select pg_temp.create_content('m', 'method', content_title => 'Respirer');
select pg_temp.create_content('c', 'chapter', 'm', 'Bases');
select pg_temp.create_content('l', 'lesson', 'c', 'Souffle');
select pg_temp.create_content('l2', 'lesson', 'c', 'Posture');
select pg_temp.create_content('e', 'exercise', 'l', 'Inspirer');

select is(
  array[pg_temp.holder('c'), pg_temp.holder('l'), pg_temp.holder('e')],
  array['aucune ligne', 'aucune ligne', 'aucune ligne'],
  'content_create : un chapitre, une leçon ou un exercice ne reçoit pas de verrou à lui'
);
select is(pg_temp.holder('m'), 'editeur@tests.local', 'la méthode est à son auteur');
select lives_ok(
  $$select pg_temp.save('l', pg_temp.draft('[]', 'Souffle'))$$,
  'save_draft : le verrou de la méthode suffit pour écrire une leçon'
);
select lives_ok(
  $$select pg_temp.save('e', pg_temp.draft('[]', 'Inspirer'))$$,
  'save_draft : et un exercice'
);

-- ---------------------------------------------------------------------------------------------
-- Les autres lisent
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor2');
select is(
  (select row(mine, holder_id, holder_name, is_active)::text
    from public.lock_status(pg_temp.cid('l'))),
  row(false, pg_temp.person_id('editor'), 'editeur@tests.local', true)::text,
  'lock_status d''une leçon : la personne qui écrit sa méthode'
);
select is(
  (select row(mine, holder_name)::text from public.lock_take(pg_temp.cid('l'))),
  row(false, 'editeur@tests.local')::text,
  'lock_take d''une leçon : refusé pendant qu''une autre personne écrit la méthode'
);
select is(pg_temp.holder('l'), 'aucune ligne', 'refus : la leçon reste sans verrou');
select throws_ok(
  $$select pg_temp.save('l', pg_temp.draft('[]', 'Autre'))$$,
  'P0001', 'verrou_perdu', 'save_draft d''une leçon : refusé à une autre personne'
);
select throws_ok(
  format('select public.content_create(%L, %L, %L)', 'chapter', pg_temp.cid('m'), 'Plus loin'),
  'P0001', 'verrou_tenu', 'content_create : rien ne s''ajoute à une méthode qu''une autre personne écrit'
);
select throws_ok(
  format('select * from public.trash(%L)', pg_temp.cid('e')),
  'P0001', 'verrou_tenu', 'trash : un exercice d''une méthode qu''une autre personne écrit est refusé'
);

-- ---------------------------------------------------------------------------------------------
-- La même personne, dans une autre ouverture de l'éditeur
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select is(
  (select mine from public.lock_take(pg_temp.cid('m'), false, pg_temp.s1())), true,
  'la même personne prend la méthode dans une nouvelle ouverture'
);
select throws_ok(
  $$select pg_temp.save('l', pg_temp.draft('[]', 'Souffle'))$$,
  'P0001', 'verrou_perdu', 'l''ancienne ouverture n''écrit plus la leçon'
);
select pg_temp.age_lock('m', 60);
select lives_ok(
  $$select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft('[]', 'Souffle'))$$,
  'la nouvelle ouverture écrit la leçon'
);
select ok(pg_temp.fresh('m'), 'enregistrer une leçon est un signe de vie du verrou de la méthode');
select is(
  (select mine from public.lock_take(pg_temp.cid('l'), false, pg_temp.s2())), true,
  'la même personne peut tenir une leçon dans une autre ouverture (admin d''avant la page unique)'
);
select ok(public.lock_release(pg_temp.cid('l'), pg_temp.s2()), 'et la rendre');

-- ---------------------------------------------------------------------------------------------
-- Reprendre la main
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor2');
select is(
  (select mine from public.lock_take(pg_temp.cid('l'), true)), true,
  'une autre personne reprend la main sur la leçon'
);
select is(pg_temp.holder('m'), 'libre', 'la méthode est retirée à celle qui l''écrivait');

select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft('[]', 'Souffle'))$$,
  'P0001', 'verrou_perdu', 'elle n''écrit plus la leçon'
);
select is(
  (select row(mine, holder_name, is_active)::text
    from public.lock_status(pg_temp.cid('m'), pg_temp.s1())),
  row(false, 'editeur2@tests.local', true)::text,
  'lock_status de la méthode : la personne qui écrit une de ses leçons'
);
select is(
  (select row(mine, holder_name)::text
    from public.lock_take(pg_temp.cid('m'), false, pg_temp.s1())),
  row(false, 'editeur2@tests.local')::text,
  'lock_take de la méthode : refusé pendant qu''une autre personne écrit une de ses leçons'
);
select is(
  (select mine from public.lock_take(pg_temp.cid('m'), true, pg_temp.s1())), true,
  'reprendre la main sur la méthode'
);
select is(pg_temp.holder('l'), 'libre', 'la leçon est retirée à celle qui l''écrivait');

select pg_temp.as_person('editor2');
select throws_ok(
  $$select pg_temp.save('l', pg_temp.draft('[]', 'Autre'))$$,
  'P0001', 'verrou_perdu', 'elle n''écrit plus la leçon'
);

-- ---------------------------------------------------------------------------------------------
-- Un verrou de méthode périmé
-- ---------------------------------------------------------------------------------------------

select pg_temp.age_lock('m', 91);
select is(
  (select mine from public.lock_take(pg_temp.cid('e'))), true,
  'un verrou de méthode périmé (plus de 90 s) ne retient pas un exercice'
);
select is(pg_temp.holder('m'), 'libre', 'et il est retiré');

select pg_temp.as_person('editor');
select throws_ok(
  $$select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft('[]', 'Souffle'))$$,
  'P0001', 'verrou_perdu', 'la méthode n''est plus à la personne qui l''avait laissée'
);

select pg_temp.as_person('editor2');
select public.lock_release(pg_temp.cid('e'));
select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'), false, pg_temp.s1());

-- ---------------------------------------------------------------------------------------------
-- Revenir à une version d'une leçon
-- ---------------------------------------------------------------------------------------------

select pg_temp.save_in('m', pg_temp.s1(), pg_temp.draft('[]', 'Respirer', pg_temp.cover()),
  jsonb_build_object('access_level_id', pg_temp.lid('complet')));
select pg_temp.save_in('c', pg_temp.s1(), pg_temp.draft('[]', 'Bases'), '{"in_app": true}');
select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000007a1', 'Le souffle')), 'Souffle'
), '{"in_app": true}');
select lives_ok($$select pg_temp.publish('m')$$, 'la méthode se publie');
select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000007a1', 'Autre souffle')), 'Souffle'
));
select lives_ok(
  format('select * from public.revert_to_version(%L, %L)', pg_temp.last_version('l'), pg_temp.s1()),
  'revert_to_version d''une leçon : le verrou de la méthode suffit'
);
select throws_ok(
  format('select * from public.revert_to_version(%L)', pg_temp.last_version('l')),
  'P0001', 'verrou_perdu', 'revert_to_version : pas depuis une autre ouverture'
);

-- ---------------------------------------------------------------------------------------------
-- method_rev : ceux qui lisent la méthode voient chaque changement
-- ---------------------------------------------------------------------------------------------

select pg_temp.mark();
select pg_temp.save_in('e', pg_temp.s1(), pg_temp.draft('[]', 'Inspirer'));
select ok(pg_temp.bumped(), 'method_rev : un exercice enregistré');

select pg_temp.mark();
select public.outline_reorder(
  pg_temp.cid('m'),
  jsonb_build_array(jsonb_build_object(
    'chapterId', pg_temp.cid('c'), 'lessonIds', jsonb_build_array(pg_temp.cid('l2'), pg_temp.cid('l'))
  )),
  pg_temp.s1()
);
select ok(pg_temp.bumped(), 'method_rev : le plan rangé');

select pg_temp.mark();
select public.trash(pg_temp.cid('e'));
select ok(pg_temp.bumped(), 'method_rev : un exercice mis à la corbeille');

select pg_temp.mark();
select public.restore(pg_temp.cid('e'));
select ok(pg_temp.bumped(), 'method_rev : un exercice restauré');

select pg_temp.mark();
select pg_temp.as_person('editor2');
select pg_temp.create_content('a', 'article', content_title => 'Ailleurs');
select pg_temp.save('a', pg_temp.draft('[]', 'Ailleurs'));
select pg_temp.as_person('editor');
select ok(not pg_temp.bumped(), 'method_rev : un article ne touche pas la méthode');

-- ---------------------------------------------------------------------------------------------
-- Publication programmée : la méthode attend tant qu'on l'écrit
-- ---------------------------------------------------------------------------------------------

select pg_temp.save_in('l', pg_temp.s1(), pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000007a1', 'Nouveau souffle')), 'Souffle'
));
select public.schedule(pg_temp.cid('m'), now() + interval '1 day');
select pg_temp.as_postgres();
update public.contents
set scheduled_at = now() - interval '1 minute', scheduled_set_at = now() - interval '2 minutes'
where id = pg_temp.cid('m');
select is(
  private.run_due_publications(), 0,
  'une leçon écrite depuis la programmation, sous le verrou de la méthode : la méthode attend'
);
select pg_temp.as_person('editor');
select public.lock_release(pg_temp.cid('m'), pg_temp.s1());
select pg_temp.as_postgres();
select is(private.run_due_publications(), 1, 'verrou rendu : la méthode part');

-- ---------------------------------------------------------------------------------------------
-- « Détacher partout » et « Remplacer » : l'exercice d'une méthode qu'on écrit est gardé
-- ---------------------------------------------------------------------------------------------

select pg_temp.as_person('editor');
select public.lock_take(pg_temp.cid('m'), false, pg_temp.s1());
select pg_temp.create_content('tpl', 'template', null, 'Contact', 'shared');
select pg_temp.save('tpl', pg_temp.draft(
  jsonb_build_array(pg_temp.text_block('00000000-0000-4000-8000-0000000007f1', 'Écris-nous')), 'Contact'
));
select pg_temp.save_in('e', pg_temp.s1(), pg_temp.draft(jsonb_build_array(
  jsonb_build_object('id', '00000000-0000-4000-8000-0000000007e1', 'type', 'linked', 'templateId', pg_temp.cid('tpl')),
  pg_temp.image_block('00000000-0000-4000-8000-0000000007e2', pg_temp.mid('photo'))), 'Inspirer'));

select pg_temp.as_person('editor2');
select matches(
  pg_temp.error_of($$select public.template_detach_all(pg_temp.cid('tpl'))$$),
  '^verrou_tenu \| editeur@tests\.local écrit « Respirer ».* \| editeur@tests\.local$',
  '« Détacher partout » : refusé pendant qu''une autre personne écrit la méthode de l''exercice'
);
select is(
  public.media_replace(pg_temp.mid('photo'), pg_temp.mid('fond')),
  jsonb_build_object(
    'replaced', 0,
    'kept', jsonb_build_array(jsonb_build_object(
      'id', pg_temp.cid('e'), 'title', 'Inspirer', 'holder', 'editeur@tests.local'
    ))
  ),
  '« Remplacer » : l''exercice d''une méthode qu''une personne écrit est gardé'
);

select * from finish();
rollback;

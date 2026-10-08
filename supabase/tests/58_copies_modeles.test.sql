-- Copies des modèles (08/10/2026) : où une mise en forme ou un point de départ a été copié.
-- L'équipe lit et note les copies ; seulement d'un modèle copié (mise en forme, point de départ),
-- une fois par contenu ; ni anonyme, ni lecteur ; personne ne change ni ne supprime une ligne ;
-- elle part avec le contenu supprimé définitivement.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(11);

select pg_temp.create_people();
select pg_temp.empty_contents();
\ir aides/publication.inc

select pg_temp.as_person('editor');
select pg_temp.create_content('style', 'template', 'Citation', 'style');
select pg_temp.create_content('partage', 'template', 'Contact', 'shared');
select pg_temp.create_content('article', 'article', 'Bien dormir');
select pg_temp.create_content('autre', 'article', 'Autre');

create function pg_temp.copy(template_name text, content_name text)
returns void
language sql
as $$
  insert into public.template_copies (template_id, content_id)
  values (pg_temp.cid(template_name), pg_temp.cid(content_name))
$$;
grant execute on function pg_temp.copy(text, text) to public;

select lives_ok(
  $$select pg_temp.copy('style', 'article')$$,
  'éditeur : note la copie d''une mise en forme'
);
select is(
  (select count(*)::int from public.template_copies where template_id = pg_temp.cid('style')),
  1,
  'éditeur : la lit'
);
select throws_ok(
  $$select pg_temp.copy('style', 'article')$$, '23505', null,
  'une seule ligne par modèle et par contenu'
);
select throws_ok(
  $$select pg_temp.copy('partage', 'article')$$, '42501', null,
  'pas un bloc partagé (il reste lié, draft_template_ids)'
);
select throws_ok(
  $$select pg_temp.copy('autre', 'article')$$, '42501', null,
  'pas un contenu qui n''est pas un modèle'
);
select throws_ok(
  $$update public.template_copies set copied_at = now()$$, '42501', null,
  'personne ne change une copie'
);
select throws_ok(
  'delete from public.template_copies', '42501', null,
  'personne ne supprime une copie'
);

select pg_temp.as_anon();
select throws_ok(
  'select count(*) from public.template_copies', '42501', null, 'anonyme : ne lit rien'
);
select throws_ok(
  $$select pg_temp.copy('style', 'autre')$$, '42501', null, 'anonyme : ne note rien'
);

select pg_temp.as_person('reader');
select is(
  (select count(*)::int from public.template_copies), 0, 'lecteur : ne lit rien'
);

-- Le contenu supprimé définitivement emporte sa copie.
select pg_temp.as_postgres();
delete from public.contents where id = pg_temp.cid('article');
select is(
  (select count(*)::int from public.template_copies), 0,
  'la copie part avec le contenu supprimé définitivement'
);

select * from finish();
rollback;

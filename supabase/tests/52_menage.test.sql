-- Ménage de la base (04/10/2026) : ce qui a été retiré ou rangé. Le résumé retiré est vérifié
-- ailleurs : forme des blocs (cas partagé refuse-resume, 30_blocs_schema), brouillon d'un nouveau
-- contenu (32_contenus_regles), app_feed et app_content (44_sections_regles).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(10);

-- La Corbeille sans deleted_by : l'admin lit deleted_by_name.
select hasnt_column('public', 'trash_items', 'deleted_by', 'la Corbeille n''a plus deleted_by');
select has_column('public', 'trash_items', 'deleted_by_name', 'elle garde deleted_by_name');

-- Plus de droit sur la seule colonne list_position : celui sur la table suffit.
select is(
  (select attacl from pg_attribute
    where attrelid = 'public.contents'::regclass and attname = 'list_position'),
  null,
  'list_position n''a plus de droit à elle'
);
select ok(
  has_column_privilege('authenticated', 'public.contents', 'list_position', 'select'),
  'l''équipe la lit toujours (droit sur la table)'
);

-- Les fonctions internes de l'équipe sont dans private.
select hasnt_function('public', 'session_is_open', 'session_is_open n''est plus dans public');
select hasnt_function('public', 'initial_role', 'initial_role non plus');
select hasnt_function('public', 'handle_new_user', 'handle_new_user non plus');
select is(
  (select array_agg(t.tgname || ':' || p.pronamespace::regnamespace order by t.tgname)
    from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    where p.proname in ('handle_new_user', 'sync_profile_email', 'profiles_before_write', 'protect_last_admin')
      and not t.tgisinternal),
  array['on_auth_user_app_metadata_updated:private', 'on_auth_user_created:private',
    'on_auth_user_email_updated:private', 'profiles_before_write:private', 'protect_last_admin:private'],
  'les déclencheurs de l''équipe appellent leurs fonctions, dans private'
);
select function_privs_are(
  'private', 'session_is_open', array[]::text[], 'service_role', array[]::text[],
  'service_role ne l''appelle plus directement'
);

-- is_staff, qui appelle private.session_is_open, marche toujours.
select pg_temp.create_people();
select pg_temp.as_person('editor');
select ok(public.is_staff(), 'un éditeur en aal2 avec une session ouverte est de l''équipe');

select * from finish();
rollback;

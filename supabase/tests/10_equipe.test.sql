-- Équipe : fiches, rôles, double vérification imposée par la base, protection du dernier admin.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
--
-- Pour simuler une personne connectée : « set local role authenticated » puis les informations
-- de sa session dans request.jwt.claims (sub = son identifiant, aal = niveau de vérification,
-- session_id = sa session, qui doit exister dans auth.sessions).
-- « reset role » revient à postgres, qui ignore les politiques, pour préparer ou vérifier.
begin;
select plan(77);

-- ---------------------------------------------------------------------------------------------
-- Structure et droits
-- ---------------------------------------------------------------------------------------------

select has_table('public', 'profiles', 'la table profiles existe');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'les politiques (RLS) sont actives sur profiles'
);
select enum_has_labels('public', 'team_role', array['admin', 'editor'], 'deux rôles : admin et editor');
select is_definer('public', 'is_staff', array[]::text[], 'is_staff contourne les politiques (pas de boucle)');
select is_definer('public', 'is_admin', array[]::text[], 'is_admin contourne les politiques (pas de boucle)');
select table_privs_are('public', 'profiles', 'anon', array[]::text[], 'anon : aucun droit sur profiles');
select table_privs_are(
  'public', 'profiles', 'authenticated', array['SELECT'],
  'authenticated : lecture seule au niveau de la table'
);
select column_privs_are(
  'public', 'profiles', 'full_name', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated : le nom est modifiable'
);
select column_privs_are(
  'public', 'profiles', 'role', 'authenticated', array['SELECT'],
  'authenticated : le rôle n''est pas modifiable'
);
select function_privs_are(
  'public', 'is_staff', array[]::text[], 'anon', array[]::text[],
  'anon : ne peut pas appeler is_staff'
);
select function_privs_are(
  'public', 'is_admin', array[]::text[], 'authenticated', array['EXECUTE'],
  'authenticated : peut appeler is_admin'
);
select function_privs_are(
  'public', 'handle_new_user', array[]::text[], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler handle_new_user'
);
select function_privs_are(
  'public', 'protect_last_admin', array[]::text[], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler protect_last_admin'
);
select function_privs_are(
  'public', 'initial_role', array['jsonb'], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler initial_role'
);
select function_privs_are(
  'public', 'session_is_open', array[]::text[], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler session_is_open'
);
select function_privs_are(
  'public', 'has_other_active_admin', array['uuid'], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler has_other_active_admin'
);

-- ---------------------------------------------------------------------------------------------
-- Création des fiches et amorçage
-- ---------------------------------------------------------------------------------------------

-- La base de développement peut déjà contenir des comptes : on vide les fiches pour que
-- l'amorçage soit testé sur une équipe vide (tout est annulé à la fin par le rollback).
-- « cascade » : les fichiers de la médiathèque citent leurs auteurs.
set local client_min_messages = warning;
truncate public.profiles cascade;
reset client_min_messages;

-- Équipe vide : un inconnu (inscription ouverte par erreur) ne devient pas admin.
insert into auth.users (id, email) values
  ('66666666-6666-6666-6666-666666666666', 'pirate@test.local');
select is(
  (select count(*)::int from public.profiles where id = '66666666-6666-6666-6666-666666666666'),
  0,
  'amorçage : sans admin, un compte avec une autre adresse n''a pas de fiche (et n''est pas admin)'
);

-- Premier admin (procédure manuelle) : le compte est d'abord créé sans rôle (invitation depuis le
-- tableau de bord), puis le rôle admin est posé dans app_metadata.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a0', 'premier@test.local', now());
select is(
  (select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a0'),
  0,
  'premier admin : invité sans rôle, il n''a pas encore de fiche'
);
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}') || '{"role":"admin"}'
where id = '00000000-0000-0000-0000-0000000000a0';
select is(
  (select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a0'),
  'admin'::public.team_role,
  'premier admin : le rôle posé dans app_metadata crée sa fiche admin'
);

-- Ensuite, le rôle vient de app_metadata (écrit par la fonction « equipe », clé secrète).
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local', '{"role":"admin"}', '{"full_name":"  Anne Admin  "}'),
  ('22222222-2222-2222-2222-222222222222', 'edit@test.local', '{"role":"editor"}', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'autre@test.local', '{"role":"admin"}', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'bizarre@test.local', '{"role":"editor"}', '{"full_name":"   "}'),
  ('77777777-7777-7777-7777-777777777777', 'patron@test.local', '{"role":"patron"}', '{}');

select is(
  (select role from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'admin'::public.team_role,
  'rôle admin lu dans app_metadata'
);
select is(
  (select role from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'editor'::public.team_role,
  'rôle editor lu dans app_metadata'
);
select is(
  (select count(*)::int from public.profiles where id = '77777777-7777-7777-7777-777777777777'),
  0,
  'rôle inconnu : pas de fiche'
);
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Anne Admin',
  'nom lu dans user_metadata, sans les espaces autour'
);
select is(
  (select full_name from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  null,
  'nom vide : aucun nom'
);
select is(
  (select email from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'edit@test.local',
  'e-mail recopié depuis le compte'
);

-- Équipe amorcée : un compte sans rôle n'a pas de fiche.
insert into auth.users (id, email) values
  ('55555555-5555-5555-5555-555555555555', 'nouveau@test.local');
select is(
  (select count(*)::int from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  0,
  'équipe déjà amorcée : un compte sans rôle n''a pas de fiche'
);
select is(
  public.initial_role('{"provider":"email"}'),
  null,
  'sans rôle dans app_metadata : aucun rôle, quelle que soit l''adresse'
);

-- Supabase Auth écrit app_metadata juste après la création du compte (createUser).
update auth.users set raw_app_meta_data = '{"provider":"email","role":"editor"}'
where id = '55555555-5555-5555-5555-555555555555';
select is(
  (select role from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  'editor'::public.team_role,
  'rôle ajouté à app_metadata après la création : la fiche est créée'
);
delete from auth.users where id = '55555555-5555-5555-5555-555555555555';

-- Une fiche existante ne change pas quand app_metadata change.
update auth.users set raw_app_meta_data = '{"role":"admin"}'
where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select role from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'editor'::public.team_role,
  'app_metadata modifié : le rôle d''une fiche existante ne change pas'
);

update auth.users set email = 'edition@test.local' where id = '22222222-2222-2222-2222-222222222222';
select is(
  (select email from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'edition@test.local',
  'e-mail de la fiche mis à jour avec celui du compte'
);

-- Date de modification : on la recule sans passer par le déclencheur, puis on modifie la fiche.
alter table public.profiles disable trigger profiles_before_write;
update public.profiles set updated_at = '2000-01-01' where id = '44444444-4444-4444-4444-444444444444';
alter table public.profiles enable trigger profiles_before_write;
update public.profiles set full_name = 'Bruno' where id = '44444444-4444-4444-4444-444444444444';
select is(
  (select updated_at from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  now(),
  'date de modification tenue à jour'
);

-- Sessions ouvertes (une par membre connecté).
insert into auth.sessions (id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222');

-- ---------------------------------------------------------------------------------------------
-- Éditeur avant la double vérification (aal1)
-- ---------------------------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-0000-0000-000000000002"}',
  true
);

select results_eq(
  'select email from public.profiles',
  array['edition@test.local'],
  'aal1 : ne voit que sa fiche'
);
select ok(not public.is_staff(), 'aal1 : is_staff est faux');
update public.profiles set full_name = 'Trop tôt' where id = auth.uid();

-- ---------------------------------------------------------------------------------------------
-- Éditeur après la double vérification (aal2)
-- ---------------------------------------------------------------------------------------------

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-0000-0000-000000000002"}',
  true
);

reset role;
select is(
  (select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'aal1 : ne peut pas modifier son nom'
);
set local role authenticated;

select is((select count(*)::int from public.profiles), 5, 'aal2 : voit toute l''équipe');
select ok(public.is_staff(), 'aal2 : is_staff est vrai');
select ok(not public.is_admin(), 'éditeur : is_admin est faux');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', null,
  'éditeur : ne peut pas changer son rôle'
);
select lives_ok(
  $$update public.profiles set full_name = 'Éric' where id = auth.uid()$$,
  'éditeur : peut changer son nom'
);
update public.profiles set full_name = 'Pirate' where id = '11111111-1111-1111-1111-111111111111';
select throws_ok(
  $$insert into public.profiles (id, email) values (gen_random_uuid(), 'x@test.local')$$,
  '42501', null,
  'éditeur : ne peut pas ajouter de fiche'
);
select throws_ok(
  $$delete from public.profiles where id = '44444444-4444-4444-4444-444444444444'$$,
  '42501', null,
  'éditeur : ne peut pas supprimer de fiche'
);

reset role;
select is(
  (select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Éric',
  'le nom de l''éditeur est enregistré'
);
select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Anne Admin',
  'éditeur : ne peut pas modifier la fiche d''un autre'
);

-- ---------------------------------------------------------------------------------------------
-- Jeton d'une session fermée (double vérification réinitialisée, déconnexion forcée)
-- ---------------------------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2"}',
  true
);
select ok(not public.is_staff(), 'jeton sans session : is_staff est faux');

select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-0000-0000-000000000001"}',
  true
);
select ok(not public.is_staff(), 'jeton avec la session d''un autre membre : is_staff est faux');

reset role;
select public.end_member_sessions('22222222-2222-2222-2222-222222222222');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-0000-0000-000000000002"}',
  true
);
select ok(not public.is_staff(), 'après end_member_sessions : l''ancien jeton aal2 ne donne plus accès');
select is(
  (select count(*)::int from public.profiles),
  1,
  'après end_member_sessions : l''ancien jeton ne voit plus que sa fiche'
);
update public.profiles set full_name = 'Voleur' where id = auth.uid();
reset role;
select is(
  (select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Éric',
  'après end_member_sessions : l''ancien jeton ne peut plus rien modifier'
);

-- ---------------------------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal1","session_id":"aaaaaaaa-0000-0000-0000-000000000001"}',
  true
);
select ok(not public.is_admin(), 'admin en aal1 : is_admin est faux');

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-0000-0000-000000000001"}',
  true
);
select ok(public.is_admin(), 'admin en aal2 : is_admin est vrai');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '22222222-2222-2222-2222-222222222222'$$,
  '42501', null,
  'admin : les rôles ne se changent pas par l''API (fonction equipe seulement)'
);

reset role;
delete from auth.sessions where id = 'aaaaaaaa-0000-0000-0000-000000000001';
set local role authenticated;
select ok(not public.is_admin(), 'admin dont la session est fermée : is_admin est faux');

-- ---------------------------------------------------------------------------------------------
-- Compte sans fiche, visiteur non connecté
-- ---------------------------------------------------------------------------------------------

reset role;
insert into auth.sessions (id, user_id) values
  ('aaaaaaaa-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666');
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated","aal":"aal2","session_id":"aaaaaaaa-0000-0000-0000-000000000006"}',
  true
);
select ok(not public.is_staff(), 'compte sans fiche : is_staff est faux, même en aal2');
select is((select count(*)::int from public.profiles), 0, 'compte sans fiche : ne voit rien');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.profiles', '42501', null, 'anon : aucun accès aux fiches');
select throws_ok('select public.is_staff()', '42501', null, 'anon : ne peut pas appeler is_staff');
reset role;

-- ---------------------------------------------------------------------------------------------
-- Dernier admin : seuls comptent les admins capables d'agir
-- ---------------------------------------------------------------------------------------------

-- Anne (1111) et 3333 : invitation acceptée et double vérification configurée.
-- L'admin prévu (a0) : invitation acceptée, mais pas encore de double vérification.
-- 8888 : admin invité, qui n'a pas encore accepté.
update auth.users set email_confirmed_at = now()
where id in ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333');
insert into auth.users (id, email, raw_app_meta_data) values
  ('88888888-8888-8888-8888-888888888888', 'invite@test.local', '{"role":"admin"}');
insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'totp', 'verified', '2026-09-02', now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'totp', 'verified', '2026-09-01', now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'totp', 'unverified', now(), now());

select ok(
  public.has_other_active_admin('11111111-1111-1111-1111-111111111111'),
  'un autre admin actif existe (3333)'
);
select lives_ok(
  $$update public.profiles set role = 'editor' where id = '33333333-3333-3333-3333-333333333333'$$,
  'avec deux admins actifs, on peut en rétrograder un'
);
select ok(
  not public.has_other_active_admin('11111111-1111-1111-1111-111111111111'),
  'un admin invité ou sans double vérification ne compte pas'
);
select throws_ok(
  $$update public.profiles set role = 'editor' where id = '11111111-1111-1111-1111-111111111111'$$,
  'P0001', 'dernier_admin',
  'le dernier admin actif ne peut pas être rétrogradé, même avec un admin seulement invité'
);
select throws_ok(
  $$delete from public.profiles where id = '11111111-1111-1111-1111-111111111111'$$,
  'P0001', 'dernier_admin',
  'la fiche du dernier admin actif ne peut pas être supprimée'
);
select throws_ok(
  $$delete from auth.users where id = '11111111-1111-1111-1111-111111111111'$$,
  'P0001', 'dernier_admin',
  'le compte du dernier admin actif ne peut pas être supprimé (suppression en cascade bloquée)'
);
select lives_ok(
  $$update public.profiles set full_name = 'Anne' where id = '11111111-1111-1111-1111-111111111111'$$,
  'le dernier admin actif peut changer son nom'
);
select lives_ok(
  $$delete from auth.users where id = '88888888-8888-8888-8888-888888888888'$$,
  'un admin seulement invité peut être retiré tant qu''un admin actif reste'
);
select lives_ok(
  $$update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333'$$,
  'on peut nommer un nouvel admin'
);
select lives_ok(
  $$update public.profiles set role = 'editor' where id = '11111111-1111-1111-1111-111111111111'$$,
  'avec un nouvel admin actif, l''ancien peut être rétrogradé'
);

-- Retirer un membre : sa fiche part avec son compte.
select lives_ok(
  $$delete from auth.users where id = '44444444-4444-4444-4444-444444444444'$$,
  'un éditeur peut être retiré'
);
select is(
  (select count(*)::int from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  0,
  'sa fiche est supprimée avec son compte'
);

-- ---------------------------------------------------------------------------------------------
-- Fonctions réservées à la fonction serveur « equipe »
-- ---------------------------------------------------------------------------------------------

select function_privs_are(
  'public', 'team_members', array[]::text[], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler team_members'
);
select function_privs_are(
  'public', 'team_members', array[]::text[], 'service_role', array['EXECUTE'],
  'service_role : peut appeler team_members'
);
select function_privs_are(
  'public', 'end_member_sessions', array['uuid'], 'authenticated', array[]::text[],
  'authenticated : ne peut pas appeler end_member_sessions'
);
select function_privs_are(
  'public', 'has_other_active_admin', array['uuid'], 'service_role', array['EXECUTE'],
  'service_role : peut appeler has_other_active_admin'
);

select is(
  (select count(*)::int from public.team_members()),
  (select count(*)::int from public.profiles),
  'team_members : un membre par fiche'
);
select is(
  (select mfa_enabled_at from public.team_members() where id = '33333333-3333-3333-3333-333333333333'),
  '2026-09-01'::timestamptz,
  'team_members : date de configuration de la double vérification'
);
select is(
  (select mfa_enabled_at from public.team_members() where id = '22222222-2222-2222-2222-222222222222'),
  null,
  'team_members : un facteur non vérifié ne compte pas'
);

insert into auth.sessions (id, user_id) values
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333');
select public.end_member_sessions('22222222-2222-2222-2222-222222222222');
select is(
  (select count(*)::int from auth.sessions where user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'end_member_sessions : le membre est déconnecté partout'
);
select is(
  (select count(*)::int from auth.sessions where user_id = '33333333-3333-3333-3333-333333333333'),
  1,
  'end_member_sessions : les autres membres restent connectés'
);

select * from finish();
rollback;

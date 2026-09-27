-- Équipe de l'administration : fiches des membres, rôles et règles d'accès.
--
-- Principe : la base fait la loi. Un membre ne lit les données de l'équipe qu'après la double
-- vérification (session « aal2 »). Avant, il ne voit que sa propre fiche.
-- Les comptes se créent sur invitation seulement (fonction serveur « equipe », clé secrète).
--
-- Mise en production, dans cet ordre :
--   1. `supabase config push` (inscriptions fermées : auth.enable_signup = false), puis vérifier
--      dans le tableau de bord (Authentication > Sign In / Providers) que « Allow new users to
--      sign up » est bien désactivé ;
--   2. seulement ensuite `supabase db push`.
-- Le premier admin se crée une seule fois, à la main (voir docs/ADMINISTRATION.md, « Premier
-- admin ») : invitation depuis le tableau de bord, puis rôle admin posé dans app_metadata.
-- Aucune adresse n'est écrite dans le dépôt.

-- ---------------------------------------------------------------------------------------------
-- Rôles et fiches
-- ---------------------------------------------------------------------------------------------

create type public.team_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text check (full_name is null or char_length(full_name) <= 100),
  role public.team_role not null default 'editor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Une fiche par membre de l''équipe, créée avec son compte.';

alter table public.profiles enable row level security;

-- Les droits par défaut du schéma public donnent tout à anon et authenticated : on repart de zéro.
-- Un membre peut lire les fiches (selon les politiques) et ne modifier que son nom.
-- Ajouts, suppressions et changements de rôle passent par la fonction « equipe » (service_role).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Qui est membre, qui est admin
-- ---------------------------------------------------------------------------------------------

-- Vrai si la session du jeton est encore ouverte. Un jeton reste signé et valable jusqu'à son
-- expiration (1 heure) : sans cette vérification, un membre déconnecté de force (double
-- vérification réinitialisée, compte retiré) garderait l'accès aux données jusque-là.
create function public.session_is_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = nullif((select auth.jwt()) ->> 'session_id', '')::uuid
      and s.user_id = (select auth.uid())
  )
$$;

-- Vrai si la personne connectée a une fiche, a passé la double vérification, et si sa session
-- est encore ouverte.
-- « security definer » : la fonction lit profiles sans repasser par les politiques (pas de boucle).
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()))
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and public.session_is_open()
$$;

-- Comme is_staff(), avec en plus le rôle admin.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and public.session_is_open()
$$;

revoke execute on function public.is_staff(), public.is_admin() from public, anon;
grant execute on function public.is_staff(), public.is_admin() to authenticated, service_role;

-- Vrai s'il reste un admin capable d'agir en dehors de ce membre : invitation acceptée et double
-- vérification configurée. Un admin seulement invité, ou sans double vérification, ne compte pas :
-- il ne peut ni se connecter à l'équipe, ni renvoyer une invitation, ni réinitialiser quoi que ce
-- soit.
create function public.has_other_active_admin(excluded_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.role = 'admin'
      and p.id <> excluded_user_id
      and u.email_confirmed_at is not null
      and exists (
        select 1 from auth.mfa_factors f
        where f.user_id = p.id and f.factor_type = 'totp' and f.status = 'verified'
      )
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Politiques
-- ---------------------------------------------------------------------------------------------

create policy "Lecture : sa fiche, ou toute l'équipe après la double vérification"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

create policy "Modification : sa propre fiche, après la double vérification"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) and (select public.is_staff()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------------------------------

-- Rôle d'un compte à la création de sa fiche, ou null s'il ne doit pas en avoir.
-- Le rôle vient de app_metadata, que seule la clé secrète peut écrire : la fonction « equipe » le
-- fixe à l'invitation, et le premier admin le reçoit à la main (voir l'en-tête).
-- Un compte sans rôle (inscription par l'API si elles étaient ouvertes par erreur, compte créé à
-- la main dans le tableau de bord) n'a pas de fiche : il n'a accès à rien.
create function public.initial_role(app_metadata jsonb)
returns public.team_role
language sql
immutable
set search_path = ''
as $$
  select case
    when app_metadata ->> 'role' in ('admin', 'editor')
      then (app_metadata ->> 'role')::public.team_role
    else null
  end
$$;

-- Crée la fiche d'un compte dès que son rôle est connu (voir initial_role). Supabase Auth écrit
-- app_metadata juste après avoir créé le compte (createUser) : on regarde donc aussi ses mises à
-- jour. Une fiche existante n'est jamais modifiée ici ; le rôle ne change ensuite que par la
-- fonction « equipe ».
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role public.team_role;
begin
  if exists (select 1 from public.profiles where id = new.id) then
    return new;
  end if;

  new_role := public.initial_role(new.raw_app_meta_data);
  if new_role is null then
    return new;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name',
    new_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function public.handle_new_user();

-- Garde l'e-mail de la fiche identique à celui du compte.
create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- Nettoie le nom (espaces, nom vide) et tient à jour la date de modification.
create function public.profiles_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.full_name := nullif(btrim(new.full_name), '');
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_before_write
  before insert or update on public.profiles
  for each row execute function public.profiles_before_write();

-- Un admin ne peut être ni rétrogradé ni supprimé (y compris par la suppression de son compte,
-- qui supprime sa fiche en cascade) s'il ne reste pas d'autre admin capable d'agir (voir
-- has_other_active_admin). L'erreur « dernier_admin » est reconnue par la fonction « equipe » et
-- par l'interface.
create function public.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    -- Verrou : deux retraits simultanés ne peuvent pas laisser l'équipe sans admin.
    perform pg_advisory_xact_lock(hashtext('public.profiles:admins'));
    if not public.has_other_active_admin(old.id) then
      raise exception using
        errcode = 'P0001',
        message = 'dernier_admin',
        detail = 'L''équipe doit garder au moins un admin qui a accepté son invitation et '
          'configuré la double vérification.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger protect_last_admin
  before update of role or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- ---------------------------------------------------------------------------------------------
-- Pour la fonction « equipe » (clé secrète uniquement)
-- ---------------------------------------------------------------------------------------------

-- La liste de l'équipe, avec l'état de chaque compte : invitation acceptée ou non, dernière
-- connexion, date de configuration de la double vérification (null si elle n'est pas faite).
create function public.team_members()
returns table (
  id uuid,
  email text,
  full_name text,
  role public.team_role,
  created_at timestamptz,
  invited_at timestamptz,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  mfa_enabled_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.created_at,
    u.invited_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    (
      select min(f.created_at)
      from auth.mfa_factors f
      where f.user_id = p.id and f.factor_type = 'totp' and f.status = 'verified'
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at
$$;

-- Déconnecte un membre partout (après la réinitialisation de sa double vérification).
-- Ses jetons déjà émis restent signés, mais is_staff() et is_admin() les refusent aussitôt : ils
-- vérifient que la session existe encore (session_is_open).
create function public.end_member_sessions(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = target_user_id
$$;

revoke execute on function
  public.team_members(),
  public.end_member_sessions(uuid),
  public.has_other_active_admin(uuid)
from public, anon, authenticated;
grant execute on function
  public.team_members(),
  public.end_member_sessions(uuid),
  public.has_other_active_admin(uuid)
to service_role;

-- Les fonctions internes ne s'appellent pas depuis l'API.
revoke execute on function
  public.handle_new_user(),
  public.sync_profile_email(),
  public.profiles_before_write(),
  public.protect_last_admin(),
  public.initial_role(jsonb),
  public.session_is_open()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Rattrapage des comptes qui existaient avant cette migration
-- ---------------------------------------------------------------------------------------------

-- Même règle que pour un nouveau compte (initial_role). Un compte qui a déjà une fiche est laissé
-- tel quel ; un compte sans rôle connu n'en reçoit pas.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  u.raw_user_meta_data ->> 'full_name',
  public.initial_role(u.raw_app_meta_data)
from auth.users u
where public.initial_role(u.raw_app_meta_data) is not null
order by u.created_at
on conflict (id) do nothing;

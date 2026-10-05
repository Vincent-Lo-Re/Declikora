-- Ménage de la base (04/10/2026, inventaire de toute la base, QCM ; docs/ADMINISTRATION.md, § 4,
-- « Plus de résumé ») : la base ne garde plus que ce qui sert. Aucun contenu n'existait encore, ni
-- en local ni en ligne.
--
-- 1. Le résumé, abandonné le 03/10/2026 : plus dans le brouillon d'un nouveau contenu
--    (private.empty_draft), ni dans ce que lit l'app (app_feed ici ; app_content et app_method sont
--    réécrites par la migration suivante, celle des exercices). La forme des blocs le perd par sa
--    migration générée (…_schema_blocs.sql).
-- 2. Un droit en double : authenticated lit déjà toute la table contents ; le droit sur la seule
--    colonne list_position ne sert à rien.
-- 3. La Corbeille (public.trash_items) perd deleted_by, que personne ne lit : l'admin lit
--    deleted_by_name.
-- 4. Les fonctions internes de l'équipe passent dans private, comme toutes les fonctions
--    internes écrites depuis : session_is_open, initial_role et les fonctions des déclencheurs
--    (handle_new_user, sync_profile_email, profiles_before_write, protect_last_admin). Aucun rôle
--    de l'API ne les appelle ; un déclencheur garde sa fonction quand elle change de schéma.

-- ---------------------------------------------------------------------------------------------
-- 1. Le résumé
-- ---------------------------------------------------------------------------------------------

create or replace function private.empty_draft(title text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'v', 1,
    'title', coalesce(title, ''),
    'cover', null,
    'audio', null,
    'blocks', '[]'::jsonb
  )
$$;

-- Comme avant (ordre_des_listes_et_remplacement.sql), sans le résumé.
create or replace function public.app_feed(
  section text,
  category_id uuid default null,
  before text default null,
  lim integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wanted_kind text;
  page_size integer := coalesce(app_feed.lim, 20);
  cursor_position integer;
  cursor_id uuid;
  page_items jsonb;
  found_count integer;
  last_id uuid;
begin
  wanted_kind := case app_feed.section
    when 'blog' then 'article'
    when 'podcasts' then 'episode'
  end;
  if wanted_kind is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La section doit être blog ou podcasts.';
  end if;

  if page_size < 1 or page_size > 50 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Une page contient de 1 à 50 éléments.';
  end if;

  if app_feed.before is not null then
    begin
      if app_feed.before !~ '^-?\d{1,10}~[0-9a-f-]{36}$' then
        raise exception 'curseur mal formé';
      end if;
      cursor_position := split_part(app_feed.before, '~', 1)::integer;
      cursor_id := split_part(app_feed.before, '~', 2)::uuid;
    exception
      when others then
        raise exception using
          errcode = 'P0001',
          message = 'demande_invalide',
          detail = 'Le curseur n''est pas celui d''une page précédente.';
    end;
  end if;

  if app_feed.category_id is not null and not exists (
    select 1 from public.categories cat
    where cat.id = app_feed.category_id and cat.section = app_feed.section
  ) then
    return jsonb_build_object('items', '[]'::jsonb, 'nextCursor', null);
  end if;

  select
    coalesce(jsonb_agg(page.item order by page.list_position, page.content_id), '[]'),
    count(*)
  into page_items, found_count
  from (
    select
      c.id as content_id,
      c.list_position,
      jsonb_build_object(
        'id', c.id,
        'versionId', v.id,
        'kind', c.kind,
        'title', v.body ->> 'title',
        'cover', coalesce(v.body -> 'cover', 'null'::jsonb),
        -- Seulement l'image de présentation (informations figées à la publication).
        'files', case
          when v.cover_media_id is not null and v.files ? v.cover_media_id::text then
            jsonb_build_object(v.cover_media_id::text, v.files -> v.cover_media_id::text)
          else '{}'::jsonb
        end,
        'categoryIds', to_jsonb(array(
          select cat.id from public.categories cat
          where cat.id = any (v.category_ids)
          order by cat.position, cat.id
        )),
        'level', case
          when l.level_id is null then null
          else jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
        end,
        'locked', not (l.level_id is null or coalesce(reader.rank >= l.level_rank, false)),
        -- Durée du son d'un épisode (media.duration_s, figée à la publication), même verrouillé.
        'durationS', case
          when c.kind = 'episode' then v.files #> array[v.body #>> '{audio,mediaId}', 'durationS']
        end,
        'publishedAt', v.published_at,
        'firstPublishedAt', c.first_published_at
      ) as item
    from private.live l
    join public.contents c on c.id = l.content_id
    join public.versions v on v.id = l.version_id
    left join public.access_levels al on al.id = l.level_id
    cross join (select private.reader_rank() as rank) reader
    where l.kind = wanted_kind
      and c.first_published_at is not null
      and (app_feed.category_id is null or v.category_ids @> array[app_feed.category_id])
      and (cursor_id is null or (c.list_position, c.id) > (cursor_position, cursor_id))
    order by c.list_position, c.id
    limit page_size + 1
  ) page;

  if found_count > page_size then
    -- Un élément de plus que demandé : il y a une page suivante, qui commence après le dernier
    -- élément gardé.
    page_items := page_items - page_size;
    last_id := (page_items -> (page_size - 1) ->> 'id')::uuid;
    return jsonb_build_object(
      'items', page_items,
      'nextCursor', private.feed_cursor(
        (select c.list_position from public.contents c where c.id = last_id),
        last_id
      )
    );
  end if;

  return jsonb_build_object('items', page_items, 'nextCursor', null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Un droit en double
-- ---------------------------------------------------------------------------------------------

revoke select (list_position) on public.contents from authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. La Corbeille sans deleted_by
-- ---------------------------------------------------------------------------------------------

-- Même vue qu'avant (corbeille_fichiers_publics.sql), sans la colonne deleted_by : une colonne ne
-- se retire qu'en recréant la vue.
drop view public.trash_items;

create view public.trash_items
with (security_invoker = true)
as
select
  'file'::text as item_type,
  m.id,
  m.kind,
  m.name as title,
  null::text as parent_title,
  null::uuid as trash_batch,
  m.deleted_at,
  coalesce(p.full_name, p.email) as deleted_by_name,
  m.deleted_at + interval '30 days' as purge_at,
  m.purge_error,
  true as batch_root
from public.media m
left join public.profiles p on p.id = m.deleted_by
where m.deleted_at is not null
  and m.purge_requested_at is null
union all
select
  'content'::text,
  c.id,
  c.kind,
  nullif(c.title, ''),
  nullif(case when c.kind = 'lesson' then grand.title else parent.title end, ''),
  c.trash_batch,
  c.deleted_at,
  coalesce(p.full_name, p.email),
  c.deleted_at + interval '30 days',
  null::text,
  parent.id is null or parent.trash_batch is distinct from c.trash_batch
from public.contents c
left join public.contents parent on parent.id = c.parent_id
left join public.contents grand on grand.id = parent.parent_id
left join public.profiles p on p.id = c.deleted_by
where c.deleted_at is not null;

comment on view public.trash_items is
  'La corbeille : fichiers (item_type file) et contenus (item_type content). purge_at : '
  'effacement automatique au bout de 30 jours ; batch_root : l''élément mis à la corbeille (les '
  'chapitres et leçons partis avec leur méthode ont le même trash_batch).';

revoke all on public.trash_items from public, anon, authenticated, service_role;
grant select on public.trash_items to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Les fonctions internes de l'équipe dans private
-- ---------------------------------------------------------------------------------------------

alter function public.session_is_open() set schema private;
alter function public.initial_role(jsonb) set schema private;
alter function public.handle_new_user() set schema private;
alter function public.sync_profile_email() set schema private;
alter function public.profiles_before_write() set schema private;
alter function public.protect_last_admin() set schema private;

-- Comme les autres fonctions de private : exécutables par leur propriétaire seulement.
revoke all on function
  private.session_is_open(),
  private.initial_role(jsonb),
  private.handle_new_user(),
  private.sync_profile_email(),
  private.profiles_before_write(),
  private.protect_last_admin()
from public, anon, authenticated, service_role;

-- Celles qui les appellent les cherchent désormais dans private.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()))
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
    and private.session_is_open()
$$;

create or replace function public.is_admin()
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
    and private.session_is_open()
$$;

create or replace function private.handle_new_user()
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

  new_role := private.initial_role(new.raw_app_meta_data);
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

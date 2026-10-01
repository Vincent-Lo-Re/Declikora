-- Deux ajouts du 30/09/2026 (ADMIN § 3 et § 6) :
--
-- 1. L'ordre des listes du Fil, de Radio Éclaircies et des Méthodes : chaque article, épisode ou
--    méthode a une place dans sa section (list_position, la plus petite en tête). Un contenu neuf
--    arrive en tête ; l'équipe range ensuite par glisser-déposer (contents_reorder). Un seul ordre
--    pour tout, brouillons compris : l'app (app_feed) montre ceux qui sont en ligne, dans cet
--    ordre. Les contenus déjà là sont rangés du plus récent au plus ancien (date de création).
--
-- 2. Remplacer un fichier de la médiathèque ([D21] : un fichier ne change jamais, l'app le garde
--    en cache par identifiant) : le nouveau fichier est un NOUVEAU fichier, du même type et prêt.
--    media_replace le met à la place de l'ancien dans les brouillons (sauf ceux que quelqu'un
--    écrit en ce moment, rendus dans la réponse) ; media_replace_live, sur décision de l'équipe,
--    fait de même dans ce qui est en ligne (une nouvelle version, comme media_push).

-- ---------------------------------------------------------------------------------------------
-- 1. L'ordre des listes
-- ---------------------------------------------------------------------------------------------

alter table public.contents add column list_position integer;

comment on column public.contents.list_position is
  'Article, épisode ou méthode : sa place dans la liste de sa section (la plus petite en tête), '
  'pour l''admin et pour l''app. Un contenu neuf arrive en tête (contents_list_position). '
  'Rangée par contents_reorder. Null pour les autres sortes.';

-- Les contenus déjà là : du plus récent au plus ancien (date de création). Le garde de la
-- corbeille refuse toute modification d'un contenu dans la corbeille : il est coupé le temps
-- de leur donner aussi une place (ils la retrouvent s'ils sont restaurés).
alter table public.contents disable trigger contents_20_trash_guard;
update public.contents c
set list_position = o.n - 1
from (
  select id, row_number() over (partition by kind order by created_at desc, id desc) as n
  from public.contents
  where kind in ('article', 'episode', 'method')
) o
where c.id = o.id;
alter table public.contents enable trigger contents_20_trash_guard;

alter table public.contents add constraint contents_list_position_kind
  check ((kind in ('article', 'episode', 'method')) = (list_position is not null));

grant select (list_position) on public.contents to authenticated;

-- Un contenu neuf arrive en tête de sa liste (une place avant la première).
create function private.contents_list_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind in ('article', 'episode', 'method') then
    -- Deux contenus créés au même instant peuvent partager une place : l'identifiant les
    -- départage (et le prochain rangement leur en donne une chacun).
    select coalesce(min(c.list_position), 0) - 1 into new.list_position
    from public.contents c
    where c.kind = new.kind;
  else
    new.list_position := null;
  end if;
  return new;
end;
$$;

revoke execute on function private.contents_list_position() from public, anon, authenticated;

create trigger contents_05_list_position
  before insert on public.contents
  for each row execute function private.contents_list_position();

-- La lecture de l'app, dans l'ordre de la liste.
drop index public.contents_feed_idx;
create index contents_feed_idx
  on public.contents (kind, list_position, id)
  where live_version_id is not null and deleted_at is null;

/**
 * Range la liste d'une section : ids contient TOUS les contenus de cette sorte hors corbeille,
 * chacun une fois, dans l'ordre voulu (places 0, 1, 2…). Ceux de la corbeille gardent leur place.
 */
create function public.contents_reorder(kind text, ids uuid[])
returns table (id uuid, list_position integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_staff();

  if contents_reorder.kind is null
    or contents_reorder.kind not in ('article', 'episode', 'method') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Seuls les articles, les épisodes et les méthodes se rangent.';
  end if;

  -- Un rangement à la fois par sorte.
  perform pg_advisory_xact_lock(hashtext('declikora.list:' || contents_reorder.kind));
  perform 1 from public.contents c
  where c.kind = contents_reorder.kind and c.deleted_at is null
  order by c.id
  for update;

  if contents_reorder.ids is null
    or cardinality(contents_reorder.ids) <> (
      select count(*) from public.contents c
      where c.kind = contents_reorder.kind and c.deleted_at is null
    )
    or (select count(distinct x) from unnest(contents_reorder.ids) x)
      <> cardinality(contents_reorder.ids)
    or exists (
      select 1 from unnest(contents_reorder.ids) x
      where x is null or not exists (
        select 1 from public.contents c
        where c.id = x and c.kind = contents_reorder.kind and c.deleted_at is null
      )
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir tous les contenus de la section, chacun une fois.';
  end if;

  update public.contents c
  set list_position = o.n - 1
  from unnest(contents_reorder.ids) with ordinality o (id, n)
  where c.id = o.id and c.list_position <> o.n - 1;

  return query
  select c.id, c.list_position from public.contents c
  where c.kind = contents_reorder.kind and c.deleted_at is null
  order by c.list_position, c.id;
end;
$$;

revoke execute on function public.contents_reorder(text, uuid[]) from public, anon;
grant execute on function public.contents_reorder(text, uuid[]) to authenticated;

-- Le curseur d'une page de l'app : la place et l'identifiant du dernier élément donné.
drop function private.feed_cursor(timestamptz, uuid);
create function private.feed_cursor(list_position integer, content_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select feed_cursor.list_position::text || '~' || feed_cursor.content_id::text
$$;

revoke execute on function private.feed_cursor(integer, uuid) from public, anon, authenticated;

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
        'summary', v.body -> 'summary',
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
-- 2. Remplacer un fichier
-- ---------------------------------------------------------------------------------------------

/**
 * Les deux fichiers d'un remplacement, lus et vérifiés : l'ancien existe et n'est pas dans la
 * corbeille ; le nouveau aussi, est prêt, et est du même type.
 */
create function private.replacement_pair(old_id uuid, new_id uuid)
returns table (old_media public.media, new_media public.media)
language plpgsql
set search_path = ''
as $$
declare
  found_old public.media;
  found_new public.media;
begin
  if replacement_pair.old_id is null or replacement_pair.new_id is null
    or replacement_pair.old_id = replacement_pair.new_id then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Il faut un ancien et un nouveau fichier, différents.';
  end if;

  -- En partage, dans l'ordre des identifiants : ni l'un ni l'autre ne part à la corbeille ni ne
  -- change de texte pendant le geste.
  perform 1 from public.media m
  where m.id in (replacement_pair.old_id, replacement_pair.new_id)
  order by m.id
  for share;
  select * into found_old from public.media m where m.id = replacement_pair.old_id;
  select * into found_new from public.media m where m.id = replacement_pair.new_id;

  if found_old.id is null or found_old.deleted_at is not null
    or found_new.id is null or found_new.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Un des deux fichiers n''existe plus ou est dans la corbeille.';
  end if;
  if found_new.status <> 'ready' then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_pas_pret',
      detail = 'Le nouveau fichier n''est pas encore prêt : attends la fin de sa vérification.';
  end if;
  if found_new.kind <> found_old.kind then
    raise exception using
      errcode = 'P0001',
      message = 'type_different',
      detail = 'Le nouveau fichier doit être du même type que l''ancien.';
  end if;

  return query select found_old, found_new;
end;
$$;

revoke execute on function private.replacement_pair(uuid, uuid) from public, anon, authenticated;

/**
 * Met le nouveau fichier à la place de l'ancien dans les brouillons hors corbeille (blocs, image
 * de présentation, audio). Un brouillon que quelqu'un écrit en ce moment (verrou actif, soi-même
 * dans un autre onglet compris) n'est pas touché : il est rendu dans « kept », avec le nom de
 * la personne. Ce qui est en ligne ne change pas (media_replace_live).
 * Réponse : { replaced: n, kept: [{ id, title, holder }] }.
 */
create function public.media_replace(old_id uuid, new_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target record;
  holder text;
  replaced integer := 0;
  kept jsonb := '[]'::jsonb;
begin
  perform private.require_staff();
  perform private.replacement_pair(media_replace.old_id, media_replace.new_id);

  for target in
    select c.id, c.title from public.contents c
    where c.deleted_at is null and c.draft_media_ids @> array[media_replace.old_id]
    order by c.id
    for update
  loop
    select coalesce(nullif(p.full_name, ''), p.email, 'Quelqu''un') into holder
    from public.edit_locks l
    left join public.profiles p on p.id = l.holder_id
    where l.content_id = target.id
      and l.holder_id is not null
      and l.heartbeat_at >= now() - private.lock_ttl();
    if found then
      kept := kept || jsonb_build_object(
        'id', target.id, 'title', coalesce(target.title, ''), 'holder', holder
      );
      continue;
    end if;

    -- Un identifiant n'apparaît dans un brouillon que là où il désigne ce fichier.
    update public.contents c
    set draft = replace(c.draft::text, media_replace.old_id::text, media_replace.new_id::text)::jsonb,
      draft_rev = c.draft_rev + 1,
      draft_saved_at = now(),
      draft_saved_by = me
    where c.id = target.id;
    replaced := replaced + 1;
  end loop;

  return jsonb_build_object('replaced', replaced, 'kept', kept);
end;
$$;

revoke execute on function public.media_replace(uuid, uuid) from public, anon;
grant execute on function public.media_replace(uuid, uuid) to authenticated;

/**
 * Sur décision de l'équipe : dans chaque contenu en ligne qui montre l'ancien fichier, une
 * nouvelle version identique où le nouveau fichier le remplace (blocs, image de présentation,
 * audio, informations figées). Comme media_push : un chapitre ou une leçon passe par une
 * nouvelle version de sa méthode. Le brouillon n'est pas touché (media_replace).
 */
create function public.media_replace_live(old_id uuid, new_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_media public.media;
  stale_ids uuid[];
  methods uuid[];
  stale_id uuid;
  src public.versions;
  element_method uuid;
  new_body jsonb;
  new_files jsonb;
  prepared public.versions;
  created public.versions;
  pending jsonb := '{}'::jsonb;
  pending_method text;
begin
  perform private.require_staff();
  new_media := (
    select p.new_media
    from private.replacement_pair(media_replace_live.old_id, media_replace_live.new_id) p
  );

  -- Les méthodes des éléments concernés d'abord, puis les contenus (ordre des verrous commun).
  select coalesce(array_agg(distinct l.content_id), '{}') into stale_ids
  from private.live l
  join public.versions v on v.id = l.version_id
  where v.media_ids @> array[media_replace_live.old_id];
  select coalesce(array_agg(distinct l.method_id), '{}') into methods
  from private.live l
  where l.content_id = any (stale_ids) and l.method_id is not null;
  perform 1 from public.contents c where c.id = any (methods) order by c.id for update;
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication a pu passer entre-temps.
    select v.* into src
    from private.live l
    join public.versions v on v.id = l.version_id
    where l.content_id = stale_id and v.media_ids @> array[media_replace_live.old_id];
    if not found then
      continue;
    end if;

    new_body := replace(
      src.body::text, media_replace_live.old_id::text, media_replace_live.new_id::text
    )::jsonb;
    new_body := private.body_with_library_alt(new_body, new_media.id, new_media.alt);
    new_files := (src.files - media_replace_live.old_id::text)
      || private.frozen_files(array[new_media.id]);

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    prepared.media_ids := array_replace(src.media_ids, media_replace_live.old_id, new_media.id);
    prepared.cover_media_id := case
      when src.cover_media_id = media_replace_live.old_id then new_media.id
      else src.cover_media_id
    end;
    prepared.body_hash := private.version_hash(new_body, new_files, src.is_free);
    created := private.insert_version(prepared, 'files', me, src.outline);

    select l.method_id into element_method
    from private.live l
    where l.content_id = src.content_id and l.version_id = src.id;

    if element_method is null then
      update public.contents c
      set live_version_id = created.id
      where c.id = src.content_id;
    else
      pending := jsonb_set(
        pending,
        array[element_method::text],
        coalesce(pending -> element_method::text, '{}'::jsonb)
          || jsonb_build_object(src.id::text, created.id::text)
      );
    end if;

    return query select src.content_id, created.id, created.number;
  end loop;

  for pending_method in select k from jsonb_object_keys(pending) k order by k loop
    perform private.replace_in_live_outline(
      pending_method::uuid, pending -> pending_method, me, 'files'
    );
  end loop;
end;
$$;

revoke execute on function public.media_replace_live(uuid, uuid) from public, anon;
grant execute on function public.media_replace_live(uuid, uuid) to authenticated;

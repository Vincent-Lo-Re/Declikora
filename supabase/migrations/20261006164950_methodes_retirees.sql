-- Méthodes : l'ancien système retiré de la base (06/10/2026 ; docs/ADMINISTRATION.md, § 1,
-- « Méthodes, refaites en écrans »).
-- Les méthodes sont refaites en écrans (une Entrée, des chapitres, une Sortie ; des parties
-- simples ou à écrans). On repart au propre : l'admin a d'abord cessé de s'en servir, puis cette
-- migration retire tout l'ancien système de la base. La nouvelle structure viendra dans une
-- migration à part. Aucune méthode n'existait en ligne.
-- - Les méthodes, leurs chapitres, leurs leçons et leurs exercices sont supprimés, avec leurs
--   versions, leurs verrous et leurs catégories.
-- - Retirés : les sortes method, chapter, lesson et exercise ; le parent et la place d'un élément
--   (parent_id, position) ; « Montrer dans l'app » et « Leçon gratuite » (in_app, is_free, dans
--   les brouillons et dans les versions) ; le plan figé d'une version (outline, et l'origine
--   « outline ») ; la révision de toute la méthode (edit_locks.method_rev) ; app_method,
--   publish_preview, outline_reorder et toutes les fonctions internes du plan.
-- - Les gestes communs (publier, programmer, retirer, corbeille, restaurer, verrou, enregistrer,
--   revenir à une version, modèles et fichiers mis à jour dans l'app) reprennent leur forme pour
--   un contenu seul : le périmètre d'un contenu, c'est lui-même.
-- - Restent : les points de départ d'un chapitre, d'une leçon ou d'un exercice (template_for),
--   qui serviront aux méthodes refaites ; le lot de la corbeille (trash_batch).

-- ---------------------------------------------------------------------------------------------
-- 1. Les données : les méthodes et tout ce qu'elles contiennent
-- ---------------------------------------------------------------------------------------------

-- Le parent supprimé emporte ses éléments (parent_id en cascade), et chaque contenu ses versions,
-- son verrou et ses catégories (cascade). Une version ne part qu'avec son contenu
-- (private.versions_immutable).
delete from public.contents c
where c.kind in ('method', 'chapter', 'lesson', 'exercise');

-- ---------------------------------------------------------------------------------------------
-- 2. Les vues, retirées le temps de changer les colonnes
-- ---------------------------------------------------------------------------------------------

-- Une colonne ne se retire qu'en recréant la vue. Les fonctions qui lisent private.live ne
-- dépendent pas d'elle (corps non suivis) : elles retrouvent la nouvelle vue.
drop view private.live;
drop view public.trash_items;

-- ---------------------------------------------------------------------------------------------
-- 3. Ce qui ne servait qu'aux méthodes
-- ---------------------------------------------------------------------------------------------

drop trigger contents_method_rev_insert on public.contents;
drop trigger contents_method_rev_update on public.contents;
drop trigger versions_outline on public.versions;

drop function public.app_method(uuid);
drop function public.publish_preview(uuid);
drop function public.outline_reorder(uuid, jsonb, uuid);
drop function private.contents_method_rev();
drop function private.versions_check_outline();
drop function private.do_publish_method(public.contents, uuid, text);
drop function private.element_version(public.contents, uuid, text, uuid);
drop function private.try_prepare(public.contents);
drop function private.prepare_element(public.contents);
drop function private.element_label(public.contents);
drop function private.place_in_parent(uuid);
drop function private.remove_from_live_outline(uuid, uuid[], uuid);
drop function private.replace_in_live_outline(uuid, jsonb, uuid, text);
drop function private.write_method_outline(uuid, jsonb, uuid, text);
drop function private.outline_with_versions(jsonb, jsonb);
drop function private.outline_without(jsonb, uuid[]);
drop function private.outline_versions(jsonb);
drop function private.outline_shape_ok(jsonb);
drop function private.outline_exercises(jsonb);
drop function private.chapter_intro_level(uuid, jsonb);

-- ---------------------------------------------------------------------------------------------
-- 4. Les colonnes et les règles de contents, versions et edit_locks
-- ---------------------------------------------------------------------------------------------

alter table public.contents
  drop constraint contents_parent_kind,
  drop constraint contents_position_parent,
  drop constraint contents_position_unique,
  drop constraint contents_in_app_kind,
  drop constraint contents_is_free_kind,
  drop constraint contents_parent_id_fkey;

drop index public.contents_parent_idx;

alter table public.contents
  drop column parent_id,
  drop column position,
  drop column in_app,
  drop column is_free;

alter table public.contents
  drop constraint contents_kind_check,
  drop constraint contents_access_level_kind,
  drop constraint contents_access_chosen_kind,
  drop constraint contents_live_kind,
  drop constraint contents_schedule_kind,
  drop constraint contents_list_position_kind;

alter table public.contents
  add constraint contents_kind_check
    check (kind in ('article', 'episode', 'page', 'template')),
  add constraint contents_access_level_kind
    check (access_level_id is null or kind in ('article', 'episode', 'page')),
  add constraint contents_access_chosen_kind
    check (not access_chosen or kind in ('article', 'episode', 'page')),
  add constraint contents_live_kind
    check (
      kind in ('article', 'episode', 'page')
      or (live_version_id is null and first_published_at is null)
    ),
  add constraint contents_schedule_kind
    check (
      kind in ('article', 'episode', 'page')
      or (
        scheduled_at is null and scheduled_by is null and scheduled_rev is null
        and scheduled_set_at is null and schedule_error is null
      )
    ),
  add constraint contents_list_position_kind
    check ((kind in ('article', 'episode')) = (list_position is not null));

alter table public.versions
  drop column is_free,
  drop column outline;

alter table public.versions
  drop constraint versions_origin_check;
alter table public.versions
  add constraint versions_origin_check
    check (origin in ('manual', 'scheduled', 'template', 'files'));

alter table public.edit_locks
  drop column method_rev;

comment on table public.edit_locks is
  'Qui écrit quel brouillon (verrou « un seul à la fois »), suivi par Realtime. Écrite seulement '
  'par les fonctions de la base.';

-- ---------------------------------------------------------------------------------------------
-- 5. Les vues, recréées
-- ---------------------------------------------------------------------------------------------

-- Les versions en ligne et leur niveau (null = gratuit) : un contenu publié, sa version.
create view private.live as
select
  c.id as content_id,
  c.kind,
  v.id as version_id,
  v.access_level_id as level_id,
  al.rank as level_rank
from public.contents c
join public.versions v on v.id = c.live_version_id and v.content_id = c.id
left join public.access_levels al on al.id = v.access_level_id
where c.deleted_at is null
  and c.kind in ('article', 'episode', 'page');

comment on view private.live is
  'Les versions en ligne et leur niveau (null = gratuit).';

revoke all on private.live from public, anon, authenticated;

-- La corbeille, sans parent_title : un contenu n'en contient plus d'autre. Le lot (trash_batch,
-- batch_root) reste : ce qui part ensemble à la corbeille en revient ensemble.
create view public.trash_items
with (security_invoker = true)
as
select
  'file'::text as item_type,
  m.id,
  m.kind,
  m.name as title,
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
  c.trash_batch,
  c.deleted_at,
  coalesce(p.full_name, p.email),
  c.deleted_at + interval '30 days',
  null::text,
  true
from public.contents c
left join public.profiles p on p.id = c.deleted_by
where c.deleted_at is not null;

comment on view public.trash_items is
  'La corbeille : fichiers (item_type file) et contenus (item_type content). purge_at : '
  'effacement automatique au bout de 30 jours ; batch_root : l''élément mis à la corbeille (ce '
  'qui part avec lui a le même trash_batch).';

revoke all on public.trash_items from public, anon, authenticated, service_role;
grant select on public.trash_items to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 6. Les sortes : déclencheurs et petites règles
-- ---------------------------------------------------------------------------------------------

-- La sorte d'un contenu (et celle d'un modèle, et la section d'un point de départ) ne change
-- jamais. Il n'y a plus de parent à vérifier.
create or replace function private.contents_check_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.kind is distinct from old.kind
    or new.template_sort is distinct from old.template_sort
    or new.template_for is distinct from old.template_for
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_immuable',
      detail = 'La sorte d''un contenu (et celle d''un modèle, et la section d''un point de '
        'départ) ne change jamais.';
  end if;
  return new;
end;
$$;

-- Un contenu neuf arrive en tête de sa liste (une place avant la première) : Le Fil et Radio
-- Éclaircies.
create or replace function private.contents_list_position()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind in ('article', 'episode') then
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

-- Les sortes qui ont une image de présentation obligatoire ([D45]) : un article, un épisode.
-- Une page n'en a pas besoin.
create or replace function private.cover_required(content_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content_kind in ('article', 'episode')
$$;

-- Ce qu'exige une publication ([D49] titre, [D45] image de présentation, son d'un épisode).
create or replace function private.check_publish_requirements(content_kind text, body jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if coalesce(body ->> 'title', '') !~ '[^[:space:]]' then
    raise exception using
      errcode = 'P0001',
      message = 'titre_manquant',
      detail = case content_kind
        when 'episode' then 'Donne un titre à l''épisode avant de le publier.'
        when 'page' then 'Donne un titre à la page avant de la publier.'
        else 'Donne un titre à l''article avant de le publier.'
      end;
  end if;

  if private.cover_required(content_kind)
    and jsonb_typeof(body -> 'cover') is distinct from 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'image_de_presentation_manquante',
      detail = case content_kind
        when 'episode' then 'Choisis l''image de présentation de l''épisode avant de le publier.'
        else 'Choisis l''image de présentation de l''article avant de le publier.'
      end;
  end if;

  if content_kind = 'episode' and jsonb_typeof(body -> 'audio') is distinct from 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'son_manquant',
      detail = 'Choisis le son de l''épisode avant de le publier.';
  end if;
end;
$$;

-- Range la liste d'une section ([D47]) : Le Fil, Radio Éclaircies.
create or replace function public.contents_reorder(kind text, ids uuid[])
returns table (id uuid, list_position integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_staff();

  if contents_reorder.kind is null
    or contents_reorder.kind not in ('article', 'episode') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Seuls les articles et les épisodes se rangent.';
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

-- ---------------------------------------------------------------------------------------------
-- 7. Le verrou : un contenu à la fois, comme avant les méthodes
-- ---------------------------------------------------------------------------------------------

-- Qui écrit en ce moment un de ces contenus (verrou tenu et signe de vie depuis moins de 90 s),
-- en dehors de except_member (null : n'importe qui). Nom, sinon e-mail.
create or replace function private.active_writer(scope uuid[], except_member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), p.email, 'un autre membre')
  from public.edit_locks l
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = any (scope)
    and l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1
$$;

-- État du verrou d'un contenu, pour l'appelant.
create or replace function private.lock_state(target_content_id uuid, editor_session uuid)
returns table (
  mine boolean,
  holder_id uuid,
  holder_name text,
  taken_at timestamptz,
  heartbeat_at timestamptz,
  is_active boolean,
  draft_rev integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(
      l.holder_id = (select auth.uid()) and l.holder_session is not distinct from editor_session,
      false
    ),
    l.holder_id,
    case when l.holder_id is not null then coalesce(nullif(p.full_name, ''), p.email) end,
    case when l.holder_id is not null then l.taken_at end,
    l.heartbeat_at,
    coalesce(l.holder_id is not null and l.heartbeat_at >= now() - private.lock_ttl(), false),
    c.draft_rev
  from public.contents c
  left join public.edit_locks l on l.content_id = c.id
  left join public.profiles p on p.id = l.holder_id
  where c.id = target_content_id
$$;

-- Prend le verrou d'un contenu : libre, périmé, déjà à soi, ou repris (force).
create or replace function public.lock_take(
  content_id uuid,
  force boolean default false,
  editor_session uuid default null
)
returns table (
  mine boolean,
  holder_id uuid,
  holder_name text,
  taken_at timestamptz,
  heartbeat_at timestamptz,
  is_active boolean,
  draft_rev integer
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target public.contents;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = lock_take.content_id for share;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;
  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  insert into public.edit_locks as l (
    content_id, holder_id, holder_session, taken_at, heartbeat_at, draft_rev
  )
  values (target.id, me, lock_take.editor_session, now(), now(), target.draft_rev)
  on conflict on constraint edit_locks_pkey do update
  set holder_id = excluded.holder_id,
    holder_session = excluded.holder_session,
    taken_at = case
      when l.holder_id = excluded.holder_id
        and l.holder_session is not distinct from excluded.holder_session
      then l.taken_at
      else excluded.taken_at
    end,
    heartbeat_at = excluded.heartbeat_at,
    draft_rev = excluded.draft_rev
  where l.holder_id is null
    or l.holder_id = excluded.holder_id
    or l.heartbeat_at < now() - private.lock_ttl()
    or coalesce(lock_take.force, false);

  return query select * from private.lock_state(target.id, lock_take.editor_session);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 8. Créer, enregistrer, revenir à une version
-- ---------------------------------------------------------------------------------------------

-- Nouvelle signature (sans parent_id) : l'ancienne est retirée, pour que PostgREST n'ait qu'une
-- fonction à choisir.
drop function public.content_create(text, uuid, text, text, uuid, text);

-- Crée un contenu et en donne aussitôt le verrou à l'appelant (qui ouvre l'éditeur).
--   kind : article, episode, page ou template ;
--   title : le titre de départ (texte nettoyé, 200 caractères au plus) ;
--   template_sort : la sorte d'un modèle (style, shared, starter), obligatoire pour un modèle et
--     interdite sinon ; elle ne change plus ensuite ;
--   from_template_id : un point de départ (starter) hors corbeille DE CETTE SORTE de contenu
--     (template_for = kind), dont les blocs sont recopiés avec de nouveaux identifiants (§ 2.5).
--     Pas pour un modèle ;
--   template_for : la section d'un point de départ ([D42]) : article, episode, page, ou chapter,
--     lesson, exercise (pour les méthodes refaites).
create function public.content_create(
  kind text,
  title text default '',
  template_sort text default null,
  from_template_id uuid default null,
  template_for text default null
)
returns public.contents
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  clean_title text := normalize(btrim(coalesce(content_create.title, '')), NFC);
  starter public.contents;
  new_draft jsonb;
  created public.contents;
begin
  perform private.require_staff();

  if content_create.kind is null
    or content_create.kind not in ('article', 'episode', 'page', 'template') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Cette sorte de contenu n''existe pas.';
  end if;

  if (content_create.kind = 'template') <> (content_create.template_sort is not null)
    or coalesce(content_create.template_sort, 'style') not in ('style', 'shared', 'starter') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un modèle a une sorte (style, shared ou starter) ; les autres contenus n''en ont pas.';
  end if;

  if (content_create.template_sort is not distinct from 'starter')
      <> (content_create.template_for is not null)
    or coalesce(content_create.template_for, 'page') not in (
      'article', 'episode', 'chapter', 'lesson', 'exercise', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode, chapter, lesson, '
        'exercise ou page) ; les autres contenus et modèles n''en ont pas.';
  end if;

  if char_length(clean_title) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le titre fait 200 caractères au plus.';
  end if;

  new_draft := private.empty_draft(clean_title);

  if content_create.from_template_id is not null then
    select * into starter
    from public.contents t
    where t.id = content_create.from_template_id
    for share;

    if content_create.kind = 'template'
      or not found
      or starter.kind <> 'template'
      or starter.template_sort <> 'starter'
      or starter.deleted_at is not null
      or starter.template_for is distinct from content_create.kind then
      raise exception using
        errcode = 'P0001',
        message = 'modele_indisponible',
        detail = 'Ce point de départ n''existe pas, n''est pas un modèle « point de départ » de '
          'cette section, ou est dans la corbeille.';
    end if;

    new_draft := jsonb_set(
      new_draft, '{blocks}', private.blocks_with_new_ids(starter.draft -> 'blocks')
    );
  end if;

  insert into public.contents (
    kind, draft, template_sort, template_for, created_by, draft_saved_by
  )
  values (
    content_create.kind,
    new_draft,
    content_create.template_sort,
    content_create.template_for,
    me,
    me
  )
  returning * into created;

  insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
  values (created.id, me, now(), now(), created.draft_rev);

  return created;
end;
$$;

-- Enregistre le brouillon sous le verrou du contenu, avec les réglages changés (adresse, niveau
-- d'accès, catégories).
create or replace function public.save_draft(
  content_id uuid,
  base_rev integer,
  draft jsonb,
  settings jsonb default null,
  editor_session uuid default null
)
returns table (draft_rev integer, draft_saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  saved_at timestamptz := now();
  s jsonb := coalesce(save_draft.settings, '{}'::jsonb);
  target public.contents;
  new_rev integer;
  new_slug text;
  new_level uuid;
  wanted_categories uuid[];
  failed_constraint text;
begin
  perform private.require_staff();

  if save_draft.content_id is null or save_draft.base_rev is null
    or save_draft.draft is null or jsonb_typeof(s) <> 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id, base_rev et draft sont obligatoires ; settings est un objet.';
  end if;

  -- Verrou de ligne : les enregistrements d'un même contenu passent un par un.
  select * into target from public.contents c where c.id = save_draft.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  -- Tenir le verrou, c'est en être le détenteur, depuis la même ouverture de l'éditeur. Un
  -- verrou périmé mais que personne n'a repris reste le sien : l'enregistrement le rafraîchit.
  if not exists (
    select 1 from public.edit_locks l
    where l.content_id = target.id and l.holder_id = me
      and l.holder_session is not distinct from save_draft.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Quelqu''un d''autre a pris la main sur ce brouillon.';
  end if;

  if target.draft_rev <> save_draft.base_rev then
    -- Réponse perdue (réseau coupé après l'enregistrement) : le même envoi a déjà donné la
    -- révision suivante. On renvoie ce qui est en base au lieu d'un faux conflit.
    if target.draft_rev = save_draft.base_rev + 1
      and target.draft_saved_by is not distinct from me
      and target.draft = save_draft.draft
      and private.settings_already_applied(target, s) then
      return query select target.draft_rev, target.draft_saved_at;
      return;
    end if;
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'Le brouillon a changé depuis ta dernière lecture (révision %s, et non %s).',
        target.draft_rev, save_draft.base_rev
      );
  end if;

  -- Réglages : clés connues et types attendus.
  if exists (
    select 1 from jsonb_object_keys(s) k
    where k not in ('slug', 'access_level_id', 'category_ids')
  )
    or (s ? 'slug' and jsonb_typeof(s -> 'slug') not in ('string', 'null'))
    or (s ? 'access_level_id' and (
      jsonb_typeof(s -> 'access_level_id') not in ('string', 'null')
      or coalesce(s ->> 'access_level_id', '00000000-0000-0000-0000-000000000000')
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ))
    or (s ? 'category_ids' and (
      jsonb_typeof(s -> 'category_ids') <> 'array'
      or exists (
        select 1 from jsonb_array_elements(s -> 'category_ids') x
        where jsonb_typeof(x) <> 'string'
          or (x #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    )) then
    raise exception using
      errcode = 'P0001',
      message = 'reglages_invalides',
      detail = 'Réglages attendus : slug (texte ou null), access_level_id (identifiant ou '
        'null), category_ids (liste d''identifiants).';
  end if;

  -- Niveau d'accès : Gratuit (null) ou une formule qui existe.
  if s ? 'access_level_id' then
    new_level := (s ->> 'access_level_id')::uuid;
    if new_level is not null
      and not exists (select 1 from public.access_levels a where a.id = new_level) then
      raise exception using
        errcode = 'P0001',
        message = 'niveau_invalide',
        detail = 'Cette formule n''existe plus.';
    end if;
  end if;

  if s ? 'slug' then
    new_slug := s ->> 'slug';
    if new_slug is not null and (
      char_length(new_slug) > 100 or new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_invalide',
        detail = 'L''adresse ne contient que des lettres minuscules sans accent, des chiffres et '
          'des tirets (100 caractères au plus).';
    end if;
    if new_slug is not null and exists (
      select 1 from public.contents c
      where c.kind = 'page' and c.slug = new_slug and c.deleted_at is null and c.id <> target.id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page a déjà cette adresse.';
    end if;
  end if;

  if s ? 'category_ids' then
    select coalesce(array_agg(distinct (x #>> '{}')::uuid), '{}')
    into wanted_categories
    from jsonb_array_elements(s -> 'category_ids') x;

    if exists (
      select 1 from unnest(wanted_categories) w (id)
      where not exists (select 1 from public.categories c where c.id = w.id)
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'categorie_invalide',
        detail = 'Une des catégories n''existe plus.';
    end if;
  end if;

  begin
    update public.contents c
    set draft = save_draft.draft,
      draft_rev = c.draft_rev + 1,
      draft_saved_at = saved_at,
      draft_saved_by = me,
      slug = case when s ? 'slug' then new_slug else c.slug end,
      access_level_id = case when s ? 'access_level_id' then new_level else c.access_level_id end,
      access_chosen = case when s ? 'access_level_id' then true else c.access_chosen end
    where c.id = target.id
    returning c.draft_rev into new_rev;
  exception
    -- Un réglage qui ne va pas avec la sorte (niveau d'accès sur un modèle…).
    when check_violation then
      get stacked diagnostics failed_constraint = constraint_name;
      if failed_constraint = 'contents_draft_size' then
        raise exception using
          errcode = 'P0001',
          message = 'brouillon_trop_lourd',
          detail = 'Le brouillon dépasse 256 Ko.';
      end if;
      raise exception using
        errcode = 'P0001',
        message = 'reglages_invalides',
        detail = 'Ce réglage ne s''applique pas à cette sorte de contenu.';
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page a déjà cette adresse.';
    -- La formule a été supprimée entre la vérification et l'enregistrement.
    when foreign_key_violation then
      raise exception using
        errcode = 'P0001',
        message = 'niveau_invalide',
        detail = 'Cette formule n''existe plus.';
  end;

  if s ? 'category_ids' then
    delete from public.content_categories cc
    where cc.content_id = target.id and cc.category_id <> all (wanted_categories);
    insert into public.content_categories (content_id, category_id)
    select target.id, w.id from unnest(wanted_categories) w (id)
    on conflict do nothing;
  end if;

  update public.edit_locks l
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at;
end;
$$;

-- Réglages déjà en base, tels que les demande cet envoi de save_draft ? Sert à reconnaître le
-- rejeu d'un envoi dont la réponse s'est perdue.
create or replace function private.settings_already_applied(target public.contents, s jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if s is null or s = '{}'::jsonb then
    return true;
  end if;
  if jsonb_typeof(s) <> 'object' or exists (
    select 1 from jsonb_object_keys(s) k
    where k not in ('slug', 'access_level_id', 'category_ids')
  ) then
    return false;
  end if;

  if s ? 'slug' and (
    jsonb_typeof(s -> 'slug') not in ('string', 'null') or target.slug is distinct from s ->> 'slug'
  ) then
    return false;
  end if;
  if s ? 'access_level_id' and (
    not target.access_chosen
    or jsonb_typeof(s -> 'access_level_id') not in ('string', 'null')
    or target.access_level_id::text is distinct from s ->> 'access_level_id'
  ) then
    return false;
  end if;
  if s ? 'category_ids' and (
    jsonb_typeof(s -> 'category_ids') <> 'array'
    or array(
      select distinct x #>> '{}' from jsonb_array_elements(s -> 'category_ids') x order by 1
    ) <> array(
      select cc.category_id::text from public.content_categories cc
      where cc.content_id = target.id
      order by 1
    )
  ) then
    return false;
  end if;
  return true;
exception
  when others then
    return false;
end;
$$;

-- « Revenir à cette version » : recopie une version dans le brouillon, sous le verrou du
-- contenu.
create or replace function public.revert_to_version(version_id uuid, editor_session uuid default null)
returns table (draft_rev integer, draft_saved_at timestamptz, warnings text[])
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  saved_at timestamptz := now();
  src public.versions;
  target public.contents;
  new_draft jsonb;
  kept_body jsonb;
  restore_slug boolean;
  notes text[] := '{}';
  new_rev integer;
begin
  perform private.require_staff();

  select * into src from public.versions v where v.id = revert_to_version.version_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'version_introuvable',
      detail = 'Cette version n''existe plus.';
  end if;

  select * into target from public.contents c where c.id = src.content_id for update;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
  end if;

  if not exists (
    select 1 from public.edit_locks l
    where l.content_id = target.id and l.holder_id = me
      and l.holder_session is not distinct from revert_to_version.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Prends la main sur ce brouillon pour revenir à une version.';
  end if;

  new_draft := private.body_to_draft(src.body);

  -- Fichiers retirés : on compare les fichiers du brouillon à ceux de la version, sans les copies
  -- de modèle redevenues des blocs liés (un bloc lié ne cite aucun fichier : ceux de son modèle
  -- ne sont pas « retirés »).
  kept_body := jsonb_set(
    src.body,
    '{blocks}',
    coalesce(
      (
        select jsonb_agg(b order by n)
        from jsonb_array_elements(coalesce(src.body -> 'blocks', '[]'::jsonb)) with ordinality list (b, n)
        where not exists (
          select 1 from jsonb_array_elements(new_draft -> 'blocks') d
          where d ->> 'type' = 'linked' and d ->> 'id' = b ->> 'id'
        )
      ),
      '[]'::jsonb
    )
  );
  if cardinality(private.media_ids_of(new_draft)) < cardinality(private.media_ids_of(kept_body)) then
    notes := notes || 'fichier_retire'::text;
  end if;
  if (select count(*) from jsonb_path_query(src.body, 'strict $.blocks[*] ? (exists (@.templateId))'))
    > (select count(*) from jsonb_path_query(new_draft, 'strict $.blocks[*] ? (@.type == "linked")')) then
    notes := notes || 'modele_detache'::text;
  end if;

  restore_slug := target.kind = 'page' and (
    src.slug is null or not exists (
      select 1 from public.contents c
      where c.kind = 'page' and c.slug = src.slug and c.deleted_at is null and c.id <> target.id
    )
  );
  if target.kind = 'page' and not restore_slug then
    notes := notes || 'adresse_prise'::text;
  end if;

  update public.contents c
  set draft = new_draft,
    draft_rev = c.draft_rev + 1,
    draft_saved_at = saved_at,
    draft_saved_by = me,
    access_level_id = case
      when c.kind in ('article', 'episode', 'page') then src.access_level_id
      else c.access_level_id
    end,
    access_chosen = case
      when c.kind in ('article', 'episode', 'page') then true
      else c.access_chosen
    end,
    slug = case when restore_slug then src.slug else c.slug end
  where c.id = target.id
  returning c.draft_rev into new_rev;

  if target.kind in ('article', 'episode') then
    delete from public.content_categories cc where cc.content_id = target.id;
    insert into public.content_categories (content_id, category_id)
    select target.id, cat.id
    from public.categories cat
    where cat.id = any (src.category_ids);
  end if;

  update public.edit_locks l
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at, notes;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 9. Publier : une version par contenu, sans plan
-- ---------------------------------------------------------------------------------------------

-- version_hash et insert_version perdent is_free et le plan : leur signature change.
drop function private.version_hash(jsonb, jsonb, boolean);
drop function private.insert_version(public.versions, text, uuid, jsonb);

-- Empreinte d'une version (§ 1.7) : corps résolu et fichiers figés.
create function private.version_hash(body jsonb, files jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_array(body, files)::text, 'UTF8')), 'hex')
$$;

-- Écrit une version préparée (numéro suivant du contenu ; auteur et son nom recopié).
create function private.insert_version(
  prepared public.versions,
  version_origin text,
  author_id uuid
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  created public.versions;
begin
  insert into public.versions (
    content_id, number, origin, body, body_hash, files, access_level_id, slug,
    category_ids, media_ids, cover_media_id, template_ids, block_types, draft_rev,
    published_by, published_by_name
  )
  values (
    prepared.content_id,
    coalesce((select max(v.number) from public.versions v where v.content_id = prepared.content_id), 0) + 1,
    version_origin,
    prepared.body,
    prepared.body_hash,
    prepared.files,
    prepared.access_level_id,
    prepared.slug,
    prepared.category_ids,
    prepared.media_ids,
    prepared.cover_media_id,
    prepared.template_ids,
    prepared.block_types,
    prepared.draft_rev,
    author_id,
    (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = author_id)
  )
  returning * into created;
  return created;
end;
$$;

-- La version que donnerait ce brouillon (pas encore écrite : ni id, ni numéro, ni origine, ni
-- auteur). resolved : le brouillon dont les blocs liés sont déjà résolus (private.resolve_linked).
-- Les contrôles de l'étape 5 et de la partie 7a, dans le même ordre :
--   - image de présentation (article, épisode : [D45]) et son d'un épisode ;
--   - aucune image sans fichier ;
--   - fichiers verrouillés en partage (for share, comme le déclencheur du brouillon), puis prêts,
--     hors corbeille et de la bonne sorte ;
--   - textes alternatifs résolus, variante « published » du schéma, fichiers figés, empreinte.
create or replace function private.prepare_version(target public.contents, resolved jsonb)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  body jsonb := resolved;
  problem text;
  cited uuid[];
  frozen jsonb;
  shape_ok boolean;
  shape_errors text[];
  prepared public.versions;
begin
  -- Image de présentation (article, épisode : [D45]) et son d'un épisode.
  perform private.check_publish_requirements(target.kind, body);

  select string_agg(format('bloc n° %s', pos), ', ' order by pos)
  into problem
  from (
    select distinct top_n as pos
    from jsonb_array_elements(body -> 'blocks') with ordinality top_list (top_block, top_n)
    left join lateral jsonb_array_elements(
      case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
    ) inner_block on true
    where (top_block ->> 'type' = 'image' and jsonb_typeof(top_block -> 'mediaId') = 'null')
      or (inner_block ->> 'type' = 'image' and jsonb_typeof(inner_block -> 'mediaId') = 'null')
  ) missing;

  if problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'image_sans_fichier',
      detail = 'Une image n''a pas de fichier : ' || problem || '.';
  end if;

  cited := private.media_ids_of(body);

  if cardinality(cited) > 0 then
    perform 1 from public.media m where m.id = any (cited) order by m.id for share;

    select string_agg(
      case
        when m.id is null then 'un fichier qui n''existe plus'
        when m.deleted_at is not null then '« ' || m.name || ' » (dans la corbeille)'
        else '« ' || m.name || ' » (pas encore prêt)'
      end,
      ', ' order by m.name
    )
    into problem
    from unnest(cited) wanted (id)
    left join public.media m on m.id = wanted.id
    where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = left('Ce contenu cite un fichier indisponible : ' || problem || '.', 1000);
    end if;
  end if;

  -- Image de présentation et images des blocs : des images ; son d'un épisode : un audio.
  select string_agg(distinct '« ' || m.name || ' »', ', ')
  into problem
  from (
    select (body #>> '{cover,mediaId}')::uuid as id, 'image' as wanted_kind
    where jsonb_typeof(body -> 'cover') = 'object'
    union all
    select (body #>> '{audio,mediaId}')::uuid, 'audio'
    where jsonb_typeof(body -> 'audio') = 'object'
    union all
    select (top_block ->> 'mediaId')::uuid, 'image'
    from jsonb_array_elements(body -> 'blocks') top_block
    where top_block ->> 'type' = 'image'
    union all
    select (inner_block ->> 'mediaId')::uuid, 'image'
    from jsonb_array_elements(body -> 'blocks') top_block
    cross join lateral jsonb_array_elements(
      case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
    ) inner_block
    where inner_block ->> 'type' = 'image'
  ) uses
  join public.media m on m.id = uses.id
  where m.kind <> uses.wanted_kind;

  if problem is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_inadapte',
      detail = left('Ce fichier n''est pas du bon type à cet endroit : ' || problem || '.', 1000);
  end if;

  body := jsonb_set(body, '{blocks}', private.resolve_alts(body -> 'blocks'));

  begin
    shape_ok := extensions.jsonb_matches_schema(private.blocks_schema('published'), body);
    if not shape_ok then
      shape_errors := extensions.jsonschema_validation_errors(
        private.blocks_schema('published'), body::json
      );
    end if;
  exception
    when internal_error then
      raise exception using
        errcode = 'P0001',
        message = 'brouillon_trop_imbrique',
        detail = 'Le brouillon a trop de niveaux imbriqués (listes dans des listes).';
  end;
  if not shape_ok then
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = left(
        'La version n''a pas la forme attendue : '
          || coalesce(
            (
              select string_agg(left(e, 200), ' | ' order by n)
              from unnest(shape_errors) with ordinality errs (e, n)
              where n <= 3
            ),
            'forme inconnue'
          ),
        1000
      );
  end if;

  frozen := private.frozen_files(cited);

  prepared.content_id := target.id;
  prepared.body := body;
  prepared.files := frozen;
  prepared.body_hash := private.version_hash(body, frozen);
  prepared.access_level_id := target.access_level_id;
  prepared.slug := target.slug;
  prepared.category_ids := array(
    select cc.category_id from public.content_categories cc
    where cc.content_id = target.id
    order by cc.category_id
  );
  prepared.media_ids := cited;
  prepared.cover_media_id := case
    when jsonb_typeof(body -> 'cover') = 'object' then (body #>> '{cover,mediaId}')::uuid
  end;
  prepared.template_ids := private.template_ids_of(body);
  prepared.block_types := private.block_types_of(body);
  prepared.draft_rev := target.draft_rev;
  return prepared;
end;
$$;

-- Publication (§ 3.4). Sans garde is_staff() : appelée par publish (auth.uid()) et par la tâche
-- « publications » (auteur de la programmation), sous pg_cron où is_staff() est toujours faux.
--   0. contenu verrouillé (for update) ; article, épisode ou page hors corbeille ; niveau d'accès
--      choisi ([D41]) ;
--   1. « manual » seulement : refus si un AUTRE membre écrit le contenu ([D14]) ; la tâche
--      planifiée a déjà tranché ([D31]) ;
--   2. expected_rev (s'il est donné) = draft_rev ;
--   3. blocs liés résolus ; pour une page, une adresse qui n'est pas celle d'une autre page en
--      ligne ; puis private.prepare_version (image de présentation [D45], son, images, fichiers,
--      textes alternatifs, forme, fichiers figés, empreinte) ;
--   4. version écrite ; live_version_id, first_published_at (première fois seulement, [D27]) ;
--      programmation effacée.
-- Renvoie la version écrite.
create or replace function private.do_publish(
  target_content_id uuid,
  author_id uuid,
  publish_origin text,
  expected_rev integer default null
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target public.contents;
  writer text;
  body jsonb;
  prepared public.versions;
  created public.versions;
begin
  select * into target from public.contents c where c.id = target_content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le publier.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se publient.';
  end if;

  if not target.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de publier.';
  end if;

  if publish_origin = 'manual' then
    writer := private.active_writer(array[target.id], author_id);
    if writer is not null then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_tenu',
        detail = writer || ' écrit ce brouillon : reprends la main ou attends qu''il ait fini.',
        hint = writer;
    end if;
  end if;

  if expected_rev is not null and target.draft_rev <> expected_rev then
    raise exception using
      errcode = 'P0001',
      message = 'conflit_revision',
      detail = format(
        'Le brouillon vient de changer (révision %s, et non %s) : relis-le avant de publier.',
        target.draft_rev, expected_rev
      );
  end if;

  body := private.resolve_linked(target.draft);

  if target.kind = 'page' then
    if target.slug is null then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_manquante',
        detail = 'Choisis l''adresse de la page avant de la publier.';
    end if;
    -- Deux pages publiées en même temps avec la même adresse : l'une attend l'autre.
    perform pg_advisory_xact_lock(hashtext('declikora.page_slug:' || target.slug));
    if exists (
      select 1
      from private.live l
      join public.versions v on v.id = l.version_id
      where l.kind = 'page' and v.slug = target.slug and l.content_id <> target.id
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'adresse_prise',
        detail = 'Une autre page en ligne a déjà cette adresse.';
    end if;
  end if;

  prepared := private.prepare_version(target, body);
  created := private.insert_version(prepared, publish_origin, author_id);

  update public.contents c
  set live_version_id = created.id,
    first_published_at = coalesce(c.first_published_at, created.published_at),
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    scheduled_set_at = null,
    schedule_error = null
  where c.id = target.id;

  return created;
end;
$$;

-- Programme la publication d'un article, d'un épisode ou d'une page ([D16], [D31]).
create or replace function public.schedule(content_id uuid, at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contents;
begin
  perform private.require_staff();

  if schedule.content_id is null or schedule.at is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id et at sont obligatoires.';
  end if;

  select * into target from public.contents c where c.id = schedule.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour le programmer.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se programment.';
  end if;

  if not target.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de programmer.';
  end if;

  -- Ce que la publication exigera de toute façon : le refuser dès maintenant ([D45], son).
  perform private.check_publish_requirements(target.kind, target.draft);

  if schedule.at <= now() then
    raise exception using
      errcode = 'P0001',
      message = 'date_passee',
      detail = 'Choisis une date et une heure à venir.';
  end if;

  update public.contents c
  set scheduled_at = schedule.at,
    scheduled_by = (select auth.uid()),
    scheduled_rev = c.draft_rev,
    scheduled_set_at = now(),
    schedule_error = null
  where c.id = target.id;

  return schedule.at;
end;
$$;

-- Retire un contenu de l'app (sans le supprimer) : sa version en ligne et sa programmation
-- s'effacent.
create or replace function public.unpublish(content_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contents;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = unpublish.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes et les pages se retirent de l''app.';
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : il n''est déjà plus dans l''app.';
  end if;

  if target.live_version_id is not null or target.scheduled_at is not null
    or target.schedule_error is not null then
    update public.contents c
    set live_version_id = null,
      scheduled_at = null,
      scheduled_by = null,
      scheduled_rev = null,
      scheduled_set_at = null,
      schedule_error = null
    where c.id = target.id;
  end if;

  return exists (select 1 from private.files_to_move());
end;
$$;

-- Met un contenu à la corbeille (son propre lot) : il quitte l'app, sa programmation est
-- annulée, et son verrou est rendu.
create or replace function public.trash(content_id uuid)
returns table (trash_batch uuid, trashed integer, needs_file_sync boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target public.contents;
  writer text;
  uses text;
  batch uuid := gen_random_uuid();
  affected integer;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = trash.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is not null then
    return query select target.trash_batch, 0, false;
    return;
  end if;

  writer := private.active_writer(array[target.id], me);
  if writer is not null then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_tenu',
      detail = writer || ' écrit ce brouillon : attends qu''il ait fini, ou reprends la main.',
      hint = writer;
  end if;

  if target.kind = 'template' and target.template_sort = 'shared' then
    select string_agg(coalesce(nullif(c.title, ''), 'Sans titre'), ', ' order by c.title, c.id)
    into uses
    from public.contents c
    where c.draft_template_ids @> array[target.id]
      and c.id <> target.id;

    if uses is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_utilise',
        detail = left('Ce modèle est utilisé dans : ' || uses || '.', 1000);
    end if;
  end if;

  update public.contents c
  set live_version_id = null,
    scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    scheduled_set_at = null,
    schedule_error = null,
    deleted_at = now(),
    deleted_by = me,
    trash_batch = batch
  where c.id = target.id
    and c.deleted_at is null;
  get diagnostics affected = row_count;

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = target.id
    and l.holder_id is not null;

  return query select batch, affected, exists (select 1 from private.files_to_move());
end;
$$;

-- Restaure un contenu (et son lot) en brouillon. Une page dont l'adresse a été reprise entre-temps
-- revient sans adresse (avertissement adresse_retiree).
create or replace function public.restore(content_id uuid)
returns table (restored integer, warnings text[])
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  target public.contents;
  root public.contents;
  root_slug text;
  roots integer := 0;
  notes text[] := '{}';
  affected integer;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = restore.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.deleted_at is null then
    return query select 0, notes;
    return;
  end if;

  perform 1 from public.contents c
  where c.trash_batch = target.trash_batch
  order by c.id
  for update;

  -- Chaque élément du lot sort de la corbeille dans la même commande que son changement
  -- d'adresse : le garde de corbeille refuse toute autre modification d'un contenu qui y reste.
  for root in
    select c.*
    from public.contents c
    where c.trash_batch = target.trash_batch
    order by c.id
  loop
    root_slug := root.slug;

    if root.kind = 'page' and root.slug is not null then
      -- Deux restaurations en même temps avec la même adresse : l'une attend l'autre.
      perform pg_advisory_xact_lock(hashtext('declikora.page_slug:' || root.slug));
      if exists (
        select 1 from public.contents c
        where c.kind = 'page' and c.slug = root.slug and c.deleted_at is null and c.id <> root.id
      ) then
        root_slug := null;
        notes := notes || 'adresse_retiree'::text;
      end if;
    end if;

    update public.contents c
    set deleted_at = null,
      deleted_by = null,
      trash_batch = null,
      slug = root_slug
    where c.id = root.id;
    roots := roots + 1;
  end loop;

  update public.contents c
  set deleted_at = null, deleted_by = null, trash_batch = null
  where c.trash_batch = target.trash_batch;
  get diagnostics affected = row_count;

  return query select affected + roots, notes;
end;
$$;

-- La tâche « publications » (chaque minute) : publie les programmations dues. Si quelqu'un
-- écrit le contenu et l'a modifié depuis la programmation, elle attend qu'il ait quitté
-- l'éditeur, une heure au plus ([D31]).
create or replace function private.run_due_publications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due record;
  published integer := 0;
  failure text;
  writing boolean;
begin
  for due in
    select c.id, c.scheduled_at, c.scheduled_by, c.scheduled_rev, c.scheduled_set_at
    from public.contents c
    where c.scheduled_at <= now() and c.deleted_at is null
    order by c.scheduled_at, c.id
    for update skip locked
  loop
    failure := null;
    begin
      if due.scheduled_by is null
        or not exists (select 1 from public.profiles p where p.id = due.scheduled_by) then
        failure := 'auteur_parti';
      else
        select exists (
          select 1
          from public.edit_locks l
          join public.contents x on x.id = l.content_id
          where l.content_id = due.id
            and l.holder_id is not null
            and l.heartbeat_at >= now() - private.lock_ttl()
            and x.draft_rev <> due.scheduled_rev
        ) into writing;

        if writing then
          if due.scheduled_at < now() - interval '1 hour' then
            failure := 'brouillon_en_cours_d_ecriture';
          end if;
        else
          perform private.do_publish(due.id, due.scheduled_by, 'scheduled');
          published := published + 1;
        end if;
      end if;
    exception
      when others then
        failure := case when sqlstate = 'P0001' then sqlerrm else 'erreur_inattendue' end;
    end;

    if failure is not null then
      update public.contents c
      set scheduled_at = null,
        scheduled_rev = null,
        scheduled_set_at = null,
        schedule_error = left(failure, 100)
      where c.id = due.id;
    end if;
  end loop;

  if published > 0 then
    perform private.kick_files();
  end if;
  return published;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 10. Mettre à jour dans l'app : un contenu, sa nouvelle version
-- ---------------------------------------------------------------------------------------------

-- « Mettre à jour ces N contenus dans l'app » pour les textes d'un fichier ([D30] option B) :
-- pour chaque contenu de media_outdated, une nouvelle version ÉGALE à la version en ligne, dont
-- seuls les textes de ce fichier sont remplacés par ceux de la médiathèque, mise en ligne
-- (origin = 'files', auteur = le membre qui clique). Le brouillon n'est jamais publié par ce
-- geste. Rejouable (0 ligne). Renvoie les contenus mis à jour et leur nouvelle version.
create or replace function public.media_push(media_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target public.media;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  new_body jsonb;
  new_files jsonb;
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();

  -- En partage : le texte ne change pas pendant le geste (un renommage attend la fin).
  select * into target from public.media m where m.id = media_push.media_id for share;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe pas.';
  end if;

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.media_stale_live(target.id) s;
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication a pu passer entre-temps.
    select v.* into src
    from private.media_stale_live(target.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale_id;
    if not found then
      continue;
    end if;

    new_body := private.body_with_library_alt(src.body, target.id, target.alt);
    new_files := jsonb_set(
      src.files,
      array[target.id::text],
      (src.files -> target.id::text)
        || jsonb_build_object('alt', target.alt, 'transcript', target.transcript)
    );

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    prepared.body_hash := private.version_hash(new_body, new_files);
    created := private.insert_version(prepared, 'files', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$$;

-- « Remplacer… » ([D48]) dans ce qui est en ligne : chaque contenu en ligne qui cite l'ancien
-- fichier reçoit une nouvelle version, égale à celle en ligne avec le nouveau fichier
-- (origin = 'files').
create or replace function public.media_replace_live(old_id uuid, new_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  new_media public.media;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  new_body jsonb;
  new_files jsonb;
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();
  new_media := (
    select p.new_media
    from private.replacement_pair(media_replace_live.old_id, media_replace_live.new_id) p
  );

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct l.content_id), '{}') into stale_ids
  from private.live l
  join public.versions v on v.id = l.version_id
  where v.media_ids @> array[media_replace_live.old_id];
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
    prepared.body_hash := private.version_hash(new_body, new_files);
    created := private.insert_version(prepared, 'files', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$$;

-- « Mettre à jour ces N contenus dans l'app » pour un bloc partagé ([D11]) : chaque contenu en
-- ligne qui le cite reçoit une nouvelle version, égale à celle en ligne avec le bloc tel qu'il est
-- aujourd'hui (origin = 'template').
create or replace function public.template_push(template_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  tpl public.contents;
  tpl_block jsonb;
  stale_ids uuid[];
  stale_id uuid;
  src public.versions;
  linked_ids text[];
  new_body jsonb;
  cited uuid[];
  added uuid[];
  new_files jsonb;
  problem text;
  shape_ok boolean;
  shape_errors text[];
  prepared public.versions;
  created public.versions;
begin
  perform private.require_staff();

  -- En partage : le modèle ne change pas pendant le geste (son enregistrement attend la fin).
  select * into tpl from public.contents t where t.id = template_push.template_id for share;
  if not found or tpl.kind <> 'template' or tpl.template_sort <> 'shared' then
    raise exception using
      errcode = 'P0001',
      message = 'modele_introuvable',
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc partagé.';
  end if;
  tpl_block := tpl.draft -> 'blocks' -> 0;

  -- Les contenus concernés, verrouillés dans un ordre fixe.
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.template_stale_live(tpl.id) s;
  perform 1 from public.contents c where c.id = any (stale_ids) order by c.id for update;

  foreach stale_id in array array(select x from unnest(stale_ids) x order by x) loop
    -- Relu sous le verrou : une publication, un retrait ou un détachement a pu passer.
    select v.* into src
    from private.template_stale_live(tpl.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale_id;
    if not found then
      continue;
    end if;

    select coalesce(array_agg(d ->> 'id'), '{}') into linked_ids
    from public.contents c
    cross join lateral jsonb_array_elements(c.draft -> 'blocks') d
    where c.id = stale_id
      and d ->> 'type' = 'linked'
      and d ->> 'templateId' = tpl.id::text;

    new_body := jsonb_set(
      src.body,
      '{blocks}',
      private.resolve_alts_frozen(
        (
          select coalesce(
            jsonb_agg(
              case
                when b ->> 'templateId' = tpl.id::text and (b ->> 'id') = any (linked_ids)
                  then private.template_copy(tpl_block, b ->> 'id', tpl.id)
                else b
              end
              order by n
            ),
            '[]'::jsonb
          )
          from jsonb_array_elements(src.body -> 'blocks') with ordinality list (b, n)
        ),
        src.files
      )
    );

    -- Une image sans fichier (seule une nouvelle copie peut en avoir).
    select string_agg(format('bloc n° %s', pos), ', ' order by pos)
    into problem
    from (
      select distinct top_n as pos
      from jsonb_array_elements(new_body -> 'blocks') with ordinality top_list (top_block, top_n)
      left join lateral jsonb_array_elements(
        case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
      ) inner_block on true
      where (top_block ->> 'type' = 'image' and jsonb_typeof(top_block -> 'mediaId') = 'null')
        or (inner_block ->> 'type' = 'image' and jsonb_typeof(inner_block -> 'mediaId') = 'null')
    ) missing;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'image_sans_fichier',
        detail = 'Le modèle a une image sans fichier : choisis-en un dans le modèle, puis '
          'réessaie.';
    end if;

    cited := private.media_ids_of(new_body);
    added := array(select x from unnest(cited) x where not (x = any (src.media_ids)));

    if cardinality(added) > 0 then
      -- Comme la publication : verrou partagé, puis disponibilité et sorte (des images).
      perform 1 from public.media m where m.id = any (added) order by m.id for share;

      select string_agg(
        case
          when m.id is null then 'un fichier qui n''existe plus'
          when m.deleted_at is not null then '« ' || m.name || ' » (dans la corbeille)'
          else '« ' || m.name || ' » (pas encore prêt)'
        end,
        ', ' order by m.name
      )
      into problem
      from unnest(added) wanted (id)
      left join public.media m on m.id = wanted.id
      where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_indisponible',
          detail = left('Le modèle cite un fichier indisponible : ' || problem || '.', 1000);
      end if;

      select string_agg(distinct '« ' || m.name || ' »', ', ')
      into problem
      from public.media m
      where m.id = any (added) and m.kind <> 'image';

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_inadapte',
          detail = left('Ce fichier n''est pas une image : ' || problem || '.', 1000);
      end if;
    end if;

    begin
      shape_ok := extensions.jsonb_matches_schema(private.blocks_schema('published'), new_body);
      if not shape_ok then
        shape_errors := extensions.jsonschema_validation_errors(
          private.blocks_schema('published'), new_body::json
        );
      end if;
    exception
      when internal_error then
        raise exception using
          errcode = 'P0001',
          message = 'brouillon_trop_imbrique',
          detail = 'Le modèle a trop de niveaux imbriqués (listes dans des listes).';
    end;
    if not shape_ok then
      raise exception using
        errcode = 'P0001',
        message = 'forme_invalide',
        detail = left(
          'La version n''a pas la forme attendue : '
            || coalesce(
              (
                select string_agg(left(e, 200), ' | ' order by n)
                from unnest(shape_errors) with ordinality errs (e, n)
                where n <= 3
              ),
              'forme inconnue'
            ),
          1000
        );
    end if;

    select coalesce(
      jsonb_object_agg(
        m.id::text,
        coalesce(
          src.files -> m.id::text,
          jsonb_build_object(
            'kind', m.kind,
            'mime', m.mime,
            'path', m.path,
            'alt', m.alt,
            'transcript', m.transcript,
            'width', m.width,
            'height', m.height,
            'durationS', m.duration_s
          )
        )
      ),
      '{}'::jsonb
    )
    into new_files
    from public.media m
    where m.id = any (cited);

    prepared := src;
    prepared.body := new_body;
    prepared.files := new_files;
    prepared.body_hash := private.version_hash(new_body, new_files);
    prepared.media_ids := cited;
    prepared.template_ids := private.template_ids_of(new_body);
    prepared.block_types := private.block_types_of(new_body);
    created := private.insert_version(prepared, 'template', me);

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;

end;
$$;

-- « Remplacer… » ([D48]) dans les brouillons, sous le verrou de chacun : refusé si quelqu'un
-- d'autre écrit un des contenus.
create or replace function public.media_replace(old_id uuid, new_id uuid)
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

-- « Détacher partout » : chaque brouillon qui cite le bloc partagé en reçoit une copie ordinaire
-- (refusé si quelqu'un d'autre écrit un de ces brouillons).
create or replace function public.template_detach_all(template_id uuid)
returns table (content_id uuid, draft_rev integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  tpl public.contents;
  tpl_block jsonb;
  users uuid[];
  writer record;
  target record;
  new_blocks jsonb;
  new_rev integer;
begin
  perform private.require_staff();

  -- En partage : le modèle ne change pas pendant le geste. Un brouillon qui ajoute un bloc lié
  -- prend aussi un verrou partagé (pas d'attente croisée) : il sera nommé par « trash » s'il
  -- arrive pendant le geste.
  select * into tpl from public.contents t where t.id = template_detach_all.template_id for share;
  if not found or tpl.kind <> 'template' or tpl.template_sort <> 'shared' then
    raise exception using
      errcode = 'P0001',
      message = 'modele_introuvable',
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc partagé.';
  end if;
  -- null si le modèle est vide (ancien état) : ses blocs liés sont alors simplement retirés.
  tpl_block := tpl.draft -> 'blocks' -> 0;

  select coalesce(array_agg(c.id order by c.id), '{}') into users
  from public.contents c
  where c.draft_template_ids @> array[tpl.id] and c.id <> tpl.id;

  perform 1 from public.contents c where c.id = any (users) order by c.id for update;

  select
    coalesce(nullif(p.full_name, ''), p.email, 'Un autre membre') as name,
    coalesce(nullif(c.title, ''), 'Sans titre') as title
  into writer
  from public.edit_locks l
  join public.contents c on c.id = l.content_id
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = any (users)
    and l.holder_id is not null
    and l.holder_id is distinct from me
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1;

  if found then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_tenu',
      detail = format(
        '%s écrit « %s », qui utilise ce modèle : attends qu''il ait fini, ou reprends la main '
          'sur ce brouillon.',
        writer.name, writer.title
      ),
      hint = writer.name;
  end if;

  -- Le garde de corbeille laisse passer ces changements du brouillon (§ 3.2, cas 3).
  perform set_config('declikora.detach_all', 'on', true);

  for target in
    select c.id, c.draft from public.contents c where c.id = any (users) order by c.id
  loop
    select coalesce(
      jsonb_agg(
        case
          when b ->> 'type' = 'linked' and b ->> 'templateId' = tpl.id::text
            then private.detached_copy(tpl_block, b ->> 'id')
          else b
        end
        order by n
      ),
      '[]'::jsonb
    )
    into new_blocks
    from jsonb_array_elements(target.draft -> 'blocks') with ordinality list (b, n)
    where not (
      b ->> 'type' = 'linked' and b ->> 'templateId' = tpl.id::text and tpl_block is null
    );

    update public.contents c
    set draft = jsonb_set(c.draft, '{blocks}', new_blocks),
      draft_rev = c.draft_rev + 1,
      draft_saved_at = now(),
      draft_saved_by = me
    where c.id = target.id
    returning c.draft_rev into new_rev;

    update public.edit_locks l
    set draft_rev = new_rev
    where l.content_id = target.id;

    return query select target.id, new_rev;
  end loop;

  perform set_config('declikora.detach_all', '', true);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 11. Ce que lit l'app, et « Utilisé dans »
-- ---------------------------------------------------------------------------------------------

-- Le contenu d'une version en ligne (app_content, app_page) : sans methodId, lessonId, isFree ni
-- exercises.
create or replace function private.app_content_json(target_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', l.content_id,
    'versionId', v.id,
    'kind', l.kind,
    'title', v.body ->> 'title',
    'cover', coalesce(v.body -> 'cover', 'null'::jsonb),
    'slug', v.slug,
    'level', case
      when l.level_id is null then null
      else jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
    end,
    'locked', not access.unlocked,
    'blockTypes', to_jsonb(v.block_types),
    'blocks', case when access.unlocked then v.body -> 'blocks' end,
    'audio', case when access.unlocked then coalesce(v.body -> 'audio', 'null'::jsonb) end,
    'files', case
      when access.unlocked then v.files
      when v.cover_media_id is not null and v.files ? v.cover_media_id::text then
        jsonb_build_object(v.cover_media_id::text, v.files -> v.cover_media_id::text)
      else '{}'::jsonb
    end,
    'categoryIds', to_jsonb(array(
      select cat.id from public.categories cat
      where cat.id = any (v.category_ids)
      order by cat.position, cat.id
    )),
    'publishedAt', v.published_at,
    'firstPublishedAt', c.first_published_at
  )
  from private.live l
  join public.versions v on v.id = l.version_id
  join public.contents c on c.id = l.content_id
  left join public.access_levels al on al.id = l.level_id
  cross join lateral (
    select private.reader_rank() as rank
  ) reader
  cross join lateral (
    select l.level_id is null or coalesce(reader.rank >= l.level_rank, false) as unlocked
  ) access
  where l.version_id = target_version_id
  limit 1
$$;

-- « Utilisé dans » perd parent_title (un contenu n'a plus de parent) : la signature change.
drop function public.media_uses(uuid);
drop function private.media_uses(uuid);

-- « Où il est utilisé » ([D6]) : les brouillons qui citent le fichier (modèles et corbeille
-- compris) et les versions EN LIGNE qui le citent (in_app). Les anciennes versions de
-- l'historique ne comptent pas.
create function private.media_uses(target_media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  in_draft boolean,
  in_app boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with uses as (
    select c.id, true as in_draft, false as in_app
    from public.contents c
    where c.draft_media_ids @> array[target_media_id]
    union all
    select l.content_id, false, true
    from private.live l
    join public.versions v on v.id = l.version_id
    where v.media_ids @> array[target_media_id]
  )
  select
    c.id,
    c.kind,
    nullif(c.title, ''),
    bool_or(u.in_draft),
    bool_or(u.in_app)
  from uses u
  join public.contents c on c.id = u.id
  group by c.id, c.kind, c.title
  order by c.title, c.id
$$;

-- « Utilisé dans » (fiche d'un fichier) : brouillons et versions en ligne qui le citent.
create function public.media_uses(media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  in_draft boolean,
  in_app boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return query select * from private.media_uses(media_uses.media_id);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 12. Les dernières fonctions des méthodes, et les droits
-- ---------------------------------------------------------------------------------------------

drop function private.method_of(uuid);
drop function private.lock_scope(uuid[]);
drop function private.publish_scope(uuid);

revoke execute on function
  public.content_create(text, text, text, uuid, text),
  public.media_uses(uuid)
from public, anon;
grant execute on function
  public.content_create(text, text, text, uuid, text),
  public.media_uses(uuid)
to authenticated;

-- Aucune fonction de private n'est exécutable par anon ni authenticated, sauf reader_can_open
-- (politique de Storage) : § 4.5, vérifié par supabase/tests/05_prive.test.sql.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

-- Une méthode sur une seule page : une personne à la fois sur toute la méthode (06/10/2026, QCM ;
-- docs/ADMINISTRATION.md, § 4, « Une méthode sur une seule page »).
-- L'admin montre une méthode en entier sur une seule page (sa fiche, ses chapitres, ses leçons et
-- leurs exercices, à la suite) : une seule personne l'écrit à la fois, les autres la lisent, voient
-- qui écrit, et peuvent reprendre la main.
-- - Le verrou de la méthode vaut pour toute la méthode : save_draft et revert_to_version
--   acceptent, pour un chapitre, une leçon ou un exercice, le verrou de sa méthode (même ouverture
--   de l'éditeur). content_create ne donne plus de verrou à un nouvel élément, et refuse d'en
--   ajouter un pendant qu'une autre personne écrit la méthode (verrou_tenu).
-- - Un élément garde son propre verrou (l'admin d'avant cette page s'en sert encore), mais deux
--   personnes ne tiennent jamais en même temps deux parties d'une même méthode : lock_take refuse
--   (sauf « Reprendre la main ») quand une autre personne écrit une autre partie de la méthode,
--   et reprendre la main la retire à tous les autres. lock_status montre cette personne.
-- - Tout ce qui demandait « personne d'autre n'écrit ce contenu » regarde toute sa méthode :
--   publier, programmer, retirer, mettre à la corbeille (private.active_writer), détacher les
--   copies d'un modèle, remplacer un fichier dans les brouillons.
-- - edit_locks.method_rev : augmente à chaque changement de la méthode (fiche, plan, éléments).
--   Ceux qui la lisent n'écoutent que la ligne du verrou de la méthode (Realtime).

-- ---------------------------------------------------------------------------------------------
-- edit_locks : la révision de toute la méthode
-- ---------------------------------------------------------------------------------------------

alter table public.edit_locks
  add column method_rev integer not null default 0;

comment on column public.edit_locks.method_rev is
  'Méthode seulement : augmente à chaque changement de la méthode (sa fiche, son plan, un de ses '
  'chapitres, leçons ou exercices). Ceux qui la lisent n''écoutent que lui.';

comment on table public.edit_locks is
  'Qui écrit quel brouillon (verrou « un seul à la fois » ; une personne à la fois sur toute une '
  'méthode), suivi par Realtime. Écrite seulement par les fonctions de la base.';

-- ---------------------------------------------------------------------------------------------
-- Toute la méthode
-- ---------------------------------------------------------------------------------------------

-- Les contenus dont le verrou compte pour ces contenus : eux-mêmes et, pour une méthode ou un de
-- ses éléments, toute la méthode (sa fiche, ses chapitres, ses leçons et ses exercices hors
-- corbeille).
create function private.lock_scope(ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct x.id), '{}')
  from (
    select i.id from unnest(ids) i (id)
    union
    select unnest(private.publish_scope(m.id))
    from (select distinct private.method_of(i.id) as id from unnest(ids) i (id)) m
    where m.id is not null
  ) x (id)
$$;

-- Toute écriture dans une méthode (sa fiche, son plan, un de ses éléments : brouillon, réglages,
-- création, rangement, corbeille, publication) augmente method_rev de son verrou.
create function private.contents_method_rev()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.edit_locks l
  set method_rev = l.method_rev + 1
  where l.content_id in (
    select private.method_of(n.id)
    from changed n
    where n.kind in ('method', 'chapter', 'lesson', 'exercise')
  );
  return null;
end;
$$;

create trigger contents_method_rev_insert
  after insert on public.contents
  referencing new table as changed
  for each statement execute function private.contents_method_rev();

create trigger contents_method_rev_update
  after update on public.contents
  referencing new table as changed
  for each statement execute function private.contents_method_rev();

-- ---------------------------------------------------------------------------------------------
-- Le verrou
-- ---------------------------------------------------------------------------------------------

-- État du verrou d'un contenu, pour l'appelant (même forme qu'avant). Si personne n'écrit ce
-- contenu mais qu'une autre personne écrit une autre partie de sa méthode, c'est elle qu'on
-- montre : la méthode est en lecture seule pour les autres.
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
    w.holder_id,
    case when w.holder_id is not null then coalesce(nullif(p.full_name, ''), p.email) end,
    case when w.holder_id is not null then w.taken_at end,
    w.heartbeat_at,
    coalesce(w.holder_id is not null and w.heartbeat_at >= now() - private.lock_ttl(), false),
    c.draft_rev
  from public.contents c
  left join public.edit_locks l on l.content_id = c.id
  left join lateral (
    select o.holder_id, o.taken_at, o.heartbeat_at
    from public.edit_locks o
    where not coalesce(
        l.holder_id is not null and l.heartbeat_at >= now() - private.lock_ttl(), false
      )
      and o.content_id = any (private.lock_scope(array[c.id]))
      and o.content_id <> c.id
      and o.holder_id is not null
      and o.holder_id <> (select auth.uid())
      and o.heartbeat_at >= now() - private.lock_ttl()
    order by o.heartbeat_at desc
    limit 1
  ) other on true
  cross join lateral (
    select
      coalesce(other.holder_id, l.holder_id) as holder_id,
      case when other.holder_id is not null then other.taken_at else l.taken_at end as taken_at,
      case when other.holder_id is not null then other.heartbeat_at else l.heartbeat_at end
        as heartbeat_at
  ) w
  left join public.profiles p on p.id = w.holder_id
  where c.id = target_content_id
$$;

-- Prend le verrou d'un contenu, comme avant (libre, périmé, déjà à soi, ou force). Pour une
-- méthode ou un de ses éléments, en plus : refusé (sans force) quand une autre personne écrit une
-- autre partie de la méthode ; une fois pris, plus personne d'autre ne tient une partie de la
-- méthode (verrous périmés, ou repris par force).
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
  target_method uuid;
  family uuid[];
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

  target_method := private.method_of(target.id);
  if target_method is not null then
    -- Les prises de main d'une même méthode passent une par une.
    perform pg_advisory_xact_lock(hashtext('declikora.method_lock:' || target_method::text));
    family := private.lock_scope(array[target.id]);

    if not coalesce(lock_take.force, false) and exists (
      select 1 from public.edit_locks l
      where l.content_id = any (family) and l.content_id <> target.id
        and l.holder_id is not null and l.holder_id <> me
        and l.heartbeat_at >= now() - private.lock_ttl()
    ) then
      return query select * from private.lock_state(target.id, lock_take.editor_session);
      return;
    end if;

    update public.edit_locks l
    set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
    where l.content_id = any (family) and l.content_id <> target.id
      and l.holder_id is not null and l.holder_id <> me;
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

-- Qui écrit en ce moment ce périmètre ou une autre partie de sa méthode (verrou tenu et signe de
-- vie depuis moins de 90 s), en dehors de except_member (null : n'importe qui). Nom, sinon e-mail.
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
  where l.content_id = any (private.lock_scope(scope))
    and l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1
$$;

-- ---------------------------------------------------------------------------------------------
-- Écrire sous le verrou de la méthode
-- ---------------------------------------------------------------------------------------------

-- Comme avant ; pour un chapitre, une leçon ou un exercice, le verrou de sa méthode suffit.
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
  target_method uuid;
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

  -- Tenir le verrou, c'est en être le détenteur, depuis la même ouverture de l'éditeur : le
  -- verrou du contenu, ou celui de sa méthode (une personne à la fois sur toute la méthode). Un
  -- verrou périmé mais que personne n'a repris reste le sien : l'enregistrement le rafraîchit.
  target_method := private.method_of(target.id);
  if not exists (
    select 1 from public.edit_locks l
    where l.content_id in (target.id, target_method) and l.holder_id = me
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
    where k not in ('in_app', 'is_free', 'slug', 'access_level_id', 'category_ids')
  )
    or (s ? 'in_app' and jsonb_typeof(s -> 'in_app') <> 'boolean')
    or (s ? 'is_free' and jsonb_typeof(s -> 'is_free') <> 'boolean')
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
      detail = 'Réglages attendus : in_app, is_free (vrai ou faux), slug (texte ou null), '
        'access_level_id (identifiant ou null), category_ids (liste d''identifiants).';
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
      in_app = case when s ? 'in_app' then (s ->> 'in_app')::boolean else c.in_app end,
      is_free = case when s ? 'is_free' then (s ->> 'is_free')::boolean else c.is_free end,
      slug = case when s ? 'slug' then new_slug else c.slug end,
      access_level_id = case when s ? 'access_level_id' then new_level else c.access_level_id end,
      access_chosen = case when s ? 'access_level_id' then true else c.access_chosen end
    where c.id = target.id
    returning c.draft_rev into new_rev;
  exception
    -- Un réglage qui ne va pas avec la sorte (« Montrer dans l'app » sur un article, niveau
    -- d'accès sur une leçon…).
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
  set draft_rev = case when l.content_id = target.id then new_rev else l.draft_rev end,
    heartbeat_at = case
      when l.holder_id = me and l.holder_session is not distinct from save_draft.editor_session
        then saved_at
      else l.heartbeat_at
    end
  where l.content_id in (target.id, target_method);

  return query select new_rev, saved_at;
end;
$$;

-- Comme avant ; pour un chapitre, une leçon ou un exercice, le verrou de sa méthode suffit.
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
  target_method uuid;
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

  -- Le verrou du contenu, ou celui de sa méthode (comme save_draft).
  target_method := private.method_of(target.id);
  if not exists (
    select 1 from public.edit_locks l
    where l.content_id in (target.id, target_method) and l.holder_id = me
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
      when c.kind in ('article', 'episode', 'method', 'page') then src.access_level_id
      else c.access_level_id
    end,
    access_chosen = case
      when c.kind in ('article', 'episode', 'method', 'page') then true
      else c.access_chosen
    end,
    is_free = case when c.kind = 'lesson' then src.is_free else c.is_free end,
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
  set draft_rev = case when l.content_id = target.id then new_rev else l.draft_rev end,
    heartbeat_at = case
      when l.holder_id = me
        and l.holder_session is not distinct from revert_to_version.editor_session
        then saved_at
      else l.heartbeat_at
    end
  where l.content_id in (target.id, target_method);

  return query select new_rev, saved_at, notes;
end;
$$;

-- Comme avant ; un chapitre, une leçon ou un exercice ne reçoit plus de verrou (il s'écrit sous
-- celui de sa méthode), et ne s'ajoute pas pendant qu'une autre personne écrit la méthode.
create or replace function public.content_create(
  kind text,
  parent_id uuid default null,
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
  parent public.contents;
  starter public.contents;
  next_position integer;
  new_draft jsonb;
  created public.contents;
  writer text;
begin
  perform private.require_staff();

  if content_create.kind is null or content_create.kind not in (
    'article', 'episode', 'method', 'chapter', 'lesson', 'exercise', 'page', 'template'
  ) then
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

  if content_create.kind in ('chapter', 'lesson', 'exercise') then
    -- Le parent est verrouillé : deux créations simultanées n'ont pas la même position.
    select * into parent
    from public.contents c
    where c.id = content_create.parent_id
    for update;

    if not found
      or parent.deleted_at is not null
      or (content_create.kind = 'chapter' and parent.kind <> 'method')
      or (content_create.kind = 'lesson' and parent.kind <> 'chapter')
      or (content_create.kind = 'exercise' and parent.kind <> 'lesson') then
      raise exception using
        errcode = 'P0001',
        message = 'parent_invalide',
        detail = 'Un chapitre se crée dans une méthode, une leçon dans un chapitre, un exercice '
          'dans une leçon (hors corbeille).';
    end if;

    -- Une personne à la fois sur toute la méthode : on n'y ajoute rien pendant qu'une autre
    -- personne l'écrit. Les prises de main de la méthode attendent la fin de la création.
    perform pg_advisory_xact_lock(
      hashtext('declikora.method_lock:' || private.method_of(parent.id)::text)
    );
    writer := private.active_writer(array[parent.id], me);
    if writer is not null then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_tenu',
        detail = writer || ' écrit cette méthode : attends qu''il ait fini, ou reprends la main.',
        hint = writer;
    end if;

    select coalesce(max(c.position), 0) + 1 into next_position
    from public.contents c
    where c.parent_id = parent.id and c.deleted_at is null;
  elsif content_create.parent_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'parent_invalide',
      detail = 'Seuls les chapitres, les leçons et les exercices ont un parent.';
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
    kind, parent_id, position, draft, template_sort, template_for, created_by, draft_saved_by
  )
  values (
    content_create.kind,
    parent.id,
    next_position,
    new_draft,
    content_create.template_sort,
    content_create.template_for,
    me,
    me
  )
  returning * into created;

  -- Un contenu à part (article, épisode, méthode, page, modèle) donne son verrou à son auteur ;
  -- un chapitre, une leçon ou un exercice s'écrit sous celui de sa méthode.
  if created.parent_id is null then
    insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
    values (created.id, me, now(), now(), created.draft_rev);
  end if;

  return created;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- « Personne d'autre n'écrit » : toute la méthode
-- ---------------------------------------------------------------------------------------------

-- Comme avant ; un élément d'une méthode est écrit dès qu'une autre personne écrit sa méthode.
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
  where l.content_id = any (private.lock_scope(users))
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

-- Comme avant ; un élément d'une méthode est gardé dès que quelqu'un écrit sa méthode.
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
    where l.content_id = any (private.lock_scope(array[target.id]))
      and l.holder_id is not null
      and l.heartbeat_at >= now() - private.lock_ttl()
    order by l.heartbeat_at desc
    limit 1;
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

-- Comme avant ; une méthode attend tant que quelqu'un l'écrit (n'importe quelle partie) et
-- qu'une de ses parties a changé depuis la programmation.
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
  scope uuid[];
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
        -- Quelqu'un écrit (le contenu, ou une partie de la méthode : une personne à la fois
        -- sur toute la méthode), et ce qu'il écrit a changé depuis la programmation.
        scope := private.publish_scope(due.id);
        select exists (
          select 1
          from public.edit_locks l
          where l.content_id = any (scope)
            and l.holder_id is not null
            and l.heartbeat_at >= now() - private.lock_ttl()
        ) and exists (
          select 1
          from public.contents x
          where x.id = any (scope)
            and case
              when x.id = due.id then x.draft_rev <> due.scheduled_rev
              else x.draft_saved_at > due.scheduled_set_at
            end
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
-- Droits
-- ---------------------------------------------------------------------------------------------

-- Aucune fonction de private n'est exécutable par anon ni authenticated, sauf reader_can_open
-- (politique de Storage) : § 4.5, vérifié par supabase/tests/05_prive.test.sql.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

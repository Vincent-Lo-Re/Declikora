-- Méthodes : les exercices (04/10/2026, QCM ; docs/ADMINISTRATION.md, § 1, « Exercices »).
-- Chapitre → Leçon → Exercice. Un exercice est une ligne de contents (kind = 'exercise'), dans une
-- leçon (parent_id), géré comme une leçon : son brouillon en blocs, son verrou, son historique,
-- sa case « Montrer dans l'app » (in_app, décochée à la création), sa place dans sa leçon
-- (position) et ses points de départ (template_for = 'exercise'). Il n'a pas de case « Gratuit » :
-- son niveau est celui de sa leçon.
--
-- - Le plan figé d'une méthode (versions.outline) donne à chaque leçon ses exercices :
--   { "lessonId", "versionId", "exercises": [{ "exerciseId", "versionId" }] }. Un plan écrit avant
--   (leçon sans "exercises") reste valable.
-- - Publier une méthode publie aussi les exercices cochés de ses leçons cochées ; un exercice
--   inchangé garde sa version ([D29]). publish_preview les liste (deux colonnes de plus : leur
--   leçon) ; outline_reorder les range (nouvelle forme de demande, l'ancienne reste acceptée) ;
--   unpublish, trash et restore les traitent comme une leçon.
-- - private.live : un exercice cité par le plan en ligne est en ligne, au niveau de sa leçon.
--   Tout ce qui s'appuie sur la vue suit (fichiers publics ou protégés, « Où il est utilisé »,
--   modèles et textes à mettre à jour).
-- - L'app : app_content d'une leçon donne ses exercices (pour les montrer en bas), celle d'un
--   exercice sa leçon ; app_method donne le nombre d'exercices de chaque leçon. Ni l'une ni
--   l'autre ne donnent plus de résumé (ménage du 04/10/2026, migration précédente).

-- ---------------------------------------------------------------------------------------------
-- La sorte « exercice »
-- ---------------------------------------------------------------------------------------------

alter table public.contents drop constraint contents_kind_check;
alter table public.contents add constraint contents_kind_check
  check (kind in ('article', 'episode', 'method', 'chapter', 'lesson', 'exercise', 'page', 'template'));

alter table public.contents drop constraint contents_parent_kind;
alter table public.contents add constraint contents_parent_kind
  check ((kind in ('chapter', 'lesson', 'exercise')) = (parent_id is not null));

alter table public.contents drop constraint contents_in_app_kind;
alter table public.contents add constraint contents_in_app_kind
  check (not in_app or kind in ('chapter', 'lesson', 'exercise'));

alter table public.contents drop constraint contents_template_for_value;
alter table public.contents add constraint contents_template_for_value
  check (
    template_for is null
    or template_for in ('article', 'episode', 'chapter', 'lesson', 'exercise', 'page')
  );

comment on column public.contents.parent_id is
  'La méthode d''un chapitre, le chapitre d''une leçon, la leçon d''un exercice (interdit pour '
  'les autres sortes).';

-- Le parent de la bonne sorte, la création, les points de départ, le titre obligatoire, la
-- corbeille et le retrait de l'app : un exercice comme une leçon.

create or replace function private.contents_check_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_kind text;
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

  if new.parent_id is not null
    and (tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id) then
    select c.kind into parent_kind from public.contents c where c.id = new.parent_id;
    if not (
      (new.kind = 'chapter' and parent_kind = 'method')
      or (new.kind = 'lesson' and parent_kind = 'chapter')
      or (new.kind = 'exercise' and parent_kind = 'lesson')
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'parent_invalide',
        detail = 'Un chapitre appartient à une méthode, une leçon à un chapitre, un exercice à '
          'une leçon.';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.content_create(kind text, parent_id uuid DEFAULT NULL::uuid, title text DEFAULT ''::text, template_sort text DEFAULT NULL::text, from_template_id uuid DEFAULT NULL::uuid, template_for text DEFAULT NULL::text)
returns contents
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

  insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
  values (created.id, me, now(), now(), created.draft_rev);

  return created;
end;
$$;

create or replace function public.template_create_from(content_id uuid, block_ids uuid[], name text, sort text, template_for text DEFAULT NULL::text)
returns contents
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  clean_name text := normalize(btrim(coalesce(template_create_from.name, '')), NFC);
  source public.contents;
  wanted uuid[];
  picked jsonb;
  picked_count integer;
  resolved jsonb := '[]'::jsonb;
  b jsonb;
  t public.contents;
  created public.contents;
begin
  perform private.require_staff();

  if template_create_from.sort is null
    or template_create_from.sort not in ('style', 'shared', 'starter') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un modèle a une sorte : style, shared ou starter.';
  end if;

  if (template_create_from.sort = 'starter') <> (template_create_from.template_for is not null)
    or coalesce(template_create_from.template_for, 'page') not in (
      'article', 'episode', 'chapter', 'lesson', 'exercise', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode, chapter, lesson, '
        'exercise ou page) ; les autres modèles n''en ont pas.';
  end if;

  if clean_name = '' or char_length(clean_name) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Donne un nom au modèle (200 caractères au plus).';
  end if;

  select coalesce(array_agg(distinct x), '{}') into wanted
  from unnest(template_create_from.block_ids) x
  where x is not null;

  if template_create_from.block_ids is null
    or cardinality(wanted) = 0
    or cardinality(wanted) <> cardinality(template_create_from.block_ids) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Choisis au moins un bloc, chacun une fois.';
  end if;

  select * into source from public.contents c where c.id = template_create_from.content_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;
  if source.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille : restaure-le pour t''en servir.';
  end if;

  select coalesce(jsonb_agg(x.block order by x.n), '[]'::jsonb), count(*)
  into picked, picked_count
  from jsonb_array_elements(coalesce(source.draft -> 'blocks', '[]'::jsonb)) with ordinality x (block, n)
  where x.block ->> 'id' = any (array(select w::text from unnest(wanted) w));

  if picked_count <> cardinality(wanted) then
    raise exception using
      errcode = 'P0001',
      message = 'bloc_introuvable',
      detail = 'Un des blocs choisis n''est pas au premier niveau du brouillon enregistré : '
        'attends la fin de l''enregistrement, puis réessaie.';
  end if;

  if template_create_from.sort = 'shared' and picked_count <> 1 then
    raise exception using
      errcode = 'P0001',
      message = 'modele_un_seul_bloc',
      detail = 'Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, '
        'mets-les dans un encadré.';
  end if;

  for b in
    select x.block
    from jsonb_array_elements(picked) with ordinality x (block, n)
    order by x.n
  loop
    if b ->> 'type' = 'linked' then
      select * into t from public.contents c where c.id = (b ->> 'templateId')::uuid for share;
      if not found or t.kind <> 'template' or t.template_sort <> 'shared'
        or t.deleted_at is not null
        or jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) <> 1 then
        raise exception using
          errcode = 'P0001',
          message = 'modele_indisponible',
          detail = 'Un des blocs choisis vient d''un modèle qui n''existe plus, est dans la '
            'corbeille ou est vide.';
      end if;
      b := private.detached_copy(t.draft -> 'blocks' -> 0, b ->> 'id');
    end if;
    resolved := resolved || jsonb_build_array(b);
  end loop;

  insert into public.contents (
    kind, draft, template_sort, template_for, created_by, draft_saved_by
  )
  values (
    'template',
    jsonb_set(private.empty_draft(clean_name), '{blocks}', private.blocks_with_new_ids(resolved)),
    template_create_from.sort,
    template_create_from.template_for,
    me,
    me
  )
  returning * into created;

  return created;
end;
$$;

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
        when 'method' then 'Donne un titre à la méthode avant de la publier.'
        when 'chapter' then 'Donne un titre au chapitre avant de publier la méthode.'
        when 'lesson' then 'Donne un titre à la leçon avant de publier la méthode.'
        when 'exercise' then 'Donne un titre à l''exercice avant de publier la méthode.'
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
        when 'method' then 'Choisis l''image de présentation de la méthode avant de la publier.'
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
  target_method uuid;
  scope uuid[];
  writer text;
  uses text;
  batch uuid := gen_random_uuid();
  affected integer;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = trash.content_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  -- Chapitre, leçon ou exercice : la méthode d'abord (ordre des verrous commun à tous les gestes).
  if target.kind in ('chapter', 'lesson', 'exercise') then
    target_method := private.method_of(target.id);
    perform 1 from public.contents m where m.id = target_method for update;
  end if;

  select * into target from public.contents c where c.id = trash.content_id for update;

  if target.deleted_at is not null then
    return query select target.trash_batch, 0, false;
    return;
  end if;

  -- Le contenu et ses descendants hors corbeille, verrouillés dans un ordre fixe.
  scope := private.publish_scope(target.id);
  perform 1 from public.contents c where c.id = any (scope) order by c.id for update;

  writer := private.active_writer(scope, me);
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
  where c.id = any (scope)
    and c.deleted_at is null;
  get diagnostics affected = row_count;

  -- [D36] : hors du plan en ligne de sa méthode.
  if target_method is not null then
    perform private.remove_from_live_outline(target_method, scope, me);
  end if;

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = any (scope)
    and l.holder_id is not null;

  return query select batch, affected, exists (select 1 from private.files_to_move());
end;
$$;

create or replace function public.unpublish(content_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  target public.contents;
  target_method uuid;
  writer text;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = unpublish.content_id;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.kind in ('chapter', 'lesson', 'exercise') then
    -- La méthode d'abord, puis l'élément (ordre des verrous commun à tous les gestes).
    target_method := private.method_of(target.id);
    perform 1 from public.contents m where m.id = target_method for update;
    select * into target from public.contents c where c.id = unpublish.content_id for update;

    if target.deleted_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'dans_la_corbeille',
        detail = 'Ce contenu est dans la corbeille : il n''est déjà plus dans l''app.';
    end if;

    writer := private.active_writer(array[target.id], me);
    if writer is not null then
      raise exception using
        errcode = 'P0001',
        message = 'verrou_tenu',
        detail = writer || ' écrit ce brouillon : attends qu''il ait fini, ou reprends la main.',
        hint = writer;
    end if;

    if target.in_app then
      update public.contents c set in_app = false where c.id = target.id;
    end if;

    perform private.remove_from_live_outline(target_method, array[target.id], me);
    return exists (select 1 from private.files_to_move());
  end if;

  select * into target from public.contents c where c.id = unpublish.content_id for update;

  if target.kind not in ('article', 'episode', 'method', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un modèle ne se publie pas : il n''y a rien à retirer de l''app.';
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
  parent public.contents;
  next_position integer;
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

  -- Les éléments du lot dont le parent n'est pas dans le lot (en pratique : un seul, celui
  -- qu'on avait mis à la corbeille). Chacun sort de la corbeille dans la même commande que ses
  -- changements de place ou d'adresse : le garde de corbeille refuse toute autre modification
  -- d'un contenu qui y reste.
  for root in
    select c.*
    from public.contents c
    left join public.contents p on p.id = c.parent_id
    where c.trash_batch = target.trash_batch
      and (p.id is null or p.trash_batch is distinct from c.trash_batch)
    order by c.id
  loop
    next_position := root.position;
    root_slug := root.slug;

    if root.parent_id is not null then
      select * into parent from public.contents p where p.id = root.parent_id for update;
      if parent.deleted_at is not null then
        raise exception using
          errcode = 'P0001',
          message = 'parent_dans_la_corbeille',
          detail = format(
            'Restaure d''abord %s « %s ».',
            case parent.kind
              when 'method' then 'la méthode'
              when 'chapter' then 'le chapitre'
              else 'la leçon'
            end,
            coalesce(nullif(parent.title, ''), 'Sans titre')
          );
      end if;

      select coalesce(max(c.position), 0) + 1 into next_position
      from public.contents c
      where c.parent_id = parent.id and c.deleted_at is null;
    end if;

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
      position = next_position,
      in_app = case when root.parent_id is not null then false else c.in_app end,
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

-- ---------------------------------------------------------------------------------------------
-- Le plan figé d'une méthode (versions.outline) : les exercices de chaque leçon
-- ---------------------------------------------------------------------------------------------

-- Les exercices d'une leçon du plan ; une leçon d'un plan écrit avant les exercices n'en a pas.
create function private.outline_exercises(lesson_entry jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(lesson_entry -> 'exercises') = 'array' then lesson_entry -> 'exercises'
    else '[]'::jsonb
  end
$$;

-- La forme d'un plan : [{ "chapterId", "versionId", "lessons": [{ "lessonId", "versionId",
-- "exercises": [{ "exerciseId", "versionId" }] }] }], rien d'autre, des UUID en minuscules.
-- "exercises" peut manquer (plan écrit avant les exercices) ; la publication l'écrit toujours.
create or replace function private.outline_shape_ok(plan jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  chapter_entry jsonb;
  lesson_entry jsonb;
  exercise_entry jsonb;
begin
  if plan is null or jsonb_typeof(plan) <> 'array' then
    return false;
  end if;
  for chapter_entry in select x from jsonb_array_elements(plan) x loop
    if jsonb_typeof(chapter_entry) <> 'object' then
      return false;
    end if;
    if (select array_agg(k order by k) from jsonb_object_keys(chapter_entry) k)
      is distinct from array['chapterId', 'lessons', 'versionId'] then
      return false;
    end if;
    if jsonb_typeof(chapter_entry -> 'chapterId') <> 'string'
      or jsonb_typeof(chapter_entry -> 'versionId') <> 'string'
      or jsonb_typeof(chapter_entry -> 'lessons') <> 'array' then
      return false;
    end if;
    if (chapter_entry ->> 'chapterId') !~ uuid_pattern
      or (chapter_entry ->> 'versionId') !~ uuid_pattern then
      return false;
    end if;
    for lesson_entry in select y from jsonb_array_elements(chapter_entry -> 'lessons') y loop
      if jsonb_typeof(lesson_entry) <> 'object' then
        return false;
      end if;
      if coalesce((select array_agg(k order by k) from jsonb_object_keys(lesson_entry) k), '{}')
        not in (array['lessonId', 'versionId'], array['exercises', 'lessonId', 'versionId']) then
        return false;
      end if;
      if jsonb_typeof(lesson_entry -> 'lessonId') <> 'string'
        or jsonb_typeof(lesson_entry -> 'versionId') <> 'string' then
        return false;
      end if;
      if (lesson_entry ->> 'lessonId') !~ uuid_pattern
        or (lesson_entry ->> 'versionId') !~ uuid_pattern then
        return false;
      end if;
      if lesson_entry ? 'exercises' and jsonb_typeof(lesson_entry -> 'exercises') <> 'array' then
        return false;
      end if;
      for exercise_entry in select z from jsonb_array_elements(private.outline_exercises(lesson_entry)) z loop
        if jsonb_typeof(exercise_entry) <> 'object' then
          return false;
        end if;
        if (select array_agg(k order by k) from jsonb_object_keys(exercise_entry) k)
          is distinct from array['exerciseId', 'versionId'] then
          return false;
        end if;
        if jsonb_typeof(exercise_entry -> 'exerciseId') <> 'string'
          or jsonb_typeof(exercise_entry -> 'versionId') <> 'string' then
          return false;
        end if;
        if (exercise_entry ->> 'exerciseId') !~ uuid_pattern
          or (exercise_entry ->> 'versionId') !~ uuid_pattern then
          return false;
        end if;
      end loop;
    end loop;
  end loop;
  return true;
end;
$$;

-- Déclencheur (avant l'insertion d'une version) : seule une méthode a un plan, et il a la forme
-- attendue ; chaque chapitre est un chapitre de cette méthode, chaque leçon une leçon d'un de ses
-- chapitres, chaque exercice un exercice d'une de ses leçons (l'élément peut avoir changé de
-- parent dans le brouillon depuis), chacun une seule fois, et chaque versionId est une version
-- de cet élément.
create or replace function private.versions_check_outline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  content_kind text;
begin
  select c.kind into content_kind from public.contents c where c.id = new.content_id;

  if content_kind is distinct from 'method' then
    if new.outline is not null then
      raise exception using
        errcode = 'P0001',
        message = 'plan_invalide',
        detail = 'Seule une méthode a un plan.';
    end if;
    return new;
  end if;

  if not private.outline_shape_ok(new.outline) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_invalide',
      detail = 'Le plan d''une méthode est une liste de chapitres, chacun avec ses leçons, '
        'chacune avec ses exercices.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    group by chapter_entry ->> 'chapterId'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    group by lesson_entry ->> 'lessonId'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry)) exercise_entry
    group by exercise_entry ->> 'exerciseId'
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_invalide',
      detail = 'Un chapitre, une leçon ou un exercice apparaît deux fois dans le plan.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    where not exists (
      select 1
      from public.contents ch
      join public.versions v on v.id = (chapter_entry ->> 'versionId')::uuid and v.content_id = ch.id
      where ch.id = (chapter_entry ->> 'chapterId')::uuid
        and ch.kind = 'chapter'
        and ch.parent_id = new.content_id
    )
  ) or exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    where not exists (
      select 1
      from public.contents le
      join public.contents ch on ch.id = le.parent_id and ch.parent_id = new.content_id
      join public.versions v on v.id = (lesson_entry ->> 'versionId')::uuid and v.content_id = le.id
      where le.id = (lesson_entry ->> 'lessonId')::uuid
        and le.kind = 'lesson'
    )
  ) or exists (
    select 1
    from jsonb_array_elements(new.outline) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry)) exercise_entry
    where not exists (
      select 1
      from public.contents ex
      join public.contents le on le.id = ex.parent_id
      join public.contents ch on ch.id = le.parent_id and ch.parent_id = new.content_id
      join public.versions v on v.id = (exercise_entry ->> 'versionId')::uuid and v.content_id = ex.id
      where ex.id = (exercise_entry ->> 'exerciseId')::uuid
        and ex.kind = 'exercise'
    )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_invalide',
      detail = 'Le plan cite une version qui n''est pas celle d''un chapitre, d''une leçon ou '
        'd''un exercice de cette méthode.';
  end if;

  return new;
end;
$$;

-- Élément → version citée, pour tout le plan (chapitres, leçons et exercices).
create or replace function private.outline_versions(plan jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.element_id, x.version_id), '{}'::jsonb)
  from (
    select chapter_entry ->> 'chapterId' as element_id, chapter_entry -> 'versionId' as version_id
    from jsonb_array_elements(
      case when jsonb_typeof(plan) = 'array' then plan else '[]'::jsonb end
    ) chapter_entry
    union all
    select lesson_entry ->> 'lessonId', lesson_entry -> 'versionId'
    from jsonb_array_elements(
      case when jsonb_typeof(plan) = 'array' then plan else '[]'::jsonb end
    ) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    union all
    select exercise_entry ->> 'exerciseId', exercise_entry -> 'versionId'
    from jsonb_array_elements(
      case when jsonb_typeof(plan) = 'array' then plan else '[]'::jsonb end
    ) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry)) exercise_entry
  ) x
$$;

-- Le même plan, où certaines versions sont remplacées (ancienne → nouvelle), à tous les niveaux.
create or replace function private.outline_with_versions(plan jsonb, replacements jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      chapter_entry || jsonb_build_object(
        'versionId',
        coalesce(replacements -> (chapter_entry ->> 'versionId'), chapter_entry -> 'versionId'),
        'lessons',
        coalesce(
          (
            select jsonb_agg(
              lesson_entry
                || jsonb_build_object(
                  'versionId',
                  coalesce(replacements -> (lesson_entry ->> 'versionId'), lesson_entry -> 'versionId')
                )
                || case
                  when lesson_entry ? 'exercises' then jsonb_build_object(
                    'exercises',
                    coalesce(
                      (
                        select jsonb_agg(
                          exercise_entry || jsonb_build_object(
                            'versionId',
                            coalesce(
                              replacements -> (exercise_entry ->> 'versionId'),
                              exercise_entry -> 'versionId'
                            )
                          )
                          order by k
                        )
                        from jsonb_array_elements(private.outline_exercises(lesson_entry))
                          with ordinality e (exercise_entry, k)
                      ),
                      '[]'::jsonb
                    )
                  )
                  else '{}'::jsonb
                end
              order by m
            )
            from jsonb_array_elements(chapter_entry -> 'lessons') with ordinality l (lesson_entry, m)
          ),
          '[]'::jsonb
        )
      )
      order by n
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case when jsonb_typeof(plan) = 'array' then plan else '[]'::jsonb end
  ) with ordinality c (chapter_entry, n)
$$;

-- Le même plan sans certains éléments (chapitres, leçons ou exercices) ; un chapitre retiré part
-- avec ses leçons, une leçon avec ses exercices.
create or replace function private.outline_without(plan jsonb, removed uuid[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_set(
        chapter_entry,
        '{lessons}',
        coalesce(
          (
            select jsonb_agg(
              case
                when lesson_entry ? 'exercises' then jsonb_set(
                  lesson_entry,
                  '{exercises}',
                  coalesce(
                    (
                      select jsonb_agg(exercise_entry order by k)
                      from jsonb_array_elements(private.outline_exercises(lesson_entry))
                        with ordinality e (exercise_entry, k)
                      where not ((exercise_entry ->> 'exerciseId')::uuid = any (removed))
                    ),
                    '[]'::jsonb
                  )
                )
                else lesson_entry
              end
              order by m
            )
            from jsonb_array_elements(chapter_entry -> 'lessons') with ordinality l (lesson_entry, m)
            where not ((lesson_entry ->> 'lessonId')::uuid = any (removed))
          ),
          '[]'::jsonb
        )
      )
      order by n
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    case when jsonb_typeof(plan) = 'array' then plan else '[]'::jsonb end
  ) with ordinality c (chapter_entry, n)
  where not ((chapter_entry ->> 'chapterId')::uuid = any (removed))
$$;

-- ---------------------------------------------------------------------------------------------
-- Publication : les exercices partent avec leur méthode ([D29])
-- ---------------------------------------------------------------------------------------------

-- La méthode d'un chapitre, d'une leçon ou d'un exercice (et d'une méthode : elle-même).
create or replace function private.method_of(target_content_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case c.kind
    when 'method' then c.id
    when 'chapter' then c.parent_id
    when 'lesson' then (select ch.parent_id from public.contents ch where ch.id = c.parent_id)
    when 'exercise' then (
      select ch.parent_id
      from public.contents le
      join public.contents ch on ch.id = le.parent_id
      where le.id = c.parent_id
    )
  end
  from public.contents c
  where c.id = target_content_id
$$;

-- La place d'un élément parmi les éléments de son parent hors corbeille (1, 2, 3…), comme le
-- plan de l'admin la numérote.
create function private.place_in_parent(target_content_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
  from public.contents c
  join public.contents s on s.parent_id = c.parent_id and s.deleted_at is null
    and (s.position, s.id) <= (c.position, c.id)
  where c.id = target_content_id
$$;

-- Le nom d'un élément dans une erreur (« Chapitre 2 « Respirer » », « Chapitre 2, leçon 3
-- « Le souffle » », « Chapitre 2, leçon 3, exercice 1 « Inspirer » ») : sa place dans le plan de
-- l'admin.
create or replace function private.element_label(element public.contents)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case element.kind
    when 'chapter' then format(
      'Chapitre %s « %s »',
      private.place_in_parent(element.id),
      coalesce(nullif(element.draft ->> 'title', ''), 'Sans titre')
    )
    when 'lesson' then format(
      'Chapitre %s, leçon %s « %s »',
      private.place_in_parent(element.parent_id),
      private.place_in_parent(element.id),
      coalesce(nullif(element.draft ->> 'title', ''), 'Sans titre')
    )
    else format(
      'Chapitre %s, leçon %s, exercice %s « %s »',
      private.place_in_parent(
        (select le.parent_id from public.contents le where le.id = element.parent_id)
      ),
      private.place_in_parent(element.parent_id),
      private.place_in_parent(element.id),
      coalesce(nullif(element.draft ->> 'title', ''), 'Sans titre')
    )
  end
$$;

-- Publier une méthode : sa fiche, puis son plan, avec les chapitres cochés, leurs leçons cochées
-- et les exercices cochés de ces leçons, dans l'ordre de l'admin. Un élément inchangé garde sa
-- version (private.element_version).
create or replace function private.do_publish_method(
  target public.contents,
  author_id uuid,
  publish_origin text
)
returns public.versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  prepared public.versions;
  live_map jsonb;
  chapter_row public.contents;
  lesson_row public.contents;
  exercise_row public.contents;
  chapter_version uuid;
  lesson_version uuid;
  lessons jsonb;
  exercises jsonb;
  plan jsonb := '[]'::jsonb;
  created public.versions;
begin
  perform 1
  from public.contents c
  where c.id = any (private.publish_scope(target.id)) and c.id <> target.id
  order by c.id
  for share;

  prepared := private.prepare_version(target, private.resolve_linked(target.draft));

  select private.outline_versions(v.outline) into live_map
  from public.versions v
  where v.id = target.live_version_id;
  live_map := coalesce(live_map, '{}'::jsonb);

  for chapter_row in
    select c.* from public.contents c
    where c.parent_id = target.id and c.kind = 'chapter' and c.deleted_at is null and c.in_app
    order by c.position, c.id
  loop
    chapter_version := private.element_version(
      chapter_row, (live_map ->> chapter_row.id::text)::uuid, publish_origin, author_id
    );
    lessons := '[]'::jsonb;
    for lesson_row in
      select c.* from public.contents c
      where c.parent_id = chapter_row.id and c.kind = 'lesson' and c.deleted_at is null and c.in_app
      order by c.position, c.id
    loop
      lesson_version := private.element_version(
        lesson_row, (live_map ->> lesson_row.id::text)::uuid, publish_origin, author_id
      );
      exercises := '[]'::jsonb;
      for exercise_row in
        select c.* from public.contents c
        where c.parent_id = lesson_row.id and c.kind = 'exercise' and c.deleted_at is null
          and c.in_app
        order by c.position, c.id
      loop
        exercises := exercises || jsonb_build_array(jsonb_build_object(
          'exerciseId', exercise_row.id,
          'versionId', private.element_version(
            exercise_row, (live_map ->> exercise_row.id::text)::uuid, publish_origin, author_id
          )
        ));
      end loop;
      lessons := lessons || jsonb_build_array(jsonb_build_object(
        'lessonId', lesson_row.id,
        'versionId', lesson_version,
        'exercises', exercises
      ));
    end loop;
    plan := plan || jsonb_build_array(jsonb_build_object(
      'chapterId', chapter_row.id,
      'versionId', chapter_version,
      'lessons', lessons
    ));
  end loop;

  created := private.insert_version(prepared, publish_origin, author_id, plan);

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

-- ---------------------------------------------------------------------------------------------
-- Ce qui est en ligne : les exercices cités par le plan, au niveau de leur leçon
-- ---------------------------------------------------------------------------------------------

-- Toutes les versions EN LIGNE, avec leur niveau réel (level_id, level_rank ; null = gratuit).
-- Mêmes colonnes qu'avant, dans le même ordre :
--   - racines (article, épisode, méthode, page) hors corbeille dont live_version_id est
--     renseigné : le niveau de leur version ; method_id null ;
--   - chapitres, leçons et exercices cités par le plan de la version en ligne d'une méthode (hors
--     corbeille, eux, leurs parents et la méthode) : method_id ; niveau d'une leçon : null si sa
--     version a is_free, sinon celui de la méthode ; niveau d'un exercice : celui de sa leçon
--     dans ce plan ; niveau d'une introduction : private.chapter_intro_level ([D43]).
-- Toutes les règles (lecture de l'app, fichiers publics, « Où il est utilisé », modèles et textes
-- figés à mettre à jour) s'appuient sur cette vue. Jamais exposée.
create or replace view private.live as
select
  c.id as content_id,
  c.kind,
  v.id as version_id,
  null::uuid as method_id,
  v.access_level_id as level_id,
  al.rank as level_rank
from public.contents c
join public.versions v on v.id = c.live_version_id and v.content_id = c.id
left join public.access_levels al on al.id = v.access_level_id
where c.deleted_at is null
  and c.kind in ('article', 'episode', 'method', 'page')
union all
select
  ch.id,
  ch.kind,
  chv.id,
  m.id,
  intro.level_id,
  ial.rank
from public.contents m
join public.versions mv on mv.id = m.live_version_id and mv.content_id = m.id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(mv.outline) = 'array' then mv.outline else '[]'::jsonb end
) chapter_entry
join public.contents ch on ch.id = (chapter_entry ->> 'chapterId')::uuid and ch.deleted_at is null
join public.versions chv on chv.id = (chapter_entry ->> 'versionId')::uuid and chv.content_id = ch.id
cross join lateral (
  select private.chapter_intro_level(mv.access_level_id, chapter_entry) as level_id
) intro
left join public.access_levels ial on ial.id = intro.level_id
where m.kind = 'method' and m.deleted_at is null
union all
select
  le.id,
  le.kind,
  lv.id,
  m.id,
  case when lv.is_free then null else mv.access_level_id end,
  case when lv.is_free then null else mal.rank end
from public.contents m
join public.versions mv on mv.id = m.live_version_id and mv.content_id = m.id
left join public.access_levels mal on mal.id = mv.access_level_id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(mv.outline) = 'array' then mv.outline else '[]'::jsonb end
) chapter_entry
join public.contents ch on ch.id = (chapter_entry ->> 'chapterId')::uuid and ch.deleted_at is null
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(chapter_entry -> 'lessons') = 'array'
    then chapter_entry -> 'lessons' else '[]'::jsonb end
) lesson_entry
join public.contents le on le.id = (lesson_entry ->> 'lessonId')::uuid and le.deleted_at is null
join public.versions lv on lv.id = (lesson_entry ->> 'versionId')::uuid and lv.content_id = le.id
where m.kind = 'method' and m.deleted_at is null
union all
select
  ex.id,
  ex.kind,
  exv.id,
  m.id,
  case when lv.is_free then null else mv.access_level_id end,
  case when lv.is_free then null else mal.rank end
from public.contents m
join public.versions mv on mv.id = m.live_version_id and mv.content_id = m.id
left join public.access_levels mal on mal.id = mv.access_level_id
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(mv.outline) = 'array' then mv.outline else '[]'::jsonb end
) chapter_entry
join public.contents ch on ch.id = (chapter_entry ->> 'chapterId')::uuid and ch.deleted_at is null
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(chapter_entry -> 'lessons') = 'array'
    then chapter_entry -> 'lessons' else '[]'::jsonb end
) lesson_entry
join public.contents le on le.id = (lesson_entry ->> 'lessonId')::uuid and le.deleted_at is null
join public.versions lv on lv.id = (lesson_entry ->> 'versionId')::uuid and lv.content_id = le.id
cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry)) exercise_entry
join public.contents ex on ex.id = (exercise_entry ->> 'exerciseId')::uuid and ex.deleted_at is null
join public.versions exv on exv.id = (exercise_entry ->> 'versionId')::uuid and exv.content_id = ex.id
where m.kind = 'method' and m.deleted_at is null;

comment on view private.live is
  'Les versions en ligne et leur niveau réel (null = gratuit) : racines, et chapitres, leçons et '
  'exercices cités par le plan en ligne d''une méthode (leçon gratuite, exercice au niveau de sa '
  'leçon ; introduction : [D43]).';

revoke all on private.live from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Ce que lit l'app : les exercices en bas de leur leçon, leur nombre dans le plan ; plus de résumé
-- ---------------------------------------------------------------------------------------------

-- Le contenu d'une version en ligne (app_content, app_page). En plus d'avant, sans le résumé :
--   - lessonId : pour un exercice, sa leçon dans le plan en ligne (null sinon) ;
--   - exercises : pour une leçon, ses exercices en ligne dans l'ordre du plan (id, versionId,
--     titre, image, niveau, locked), même quand la leçon est verrouillée ; null pour les autres
--     sortes. Leurs images de présentation s'ajoutent à files, comme celles du plan d'une méthode.
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
    'methodId', l.method_id,
    'lessonId', place.lesson_id,
    'title', v.body ->> 'title',
    'cover', coalesce(v.body -> 'cover', 'null'::jsonb),
    'slug', v.slug,
    'level', case
      when l.level_id is null then null
      else jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
    end,
    'locked', not access.unlocked,
    'isFree', v.is_free,
    'blockTypes', to_jsonb(v.block_types),
    'blocks', case when access.unlocked then v.body -> 'blocks' end,
    'audio', case when access.unlocked then coalesce(v.body -> 'audio', 'null'::jsonb) end,
    'files', case
      when access.unlocked then v.files
      when v.cover_media_id is not null and v.files ? v.cover_media_id::text then
        jsonb_build_object(v.cover_media_id::text, v.files -> v.cover_media_id::text)
      else '{}'::jsonb
    end || coalesce(exercise_list.covers, '{}'::jsonb),
    'categoryIds', to_jsonb(array(
      select cat.id from public.categories cat
      where cat.id = any (v.category_ids)
      order by cat.position, cat.id
    )),
    'exercises', case when l.kind = 'lesson' then coalesce(exercise_list.items, '[]'::jsonb) end,
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
  -- La leçon d'un exercice, dans le plan en ligne de sa méthode.
  left join lateral (
    select (lesson_entry ->> 'lessonId')::uuid as lesson_id
    from private.live ml
    join public.versions mv on mv.id = ml.version_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(mv.outline) = 'array' then mv.outline else '[]'::jsonb end
    ) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry)) exercise_entry
    where l.kind = 'exercise'
      and ml.content_id = l.method_id and ml.kind = 'method'
      and (exercise_entry ->> 'exerciseId')::uuid = l.content_id
      and (exercise_entry ->> 'versionId')::uuid = l.version_id
    limit 1
  ) place on true
  -- Les exercices d'une leçon, dans l'ordre du plan en ligne.
  left join lateral (
    select
      jsonb_agg(
        jsonb_build_object(
          'id', ex.content_id,
          'versionId', ex.version_id,
          'title', exv.body ->> 'title',
          'cover', coalesce(exv.body -> 'cover', 'null'::jsonb),
          'level', case
            when ex.level_id is null then null
            else (select jsonb_build_object('id', xal.id, 'name', xal.name, 'rank', xal.rank)
              from public.access_levels xal where xal.id = ex.level_id)
          end,
          'locked', not (ex.level_id is null or coalesce(reader.rank >= ex.level_rank, false))
        )
        order by e.k
      ) as items,
      jsonb_object_agg(exv.cover_media_id::text, exv.files -> exv.cover_media_id::text)
        filter (where exv.cover_media_id is not null and exv.files ? exv.cover_media_id::text)
        as covers
    from private.live ml
    join public.versions mv on mv.id = ml.version_id
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(mv.outline) = 'array' then mv.outline else '[]'::jsonb end
    ) chapter_entry
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') lesson_entry
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry))
      with ordinality e (exercise_entry, k)
    join private.live ex on ex.method_id = ml.content_id
      and ex.content_id = (e.exercise_entry ->> 'exerciseId')::uuid
      and ex.version_id = (e.exercise_entry ->> 'versionId')::uuid
    join public.versions exv on exv.id = ex.version_id
    where l.kind = 'lesson'
      and ml.content_id = l.method_id and ml.kind = 'method'
      and (lesson_entry ->> 'lessonId')::uuid = l.content_id
      and (lesson_entry ->> 'versionId')::uuid = l.version_id
  ) exercise_list on true
  where l.version_id = target_version_id
  limit 1
$$;

-- La fiche et le plan figé d'une méthode. Comme avant, sans le résumé, et chaque leçon dit
-- combien d'exercices elle a dans l'app (exerciseCount) : le plan reste court, les exercices se
-- lisent dans la leçon (app_content). files : les images de la méthode, des chapitres et des
-- leçons.
create or replace function public.app_method(content_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with reader as (
    select private.reader_rank() as rank
  ),
  method_live as (
    select l.content_id, l.version_id, l.level_id, l.level_rank, v.body, v.outline, v.published_at,
      v.cover_media_id, v.files, c.first_published_at
    from private.live l
    join public.versions v on v.id = l.version_id
    join public.contents c on c.id = l.content_id
    where l.content_id = app_method.content_id and l.kind = 'method'
    limit 1
  ),
  elements as (
    select l.content_id, l.version_id, l.level_id, l.level_rank, v.body, v.is_free,
      v.cover_media_id, v.files
    from method_live ml
    join private.live l on l.method_id = ml.content_id and l.kind in ('chapter', 'lesson')
    join public.versions v on v.id = l.version_id
  )
  select jsonb_build_object(
    'id', ml.content_id,
    'versionId', ml.version_id,
    'kind', 'method',
    'title', ml.body ->> 'title',
    'cover', coalesce(ml.body -> 'cover', 'null'::jsonb),
    'level', case
      when ml.level_id is null then null
      else (select jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
        from public.access_levels al where al.id = ml.level_id)
    end,
    'locked', not (ml.level_id is null or coalesce(reader.rank >= ml.level_rank, false)),
    'files', coalesce(
      (
        select jsonb_object_agg(covers.media_id, covers.info)
        from (
          select ml.cover_media_id::text as media_id, ml.files -> ml.cover_media_id::text as info
          where ml.cover_media_id is not null and ml.files ? ml.cover_media_id::text
          union
          select e.cover_media_id::text, e.files -> e.cover_media_id::text
          from elements e
          where e.cover_media_id is not null and e.files ? e.cover_media_id::text
        ) covers
      ),
      '{}'::jsonb
    ),
    'chapters', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', ch.content_id,
            'versionId', ch.version_id,
            'title', ch.body ->> 'title',
            'cover', coalesce(ch.body -> 'cover', 'null'::jsonb),
            'level', case
              when ch.level_id is null then null
              else (select jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
                from public.access_levels al where al.id = ch.level_id)
            end,
            'locked', not (ch.level_id is null or coalesce(reader.rank >= ch.level_rank, false)),
            'lessons', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', le.content_id,
                    'versionId', le.version_id,
                    'title', le.body ->> 'title',
                    'cover', coalesce(le.body -> 'cover', 'null'::jsonb),
                    'isFree', le.is_free,
                    'level', case
                      when le.level_id is null then null
                      else (select jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
                        from public.access_levels al where al.id = le.level_id)
                    end,
                    'locked', not (le.level_id is null or coalesce(reader.rank >= le.level_rank, false)),
                    'exerciseCount', (
                      select count(*)
                      from jsonb_array_elements(private.outline_exercises(lo.lesson_entry)) exercise_entry
                      join private.live ex on ex.method_id = ml.content_id
                        and ex.content_id = (exercise_entry ->> 'exerciseId')::uuid
                        and ex.version_id = (exercise_entry ->> 'versionId')::uuid
                    )
                  )
                  order by lo.m
                )
                from jsonb_array_elements(co.chapter_entry -> 'lessons') with ordinality lo (lesson_entry, m)
                join elements le on le.content_id = (lo.lesson_entry ->> 'lessonId')::uuid
                  and le.version_id = (lo.lesson_entry ->> 'versionId')::uuid
              ),
              '[]'::jsonb
            )
          )
          order by co.n
        )
        from jsonb_array_elements(
          case when jsonb_typeof(ml.outline) = 'array' then ml.outline else '[]'::jsonb end
        ) with ordinality co (chapter_entry, n)
        join elements ch on ch.content_id = (co.chapter_entry ->> 'chapterId')::uuid
          and ch.version_id = (co.chapter_entry ->> 'versionId')::uuid
      ),
      '[]'::jsonb
    ),
    'publishedAt', ml.published_at,
    'firstPublishedAt', ml.first_published_at
  )
  from method_live ml
  cross join reader
$$;

-- ---------------------------------------------------------------------------------------------
-- Ranger le plan : les exercices aussi
-- ---------------------------------------------------------------------------------------------

-- Range l'arbre d'une méthode, sous son verrou. Deux formes de demande :
--   - avec les exercices : [{ "chapterId", "lessons": [{ "lessonId", "exerciseIds": [...] }] }] ;
--     chaque exercice prend la leçon et la place demandées ;
--   - sans les exercices (celle d'avant) : [{ "chapterId", "lessonIds": [...] }] ; les exercices
--     restent dans leur leçon, à leur place.
-- Toutes les entrées ont la même forme. Les éléments demandés sont exactement ceux de la méthode
-- hors corbeille (sinon plan_perime). Rien ne change dans l'app avant la publication.
create or replace function public.outline_reorder(
  method_id uuid,
  outline jsonb,
  editor_session uuid default null
)
returns table (content_id uuid, kind text, parent_id uuid, "position" integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  target public.contents;
  entry jsonb;
  entry_keys text[];
  shape text;
  lesson_value jsonb;
  exercise_value jsonb;
  malformed boolean := false;
  plan jsonb;
  wanted_chapters uuid[];
  wanted_lessons uuid[];
  wanted_exercises uuid[];
  current_chapters uuid[];
  current_lessons uuid[];
  current_exercises uuid[];
begin
  perform private.require_staff();

  if outline_reorder.method_id is null or outline_reorder.outline is null
    or jsonb_typeof(outline_reorder.outline) <> 'array' then
    malformed := true;
  else
    for entry in select e from jsonb_array_elements(outline_reorder.outline) e loop
      if jsonb_typeof(entry) <> 'object' then
        malformed := true;
      else
        entry_keys := (select array_agg(k order by k) from jsonb_object_keys(entry) k);
        if entry_keys = array['chapterId', 'lessonIds']
          and coalesce(shape, 'lessonIds') = 'lessonIds' then
          shape := 'lessonIds';
          if jsonb_typeof(entry -> 'lessonIds') <> 'array' then
            malformed := true;
          else
            for lesson_value in select y from jsonb_array_elements(entry -> 'lessonIds') y loop
              if jsonb_typeof(lesson_value) <> 'string'
                or (lesson_value #>> '{}') !~ uuid_pattern then
                malformed := true;
              end if;
            end loop;
          end if;
        elsif entry_keys = array['chapterId', 'lessons']
          and coalesce(shape, 'lessons') = 'lessons' then
          shape := 'lessons';
          if jsonb_typeof(entry -> 'lessons') <> 'array' then
            malformed := true;
          else
            for lesson_value in select y from jsonb_array_elements(entry -> 'lessons') y loop
              if jsonb_typeof(lesson_value) <> 'object'
                or (select array_agg(k order by k) from jsonb_object_keys(lesson_value) k)
                  is distinct from array['exerciseIds', 'lessonId']
                or jsonb_typeof(lesson_value -> 'lessonId') <> 'string'
                or (lesson_value ->> 'lessonId') !~ uuid_pattern
                or jsonb_typeof(lesson_value -> 'exerciseIds') <> 'array' then
                malformed := true;
              else
                for exercise_value in
                  select z from jsonb_array_elements(lesson_value -> 'exerciseIds') z
                loop
                  if jsonb_typeof(exercise_value) <> 'string'
                    or (exercise_value #>> '{}') !~ uuid_pattern then
                    malformed := true;
                  end if;
                end loop;
              end if;
            end loop;
          end if;
        else
          malformed := true;
        end if;
        if not malformed and (
          jsonb_typeof(entry -> 'chapterId') <> 'string' or (entry ->> 'chapterId') !~ uuid_pattern
        ) then
          malformed := true;
        end if;
      end if;
      exit when malformed;
    end loop;
  end if;

  if malformed then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le plan attendu : [{ "chapterId": "…", "lessons": [{ "lessonId": "…", '
        '"exerciseIds": ["…"] }] }], ou sans les exercices [{ "chapterId": "…", '
        '"lessonIds": ["…"] }].';
  end if;

  -- Une seule forme pour la suite : [{ chapterId, lessons: [{ lessonId, exerciseIds? }] }].
  plan := coalesce(
    (
      select jsonb_agg(
        case when shape = 'lessons' then e
        else jsonb_build_object(
          'chapterId', e -> 'chapterId',
          'lessons', coalesce(
            (
              select jsonb_agg(jsonb_build_object('lessonId', l) order by m)
              from jsonb_array_elements(e -> 'lessonIds') with ordinality t (l, m)
            ),
            '[]'::jsonb
          )
        )
        end
        order by n
      )
      from jsonb_array_elements(outline_reorder.outline) with ordinality o (e, n)
    ),
    '[]'::jsonb
  );

  select * into target from public.contents c where c.id = outline_reorder.method_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Cette méthode n''existe plus.';
  end if;
  if target.kind <> 'method' then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seule une méthode a des chapitres, des leçons et des exercices à ranger.';
  end if;
  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Cette méthode est dans la corbeille : restaure-la pour la modifier.';
  end if;

  if not exists (
    select 1 from public.edit_locks l
    where l.content_id = target.id and l.holder_id = me
      and l.holder_session is not distinct from outline_reorder.editor_session
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'verrou_perdu',
      detail = 'Prends la main sur la méthode pour ranger ses chapitres, ses leçons et ses '
        'exercices.';
  end if;

  -- Les chapitres, les leçons et les exercices hors corbeille, verrouillés dans un ordre fixe.
  perform 1
  from public.contents c
  where c.id = any (private.publish_scope(target.id)) and c.id <> target.id
  order by c.id
  for update;

  select coalesce(array_agg(c.id order by c.id), '{}') into current_chapters
  from public.contents c
  where c.parent_id = target.id and c.deleted_at is null;

  select coalesce(array_agg(le.id order by le.id), '{}') into current_lessons
  from public.contents le
  join public.contents ch on ch.id = le.parent_id
  where ch.parent_id = target.id and ch.deleted_at is null and le.deleted_at is null;

  select coalesce(array_agg(ex.id order by ex.id), '{}') into current_exercises
  from public.contents ex
  join public.contents le on le.id = ex.parent_id
  join public.contents ch on ch.id = le.parent_id
  where ch.parent_id = target.id and ch.deleted_at is null and le.deleted_at is null
    and ex.deleted_at is null;

  select coalesce(array_agg((e ->> 'chapterId')::uuid order by (e ->> 'chapterId')::uuid), '{}')
  into wanted_chapters
  from jsonb_array_elements(plan) e;

  select coalesce(array_agg((l ->> 'lessonId')::uuid order by (l ->> 'lessonId')::uuid), '{}')
  into wanted_lessons
  from jsonb_array_elements(plan) e
  cross join lateral jsonb_array_elements(e -> 'lessons') l;

  select coalesce(array_agg((x #>> '{}')::uuid order by (x #>> '{}')::uuid), '{}')
  into wanted_exercises
  from jsonb_array_elements(plan) e
  cross join lateral jsonb_array_elements(e -> 'lessons') l
  cross join lateral jsonb_array_elements(coalesce(l -> 'exerciseIds', '[]'::jsonb)) x;

  if wanted_chapters <> current_chapters or wanted_lessons <> current_lessons
    or (shape = 'lessons' and wanted_exercises <> current_exercises) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_perime',
      detail = 'Des chapitres, des leçons ou des exercices ont été ajoutés ou supprimés '
        'entre-temps : relis le plan, puis range-le de nouveau.';
  end if;

  update public.contents c
  set position = o.n
  from jsonb_array_elements(plan) with ordinality o (e, n)
  where c.id = (o.e ->> 'chapterId')::uuid and c.position is distinct from o.n;

  update public.contents c
  set parent_id = o.chapter_id, position = o.m
  from (
    select (e ->> 'chapterId')::uuid as chapter_id, (l ->> 'lessonId')::uuid as lesson_id, m
    from jsonb_array_elements(plan) e
    cross join lateral jsonb_array_elements(e -> 'lessons') with ordinality t (l, m)
  ) o
  where c.id = o.lesson_id
    and (c.parent_id is distinct from o.chapter_id or c.position is distinct from o.m);

  if shape = 'lessons' then
    update public.contents c
    set parent_id = o.lesson_id, position = o.k
    from (
      select (l ->> 'lessonId')::uuid as lesson_id, (x #>> '{}')::uuid as exercise_id, k
      from jsonb_array_elements(plan) e
      cross join lateral jsonb_array_elements(e -> 'lessons') l
      cross join lateral jsonb_array_elements(l -> 'exerciseIds') with ordinality t (x, k)
    ) o
    where c.id = o.exercise_id
      and (c.parent_id is distinct from o.lesson_id or c.position is distinct from o.k);
  end if;

  return query
    select x.id, x.kind, x.parent_id, x.position
    from (
      select ch.id, ch.kind, ch.parent_id, ch.position,
        ch.position as ch_pos, 0 as le_pos, 0 as ex_pos
      from public.contents ch
      where ch.parent_id = target.id and ch.deleted_at is null
      union all
      select le.id, le.kind, le.parent_id, le.position, ch.position, le.position, 0
      from public.contents le
      join public.contents ch on ch.id = le.parent_id
      where ch.parent_id = target.id and ch.deleted_at is null and le.deleted_at is null
      union all
      select ex.id, ex.kind, ex.parent_id, ex.position, ch.position, le.position, ex.position
      from public.contents ex
      join public.contents le on le.id = ex.parent_id
      join public.contents ch on ch.id = le.parent_id
      where ch.parent_id = target.id and ch.deleted_at is null and le.deleted_at is null
        and ex.deleted_at is null
    ) x
    order by x.ch_pos, x.le_pos, x.ex_pos;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Ce qui changera dans l'app : les exercices aussi
-- ---------------------------------------------------------------------------------------------

-- Comme avant ([D29]), avec les exercices cochés des leçons cochées : neufs, modifiés, retirés,
-- et l'ordre (un exercice rangé autrement ou passé dans une autre leçon change l'ordre du plan).
-- Deux colonnes de plus, lesson_id et lesson_title : la leçon d'un exercice (son chapitre est
-- dans chapter_id et chapter_title). Le type rendu change : la fonction est recréée.
drop function public.publish_preview(uuid);

create function public.publish_preview(content_id uuid)
returns table (
  element_id uuid,
  kind text,
  title text,
  chapter_id uuid,
  chapter_title text,
  lesson_id uuid,
  lesson_title text,
  change text,
  problem text,
  problem_detail text,
  draft_saved_at timestamptz,
  draft_saved_by uuid,
  draft_saved_by_name text
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  target public.contents;
  live_version public.versions;
  live_map jsonb;
  checked record;
  plan_items jsonb;
  old_items jsonb;
  item jsonb;
  element public.contents;
  element_change text;
  old_version_id uuid;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = publish_preview.content_id;
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
  if target.kind <> 'method' then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'La liste des changements concerne une méthode.';
  end if;

  select v.* into live_version from public.versions v where v.id = target.live_version_id;
  live_map := private.outline_versions(live_version.outline);

  -- Le plan à venir : chapitres cochés hors corbeille, leurs leçons cochées, puis les exercices
  -- cochés de ces leçons, dans l'ordre.
  select coalesce(
    jsonb_agg(
      x.entry
      order by x.ch_pos, x.ch_id, x.le_pos nulls first, x.le_id nulls first,
        x.ex_pos nulls first, x.ex_id nulls first
    ),
    '[]'::jsonb
  )
  into plan_items
  from (
    select
      jsonb_build_object('id', ch.id, 'chapterId', ch.id, 'key', 'c:' || ch.id) as entry,
      ch.position as ch_pos, ch.id as ch_id, null::integer as le_pos, null::uuid as le_id,
      null::integer as ex_pos, null::uuid as ex_id
    from public.contents ch
    where ch.parent_id = target.id and ch.kind = 'chapter' and ch.deleted_at is null and ch.in_app
    union all
    select
      jsonb_build_object('id', le.id, 'chapterId', ch.id, 'key', 'l:' || ch.id || '/' || le.id),
      ch.position, ch.id, le.position, le.id, null::integer, null::uuid
    from public.contents ch
    join public.contents le on le.parent_id = ch.id and le.deleted_at is null and le.in_app
    where ch.parent_id = target.id and ch.kind = 'chapter' and ch.deleted_at is null and ch.in_app
    union all
    select
      jsonb_build_object(
        'id', ex.id, 'chapterId', ch.id, 'lessonId', le.id,
        'key', 'e:' || le.id || '/' || ex.id
      ),
      ch.position, ch.id, le.position, le.id, ex.position, ex.id
    from public.contents ch
    join public.contents le on le.parent_id = ch.id and le.deleted_at is null and le.in_app
    join public.contents ex on ex.parent_id = le.id and ex.deleted_at is null and ex.in_app
    where ch.parent_id = target.id and ch.kind = 'chapter' and ch.deleted_at is null and ch.in_app
  ) x;

  -- Le plan en ligne (éléments hors corbeille), dans l'ordre.
  select coalesce(jsonb_agg(x.entry order by x.n, x.m nulls first, x.k nulls first), '[]'::jsonb)
  into old_items
  from (
    select
      jsonb_build_object(
        'id', chapter_entry ->> 'chapterId', 'chapterId', chapter_entry ->> 'chapterId',
        'key', 'c:' || (chapter_entry ->> 'chapterId')
      ) as entry,
      o.n, null::bigint as m, null::bigint as k
    from jsonb_array_elements(
      case when jsonb_typeof(live_version.outline) = 'array' then live_version.outline else '[]'::jsonb end
    ) with ordinality o (chapter_entry, n)
    union all
    select
      jsonb_build_object(
        'id', lesson_entry ->> 'lessonId', 'chapterId', chapter_entry ->> 'chapterId',
        'key', 'l:' || (chapter_entry ->> 'chapterId') || '/' || (lesson_entry ->> 'lessonId')
      ),
      o.n, l.m, null::bigint
    from jsonb_array_elements(
      case when jsonb_typeof(live_version.outline) = 'array' then live_version.outline else '[]'::jsonb end
    ) with ordinality o (chapter_entry, n)
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') with ordinality l (lesson_entry, m)
    union all
    select
      jsonb_build_object(
        'id', exercise_entry ->> 'exerciseId', 'chapterId', chapter_entry ->> 'chapterId',
        'lessonId', lesson_entry ->> 'lessonId',
        'key', 'e:' || (lesson_entry ->> 'lessonId') || '/' || (exercise_entry ->> 'exerciseId')
      ),
      o.n, l.m, e.k
    from jsonb_array_elements(
      case when jsonb_typeof(live_version.outline) = 'array' then live_version.outline else '[]'::jsonb end
    ) with ordinality o (chapter_entry, n)
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') with ordinality l (lesson_entry, m)
    cross join lateral jsonb_array_elements(private.outline_exercises(lesson_entry))
      with ordinality e (exercise_entry, k)
  ) x
  join public.contents c on c.id = (x.entry ->> 'id')::uuid and c.deleted_at is null;

  -- 1. La fiche.
  select * into checked from private.try_prepare(target);
  if live_version.id is null
    or checked.problem is not null
    or checked.body_hash is distinct from live_version.body_hash
    or target.access_level_id is distinct from live_version.access_level_id then
    return query
      select target.id, target.kind, nullif(target.title, ''), null::uuid, null::text,
        null::uuid, null::text,
        case when live_version.id is null then 'new' else 'modified' end,
        checked.problem, checked.problem_detail, target.draft_saved_at, target.draft_saved_by,
        (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p
          where p.id = target.draft_saved_by);
  end if;

  -- 2. L'ordre du plan : les éléments présents avant et après, rangés autrement.
  if live_version.id is not null and array(
    select o ->> 'key' from jsonb_array_elements(old_items) with ordinality a (o, n)
    where exists (select 1 from jsonb_array_elements(plan_items) p where p ->> 'id' = o ->> 'id')
    order by a.n
  ) is distinct from array(
    select p ->> 'key' from jsonb_array_elements(plan_items) with ordinality a (p, n)
    where exists (select 1 from jsonb_array_elements(old_items) o where o ->> 'id' = p ->> 'id')
    order by a.n
  ) then
    return query
      select target.id, target.kind, nullif(target.title, ''), null::uuid, null::text,
        null::uuid, null::text,
        'reordered'::text, null::text, null::text, target.draft_saved_at, target.draft_saved_by,
        (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p
          where p.id = target.draft_saved_by);
  end if;

  -- 3. Le plan à venir : neufs et modifiés.
  for item in select p from jsonb_array_elements(plan_items) p loop
    select * into element from public.contents c where c.id = (item ->> 'id')::uuid;
    old_version_id := (live_map ->> element.id::text)::uuid;
    select * into checked from private.try_prepare(element);
    element_change := case
      when old_version_id is null then 'new'
      when checked.problem is not null
        or checked.body_hash is distinct from (
          select v.body_hash from public.versions v where v.id = old_version_id
        ) then 'modified'
    end;
    if element_change is not null then
      return query
        select element.id, element.kind, nullif(element.title, ''),
          case when element.kind <> 'chapter' then (item ->> 'chapterId')::uuid end,
          case when element.kind <> 'chapter' then (
            select nullif(ch.title, '') from public.contents ch where ch.id = (item ->> 'chapterId')::uuid
          ) end,
          (item ->> 'lessonId')::uuid,
          (select nullif(le.title, '') from public.contents le where le.id = (item ->> 'lessonId')::uuid),
          element_change, checked.problem, checked.problem_detail, element.draft_saved_at,
          element.draft_saved_by,
          (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p
            where p.id = element.draft_saved_by);
    end if;
  end loop;

  -- 4. Ce qui sort du plan.
  for item in
    select o from jsonb_array_elements(old_items) o
    where not exists (select 1 from jsonb_array_elements(plan_items) p where p ->> 'id' = o ->> 'id')
  loop
    select * into element from public.contents c where c.id = (item ->> 'id')::uuid;
    return query
      select element.id, element.kind, nullif(element.title, ''),
        case when element.kind <> 'chapter' then (item ->> 'chapterId')::uuid end,
        case when element.kind <> 'chapter' then (
          select nullif(ch.title, '') from public.contents ch where ch.id = (item ->> 'chapterId')::uuid
        ) end,
        (item ->> 'lessonId')::uuid,
        (select nullif(le.title, '') from public.contents le where le.id = (item ->> 'lessonId')::uuid),
        'removed'::text, null::text, null::text, element.draft_saved_at, element.draft_saved_by,
        (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p
          where p.id = element.draft_saved_by);
  end loop;
end;
$$;

revoke execute on function public.publish_preview(uuid) from public, anon;
grant execute on function public.publish_preview(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- La Corbeille : un exercice porte le titre de sa méthode
-- ---------------------------------------------------------------------------------------------

-- Mêmes colonnes que la vue du ménage (migration précédente) ; parent_title d'un chapitre, d'une
-- leçon ou d'un exercice : le titre de sa méthode.
create or replace view public.trash_items
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
  nullif(
    case c.kind
      when 'lesson' then grand.title
      when 'exercise' then great.title
      else parent.title
    end,
    ''
  ),
  c.trash_batch,
  c.deleted_at,
  coalesce(p.full_name, p.email),
  c.deleted_at + interval '30 days',
  null::text,
  parent.id is null or parent.trash_batch is distinct from c.trash_batch
from public.contents c
left join public.contents parent on parent.id = c.parent_id
left join public.contents grand on grand.id = parent.parent_id
left join public.contents great on great.id = grand.parent_id
left join public.profiles p on p.id = c.deleted_by
where c.deleted_at is not null;

comment on view public.trash_items is
  'La corbeille : fichiers (item_type file) et contenus (item_type content). purge_at : '
  'effacement automatique au bout de 30 jours ; batch_root : l''élément mis à la corbeille (les '
  'chapitres, leçons et exercices partis avec leur parent ont le même trash_batch).';

-- ---------------------------------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------------------------------

-- Aucune fonction de private n'est exécutable par anon ni authenticated, sauf reader_can_open
-- (politique de Storage) : § 4.5, vérifié par supabase/tests/05_prive.test.sql.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

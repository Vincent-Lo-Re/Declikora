-- Publication (étape 5, partie base n° 2) : corbeille des contenus, règle « public ou protégé »
-- des fichiers, lecture des fichiers protégés par les lecteurs, emplacement des fichiers pour
-- l'app, et mise à jour des textes figés d'un fichier dans les contenus en ligne ([D30] option B).
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.9, § 2.4, § 3.6, § 4.4, § 4.5, § 5.1, § 5.2,
-- « Étape 5 ») et les décisions D6, D18, D24, D30, D36, question 1 (réponse B).
--
-- Cette migration ne fait que TRANSFORMER l'existant sans perte (les étapes 1 à 4 sont en
-- production) : nouvelles fonctions, fonctions remplacées (create or replace) avec la même
-- signature, vue trash_items remplacée avec les mêmes colonnes (plus une, à la fin).
--
-- Laissé à l'étape 7 (méthodes) : le retrait d'un chapitre ou d'une leçon du plan en ligne quand
-- on le met seul à la corbeille ([D36]) et, dans media_push, la nouvelle version de la méthode
-- quand le fichier est cité par une leçon (points marqués « Étape 7 » ci-dessous).

-- ---------------------------------------------------------------------------------------------
-- Règle « public ou protégé » (§ 4.4) et lecture par les lecteurs (§ 4.5)
-- ---------------------------------------------------------------------------------------------

-- Les fichiers qui doivent être publics : ceux d'une version en ligne gratuite (niveau réel null,
-- leçon gratuite comprise à l'étape 7, [D24]), et l'image de présentation de toute version en
-- ligne, quel que soit son niveau (question 1, réponse B : elle sert de vitrine).
create function private.public_media()
returns table (media_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct cited.id
  from private.live l
  join public.versions v on v.id = l.version_id
  cross join lateral unnest(v.media_ids) cited (id)
  where l.level_id is null
  union
  select v.cover_media_id
  from private.live l
  join public.versions v on v.id = l.version_id
  where v.cover_media_id is not null
$$;

-- Les fichiers à déplacer (lu par la fonction « files » à travers files_worklist) : la règle
-- ci-dessus comparée à media.is_public, en une seule requête. Même signature qu'à l'étape 3.
create or replace function private.files_to_move()
returns table (media_id uuid, path text, to_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.path, (w.media_id is not null)
  from public.media m
  left join private.public_media() w on w.media_id = m.id
  where m.status = 'ready'
    and m.purge_requested_at is null
    and m.is_public <> (w.media_id is not null)
$$;

-- Parmi ces fichiers, ceux que le lecteur connecté (auth.uid(), ou anonyme) a le droit de voir :
-- cités par une version en ligne gratuite, ou d'un rang que sa formule atteint
-- (private.reader_rank()), ou image de présentation d'une version en ligne. Le cas « gratuit »
-- couvre la minute où un fichier attend encore d'être déplacé vers le bucket public.
create function private.visible_media(ids uuid[])
returns table (media_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with reader as (
    select private.reader_rank() as rank
  )
  select distinct wanted.id
  from unnest(ids) wanted (id)
  cross join reader
  where wanted.id is not null
    and exists (
      select 1
      from private.live l
      join public.versions v on v.id = l.version_id
      where v.media_ids @> array[wanted.id]
        and (
          l.level_id is null
          or v.cover_media_id = wanted.id
          or reader.rank >= l.level_rank
        )
    )
$$;

-- Un lecteur (anonyme ou abonné) peut-il lire cet objet du bucket protégé (politique de
-- Storage, § 4.5) ? L'objet doit être EXACTEMENT le fichier d'une ligne media (premier dossier =
-- son identifiant, nom = son chemin), et ce fichier visible pour lui (private.visible_media).
-- Seule fonction de private exécutable par anon et authenticated (droits gardés par
-- create or replace).
create or replace function private.reader_can_open(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if object_name is null
    or object_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/' then
    return false;
  end if;
  target := split_part(object_name, '/', 1)::uuid;
  return exists (select 1 from public.media m where m.id = target and m.path = object_name)
    and exists (select 1 from private.visible_media(array[target]));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Textes figés d'un fichier dans les versions en ligne ([D30] option B)
-- ---------------------------------------------------------------------------------------------

-- Les contenus en ligne (racines) dont la version cite ce fichier avec un texte figé différent
-- de celui de la médiathèque : texte alternatif ou transcription de files, ou texte alternatif
-- d'une image qui suit la médiathèque (marqueur altFromLibrary, encadrés compris).
-- Étape 7 : les chapitres et les leçons cités par un plan en ligne.
create function private.media_stale_live(target_media_id uuid)
returns table (content_id uuid, version_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, v.id
  from public.media m
  join public.versions v on v.media_ids @> array[m.id]
  join public.contents c on c.live_version_id = v.id and c.id = v.content_id
  join private.live l on l.version_id = v.id and l.content_id = c.id
  where m.id = target_media_id
    and (
      (v.files -> m.id::text -> 'alt') is distinct from coalesce(to_jsonb(m.alt), 'null'::jsonb)
      or (v.files -> m.id::text -> 'transcript')
        is distinct from coalesce(to_jsonb(m.transcript), 'null'::jsonb)
      or jsonb_path_exists(
        v.body,
        'lax $.blocks.** ? (@.type == "image" && @.mediaId == $mid && @.altFromLibrary == true && @.alt != $alt)',
        jsonb_build_object('mid', m.id::text, 'alt', coalesce(m.alt, ''))
      )
    )
$$;

-- Une image de ce fichier qui suit la médiathèque (altFromLibrary) reçoit ce texte alternatif
-- (chaîne vide s'il n'y en a pas, comme à la publication, § 2.4).
create function private.library_alt(block jsonb, target_media_id uuid, alt text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'image'
      and block ->> 'mediaId' = target_media_id::text
      and block -> 'altFromLibrary' = 'true'::jsonb
    then block || jsonb_build_object('alt', coalesce(alt, ''))
    else block
  end
$$;

-- Le corps d'une version dont les images de ce fichier qui suivent la médiathèque reçoivent ce
-- texte alternatif (premier niveau et encadrés). Le reste ne change pas.
create function private.body_with_library_alt(body jsonb, target_media_id uuid, alt text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_set(
    body,
    '{blocks}',
    coalesce(
      (
        select jsonb_agg(
          case
            when b ->> 'type' = 'box' then
              jsonb_set(
                b,
                '{blocks}',
                coalesce(
                  (
                    select jsonb_agg(
                      private.library_alt(inner_block, target_media_id, alt)
                      order by inner_position
                    )
                    from jsonb_array_elements(b -> 'blocks')
                      with ordinality inner_list (inner_block, inner_position)
                  ),
                  '[]'::jsonb
                )
              )
            else private.library_alt(b, target_media_id, alt)
          end
          order by n
        )
        from jsonb_array_elements(coalesce(body -> 'blocks', '[]'::jsonb)) with ordinality list (b, n)
      ),
      '[]'::jsonb
    )
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Corbeille des contenus (§ 3.6)
-- ---------------------------------------------------------------------------------------------

-- La corbeille : fichiers et contenus (chapitres et leçons compris, avec le titre de leur
-- méthode dans parent_title ; modèles compris). Mêmes colonnes qu'à l'étape 3, plus batch_root :
-- vrai pour l'élément qu'on a mis à la corbeille (et pour chaque fichier), faux pour les
-- chapitres et les leçons partis avec lui dans le même lot (trash_batch). Un fichier dont
-- l'effacement est déjà demandé n'y figure plus.
-- security_invoker : les politiques de media et de contents s'appliquent (équipe en aal2).
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
  m.deleted_by,
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
  c.deleted_by,
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

revoke all on public.trash_items from anon, authenticated;
grant select on public.trash_items to authenticated;

-- « Mettre à la corbeille » un contenu (toutes les sortes, modèles compris) :
--   - retire de l'app (live_version_id vidé) et annule la programmation (et son échec) ;
--   - une méthode emporte ses chapitres et ses leçons (hors corbeille) dans le même lot ; un
--     chapitre emporte ses leçons ; un chapitre ou une leçon peut partir seul ([D36]) ;
--   - refuse si un AUTRE membre écrit un des éléments du lot (verrou_tenu, comme [D14]) ;
--   - refuse un modèle « bloc identique partout » cité par un brouillon, corbeille comprise
--     (modele_utilise, avec la liste) ;
--   - libère les verrous du lot (holder_id null : les lecteurs Realtime le voient).
-- Rejouable : un contenu déjà dans la corbeille renvoie son lot, 0 élément.
-- Renvoie le lot (pour « Annuler » : restore), le nombre d'éléments mis à la corbeille et
-- needs_file_sync (l'admin appelle alors la fonction « files »).
-- Étape 7 : un chapitre ou une leçon mis seul à la corbeille sort aussi du plan en ligne de sa
-- méthode (nouvelle version origin = 'outline', comme unpublish, [D36]).
create function public.trash(content_id uuid)
returns table (trash_batch uuid, trashed integer, needs_file_sync boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  me uuid := (select auth.uid());
  target public.contents;
  scope uuid[];
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

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = any (scope)
    and l.holder_id is not null;

  return query select batch, affected, exists (select 1 from private.files_to_move());
end;
$$;

-- « Restaurer » depuis la corbeille : tout le lot de ce contenu revient EN BROUILLON, sans être
-- republié ([D18]). Refuse si le parent de l'élément (chapitre ou méthode) est encore dans la
-- corbeille (parent_dans_la_corbeille). Un chapitre ou une leçon restauré seul revient en fin de
-- liste de son parent, avec « Montrer dans l'app » décoché ; ce qui est parti avec lui garde sa
-- place. Une page dont l'adresse a été prise entre-temps par une autre page revient sans
-- adresse (avertissement adresse_retiree).
-- Rejouable : un contenu hors corbeille renvoie 0 élément.
-- Renvoie le nombre d'éléments restaurés et les avertissements.
create function public.restore(content_id uuid)
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
            case when parent.kind = 'method' then 'la méthode' else 'le chapitre' end,
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

-- Vide la corbeille : la sélection (items = [{"type": "file" | "content", "id": "…"}]) ou tout
-- (null ; l'admin envoie toujours la liste explicite des éléments affichés). Même signature
-- qu'à l'étape 3.
--   - contenus : effacés tout de suite (la cascade emporte leurs chapitres et leçons, versions,
--     catégories et verrous) ; seulement ceux qui sont dans la corbeille ;
--   - fichiers : effacement demandé ; la fonction « files » efface ensuite l'objet puis la ligne
--     (l'admin l'appelle aussitôt). Les contenus partent d'abord : leurs brouillons ne comptent
--     plus dans « où il est utilisé » quand la fonction « files » relit les fichiers.
-- Renvoie le nombre d'éléments concernés (contenus de la liste, ou tous ceux de la corbeille,
-- plus les fichiers).
create or replace function public.empty_trash(items jsonb default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_ids uuid[];
  content_ids uuid[];
  contents_affected integer;
  files_affected integer;
begin
  perform private.require_staff();

  if items is not null then
    if jsonb_typeof(items) <> 'array' or exists (
      select 1
      from jsonb_array_elements(items) item
      where jsonb_typeof(item) <> 'object'
        or coalesce(item ->> 'type', '') not in ('file', 'content')
        or coalesce(item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'demande_invalide',
        detail = 'La sélection doit être une liste de { "type": "file" ou "content", "id": "…" }.';
    end if;

    select
      coalesce(array_agg((item ->> 'id')::uuid) filter (where item ->> 'type' = 'file'), '{}'),
      coalesce(array_agg((item ->> 'id')::uuid) filter (where item ->> 'type' = 'content'), '{}')
    into file_ids, content_ids
    from jsonb_array_elements(items) item;
  end if;

  delete from public.contents c
  where c.deleted_at is not null
    and (items is null or c.id = any (content_ids));
  get diagnostics contents_affected = row_count;

  update public.media m
  set purge_requested_at = now(), purge_error = null
  where m.deleted_at is not null
    and m.purge_requested_at is null
    and (items is null or m.id = any (file_ids));
  get diagnostics files_affected = row_count;

  return contents_affected + files_affected;
end;
$$;

-- Tâche « corbeille » (chaque jour) : ce qui est dans la corbeille depuis plus de 30 jours.
-- Les contenus sont effacés en SQL (la cascade emporte versions, catégories et verrous) ; pour
-- les fichiers, l'effacement est demandé, puis fait par la fonction « files ». Renvoie le nombre
-- d'éléments concernés.
create or replace function private.purge_trash()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  contents_affected integer;
  files_affected integer;
begin
  delete from public.contents c
  where c.deleted_at < now() - interval '30 days';
  get diagnostics contents_affected = row_count;

  update public.media m
  set purge_requested_at = now(), purge_error = null
  where m.deleted_at < now() - interval '30 days'
    and m.purge_requested_at is null;
  get diagnostics files_affected = row_count;

  return contents_affected + files_affected;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Fiche d'un fichier : contenus en ligne dont le texte figé est ancien ([D30] option B)
-- ---------------------------------------------------------------------------------------------

-- Les contenus en ligne qui citent ce fichier avec un texte figé différent de celui de la
-- médiathèque (texte alternatif ou transcription) : « Mettre à jour ces N contenus dans l'app ».
create function public.media_outdated(media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  version_id uuid,
  version_number integer,
  published_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return query
    select c.id, c.kind, nullif(v.body ->> 'title', ''), v.id, v.number, v.published_at
    from private.media_stale_live(media_outdated.media_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id;
end;
$$;

-- « Mettre à jour ces N contenus dans l'app » : pour chaque contenu de media_outdated, écrit une
-- nouvelle version ÉGALE à la version en ligne, dont seuls les textes de ce fichier sont
-- remplacés par ceux de la médiathèque (files : alt et transcript ; images qui suivent la
-- médiathèque : alt), puis la met en ligne (origin = 'files', auteur = le membre qui clique).
-- Le brouillon n'est jamais publié par ce geste ; draft_rev reste celui de la version en ligne.
-- Renvoie les contenus mis à jour et leur nouvelle version. Les fichiers ne changent pas
-- d'emplacement (le niveau et les fichiers cités ne changent pas).
-- Étape 7 : pour une leçon ou un chapitre, écrire aussi une nouvelle version de la méthode.
create function public.media_push(media_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  me_name text;
  target public.media;
  stale record;
  src public.versions;
  new_body jsonb;
  new_files jsonb;
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

  select coalesce(nullif(p.full_name, ''), p.email) into me_name
  from public.profiles p where p.id = me;

  for stale in
    select s.content_id from private.media_stale_live(target.id) s order by s.content_id
  loop
    perform 1 from public.contents c where c.id = stale.content_id for update;

    -- Relu sous le verrou : une publication a pu passer entre-temps.
    select v.* into src
    from private.media_stale_live(target.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale.content_id;
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

    insert into public.versions (
      content_id, number, origin, body, body_hash, files, access_level_id, is_free, slug,
      category_ids, media_ids, cover_media_id, template_ids, block_types, outline, draft_rev,
      published_by, published_by_name
    )
    values (
      src.content_id,
      (select max(v.number) from public.versions v where v.content_id = src.content_id) + 1,
      'files',
      new_body,
      encode(
        sha256(convert_to(jsonb_build_array(new_body, new_files, src.is_free)::text, 'UTF8')),
        'hex'
      ),
      new_files,
      src.access_level_id,
      src.is_free,
      src.slug,
      src.category_ids,
      src.media_ids,
      src.cover_media_id,
      src.template_ids,
      src.block_types,
      src.outline,
      src.draft_rev,
      me,
      me_name
    )
    returning * into created;

    update public.contents c
    set live_version_id = created.id
    where c.id = src.content_id;

    return query select src.content_id, created.id, created.number;
  end loop;
end;
$$;

revoke execute on function
  public.trash(uuid),
  public.restore(uuid),
  public.media_outdated(uuid),
  public.media_push(uuid)
from public, anon;
grant execute on function
  public.trash(uuid),
  public.restore(uuid),
  public.media_outdated(uuid),
  public.media_push(uuid)
to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Lecture de l'app : emplacement réel des fichiers (§ 5.1, § 5.2)
-- ---------------------------------------------------------------------------------------------

-- Pour chaque fichier demandé que l'appelant a le droit de voir (private.visible_media), son
-- emplacement réel : « public » (adresse fixe, getPublicUrl) ou « protected » (lien temporaire,
-- createSignedUrls). Il peut changer sans nouvelle version : l'app ne le garde qu'une minute.
-- 500 fichiers au plus par appel (demande_invalide au-delà). Les autres sont ignorés.
create function public.app_file_locations(media_ids uuid[])
returns table (media_id uuid, location text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if cardinality(app_file_locations.media_ids) > 500 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = '500 fichiers au plus par appel.';
  end if;

  return query
    select m.id, case when m.is_public then 'public' else 'protected' end
    from private.visible_media(app_file_locations.media_ids) seen
    join public.media m on m.id = seen.media_id
    order by m.id;
end;
$$;

revoke execute on function public.app_file_locations(uuid[]) from public;
grant execute on function public.app_file_locations(uuid[]) to anon, authenticated, service_role;

-- Filet de sécurité : aucune fonction de private n'est exécutable par anon ni authenticated,
-- sauf reader_can_open (politique de Storage).
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

-- Corrections relevées en comparant les textes de l'admin au code (08/10/2026, QCM).

-- ---------------------------------------------------------------------------------------------
-- 1. Remplacer un fichier (Médiathèque › Remplacer…)
-- ---------------------------------------------------------------------------------------------
-- - Les brouillons des contenus à la Corbeille reçoivent aussi le nouveau fichier : restaurés, ils
--   montrent le bon fichier, et l'ancien n'est plus « utilisé » par eux (il pouvait ne jamais
--   partir à la corbeille).
-- - Le texte alternatif et la transcription de l'ancien fichier passent au nouveau, s'il n'en a
--   pas : les images et les audios de l'app ne perdent pas leur description.
-- - Le nom de qui écrit un brouillon gardé : son nom, sinon son e-mail, sinon null (l'admin écrit
--   « Quelqu'un » dans sa langue).

create or replace function public.media_replace(old_id uuid, new_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  pair record;
  target record;
  holder text;
  replaced integer := 0;
  kept jsonb := '[]'::jsonb;
begin
  perform private.require_staff();
  select * into pair from private.replacement_pair(media_replace.old_id, media_replace.new_id);

  update public.media m
  set alt = coalesce(nullif(btrim(m.alt), ''), (pair.old_media).alt),
    transcript = coalesce(nullif(btrim(m.transcript), ''), (pair.old_media).transcript)
  where m.id = media_replace.new_id
    and (
      (nullif(btrim(m.alt), '') is null and (pair.old_media).alt is not null)
      or (nullif(btrim(m.transcript), '') is null and (pair.old_media).transcript is not null)
    );

  -- Le brouillon d'un contenu à la Corbeille change aussi : la même permission que « Détacher
  -- partout » (contents_trash_guard n'accepte alors que le brouillon), le temps de la boucle.
  perform set_config('declikora.detach_all', 'on', true);

  for target in
    select c.id, c.title from public.contents c
    where c.draft_media_ids @> array[media_replace.old_id]
    order by c.id
    for update
  loop
    select coalesce(nullif(p.full_name, ''), p.email) into holder
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

  perform set_config('declikora.detach_all', '', true);

  return jsonb_build_object('replaced', replaced, 'kept', kept);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Les faits des erreurs, sans phrase : hint
-- ---------------------------------------------------------------------------------------------
-- L'admin parle plusieurs langues : la base donne les faits, l'admin écrit la phrase. Le detail
-- garde sa phrase en français (journaux, Sentry), mais l'admin ne l'affiche plus. Tout ce que
-- l'admin doit nommer (titres, noms de fichiers, numéros de blocs) part aussi dans hint, sans un
-- mot de français :
--   - une liste en tableau JSON, une valeur absente en null (« Sans titre » s'écrit dans l'admin) :
--     fichier_utilise, modele_utilise, modele_vide : ["Titre", null] ;
--     fichier_indisponible : [{"name": "photo.jpg", "state": "trashed"}], state valant
--     « missing » (le fichier n'existe plus, name null), « trashed » ou « pending » ;
--     fichier_inadapte : ["son.mp3"] ; image_sans_fichier : [2, 5] (numéros des blocs) ;
--   - verrou_tenu : le nom de qui écrit, '' s'il n'a ni nom ni e-mail (l'admin écrit
--     « Quelqu'un ») ; jamais null, les appelants testent « is not null ».
-- Les fonctions sont reprises telles quelles ; seuls hint et ces valeurs par défaut changent.
-- Les droits ne bougent pas : « create or replace » les garde.

-- Met un fichier à la corbeille. Refuse tant qu'il est utilisé (fichier_utilise, avec la liste).
-- « for update » : avec le « for share » du brouillon et de la publication (étapes 4 et 5), un
-- fichier ne peut pas partir à la corbeille pendant qu'un autre membre l'insère.
create or replace function public.media_trash(media_id uuid)
returns public.media
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.media;
  uses text;
  facts jsonb;
begin
  perform private.require_staff();

  select * into target from public.media m where m.id = media_trash.media_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe pas.';
  end if;

  if target.deleted_at is not null then
    return target;
  end if;

  select
    string_agg(coalesce(u.title, 'Sans titre'), ', ' order by u.title),
    jsonb_agg(u.title order by u.title, u.content_id)
  into uses, facts
  from private.media_uses(target.id) u;

  if uses is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_utilise',
      detail = 'Ce fichier est utilisé dans : ' || uses || '.',
      hint = facts::text;
  end if;

  update public.media m
  set deleted_at = now(), deleted_by = (select auth.uid()), purge_error = null
  where m.id = target.id
  returning * into target;
  return target;
end;
$$;

create or replace function private.contents_check_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shape_schema json;
  shape_ok boolean;
  shape_errors text[];
  media_ids uuid[];
  template_ids uuid[];
  added_templates uuid[];
  problem text;
  facts jsonb;
  block_count integer;
begin
  if new.draft is null then
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = 'Le brouillon manque.';
  end if;

  -- 0. Taille : le texte que range Postgres (un peu plus long que JSON.stringify).
  if octet_length(new.draft::text) > 262144 then
    raise exception using
      errcode = 'P0001',
      message = 'brouillon_trop_lourd',
      detail = 'Le brouillon dépasse 256 Ko.';
  end if;

  -- 1. Forme. Chemin rapide : jsonb_matches_schema ; les erreurs ne sont calculées qu'en cas
  -- d'échec. pg_jsonschema relit le document avec une limite de 128 niveaux d'imbrication
  -- (environ 30 niveaux de listes) : au-delà il lève XX000 au lieu de répondre faux.
  shape_schema := private.blocks_schema(
    case when new.kind = 'template' then 'template' else 'draft' end
  );
  begin
    shape_ok := extensions.jsonb_matches_schema(shape_schema, new.draft);
    if not shape_ok then
      shape_errors := extensions.jsonschema_validation_errors(shape_schema, new.draft::json);
    end if;
  exception
    when internal_error then
      raise exception using
        errcode = 'P0001',
        message = 'brouillon_trop_imbrique',
        detail = 'Le brouillon a trop de niveaux imbriqués (listes dans des listes).';
  end;
  if not shape_ok then
    -- Les messages de pg_jsonschema recopient la valeur fautive, qui peut être longue : les trois
    -- premiers seulement, 200 caractères chacun.
    raise exception using
      errcode = 'P0001',
      message = 'forme_invalide',
      detail = left(
        'Le brouillon n''a pas la forme attendue : '
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

  -- 2. Identifiants de blocs uniques (premier niveau et encadrés).
  if exists (
    select 1
    from (
      select b ->> 'id' as id
      from jsonb_array_elements(new.draft -> 'blocks') b
      union all
      select inner_block ->> 'id'
      from jsonb_array_elements(new.draft -> 'blocks') b
      cross join lateral jsonb_array_elements(
        case when b ->> 'type' = 'box' then b -> 'blocks' else '[]'::jsonb end
      ) inner_block
    ) ids
    group by ids.id
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'id_en_double',
      detail = 'Deux blocs du brouillon ont le même identifiant.';
  end if;

  -- 3. Fichiers et modèles cités, où qu'ils soient ([D9]).
  select coalesce(array_agg(distinct (v #>> '{}')::uuid), '{}')
  into media_ids
  from jsonb_path_query(new.draft, 'strict $.**.mediaId') v
  where jsonb_typeof(v) = 'string';

  select coalesce(array_agg(distinct (v #>> '{}')::uuid), '{}')
  into template_ids
  from jsonb_path_query(new.draft, 'strict $.**.templateId') v
  where jsonb_typeof(v) = 'string';

  -- 4. Fichiers : verrou partagé, puis disponibilité.
  if cardinality(media_ids) > 0 then
    perform 1 from public.media m where m.id = any (media_ids) order by m.id for share;

    select string_agg(
      case
        when m.id is null then 'un fichier qui n''existe plus'
        when m.deleted_at is not null then '« ' || m.name || ' » (dans la corbeille)'
        else '« ' || m.name || ' » (pas encore prêt)'
      end,
      ', ' order by m.name
    ),
    jsonb_agg(
      jsonb_build_object(
        'name', m.name,
        'state', case
          when m.id is null then 'missing'
          when m.deleted_at is not null then 'trashed'
          else 'pending'
        end
      )
      order by m.name
    )
    into problem, facts
    from unnest(media_ids) wanted (id)
    left join public.media m on m.id = wanted.id
    where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = left('Ce brouillon cite un fichier indisponible : ' || problem || '.', 1000),
        hint = facts::text;
    end if;
  end if;

  -- 4 bis. Modèles cités (blocs liés) : verrou partagé, puis disponibilité.
  if cardinality(template_ids) > 0 then
    perform 1 from public.contents t where t.id = any (template_ids) order by t.id for share;

    if exists (
      select 1
      from unnest(template_ids) wanted (id)
      left join public.contents t on t.id = wanted.id
      where t.id is null
        or t.id = new.id
        or t.kind <> 'template'
        or t.template_sort <> 'shared'
        or t.deleted_at is not null
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'modele_indisponible',
        detail = 'Ce brouillon cite un modèle qui n''existe pas, n''est pas un bloc partagé, '
          'ou est dans la corbeille.';
    end if;

    -- Un bloc partagé ajouté à ce brouillon doit avoir son bloc ([D11]). Seulement
    -- les modèles nouvellement cités : un modèle déjà cité ne peut plus être vidé (règle 5).
    added_templates := case
      when tg_op = 'UPDATE' then array(
        select x from unnest(template_ids) x where not (x = any (old.draft_template_ids))
      )
      else template_ids
    end;

    select
      string_agg('« ' || coalesce(nullif(t.title, ''), 'Sans titre') || ' »', ', ' order by t.title),
      jsonb_agg(nullif(t.title, '') order by t.title, t.id)
    into problem, facts
    from public.contents t
    where t.id = any (added_templates)
      and jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) = 0;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_vide',
        detail = left('Ce modèle est encore vide : ' || problem || '. Ajoute-lui son bloc avant de '
          'l''insérer.', 1000),
        hint = facts::text;
    end if;
  end if;

  -- 5. Un bloc partagé : un seul bloc ([D11]) ; il le garde tant qu'il est utilisé.
  if new.kind = 'template' and new.template_sort = 'shared' then
    block_count := jsonb_array_length(new.draft -> 'blocks');
    if block_count > 1 then
      raise exception using
        errcode = 'P0001',
        message = 'modele_un_seul_bloc',
        detail = 'Un bloc partagé contient un seul bloc : pour en regrouper plusieurs, '
          'mets-les dans un encadré.';
    end if;

    if block_count = 0 and tg_op = 'UPDATE' then
      select
        string_agg(coalesce(nullif(c.title, ''), 'Sans titre'), ', ' order by c.title, c.id),
        jsonb_agg(nullif(c.title, '') order by c.title, c.id)
      into problem, facts
      from public.contents c
      where c.draft_template_ids @> array[new.id]
        and c.id <> new.id;

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'modele_utilise',
          detail = left('Ce modèle est utilisé dans : ' || problem || '. Il garde son bloc tant '
            'qu''il est utilisé : détache-le d''abord.', 1000),
          hint = facts::text;
      end if;
    end if;
  end if;

  new.draft_media_ids := media_ids;
  new.draft_template_ids := template_ids;
  return new;
end;
$$;

-- Qui écrit en ce moment un de ces contenus (verrou tenu et signe de vie depuis moins de 90 s),
-- en dehors de except_member (null : n'importe qui). Nom, sinon e-mail, sinon '' (l'admin écrit
-- « Quelqu'un » dans sa langue).
create or replace function private.active_writer(scope uuid[], except_member uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(p.full_name, ''), p.email, '')
  from public.edit_locks l
  left join public.profiles p on p.id = l.holder_id
  where l.content_id = any (scope)
    and l.holder_id is not null
    and l.holder_id is distinct from except_member
    and l.heartbeat_at >= now() - private.lock_ttl()
  order by l.heartbeat_at desc
  limit 1
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
  facts jsonb;
  cited uuid[];
  frozen jsonb;
  shape_ok boolean;
  shape_errors text[];
  prepared public.versions;
begin
  -- Image de présentation (article, épisode : [D45]) et son d'un épisode.
  perform private.check_publish_requirements(target.kind, body);

  select string_agg(format('bloc n° %s', pos), ', ' order by pos), jsonb_agg(pos order by pos)
  into problem, facts
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
      detail = 'Une image n''a pas de fichier : ' || problem || '.',
      hint = facts::text;
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
    ),
    jsonb_agg(
      jsonb_build_object(
        'name', m.name,
        'state', case
          when m.id is null then 'missing'
          when m.deleted_at is not null then 'trashed'
          else 'pending'
        end
      )
      order by m.name
    )
    into problem, facts
    from unnest(cited) wanted (id)
    left join public.media m on m.id = wanted.id
    where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = left('Ce contenu cite un fichier indisponible : ' || problem || '.', 1000),
        hint = facts::text;
    end if;
  end if;

  -- Image de présentation et images des blocs : des images ; son d'un épisode : un audio.
  select
    string_agg(distinct '« ' || m.name || ' »', ', '),
    jsonb_agg(distinct m.name order by m.name)
  into problem, facts
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
      detail = left('Ce fichier n''est pas du bon type à cet endroit : ' || problem || '.', 1000),
      hint = facts::text;
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
  facts jsonb;
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
    select
      string_agg(coalesce(nullif(c.title, ''), 'Sans titre'), ', ' order by c.title, c.id),
      jsonb_agg(nullif(c.title, '') order by c.title, c.id)
    into uses, facts
    from public.contents c
    where c.draft_template_ids @> array[target.id]
      and c.id <> target.id;

    if uses is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_utilise',
        detail = left('Ce modèle est utilisé dans : ' || uses || '.', 1000),
        hint = facts::text;
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
  facts jsonb;
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
      ),
      jsonb_agg(
        jsonb_build_object(
          'name', m.name,
          'state', case
            when m.id is null then 'missing'
            when m.deleted_at is not null then 'trashed'
            else 'pending'
          end
        )
        order by m.name
      )
      into problem, facts
      from unnest(added) wanted (id)
      left join public.media m on m.id = wanted.id
      where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_indisponible',
          detail = left('Le modèle cite un fichier indisponible : ' || problem || '.', 1000),
          hint = facts::text;
      end if;

      select
        string_agg(distinct '« ' || m.name || ' »', ', '),
        jsonb_agg(distinct m.name order by m.name)
      into problem, facts
      from public.media m
      where m.id = any (added) and m.kind <> 'image';

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'fichier_inadapte',
          detail = left('Ce fichier n''est pas une image : ' || problem || '.', 1000),
          hint = facts::text;
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
    coalesce(nullif(p.full_name, ''), p.email, '') as name,
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
        coalesce(nullif(writer.name, ''), 'Un autre membre'), writer.title
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

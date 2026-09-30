-- « Bloc identique partout » s'appelle désormais « Bloc partagé » dans l'administration
-- (30/09/2026). Les messages que la base renvoie à l'admin suivent : les cinq fonctions qui en
-- parlent sont reprises telles quelles, seuls leurs messages et leurs commentaires changent.
-- Les droits (grant/revoke) ne bougent pas : « create or replace » les garde.


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
    )
    into problem
    from unnest(media_ids) wanted (id)
    left join public.media m on m.id = wanted.id
    where m.id is null or m.status <> 'ready' or m.deleted_at is not null;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'fichier_indisponible',
        detail = left('Ce brouillon cite un fichier indisponible : ' || problem || '.', 1000);
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

    select string_agg('« ' || coalesce(nullif(t.title, ''), 'Sans titre') || ' »', ', ' order by t.title)
    into problem
    from public.contents t
    where t.id = any (added_templates)
      and jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) = 0;

    if problem is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_vide',
        detail = left('Ce modèle est encore vide : ' || problem || '. Ajoute-lui son bloc avant de '
          'l''insérer.', 1000);
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
      select string_agg(coalesce(nullif(c.title, ''), 'Sans titre'), ', ' order by c.title, c.id)
      into problem
      from public.contents c
      where c.draft_template_ids @> array[new.id]
        and c.id <> new.id;

      if problem is not null then
        raise exception using
          errcode = 'P0001',
          message = 'modele_utilise',
          detail = left('Ce modèle est utilisé dans : ' || problem || '. Il garde son bloc tant '
            'qu''il est utilisé : détache-le d''abord.', 1000);
      end if;
    end if;
  end if;

  new.draft_media_ids := media_ids;
  new.draft_template_ids := template_ids;
  return new;
end;
$$;

create or replace function public.template_create_from(
  content_id uuid,
  block_ids uuid[],
  name text,
  sort text,
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
      'article', 'episode', 'chapter', 'lesson', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode, chapter, lesson '
        'ou page) ; les autres modèles n''en ont pas.';
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
  methods uuid[];
  stale_id uuid;
  src public.versions;
  element_method uuid;
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
  pending jsonb := '{}'::jsonb;
  pending_method text;
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

  -- Les méthodes des éléments concernés d'abord, puis les contenus (ordre des verrous commun).
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.template_stale_live(tpl.id) s;
  select coalesce(array_agg(distinct l.method_id), '{}') into methods
  from private.live l
  where l.content_id = any (stale_ids) and l.method_id is not null;
  perform 1 from public.contents c where c.id = any (methods) order by c.id for update;
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
    prepared.body_hash := private.version_hash(new_body, new_files, src.is_free);
    prepared.media_ids := cited;
    prepared.template_ids := private.template_ids_of(new_body);
    prepared.block_types := private.block_types_of(new_body);
    created := private.insert_version(prepared, 'template', me, src.outline);

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
      pending_method::uuid, pending -> pending_method, me, 'template'
    );
  end loop;
end;
$$;

create or replace function private.resolve_linked(draft jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  resolved jsonb := '[]'::jsonb;
  b jsonb;
  t public.contents;
  copy jsonb;
begin
  for b in
    select x.block
    from jsonb_array_elements(coalesce(draft -> 'blocks', '[]'::jsonb)) with ordinality x (block, n)
    order by x.n
  loop
    if b ->> 'type' = 'linked' then
      select * into t
      from public.contents c
      where c.id = (b ->> 'templateId')::uuid
      for share;

      if not found or t.kind <> 'template' or t.template_sort <> 'shared'
        or t.deleted_at is not null
        or jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) <> 1 then
        raise exception using
          errcode = 'P0001',
          message = 'modele_indisponible',
          detail = 'Ce contenu cite un bloc partagé dont le modèle n''existe plus, est '
            'dans la corbeille ou ne contient pas exactement un bloc.';
      end if;

      copy := (t.draft -> 'blocks' -> 0)
        || jsonb_build_object('id', b ->> 'id', 'templateId', b ->> 'templateId');
      if copy ->> 'type' = 'box' then
        copy := jsonb_set(
          copy,
          '{blocks}',
          coalesce(
            (
              select jsonb_agg(
                inner_block
                  || jsonb_build_object('id', md5((b ->> 'id') || '/' || (inner_block ->> 'id'))::uuid::text)
                order by inner_position
              )
              from jsonb_array_elements(copy -> 'blocks') with ordinality inner_list (inner_block, inner_position)
            ),
            '[]'::jsonb
          )
        );
      end if;
      b := copy;
    end if;
    resolved := resolved || jsonb_build_array(b);
  end loop;

  return jsonb_set(draft, '{blocks}', resolved);
end;
$$;

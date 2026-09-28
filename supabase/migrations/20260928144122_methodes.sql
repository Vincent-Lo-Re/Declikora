-- Méthodes (étape 7, partie 7b) : une méthode se publie d'un seul geste, avec sa fiche, son plan
-- figé et ses chapitres et leçons modifiés ([D29], réponse A).
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.7, § 1.8, § 3.2, § 3.4 à 3.6, § 4.4, § 5.1, « Étape 7 »)
-- et docs/ADMINISTRATION.md (§ 3, « Accès d'une méthode » et « Une méthode se publie d'un seul
-- geste »), décisions D4, D14, D17, D24, D26, D29, D31, D36, D43, D45.
--
-- Les migrations des étapes 1 à 7a sont en production (pages, articles, épisodes, versions,
-- formules, catégories, modèles ; aucune méthode publiée, puisque publish les refusait) : celle-ci
-- ne fait que transformer l'existant, sans rien effacer. Fonctions ajoutées ; fonctions et vue
-- remplacées avec la même signature (les mêmes colonnes, dans le même ordre) ; un déclencheur de
-- plus sur versions, qui ne regarde que les nouvelles lignes.
--   - Versions : le plan figé d'une méthode (versions.outline) est vérifié à l'insertion : chaque
--     versionId existe et appartient à un chapitre ou à une leçon de CETTE méthode (plan_invalide).
--   - private.live : les chapitres et les leçons cités par le plan de la version en ligne d'une
--     méthode, avec leur niveau réel (leçon gratuite : null ; introduction d'un chapitre : null
--     dès qu'une leçon du chapitre, en ligne dans le plan, est gratuite, sinon le niveau de la
--     méthode, [D43], private.chapter_intro_level). Tout ce qui s'appuie sur la vue suit : fichiers
--     publics ou protégés, lecture des fichiers protégés, « Où il est utilisé », app_content,
--     template_outdated, media_outdated.
--   - private.do_publish : la méthode se publie avec son plan (chapitres et leçons hors corbeille
--     dont « Montrer dans l'app » est coché ; réutilisation d'une version dont l'empreinte est la
--     même) ; [D45] pour la méthode (le refus sorte_invalide de l'étape 5 est levé) ; public.schedule
--     accepte les méthodes. Un élément invalide fait tout refuser, et l'erreur le nomme.
--   - publish_preview (ce qui va changer dans l'app), outline_reorder (ranger chapitres et leçons),
--     unpublish d'un chapitre ou d'une leçon ([D26]), trash d'un chapitre ou d'une leçon seul
--     ([D36]) : nouvelle version de la méthode, origin = 'outline' ; template_push et media_push
--     pour les chapitres et les leçons (nouvelle version de la méthode dont le plan pointe vers les
--     nouvelles versions).
--   - Lecture de l'app : app_method (la fiche et le plan figé) ; app_content donne aussi
--     methodId et isFree.
--
-- Ordre des verrous de ligne (pour qu'aucun geste n'attende un autre en sens inverse) : la
-- méthode d'abord, puis ses chapitres et ses leçons. do_publish, outline_reorder, unpublish,
-- trash, template_push et media_push le suivent.
--
-- Conventions (§ 1.1) : les RPC de l'admin sont « security definer » et refusent d'abord si
-- is_staff() est faux (42501 reserve_a_l_equipe) ; les autres erreurs ont le code P0001, un
-- message court et stable (traduit par web/src/texts.ts) et un « detail » en français.

-- ---------------------------------------------------------------------------------------------
-- Aides internes : une version préparée à partir d'un brouillon
-- ---------------------------------------------------------------------------------------------

-- Empreinte d'une version (§ 1.7) : corps résolu, fichiers figés et is_free. Le même calcul
-- qu'aux étapes 5 et 6 (do_publish, template_push, media_push) : une leçon inchangée garde la
-- même empreinte, et sa version est réutilisée.
create function private.version_hash(body jsonb, files jsonb, is_free boolean)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_array(body, files, is_free)::text, 'UTF8')), 'hex')
$$;

-- Les informations figées de ces fichiers ([D30]) : mediaId → { kind, mime, path, alt,
-- transcript, width, height, durationS }.
create function private.frozen_files(ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(
      m.id::text,
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
    ),
    '{}'::jsonb
  )
  from public.media m
  where m.id = any (ids)
$$;

-- Les modèles recopiés dans un corps (marqueurs templateId), triés.
create function private.template_ids_of(body jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct (v #>> '{}')::uuid order by (v #>> '{}')::uuid), '{}')
  from jsonb_path_query(body, 'strict $.**.templateId') v
  where jsonb_typeof(v) = 'string'
$$;

-- Les sortes de blocs d'un corps (premier niveau et encadrés), triées.
create function private.block_types_of(body jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct t order by t), '{}')
  from (
    select top_block ->> 'type' as t
    from jsonb_array_elements(coalesce(body -> 'blocks', '[]'::jsonb)) top_block
    union all
    select inner_block ->> 'type'
    from jsonb_array_elements(coalesce(body -> 'blocks', '[]'::jsonb)) top_block
    cross join lateral jsonb_array_elements(
      case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
    ) inner_block
  ) types
$$;

-- La version que donnerait ce brouillon (pas encore écrite : ni id, ni numéro, ni origine, ni
-- plan, ni auteur). resolved : le brouillon dont les blocs liés sont déjà résolus
-- (private.resolve_linked). Les contrôles de l'étape 5 et de la partie 7a, dans le même ordre :
--   - image de présentation (article, épisode, méthode : [D45]) et son d'un épisode ;
--   - aucune image sans fichier ;
--   - fichiers verrouillés en partage (for share, comme le déclencheur du brouillon), puis prêts,
--     hors corbeille et de la bonne sorte ;
--   - textes alternatifs résolus, variante « published » du schéma, fichiers figés, empreinte.
create function private.prepare_version(target public.contents, resolved jsonb)
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
  -- Image de présentation (article, épisode, méthode : [D45]) et son d'un épisode.
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
  prepared.body_hash := private.version_hash(body, frozen, target.is_free);
  prepared.access_level_id := target.access_level_id;
  prepared.is_free := target.is_free;
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

-- Écrit une version préparée (numéro suivant du contenu ; auteur et son nom recopié).
-- plan : le plan figé d'une méthode, null pour les autres sortes (vérifié par le déclencheur
-- versions_outline).
create function private.insert_version(
  prepared public.versions,
  version_origin text,
  author_id uuid,
  plan jsonb
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
    content_id, number, origin, body, body_hash, files, access_level_id, is_free, slug,
    category_ids, media_ids, cover_media_id, template_ids, block_types, outline, draft_rev,
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
    prepared.is_free,
    prepared.slug,
    prepared.category_ids,
    prepared.media_ids,
    prepared.cover_media_id,
    prepared.template_ids,
    prepared.block_types,
    plan,
    prepared.draft_rev,
    author_id,
    (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = author_id)
  )
  returning * into created;
  return created;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Le plan figé d'une méthode (versions.outline, § 1.8)
-- ---------------------------------------------------------------------------------------------

-- La forme d'un plan : [{ "chapterId", "versionId", "lessons": [{ "lessonId", "versionId" }] }],
-- rien d'autre, des UUID en minuscules.
create function private.outline_shape_ok(plan jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  chapter_entry jsonb;
  lesson_entry jsonb;
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
      if (select array_agg(k order by k) from jsonb_object_keys(lesson_entry) k)
        is distinct from array['lessonId', 'versionId'] then
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
    end loop;
  end loop;
  return true;
end;
$$;

-- Déclencheur (avant l'insertion d'une version) : seule une méthode a un plan, et il a la forme
-- attendue ; chaque chapitre est un chapitre de cette méthode, chaque leçon une leçon d'un de ses
-- chapitres (elle peut avoir changé de chapitre dans le brouillon depuis), chacun une seule fois,
-- et chaque versionId est une version de cet élément. Les versions existantes ne sont pas
-- relues (aucune méthode n'était publiée avant cette étape).
create function private.versions_check_outline()
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
      detail = 'Le plan d''une méthode est une liste de chapitres, chacun avec ses leçons.';
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
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_invalide',
      detail = 'Un chapitre ou une leçon apparaît deux fois dans le plan.';
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
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'plan_invalide',
      detail = 'Le plan cite une version qui n''est pas celle d''un chapitre ou d''une leçon de '
        'cette méthode.';
  end if;

  return new;
end;
$$;

create trigger versions_outline
  before insert on public.versions
  for each row execute function private.versions_check_outline();

-- Les versions citées par un plan : { "<id du chapitre ou de la leçon>": "<versionId>" }.
create function private.outline_versions(plan jsonb)
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
  ) x
$$;

-- Le plan sans ces éléments (un chapitre retiré emporte ses leçons du plan).
create function private.outline_without(plan jsonb, removed uuid[])
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
            select jsonb_agg(lesson_entry order by m)
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

-- Le plan dont ces versions sont remplacées : replacements = { "<ancien versionId>": "<nouveau>" }.
create function private.outline_with_versions(plan jsonb, replacements jsonb)
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
              lesson_entry || jsonb_build_object(
                'versionId',
                coalesce(replacements -> (lesson_entry ->> 'versionId'), lesson_entry -> 'versionId')
              )
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

-- La méthode d'un chapitre ou d'une leçon (la méthode elle-même pour une méthode ; null sinon).
create function private.method_of(target_content_id uuid)
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
  end
  from public.contents c
  where c.id = target_content_id
$$;

-- Nouvelle version de la méthode (en ligne, hors corbeille) : ÉGALE à sa version en ligne, avec
-- ce plan, puis mise en ligne. Rien si la méthode n'est pas en ligne ou si le plan ne change pas.
-- La ligne de la méthode doit déjà être verrouillée (for update) par l'appelant.
-- Renvoie la version écrite, ou null.
create function private.write_method_outline(
  target_method_id uuid,
  plan jsonb,
  author_id uuid,
  version_origin text
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  src public.versions;
  created public.versions;
begin
  select v.* into src
  from public.contents c
  join public.versions v on v.id = c.live_version_id and v.content_id = c.id
  where c.id = target_method_id and c.kind = 'method' and c.deleted_at is null;
  if not found or src.outline is not distinct from plan then
    return null;
  end if;

  created := private.insert_version(src, version_origin, author_id, plan);

  update public.contents c
  set live_version_id = created.id
  where c.id = target_method_id;

  return created;
end;
$$;

-- Retire ces éléments du plan en ligne de la méthode (retrait de l'app [D26], corbeille [D36]) :
-- nouvelle version de la méthode, origin = 'outline'. Rien si aucun n'y figure.
create function private.remove_from_live_outline(
  target_method_id uuid,
  removed uuid[],
  author_id uuid
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  live_plan jsonb;
begin
  select v.outline into live_plan
  from public.contents c
  join public.versions v on v.id = c.live_version_id and v.content_id = c.id
  where c.id = target_method_id and c.kind = 'method' and c.deleted_at is null;
  if not found then
    return null;
  end if;
  return private.write_method_outline(
    target_method_id, private.outline_without(live_plan, removed), author_id, 'outline'
  );
end;
$$;

-- Fait pointer le plan en ligne de la méthode vers de nouvelles versions de ses éléments
-- (template_push : origin = 'template' ; media_push : origin = 'files'). Rien si le plan ne
-- change pas.
create function private.replace_in_live_outline(
  target_method_id uuid,
  replacements jsonb,
  author_id uuid,
  version_origin text
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  live_plan jsonb;
begin
  select v.outline into live_plan
  from public.contents c
  join public.versions v on v.id = c.live_version_id and v.content_id = c.id
  where c.id = target_method_id and c.kind = 'method' and c.deleted_at is null;
  if not found then
    return null;
  end if;
  return private.write_method_outline(
    target_method_id, private.outline_with_versions(live_plan, replacements), author_id,
    version_origin
  );
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Contenus en ligne : private.live étendu aux chapitres et aux leçons (§ 1.8, § 3.2)
-- ---------------------------------------------------------------------------------------------

-- Niveau réel de l'introduction d'un chapitre ([D43], question 2 décidée le 28/09/2026) : gratuite
-- (null) dès qu'une leçon du chapitre, en ligne dans le plan (hors corbeille, version de cette
-- leçon), est gratuite ; sinon le niveau de la méthode.
--   method_level_id : le niveau de la version en ligne de la méthode ;
--   chapter_entry : l'entrée du chapitre dans le plan figé ({ chapterId, versionId, lessons }).
create function private.chapter_intro_level(method_level_id uuid, chapter_entry jsonb)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when method_level_id is null then null
    when exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(chapter_entry -> 'lessons') = 'array'
          then chapter_entry -> 'lessons' else '[]'::jsonb end
      ) lesson_entry
      join public.contents le on le.id = (lesson_entry ->> 'lessonId')::uuid and le.deleted_at is null
      join public.versions lv on lv.id = (lesson_entry ->> 'versionId')::uuid and lv.content_id = le.id
      where lv.is_free
    ) then null
    else method_level_id
  end
$$;

-- Toutes les versions EN LIGNE, avec leur niveau réel (level_id, level_rank ; null = gratuit).
-- Mêmes colonnes qu'à l'étape 5, dans le même ordre :
--   - racines (article, épisode, méthode, page) hors corbeille dont live_version_id est
--     renseigné : le niveau de leur version ; method_id null ;
--   - chapitres et leçons cités par le plan de la version en ligne d'une méthode (hors
--     corbeille, eux comme la méthode) : method_id ; niveau d'une leçon : null si sa version a
--     is_free, sinon celui de la méthode ; niveau d'une introduction : private.chapter_intro_level
--     ([D43]).
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
where m.kind = 'method' and m.deleted_at is null;

comment on view private.live is
  'Les versions en ligne et leur niveau réel (null = gratuit) : racines, et chapitres et leçons '
  'cités par le plan en ligne d''une méthode (leçon gratuite ; introduction : [D43]).';

revoke all on private.live from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Publication : la méthode avec son plan ([D29]), les autres sortes comme avant
-- ---------------------------------------------------------------------------------------------

-- Le nom d'un élément dans une erreur (« Chapitre 2 « Respirer » », « Chapitre 2, leçon 3
-- « Le souffle » ») : la place qu'il a dans l'arbre de l'admin (chapitres et leçons hors corbeille,
-- dans l'ordre).
create function private.element_label(element public.contents)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case element.kind
    when 'chapter' then format(
      'Chapitre %s « %s »',
      (
        select count(*) from public.contents s
        where s.parent_id = element.parent_id and s.deleted_at is null
          and (s.position, s.id) <= (element.position, element.id)
      ),
      coalesce(nullif(element.draft ->> 'title', ''), 'Sans titre')
    )
    else format(
      'Chapitre %s, leçon %s « %s »',
      (
        select count(*) from public.contents s
        join public.contents ch on ch.id = element.parent_id
        where s.parent_id = ch.parent_id and s.deleted_at is null
          and (s.position, s.id) <= (ch.position, ch.id)
      ),
      (
        select count(*) from public.contents s
        where s.parent_id = element.parent_id and s.deleted_at is null
          and (s.position, s.id) <= (element.position, element.id)
      ),
      coalesce(nullif(element.draft ->> 'title', ''), 'Sans titre')
    )
  end
$$;

-- La version que donnerait le brouillon d'un chapitre ou d'une leçon. Une erreur garde son code
-- (message), et nomme l'élément : detail commence par son nom (private.element_label), hint est
-- son identifiant (l'admin peut l'ouvrir).
create function private.prepare_element(element public.contents)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  code text;
  what text;
begin
  return private.prepare_version(element, private.resolve_linked(element.draft));
exception
  when sqlstate 'P0001' then
    get stacked diagnostics code = message_text, what = pg_exception_detail;
    raise exception using
      errcode = 'P0001',
      message = code,
      detail = left(private.element_label(element) || ' : ' || coalesce(what, ''), 1000),
      hint = element.id::text;
end;
$$;

-- La version d'un chapitre ou d'une leçon à citer dans le plan ([D29], § 3.4, point 6) : si
-- l'empreinte de son brouillon résolu est celle de la version citée par le plan en ligne
-- (live_cited), ou celle de sa dernière version, cette version est RÉUTILISÉE ; sinon une nouvelle
-- version est écrite. Comparer le contenu résolu, et non draft_rev seul : un bloc identique partout
-- ou un texte alternatif changé depuis fait republier l'élément.
create function private.element_version(
  element public.contents,
  live_cited uuid,
  version_origin text,
  author_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  prepared public.versions;
  reused uuid;
begin
  prepared := private.prepare_element(element);

  select v.id into reused
  from public.versions v
  where v.content_id = element.id
    and v.body_hash = prepared.body_hash
    and (
      v.id = live_cited
      or v.number = (select max(x.number) from public.versions x where x.content_id = element.id)
    )
  order by (v.id is not distinct from live_cited) desc
  limit 1;

  if reused is not null then
    return reused;
  end if;
  return (private.insert_version(prepared, version_origin, author_id, null)).id;
end;
$$;

-- Publication d'une méthode ([D29], § 3.4, point 6), appelée par private.do_publish après les
-- contrôles communs (sorte, corbeille, [D41], [D14], expected_rev) :
--   - les chapitres et les leçons hors corbeille sont verrouillés en partage (ils ne changent pas
--     pendant la publication ; la ligne de la méthode l'est déjà en écriture) ;
--   - la fiche (titre, résumé, image de présentation obligatoire [D45]) ;
--   - chaque chapitre dont « Montrer dans l'app » est coché, dans l'ordre, puis chacune de ses
--     leçons cochées : version réutilisée ou nouvelle (private.element_version) ; une leçon
--     cochée dans un chapitre décoché ne part pas ;
--   - la version de la méthode, avec le plan figé, mise en ligne.
-- Un élément invalide fait tout refuser, et l'erreur le nomme (private.prepare_element).
create function private.do_publish_method(
  target public.contents,
  author_id uuid,
  publish_origin text
)
returns public.versions
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  prepared public.versions;
  live_map jsonb;
  chapter_row public.contents;
  lesson_row public.contents;
  chapter_version uuid;
  lessons jsonb;
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
      lessons := lessons || jsonb_build_array(jsonb_build_object(
        'lessonId', lesson_row.id,
        'versionId', private.element_version(
          lesson_row, (live_map ->> lesson_row.id::text)::uuid, publish_origin, author_id
        )
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

-- Publication (§ 3.4). Même signature et même comportement qu'à la partie 7a pour les articles,
-- les épisodes et les pages ; la méthode se publie maintenant avec son plan ([D29]). Sans garde
-- is_staff() : appelée par publish (auth.uid()) et par la tâche « publications » (auteur de la
-- programmation), sous pg_cron où is_staff() est toujours faux.
--   0. contenu verrouillé (for update) ; sorte racine hors corbeille ; niveau d'accès choisi
--      ([D41]) ;
--   1. « manual » seulement : refus si un AUTRE membre écrit le contenu (ou, pour une méthode, un
--      de ses chapitres ou une de ses leçons) ([D14]) ; la tâche planifiée a déjà tranché ([D31]) ;
--   2. expected_rev (s'il est donné) = draft_rev ;
--   3. méthode : private.do_publish_method ;
--   4. sinon : blocs liés résolus ; pour une page, une adresse qui n'est pas celle d'une autre page
--      en ligne ; puis private.prepare_version (image de présentation [D45], son, images, fichiers,
--      textes alternatifs, forme, fichiers figés, empreinte) ;
--   5. version écrite ; live_version_id, first_published_at (première fois seulement, [D27]) ;
--      programmation effacée.
-- Renvoie la version écrite (celle de la méthode pour une méthode).
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

  if target.kind not in ('article', 'episode', 'method', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes, les méthodes et les pages se publient.';
  end if;

  if not target.access_chosen then
    raise exception using
      errcode = 'P0001',
      message = 'acces_a_choisir',
      detail = 'Choisis le niveau d''accès (Gratuit ou une formule) avant de publier.';
  end if;

  if publish_origin = 'manual' then
    writer := private.active_writer(private.publish_scope(target.id), author_id);
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

  if target.kind = 'method' then
    return private.do_publish_method(target, author_id, publish_origin);
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
  created := private.insert_version(prepared, publish_origin, author_id, null);

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

-- « Programmer » (sortes racines, méthodes comprises) : publiera le dernier brouillon enregistré
-- à cette heure ([D16]) — pour une méthode, sa fiche, son plan et ses éléments cochés tels qu'ils
-- seront à cette heure —, sauf si quelqu'un l'écrit à ce moment-là ([D31] : attente, une heure au
-- plus ; pour une méthode, sur chacun de ses chapitres et de ses leçons). at est un instant
-- (l'admin convertit l'heure de Paris). Remplace une programmation existante.
-- Refuse dès maintenant ce que la publication refuserait de toute façon : niveau d'accès pas
-- choisi ([D41]), image de présentation manquante ([D45], méthode comprise), épisode sans son.
-- Renvoie l'heure enregistrée.
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

  if target.kind not in ('article', 'episode', 'method', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes, les méthodes et les pages se programment.';
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

-- ---------------------------------------------------------------------------------------------
-- Ce qui va changer dans l'app (publish_preview, § 1.8)
-- ---------------------------------------------------------------------------------------------

-- L'empreinte que donnerait ce brouillon, ou le problème qui empêcherait de le publier (code
-- stable et détail), sans rien écrire.
create function private.try_prepare(
  target public.contents,
  out body_hash text,
  out problem text,
  out problem_detail text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  state text;
begin
  body_hash := (private.prepare_version(target, private.resolve_linked(target.draft))).body_hash;
exception
  when others then
    get stacked diagnostics state = returned_sqlstate, problem = message_text,
      problem_detail = pg_exception_detail;
    body_hash := null;
    if state <> 'P0001' then
      problem := 'erreur_inattendue';
      problem_detail := null;
    end if;
end;
$$;

-- Avant de publier ou de programmer une méthode ([D29], § 1.8) : la liste de ce qui va changer
-- dans l'app si on la publie maintenant, comparée à sa version en ligne. Une ligne par élément
-- concerné (change) :
--   - new : la méthode n'est pas en ligne (sa fiche) ; un chapitre ou une leçon coché qui n'est
--     pas dans le plan en ligne ;
--   - modified : la fiche (contenu résolu ou niveau d'accès), ou un chapitre ou une leçon du plan
--     en ligne, dont le contenu résolu a changé (empreinte différente : texte, blocs, modèle
--     partagé, texte alternatif, fichiers, leçon gratuite…) ;
--   - reordered : (ligne de la méthode) l'ordre du plan change (chapitres rangés autrement, leçon
--     déplacée ou passée dans un autre chapitre) ;
--   - removed : un chapitre ou une leçon du plan en ligne qui n'y sera plus (décoché, ou dans un
--     chapitre décoché).
-- problem / problem_detail : ce qui ferait refuser la publication pour cet élément (le code
-- de publish, par exemple image_sans_fichier ou image_de_presentation_manquante), sinon null.
-- draft_saved_at / draft_saved_by / draft_saved_by_name : le dernier enregistrement de
-- l'élément. chapter_id / chapter_title : le chapitre d'une leçon (celui du plan à venir, ou du
-- plan en ligne pour une leçon retirée).
-- element_id : la méthode, le chapitre ou la leçon. Dans l'ordre : la méthode, puis le plan à
-- venir, puis ce qui est retiré. Rien n'est écrit.
create function public.publish_preview(content_id uuid)
returns table (
  element_id uuid,
  kind text,
  title text,
  chapter_id uuid,
  chapter_title text,
  change text,
  problem text,
  problem_detail text,
  draft_saved_at timestamptz,
  draft_saved_by uuid,
  draft_saved_by_name text
)
language plpgsql
volatile
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

  -- Le plan à venir : chapitres cochés hors corbeille, puis leurs leçons cochées, dans l'ordre.
  select coalesce(jsonb_agg(x.entry order by x.ch_pos, x.ch_id, x.le_pos nulls first, x.le_id), '[]'::jsonb)
  into plan_items
  from (
    select
      jsonb_build_object('id', ch.id, 'chapterId', ch.id, 'key', 'c:' || ch.id) as entry,
      ch.position as ch_pos, ch.id as ch_id, null::integer as le_pos, null::uuid as le_id
    from public.contents ch
    where ch.parent_id = target.id and ch.kind = 'chapter' and ch.deleted_at is null and ch.in_app
    union all
    select
      jsonb_build_object('id', le.id, 'chapterId', ch.id, 'key', 'l:' || ch.id || '/' || le.id),
      ch.position, ch.id, le.position, le.id
    from public.contents ch
    join public.contents le on le.parent_id = ch.id and le.deleted_at is null and le.in_app
    where ch.parent_id = target.id and ch.kind = 'chapter' and ch.deleted_at is null and ch.in_app
  ) x;

  -- Le plan en ligne (éléments hors corbeille), dans l'ordre.
  select coalesce(jsonb_agg(x.entry order by x.n, x.m nulls first), '[]'::jsonb)
  into old_items
  from (
    select
      jsonb_build_object(
        'id', chapter_entry ->> 'chapterId', 'chapterId', chapter_entry ->> 'chapterId',
        'key', 'c:' || (chapter_entry ->> 'chapterId')
      ) as entry,
      o.n, null::bigint as m
    from jsonb_array_elements(
      case when jsonb_typeof(live_version.outline) = 'array' then live_version.outline else '[]'::jsonb end
    ) with ordinality o (chapter_entry, n)
    union all
    select
      jsonb_build_object(
        'id', lesson_entry ->> 'lessonId', 'chapterId', chapter_entry ->> 'chapterId',
        'key', 'l:' || (chapter_entry ->> 'chapterId') || '/' || (lesson_entry ->> 'lessonId')
      ),
      o.n, l.m
    from jsonb_array_elements(
      case when jsonb_typeof(live_version.outline) = 'array' then live_version.outline else '[]'::jsonb end
    ) with ordinality o (chapter_entry, n)
    cross join lateral jsonb_array_elements(chapter_entry -> 'lessons') with ordinality l (lesson_entry, m)
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
          case when element.kind = 'lesson' then (item ->> 'chapterId')::uuid end,
          case when element.kind = 'lesson' then (
            select nullif(ch.title, '') from public.contents ch where ch.id = (item ->> 'chapterId')::uuid
          ) end,
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
        case when element.kind = 'lesson' then (item ->> 'chapterId')::uuid end,
        case when element.kind = 'lesson' then (
          select nullif(ch.title, '') from public.contents ch where ch.id = (item ->> 'chapterId')::uuid
        ) end,
        'removed'::text, null::text, null::text, element.draft_saved_at, element.draft_saved_by,
        (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p
          where p.id = element.draft_saved_by);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Ranger les chapitres et les leçons (outline_reorder)
-- ---------------------------------------------------------------------------------------------

-- Range les chapitres d'une méthode et leurs leçons (glisser-déposer de l'arbre), en un seul
-- geste : positions 1, 2, 3… dans l'ordre donné ; une leçon peut changer de chapitre (dans la
-- même méthode). Rien ne change dans l'app avant la publication suivante de la méthode (le plan
-- en ligne est figé).
--   outline : [{ "chapterId": uuid, "lessonIds": [uuid, …] }, …], avec TOUS les chapitres de la
--     méthode hors corbeille et TOUTES leurs leçons hors corbeille, chacun une fois ;
--   editor_session : il faut tenir le verrou de la méthode depuis cette ouverture de l'éditeur
--     (le plan fait partie de la méthode : un seul membre à la fois).
-- Renvoie les chapitres (dans l'ordre) puis, pour chacun, ses leçons : content_id, kind,
-- parent_id, position.
create function public.outline_reorder(
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
  lesson_value jsonb;
  malformed boolean := false;
  wanted_chapters uuid[];
  wanted_lessons uuid[];
  current_chapters uuid[];
  current_lessons uuid[];
begin
  perform private.require_staff();

  if outline_reorder.method_id is null or outline_reorder.outline is null
    or jsonb_typeof(outline_reorder.outline) <> 'array' then
    malformed := true;
  else
    for entry in select e from jsonb_array_elements(outline_reorder.outline) e loop
      if jsonb_typeof(entry) <> 'object' then
        malformed := true;
      elsif (select array_agg(k order by k) from jsonb_object_keys(entry) k)
        is distinct from array['chapterId', 'lessonIds'] then
        malformed := true;
      elsif jsonb_typeof(entry -> 'chapterId') <> 'string'
        or jsonb_typeof(entry -> 'lessonIds') <> 'array' then
        malformed := true;
      elsif (entry ->> 'chapterId') !~ uuid_pattern then
        malformed := true;
      else
        for lesson_value in select y from jsonb_array_elements(entry -> 'lessonIds') y loop
          if jsonb_typeof(lesson_value) <> 'string' or (lesson_value #>> '{}') !~ uuid_pattern then
            malformed := true;
          end if;
        end loop;
      end if;
      exit when malformed;
    end loop;
  end if;

  if malformed then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le plan attendu : [{ "chapterId": "…", "lessonIds": ["…"] }].';
  end if;

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
      detail = 'Seule une méthode a des chapitres et des leçons à ranger.';
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
      detail = 'Prends la main sur la méthode pour ranger ses chapitres et ses leçons.';
  end if;

  -- Les chapitres et les leçons hors corbeille, verrouillés dans un ordre fixe.
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

  select coalesce(array_agg((e ->> 'chapterId')::uuid order by (e ->> 'chapterId')::uuid), '{}')
  into wanted_chapters
  from jsonb_array_elements(outline_reorder.outline) e;

  select coalesce(array_agg((l #>> '{}')::uuid order by (l #>> '{}')::uuid), '{}')
  into wanted_lessons
  from jsonb_array_elements(outline_reorder.outline) e
  cross join lateral jsonb_array_elements(e -> 'lessonIds') l;

  if wanted_chapters <> current_chapters or wanted_lessons <> current_lessons then
    raise exception using
      errcode = 'P0001',
      message = 'plan_perime',
      detail = 'Des chapitres ou des leçons ont été ajoutés ou supprimés entre-temps : relis le '
        'plan, puis range-le de nouveau.';
  end if;

  update public.contents c
  set position = o.n
  from jsonb_array_elements(outline_reorder.outline) with ordinality o (e, n)
  where c.id = (o.e ->> 'chapterId')::uuid and c.position is distinct from o.n;

  update public.contents c
  set parent_id = o.chapter_id, position = o.m
  from (
    select (e ->> 'chapterId')::uuid as chapter_id, (l #>> '{}')::uuid as lesson_id, m
    from jsonb_array_elements(outline_reorder.outline) e
    cross join lateral jsonb_array_elements(e -> 'lessonIds') with ordinality t (l, m)
  ) o
  where c.id = o.lesson_id
    and (c.parent_id is distinct from o.chapter_id or c.position is distinct from o.m);

  return query
    select x.id, x.kind, x.parent_id, x.position
    from (
      select ch.id, ch.kind, ch.parent_id, ch.position, ch.position as ch_pos, 0 as le_pos
      from public.contents ch
      where ch.parent_id = target.id and ch.deleted_at is null
      union all
      select le.id, le.kind, le.parent_id, le.position, ch.position, le.position
      from public.contents le
      join public.contents ch on ch.id = le.parent_id
      where ch.parent_id = target.id and ch.deleted_at is null and le.deleted_at is null
    ) x
    order by x.ch_pos, x.le_pos;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Retirer de l'app et mettre à la corbeille un chapitre ou une leçon ([D26], [D36])
-- ---------------------------------------------------------------------------------------------

-- « Retirer de l'app » :
--   - sorte racine (comme à l'étape 5) : plus de version en ligne, programmation annulée,
--     historique gardé ;
--   - chapitre ou leçon ([D26]) : « Montrer dans l'app » décoché et, si la méthode est en ligne
--     et que l'élément est dans son plan, nouvelle version de la méthode (origin = 'outline'),
--     égale à celle en ligne, sans cet élément (un chapitre emporte ses leçons du plan). Refusé
--     si un AUTRE membre écrit cet élément (verrou_tenu, comme [D14]). Pour le remettre : cocher
--     de nouveau « Montrer dans l'app », puis publier la méthode.
-- Rejouable. Renvoie needs_file_sync (l'admin appelle alors la fonction « files »).
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

  if target.kind in ('chapter', 'lesson') then
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

-- « Mettre à la corbeille » un contenu (toutes les sortes, modèles compris) : comme à l'étape 5,
-- et, pour un chapitre ou une leçon mis seul à la corbeille ([D36]), il sort aussi du plan en
-- ligne de sa méthode (nouvelle version origin = 'outline', comme unpublish ; un chapitre emporte
-- ses leçons).
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

  -- Chapitre ou leçon : la méthode d'abord (ordre des verrous commun à tous les gestes).
  if target.kind in ('chapter', 'lesson') then
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

-- ---------------------------------------------------------------------------------------------
-- Modèles et textes figés : les chapitres et les leçons en ligne (§ 3.5, [D30])
-- ---------------------------------------------------------------------------------------------

-- Les contenus en ligne (racines, et chapitres et leçons cités par un plan en ligne) dont la
-- version cite ce fichier avec un texte figé différent de celui de la médiathèque : texte
-- alternatif ou transcription de files, ou texte alternatif d'une image qui suit la médiathèque
-- (marqueur altFromLibrary, encadrés compris). Même signature qu'à l'étape 5.
create or replace function private.media_stale_live(target_media_id uuid)
returns table (content_id uuid, version_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select l.content_id, v.id
  from public.media m
  join public.versions v on v.media_ids @> array[m.id]
  join private.live l on l.version_id = v.id and l.content_id = v.content_id
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

-- « Mettre à jour ces N contenus dans l'app » pour un bloc identique partout (§ 3.5) : comme à
-- l'étape 6, et pour un chapitre ou une leçon en ligne (cité par le plan en ligne de sa
-- méthode), la nouvelle version de l'élément s'accompagne d'une nouvelle version de la méthode
-- (origin = 'template', une par méthode), égale à celle en ligne, dont le plan pointe vers les
-- nouvelles versions ; toutes les autres sont réutilisées.
-- Pour chaque contenu, une nouvelle version ÉGALE à la version en ligne, dont seules les copies de
-- ce modèle encore liées dans le brouillon sont remplacées par une copie du bloc actuel du
-- modèle (même calcul qu'à la publication), puis mise en ligne (origin = 'template', auteur = le
-- membre qui clique, draft_rev de la version en ligne). Le reste du brouillon ne part jamais par
-- ce geste. Fichiers : ceux que la version cite déjà gardent leurs informations figées ([D30]) ;
-- ceux que la nouvelle copie cite pour la première fois sont figés maintenant. Tout le geste est
-- refusé si le bloc du modèle ne peut pas être publié (image_sans_fichier, fichier_indisponible,
-- fichier_inadapte, forme_invalide).
-- Rejouable (0 ligne). Renvoie les contenus mis à jour (racines, chapitres, leçons ; pas la
-- méthode d'un élément) et leur nouvelle version ; l'admin appelle ensuite la fonction « files ».
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
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc identique partout.';
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

-- « Mettre à jour ces N contenus dans l'app » pour les textes d'un fichier ([D30] option B) :
-- comme à l'étape 5, et pour un chapitre ou une leçon en ligne, la nouvelle version de l'élément
-- s'accompagne d'une nouvelle version de la méthode (origin = 'files', une par méthode), égale à
-- celle en ligne, dont le plan pointe vers les nouvelles versions.
-- Pour chaque contenu de media_outdated, une nouvelle version ÉGALE à la version en ligne, dont
-- seuls les textes de ce fichier sont remplacés par ceux de la médiathèque (files : alt et
-- transcript ; images qui suivent la médiathèque : alt), mise en ligne (origin = 'files', auteur
-- = le membre qui clique). Le brouillon n'est jamais publié par ce geste ; draft_rev reste celui
-- de la version en ligne. Rejouable (0 ligne). Renvoie les contenus mis à jour (racines,
-- chapitres, leçons ; pas la méthode d'un élément) et leur nouvelle version.
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

  -- En partage : le texte ne change pas pendant le geste (un renommage attend la fin).
  select * into target from public.media m where m.id = media_push.media_id for share;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe pas.';
  end if;

  -- Les méthodes des éléments concernés d'abord, puis les contenus (ordre des verrous commun).
  select coalesce(array_agg(distinct s.content_id), '{}') into stale_ids
  from private.media_stale_live(target.id) s;
  select coalesce(array_agg(distinct l.method_id), '{}') into methods
  from private.live l
  where l.content_id = any (stale_ids) and l.method_id is not null;
  perform 1 from public.contents c where c.id = any (methods) order by c.id for update;
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

-- ---------------------------------------------------------------------------------------------
-- Lecture de l'app : un contenu (methodId, isFree) et une méthode avec son plan (§ 5.1)
-- ---------------------------------------------------------------------------------------------

-- La lecture d'un contenu en ligne par l'app, pour app_content et app_page : comme à l'étape 5,
-- avec methodId (la méthode d'un chapitre ou d'une leçon en ligne, sinon null) et isFree (leçon
-- gratuite). Le niveau (level, locked) est le niveau réel de private.live : leçon gratuite, ou
-- introduction d'un chapitre ([D43]).
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
    'title', v.body ->> 'title',
    'summary', v.body -> 'summary',
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
    select l.level_id is null or coalesce(private.reader_rank() >= l.level_rank, false) as unlocked
  ) access
  where l.version_id = target_version_id
  limit 1
$$;

-- Une méthode EN LIGNE (§ 5.1), ou null (jamais publiée, retirée, dans la corbeille, inconnue,
-- ou pas une méthode) : sa fiche et son plan figé, dans l'ordre.
--   { id, versionId, kind: "method", title, summary, cover, level, locked, files, chapters,
--     publishedAt, firstPublishedAt }
--   chapters : [{ id, versionId, title, summary, cover, level, locked, lessons }] ;
--   lessons : [{ id, versionId, title, summary, cover, isFree, level, locked }].
-- level : le niveau réel ({ id, name, rank }, ou null = gratuit) : celui de la méthode, null pour
-- une leçon gratuite, et pour l'introduction d'un chapitre, null dès qu'une de ses leçons en
-- ligne est gratuite ([D43]). locked : la formule du lecteur n'atteint pas ce niveau. files : les
-- images de présentation de la méthode, des chapitres et des leçons (informations figées ;
-- toujours publiques, question 1). Jamais de blocs : on ouvre chaque élément avec
-- app_content(id) ; versionId sert de clé de cache.
create function public.app_method(content_id uuid)
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
    join private.live l on l.method_id = ml.content_id
    join public.versions v on v.id = l.version_id
  )
  select jsonb_build_object(
    'id', ml.content_id,
    'versionId', ml.version_id,
    'kind', 'method',
    'title', ml.body ->> 'title',
    'summary', ml.body -> 'summary',
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
            'summary', ch.body -> 'summary',
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
                    'summary', le.body -> 'summary',
                    'cover', coalesce(le.body -> 'cover', 'null'::jsonb),
                    'isFree', le.is_free,
                    'level', case
                      when le.level_id is null then null
                      else (select jsonb_build_object('id', al.id, 'name', al.name, 'rank', al.rank)
                        from public.access_levels al where al.id = le.level_id)
                    end,
                    'locked', not (le.level_id is null or coalesce(reader.rank >= le.level_rank, false))
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
-- Droits
-- ---------------------------------------------------------------------------------------------

revoke execute on function
  public.publish_preview(uuid),
  public.outline_reorder(uuid, jsonb, uuid)
from public, anon;
grant execute on function
  public.publish_preview(uuid),
  public.outline_reorder(uuid, jsonb, uuid)
to authenticated;

revoke execute on function public.app_method(uuid) from public;
grant execute on function public.app_method(uuid) to anon, authenticated, service_role;

-- Aucune fonction de private n'est exécutable par anon ni authenticated, sauf reader_can_open
-- (politique de Storage) : § 4.5, vérifié par supabase/tests/05_prive.test.sql.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

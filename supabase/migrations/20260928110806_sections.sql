-- Sections (étape 7, partie 7a) : Pages, Blog, Podcasts et Accueil.
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.5, § 3.4, § 5.1, « Étape 7 ») et docs/ADMINISTRATION.md
-- (§ 1, § 3).
--
-- Les migrations des étapes 1 à 6 sont en production : celle-ci ne fait que transformer
-- l'existant, sans rien effacer. Fonctions ajoutées, fonctions remplacées avec la même signature
-- (private.do_publish, public.schedule), un index de plus.
--   - [D45] : image de présentation obligatoire pour publier (ou programmer) un article, un
--     épisode et, à la partie 7b, une méthode (image_de_presentation_manquante) ; le résumé reste
--     facultatif, rien n'est exigé pour une page. Le son d'un épisode (son_manquant) est vérifié
--     par la même fonction, donc aussi dès la programmation.
--   - Catégories : rangement d'une section en un geste (categories_reorder). Le reste est en
--     place depuis l'étape 4 (section fixe, nom unique dans sa section, fin de liste, suppression
--     définitive [D28], catégorie de la bonne section dans save_draft) ; [D44] : facultatives.
--   - Lectures de l'app pour anon : app_feed (articles ou épisodes en ligne, par date de première
--     publication [D27], pagination par curseur) et app_categories.
--   - Accueil : lecture directe de public.contents sous RLS (déjà réservée à l'équipe en aal2),
--     aucune fonction nouvelle (voir le document, « Fait à l'étape 7, partie 7a »).

-- ---------------------------------------------------------------------------------------------
-- Ce qu'exige la publication
-- ---------------------------------------------------------------------------------------------

-- Les sortes qui ont une image de présentation obligatoire ([D45]) : un article, un épisode, une
-- méthode (sa fiche). Une page n'en a pas besoin.
create function private.cover_required(content_kind text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select content_kind in ('article', 'episode', 'method')
$$;

-- Ce que le brouillon doit contenir pour être publié, selon sa sorte : l'image de présentation
-- ([D45]) et, pour un épisode, le son. Appelée par private.do_publish (sur le corps résolu : la
-- couverture et le son ne sont pas des blocs, ils n'en changent pas) et par public.schedule (sur
-- le brouillon), pour refuser dès la programmation ce que la publication refuserait. La sorte
-- des fichiers (fichier_inadapte), leur disponibilité (fichier_indisponible) et l'adresse d'une
-- page restent vérifiées par private.do_publish, au moment de publier.
create function private.check_publish_requirements(content_kind text, body jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
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

-- ---------------------------------------------------------------------------------------------
-- Publication (remplacée : même corps qu'à l'étape 5, le contrôle du son devient
-- private.check_publish_requirements, qui ajoute l'image de présentation [D45])
-- ---------------------------------------------------------------------------------------------

-- Publication (§ 3.4). Sans garde is_staff() : appelée par publish (auth.uid()) et par la tâche
-- « publications » (auteur de la programmation), sous pg_cron où is_staff() est toujours faux.
--   0. contenu verrouillé (for update) ; sorte racine hors corbeille ; niveau d'accès choisi
--      ([D41]) ;
--   1. « manual » seulement : refus si un AUTRE membre écrit le contenu (ou un élément d'une
--      méthode) ([D14]) ; la tâche planifiée a déjà tranché ([D31]) ;
--   2. expected_rev (s'il est donné) = draft_rev ;
--   3. blocs liés résolus ; pour une page, une adresse qui n'est pas celle d'une autre page en
--      ligne ; image de présentation (article, épisode, méthode : [D45]) et son d'un épisode ;
--      aucune image sans fichier ; fichiers verrouillés en partage (for share, comme le
--      déclencheur du brouillon) puis prêts, hors corbeille et de la bonne sorte (image de
--      présentation et images des blocs : des images ; son : un audio) ;
--   4. textes alternatifs résolus, files figé, empreinte, variante « published » vérifiée ;
--   5. version écrite ; live_version_id, first_published_at (première fois seulement, [D27]) ;
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
  problem text;
  cited uuid[];
  frozen_files jsonb;
  shape_ok boolean;
  shape_errors text[];
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

  if target.kind = 'method' then
    -- Étape 7 : la méthode se publie avec son plan, ses chapitres et ses leçons ([D29]).
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Les méthodes se publient avec leur plan : pas encore disponible.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
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
  into frozen_files
  from public.media m
  where m.id = any (cited);

  insert into public.versions (
    content_id, number, origin, body, body_hash, files, access_level_id, is_free, slug,
    category_ids, media_ids, cover_media_id, template_ids, block_types, draft_rev,
    published_by, published_by_name
  )
  values (
    target.id,
    coalesce((select max(v.number) from public.versions v where v.content_id = target.id), 0) + 1,
    publish_origin,
    body,
    encode(
      sha256(convert_to(jsonb_build_array(body, frozen_files, target.is_free)::text, 'UTF8')),
      'hex'
    ),
    frozen_files,
    target.access_level_id,
    target.is_free,
    target.slug,
    array(
      select cc.category_id from public.content_categories cc
      where cc.content_id = target.id
      order by cc.category_id
    ),
    cited,
    case when jsonb_typeof(body -> 'cover') = 'object' then (body #>> '{cover,mediaId}')::uuid end,
    coalesce(
      (
        select array_agg(distinct (v #>> '{}')::uuid order by (v #>> '{}')::uuid)
        from jsonb_path_query(body, 'strict $.**.templateId') v
        where jsonb_typeof(v) = 'string'
      ),
      '{}'
    ),
    coalesce(
      (
        select array_agg(distinct t order by t)
        from (
          select top_block ->> 'type' as t
          from jsonb_array_elements(body -> 'blocks') top_block
          union all
          select inner_block ->> 'type'
          from jsonb_array_elements(body -> 'blocks') top_block
          cross join lateral jsonb_array_elements(
            case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
          ) inner_block
        ) types
      ),
      '{}'
    ),
    target.draft_rev,
    author_id,
    (select coalesce(nullif(p.full_name, ''), p.email) from public.profiles p where p.id = author_id)
  )
  returning * into created;

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

-- « Programmer » (sortes racines) : publiera le dernier brouillon enregistré à cette heure
-- ([D16]), sauf si quelqu'un l'écrit à ce moment-là ([D31] : attente, une heure au plus). at est
-- un instant (l'admin convertit l'heure de Paris). Remplace une programmation existante.
-- Refuse dès maintenant ce que la publication refuserait de toute façon : niveau d'accès pas
-- choisi ([D41]), image de présentation manquante ([D45]), épisode sans son.
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

  if target.kind = 'method' then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Les méthodes se publient avec leur plan : pas encore disponible.';
  end if;

  if target.kind not in ('article', 'episode', 'page') then
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
-- Catégories : rangement
-- ---------------------------------------------------------------------------------------------

-- Range les catégories d'une section dans cet ordre (glisser-déposer de l'écran des catégories).
-- ids : TOUTES les catégories de la section, chacune une fois. Réécrit les positions 0, 1, 2…
-- en un seul geste. Renvoie les catégories de la section dans le nouvel ordre. Le reste
-- (ajouter, renommer, supprimer) reste une écriture directe sur public.categories (étape 4).
create function public.categories_reorder(section text, ids uuid[])
returns setof public.categories
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  if categories_reorder.section is null
    or categories_reorder.section not in ('blog', 'podcasts') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La section doit être blog ou podcasts.';
  end if;

  -- Un rangement à la fois par section ; une catégorie ajoutée ou supprimée entre-temps attend.
  perform pg_advisory_xact_lock(hashtext('declikora.categories:' || categories_reorder.section));
  perform 1 from public.categories c
  where c.section = categories_reorder.section
  order by c.id
  for update;

  if categories_reorder.ids is null
    or cardinality(categories_reorder.ids) <> (
      select count(*) from public.categories c where c.section = categories_reorder.section
    )
    or (select count(distinct x) from unnest(categories_reorder.ids) x)
      <> cardinality(categories_reorder.ids)
    or exists (
      select 1 from unnest(categories_reorder.ids) x
      where x is null or not exists (
        select 1 from public.categories c
        where c.id = x and c.section = categories_reorder.section
      )
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir toutes les catégories de la section, chacune une fois.';
  end if;

  update public.categories c
  set position = o.n - 1
  from unnest(categories_reorder.ids) with ordinality o (id, n)
  where c.id = o.id and c.position <> o.n - 1;

  return query
  select * from public.categories c
  where c.section = categories_reorder.section
  order by c.position, c.id;
end;
$$;

revoke execute on function public.categories_reorder(text, uuid[]) from public, anon;
grant execute on function public.categories_reorder(text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Lectures de l'app : listes du Blog et des Podcasts, catégories
-- ---------------------------------------------------------------------------------------------

-- Listes de l'app : une page par date de première publication, de la plus récente à la plus
-- ancienne ([D27] : une correction ne remonte pas un vieil article), puis par identifiant.
create index contents_feed_idx
  on public.contents (kind, first_published_at desc, id desc)
  where live_version_id is not null and deleted_at is null;

-- Curseur d'une liste de l'app : la date de première publication (UTC, à la microseconde) et
-- l'identifiant du dernier élément reçu. Opaque pour l'app, qui le renvoie tel quel.
create function private.feed_cursor(first_published_at timestamptz, content_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select to_char(first_published_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    || '~' || content_id::text
$$;

-- Les articles (section « blog ») ou les épisodes (« podcasts ») EN LIGNE (§ 5.1), une page à la
-- fois : du plus récemment publié pour la première fois au plus ancien ([D27]), 50 au plus.
--   category_id : seulement ceux de cette catégorie (dans leur version en ligne) ; une catégorie
--     supprimée ([D28]) ou d'une autre section donne une liste vide ;
--   before : le nextCursor de la page précédente (null : la première page) ;
--   lim : taille de la page, de 1 à 50 (20 par défaut).
-- Un contenu réservé est listé comme les autres, locked vrai si la formule du lecteur n'atteint
-- pas son rang, avec son image de présentation (toujours publique, question 1) ; jamais ses
-- blocs ni son son. Brouillons jamais publiés, contenus retirés et corbeille : jamais listés.
-- Renvoie { items: [...], nextCursor: text | null } ; nextCursor est null à la dernière page.
create function public.app_feed(
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
  cursor_at timestamptz;
  cursor_id uuid;
  page_items jsonb;
  found_count integer;
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
      if app_feed.before !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z~[0-9a-f-]{36}$' then
        raise exception 'curseur mal formé';
      end if;
      cursor_at := split_part(app_feed.before, '~', 1)::timestamptz;
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
    coalesce(jsonb_agg(page.item order by page.first_published_at desc, page.content_id desc), '[]'),
    count(*)
  into page_items, found_count
  from (
    select
      c.id as content_id,
      c.first_published_at,
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
      and (cursor_at is null or (c.first_published_at, c.id) < (cursor_at, cursor_id))
    order by c.first_published_at desc, c.id desc
    limit page_size + 1
  ) page;

  if found_count > page_size then
    -- Un élément de plus que demandé : il y a une page suivante, qui commence après le dernier
    -- élément gardé.
    page_items := page_items - page_size;
    return jsonb_build_object(
      'items', page_items,
      'nextCursor', private.feed_cursor(
        (page_items -> (page_size - 1) ->> 'firstPublishedAt')::timestamptz,
        (page_items -> (page_size - 1) ->> 'id')::uuid
      )
    );
  end if;

  return jsonb_build_object('items', page_items, 'nextCursor', null);
end;
$$;

-- Les catégories d'une section (« blog » ou « podcasts »), dans leur ordre, pour les filtres de
-- l'app. Une catégorie supprimée n'existe plus ([D28]) ; les versions qui la citent encore la
-- perdent dans app_feed et app_content.
create function public.app_categories(section text)
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if app_categories.section is null or app_categories.section not in ('blog', 'podcasts') then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La section doit être blog ou podcasts.';
  end if;

  return query
  select c.id, c.name
  from public.categories c
  where c.section = app_categories.section
  order by c.position, c.name, c.id;
end;
$$;

revoke execute on function
  public.app_feed(text, uuid, text, integer),
  public.app_categories(text)
from public;
grant execute on function
  public.app_feed(text, uuid, text, integer),
  public.app_categories(text)
to anon, authenticated, service_role;

-- Aucune fonction de private n'est exécutable par anon ni authenticated, sauf reader_can_open
-- (politique de Storage) : § 4.5, vérifié par supabase/tests/05_prive.test.sql.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

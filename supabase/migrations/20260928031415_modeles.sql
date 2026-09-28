-- Modèles de blocs (étape 6) : la section d'un point de départ (template_for, [D42]), la règle
-- « un seul bloc » d'un bloc identique partout ([D11]), « Enregistrer comme modèle »
-- (template_create_from), « Mettre à jour ces N contenus dans l'app » (template_outdated,
-- template_push) et « Détacher partout » (template_detach_all).
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 2.4, § 2.5, § 3.2, § 3.4, § 3.5, « Étape 6 ») et les
-- décisions D11 et D42.
--
-- Cette migration ne fait que TRANSFORMER l'existant (les étapes 1 à 5 sont en production, avec
-- des pages et des versions) : une colonne ajoutée (template_for, remplie pour les points de
-- départ déjà créés), deux contraintes, des fonctions remplacées avec la même signature
-- (déclencheurs de contents, private.body_to_draft), content_create remplacée (un paramètre de
-- plus, à la fin, avec une valeur par défaut : les appels existants restent valables) et de
-- nouvelles RPC. Aucune donnée n'est effacée.
--
-- Laissé à l'étape 7 : template_push pour les chapitres et les leçons (nouvelle version de la
-- méthode, comme media_push) ; private.live ne contient encore que les sortes racines.
--
-- Conventions (§ 1.1) : les RPC de l'admin sont « security definer » et refusent d'abord si
-- is_staff() est faux (42501 reserve_a_l_equipe) ; les autres erreurs ont le code P0001, un
-- message court et stable (traduit par web/src/texts.ts) et un « detail » en français.

-- ---------------------------------------------------------------------------------------------
-- Section d'un point de départ ([D42])
-- ---------------------------------------------------------------------------------------------

-- La sorte de contenu qu'un point de départ sert à créer : « Nouvelle page » ne propose que les
-- points de départ des pages. Obligatoire pour un modèle starter, vide pour tout le reste,
-- choisie à la création et fixe ensuite (déclencheur contents_10_kind).
alter table public.contents add column template_for text;

comment on column public.contents.template_for is
  'Point de départ (template_sort = starter) : la sorte de contenu qu''il sert à créer ([D42]). '
  'Choisie à la création, ne change plus.';

-- Les points de départ déjà créés (seulement par la RPC : l'admin n'avait pas encore d'écran
-- des modèles) servent aux pages, la seule section qui a un écran de création. Le garde de
-- corbeille refuserait de changer un modèle déjà dans la corbeille : il est levé le temps de
-- cette seule mise à jour.
alter table public.contents disable trigger contents_20_trash_guard;
update public.contents
set template_for = 'page'
where kind = 'template' and template_sort = 'starter' and template_for is null;
alter table public.contents enable trigger contents_20_trash_guard;

alter table public.contents
  add constraint contents_template_for_kind check (
    (template_for is not null) = (template_sort is not distinct from 'starter')
  ),
  add constraint contents_template_for_value check (
    template_for is null or template_for in ('article', 'episode', 'chapter', 'lesson', 'page')
  );

create index contents_template_for_idx on public.contents (template_for)
  where template_for is not null;

-- ---------------------------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------------------------

-- Un bloc d'un seul niveau (Texte, Image) sans son id ; une image d'une version qui suivait la
-- médiathèque (altFromLibrary) reprend la forme du brouillon (alt null, sans le marqueur).
create function private.leaf_for_comparison(block jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'image' and block -> 'altFromLibrary' = 'true'::jsonb then
      (block - 'id' - 'altFromLibrary') || jsonb_build_object('alt', null)
    else block - 'id'
  end
$$;

-- Un bloc tel qu'on le compare au bloc d'un modèle (template_outdated) : sans les id (premier
-- niveau et encadré), sans le marqueur templateId, et avec les textes alternatifs figés rendus
-- à la forme du brouillon. Deux copies du même bloc sont donc égales quels que soient leurs id.
create function private.block_for_comparison(block jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'box' then
      (block - 'id' - 'templateId')
        || jsonb_build_object(
          'blocks',
          coalesce(
            (
              select jsonb_agg(private.leaf_for_comparison(inner_block) order by inner_position)
              from jsonb_array_elements(block -> 'blocks') with ordinality inner_list (inner_block, inner_position)
            ),
            '[]'::jsonb
          )
        )
    else private.leaf_for_comparison(block - 'templateId')
  end
$$;

-- La copie publiée du bloc d'un modèle pour le bloc lié linked_id : exactement le calcul de
-- private.resolve_linked (étape 5) : l'id du bloc lié, le marqueur templateId, et des id
-- intérieurs tirés de l'id du bloc lié et de leur id d'origine (toujours les mêmes : une
-- publication suivante du même brouillon donne la même empreinte).
create function private.template_copy(template_block jsonb, linked_id text, template_id uuid)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when made.block ->> 'type' = 'box' then
      jsonb_set(
        made.block,
        '{blocks}',
        coalesce(
          (
            select jsonb_agg(
              inner_block
                || jsonb_build_object('id', md5(linked_id || '/' || (inner_block ->> 'id'))::uuid::text)
              order by inner_position
            )
            from jsonb_array_elements(made.block -> 'blocks') with ordinality inner_list (inner_block, inner_position)
          ),
          '[]'::jsonb
        )
      )
    else made.block
  end
  from (
    select template_block || jsonb_build_object('id', linked_id, 'templateId', template_id::text) as block
  ) made
$$;

-- Une copie ORDINAIRE du bloc d'un modèle, pour « Détacher » (§ 3.5) : l'id du bloc lié au
-- premier niveau, de nouveaux id à l'intérieur d'un encadré, sans marqueur. Elle ne suit plus
-- le modèle.
create function private.detached_copy(template_block jsonb, linked_id text)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select case
    when template_block ->> 'type' = 'box' then
      jsonb_set(
        template_block || jsonb_build_object('id', linked_id),
        '{blocks}',
        coalesce(
          (
            select jsonb_agg(
              inner_block || jsonb_build_object('id', gen_random_uuid()::text)
              order by inner_position
            )
            from jsonb_array_elements(template_block -> 'blocks') with ordinality inner_list (inner_block, inner_position)
          ),
          '[]'::jsonb
        )
      )
    else template_block || jsonb_build_object('id', linked_id)
  end
$$;

-- Une image qui suit la médiathèque (alt null) dans une copie que template_push ajoute à une
-- version : texte alternatif figé de la version (files) si le fichier y est déjà cité ([D30] :
-- rien d'autre ne change), sinon celui de la médiathèque ; marqueur altFromLibrary (§ 2.4).
create function private.resolve_alt_frozen(block jsonb, frozen jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'image' and jsonb_typeof(block -> 'alt') = 'null' then
      block || jsonb_build_object(
        'alt',
        case
          when jsonb_typeof(block -> 'mediaId') = 'string' and frozen ? (block ->> 'mediaId') then
            coalesce(frozen -> (block ->> 'mediaId') ->> 'alt', '')
          else
            coalesce((select m.alt from public.media m where m.id = (block ->> 'mediaId')::uuid), '')
        end,
        'altFromLibrary',
        true
      )
    else block
  end
$$;

-- Les textes alternatifs d'une liste de blocs de premier niveau (encadrés compris), comme
-- private.resolve_alts, avec les textes figés de la version. Les blocs déjà publiés n'ont jamais
-- alt null : seules les nouvelles copies changent.
create function private.resolve_alts_frozen(blocks jsonb, frozen jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      case
        when b ->> 'type' = 'box' then
          jsonb_set(
            b,
            '{blocks}',
            coalesce(
              (
                select jsonb_agg(private.resolve_alt_frozen(inner_block, frozen) order by inner_position)
                from jsonb_array_elements(b -> 'blocks') with ordinality inner_list (inner_block, inner_position)
              ),
              '[]'::jsonb
            )
          )
        else private.resolve_alt_frozen(b, frozen)
      end
      order by n
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(blocks, '[]'::jsonb)) with ordinality list (b, n)
$$;

-- Les contenus EN LIGNE (racines ; chapitres et leçons à l'étape 7) qu'une mise à jour de ce
-- modèle changerait : leur version en ligne a au moins une copie de ce modèle (marqueur
-- templateId) qui
--   - est encore un bloc lié à ce modèle dans le brouillon (même id) : une copie détachée dans le
--     brouillon ne suit plus le modèle, même tant que le contenu n'a pas été republié ;
--   - diffère du bloc actuel du modèle, sans compter les id ni les textes alternatifs figés.
-- Seulement pour un bloc identique partout hors corbeille qui contient exactement un bloc.
create function private.template_stale_live(target_template_id uuid)
returns table (content_id uuid, version_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, v.id
  from public.contents t
  join public.contents c on c.draft_template_ids @> array[t.id]
  join private.live l on l.content_id = c.id
  join public.versions v on v.id = l.version_id
  where t.id = target_template_id
    and t.kind = 'template'
    and t.template_sort = 'shared'
    and t.deleted_at is null
    and jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) = 1
    and v.template_ids @> array[t.id]
    and exists (
      select 1
      from jsonb_array_elements(v.body -> 'blocks') pub_block
      where pub_block ->> 'templateId' = t.id::text
        and exists (
          select 1
          from jsonb_array_elements(c.draft -> 'blocks') d
          where d ->> 'type' = 'linked'
            and d ->> 'templateId' = t.id::text
            and d ->> 'id' = pub_block ->> 'id'
        )
        and private.block_for_comparison(pub_block)
          is distinct from private.block_for_comparison(t.draft -> 'blocks' -> 0)
    )
$$;

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs de contents (remplacés, même nom et même signature)
-- ---------------------------------------------------------------------------------------------

-- 10 : sorte, sorte de modèle et section d'un point de départ immuables ; parent de la bonne
-- sorte.
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
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'parent_invalide',
        detail = 'Un chapitre appartient à une méthode, une leçon à un chapitre.';
    end if;
  end if;
  return new;
end;
$$;

-- 30 : le brouillon (§ 3.2). Comme à l'étape 4, plus deux règles de l'étape 6 :
--   - un bloc lié AJOUTÉ (absent du brouillon précédent) cite un modèle qui a son bloc : un bloc
--     identique partout naît vide, et ne s'insère pas tant qu'il l'est (modele_vide, [D11]) ;
--   - 5. un modèle « shared » contient au plus un bloc (modele_un_seul_bloc, [D11]) ; tant qu'un
--     brouillon le cite, il garde ce bloc (modele_utilise).
-- Verrous : un brouillon qui ajoute un bloc lié verrouille le modèle en partage (for share) ;
-- save_draft verrouille le modèle qu'on enregistre (for update) : l'un attend l'autre, et la
-- vérification qui suit voit toujours l'état validé de l'autre.
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
        detail = 'Ce brouillon cite un modèle qui n''existe pas, n''est pas un bloc identique '
          'partout, ou est dans la corbeille.';
    end if;

    -- Un bloc identique partout ajouté à ce brouillon doit avoir son bloc ([D11]). Seulement
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

  -- 5. Un bloc identique partout : un seul bloc ([D11]) ; il le garde tant qu'il est utilisé.
  if new.kind = 'template' and new.template_sort = 'shared' then
    block_count := jsonb_array_length(new.draft -> 'blocks');
    if block_count > 1 then
      raise exception using
        errcode = 'P0001',
        message = 'modele_un_seul_bloc',
        detail = 'Un bloc identique partout contient un seul bloc : pour en regrouper plusieurs, '
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

-- ---------------------------------------------------------------------------------------------
-- « Revenir à cette version » : une copie ne redevient un bloc lié que si son modèle peut l'être
-- ---------------------------------------------------------------------------------------------

-- Comme à l'étape 5, avec une condition de plus : le modèle « shared » hors corbeille doit avoir
-- exactement un bloc (un modèle vidé, possible une fois détaché partout, donnerait un bloc lié
-- que le déclencheur refuserait, et tout le retour avec lui). Sinon le marqueur est retiré :
-- copie ordinaire (avertissement modele_detache).
create or replace function private.body_to_draft(body jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_set(
    body
      || jsonb_build_object(
        'cover',
        case
          when jsonb_typeof(body -> 'cover') = 'object'
            and private.media_available((body #>> '{cover,mediaId}')::uuid)
          then body -> 'cover'
          else 'null'::jsonb
        end,
        'audio',
        case
          when jsonb_typeof(body -> 'audio') = 'object'
            and private.media_available((body #>> '{audio,mediaId}')::uuid)
          then body -> 'audio'
          else 'null'::jsonb
        end
      ),
    '{blocks}',
    coalesce(
      (
        select jsonb_agg(
          case
            when b ? 'templateId' and exists (
              select 1 from public.contents t
              where t.id = (b ->> 'templateId')::uuid
                and t.kind = 'template'
                and t.template_sort = 'shared'
                and t.deleted_at is null
                and jsonb_array_length(coalesce(t.draft -> 'blocks', '[]'::jsonb)) = 1
            ) then
              jsonb_build_object('id', b ->> 'id', 'type', 'linked', 'templateId', b ->> 'templateId')
            else private.block_to_draft(b - 'templateId')
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
-- content_create : la section d'un point de départ ([D42])
-- ---------------------------------------------------------------------------------------------

-- Nouvelle signature (template_for à la fin) : l'ancienne est retirée, pour que PostgREST n'ait
-- qu'une fonction à choisir. Les appels sans template_for restent valables.
drop function public.content_create(text, uuid, text, text, uuid);

-- Crée un contenu et en donne aussitôt le verrou à l'appelant (qui ouvre l'éditeur).
--   kind : article, episode, method, chapter, lesson, page ou template ;
--   parent_id : la méthode d'un chapitre, le chapitre d'une leçon (interdit pour les autres) ;
--   title : le titre de départ (texte nettoyé, 200 caractères au plus) ;
--   template_sort : la sorte d'un modèle (style, shared, starter), obligatoire pour un modèle et
--     interdite sinon ; elle ne change plus ensuite ;
--   from_template_id : un point de départ (starter) hors corbeille DE CETTE SORTE de contenu
--     (template_for = kind), dont les blocs sont recopiés avec de nouveaux identifiants (§ 2.5).
--     Pas pour un modèle ;
--   template_for : la sorte de contenu d'un point de départ (article, episode, chapter, lesson,
--     page), obligatoire pour un modèle starter et interdite sinon ; elle ne change plus ([D42]).
-- Un chapitre ou une leçon va en fin de liste de son parent, « Montrer dans l'app » décoché.
create function public.content_create(
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
begin
  perform private.require_staff();

  if content_create.kind is null or content_create.kind not in (
    'article', 'episode', 'method', 'chapter', 'lesson', 'page', 'template'
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
      'article', 'episode', 'chapter', 'lesson', 'page'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Un point de départ sert à une sorte de contenu (article, episode, chapter, lesson '
        'ou page) ; les autres contenus et modèles n''en ont pas.';
  end if;

  if char_length(clean_title) > 200 then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'Le titre fait 200 caractères au plus.';
  end if;

  if content_create.kind in ('chapter', 'lesson') then
    -- Le parent est verrouillé : deux créations simultanées n'ont pas la même position.
    select * into parent
    from public.contents c
    where c.id = content_create.parent_id
    for update;

    if not found
      or parent.deleted_at is not null
      or (content_create.kind = 'chapter' and parent.kind <> 'method')
      or (content_create.kind = 'lesson' and parent.kind <> 'chapter') then
      raise exception using
        errcode = 'P0001',
        message = 'parent_invalide',
        detail = 'Un chapitre se crée dans une méthode, une leçon dans un chapitre (hors corbeille).';
    end if;

    select coalesce(max(c.position), 0) + 1 into next_position
    from public.contents c
    where c.parent_id = parent.id and c.deleted_at is null;
  elsif content_create.parent_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'parent_invalide',
      detail = 'Seuls les chapitres et les leçons ont un parent.';
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

-- ---------------------------------------------------------------------------------------------
-- RPC des modèles
-- ---------------------------------------------------------------------------------------------

-- « Enregistrer comme modèle » (§ 3.5) : un nouveau modèle fait des blocs choisis d'un
-- brouillon ENREGISTRÉ (l'admin termine d'abord l'enregistrement en attente).
--   content_id : le contenu (ou le modèle) d'où viennent les blocs, hors corbeille ;
--   block_ids : des blocs de premier niveau de ce brouillon, chacun une fois ; ils gardent
--     l'ordre du brouillon, reçoivent de nouveaux id (encadrés compris), et un bloc lié devient
--     une copie ordinaire du bloc de son modèle (un modèle ne contient pas de bloc lié) ;
--   name : le nom du modèle (son titre), 1 à 200 caractères ;
--   sort : style, shared (un seul bloc, [D11]) ou starter ;
--   template_for : la section d'un point de départ ([D42]), comme content_create.
-- Le brouillon d'origine ne change pas : pour un bloc identique partout, l'admin remplace
-- lui-même le bloc par un bloc lié (save_draft). Aucun verrou n'est pris sur le modèle créé.
-- Renvoie la ligne du modèle créé.
create function public.template_create_from(
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
      detail = 'Un bloc identique partout contient un seul bloc : pour en regrouper plusieurs, '
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

-- Les contenus EN LIGNE qu'une mise à jour de ce bloc identique partout changerait
-- (private.template_stale_live) : leur nombre donne « Mettre à jour ces N contenus dans
-- l'app ». Vide pour un modèle inconnu, d'une autre sorte, vide ou dans la corbeille.
create function public.template_outdated(template_id uuid)
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
    from private.template_stale_live(template_outdated.template_id) s
    join public.contents c on c.id = s.content_id
    join public.versions v on v.id = s.version_id
    order by v.body ->> 'title', c.id;
end;
$$;

-- « Mettre à jour ces N contenus dans l'app » (§ 3.5) : pour chaque contenu de
-- template_outdated, une nouvelle version ÉGALE à la version en ligne, dont seules les copies de
-- ce modèle encore liées dans le brouillon sont remplacées par une copie du bloc actuel du
-- modèle (même calcul qu'à la publication : id du bloc lié, id intérieurs tirés de lui,
-- marqueur templateId), puis mise en ligne (origin = 'template', auteur = le membre qui clique,
-- draft_rev de la version en ligne). Le reste du brouillon ne part jamais par ce geste.
-- Fichiers : ceux que la version cite déjà gardent leurs informations figées ([D30]) ; ceux que
-- la nouvelle copie cite pour la première fois sont figés maintenant (texte alternatif,
-- dimensions…). Tout le geste est refusé si le bloc du modèle ne peut pas être publié
-- (image_sans_fichier, fichier_indisponible, fichier_inadapte, forme_invalide).
-- Rejouable (0 ligne). Renvoie les contenus mis à jour et leur nouvelle version ; l'admin
-- appelle ensuite la fonction « files » (un fichier cité pour la première fois par un contenu
-- gratuit doit devenir public).
-- Étape 7 : pour une leçon ou un chapitre, écrire aussi une nouvelle version de la méthode.
create function public.template_push(template_id uuid)
returns table (content_id uuid, version_id uuid, version_number integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  me_name text;
  tpl public.contents;
  tpl_block jsonb;
  stale record;
  src public.versions;
  linked_ids text[];
  new_body jsonb;
  cited uuid[];
  added uuid[];
  new_files jsonb;
  problem text;
  shape_ok boolean;
  shape_errors text[];
  created public.versions;
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

  select coalesce(nullif(p.full_name, ''), p.email) into me_name
  from public.profiles p where p.id = me;

  for stale in
    select s.content_id from private.template_stale_live(tpl.id) s order by s.content_id
  loop
    perform 1 from public.contents c where c.id = stale.content_id for update;

    -- Relu sous le verrou : une publication, un retrait ou un détachement a pu passer.
    select v.* into src
    from private.template_stale_live(tpl.id) s
    join public.versions v on v.id = s.version_id
    where s.content_id = stale.content_id;
    if not found then
      continue;
    end if;

    select coalesce(array_agg(d ->> 'id'), '{}') into linked_ids
    from public.contents c
    cross join lateral jsonb_array_elements(c.draft -> 'blocks') d
    where c.id = stale.content_id
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

    insert into public.versions (
      content_id, number, origin, body, body_hash, files, access_level_id, is_free, slug,
      category_ids, media_ids, cover_media_id, template_ids, block_types, outline, draft_rev,
      published_by, published_by_name
    )
    values (
      src.content_id,
      (select max(v.number) from public.versions v where v.content_id = src.content_id) + 1,
      'template',
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
      cited,
      src.cover_media_id,
      coalesce(
        (
          select array_agg(distinct (v #>> '{}')::uuid order by (v #>> '{}')::uuid)
          from jsonb_path_query(new_body, 'strict $.**.templateId') v
          where jsonb_typeof(v) = 'string'
        ),
        '{}'
      ),
      coalesce(
        (
          select array_agg(distinct t order by t)
          from (
            select top_block ->> 'type' as t
            from jsonb_array_elements(new_body -> 'blocks') top_block
            union all
            select inner_block ->> 'type'
            from jsonb_array_elements(new_body -> 'blocks') top_block
            cross join lateral jsonb_array_elements(
              case when top_block ->> 'type' = 'box' then top_block -> 'blocks' else '[]'::jsonb end
            ) inner_block
          ) types
        ),
        '{}'
      ),
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

-- « Détacher partout » (§ 3.5) : dans tous les brouillons qui citent ce bloc identique partout,
-- corbeille comprise (le garde de corbeille le permet, § 3.2), chaque bloc lié à ce modèle
-- devient une copie ordinaire de son bloc (même id au premier niveau, nouveaux id à
-- l'intérieur). Refuse si un AUTRE membre écrit l'un de ces brouillons (verrou_tenu : le detail
-- nomme la personne et le contenu, le hint la personne). Chaque brouillon change de révision
-- (edit_locks aussi : ceux qui le regardent le relisent). Les versions publiées ne changent pas.
-- Le modèle peut ensuite être mis à la corbeille. Rejouable (0 ligne).
-- Renvoie les brouillons détachés et leur nouvelle révision.
create function public.template_detach_all(template_id uuid)
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
      detail = 'Ce modèle n''existe plus, ou n''est pas un bloc identique partout.';
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

revoke execute on function
  public.content_create(text, uuid, text, text, uuid, text),
  public.template_create_from(uuid, uuid[], text, text, text),
  public.template_outdated(uuid),
  public.template_push(uuid),
  public.template_detach_all(uuid)
from public, anon;
grant execute on function
  public.content_create(text, uuid, text, text, uuid, text),
  public.template_create_from(uuid, uuid[], text, text, text),
  public.template_outdated(uuid),
  public.template_push(uuid),
  public.template_detach_all(uuid)
to authenticated;

-- Filet de sécurité : aucune fonction de private n'est exécutable par anon ni authenticated,
-- sauf reader_can_open (politique de Storage).
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

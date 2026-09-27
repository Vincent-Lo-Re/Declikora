-- Contenus et éditeur de blocs (étape 4) : la table commune des contenus, le verrou « un seul à
-- la fois » (suivi par Realtime), les catégories, les règles du brouillon, l'enregistrement et
-- « Où il est utilisé » étendu aux brouillons.
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.5, § 1.6, § 1.10, § 2, § 3.1 à 3.3, § 3.6).
--
-- Le schéma des blocs (private.blocks_schema, private.blocks_schema_hash) est rangé par une
-- migration GÉNÉRÉE à part (…_schema_blocs.sql, npm run blocks:generate dans web/).
-- La publication (versions, formules d'abonnement, private.live) arrive à l'étape 5 : les
-- colonnes qui en dépendent existent déjà, sans leurs clés étrangères.
--
-- Conventions (§ 1.1) : aucune écriture directe sur contents, edit_locks ni content_categories ;
-- tout passe par des RPC « security definer » qui refusent d'abord si is_staff() est faux
-- (42501 reserve_a_l_equipe) ; les autres erreurs ont le code P0001, un message court et stable
-- (traduit par web/src/texts.ts) et un « detail » en français.

-- ---------------------------------------------------------------------------------------------
-- Table contents
-- ---------------------------------------------------------------------------------------------

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  -- Ne change jamais (déclencheur).
  kind text not null
    check (kind in ('article', 'episode', 'method', 'chapter', 'lesson', 'page', 'template')),
  -- Chapitre : une méthode ; leçon : un chapitre (déclencheur). Interdit pour les autres sortes.
  parent_id uuid references public.contents (id) on delete cascade,
  -- Ordre dans le parent (chapitres et leçons), à partir de 1.
  position integer check (position >= 1),
  -- Chapitres et leçons : « Montrer dans l'app » à la prochaine publication de la méthode.
  -- Décoché à la création ([D29]).
  in_app boolean not null default false,
  -- Le brouillon unique (§ 2.2), vérifié par le déclencheur contents_30_draft.
  draft jsonb not null,
  title text generated always as (draft ->> 'title') stored,
  -- Augmente à chaque enregistrement (contrôle de conflit).
  draft_rev integer not null default 1 check (draft_rev >= 1),
  draft_saved_at timestamptz not null default now(),
  draft_saved_by uuid references public.profiles (id) on delete set null,
  -- Niveau d'accès (null = gratuit). La clé vers access_levels arrive à l'étape 5 ; d'ici là,
  -- save_draft n'accepte que null.
  access_level_id uuid,
  -- Leçon gratuite dans une méthode réservée.
  is_free boolean not null default false,
  -- Pages : l'adresse que demande l'app, dans le brouillon (celle en ligne est figée dans la
  -- version publiée, étape 5).
  slug text check (
    slug is null or (char_length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
  ),
  -- Modèles : style (mise en forme réutilisable), shared (bloc identique partout), starter
  -- (point de départ). Ne change jamais (déclencheur).
  template_sort text check (template_sort in ('style', 'shared', 'starter')),
  -- Publication (étape 5 : clé composite vers versions).
  live_version_id uuid,
  first_published_at timestamptz,
  -- Publication programmée (étape 5).
  scheduled_at timestamptz,
  scheduled_by uuid references public.profiles (id) on delete set null,
  scheduled_rev integer,
  scheduled_set_at timestamptz,
  schedule_error text,
  -- Corbeille (étape 5 pour les contenus) ; le lot sert à restaurer ensemble une méthode, ses
  -- chapitres et ses leçons.
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  trash_batch uuid,
  -- Tenus par le déclencheur du brouillon : fichiers (clés mediaId) et modèles (templateId) cités.
  draft_media_ids uuid[] not null default '{}',
  draft_template_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,

  -- 256 Ko par brouillon ([D35]). Le déclencheur le vérifie d'abord (brouillon_trop_lourd).
  constraint contents_draft_size check (octet_length(draft::text) <= 262144),
  constraint contents_parent_kind check (
    (kind in ('chapter', 'lesson')) = (parent_id is not null)
  ),
  constraint contents_position_parent check ((parent_id is null) = (position is null)),
  constraint contents_in_app_kind check (not in_app or kind in ('chapter', 'lesson')),
  constraint contents_is_free_kind check (not is_free or kind = 'lesson'),
  constraint contents_slug_kind check (slug is null or kind = 'page'),
  constraint contents_template_sort_kind check ((kind = 'template') = (template_sort is not null)),
  constraint contents_access_level_kind check (
    access_level_id is null or kind in ('article', 'episode', 'method', 'page')
  ),
  -- Publication : sortes « racines » seulement.
  constraint contents_live_kind check (
    kind in ('article', 'episode', 'method', 'page')
    or (live_version_id is null and first_published_at is null)
  ),
  constraint contents_schedule_kind check (
    kind in ('article', 'episode', 'method', 'page')
    or (scheduled_at is null and scheduled_by is null and scheduled_rev is null
      and scheduled_set_at is null and schedule_error is null)
  ),
  constraint contents_schedule_complete check (
    scheduled_at is null or (scheduled_rev is not null and scheduled_set_at is not null)
  ),
  constraint contents_trash check (
    (deleted_at is null) = (trash_batch is null) and (deleted_at is not null or deleted_by is null)
  ),
  -- Ordre dans le parent : les éléments dans la corbeille ne comptent pas, et la vérification
  -- attend la fin de la transaction (renuméroter 1, 2, 3 en plusieurs UPDATE). Une contrainte
  -- d'exclusion accepte à la fois « where » et « deferrable », pas un index unique partiel.
  constraint contents_position_unique
    exclude using btree (parent_id with =, position with =)
    where (deleted_at is null)
    deferrable initially deferred
);

comment on table public.contents is
  'Tout ce qui s''écrit (articles, épisodes, méthodes, chapitres, leçons, pages, modèles), avec '
  'son brouillon unique. Aucune écriture directe : tout passe par les RPC.';
comment on column public.contents.draft is
  'Le brouillon (docs/ARCHITECTURE-CONTENUS.md, § 2.2), vérifié par private.blocks_schema().';

-- Une page en brouillon par adresse (hors corbeille).
create unique index contents_page_slug_key
  on public.contents (slug)
  where kind = 'page' and deleted_at is null;
create index contents_list_idx on public.contents (kind, deleted_at, draft_saved_at desc);
create index contents_parent_idx on public.contents (parent_id, position);
create index contents_scheduled_idx on public.contents (scheduled_at) where scheduled_at is not null;
create index contents_draft_media_ids_idx on public.contents using gin (draft_media_ids);
create index contents_draft_template_ids_idx on public.contents using gin (draft_template_ids);
create index contents_created_by_idx on public.contents (created_by);
create index contents_draft_saved_by_idx on public.contents (draft_saved_by);
create index contents_deleted_by_idx on public.contents (deleted_by);
create index contents_scheduled_by_idx on public.contents (scheduled_by);

alter table public.contents enable row level security;
revoke all on public.contents from anon, authenticated;
grant select on public.contents to authenticated;

create policy "Contenus : lecture par l'équipe"
  on public.contents
  for select
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Tables categories et content_categories
-- ---------------------------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  -- Ne change pas : seuls le nom et la position sont modifiables.
  section text not null check (section in ('blog', 'podcasts')),
  name text not null check (char_length(name) between 1 and 100),
  -- Rangement dans la section ; à la création sans position, en fin de liste.
  position integer not null check (position >= 0),
  created_at timestamptz not null default now()
);

comment on table public.categories is
  'Catégories du Blog et des Podcasts. Supprimer une catégorie est définitif ([D28]).';

create unique index categories_section_name_key on public.categories (section, lower(name));
create index categories_section_position_idx on public.categories (section, position);

alter table public.categories enable row level security;
revoke all on public.categories from anon, authenticated;
grant select, delete on public.categories to authenticated;
grant insert (section, name, position), update (name, position) on public.categories to authenticated;

create policy "Catégories : lecture par l'équipe"
  on public.categories
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Catégories : ajout par l'équipe"
  on public.categories
  for insert
  to authenticated
  with check ((select public.is_staff()));

create policy "Catégories : modification par l'équipe"
  on public.categories
  for update
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

create policy "Catégories : suppression par l'équipe"
  on public.categories
  for delete
  to authenticated
  using ((select public.is_staff()));

-- Les catégories DU BROUILLON (recopiées dans la version à la publication, étape 5).
create table public.content_categories (
  content_id uuid not null references public.contents (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (content_id, category_id)
);

comment on table public.content_categories is
  'Catégories des brouillons. Écrites seulement par save_draft.';

create index content_categories_category_idx on public.content_categories (category_id);

alter table public.content_categories enable row level security;
revoke all on public.content_categories from anon, authenticated;
grant select on public.content_categories to authenticated;

create policy "Catégories des contenus : lecture par l'équipe"
  on public.content_categories
  for select
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Table edit_locks (verrou « un seul à la fois »)
-- ---------------------------------------------------------------------------------------------

-- Libre si holder_id est null, périmé si heartbeat_at a plus de 90 s (private.lock_ttl()).
-- Relâcher ne supprime pas la ligne (UPDATE de holder_id à null) : Realtime filtre les UPDATE par
-- content_id et leur applique la RLS, pas les DELETE. La tâche « menage » efface les lignes sans
-- signe de vie depuis plus d'un jour.
-- Le verrou est tenu par un membre ET par une ouverture de l'éditeur (holder_session, tirée au
-- hasard à chaque ouverture) : deux onglets du même membre ne partagent pas la main, et fermer
-- l'un ne la retire pas à l'autre.
create table public.edit_locks (
  content_id uuid primary key references public.contents (id) on delete cascade,
  -- Retirer un membre libère ses verrous.
  holder_id uuid references public.profiles (id) on delete set null,
  -- L'ouverture de l'éditeur qui tient le verrou (null : content_create, ou appel sans éditeur).
  holder_session uuid,
  taken_at timestamptz,
  heartbeat_at timestamptz not null default now(),
  -- Recopié à chaque enregistrement : ceux qui regardent en lecture seule n'écoutent que lui.
  draft_rev integer not null default 1,
  constraint edit_locks_taken check (holder_id is null or taken_at is not null),
  constraint edit_locks_session check (holder_id is not null or holder_session is null)
);

comment on table public.edit_locks is
  'Qui écrit quel brouillon (verrou « un seul à la fois »), suivi par Realtime. Écrite '
  'seulement par content_create, lock_take, lock_heartbeat, lock_release et save_draft.';

create index edit_locks_holder_idx on public.edit_locks (holder_id);

alter table public.edit_locks enable row level security;
revoke all on public.edit_locks from anon, authenticated;
grant select on public.edit_locks to authenticated;

create policy "Verrous : lecture par l'équipe"
  on public.edit_locks
  for select
  to authenticated
  using ((select public.is_staff()));

-- Realtime (Postgres Changes) : l'admin écoute les INSERT et UPDATE de edit_locks, filtrés par
-- content_id, soumis à la politique ci-dessus. Jamais contents : on n'envoie jamais le brouillon.
alter publication supabase_realtime add table public.edit_locks;

-- ---------------------------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------------------------

-- Un verrou sans signe de vie depuis ce délai est périmé : n'importe qui peut le prendre ([D13]).
create function private.lock_ttl()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '90 seconds'
$$;

-- État du verrou d'un contenu, pour l'appelant (même forme pour lock_take et lock_status).
-- mine : l'appelant tient le verrou depuis cette ouverture de l'éditeur (il peut enregistrer) ;
-- is_active : quelqu'un le tient et a donné signe de vie depuis moins de 90 s ; draft_rev :
-- révision actuelle du brouillon.
create function private.lock_state(target_content_id uuid, editor_session uuid)
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

-- Le brouillon vide d'un nouveau contenu.
create function private.empty_draft(title text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'v', 1,
    'title', coalesce(title, ''),
    'summary', null,
    'cover', null,
    'audio', null,
    'blocks', '[]'::jsonb
  )
$$;

-- Copie d'une liste de blocs avec de nouveaux identifiants, encadrés compris (point de départ,
-- plus tard « Détacher » et les modèles « mise en forme ») : un même bloc ne doit jamais avoir
-- deux fois le même id.
create function private.blocks_with_new_ids(blocks jsonb)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      case
        when b ->> 'type' = 'box' then
          jsonb_set(
            b || jsonb_build_object('id', gen_random_uuid()::text),
            '{blocks}',
            coalesce(
              (
                select jsonb_agg(
                  inner_block || jsonb_build_object('id', gen_random_uuid()::text)
                  order by inner_position
                )
                from jsonb_array_elements(b -> 'blocks') with ordinality inner_list (inner_block, inner_position)
              ),
              '[]'::jsonb
            )
          )
        else b || jsonb_build_object('id', gen_random_uuid()::text)
      end
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(blocks, '[]'::jsonb)) with ordinality list (b, ord)
$$;

-- Là où un fichier est utilisé ([D6]) : les brouillons qui le citent (modèles et contenus dans
-- la corbeille compris). Les versions en ligne s'y ajoutent à l'étape 5. Mêmes colonnes qu'à
-- l'étape 3 : public.media_uses et l'admin ne changent pas.
create or replace function private.media_uses(target_media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  parent_title text,
  in_draft boolean,
  in_app boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.kind,
    nullif(c.title, ''),
    nullif(parent.title, ''),
    true,
    false
  from public.contents c
  left join public.contents parent on parent.id = c.parent_id
  where c.draft_media_ids @> array[target_media_id]
  order by c.title, c.id
$$;

-- Ménage hebdomadaire (étape 3), avec en plus les verrous sans signe de vie depuis plus d'un
-- jour (libres, ou périmés depuis longtemps). Chaque suppression envoie à Realtime un DELETE qui
-- ne contient que content_id.
create or replace function private.housekeeping()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '14 days';
  delete from net._http_response r where r.created < now() - interval '7 days';
  delete from public.media_audit a
  where a.checked_at < now() - interval '90 days'
    and a.id <> (select max(b.id) from public.media_audit b);
  delete from public.edit_locks l where l.heartbeat_at < now() - interval '1 day';
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs de contents (ils se déclenchent dans l'ordre alphabétique de leurs noms)
-- ---------------------------------------------------------------------------------------------

-- 10 : sorte et sorte de modèle immuables ; parent de la bonne sorte.
create function private.contents_check_kind()
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
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_immuable',
      detail = 'La sorte d''un contenu (et celle d''un modèle) ne change jamais.';
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

create trigger contents_10_kind
  before insert or update on public.contents
  for each row execute function private.contents_check_kind();

-- 20 : garde de corbeille. Un contenu dans la corbeille ne change pas, sauf :
--   1. pour en sortir (deleted_at vidé : restore, étape 5) ;
--   2. quand une colonne d'auteur passe à null et que rien d'autre ne change (retrait d'un
--      membre de l'équipe : « on delete set null ») ;
--   3. pendant template_detach_all (étape 6), qui le signale par un réglage local à la
--      transaction (set_config('declikora.detach_all', 'on', true)) et ne change que le
--      brouillon et ce qui en découle. Aucune écriture directe n'étant permise sur contents,
--      seul le code de la base peut le poser.
create function private.contents_trash_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- title est une colonne générée : pas encore calculée dans un déclencheur BEFORE.
  authors constant text[] := array['created_by', 'draft_saved_by', 'deleted_by', 'scheduled_by', 'title'];
  draft_columns constant text[] := array[
    'draft', 'draft_rev', 'draft_media_ids', 'draft_template_ids', 'draft_saved_at',
    'draft_saved_by', 'title'
  ];
begin
  if old.deleted_at is null or new.deleted_at is null then
    return new;
  end if;

  if (to_jsonb(new) - authors) = (to_jsonb(old) - authors)
    and (new.created_by is null or new.created_by = old.created_by)
    and (new.draft_saved_by is null or new.draft_saved_by = old.draft_saved_by)
    and (new.deleted_by is null or new.deleted_by = old.deleted_by)
    and (new.scheduled_by is null or new.scheduled_by = old.scheduled_by) then
    return new;
  end if;

  if coalesce(current_setting('declikora.detach_all', true), '') = 'on'
    and (to_jsonb(new) - draft_columns) = (to_jsonb(old) - draft_columns) then
    return new;
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'dans_la_corbeille',
    detail = 'Ce contenu est dans la corbeille : restaure-le pour le modifier.';
end;
$$;

create trigger contents_20_trash_guard
  before update on public.contents
  for each row execute function private.contents_trash_guard();

-- 30 : le brouillon (§ 3.2).
--   0. taille (256 Ko), avant la vérification de forme ;
--   1. forme, selon la variante (template pour un modèle, draft sinon), avec pg_jsonschema ;
--   2. identifiants de blocs uniques (encadrés compris), ce que JSON Schema ne sait pas dire ;
--   3. draft_media_ids et draft_template_ids recalculés (toutes les clés mediaId et templateId) ;
--   4. les fichiers cités sont verrouillés en partage (for share : media_trash prend for update,
--      donc un fichier ne part pas à la corbeille pendant qu'on l'insère), puis refusés s'ils
--      n'existent pas, ne sont pas prêts ou sont dans la corbeille ; de même pour les modèles
--      cités (bloc lié) : ils doivent exister, être des modèles « shared » et hors corbeille.
-- Le « bloc unique » d'un modèle shared arrive à l'étape 6, avec la création des modèles.
create function private.contents_check_draft()
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
  problem text;
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
  end if;

  new.draft_media_ids := media_ids;
  new.draft_template_ids := template_ids;
  return new;
end;
$$;

create trigger contents_30_draft
  before insert or update of draft on public.contents
  for each row execute function private.contents_check_draft();

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs des catégories
-- ---------------------------------------------------------------------------------------------

-- Nom nettoyé (espaces autour, Unicode composé) ; position en fin de liste si elle manque.
create function private.categories_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := normalize(btrim(new.name), NFC);
  if tg_op = 'UPDATE' and new.section is distinct from old.section then
    raise exception using
      errcode = 'P0001',
      message = 'categorie_invalide',
      detail = 'La section d''une catégorie ne change pas.';
  end if;
  if new.position is null then
    select coalesce(max(c.position) + 1, 0) into new.position
    from public.categories c
    where c.section = new.section;
  end if;
  return new;
end;
$$;

create trigger categories_before_write
  before insert or update on public.categories
  for each row execute function private.categories_before_write();

-- La catégorie doit être de la section de la sorte : Blog pour un article, Podcasts pour un
-- épisode. Les autres sortes n'ont pas de catégorie.
create function private.content_categories_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  content_kind text;
  category_section text;
begin
  select c.kind into content_kind from public.contents c where c.id = new.content_id;
  select c.section into category_section from public.categories c where c.id = new.category_id;
  if not (
    (content_kind = 'article' and category_section = 'blog')
    or (content_kind = 'episode' and category_section = 'podcasts')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'categorie_invalide',
      detail = 'Un article prend des catégories du Blog, un épisode celles des Podcasts ; '
        'les autres contenus n''en ont pas.';
  end if;
  return new;
end;
$$;

create trigger content_categories_check
  before insert or update on public.content_categories
  for each row execute function private.content_categories_check();

-- ---------------------------------------------------------------------------------------------
-- RPC de l'admin
-- ---------------------------------------------------------------------------------------------

-- Crée un contenu et en donne aussitôt le verrou à l'appelant (qui ouvre l'éditeur).
--   kind : article, episode, method, chapter, lesson, page ou template ;
--   parent_id : la méthode d'un chapitre, le chapitre d'une leçon (interdit pour les autres) ;
--   title : le titre de départ (texte nettoyé, 200 caractères au plus) ;
--   template_sort : la sorte d'un modèle (style, shared, starter), obligatoire pour un modèle et
--     interdite sinon ; elle ne change plus ensuite ;
--   from_template_id : un modèle « point de départ » (starter) hors corbeille, dont les blocs sont
--     recopiés avec de nouveaux identifiants (§ 2.5). Pas pour un modèle.
-- Un chapitre ou une leçon va en fin de liste de son parent, « Montrer dans l'app » décoché.
create function public.content_create(
  kind text,
  parent_id uuid default null,
  title text default '',
  template_sort text default null,
  from_template_id uuid default null
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
      or starter.deleted_at is not null then
      raise exception using
        errcode = 'P0001',
        message = 'modele_indisponible',
        detail = 'Ce point de départ n''existe pas, n''est pas un modèle « point de départ » ou '
          'est dans la corbeille.';
    end if;

    new_draft := jsonb_set(
      new_draft, '{blocks}', private.blocks_with_new_ids(starter.draft -> 'blocks')
    );
  end if;

  insert into public.contents (
    kind, parent_id, position, draft, template_sort, created_by, draft_saved_by
  )
  values (
    content_create.kind,
    parent.id,
    next_position,
    new_draft,
    content_create.template_sort,
    me,
    me
  )
  returning * into created;

  insert into public.edit_locks (content_id, holder_id, taken_at, heartbeat_at, draft_rev)
  values (created.id, me, now(), now(), created.draft_rev);

  return created;
end;
$$;

-- Enregistre le brouillon et ses réglages, sous le verrou (§ 3.3).
-- settings (facultatif ; une clé absente ne change rien) :
--   { "in_app": bool, "is_free": bool, "slug": text|null, "access_level_id": null,
--     "category_ids": [uuid…] }
-- Renvoie la nouvelle révision et l'heure de l'enregistrement.
create function public.save_draft(
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
    -- Réponse perdue (réseau coupé après l'enregistrement) : le même envoi, sans réglages, a
    -- déjà donné la révision suivante. On renvoie ce qui est en base au lieu d'un faux conflit.
    if target.draft_rev = save_draft.base_rev + 1
      and target.draft_saved_by is not distinct from me
      and target.draft = save_draft.draft
      and s = '{}'::jsonb then
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
        'access_level_id (null), category_ids (liste d''identifiants).';
  end if;

  -- Les formules d'abonnement arrivent avec la publication (étape 5).
  if s ? 'access_level_id' and jsonb_typeof(s -> 'access_level_id') <> 'null' then
    raise exception using
      errcode = 'P0001',
      message = 'reglages_invalides',
      detail = 'Les niveaux d''accès ne sont pas encore disponibles.';
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
      access_level_id = case when s ? 'access_level_id' then null else c.access_level_id end
    where c.id = target.id
    returning c.draft_rev into new_rev;
  exception
    -- Un réglage qui ne va pas avec la sorte (« Montrer dans l'app » sur un article…).
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

-- Prend le verrou d'un contenu : réussit s'il est libre, périmé (90 s sans signe de vie), déjà
-- à soi, ou si force (« Reprendre la main », après confirmation). Sinon, ne change rien : mine
-- vaut faux et holder_name donne le nom de la personne qui écrit. editor_session identifie
-- l'ouverture de l'éditeur : le même membre dans un autre onglet prend la main à l'ancien.
create function public.lock_take(
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

-- Signe de vie (toutes les 20 s, et au retour sur l'onglet). Faux si l'appelant ne tient plus le
-- verrou depuis cette ouverture de l'éditeur (quelqu'un, ou lui dans un autre onglet, a repris
-- la main) : l'éditeur passe en lecture seule.
create function public.lock_heartbeat(content_id uuid, editor_session uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  update public.edit_locks l
  set heartbeat_at = now()
  where l.content_id = lock_heartbeat.content_id and l.holder_id = (select auth.uid())
    and l.holder_session is not distinct from lock_heartbeat.editor_session;
  return found;
end;
$$;

-- Relâche le verrou en quittant l'éditeur (la ligne reste, holder_id passe à null). Faux si
-- l'appelant ne le tenait pas depuis cette ouverture de l'éditeur : fermer un vieil onglet ne
-- retire pas la main au nouveau.
create function public.lock_release(content_id uuid, editor_session uuid default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  update public.edit_locks l
  set holder_id = null, holder_session = null, taken_at = null, heartbeat_at = now()
  where l.content_id = lock_release.content_id and l.holder_id = (select auth.uid())
    and l.holder_session is not distinct from lock_release.editor_session;
  return found;
end;
$$;

-- État du verrou, pour le repli sans Realtime (toutes les 30 s).
create function public.lock_status(content_id uuid, editor_session uuid default null)
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
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();

  if not exists (select 1 from public.contents c where c.id = lock_status.content_id) then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  return query select * from private.lock_state(lock_status.content_id, lock_status.editor_session);
end;
$$;

revoke execute on function
  public.content_create(text, uuid, text, text, uuid),
  public.save_draft(uuid, integer, jsonb, jsonb, uuid),
  public.lock_take(uuid, boolean, uuid),
  public.lock_heartbeat(uuid, uuid),
  public.lock_release(uuid, uuid),
  public.lock_status(uuid, uuid)
from public, anon;
grant execute on function
  public.content_create(text, uuid, text, text, uuid),
  public.save_draft(uuid, integer, jsonb, jsonb, uuid),
  public.lock_take(uuid, boolean, uuid),
  public.lock_heartbeat(uuid, uuid),
  public.lock_release(uuid, uuid),
  public.lock_status(uuid, uuid)
to authenticated;

-- Filet de sécurité : aucune fonction de private n'est exécutable par anon ni authenticated,
-- sauf reader_can_open.
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

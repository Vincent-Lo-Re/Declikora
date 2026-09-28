-- Publication (étape 5, partie base n° 1) : formules d'abonnement, lecteurs (provisoire), versions
-- figées, contenus en ligne (private.live), publication manuelle et programmée, retrait de l'app,
-- « Revenir à cette version », réglages du niveau d'accès et de l'adresse dans save_draft, et les
-- fonctions de lecture de l'app (anon).
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.3, § 1.4, § 1.6, § 1.7, § 2.4, § 3.2 à 3.4, § 3.8,
-- § 5.1, « Étape 5 ») et les décisions D2, D14 à D18, D26, D27, D30, D31, D32, D37, D41.
--
-- Cette migration ne fait que TRANSFORMER l'existant sans perte (les étapes 1 à 4 sont en
-- production, avec des pages déjà écrites) : nouvelles tables, colonnes ajoutées, clés ajoutées
-- sur des colonnes qui ne contiennent que null, fonctions remplacées (create or replace) avec la
-- même signature.
--
-- Laissé à la partie n° 2 de l'étape 5 (autre migration) : la règle « public ou protégé »
-- (private.files_to_move, private.reader_can_open, app_file_locations), trash, restore,
-- empty_trash et la purge des contenus, media_push. Elles s'appuient sur private.live et sur
-- versions.media_ids / versions.cover_media_id, posés ici.
-- Laissé à l'étape 7 : le plan des méthodes (outline, in_app, is_free des leçons dans
-- private.live, publish_preview, D29) ; une méthode ne se publie pas encore (sorte_invalide).
--
-- Conventions (§ 1.1) : aucune écriture directe sur versions ; les RPC de l'admin sont
-- « security definer » et refusent d'abord si is_staff() (ou is_admin()) est faux ; les autres
-- erreurs ont le code P0001, un message court et stable (traduit par web/src/texts.ts) et un
-- « detail » en français.

-- ---------------------------------------------------------------------------------------------
-- Formules d'abonnement (access_levels)
-- ---------------------------------------------------------------------------------------------

-- Rangées de la moins complète (rang 1) à la plus complète. « Gratuit » n'est pas une ligne
-- (niveau null). Les versions figent l'identifiant de la formule, pas son rang ([D2]) : les
-- réordonner change tout de suite ce que chaque abonné peut ouvrir.
create table public.access_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  -- Écrit par le déclencheur (fin de liste) et par access_levels_reorder seulement.
  rank integer not null check (rank >= 1),
  created_at timestamptz not null default now(),
  -- Vérifié à la fin de la transaction : réordonner en une seule commande.
  constraint access_levels_rank_key unique (rank) deferrable initially deferred
);

comment on table public.access_levels is
  'Formules d''abonnement (rang 1 = la moins complète). Écriture par les admins ; rangement par '
  'access_levels_reorder ; suppression d''une formule inutilisée seulement ([D32]).';

create unique index access_levels_name_key on public.access_levels (lower(name));

alter table public.access_levels enable row level security;
revoke all on public.access_levels from anon, authenticated;
grant select, delete on public.access_levels to authenticated;
grant insert (name), update (name) on public.access_levels to authenticated;

create policy "Formules : lecture par l'équipe"
  on public.access_levels
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Formules : ajout par un admin"
  on public.access_levels
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Formules : renommage par un admin"
  on public.access_levels
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Formules : suppression par un admin"
  on public.access_levels
  for delete
  to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- Lecteurs (reader_access), PROVISOIRE ([D37])
-- ---------------------------------------------------------------------------------------------

-- Support provisoire pour écrire et tester les règles des contenus réservés, en attendant le
-- choix du paiement (ADMIN § 10). Écrite uniquement avec la clé secrète. Les règles de lecture
-- ne dépendent que de private.reader_rank().
create table public.reader_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_level_id uuid not null references public.access_levels (id) on delete restrict,
  -- null : sans date de fin.
  valid_until timestamptz,
  -- D'où vient l'abonnement (texte libre, à revoir avec le paiement).
  source text,
  created_at timestamptz not null default now()
);

comment on table public.reader_access is
  'PROVISOIRE ([D37]) : la formule de chaque lecteur. Écrite avec la clé secrète seulement ; un '
  'lecteur lit sa propre ligne.';

create index reader_access_level_idx on public.reader_access (access_level_id);

alter table public.reader_access enable row level security;
revoke all on public.reader_access from anon, authenticated;
grant select on public.reader_access to authenticated;

create policy "Lecteurs : chacun lit sa propre ligne"
  on public.reader_access
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Versions (copies figées et historique)
-- ---------------------------------------------------------------------------------------------

create table public.versions (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  -- 1, 2, 3… par contenu.
  number integer not null check (number >= 1),
  -- manual, scheduled, template (mise à jour d'un modèle, étape 6), outline (retrait d'un
  -- chapitre ou d'une leçon, étape 7), files (textes de la médiathèque, [D30] option B).
  origin text not null check (origin in ('manual', 'scheduled', 'template', 'outline', 'files')),
  -- Copie figée du brouillon : blocs liés et textes alternatifs résolus (§ 2.4), vérifiée par
  -- la variante « published » du schéma des blocs.
  body jsonb not null,
  -- SHA-256 du corps résolu, de files et de is_free (§ 3.4 : réutilisation à l'étape 7).
  body_hash text not null check (body_hash ~ '^[0-9a-f]{64}$'),
  -- Pour chaque fichier cité : kind, mime, path, alt, transcript, width, height, durationS,
  -- figés à la publication ([D30]).
  files jsonb not null default '{}' check (jsonb_typeof(files) = 'object'),
  -- Accès figé (null = gratuit) ; is_free : leçon gratuite (étape 7).
  access_level_id uuid references public.access_levels (id) on delete restrict,
  is_free boolean not null default false,
  -- Pages : l'adresse figée, celle que cherche app_page.
  slug text,
  category_ids uuid[] not null default '{}',
  -- Tous les fichiers cités (couverture et son compris), et l'image de présentation, publique
  -- tant que la version est en ligne, quel que soit le niveau (question 1, réponse B).
  media_ids uuid[] not null default '{}',
  cover_media_id uuid,
  template_ids uuid[] not null default '{}',
  block_types text[] not null default '{}',
  -- Méthodes : le plan figé (étape 7).
  outline jsonb,
  -- Révision du brouillon d'origine (« modifié depuis la publication »).
  draft_rev integer not null,
  published_at timestamptz not null default now(),
  -- Sans clé étrangère (§ 1.1) : une version ne change jamais, même quand l'auteur quitte
  -- l'équipe. Le nom est recopié.
  published_by uuid,
  published_by_name text,

  constraint versions_id_content_key unique (id, content_id),
  constraint versions_number_key unique (content_id, number),
  constraint versions_cover_cited check (cover_media_id is null or cover_media_id = any (media_ids))
);

comment on table public.versions is
  'Copies figées publiées (ce que lit l''app) et historique. Une version ne change jamais ; elle '
  'ne disparaît qu''avec son contenu, effacé définitivement.';

create index versions_media_ids_idx on public.versions using gin (media_ids);
create index versions_category_ids_idx on public.versions using gin (category_ids);
create index versions_template_ids_idx on public.versions using gin (template_ids);
create index versions_access_level_idx on public.versions (access_level_id)
  where access_level_id is not null;
create index versions_slug_idx on public.versions (slug) where slug is not null;

alter table public.versions enable row level security;
revoke all on public.versions from anon, authenticated;
grant select on public.versions to authenticated;

create policy "Versions : lecture par l'équipe"
  on public.versions
  for select
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Contenus : niveau d'accès choisi, clés vers les formules et vers la version en ligne
-- ---------------------------------------------------------------------------------------------

-- Pas de niveau par défaut ([D41]) : vrai dès que l'équipe a choisi « Gratuit » ou une formule
-- (réglage access_level_id de save_draft, null compris). publish et schedule refusent tant
-- qu'il est faux (acces_a_choisir). Les pages déjà écrites partent donc de faux.
alter table public.contents
  add column access_chosen boolean not null default false;

alter table public.contents
  add constraint contents_access_chosen_kind check (
    not access_chosen or kind in ('article', 'episode', 'method', 'page')
  );

-- Jusqu'ici, save_draft n'acceptait que null : aucune ligne existante ne gêne ces clés.
alter table public.contents
  add constraint contents_access_level_id_fkey
  foreign key (access_level_id) references public.access_levels (id) on delete restrict;

-- Un contenu ne peut pas pointer vers la version d'un autre. Seule live_version_id passe à null
-- si la version disparaît (Postgres 15+).
alter table public.contents
  add constraint contents_live_version_fkey
  foreign key (live_version_id, id) references public.versions (id, content_id)
  on delete set null (live_version_id);

create index contents_access_level_idx on public.contents (access_level_id)
  where access_level_id is not null;
create index contents_live_version_idx on public.contents (live_version_id)
  where live_version_id is not null;

-- ---------------------------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------------------------

-- Refuse si l'appelant n'est pas un admin en aal2, avec une session ouverte.
create function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception using
      errcode = '42501',
      message = 'reserve_aux_admins',
      detail = 'Réservé aux admins, après la double vérification.';
  end if;
end;
$$;

-- Rang de la formule en cours de validité du lecteur connecté (auth.uid()), ou null (anonyme,
-- ou sans abonnement). Seule source des règles de lecture des contenus réservés ([D37]).
create function private.reader_rank()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(al.rank)
  from public.reader_access ra
  join public.access_levels al on al.id = ra.access_level_id
  where ra.user_id = (select auth.uid())
    and (ra.valid_until is null or ra.valid_until > now())
$$;

-- Toutes les versions EN LIGNE, avec leur niveau réel (level_id, level_rank ; null = gratuit).
-- Étape 5 : les sortes racines hors corbeille dont live_version_id est renseigné. L'étape 7 y
-- ajoute (create or replace view, mêmes colonnes en tête) les chapitres et les leçons cités par
-- le plan de la version en ligne d'une méthode, avec method_id et le niveau d'une leçon
-- gratuite ou d'une introduction. Toutes les règles (lecture de l'app, fichiers publics, « où
-- il est utilisé ») s'appuient sur cette vue. Jamais exposée.
create view private.live as
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
  and c.kind in ('article', 'episode', 'method', 'page');

comment on view private.live is
  'Les versions en ligne et leur niveau réel (null = gratuit). Racines à l''étape 5 ; chapitres '
  'et leçons des méthodes à l''étape 7.';

revoke all on private.live from public, anon, authenticated;

-- Les éléments dont le verrou compte pour publier un contenu : lui-même et, pour une méthode,
-- ses chapitres et ses leçons hors corbeille ([D14], [D31]).
create function private.publish_scope(target_content_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  with recursive tree as (
    select c.id from public.contents c where c.id = target_content_id
    union all
    select child.id
    from public.contents child
    join tree on child.parent_id = tree.id
    where child.deleted_at is null
  )
  select coalesce(array_agg(tree.id), '{}') from tree
$$;

-- Tous les fichiers cités par un corps (clés mediaId, [D9]), triés.
create function private.media_ids_of(body jsonb)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct (v #>> '{}')::uuid order by (v #>> '{}')::uuid), '{}')
  from jsonb_path_query(body, 'strict $.**.mediaId') v
  where jsonb_typeof(v) = 'string'
$$;

-- Les blocs liés d'un brouillon remplacés par une copie du bloc unique de leur modèle (§ 2.4) :
-- la copie garde l'id du bloc lié et porte le marqueur templateId ; les blocs d'un encadré
-- copié reçoivent des id tirés de l'id du bloc lié et de leur id d'origine (toujours les mêmes
-- d'une publication à l'autre : l'empreinte ne change pas sans raison). Les modèles cités sont
-- verrouillés en partage (for share) : ils ne partent pas à la corbeille pendant la publication.
create function private.resolve_linked(draft jsonb)
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
          detail = 'Ce contenu cite un bloc identique partout dont le modèle n''existe plus, est '
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

-- Une image dont le texte alternatif est null (« reprendre celui de la médiathèque ») reçoit le
-- texte actuel du fichier (chaîne vide s'il n'y en a pas) et le marqueur altFromLibrary (§ 2.4).
create function private.resolve_alt(block jsonb)
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
        coalesce((select m.alt from public.media m where m.id = (block ->> 'mediaId')::uuid), ''),
        'altFromLibrary',
        true
      )
    else block
  end
$$;

-- Les textes alternatifs d'une liste de blocs de premier niveau, encadrés compris.
create function private.resolve_alts(blocks jsonb)
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
                select jsonb_agg(private.resolve_alt(inner_block) order by inner_position)
                from jsonb_array_elements(b -> 'blocks') with ordinality inner_list (inner_block, inner_position)
              ),
              '[]'::jsonb
            )
          )
        else private.resolve_alt(b)
      end
      order by n
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(blocks, '[]'::jsonb)) with ordinality list (b, n)
$$;

-- Un fichier peut-il être cité par un brouillon rendu par « Revenir à cette version » ?
create function private.media_available(target_media_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.media m
    where m.id = target_media_id and m.status = 'ready' and m.deleted_at is null
  )
$$;

-- Un bloc d'une version rendu à la forme d'un brouillon (§ 3.4, revert_to_version) : un fichier
-- absent, dans la corbeille ou pas prêt devient null (« Fichier supprimé, choisis-en un
-- autre ») ; une image marquée altFromLibrary suit de nouveau la médiathèque (alt null).
create function private.block_to_draft(block jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when block ->> 'type' = 'image' then
      (block - 'altFromLibrary')
        || jsonb_build_object(
          'mediaId',
          case
            when jsonb_typeof(block -> 'mediaId') = 'string'
              and private.media_available((block ->> 'mediaId')::uuid)
            then block -> 'mediaId'
            else 'null'::jsonb
          end,
          'alt',
          case when block -> 'altFromLibrary' = 'true'::jsonb then 'null'::jsonb else block -> 'alt' end
        )
    when block ->> 'type' = 'box' then
      jsonb_set(
        block,
        '{blocks}',
        coalesce(
          (
            select jsonb_agg(
              case
                when inner_block ->> 'type' = 'image' then
                  (inner_block - 'altFromLibrary')
                    || jsonb_build_object(
                      'mediaId',
                      case
                        when jsonb_typeof(inner_block -> 'mediaId') = 'string'
                          and private.media_available((inner_block ->> 'mediaId')::uuid)
                        then inner_block -> 'mediaId'
                        else 'null'::jsonb
                      end,
                      'alt',
                      case
                        when inner_block -> 'altFromLibrary' = 'true'::jsonb then 'null'::jsonb
                        else inner_block -> 'alt'
                      end
                    )
                else inner_block
              end
              order by inner_position
            )
            from jsonb_array_elements(block -> 'blocks') with ordinality inner_list (inner_block, inner_position)
          ),
          '[]'::jsonb
        )
      )
    else block
  end
$$;

-- Le corps d'une version rendu à la forme d'un brouillon (§ 3.4) : chaque copie marquée
-- templateId redevient un bloc lié si son modèle « shared » existe encore hors corbeille, sinon
-- le marqueur est retiré (copie ordinaire) ; fichiers et textes alternatifs comme ci-dessus ;
-- couverture et son indisponibles retirés.
create function private.body_to_draft(body jsonb)
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

-- Qui écrit en ce moment un des éléments de ce périmètre (verrou tenu et signe de vie depuis
-- moins de 90 s), en dehors de except_member (null : n'importe qui). Nom, sinon e-mail.
create function private.active_writer(scope uuid[], except_member uuid)
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

-- Publication (§ 3.4). Sans garde is_staff() : appelée par publish (auth.uid()) et par la tâche
-- « publications » (auteur de la programmation), sous pg_cron où is_staff() est toujours faux.
--   0. contenu verrouillé (for update) ; sorte racine hors corbeille ; niveau d'accès choisi
--      ([D41]) ;
--   1. « manual » seulement : refus si un AUTRE membre écrit le contenu (ou un élément d'une
--      méthode) ([D14]) ; la tâche planifiée a déjà tranché ([D31]) ;
--   2. expected_rev (s'il est donné) = draft_rev ;
--   3. blocs liés résolus ; pour une page, une adresse qui n'est pas celle d'une autre page en
--      ligne ; pour un épisode, le son ; aucune image sans fichier ; fichiers verrouillés en
--      partage (for share, comme le déclencheur du brouillon) puis prêts, hors corbeille et de
--      la bonne sorte ;
--   4. textes alternatifs résolus, files figé, empreinte, variante « published » vérifiée ;
--   5. version écrite ; live_version_id, first_published_at (première fois seulement, [D27]) ;
--      programmation effacée.
-- Renvoie la version écrite.
create function private.do_publish(
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

  if target.kind = 'episode' and jsonb_typeof(body -> 'audio') is distinct from 'object' then
    raise exception using
      errcode = 'P0001',
      message = 'son_manquant',
      detail = 'Choisis le son de l''épisode avant de le publier.';
  end if;

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

-- Réglages déjà en base, tels que les demande cet envoi de save_draft ? Sert à reconnaître le
-- rejeu d'un envoi dont la réponse s'est perdue (étape 4, étendu aux réglages) : si tout ce que
-- l'envoi demande est déjà en place, le rejouer ne changerait rien.
create function private.settings_already_applied(target public.contents, s jsonb)
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
    where k not in ('in_app', 'is_free', 'slug', 'access_level_id', 'category_ids')
  ) then
    return false;
  end if;

  if s ? 'in_app' and (
    jsonb_typeof(s -> 'in_app') <> 'boolean' or target.in_app <> (s ->> 'in_app')::boolean
  ) then
    return false;
  end if;
  if s ? 'is_free' and (
    jsonb_typeof(s -> 'is_free') <> 'boolean' or target.is_free <> (s ->> 'is_free')::boolean
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

-- « Où il est utilisé » ([D6]) : les brouillons qui citent le fichier (modèles et corbeille
-- compris) et, désormais, les versions EN LIGNE qui le citent (in_app). Les anciennes versions de
-- l'historique ne comptent pas. Mêmes colonnes qu'aux étapes 3 et 4.
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
    nullif(parent.title, ''),
    bool_or(u.in_draft),
    bool_or(u.in_app)
  from uses u
  join public.contents c on c.id = u.id
  left join public.contents parent on parent.id = c.parent_id
  group by c.id, c.kind, c.title, parent.title
  order by c.title, c.id
$$;

-- La lecture d'un contenu en ligne par l'app (§ 5.1), pour app_content et app_page. Le contenu
-- réservé n'est donné qu'à un lecteur dont la formule atteint le rang voulu ; sinon locked, sans
-- blocs, sans son, et files ne contient que l'image de présentation (toujours publique, question
-- 1). L'emplacement réel des fichiers (public ou protégé) n'y figure pas : app_file_locations.
create function private.app_content_json(target_version_id uuid)
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
    'summary', v.body -> 'summary',
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
    select l.level_id is null or coalesce(private.reader_rank() >= l.level_rank, false) as unlocked
  ) access
  where l.version_id = target_version_id
  limit 1
$$;

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs
-- ---------------------------------------------------------------------------------------------

-- Formules : nom nettoyé (espaces, Unicode composé) ; une nouvelle formule va en fin de liste.
create function private.access_levels_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := normalize(btrim(new.name), NFC);
  if tg_op = 'INSERT' and new.rank is null then
    -- Deux ajouts en même temps ne prennent pas le même rang.
    perform pg_advisory_xact_lock(hashtext('declikora.access_levels'));
    select coalesce(max(a.rank), 0) + 1 into new.rank from public.access_levels a;
  end if;
  return new;
end;
$$;

create trigger access_levels_before_write
  before insert or update on public.access_levels
  for each row execute function private.access_levels_before_write();

-- Une formule utilisée (brouillon, version ou lecteur) ne se supprime pas ([D32]). La clé
-- étrangère « restrict » le refuserait aussi ; ce déclencheur donne un message lisible.
create function private.access_levels_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.contents c where c.access_level_id = old.id)
    or exists (select 1 from public.versions v where v.access_level_id = old.id)
    or exists (select 1 from public.reader_access r where r.access_level_id = old.id) then
    raise exception using
      errcode = 'P0001',
      message = 'formule_utilisee',
      detail = 'Cette formule est utilisée par un contenu, une version publiée ou un abonné : '
        'renomme-la ou déplace-la plutôt.';
  end if;
  return old;
end;
$$;

create trigger access_levels_before_delete
  before delete on public.access_levels
  for each row execute function private.access_levels_before_delete();

-- Une version ne change jamais (§ 1.7) : aucune modification, aucun vidage. Elle ne disparaît
-- qu'en cascade, quand son contenu est effacé définitivement (le contenu n'existe alors plus).
create function private.versions_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE'
    and not exists (select 1 from public.contents c where c.id = old.content_id) then
    return old;
  end if;
  raise exception using
    errcode = 'P0001',
    message = 'version_immuable',
    detail = 'Une version publiée ne se modifie pas et ne se supprime pas.';
end;
$$;

create trigger versions_immutable
  before update or delete on public.versions
  for each row execute function private.versions_immutable();

create trigger versions_no_truncate
  before truncate on public.versions
  for each statement execute function private.versions_immutable();

-- ---------------------------------------------------------------------------------------------
-- Enregistrement du brouillon : niveau d'accès et rejeu étendu aux réglages
-- ---------------------------------------------------------------------------------------------

-- Enregistre le brouillon et ses réglages, sous le verrou (§ 3.3). Même signature qu'à l'étape 4.
-- settings (facultatif ; une clé absente ne change rien) :
--   { "in_app": bool, "is_free": bool, "slug": text|null, "access_level_id": uuid|null,
--     "category_ids": [uuid…] }
-- access_level_id (sortes racines) : null = Gratuit, sinon une formule ; dans les deux cas le
-- niveau devient « choisi » (access_chosen, [D41]).
-- Rejeu : si base_rev + 1 est la révision en base, enregistrée par l'appelant avec exactement ce
-- brouillon, et que les réglages demandés sont déjà en place, renvoie cette révision au lieu de
-- conflit_revision (réponse perdue).
-- Renvoie la nouvelle révision et l'heure de l'enregistrement.
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
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- RPC de l'admin : publication
-- ---------------------------------------------------------------------------------------------

-- « Publier » (sortes racines). expected_rev : la révision que l'admin vient d'enregistrer et
-- d'afficher (le brouillon ne doit pas avoir changé depuis). needs_file_sync : l'admin appelle
-- aussitôt la fonction « files » (kickFiles), pour que les fichiers changent d'emplacement.
create function public.publish(content_id uuid, expected_rev integer)
returns table (
  version_id uuid,
  version_number integer,
  published_at timestamptz,
  needs_file_sync boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.versions;
begin
  perform private.require_staff();

  if publish.content_id is null or publish.expected_rev is null then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'content_id et expected_rev sont obligatoires.';
  end if;

  created := private.do_publish(publish.content_id, (select auth.uid()), 'manual', publish.expected_rev);

  return query select
    created.id,
    created.number,
    created.published_at,
    exists (select 1 from private.files_to_move());
end;
$$;

-- « Retirer de l'app » (sortes racines) : plus de version en ligne, programmation annulée,
-- historique gardé. Rejouable. Chapitres et leçons : étape 7 ([D26]).
-- Renvoie needs_file_sync (l'admin appelle alors la fonction « files »).
create function public.unpublish(content_id uuid)
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

  if target.kind not in ('article', 'episode', 'method', 'page') then
    raise exception using
      errcode = 'P0001',
      message = 'sorte_invalide',
      detail = 'Seuls les articles, les épisodes, les méthodes et les pages se retirent de l''app '
        'ainsi.';
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

-- « Programmer » (sortes racines) : publiera le dernier brouillon enregistré à cette heure
-- ([D16]), sauf si quelqu'un l'écrit à ce moment-là ([D31] : attente, une heure au plus). at est
-- un instant (l'admin convertit l'heure de Paris). Remplace une programmation existante.
-- Renvoie l'heure enregistrée.
create function public.schedule(content_id uuid, at timestamptz)
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

-- Annule la programmation, et efface l'éventuel échec affiché. Rejouable. Renvoie vrai si une
-- programmation (ou un échec) a été effacée.
create function public.unschedule(content_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.contents;
begin
  perform private.require_staff();

  select * into target from public.contents c where c.id = unschedule.content_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'contenu_introuvable',
      detail = 'Ce contenu n''existe plus.';
  end if;

  if target.scheduled_at is null and target.schedule_error is null
    and target.scheduled_by is null then
    return false;
  end if;

  if target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'dans_la_corbeille',
      detail = 'Ce contenu est dans la corbeille.';
  end if;

  update public.contents c
  set scheduled_at = null,
    scheduled_by = null,
    scheduled_rev = null,
    scheduled_set_at = null,
    schedule_error = null
  where c.id = target.id;
  return true;
end;
$$;

-- « Revenir à cette version » : exige de tenir le verrou (depuis cette ouverture de l'éditeur).
-- Recopie dans le brouillon le corps de la version (rendu à la forme d'un brouillon :
-- private.body_to_draft), le niveau d'accès (qui devient « choisi »), is_free, l'adresse (si
-- aucune autre page ne l'a prise entre-temps) et les catégories qui existent encore, puis
-- augmente draft_rev. Ne publie rien. Méthode : seule la fiche revient ([D17]).
-- warnings : fichier_retire (un fichier indisponible est devenu null, ou la couverture ou le son
-- retirés), modele_detache (une copie de modèle n'a pas pu redevenir un bloc lié), adresse_prise
-- (l'adresse de la version est prise : celle du brouillon est gardée).
create function public.revert_to_version(version_id uuid, editor_session uuid default null)
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
  set draft_rev = new_rev, heartbeat_at = saved_at
  where l.content_id = target.id;

  return query select new_rev, saved_at, notes;
end;
$$;

-- Range les formules dans cet ordre (de la moins complète à la plus complète). ids : TOUTES les
-- formules, chacune une fois. Admins seulement. Renvoie les formules dans le nouvel ordre.
create function public.access_levels_reorder(ids uuid[])
returns setof public.access_levels
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();

  -- Un rangement à la fois.
  perform pg_advisory_xact_lock(hashtext('declikora.access_levels'));
  perform 1 from public.access_levels a order by a.id for update;

  if access_levels_reorder.ids is null
    or cardinality(access_levels_reorder.ids) <> (select count(*) from public.access_levels)
    or (select count(distinct x) from unnest(access_levels_reorder.ids) x)
      <> cardinality(access_levels_reorder.ids)
    or exists (
      select 1 from unnest(access_levels_reorder.ids) x
      where x is null or not exists (select 1 from public.access_levels a where a.id = x)
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'demande_invalide',
      detail = 'La liste doit contenir toutes les formules, chacune une fois.';
  end if;

  update public.access_levels a
  set rank = o.position
  from unnest(access_levels_reorder.ids) with ordinality o (id, position)
  where a.id = o.id and a.rank <> o.position;

  return query select * from public.access_levels a order by a.rank;
end;
$$;

revoke execute on function
  public.publish(uuid, integer),
  public.unpublish(uuid),
  public.schedule(uuid, timestamptz),
  public.unschedule(uuid),
  public.revert_to_version(uuid, uuid),
  public.access_levels_reorder(uuid[])
from public, anon;
grant execute on function
  public.publish(uuid, integer),
  public.unpublish(uuid),
  public.schedule(uuid, timestamptz),
  public.unschedule(uuid),
  public.revert_to_version(uuid, uuid),
  public.access_levels_reorder(uuid[])
to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Fonctions de lecture de l'app (anon et authenticated)
-- ---------------------------------------------------------------------------------------------

-- Un contenu EN LIGNE (§ 5.1), ou null (brouillon jamais publié, retiré de l'app, corbeille,
-- inconnu). Voir private.app_content_json pour la forme.
create function public.app_content(content_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_content_json(l.version_id)
  from private.live l
  where l.content_id = app_content.content_id
  limit 1
$$;

-- La page en ligne dont la VERSION porte cette adresse (changer l'adresse du brouillon ne
-- change rien avant la publication), ou null. Même forme qu'app_content.
create function public.app_page(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.app_content_json(l.version_id)
  from private.live l
  join public.versions v on v.id = l.version_id
  where l.kind = 'page' and v.slug = app_page.slug
  order by v.published_at desc
  limit 1
$$;

-- Les formules, de la moins complète à la plus complète (filtres et affichage des niveaux).
create function public.app_access_levels()
returns table (id uuid, name text, rank integer)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.name, a.rank from public.access_levels a order by a.rank
$$;

revoke execute on function
  public.app_content(uuid),
  public.app_page(text),
  public.app_access_levels()
from public;
grant execute on function
  public.app_content(uuid),
  public.app_page(text),
  public.app_access_levels()
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Tâche planifiée « publications »
-- ---------------------------------------------------------------------------------------------

-- Chaque minute (§ 3.8) : publie les contenus dont l'heure est venue, chacun dans son propre bloc
-- d'exception (un échec n'empêche pas les autres). Pour chacun ([D16], [D31]) :
--   1. l'auteur de la programmation doit être encore dans l'équipe (sinon « auteur_parti ») ;
--   2. si un membre, quel qu'il soit, tient un verrou actif sur le contenu (ou un élément d'une
--      méthode) ET que ce brouillon a changé depuis la programmation, on attend la minute
--      suivante ; au bout d'une heure, échec « brouillon_en_cours_d_ecriture » ;
--   3. sinon private.do_publish(…, auteur de la programmation, 'scheduled').
-- Un échec vide scheduled_at et remplit schedule_error (le code stable de l'erreur), que
-- l'Accueil affiche. Une programmation en retard (projet en pause) part au passage suivant.
-- Renvoie le nombre de contenus publiés, et appelle la fonction « files » s'il y en a.
create function private.run_due_publications()
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
          where l.content_id = any (private.publish_scope(due.id))
            and l.holder_id is not null
            and l.heartbeat_at >= now() - private.lock_ttl()
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

select cron.schedule('publications', '* * * * *', $$select private.run_due_publications()$$);

-- Filet de sécurité : aucune fonction de private n'est exécutable par anon ni authenticated,
-- sauf reader_can_open (politique de Storage).
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

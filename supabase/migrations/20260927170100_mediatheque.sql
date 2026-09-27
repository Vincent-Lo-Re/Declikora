-- Médiathèque (étape 3) : fichiers, corbeille des fichiers, buckets et politiques de Storage,
-- fonctions de l'admin et fonctions réservées à la fonction Edge « files ».
-- Voir docs/ARCHITECTURE-CONTENUS.md (§ 1.9, § 1.11, § 3.1, § 3.2, § 3.6, § 3.7, § 4).
--
-- Conventions (§ 1.1) :
-- - chaque RPC de l'admin est « security definer », refuse d'abord si is_staff() est faux, et
--   n'est exécutable que par authenticated ;
-- - les erreurs ont un « message » court et stable (fichier_utilise…), traduit par l'interface
--   (web/src/texts.ts), et un « detail » en français ;
-- - les fonctions public.files_* ne sont exécutables que par service_role (fonction « files ») ;
-- - le travail interne est dans le schéma private (aucun EXECUTE pour anon ni authenticated).

-- ---------------------------------------------------------------------------------------------
-- Table media
-- ---------------------------------------------------------------------------------------------

create table public.media (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'svg', 'lottie', 'audio', 'pdf')),
  -- Nom d'origine (recherche par ilike). Modifiable par l'équipe.
  name text not null check (char_length(name) between 1 and 255),
  -- « <id>/<nom-nettoyé>.<ext> », le même dans les deux buckets. Ne change jamais.
  path text not null unique,
  -- Type normalisé par l'admin avant l'envoi (audio/x-m4a devient audio/mp4…).
  mime text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  width integer check (width is null or width between 1 and 100000),
  height integer check (height is null or height between 1 and 100000),
  duration_s numeric(9, 3) check (duration_s is null or duration_s between 0 and 86400),
  alt text check (alt is null or char_length(alt) <= 1000),
  transcript text check (transcript is null or char_length(transcript) <= 200000),
  -- pending : envoi en cours ; checking : SVG ou Lottie en vérification ; ready ; rejected.
  status text not null default 'pending'
    check (status in ('pending', 'checking', 'ready', 'rejected')),
  status_changed_at timestamptz not null default now(),
  -- Code de la raison d'un refus (voir la fonction « files »), traduit par l'interface.
  reject_reason text,
  check_attempts integer not null default 0 check (check_attempts >= 0),
  -- Bucket où se trouve RÉELLEMENT le fichier : files-public (vrai) ou files-protected (faux).
  is_public boolean not null default false,
  -- Dernier échec de la fonction « files » sur ce fichier (déplacement, effacement,
  -- vérification) : elle attend 10 minutes avant de réessayer.
  sync_error text,
  sync_failed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  -- Corbeille.
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  -- Effacement définitif demandé (Vider la corbeille, ou 30 jours passés) : la fonction
  -- « files » efface l'objet puis la ligne.
  purge_requested_at timestamptz,
  -- Raison d'un effacement refusé par la base (fichier_utilise) : le fichier reste dans la
  -- corbeille, avec « Effacement impossible ».
  purge_error text,

  constraint media_kind_mime check (
    (kind = 'image' and mime in ('image/jpeg', 'image/png', 'image/webp'))
    or (kind = 'svg' and mime = 'image/svg+xml')
    or (kind = 'lottie' and mime = 'application/json')
    or (kind = 'audio' and mime in ('audio/mpeg', 'audio/mp4'))
    or (kind = 'pdf' and mime = 'application/pdf')
  ),
  -- 5 Mo au plus pour un SVG ou un Lottie : la fonction Edge doit pouvoir les vérifier ([D39]).
  constraint media_checked_size check (kind not in ('svg', 'lottie') or size_bytes <= 5242880),
  constraint media_alt_kind check (alt is null or kind in ('image', 'svg')),
  constraint media_transcript_kind check (transcript is null or kind = 'audio'),
  constraint media_dimensions_kind check (
    (width is null and height is null) or kind in ('image', 'svg', 'lottie')
  ),
  constraint media_duration_kind check (duration_s is null or kind = 'audio'),
  constraint media_reject_reason check ((status = 'rejected') = (reject_reason is not null)),
  constraint media_public_ready check (not is_public or status = 'ready'),
  constraint media_purge_in_trash check (purge_requested_at is null or deleted_at is not null)
);

comment on table public.media is 'La médiathèque : un fichier par ligne. Un fichier ne se remplace jamais.';

create index media_list_idx on public.media (kind, deleted_at, created_at desc);
create index media_created_by_idx on public.media (created_by);
create index media_deleted_by_idx on public.media (deleted_by);

alter table public.media enable row level security;

-- Lecture pour l'équipe (aal2). Seuls le nom, le texte alternatif et la transcription se
-- modifient directement, hors corbeille. Tout le reste passe par les RPC ci-dessous ou par la
-- fonction « files ».
revoke all on public.media from anon, authenticated;
grant select on public.media to authenticated;
grant update (name, alt, transcript) on public.media to authenticated;

create policy "Médiathèque : lecture par l'équipe"
  on public.media
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Médiathèque : nom, texte alternatif et transcription, hors corbeille"
  on public.media
  for update
  to authenticated
  using ((select public.is_staff()) and deleted_at is null)
  with check ((select public.is_staff()) and deleted_at is null);

-- ---------------------------------------------------------------------------------------------
-- Table media_audit
-- ---------------------------------------------------------------------------------------------

-- Résultat du contrôle des objets sans ligne media (restes d'un envoi interrompu).
-- Chaque chemin est « <bucket>/<chemin> ».
create table public.media_audit (
  id bigint generated always as identity primary key,
  checked_at timestamptz not null default now(),
  orphan_paths text[] not null default '{}'
);

comment on table public.media_audit is
  'Contrôles des fichiers orphelins (objets de Storage sans ligne media). Le dernier compte.';

create index media_audit_checked_at_idx on public.media_audit (checked_at desc);

alter table public.media_audit enable row level security;
revoke all on public.media_audit from anon, authenticated;
grant select on public.media_audit to authenticated;

create policy "Contrôle des fichiers : lecture par l'équipe"
  on public.media_audit
  for select
  to authenticated
  using ((select public.is_staff()));

-- ---------------------------------------------------------------------------------------------
-- Fonctions internes
-- ---------------------------------------------------------------------------------------------

-- Refuse si l'appelant n'est pas un membre de l'équipe en aal2, avec une session ouverte.
create function private.require_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(public.is_staff(), false) then
    raise exception using
      errcode = '42501',
      message = 'reserve_a_l_equipe',
      detail = 'Réservé à l''équipe, après la double vérification.';
  end if;
end;
$$;

-- Nom de fichier nettoyé pour le chemin : minuscules, sans accents, lettres, chiffres et
-- tirets, 80 caractères au plus, puis l'extension tirée du type.
create function private.media_file_name(original_name text, mime text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
      nullif(
        btrim(
          left(
            btrim(
              regexp_replace(
                translate(
                  lower(regexp_replace(original_name, '\.[^./]*$', '')),
                  'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæß',
                  'aaaaaaceeeeiiiinooooouuuuyyoas'
                ),
                '[^a-z0-9]+', '-', 'g'
              ),
              '-'
            ),
            80
          ),
          '-'
        ),
        ''
      ),
      'fichier'
    )
    || '.'
    || case mime
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
      when 'image/svg+xml' then 'svg'
      when 'application/json' then 'json'
      when 'audio/mpeg' then 'mp3'
      when 'audio/mp4' then 'm4a'
      when 'application/pdf' then 'pdf'
      else 'bin'
    end
$$;

-- Là où un fichier est utilisé : brouillons (modèles et corbeille compris) et versions en
-- ligne ([D6]). Vide à l'étape 3 : contents et versions n'existent pas encore. Remplacée
-- (create or replace, mêmes colonnes) aux étapes 4 et 5.
create function private.media_uses(target_media_id uuid)
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
  select null::uuid, null::text, null::text, null::text, null::boolean, null::boolean
  where false and target_media_id is not null
$$;

-- Les fichiers à déplacer : un fichier doit être public si et seulement s'il figure dans une
-- version gratuite en ligne (§ 4.4). Sans contenu en ligne (étape 3), aucun fichier ne doit
-- être public. L'étape 5 ne remplace que la liste « wanted ».
create function private.files_to_move()
returns table (media_id uuid, path text, to_public boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with wanted as (
    select m.id from public.media m where false
  )
  select m.id, m.path, (w.id is not null)
  from public.media m
  left join wanted w on w.id = m.id
  where m.status = 'ready'
    and m.purge_requested_at is null
    and m.is_public <> (w.id is not null)
$$;

-- Un lecteur (anonyme ou abonné) peut-il lire cet objet du bucket protégé ? Faux à l'étape 3 :
-- l'étape 5 la remplace (fichier cité par une version en ligne gratuite, ou d'un rang atteint
-- par private.reader_rank()). Seule fonction de private exécutable par anon et authenticated.
create function private.reader_can_open(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false and object_name is not null
$$;

revoke execute on function private.reader_can_open(text) from public;
grant execute on function private.reader_can_open(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Déclencheurs de media
-- ---------------------------------------------------------------------------------------------

-- Nettoie les textes (espaces autour, texte vide) et date chaque changement d'état. Le nom est
-- mis en Unicode composé (NFC) : macOS et Safari donnent souvent « e » suivi d'un accent séparé
-- (NFD), que la recherche « café » ne trouverait pas.
create function private.media_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name := normalize(btrim(new.name), NFC);
  new.alt := nullif(btrim(new.alt), '');
  new.transcript := nullif(btrim(new.transcript), '');
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger media_before_write
  before insert or update on public.media
  for each row execute function private.media_before_write();

-- Seconde ligne de défense : un fichier utilisé ne s'efface pas.
create function private.media_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.media_uses(old.id)) then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_utilise',
      detail = 'Ce fichier est encore utilisé : il ne peut pas être effacé.';
  end if;
  return old;
end;
$$;

create trigger media_before_delete
  before delete on public.media
  for each row execute function private.media_before_delete();

-- ---------------------------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------------------------

-- Créés ici, à l'identique en local et en ligne ([D20]) ; pas déclarés dans config.toml.
-- Types en liste exacte ([D33]) ; 50 Mio par fichier (limite de l'offre gratuite).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'files-public', 'files-public', true, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/json',
      'audio/mpeg', 'audio/mp4', 'application/pdf']
  ),
  (
    'files-protected', 'files-protected', false, 52428800,
    array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/json',
      'audio/mpeg', 'audio/mp4', 'application/pdf']
  )
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------------------------
-- Politiques de Storage
-- ---------------------------------------------------------------------------------------------

-- Envoi : seulement dans le bucket protégé, par un membre en aal2, et EXACTEMENT au chemin d'une
-- ligne media « pending » qu'il a créée lui-même (media_create). Aucun autre objet, même dans le
-- même dossier. La même règle couvre l'envoi reprenable (TUS), vérifié dès sa création.
-- Attention : « objects.name » doit être qualifié, sinon « name » désignerait media.name.
create policy "Médiathèque : envoi au chemin exact d'un fichier en attente créé par soi"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'files-protected'
    and (select public.is_staff())
    and exists (
      select 1
      from public.media m
      where m.path = objects.name
        and m.status = 'pending'
        and m.deleted_at is null
        and m.created_by = (select auth.uid())
    )
  );

-- Lecture (liste, liens temporaires) : l'équipe, dans les deux buckets.
create policy "Médiathèque : lecture par l'équipe"
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('files-public', 'files-protected') and (select public.is_staff()));

-- Lecture d'un fichier protégé par un lecteur (§ 4.5) : private.reader_can_open décide.
create policy "Médiathèque : lecture d'un fichier protégé par un lecteur autorisé"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'files-protected' and private.reader_can_open(objects.name));

-- Aucune politique UPDATE ni DELETE, et aucune écriture sur files-public : seule la fonction
-- « files » (clé secrète) déplace et efface.

-- ---------------------------------------------------------------------------------------------
-- RPC de l'admin
-- ---------------------------------------------------------------------------------------------

-- Crée la ligne « pending » d'un envoi et renvoie la ligne (dont son chemin). L'admin envoie
-- ensuite le fichier à ce chemin, dans files-protected, puis appelle media_confirm.
create function public.media_create(
  kind text,
  name text,
  mime text,
  size_bytes bigint,
  width integer default null,
  height integer default null,
  duration_s numeric default null
)
returns public.media
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid := gen_random_uuid();
  -- NFC avant de construire le chemin (media_file_name ne connaît que les lettres accentuées
  -- composées).
  clean_name text := normalize(btrim(coalesce(media_create.name, '')), NFC);
  created public.media;
begin
  perform private.require_staff();

  if media_create.kind is null or media_create.mime is null or not (
    (media_create.kind = 'image' and media_create.mime in ('image/jpeg', 'image/png', 'image/webp'))
    or (media_create.kind = 'svg' and media_create.mime = 'image/svg+xml')
    or (media_create.kind = 'lottie' and media_create.mime = 'application/json')
    or (media_create.kind = 'audio' and media_create.mime in ('audio/mpeg', 'audio/mp4'))
    or (media_create.kind = 'pdf' and media_create.mime = 'application/pdf')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'type_refuse',
      detail = 'Ce type de fichier n''est pas accepté.';
  end if;

  if char_length(clean_name) not between 1 and 255 then
    raise exception using
      errcode = 'P0001',
      message = 'nom_invalide',
      detail = 'Le nom du fichier doit faire entre 1 et 255 caractères.';
  end if;

  if media_create.size_bytes is null or media_create.size_bytes <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_vide',
      detail = 'Le fichier est vide.';
  end if;

  if media_create.size_bytes > 52428800
    or (media_create.kind in ('svg', 'lottie') and media_create.size_bytes > 5242880) then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_trop_lourd',
      detail = 'Le fichier est trop lourd : 50 Mo au plus, 5 Mo pour un SVG ou un Lottie.';
  end if;

  if (media_create.width is not null or media_create.height is not null)
    and media_create.kind not in ('image', 'svg', 'lottie') then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_invalide',
      detail = 'Seuls les images, les SVG et les Lottie ont des dimensions.';
  end if;

  if media_create.duration_s is not null and media_create.kind <> 'audio' then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_invalide',
      detail = 'Seuls les audios ont une durée.';
  end if;

  insert into public.media (
    id, kind, name, path, mime, size_bytes, width, height, duration_s, created_by
  )
  values (
    new_id,
    media_create.kind,
    clean_name,
    new_id::text || '/' || private.media_file_name(clean_name, media_create.mime),
    media_create.mime,
    media_create.size_bytes,
    media_create.width,
    media_create.height,
    media_create.duration_s,
    (select auth.uid())
  )
  returning * into created;

  return created;
exception
  when check_violation then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_invalide',
      detail = 'Les informations du fichier ne sont pas valides.';
end;
$$;

-- Après l'envoi : vérifie dans Storage que l'objet existe, avec la taille et le type annoncés,
-- puis passe le fichier à « ready » (image, audio, PDF) ou « checking » (SVG, Lottie : l'admin
-- appelle aussitôt la fonction « files »). Un objet qui ne correspond pas est refusé
-- (status « rejected », raison « fichier_incoherent »). Rejouable : un fichier déjà confirmé
-- est renvoyé tel quel.
create function public.media_confirm(media_id uuid)
returns public.media
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.media;
  object_metadata jsonb;
begin
  perform private.require_staff();

  select * into target from public.media m where m.id = media_confirm.media_id for update;
  if not found or target.deleted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe pas ou est dans la corbeille.';
  end if;

  if target.status <> 'pending' then
    return target;
  end if;

  -- Un envoi abandonné est effacé au bout de 24 h : on ne le confirme plus juste avant.
  if target.status_changed_at < now() - interval '23 hours' then
    raise exception using
      errcode = 'P0001',
      message = 'envoi_expire',
      detail = 'Cet envoi a expiré. Envoie le fichier de nouveau.';
  end if;

  select o.metadata into object_metadata
  from storage.objects o
  where o.bucket_id = 'files-protected' and o.name = target.path;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_absent',
      detail = 'Le fichier n''est pas encore arrivé. Réessaie dans un instant.';
  end if;

  if (object_metadata ->> 'size')::bigint is distinct from target.size_bytes
    or (object_metadata ->> 'mimetype') is distinct from target.mime then
    update public.media m
    set status = 'rejected', reject_reason = 'fichier_incoherent'
    where m.id = target.id
    returning * into target;
    return target;
  end if;

  update public.media m
  set status = case when target.kind in ('svg', 'lottie') then 'checking' else 'ready' end
  where m.id = target.id
  returning * into target;
  return target;
end;
$$;

-- Met un fichier à la corbeille. Refuse tant qu'il est utilisé (fichier_utilise, avec la liste).
-- « for update » : avec le « for share » du brouillon et de la publication (étapes 4 et 5), un
-- fichier ne peut pas partir à la corbeille pendant qu'un autre membre l'insère.
create function public.media_trash(media_id uuid)
returns public.media
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.media;
  uses text;
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

  select string_agg(coalesce(u.title, 'Sans titre'), ', ' order by u.title)
  into uses
  from private.media_uses(target.id) u;

  if uses is not null then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_utilise',
      detail = 'Ce fichier est utilisé dans : ' || uses || '.';
  end if;

  update public.media m
  set deleted_at = now(), deleted_by = (select auth.uid()), purge_error = null
  where m.id = target.id
  returning * into target;
  return target;
end;
$$;

-- Sort un fichier de la corbeille. Refuse si son effacement est déjà demandé.
create function public.media_restore(media_id uuid)
returns public.media
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.media;
begin
  perform private.require_staff();

  select * into target from public.media m where m.id = media_restore.media_id for update;
  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'fichier_introuvable',
      detail = 'Ce fichier n''existe plus.';
  end if;

  if target.purge_requested_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'effacement_demande',
      detail = 'L''effacement de ce fichier est déjà en cours.';
  end if;

  if target.deleted_at is null then
    return target;
  end if;

  update public.media m
  set deleted_at = null, deleted_by = null, purge_error = null
  where m.id = target.id
  returning * into target;
  return target;
end;
$$;

-- Vide la corbeille : la sélection (items = [{"type": "file", "id": "…"}]) ou tout (null).
-- Pour les fichiers, demande l'effacement ; la fonction « files » efface ensuite l'objet puis
-- la ligne (l'admin l'appelle aussitôt). Renvoie le nombre d'éléments concernés.
-- L'étape 5 y ajoute les contenus (type « content »).
create function public.empty_trash(items jsonb default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  file_ids uuid[];
  affected integer;
begin
  perform private.require_staff();

  if items is not null then
    if jsonb_typeof(items) <> 'array' or exists (
      select 1
      from jsonb_array_elements(items) item
      where jsonb_typeof(item) <> 'object'
        or item ->> 'type' is distinct from 'file'
        or coalesce(item ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'demande_invalide',
        detail = 'La sélection doit être une liste de { "type": "file", "id": "…" }.';
    end if;

    select array_agg((item ->> 'id')::uuid)
    into file_ids
    from jsonb_array_elements(items) item;
  end if;

  update public.media m
  set purge_requested_at = now(), purge_error = null
  where m.deleted_at is not null
    and m.purge_requested_at is null
    and (items is null or m.id = any (file_ids));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- « Utilisé dans » (fiche d'un fichier) : brouillons et versions en ligne qui le citent.
-- Vide à l'étape 3.
create function public.media_uses(media_id uuid)
returns table (
  content_id uuid,
  kind text,
  title text,
  parent_title text,
  in_draft boolean,
  in_app boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return query select * from private.media_uses(media_uses.media_id);
end;
$$;

-- Place occupée dans Storage par les deux buckets, en octets (restes d'envoi compris).
create function public.media_storage_used()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_staff();
  return (
    select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id in ('files-public', 'files-protected')
  );
end;
$$;

revoke execute on function
  public.media_create(text, text, text, bigint, integer, integer, numeric),
  public.media_confirm(uuid),
  public.media_trash(uuid),
  public.media_restore(uuid),
  public.empty_trash(jsonb),
  public.media_uses(uuid),
  public.media_storage_used()
from public, anon;
grant execute on function
  public.media_create(text, text, text, bigint, integer, integer, numeric),
  public.media_confirm(uuid),
  public.media_trash(uuid),
  public.media_restore(uuid),
  public.empty_trash(jsonb),
  public.media_uses(uuid),
  public.media_storage_used()
to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Corbeille
-- ---------------------------------------------------------------------------------------------

-- Tout ce qui est dans la corbeille, pour la page Corbeille. Fichiers seulement à l'étape 3
-- (item_type = 'file', kind = sorte de fichier) ; l'étape 5 ajoute les contenus
-- (item_type = 'content'). Un fichier dont l'effacement est déjà demandé n'y figure plus.
-- security_invoker : les politiques de media s'appliquent (équipe en aal2 seulement).
create view public.trash_items
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
  m.purge_error
from public.media m
left join public.profiles p on p.id = m.deleted_by
where m.deleted_at is not null
  and m.purge_requested_at is null;

comment on view public.trash_items is
  'La corbeille (fichiers à l''étape 3). purge_at : effacement automatique au bout de 30 jours.';

revoke all on public.trash_items from anon, authenticated;
grant select on public.trash_items to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Travail de la fonction « files » (calculé par la base)
-- ---------------------------------------------------------------------------------------------

-- Délai avant de réessayer un fichier sur lequel la fonction « files » a échoué.
create function private.files_retry_delay()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '10 minutes'
$$;

-- Un effacement demandé d'un fichier encore utilisé est refusé tout de suite, sans toucher à
-- l'objet : raison notée, demande retirée, le fichier réapparaît dans la corbeille.
create function private.files_refuse_used_purges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.media m
  set purge_requested_at = null, purge_error = 'fichier_utilise'
  where m.purge_requested_at is not null
    and exists (select 1 from private.media_uses(m.id));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Le travail à faire, dans l'ordre : vérifier (SVG, Lottie), déplacer, effacer (corbeille
-- vidée), nettoyer (envois abandonnés et fichiers refusés depuis plus de 24 h).
create function private.files_pending_work(max_items integer)
returns table (
  action text,
  media_id uuid,
  path text,
  kind text,
  mime text,
  size_bytes bigint,
  is_public boolean,
  to_public boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with work as (
    select 1 as step, 'check'::text as action, m.id, m.created_at, null::boolean as to_public
    from public.media m
    where m.status = 'checking'
      and (m.sync_failed_at is null or m.sync_failed_at < now() - private.files_retry_delay())
    union all
    select 2, 'move', f.media_id, m.created_at, f.to_public
    from private.files_to_move() f
    join public.media m on m.id = f.media_id
    where m.sync_failed_at is null or m.sync_failed_at < now() - private.files_retry_delay()
    union all
    select 3, 'purge', m.id, m.created_at, null
    from public.media m
    where m.deleted_at is not null
      and m.purge_requested_at is not null
      and (m.sync_failed_at is null or m.sync_failed_at < now() - private.files_retry_delay())
    union all
    select 4, 'discard', m.id, m.created_at, null
    from public.media m
    where m.status in ('pending', 'rejected')
      and m.status_changed_at < now() - interval '24 hours'
      and m.purge_requested_at is null
      and (m.sync_failed_at is null or m.sync_failed_at < now() - private.files_retry_delay())
  )
  select w.action, m.id, m.path, m.kind, m.mime, m.size_bytes, m.is_public, w.to_public
  from work w
  join public.media m on m.id = w.id
  order by w.step, w.created_at, m.id
  limit greatest(coalesce(max_items, 50), 1)
$$;

-- Vrai s'il y a du travail pour la fonction « files ».
create function private.files_have_work()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.files_pending_work(1))
$$;

-- Tâche « fichiers » (chaque minute) : appelle la fonction « files » SEULEMENT s'il y a du
-- travail. L'appel part après la validation de la transaction (pg_net) ; il est rangé dans
-- net._http_response (réponses effacées au bout de 6 h, pg_net.ttl).
-- Renvoie l'identifiant de la requête pg_net, ou null si rien n'a été envoyé.
create function private.kick_files()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings private.settings;
begin
  perform private.files_refuse_used_purges();
  if not private.files_have_work() then
    return null;
  end if;

  select * into settings from private.settings s where s.id;
  if not found then
    return null;
  end if;

  -- La clé publishable va dans « apikey » (ce n'est pas un JWT : jamais en Authorization).
  -- Fournir headers remplace les en-têtes par défaut : on remet Content-Type.
  return net.http_post(
    url := settings.files_url,
    body := jsonb_build_object('mode', 'kick'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', settings.publishable_key
    ),
    timeout_milliseconds := 30000
  );
end;
$$;

-- Tâche « corbeille » (chaque jour) : demande l'effacement de ce qui est dans la corbeille
-- depuis plus de 30 jours. Les fichiers sont effacés ensuite par la fonction « files » (un
-- DELETE sur storage.objects est bloqué par Supabase). L'étape 5 y ajoute les contenus.
create function private.purge_trash()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.media m
  set purge_requested_at = now(), purge_error = null
  where m.deleted_at < now() - interval '30 days'
    and m.purge_requested_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Contrôle des fichiers orphelins : les objets des deux buckets dont le chemin n'est le « path »
-- d'aucune ligne media. Écrit le résultat dans media_audit et renvoie leur nombre.
-- (Storage liste ses objets à partir de cette même table : inutile de passer par l'API.)
create function private.audit_files()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  orphans text[];
begin
  select coalesce(array_agg(o.bucket_id || '/' || o.name order by o.bucket_id, o.name), '{}')
  into orphans
  from storage.objects o
  where o.bucket_id in ('files-public', 'files-protected')
    and not exists (select 1 from public.media m where m.path = o.name);

  insert into public.media_audit (orphan_paths) values (orphans);
  return cardinality(orphans);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Fonctions réservées à la fonction « files » (service_role)
-- ---------------------------------------------------------------------------------------------

-- Frein anti-abus des appels SANS session de membre (tâches planifiées, ou n'importe qui qui
-- connaît l'adresse et la clé publishable) : un passage « kick » toutes les 20 s au plus, un
-- contrôle « audit » par heure au plus. Vrai si ce passage peut avoir lieu (et le note).
create function public.files_claim_run(run_mode text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean;
begin
  if run_mode = 'kick' then
    update private.settings s
    set files_last_kick_at = now()
    where s.id
      and (s.files_last_kick_at is null or s.files_last_kick_at < now() - interval '20 seconds')
    returning true into claimed;
  elsif run_mode = 'audit' then
    update private.settings s
    set files_last_audit_at = now()
    where s.id
      and (s.files_last_audit_at is null or s.files_last_audit_at < now() - interval '1 hour')
    returning true into claimed;
  end if;
  return coalesce(claimed, false);
end;
$$;

-- Le travail à faire (voir private.files_pending_work), 50 éléments au plus par appel.
-- Refuse d'abord les effacements de fichiers encore utilisés (sans boucle).
create function public.files_worklist(max_items integer default 50)
returns table (
  action text,
  media_id uuid,
  path text,
  kind text,
  mime text,
  size_bytes bigint,
  is_public boolean,
  to_public boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.files_refuse_used_purges();
  return query select * from private.files_pending_work(least(greatest(max_items, 1), 50));
end;
$$;

-- Résultat de la vérification d'un SVG ou d'un Lottie : « ready », ou « rejected » avec le code
-- de la raison. Sans effet si le fichier n'est plus « checking ». Renvoie l'état du fichier.
create function public.files_mark_checked(media_id uuid, accepted boolean, reason text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_status text;
begin
  update public.media m
  set status = case when accepted then 'ready' else 'rejected' end,
    reject_reason = case when accepted then null else coalesce(nullif(reason, ''), 'fichier_refuse') end,
    sync_error = null,
    sync_failed_at = null
  where m.id = files_mark_checked.media_id and m.status = 'checking'
  returning m.status into new_status;

  if new_status is null then
    select m.status into new_status from public.media m where m.id = files_mark_checked.media_id;
  end if;
  return new_status;
end;
$$;

-- Vérification ratée (délai, erreur de lecture…) : on réessaie 10 minutes plus tard, et au
-- troisième échec le fichier est refusé (« verification_impossible ») : pas d'appel sans fin.
create function public.files_mark_check_failed(media_id uuid, error text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_status text;
begin
  update public.media m
  set check_attempts = m.check_attempts + 1,
    status = case when m.check_attempts + 1 >= 3 then 'rejected' else m.status end,
    reject_reason = case when m.check_attempts + 1 >= 3 then 'verification_impossible' end,
    sync_error = left(error, 500),
    sync_failed_at = now()
  where m.id = files_mark_check_failed.media_id and m.status = 'checking'
  returning m.status into new_status;

  if new_status is null then
    select m.status into new_status from public.media m where m.id = files_mark_check_failed.media_id;
  end if;
  return new_status;
end;
$$;

-- Le fichier se trouve désormais dans files-public (vrai) ou files-protected (faux).
create function public.files_mark_moved(media_id uuid, is_public boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.media m
  set is_public = files_mark_moved.is_public, sync_error = null, sync_failed_at = null
  where m.id = files_mark_moved.media_id
    and (not files_mark_moved.is_public or m.status = 'ready');
  return found;
end;
$$;

-- Échec d'un déplacement ou d'un effacement : noté, et réessayé 10 minutes plus tard.
create function public.files_mark_failed(media_id uuid, error text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.media m
  set sync_error = left(error, 500), sync_failed_at = now()
  where m.id = files_mark_failed.media_id
$$;

-- Après l'effacement des objets : supprime la ligne, si elle est toujours à effacer (effacement
-- demandé, ou envoi abandonné ou refusé depuis plus de 24 h). Vrai si la ligne n'existe plus.
-- Si la base refuse (fichier_utilise, déclencheur media_before_delete), la raison est notée,
-- la demande retirée, et la fonction renvoie faux : la fonction « files » n'insiste pas.
create function public.files_mark_erased(media_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.media;
  error_message text;
begin
  select * into target from public.media m where m.id = files_mark_erased.media_id for update;
  if not found then
    return true;
  end if;

  if not (
    (target.deleted_at is not null and target.purge_requested_at is not null)
    or (
      target.status in ('pending', 'rejected')
      and target.status_changed_at < now() - interval '24 hours'
      and target.purge_requested_at is null
    )
  ) then
    return false;
  end if;

  begin
    delete from public.media m where m.id = target.id;
  exception
    when raise_exception then
      get stacked diagnostics error_message = message_text;
      if error_message <> 'fichier_utilise' then
        raise;
      end if;
      update public.media m
      set purge_requested_at = null, purge_error = 'fichier_utilise'
      where m.id = target.id;
      return false;
  end;
  return true;
end;
$$;

-- Contrôle des fichiers orphelins à la demande (mode « audit » de la fonction « files »).
create function public.files_audit()
returns integer
language sql
security definer
set search_path = ''
as $$
  select private.audit_files()
$$;

-- Les orphelins du DERNIER contrôle qui n'ont toujours pas de ligne media et qui ont plus de
-- 24 h : ce que le mode « clean » (demandé par un membre) peut effacer.
create function public.files_orphans()
returns table (bucket_id text, name text)
language sql
stable
security definer
set search_path = ''
as $$
  with last_audit as (
    select a.orphan_paths from public.media_audit a order by a.checked_at desc, a.id desc limit 1
  )
  select o.bucket_id, o.name
  from last_audit a
  cross join lateral unnest(a.orphan_paths) as p(full_path)
  join storage.objects o on o.bucket_id || '/' || o.name = p.full_path
  where o.bucket_id in ('files-public', 'files-protected')
    and o.created_at < now() - interval '24 hours'
    and not exists (select 1 from public.media m where m.path = o.name)
  order by o.bucket_id, o.name
$$;

revoke execute on function
  public.files_claim_run(text),
  public.files_worklist(integer),
  public.files_mark_checked(uuid, boolean, text),
  public.files_mark_check_failed(uuid, text),
  public.files_mark_moved(uuid, boolean),
  public.files_mark_failed(uuid, text),
  public.files_mark_erased(uuid),
  public.files_audit(),
  public.files_orphans()
from public, anon, authenticated;
grant execute on function
  public.files_claim_run(text),
  public.files_worklist(integer),
  public.files_mark_checked(uuid, boolean, text),
  public.files_mark_check_failed(uuid, text),
  public.files_mark_moved(uuid, boolean),
  public.files_mark_failed(uuid, text),
  public.files_mark_erased(uuid),
  public.files_audit(),
  public.files_orphans()
to service_role;

-- Filet de sécurité : aucune fonction de private n'est exécutable par anon ni authenticated,
-- sauf reader_can_open (les droits par défaut du schéma l'assurent déjà).
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.reader_can_open(text) to anon, authenticated;

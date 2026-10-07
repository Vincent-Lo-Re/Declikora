-- Identité de l'admin (Paramètres, onglet « Identité de l'admin », ADMIN § 7), la même pour toute
-- l'équipe : le nom de la marque (vide : l'admin affiche « Ruche »), le logotype et le monogramme,
-- chacun en version pour fond clair et pour fond sombre.

-- ---------------------------------------------------------------------------------------------
-- Les fichiers de la marque : un espace public à part (la page de connexion les montre sans
-- compte), 1 Mo au plus, SVG (nettoyé par l'admin avant l'envoi), PNG ou WebP.
-- ---------------------------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marque', 'marque', true, 1048576, array['image/svg+xml', 'image/png', 'image/webp'])
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Le chemin d'un fichier de la marque : « logotype-clair/<uuid>.svg », ou pour une déclinaison
-- aux couleurs d'une palette « logotype-palettes/<uuid>.svg » (un nouveau nom à chaque envoi : le
-- navigateur ne garde pas l'ancien en cache). Un type, et non une fonction : la règle
-- d'envoi de Storage s'en sert sans rien ouvrir de « private ».
create domain public.brand_path as text
  check (value ~ '^(logotype|monogramme)-(clair|sombre|palettes)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp)$');

-- Envoi et retrait par un admin seulement (le retrait de l'ancien fichier passe par l'API de
-- Storage ; un DELETE en SQL reste bloqué par Supabase). La lecture est publique (espace public).
create policy "Marque : envoi par un admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'marque'
    and (select public.is_admin())
    and objects.name::public.brand_path is not null
  );

create policy "Marque : lecture par l'équipe"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'marque' and (select public.is_staff()));

create policy "Marque : retrait par un admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'marque' and (select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- L'identité : une seule ligne (id toujours vrai), ni ajout ni suppression.
-- ---------------------------------------------------------------------------------------------

create table public.admin_identity (
  id boolean primary key default true check (id),
  -- Le nom de la marque, sans espace autour ; null : le nom par défaut de l'admin (« Ruche »).
  name text check (name is null or (char_length(name) between 1 and 40 and name = btrim(name))),
  -- Les fichiers (chemins dans l'espace « marque ») ; null : pas de fichier. Une version
  -- manquante est remplacée par l'autre ; aucune : le nom en texte, ou son initiale.
  logotype_light public.brand_path,
  logotype_dark public.brand_path,
  monogram_light public.brand_path,
  monogram_dark public.brand_path
);

comment on table public.admin_identity is
  'Identité de l''admin, une seule ligne : le nom de la marque (null : « Ruche »), le logotype et '
  'le monogramme pour fond clair et pour fond sombre (chemins dans l''espace « marque »). Lecture '
  'par l''équipe, modification par un admin ; admin_brand() la donne avant la connexion.';

insert into public.admin_identity default values;

alter table public.admin_identity enable row level security;
revoke all on public.admin_identity from anon, authenticated;
grant select,
  update (name, logotype_light, logotype_dark, monogram_light, monogram_dark)
  on public.admin_identity to authenticated;

create policy "Identité de l'admin : lecture par l'équipe"
  on public.admin_identity
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Identité de l'admin : modification par un admin"
  on public.admin_identity
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- L'identité pour tout le monde, connexion comprise (page de connexion, titre de l'onglet,
-- favicon) : le nom et les chemins des fichiers, déjà publics.
create function public.admin_brand()
returns table (
  name text,
  logotype_light text,
  logotype_dark text,
  monogram_light text,
  monogram_dark text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, logotype et monogramme pour fond clair et sombre), lisible sans '
  'compte pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Les déclinaisons : un logotype ou un monogramme SVG aux couleurs modifiables est décliné par
-- l'admin aux couleurs de chaque palette (lib/palettes.ts), pour fond clair et pour fond sombre ;
-- chaque membre voit celle de la palette qu'il a choisie. Envoyer un nouveau fichier les remplace.
-- ---------------------------------------------------------------------------------------------

create table public.admin_brand_variants (
  kind text not null check (kind in ('logotype', 'monogram')),
  -- L'identifiant d'une palette de l'admin : « stone-orange ».
  palette text not null check (palette ~ '^[a-z]+-[a-z]+$'),
  surface text not null check (surface in ('light', 'dark')),
  path public.brand_path not null,
  primary key (kind, palette, surface)
);

comment on table public.admin_brand_variants is
  'Le logotype et le monogramme déclinés aux couleurs de chaque palette, pour fond clair et pour '
  'fond sombre (chemins dans l''espace « marque »). Lecture par l''équipe, ajout et retrait par un '
  'admin ; admin_brand_variants() les donne avant la connexion.';

alter table public.admin_brand_variants enable row level security;
revoke all on public.admin_brand_variants from anon, authenticated;
grant select, insert, delete on public.admin_brand_variants to authenticated;

create policy "Déclinaisons de la marque : lecture par l'équipe"
  on public.admin_brand_variants
  for select
  to authenticated
  using ((select public.is_staff()));

create policy "Déclinaisons de la marque : ajout par un admin"
  on public.admin_brand_variants
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Déclinaisons de la marque : retrait par un admin"
  on public.admin_brand_variants
  for delete
  to authenticated
  using ((select public.is_admin()));

create function public.admin_brand_variants()
returns table (kind text, palette text, surface text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.kind, v.palette, v.surface, v.path
  from public.admin_brand_variants v
  order by v.kind, v.palette, v.surface;
$$;

comment on function public.admin_brand_variants() is
  'Les déclinaisons du logotype et du monogramme par palette, lisibles sans compte pour la page de '
  'connexion (la palette de chacun est gardée sur son navigateur).';

revoke execute on function public.admin_brand_variants() from public;
grant execute on function public.admin_brand_variants() to anon, authenticated, service_role;

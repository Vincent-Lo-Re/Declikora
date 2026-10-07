-- L'image de l'écran de connexion (Paramètres, onglet « Identité de l'admin », ADMIN § 7) : la
-- grande image à droite du formulaire (modèle « login-02 » de shadcn), la même pour toute
-- l'équipe. Sans image, l'admin y met le monogramme sur le fond du menu.

-- Une photo est réduite par l'admin avant l'envoi, en WebP, ou en JPEG quand le navigateur ne
-- sait pas écrire le WebP (Safari) : l'espace « marque » accepte donc aussi le JPEG.
update storage.buckets
set allowed_mime_types = array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg']
where id = 'marque';

-- Son chemin : « connexion/<uuid>.webp », un nouveau nom à chaque envoi.
alter domain public.brand_path drop constraint brand_path_check;
alter domain public.brand_path add constraint brand_path_check
  check (
    value ~ '^(logotype|monogramme)-(clair|sombre|palettes)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp)$'
    or value ~ '^connexion/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(svg|png|webp|jpg)$'
  );

alter table public.admin_identity add column login_image public.brand_path;

comment on column public.admin_identity.login_image is
  'L''image de l''écran de connexion (chemin dans l''espace « marque ») ; null : le monogramme sur '
  'le fond du menu.';

grant update (login_image) on public.admin_identity to authenticated;

-- admin_brand() donne aussi l'image : la page de connexion la montre sans compte. Sa forme change,
-- elle est donc recréée.
drop function public.admin_brand();

create function public.admin_brand()
returns table (
  name text,
  logotype_light text,
  logotype_dark text,
  monogram_light text,
  monogram_dark text,
  login_image text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, logotype et monogramme pour fond clair et sombre, image de '
  'l''écran de connexion), lisible sans compte pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;

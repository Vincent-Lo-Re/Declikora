-- Deux réglages de l'écran de connexion (Paramètres, onglet « Identité de l'admin »), les mêmes
-- pour toute l'équipe :
-- - le monogramme animé (section « Écran de connexion ») : activé par défaut ; désactivé, il reste
--   immobile sur l'image de droite ; ses animations, cochées une à une, s'enchaînent dans un ordre
--   fixe (au départ le tracé, la lueur et la respiration ; une au moins) ;
-- - l'adresse e-mail de contact de la marque (carte « Nom de la marque ») : montrée sur l'écran de
--   connexion à qui a perdu son téléphone ou son invitation ; null : pas d'adresse.

alter table public.admin_identity
  add column login_monogram_motion boolean not null default true,
  add column login_monogram_motions text[] not null default array['trace', 'glint', 'breathe']
    check (
      cardinality(login_monogram_motions) between 1 and 7
      and login_monogram_motions
        <@ array['trace', 'cascade', 'glint', 'shine', 'halo', 'sway', 'breathe']
    ),
  add column contact_email text check (
    contact_email is null
    or (
      char_length(contact_email) <= 254
      and contact_email = btrim(contact_email)
      and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    )
  );

comment on column public.admin_identity.login_monogram_motion is
  'Le monogramme de l''écran de connexion est animé ; faux : immobile.';
comment on column public.admin_identity.login_monogram_motions is
  'Les animations cochées du monogramme (tracé, cascade, lueur, reflet, halo, balancement, '
  'respiration), jouées dans cet ordre-là quel que soit l''ordre du tableau.';
comment on column public.admin_identity.contact_email is
  'L''adresse e-mail de contact de la marque, montrée sur l''écran de connexion ; null : aucune.';

grant update (login_monogram_motion, login_monogram_motions, contact_email) on public.admin_identity to authenticated;

-- admin_brand() les donne aussi : la page de connexion les lit sans compte. Sa forme change, elle
-- est donc recréée.
drop function public.admin_brand();

create function public.admin_brand()
returns table (
  name text,
  logotype_light text,
  logotype_dark text,
  monogram_light text,
  monogram_dark text,
  login_image text,
  login_monogram_motion boolean,
  login_monogram_motions text[],
  contact_email text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, adresse de contact, logotype et monogramme pour fond clair et '
  'sombre, image et monogramme animé de l''écran de connexion), lisible sans compte pour la page '
  'de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;

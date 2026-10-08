-- La langue de toute l'admin (Paramètres, onglet « Avancé ») : celle de l'équipe tant qu'un membre
-- n'a pas choisi la sienne dans Mon compte, et celle des pages de connexion. L'anglais au départ
-- (ADMIN § 7, « En anglais et en français »).

alter table public.admin_identity
  add column language text not null default 'en' check (language in ('en', 'fr'));

comment on column public.admin_identity.language is
  'La langue de l''admin pour toute l''équipe (en, fr) ; un membre peut choisir la sienne dans Mon '
  'compte (user_metadata.language).';

grant update (language) on public.admin_identity to authenticated;

-- admin_brand() la donne aussi : la page de connexion la lit sans compte. Sa forme change, elle
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
  contact_email text,
  language text
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.name, i.logotype_light, i.logotype_dark, i.monogram_light, i.monogram_dark,
    i.login_image, i.login_monogram_motion, i.login_monogram_motions,
    i.contact_email, i.language
  from public.admin_identity i
  where i.id;
$$;

comment on function public.admin_brand() is
  'L''identité de l''admin (nom, adresse de contact, logotype et monogramme pour fond clair et '
  'sombre, image et monogramme animé de l''écran de connexion) et sa langue, lisibles sans compte '
  'pour la page de connexion.';

revoke execute on function public.admin_brand() from public;
grant execute on function public.admin_brand() to anon, authenticated, service_role;

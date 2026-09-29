-- Médiathèque : « Non utilisés » et le badge « Non utilisé ». La liste de l'admin lit et filtre
-- cette colonne calculée (PostgREST : select=*,media_in_use et media_in_use=eq.false), dans la
-- base : un filtre dans le navigateur, après la limite de la liste, en oublierait.
--
-- La règle est celle de la corbeille (media_trash) : un fichier est utilisé s'il est dans le
-- brouillon d'un contenu ou dans sa version en ligne (private.media_uses). Un fichier « non
-- utilisé » peut donc toujours partir à la corbeille. L'Historique ne compte pas.
--
-- Pour l'équipe seulement (aal2) : null pour tout autre profil, qui ne lit de toute façon pas
-- la table media.

create function public.media_in_use(public.media)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_staff() then exists (select 1 from private.media_uses($1.id))
  end
$$;

revoke execute on function public.media_in_use(public.media) from public, anon;
grant execute on function public.media_in_use(public.media) to authenticated, service_role;

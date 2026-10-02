-- Le titre est obligatoire pour publier (décidé le 02/10/2026, docs/ADMINISTRATION.md, § 4) :
-- article, épisode, page, méthode, chapitre et leçon. Un titre fait seulement d'espaces ne
-- compte pas.
--
-- private.check_publish_requirements est appelée par private.prepare_version (publication, et
-- chaque élément d'une méthode), par public.schedule (refus dès la programmation) et donc par
-- public.publish_preview (problème d'un chapitre ou d'une leçon, avant de publier la méthode).
-- Un contenu déjà en ligne sans titre y reste : c'est sa prochaine publication qui est refusée.
-- Une programmation déjà posée sur un contenu sans titre échouera à l'heure dite (échec affiché,
-- comme pour l'image de présentation).

create or replace function private.check_publish_requirements(content_kind text, body jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if coalesce(body ->> 'title', '') !~ '[^[:space:]]' then
    raise exception using
      errcode = 'P0001',
      message = 'titre_manquant',
      detail = case content_kind
        when 'episode' then 'Donne un titre à l''épisode avant de le publier.'
        when 'page' then 'Donne un titre à la page avant de la publier.'
        when 'method' then 'Donne un titre à la méthode avant de la publier.'
        when 'chapter' then 'Donne un titre au chapitre avant de publier la méthode.'
        when 'lesson' then 'Donne un titre à la leçon avant de publier la méthode.'
        else 'Donne un titre à l''article avant de le publier.'
      end;
  end if;

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

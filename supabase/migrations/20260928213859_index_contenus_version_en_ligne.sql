-- Index de la clé étrangère contents_live_version_fkey : (live_version_id, id) → versions (id,
-- content_id). L'index d'avant ne couvrait que live_version_id ; celui-ci couvre les deux colonnes,
-- dans l'ordre de la clé, comme le demande le conseiller de performances de Supabase. Il sert aussi
-- aux lectures par live_version_id seul, d'où le retrait de l'ancien.

create index contents_live_version_fk_idx on public.contents (live_version_id, id)
  where live_version_id is not null;

drop index public.contents_live_version_idx;

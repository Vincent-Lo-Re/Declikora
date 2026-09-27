-- Données du Supabase LOCAL seulement : lancé par `supabase start`, `supabase db start` et
-- `supabase db reset`, jamais par `supabase db push` (la production garde les valeurs écrites
-- par les migrations).

-- Réglages des tâches planifiées (voir la migration 20260927170000_socle_contenus.sql) :
-- adresse de la fonction « files » joignable DEPUIS le conteneur Postgres local (passerelle
-- Kong, par son nom sur le réseau Docker de Supabase, identique sous macOS et Linux), et clé
-- publishable locale (la même pour tous les Supabase locaux).
update private.settings
set files_url = 'http://kong:8000/functions/v1/files',
  publishable_key = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
  files_last_kick_at = null,
  files_last_audit_at = null
where id;

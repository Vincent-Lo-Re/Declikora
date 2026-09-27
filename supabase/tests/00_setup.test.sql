-- Vérifie que pgTAP fonctionne et que le schéma public existe.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
select plan(1);

select has_schema('public', 'le schéma public existe');

select * from finish();
rollback;

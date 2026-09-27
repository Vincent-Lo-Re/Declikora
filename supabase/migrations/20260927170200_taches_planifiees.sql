-- Tâches planifiées (pg_cron, fuseau GMT). Voir docs/ARCHITECTURE-CONTENUS.md (§ 3.8).
-- cron.schedule remplace la tâche qui porte le même nom : cette migration peut être rejouée.
-- La tâche « publications » arrive à l'étape 5.

-- Ménage hebdomadaire : journaux de pg_cron (14 jours), réponses de pg_net (7 jours ; pg_net
-- les efface déjà au bout de 6 h) et anciens contrôles des fichiers (90 jours, en gardant le
-- dernier). L'étape 4 y ajoute les verrous libres depuis plus d'un jour.
create function private.housekeeping()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from cron.job_run_details d where d.end_time < now() - interval '14 days';
  delete from net._http_response r where r.created < now() - interval '7 days';
  delete from public.media_audit a
  where a.checked_at < now() - interval '90 days'
    and a.id <> (select max(b.id) from public.media_audit b);
end;
$$;

revoke execute on function private.housekeeping() from public, anon, authenticated;

-- Chaque minute : appelle la fonction « files » s'il y a du travail (vérifier, déplacer,
-- effacer, nettoyer).
select cron.schedule('fichiers', '* * * * *', $$select private.kick_files()$$);

-- Chaque jour à 02:00 GMT : demande l'effacement de ce qui est dans la corbeille depuis plus de
-- 30 jours (la tâche « fichiers » efface ensuite les fichiers).
select cron.schedule('corbeille', '0 2 * * *', $$select private.purge_trash()$$);

-- Chaque dimanche à 03:00 GMT : contrôle des fichiers orphelins (résultat dans media_audit,
-- affiché dans la Médiathèque avec « Nettoyer »).
select cron.schedule('audit-fichiers', '0 3 * * 0', $$select private.audit_files()$$);

-- Chaque dimanche à 04:00 GMT : ménage.
select cron.schedule('menage', '0 4 * * 0', $$select private.housekeeping()$$);

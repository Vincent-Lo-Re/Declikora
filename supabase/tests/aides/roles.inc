-- Aides partagées des tests pgTAP : les personnes et leurs sessions.
--
-- À inclure au début de CHAQUE fichier de test, après « begin; » :
--     \ir aides/roles.inc
-- (chaque fichier tourne dans sa propre session : les fonctions pg_temp disparaissent à la fin).
-- L'extension « .inc » est voulue : `supabase test db` exécute tous les fichiers .sql et .pg de
-- supabase/tests, sous-dossiers compris, comme des tests.
--
-- Cinq profils (docs/ARCHITECTURE-CONTENUS.md, § 6.0, point 8) :
--   select pg_temp.as_anon();                 -- visiteur non connecté (rôle anon)
--   select pg_temp.as_person('editor', 'aal1'); -- éditeur avant la double vérification
--   select pg_temp.as_person('editor');       -- éditeur après la double vérification (aal2)
--   select pg_temp.as_person('admin');        -- admin (aal2)
--   select pg_temp.as_person('reader');       -- compte sans fiche d'équipe (lecteur), aal2
--   select pg_temp.as_postgres();             -- retour à postgres (ignore les politiques)
--   select pg_temp.empty_media_library();     -- médiathèque vide (fichiers, contrôles, objets)
--   select pg_temp.empty_contents();          -- aucun contenu, version, verrou, catégorie,
--                                             -- formule ni abonnement de lecteur
--   select pg_temp.facts_of('select …');    -- code et hint (les faits) de l'erreur levée
-- Chaque profil a un compte et une session ouverte, créés par pg_temp.create_people().
-- Les identifiants sont fixes : pg_temp.person_id('editor')…

create function pg_temp.person_id(who text)
returns uuid
language sql
immutable
as $$
  select case who
    when 'admin' then 'a0000000-0000-4000-8000-00000000000a'::uuid
    when 'editor' then 'e0000000-0000-4000-8000-00000000000e'::uuid
    when 'editor2' then 'e0000000-0000-4000-8000-0000000000e2'::uuid
    when 'reader' then 'c0000000-0000-4000-8000-00000000000c'::uuid
  end
$$;

-- Crée les comptes (le rôle posé dans app_metadata crée la fiche d'équipe, comme une
-- invitation ; le lecteur n'en a pas) et une session ouverte pour chacun (même identifiant que
-- le compte, pour simplifier).
create function pg_temp.create_people()
returns void
language plpgsql
as $$
begin
  insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data) values
    (pg_temp.person_id('admin'), 'admin@tests.local', now(), '{"role":"admin"}'),
    (pg_temp.person_id('editor'), 'editeur@tests.local', now(), '{"role":"editor"}'),
    (pg_temp.person_id('editor2'), 'editeur2@tests.local', now(), '{"role":"editor"}'),
    (pg_temp.person_id('reader'), 'lecteur@tests.local', now(), '{"provider":"email"}');
  insert into auth.sessions (id, user_id)
  select pg_temp.person_id(who), pg_temp.person_id(who)
  from unnest(array['admin', 'editor', 'editor2', 'reader']) as who;
end;
$$;

-- Devient cette personne (rôle authenticated), avec le niveau de vérification voulu.
create function pg_temp.as_person(who text, aal text default 'aal2')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', pg_temp.person_id(who),
      'role', 'authenticated',
      'aal', aal,
      'session_id', pg_temp.person_id(who)
    )::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Visiteur non connecté.
create function pg_temp.as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Clé secrète (fonction Edge) : rôle service_role, qui ignore les politiques.
create function pg_temp.as_service()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end;
$$;

-- Retour à postgres (préparer ou vérifier sans les politiques).
create function pg_temp.as_postgres()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- Nombre de lignes qu'une commande modifie (UPDATE ou DELETE sans politique : 0, sans erreur).
create function pg_temp.affected(command text)
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  execute command;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Part d'une médiathèque vide : la base de développement peut contenir des fichiers, des
-- contrôles et des objets (envois faits depuis l'admin locale, tests de parcours, test
-- d'intégration de « files »). Tout est annulé par le rollback de fin de fichier. À appeler en
-- postgres, juste après create_people().
create function pg_temp.empty_media_library()
returns void
language plpgsql
as $$
begin
  truncate public.media, public.media_audit;
  -- Supabase bloque tout DELETE SQL sur storage.objects (déclencheur protect_delete) : levé
  -- le temps de vider les deux buckets de la médiathèque.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id in ('files-public', 'files-protected');
  perform set_config('storage.allow_delete_query', 'false', true);
end;
$$;

-- Part de zéro contenu (la base de développement peut contenir des brouillons écrits depuis
-- l'admin locale ou par les tests de parcours) : contenus, versions, verrous, catégories et
-- leurs liens, formules et abonnements de lecteurs. Tout est annulé par le rollback de fin de
-- fichier. À appeler en postgres.
-- Les versions refusent tout vidage (TRUNCATE) : les contenus sont SUPPRIMÉS, et leurs versions,
-- verrous et catégories partent en cascade (une version ne disparaît qu'avec son contenu).
create function pg_temp.empty_contents()
returns void
language plpgsql
as $$
begin
  delete from public.contents;
  delete from public.categories;
  delete from public.reader_access;
  delete from public.access_levels;
end;
$$;

-- Le code et le hint de l'erreur levée par une commande (null si elle réussit) :
-- {"code": "...", "hint": ...}. Le hint porte les faits que l'admin met en phrase dans sa langue :
-- un tableau JSON (titres, fichiers, numéros de blocs), lu tel quel, ou un nom, lu en texte.
create function pg_temp.facts_of(command text)
returns jsonb
language plpgsql
as $$
declare
  hint text;
  facts jsonb;
begin
  execute command;
  return null;
exception
  when others then
    get stacked diagnostics hint = pg_exception_hint;
    begin
      facts := hint::jsonb;
    exception
      when others then
        facts := to_jsonb(hint);
    end;
    return jsonb_build_object('code', sqlerrm, 'hint', facts);
end;
$$;

-- Les migrations retirent l'EXECUTE par défaut de PUBLIC sur les fonctions créées par postgres
-- (20260927170000_socle_contenus.sql) : on le rend à ces aides, appelées sous chaque rôle.
grant execute on function
  pg_temp.person_id(text),
  pg_temp.create_people(),
  pg_temp.as_person(text, text),
  pg_temp.as_anon(),
  pg_temp.as_service(),
  pg_temp.as_postgres(),
  pg_temp.affected(text),
  pg_temp.empty_media_library(),
  pg_temp.empty_contents(),
  pg_temp.facts_of(text)
to public;

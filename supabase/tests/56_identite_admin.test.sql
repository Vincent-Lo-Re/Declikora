-- Identité de l'admin : le nom de la marque, le logotype et le monogramme (fond clair et sombre),
-- l'image de l'écran de connexion.
-- Lecture par l'équipe en aal2, modification par un admin, une seule ligne (ni ajout ni
-- suppression) ; admin_brand() la donne à tout le monde. Les fichiers : l'espace public
-- « marque », où seul un admin envoie et retire, au chemin attendu.
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
select plan(58);

select pg_temp.create_people();

create function pg_temp.upload(object_name text)
returns void
language sql
as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('marque', object_name, auth.uid()::text, '{"size": 10, "mimetype": "image/svg+xml"}')
$$;
grant execute on function pg_temp.upload(text) to public;

-- Au départ : une ligne, vide (l'admin affiche « Ruche » et son initiale).
select is((select count(*)::int from public.admin_identity), 1, 'une seule ligne au départ');
select is(
  (select row(name, logotype_light, logotype_dark, monogram_light, monogram_dark)::text
   from public.admin_brand()),
  '(,,,,)', 'vide au départ'
);

-- L'espace « marque » : public, 1 Mo, SVG, PNG, WebP ou JPEG (une photo réduite par Safari).
select is(
  (select row(public, file_size_limit, allowed_mime_types)::text
   from storage.buckets where id = 'marque'),
  row(true, 1048576::bigint, array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'])::text,
  'espace « marque » : public, 1 Mo, SVG, PNG, WebP ou JPEG'
);

-- anon : l'identité par admin_brand(), rien de la table.
select pg_temp.as_anon();
select is((select count(*)::int from public.admin_brand()), 1, 'anon : admin_brand() répond');
select throws_ok(
  'select * from public.admin_identity', '42501', null, 'anon : pas de lecture de la table'
);
select throws_ok(
  $$select pg_temp.upload('logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  '42501', null, 'anon : pas d''envoi dans l''espace « marque »'
);

-- Un compte sans fiche d'équipe et un éditeur en aal1 ne voient rien.
select pg_temp.as_person('reader');
select is((select count(*)::int from public.admin_identity), 0, 'lecteur : ne voit pas la ligne');
select pg_temp.as_person('editor', 'aal1');
select is((select count(*)::int from public.admin_identity), 0, 'éditeur aal1 : ne voit pas la ligne');

-- Un éditeur en aal2 la lit, mais ne la modifie pas et n'envoie rien.
select pg_temp.as_person('editor');
select is((select count(*)::int from public.admin_identity), 1, 'éditeur : lit la ligne');
select is(
  pg_temp.affected($$update public.admin_identity set name = 'Essaim'$$), 0,
  'éditeur : ne change pas le nom'
);
select throws_ok(
  $$select pg_temp.upload('logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  '42501', null, 'éditeur : pas d''envoi dans l''espace « marque »'
);

-- Un admin change le nom ; admin_brand() le donne aussitôt, à tout le monde.
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$update public.admin_identity set name = 'Essaim'$$), 1,
  'admin : change le nom'
);
select pg_temp.as_anon();
select is((select name from public.admin_brand()), 'Essaim', 'anon : le nouveau nom');

-- Les règles du nom : 1 à 40 caractères, sans espace autour ; null revient à « Ruche ».
select pg_temp.as_person('admin');
select throws_ok(
  $$update public.admin_identity set name = ' Essaim '$$, '23514', null,
  'un nom avec des espaces autour est refusé'
);
select throws_ok(
  $$update public.admin_identity set name = ''$$, '23514', null, 'un nom vide est refusé'
);
select throws_ok(
  format('update public.admin_identity set name = %L', repeat('a', 41)), '23514', null,
  'un nom de plus de 40 caractères est refusé'
);
select is(
  pg_temp.affected($$update public.admin_identity set name = null$$), 1,
  'admin : revient au nom par défaut'
);

-- Un admin envoie un fichier au chemin attendu, et l'enregistre comme logotype.
select lives_ok(
  $$select pg_temp.upload('logotype-clair/00000000-0000-4000-8000-000000000001.svg')$$,
  'admin : envoie le logotype pour fond clair'
);
select throws_ok(
  $$select pg_temp.upload('autre/00000000-0000-4000-8000-000000000002.svg')$$,
  '23514', null, 'admin : pas d''envoi hors de ses dossiers'
);
select throws_ok(
  $$select pg_temp.upload('monogramme-sombre/logo.svg')$$,
  '23514', null, 'admin : pas d''envoi sous un autre nom'
);
select is(
  pg_temp.affected($$update public.admin_identity
    set logotype_light = 'logotype-clair/00000000-0000-4000-8000-000000000001.svg'$$), 1,
  'admin : enregistre le logotype pour fond clair'
);
select throws_ok(
  $$update public.admin_identity set monogram_dark = 'monogramme-sombre/logo.exe'$$,
  '23514', null, 'un chemin de fichier inattendu est refusé'
);
select pg_temp.as_anon();
select is(
  (select logotype_light from public.admin_brand()),
  'logotype-clair/00000000-0000-4000-8000-000000000001.svg',
  'anon : le chemin du logotype'
);

-- Un éditeur ne retire pas un fichier de la marque ; un admin, si (par l'API de Storage).
select set_config('storage.allow_delete_query', 'true', true);
select pg_temp.as_person('editor');
select is(
  pg_temp.affected($$delete from storage.objects where bucket_id = 'marque'$$), 0,
  'éditeur : ne retire pas un fichier de la marque'
);
select pg_temp.as_person('admin');
select is(
  pg_temp.affected($$delete from storage.objects where bucket_id = 'marque'$$), 1,
  'admin : retire un fichier de la marque'
);

-- Les déclinaisons par palette : un admin les ajoute et les retire, l'équipe les lit, tout le
-- monde les reçoit par admin_brand_variants().
select pg_temp.as_person('editor');
select throws_ok(
  $$insert into public.admin_brand_variants (kind, palette, surface, path) values
    ('logotype', 'stone-orange', 'light', 'logotype-palettes/00000000-0000-4000-8000-000000000003.svg')$$,
  '42501', null, 'éditeur : pas de déclinaison'
);
select pg_temp.as_person('admin');
select lives_ok(
  $$insert into public.admin_brand_variants (kind, palette, surface, path) values
    ('logotype', 'stone-orange', 'light', 'logotype-palettes/00000000-0000-4000-8000-000000000003.svg'),
    ('logotype', 'stone-orange', 'dark', 'logotype-palettes/00000000-0000-4000-8000-000000000004.svg')$$,
  'admin : ajoute les déclinaisons d''une palette'
);
select throws_ok(
  $$insert into public.admin_brand_variants (kind, palette, surface, path) values
    ('logotype', 'Pierre Orange', 'light', 'logotype-palettes/00000000-0000-4000-8000-000000000005.svg')$$,
  '23514', null, 'un identifiant de palette inattendu est refusé'
);
select pg_temp.as_anon();
select is(
  (select count(*)::int from public.admin_brand_variants()), 2,
  'anon : reçoit les déclinaisons par admin_brand_variants()'
);
select pg_temp.as_person('editor');
select is(
  pg_temp.affected('delete from public.admin_brand_variants'), 0,
  'éditeur : ne retire pas de déclinaison'
);
select pg_temp.as_person('admin');
select is(
  pg_temp.affected('delete from public.admin_brand_variants'), 2,
  'admin : retire les déclinaisons'
);

-- L'image de l'écran de connexion : un admin l'envoie dans « connexion/ » et l'enregistre, un
-- éditeur non ; tout le monde la reçoit par admin_brand(). Le JPEG n'y est permis que là.
select pg_temp.as_person('editor');
select is(
  pg_temp.affected($$update public.admin_identity
    set login_image = 'connexion/00000000-0000-4000-8000-000000000006.webp'$$), 0,
  'éditeur : ne change pas l''image de connexion'
);
select pg_temp.as_person('admin');
select lives_ok(
  $$select pg_temp.upload('connexion/00000000-0000-4000-8000-000000000006.jpg')$$,
  'admin : envoie l''image de connexion'
);
select is(
  pg_temp.affected($$update public.admin_identity
    set login_image = 'connexion/00000000-0000-4000-8000-000000000006.jpg'$$), 1,
  'admin : enregistre l''image de connexion'
);
select throws_ok(
  $$update public.admin_identity
    set logotype_dark = 'logotype-sombre/00000000-0000-4000-8000-000000000007.jpg'$$,
  '23514', null, 'un logotype en JPEG est refusé'
);
select throws_ok(
  $$update public.admin_identity set login_image = 'connexion/photo.jpg'$$,
  '23514', null, 'une image de connexion sous un autre nom est refusée'
);
select pg_temp.as_anon();
select is(
  (select login_image from public.admin_brand()),
  'connexion/00000000-0000-4000-8000-000000000006.jpg',
  'anon : le chemin de l''image de connexion'
);
select pg_temp.as_person('admin');

-- Le monogramme animé de l'écran de connexion : activé au départ ; un admin le désactive, un
-- éditeur non ; tout le monde le lit par admin_brand().
select pg_temp.as_anon();
select is((select login_monogram_motion from public.admin_brand()), true, 'monogramme animé au départ');
select pg_temp.as_person('editor');
select is(
  pg_temp.affected('update public.admin_identity set login_monogram_motion = false'), 0,
  'éditeur : ne change pas le monogramme animé'
);
select pg_temp.as_person('admin');
select is(
  pg_temp.affected('update public.admin_identity set login_monogram_motion = false'), 1,
  'admin : désactive le monogramme animé'
);
select pg_temp.as_anon();
select is((select login_monogram_motion from public.admin_brand()), false, 'anon : monogramme immobile');
select pg_temp.as_person('admin');

-- Ses animations : le tracé, la lueur et la respiration au départ ; un admin en coche d'autres,
-- parmi les sept connues, une au moins.
select is(
  pg_temp.affected('update public.admin_identity set login_monogram_motions = default'), 1,
  'admin : revient aux animations du départ'
);
select is(
  (select login_monogram_motions from public.admin_brand()), array['trace', 'glint', 'breathe'],
  'les animations du départ'
);
select is(
  pg_temp.affected($$update public.admin_identity set login_monogram_motions = array['shine', 'sway']$$), 1,
  'admin : coche le reflet et le balancement'
);
select throws_ok(
  $$update public.admin_identity set login_monogram_motions = array['spin']$$, '23514', null,
  'une animation inconnue est refusée'
);
select throws_ok(
  $$update public.admin_identity set login_monogram_motions = array[]::text[]$$, '23514', null,
  'au moins une animation'
);
select pg_temp.as_anon();
select is(
  (select login_monogram_motions from public.admin_brand()), array['shine', 'sway'],
  'anon : les animations cochées'
);
select pg_temp.as_person('admin');

-- L'adresse de contact : vide au départ ; un admin l'enregistre (une adresse bien écrite), un
-- éditeur non ; tout le monde la lit par admin_brand().
select pg_temp.as_person('editor');
select is(
  pg_temp.affected($$update public.admin_identity set contact_email = 'aide@exemple.fr'$$), 0,
  'éditeur : ne change pas l''adresse de contact'
);
select pg_temp.as_person('admin');
select throws_ok(
  $$update public.admin_identity set contact_email = 'pas-une-adresse'$$, '23514', null,
  'une adresse de contact mal écrite est refusée'
);
select is(
  pg_temp.affected($$update public.admin_identity set contact_email = 'aide@exemple.fr'$$), 1,
  'admin : enregistre l''adresse de contact'
);
select pg_temp.as_anon();
select is((select contact_email from public.admin_brand()), 'aide@exemple.fr', 'anon : l''adresse de contact');
select pg_temp.as_person('admin');

-- La langue de toute l'admin : l'anglais au départ ; un admin la change (en ou fr seulement), un
-- éditeur non ; tout le monde la lit par admin_brand().
select col_default_is('public', 'admin_identity', 'language', 'en'::text, 'l''anglais au départ');
select pg_temp.as_person('editor');
select is(
  pg_temp.affected($$update public.admin_identity set language = 'fr'$$), 0,
  'éditeur : ne change pas la langue de l''admin'
);
select pg_temp.as_person('admin');
select throws_ok(
  $$update public.admin_identity set language = 'de'$$, '23514', null,
  'une langue inconnue est refusée'
);
select is(
  pg_temp.affected($$update public.admin_identity set language = 'fr'$$), 1,
  'admin : choisit le français pour toute l''admin'
);
select pg_temp.as_anon();
select is((select language from public.admin_brand()), 'fr', 'anon : la langue de l''admin');
select pg_temp.as_person('admin');

-- Une seule ligne : ni ajout ni suppression, même pour un admin.
select throws_ok(
  $$insert into public.admin_identity (id) values (true)$$, '42501', null,
  'admin : pas d''ajout'
);
select throws_ok(
  'delete from public.admin_identity', '42501', null, 'admin : pas de suppression'
);

select * from finish();
rollback;

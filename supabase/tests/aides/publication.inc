-- Aides des tests de publication (étape 5) : contenus nommés, brouillons, blocs, fichiers,
-- formules et catégories de départ. À inclure après « \ir aides/roles.inc », puis :
--     select pg_temp.create_people();
--     select pg_temp.empty_media_library();
--     select pg_temp.empty_contents();
--     \ir aides/publication.inc
--
-- Contenus nommés : pg_temp.create_content('article', 'article') crée par content_create (sous le
-- rôle courant, qui tient ensuite le verrou) et range l'identifiant sous ce nom ; pg_temp.cid()
-- le retrouve.
--
-- Fichiers prêts (pg_temp.mid) : photo (image, alt « Un chat »), fond (image, sans alt),
-- son (audio), vieux (image, qu'un test met à la corbeille). Formules : essentiel (rang 1),
-- complet (rang 2) (pg_temp.lid). Catégories du Blog : sommeil, cuisine (pg_temp.catid).

create temporary table ids (name text primary key, id uuid not null);
grant all on ids to public;

create function pg_temp.cid(content_name text)
returns uuid
language sql
stable
as $$
  select id from ids where name = content_name
$$;

create function pg_temp.create_content(
  content_name text,
  content_kind text,
  parent_name text default null,
  content_title text default '',
  sort text default null
)
returns uuid
language plpgsql
as $$
declare
  created uuid;
begin
  select (public.content_create(
    kind => content_kind,
    parent_id => pg_temp.cid(parent_name),
    title => content_title,
    template_sort => sort
  )).id into created;
  insert into ids (name, id) values (content_name, created);
  return created;
end;
$$;

-- Révision actuelle d'un contenu (lue sans les politiques).
create function pg_temp.rev(content_name text)
returns integer
language sql
stable
security definer
as $$
  select draft_rev from public.contents where id = pg_temp.cid(content_name)
$$;

-- Enregistre un brouillon (sous le rôle courant) à la révision actuelle.
create function pg_temp.save(content_name text, draft jsonb, settings jsonb default null)
returns integer
language sql
as $$
  select (public.save_draft(pg_temp.cid(content_name), pg_temp.rev(content_name), draft, settings)).draft_rev
$$;

-- Publie (sous le rôle courant) la révision actuelle ; renvoie l'identifiant de la version.
create function pg_temp.publish(content_name text)
returns uuid
language sql
as $$
  select (public.publish(pg_temp.cid(content_name), pg_temp.rev(content_name))).version_id
$$;

-- La version en ligne d'un contenu (lue sans les politiques).
create function pg_temp.live(content_name text)
returns public.versions
language sql
stable
security definer
as $$
  select v.* from public.versions v
  join public.contents c on c.live_version_id = v.id
  where c.id = pg_temp.cid(content_name)
$$;

-- Un brouillon avec ces blocs.
create function pg_temp.draft(blocks jsonb, title text default 'Titre', extra jsonb default '{}')
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('v', 1, 'title', title, 'blocks', blocks) || extra
$$;

-- Un bloc Texte d'un paragraphe.
create function pg_temp.text_block(id text, body text default 'Bonjour')
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', id, 'type', 'text',
    'doc', jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', body))
    )))
  )
$$;

-- Un bloc Image (media_id null : pas encore choisie ; alt null : celui de la médiathèque).
create function pg_temp.image_block(id text, media_id uuid, alt text default null)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', id, 'type', 'image', 'mediaId', media_id, 'caption', null, 'alt', alt
  )
$$;

-- Un encadré qui contient ces blocs.
create function pg_temp.box_block(id text, blocks jsonb)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object('id', id, 'type', 'box', 'look', 'fill', 'blocks', blocks)
$$;

-- Message et détail de l'erreur levée par une commande (null si elle réussit).
create function pg_temp.error_of(command text)
returns text
language plpgsql
as $$
declare
  detail text;
  hint text;
begin
  execute command;
  return null;
exception
  when others then
    get stacked diagnostics detail = pg_exception_detail, hint = pg_exception_hint;
    return sqlerrm || ' | ' || coalesce(detail, '') || ' | ' || coalesce(hint, '');
end;
$$;

create function pg_temp.mid(media_name text)
returns uuid
language sql
immutable
as $$
  select case media_name
    when 'photo' then '10000000-0000-4000-8000-000000000001'::uuid
    when 'fond' then '10000000-0000-4000-8000-000000000002'::uuid
    when 'son' then '10000000-0000-4000-8000-000000000003'::uuid
    when 'vieux' then '10000000-0000-4000-8000-000000000004'::uuid
  end
$$;

create function pg_temp.lid(level_name text)
returns uuid
language sql
immutable
as $$
  select case level_name
    when 'essentiel' then '40000000-0000-4000-8000-000000000001'::uuid
    when 'complet' then '40000000-0000-4000-8000-000000000002'::uuid
  end
$$;

create function pg_temp.catid(category_name text)
returns uuid
language sql
immutable
as $$
  select case category_name
    when 'sommeil' then '30000000-0000-4000-8000-000000000001'::uuid
    when 'cuisine' then '30000000-0000-4000-8000-000000000002'::uuid
  end
$$;

grant execute on function
  pg_temp.cid(text),
  pg_temp.create_content(text, text, text, text, text),
  pg_temp.rev(text),
  pg_temp.save(text, jsonb, jsonb),
  pg_temp.publish(text),
  pg_temp.live(text),
  pg_temp.draft(jsonb, text, jsonb),
  pg_temp.text_block(text, text),
  pg_temp.image_block(text, uuid, text),
  pg_temp.box_block(text, jsonb),
  pg_temp.error_of(text),
  pg_temp.mid(text),
  pg_temp.lid(text),
  pg_temp.catid(text)
to public;

insert into public.media (id, kind, name, path, mime, size_bytes, status, alt, transcript, created_by)
values
  (pg_temp.mid('photo'), 'image', 'photo.webp', pg_temp.mid('photo') || '/photo.webp',
    'image/webp', 1000, 'ready', 'Un chat', null, pg_temp.person_id('editor')),
  (pg_temp.mid('fond'), 'image', 'fond.webp', pg_temp.mid('fond') || '/fond.webp',
    'image/webp', 1000, 'ready', null, null, pg_temp.person_id('editor')),
  (pg_temp.mid('son'), 'audio', 'son.mp3', pg_temp.mid('son') || '/son.mp3',
    'audio/mpeg', 1000, 'ready', null, 'Bonjour à tous', pg_temp.person_id('editor')),
  (pg_temp.mid('vieux'), 'image', 'vieux.webp', pg_temp.mid('vieux') || '/vieux.webp',
    'image/webp', 1000, 'ready', null, null, pg_temp.person_id('editor'));

insert into public.access_levels (id, name) values
  (pg_temp.lid('essentiel'), 'Essentiel'),
  (pg_temp.lid('complet'), 'Complet');

insert into public.categories (id, section, name) values
  (pg_temp.catid('sommeil'), 'blog', 'Sommeil'),
  (pg_temp.catid('cuisine'), 'blog', 'Cuisine');

-- Forme des blocs dans la base (docs/ARCHITECTURE-CONTENUS.md, § 2.1) : pg_jsonschema 0.3.3
-- applique le schéma draft-07 écrit dans blocks/blocks.schema.json, $ref récursifs compris, et
-- donne le même verdict qu'Ajv sur tous les cas partagés (blocks/cases/*.json).
-- Lancer avec : npm run db:test (Supabase doit tourner : npm run db:start)
begin;
\ir aides/roles.inc
\ir aides/blocs-cas.inc
select plan(23 + (select count(*)::int from blocks_cases));

-- Brouillon d'essai : un bloc Texte avec « depth » niveaux de listes à puces imbriquées ; le
-- lien du niveau le plus profond vise « deepest_href ».
create function pg_temp.nested_lists(depth integer, deepest_href text default 'https://declikora.app')
returns jsonb
language plpgsql
as $$
declare
  item jsonb := jsonb_build_object(
    'type', 'listItem',
    'content', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', 'au fond',
        'marks', jsonb_build_array(jsonb_build_object(
          'type', 'link', 'attrs', jsonb_build_object('href', deepest_href)
        ))
      ))
    ))
  );
begin
  for i in 2..depth loop
    item := jsonb_build_object(
      'type', 'listItem',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', 'niveau ' || i))
        ),
        jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(item))
      )
    );
  end loop;
  return jsonb_build_object(
    'v', 1,
    'title', 'Listes',
    'blocks', jsonb_build_array(jsonb_build_object(
      'id', '00000000-0000-4000-8000-000000000001',
      'type', 'text',
      'doc', jsonb_build_object(
        'type', 'doc',
        'content', jsonb_build_array(
          jsonb_build_object('type', 'bulletList', 'content', jsonb_build_array(item))
        )
      )
    ))
  );
end;
$$;
grant execute on function pg_temp.nested_lists(integer, text) to public;

-- ---------------------------------------------------------------------------------------------
-- D'abord : la récursion draft-07 dans pg_jsonschema 0.3.3 (premier test de l'étape 4)
-- ---------------------------------------------------------------------------------------------

select ok(
  extensions.jsonb_matches_schema(private.blocks_schema('draft'), pg_temp.nested_lists(6)),
  'récursion : 6 niveaux de listes imbriquées acceptés ($ref récursifs appliqués)'
);
select ok(
  not extensions.jsonb_matches_schema(
    private.blocks_schema('draft'), pg_temp.nested_lists(6, 'javascript:alert(1)')
  ),
  'récursion : un lien javascript: au 6e niveau de liste est trouvé et refusé'
);
select ok(
  not extensions.jsonb_matches_schema(
    private.blocks_schema('draft'),
    replace(pg_temp.nested_lists(6)::text, '"text": "au fond"', '"text": "au fond", "foo": 1')::jsonb
  ),
  'récursion : une propriété en trop au fond des listes est refusée'
);
select ok(
  extensions.jsonb_matches_schema(private.blocks_schema('draft'), pg_temp.nested_lists(25)),
  'récursion : 25 niveaux de listes acceptés'
);
select is(
  (extensions.jsonschema_validation_errors(
    private.blocks_schema('draft'), pg_temp.nested_lists(6, 'javascript:alert(1)')::json
  ))[1],
  '"javascript:alert(1)" does not match "^(https://|mailto:)[^\s]+$"',
  'récursion : le message nomme la valeur fautive, pas tout le document'
);

-- ---------------------------------------------------------------------------------------------
-- Le schéma rangé dans la base
-- ---------------------------------------------------------------------------------------------

select is(
  private.blocks_schema('draft') ->> '$schema', 'http://json-schema.org/draft-07/schema#',
  'variante draft : JSON Schema draft-07'
);
select is(
  private.blocks_schema('template') ->> '$schema', 'http://json-schema.org/draft-07/schema#',
  'variante template : JSON Schema draft-07'
);
select is(
  private.blocks_schema('draft') ->> '$id', 'https://declikora.app/blocks/draft.schema.json',
  'variante draft : identifiant'
);
select is(
  private.blocks_schema('published') ->> '$id', 'https://declikora.app/blocks/published.schema.json',
  'variante published (étape 5) : identifiant'
);
select ok(private.blocks_schema('inconnue') is null, 'variante inconnue : null');
select ok(
  extensions.jsonschema_is_valid(private.blocks_schema('draft'))
    and extensions.jsonschema_is_valid(private.blocks_schema('template'))
    and extensions.jsonschema_is_valid(private.blocks_schema('published')),
  'les trois variantes sont des schémas valides pour pg_jsonschema'
);
select ok(
  private.blocks_schema_hash() ~ '^[0-9a-f]{64}$',
  'empreinte : SHA-256 en hexadécimal (comparée à blocks/generated/schema.sha256 par les garde-fous)'
);
select is(
  private.blocks_schema_hash(),
  encode(sha256(convert_to(
    'draft' || E'\n' || private.blocks_schema('draft')::text || E'\n'
      || 'template' || E'\n' || private.blocks_schema('template')::text || E'\n'
      || 'published' || E'\n' || private.blocks_schema('published')::text || E'\n',
    'UTF8'
  )), 'hex'),
  'empreinte : calculée sur le texte exact des trois variantes'
);
select volatility_is('private', 'blocks_schema', array['text'], 'immutable', 'blocks_schema est immutable');
select volatility_is('private', 'blocks_schema_hash', array[]::text[], 'immutable', 'blocks_schema_hash est immutable');
select function_privs_are(
  'private', 'blocks_schema', array['text'], 'authenticated', array[]::text[],
  'authenticated : blocks_schema non exécutable'
);
select function_privs_are(
  'private', 'blocks_schema', array['text'], 'anon', array[]::text[],
  'anon : blocks_schema non exécutable'
);
select is(
  (select count(*)::int from pg_proc
    where proname = 'blocks_schema' and pronamespace = 'private'::regnamespace),
  1,
  'une seule fonction blocks_schema (la migration générée la remplace)'
);

-- Messages précis (discriminant if/then/else sur « type », jamais oneOf).
select is(
  (extensions.jsonschema_validation_errors(
    private.blocks_schema('draft'),
    (select data from blocks_cases where name = 'refuse-titre-niveau-1')::json
  ))[1],
  '1 is not one of [2,3]',
  'titre de niveau 1 : message précis'
);
select is(
  (extensions.jsonschema_validation_errors(
    private.blocks_schema('draft'),
    (select data from blocks_cases where name = 'refuse-encadre-dans-encadre')::json
  ))[1],
  '"box" is not one of ["text","image"]',
  'encadré dans un encadré : message précis'
);
select is(
  (extensions.jsonschema_validation_errors(
    private.blocks_schema('draft'),
    (select data from blocks_cases where name = 'refuse-lien-target')::json
  ))[1],
  'Additional properties are not allowed (''target'' was unexpected)',
  'lien avec target : message précis'
);

-- Variante « template » : pas de bloc lié ; variante « draft » : bloc lié permis au premier niveau.
select ok(
  extensions.jsonb_matches_schema(
    private.blocks_schema('draft'),
    '{"v":1,"title":"x","blocks":[{"id":"00000000-0000-4000-8000-000000000001","type":"linked","templateId":"00000000-0000-4000-8000-000000000002"}]}'
  ),
  'brouillon de contenu : bloc lié permis au premier niveau'
);
select ok(
  not extensions.jsonb_matches_schema(
    private.blocks_schema('template'),
    '{"v":1,"title":"x","blocks":[{"id":"00000000-0000-4000-8000-000000000001","type":"linked","templateId":"00000000-0000-4000-8000-000000000002"}]}'
  ),
  'brouillon de modèle : bloc lié refusé'
);

-- ---------------------------------------------------------------------------------------------
-- Tous les cas partagés (les mêmes qu'Ajv dans blocks:generate et Vitest)
-- ---------------------------------------------------------------------------------------------

select is(
  extensions.jsonb_matches_schema(private.blocks_schema(c.variant), c.data),
  c.valid,
  format('cas %s (%s) : %s', c.name, c.variant, c.description)
)
from blocks_cases c
order by c.name;

select * from finish();
rollback;

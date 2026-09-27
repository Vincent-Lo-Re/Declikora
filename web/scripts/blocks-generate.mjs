// Tire tout ce qui dépend de la forme des blocs de sa source unique, blocks/ à la racine
// (docs/ARCHITECTURE-CONTENUS.md, § 2.1) : npm run blocks:generate
//
// Lit :
//   - blocks/blocks.schema.json : le schéma (JSON Schema draft-07, écrit à la main) ;
//   - blocks/blocks.tokens.json : les mesures communes à l'aperçu de l'admin et à l'app ;
//   - blocks/cases/*.json : les cas de test partagés ({ description, variant, valid, data }).
// Produit :
//   - blocks/generated/<variante>.schema.json : chaque variante, telle que la reçoivent Ajv et
//     pg_jsonschema, et blocks/generated/schema.sha256 (son empreinte) ;
//   - web/src/blocks/generated/blocks.ts : les types TypeScript ;
//   - web/src/blocks/generated/validators.js (+ .d.ts) : les validateurs Ajv « standalone »,
//     en ESM, AUTONOMES (les aides d'Ajv sont incluses par esbuild : ni ajv, ni require, ni
//     new Function à l'exécution, donc utilisables tels quels par l'app sous Hermes) ;
//   - web/src/blocks/generated/tokens.css et tokens.ts : variables CSS et constantes ;
//   - supabase/tests/aides/blocs-cas.inc : les cas partagés, pour les tests pgTAP ;
//   - quand le schéma a changé : une NOUVELLE migration qui recrée private.blocks_schema(variant)
//     et private.blocks_schema_hash(). Jamais de retouche d'une migration existante.
// Vérifie enfin chaque cas partagé avec les validateurs produits : le script échoue au moindre
// écart. Les garde-fous (job « Administration ») le relancent et refusent toute différence.

import Ajv from "ajv"
import standaloneCode from "ajv/dist/standalone/index.js"
import { build } from "esbuild"
import { compile } from "json-schema-to-typescript"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const repo = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url))
const webRoot = fileURLToPath(new URL("../", import.meta.url))

const BANNER =
  "Généré par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier."
const VARIANTS = ["draft", "template"]
const BASE_ID = "https://declikora.app/blocks/"
const MIGRATIONS = repo("supabase/migrations")
const HASH_MARKER = "-- blocks-schema-sha256: "

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))
const fail = (message) => {
  console.error(`blocks:generate : ${message}`)
  process.exit(1)
}

// ---------------------------------------------------------------------------------------------
// Schéma : règles de la source, puis une variante par document
// ---------------------------------------------------------------------------------------------

const source = readJson(repo("blocks/blocks.schema.json"))
if (source.$schema !== "http://json-schema.org/draft-07/schema#") {
  fail("le schéma doit rester en draft-07 ($schema).")
}

// Dans pg_jsonschema 0.3.3, un oneOf (ou anyOf, allOf) dont les branches descendent dans le
// même sous-arbre rend la validation exponentielle : avec oneOf, le temps double à chaque niveau
// de liste (mesuré : 70 ms à 8 niveaux, 1 s à 12, donc des minutes à 20), dans un calcul que la
// base n'interrompt pas. Les unions s'écrivent en if/then/else selon « type » (temps linéaire).
// « format » n'est pas vérifié par pg_jsonschema : on écrit des « pattern ».
const forbidden = new Set(["oneOf", "anyOf", "allOf", "not", "format", "$defs"])
const walk = (node, path) => {
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, `${path}/${i}`))
  } else if (node && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      if (forbidden.has(key)) fail(`mot-clé interdit « ${key} » en ${path}.`)
      walk(child, `${path}/${key}`)
    }
  }
}
walk(source, "#")

for (const variant of VARIANTS) {
  if (!source.definitions?.[variant]) fail(`definitions.${variant} manque.`)
}

// Chaque variante est un document complet : ses mots-clés à la racine, toutes les définitions
// à côté (les $ref « #/definitions/… » s'y résolvent).
const variantSchema = (variant) => {
  const rules = { ...source.definitions[variant] }
  const { $comment } = rules
  delete rules.title
  delete rules.$comment
  return {
    $schema: source.$schema,
    $id: `${BASE_ID}${variant}.schema.json`,
    $comment: `${BANNER} Variante « ${variant} ». ${$comment ?? ""}`.trim(),
    ...rules,
    definitions: source.definitions,
  }
}
const schemas = Object.fromEntries(VARIANTS.map((v) => [v, variantSchema(v)]))
// Texte exact rangé dans la base (json garde le texte tel quel) : l'empreinte se calcule sur lui,
// ici comme dans private.blocks_schema_hash().
const schemaTexts = Object.fromEntries(
  VARIANTS.map((v) => [v, JSON.stringify(schemas[v])])
)
const hashInput = VARIANTS.map((v) => `${v}\n${schemaTexts[v]}\n`).join("")
const hash = createHash("sha256").update(hashInput, "utf8").digest("hex")

const generatedDir = repo("blocks/generated")
rmSync(generatedDir, { recursive: true, force: true })
mkdirSync(generatedDir, { recursive: true })
for (const v of VARIANTS) {
  writeFileSync(
    `${generatedDir}/${v}.schema.json`,
    `${JSON.stringify(schemas[v], null, 2)}\n`
  )
}
writeFileSync(`${generatedDir}/schema.sha256`, `${hash}\n`)

// ---------------------------------------------------------------------------------------------
// Validateurs Ajv autonomes
// ---------------------------------------------------------------------------------------------

const ajv = new Ajv({
  code: { esm: true, source: true },
  strict: true,
  // items en tableau + additionalItems (forme draft-07 d'un n-uplet ouvert : listItem).
  strictTuples: false,
})
// Mot-clé réservé aux types TypeScript, ignoré par la validation (et par pg_jsonschema).
ajv.addKeyword({ keyword: "tsType", schemaType: "string" })
for (const v of VARIANTS) ajv.addSchema(schemas[v], v)

const rawValidators = standaloneCode(ajv, {
  validateDraft: "draft",
  validateTemplate: "template",
  validateBlock: `${BASE_ID}draft.schema.json#/definitions/topBlock`,
})

const outDir = fileURLToPath(
  new URL("../src/blocks/generated/", import.meta.url)
)
rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const bundled = await build({
  stdin: {
    contents: rawValidators,
    resolveDir: webRoot,
    sourcefile: "validators.raw.mjs",
    loader: "js",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2020",
  write: false,
  legalComments: "none",
  banner: { js: `// ${BANNER}` },
})
const validatorsJs = bundled.outputFiles[0].text
// Les aides d'Ajv gardent leur propre code source dans une chaîne (« ucs2length.code =
// 'require(…)' »), qui ne s'exécute jamais : on l'écarte avant de chercher un vrai appel.
const executable = validatorsJs.replace(/\.code = '[^']*'/g, "")
for (const pattern of [
  /\brequire\s*\(/,
  /Dynamic require/,
  /new Function/,
  /\beval\s*\(/,
]) {
  if (pattern.test(executable)) {
    fail(
      `le validateur produit contient ${pattern} : il ne serait pas autonome.`
    )
  }
}
writeFileSync(`${outDir}validators.js`, validatorsJs)
writeFileSync(
  `${outDir}validators.d.ts`,
  `// ${BANNER}
import type { Draft, TemplateDraft, TopBlock } from "./blocks"

/** Une erreur d'Ajv : instancePath donne le chemin précis dans le document. */
export interface BlocksValidationError {
  instancePath: string
  schemaPath: string
  keyword: string
  params: Record<string, unknown>
  message?: string
}

/** Vrai si le document a la forme attendue ; sinon, errors décrit la première erreur. */
export interface BlocksValidator<T> {
  (data: unknown): data is T
  errors?: BlocksValidationError[] | null
}

/** Brouillon d'un contenu (variante « draft »). */
export declare const validateDraft: BlocksValidator<Draft>
/** Brouillon d'un modèle de blocs (variante « template » : pas de bloc lié). */
export declare const validateTemplate: BlocksValidator<TemplateDraft>
/** Un bloc de premier niveau d'un brouillon de contenu (l'app valide chaque bloc reçu). */
export declare const validateBlock: BlocksValidator<TopBlock>
`
)

// ---------------------------------------------------------------------------------------------
// Types TypeScript
// ---------------------------------------------------------------------------------------------

// La racine ne sert qu'à nommer les variantes ; unreachableDefinitions émet toutes les
// définitions (Draft, TemplateDraft, TextBlock…), avec leurs unions (tsType).
const typesSource = {
  $schema: source.$schema,
  title: "BlocksVariants",
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    VARIANTS.map((v) => [v, { $ref: `#/definitions/${v}` }])
  ),
  definitions: source.definitions,
}
const types = await compile(typesSource, "BlocksVariants", {
  bannerComment: `// ${BANNER}`,
  unreachableDefinitions: true,
  additionalProperties: false,
  ignoreMinAndMaxItems: true,
  format: false,
  strictIndexSignatures: true,
})
writeFileSync(`${outDir}blocks.ts`, types)

// ---------------------------------------------------------------------------------------------
// Mesures (tokens)
// ---------------------------------------------------------------------------------------------

const tokens = readJson(repo("blocks/blocks.tokens.json"))
delete tokens.$comment
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const unitless = (key) => /(LineHeight|Weight)$/.test(key)
const cssValue = (key, value) =>
  typeof value === "number" && !unitless(key) ? `${value}px` : String(value)
const cssVars = (object, prefix) =>
  Object.entries(object).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? cssVars(value, `${prefix}-${kebab(key)}`)
      : [`  ${prefix}-${kebab(key)}: ${cssValue(key, value)};`]
  )
const { color, ...sizes } = tokens
if (!color?.light || !color?.dark)
  fail("les couleurs light et dark sont requises.")
writeFileSync(
  `${outDir}tokens.css`,
  `/* ${BANNER} */
/* Aperçu des blocs dans l'admin : mêmes mesures que l'app (blocks/blocks.tokens.json). */
:root {
${cssVars(sizes, "--blocks").join("\n")}
${cssVars(color.light, "--blocks-color").join("\n")}
}

.dark {
${cssVars(color.dark, "--blocks-color").join("\n")}
}
`
)
writeFileSync(
  `${outDir}tokens.ts`,
  `// ${BANNER}
// Tailles en px (points dans l'app), hauteurs de ligne et graisses sans unité.
export const blocksTokens = ${JSON.stringify(tokens, null, 2)} as const
`
)

execFileSync(
  "npx",
  ["--no", "--", "prettier", "--write", "--log-level", "warn", outDir],
  { cwd: webRoot, stdio: "inherit" }
)

// ---------------------------------------------------------------------------------------------
// Cas partagés : vérifiés ici avec les validateurs produits, puis écrits pour pgTAP
// ---------------------------------------------------------------------------------------------

const casesDir = repo("blocks/cases")
const cases = readdirSync(casesDir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((file) => {
    const c = readJson(`${casesDir}/${file}`)
    const name = file.replace(/\.json$/, "")
    if (
      typeof c.description !== "string" ||
      !VARIANTS.includes(c.variant) ||
      typeof c.valid !== "boolean" ||
      !("data" in c)
    ) {
      fail(`cas ${file} : { description, variant, valid, data } attendus.`)
    }
    return { name, ...c }
  })

const validators = await import(
  `${pathToFileURL(`${outDir}validators.js`).href}?t=${Date.now()}`
)
const byVariant = {
  draft: validators.validateDraft,
  template: validators.validateTemplate,
}
const mismatches = cases.filter((c) => byVariant[c.variant](c.data) !== c.valid)
if (mismatches.length > 0) {
  fail(
    `ces cas ne donnent pas le résultat attendu : ${mismatches.map((c) => c.name).join(", ")}.`
  )
}

const sqlQuote = (s) => `'${s.replaceAll("'", "''")}'`
const DOLLAR = "$cas$"
const caseRows = cases.map((c) => {
  const json = JSON.stringify(c.data)
  if (json.includes(DOLLAR)) fail(`cas ${c.name} : contient ${DOLLAR}.`)
  return `  (${sqlQuote(c.name)}, ${sqlQuote(c.variant)}, ${c.valid}, ${sqlQuote(c.description)},\n    ${DOLLAR}${json}${DOLLAR})`
})
writeFileSync(
  repo("supabase/tests/aides/blocs-cas.inc"),
  `-- ${BANNER}
-- Les cas partagés de blocks/cases/*.json (mêmes cas que le contrôle de blocks:generate, avec
-- Ajv) dans la table temporaire blocks_cases. À inclure après « begin; » :
--     \\ir aides/blocs-cas.inc

create temporary table blocks_cases (
  name text primary key,
  variant text not null,
  valid boolean not null,
  description text not null,
  data jsonb not null
) on commit drop;

insert into blocks_cases (name, variant, valid, description, data) values
${caseRows.join(",\n")};

grant select on blocks_cases to public;
`
)

// ---------------------------------------------------------------------------------------------
// Migration, seulement si le schéma a changé
// ---------------------------------------------------------------------------------------------

const migrationFiles = readdirSync(MIGRATIONS)
  .filter((f) => /^\d{14}_.+\.sql$/.test(f))
  .sort()
let lastHash = null
for (const file of migrationFiles) {
  const text = readFileSync(`${MIGRATIONS}/${file}`, "utf8")
  const line = text.split("\n").find((l) => l.startsWith(HASH_MARKER))
  if (line) lastHash = line.slice(HASH_MARKER.length).trim()
}

if (lastHash === hash) {
  console.log(`blocks:generate : schéma inchangé (${hash.slice(0, 12)}…).`)
} else {
  const DQ = "$blocs$"
  for (const v of VARIANTS) {
    if (schemaTexts[v].includes(DQ)) fail(`le schéma contient ${DQ}.`)
  }
  const pad = (n) => String(n).padStart(2, "0")
  const stamp = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  const lastStamp = migrationFiles.at(-1)?.slice(0, 14) ?? "0"
  let version = stamp(new Date())
  if (version <= lastStamp) version = String(BigInt(lastStamp) + 1n)
  const file = `${version}_schema_blocs.sql`
  const whenClauses = VARIANTS.map(
    (v) => `    when ${sqlQuote(v)} then ${DQ}${schemaTexts[v]}${DQ}::json`
  ).join("\n")
  const hashParts = VARIANTS.map(
    (v) =>
      `${sqlQuote(v)} || E'\\n' || private.blocks_schema(${sqlQuote(v)})::text || E'\\n'`
  ).join("\n      || ")
  writeFileSync(
    `${MIGRATIONS}/${file}`,
    `-- ${BANNER}
-- Schéma des blocs (docs/ARCHITECTURE-CONTENUS.md, § 2.1), lu par le déclencheur du brouillon.
${HASH_MARKER}${hash}

-- Le schéma d'une variante (${VARIANTS.join(", ")}), tel que l'écrit blocks/generated/<variante>.schema.json.
create or replace function private.blocks_schema(variant text)
returns json
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select case variant
${whenClauses}
  end
$fn$;

-- Empreinte SHA-256 des variantes rangées ci-dessus, calculée sur leur texte : le job « Base de
-- données » la compare à blocks/generated/schema.sha256.
create or replace function private.blocks_schema_hash()
returns text
language sql
immutable
parallel safe
set search_path = ''
as $fn$
  select encode(
    sha256(convert_to(
      ${hashParts},
      'UTF8'
    )),
    'hex'
  )
$fn$;

revoke execute on function private.blocks_schema(text), private.blocks_schema_hash()
from public, anon, authenticated;
`
  )
  console.log(`blocks:generate : nouvelle migration ${file}.`)
}

console.log(
  `blocks:generate : ${cases.length} cas vérifiés, empreinte ${hash.slice(0, 12)}…`
)

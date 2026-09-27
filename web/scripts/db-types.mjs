// Régénère src/lib/database.types.ts depuis la base LOCALE (npm run db:start à la racine),
// puis le met en forme avec Prettier. À lancer après chaque migration : npm run db:types
// Les garde-fous (job « Base de données ») le relancent et refusent toute différence.

import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("../../", import.meta.url))
const webRoot = fileURLToPath(new URL("../", import.meta.url))
const target = "src/lib/database.types.ts"

// En CI, la CLI est installée par supabase/setup-cli ; en local, c'est celle du dépôt.
const [command, ...args] = process.env.CI
  ? ["supabase"]
  : ["npx", "--no", "supabase"]

const types = execFileSync(
  command,
  [...args, "gen", "types", "typescript", "--local"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    maxBuffer: 20 * 1024 * 1024,
  }
)
writeFileSync(new URL(`../${target}`, import.meta.url), types)
execFileSync("npx", ["--no", "--", "prettier", "--write", target], {
  cwd: webRoot,
  stdio: "inherit",
})

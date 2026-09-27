// Adresses et clés du Supabase LOCAL, lues avec « supabase status -o env ».
//
// Les tests de parcours créent et suppriment des comptes avec la clé secrète : ils refusent de
// tourner ailleurs que sur le Supabase local.

import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

export type LocalSupabase = {
  apiUrl: string
  publishableKey: string
  secretKey: string
  dbUrl: string
  mailpitUrl: string
}

// Variables transmises aux processus de Playwright (serveur, tests) une fois lues.
const envNames = {
  apiUrl: "E2E_SUPABASE_API_URL",
  publishableKey: "E2E_SUPABASE_PUBLISHABLE_KEY",
  secretKey: "E2E_SUPABASE_SECRET_KEY",
  dbUrl: "E2E_SUPABASE_DB_URL",
  mailpitUrl: "E2E_SUPABASE_MAILPIT_URL",
} as const satisfies Record<keyof LocalSupabase, string>

// Racine du dépôt : le dossier qui contient supabase/.
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url))

function readStatus(): Record<string, string> {
  // En CI, la CLI est installée par supabase/setup-cli ; en local, c'est celle du dépôt.
  const [command, ...args] = process.env.CI
    ? ["supabase"]
    : ["npx", "--no", "supabase"]
  let output: string
  try {
    output = execFileSync(command, [...args, "status", "-o", "env"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  } catch {
    throw new Error(
      "Supabase local introuvable. Lance-le d'abord à la racine : npm run db:start"
    )
  }
  const values: Record<string, string> = {}
  for (const line of output.split("\n")) {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line.trim())
    if (match) values[match[1]] = match[2]
  }
  return values
}

function assertLocal(name: string, url: string) {
  const { hostname } = new URL(url)
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(
      `${name} (${hostname}) n'est pas local : les tests de parcours ne tournent que sur le Supabase local.`
    )
  }
}

/** Lit la configuration du Supabase local (une seule fois, puis depuis l'environnement). */
export function localSupabase(): LocalSupabase {
  const fromEnv = Object.fromEntries(
    Object.entries(envNames).map(([key, name]) => [key, process.env[name]])
  ) as Partial<LocalSupabase>

  let config: LocalSupabase
  if (Object.values(fromEnv).every(Boolean)) {
    config = fromEnv as LocalSupabase
  } else {
    const status = readStatus()
    config = {
      apiUrl: status.API_URL,
      publishableKey: status.PUBLISHABLE_KEY,
      secretKey: status.SECRET_KEY,
      dbUrl: status.DB_URL,
      mailpitUrl: status.MAILPIT_URL,
    }
    for (const [key, value] of Object.entries(config)) {
      if (!value) {
        throw new Error(
          `« supabase status » ne donne pas ${key}. Supabase local est-il bien démarré ?`
        )
      }
    }
    // Les processus lancés ensuite par Playwright en héritent.
    for (const [key, name] of Object.entries(envNames)) {
      process.env[name] = config[key as keyof LocalSupabase]
    }
  }

  assertLocal("L'API Supabase", config.apiUrl)
  assertLocal("La base", config.dbUrl)
  assertLocal("Mailpit", config.mailpitUrl)
  return config
}

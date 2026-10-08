// Tests de parcours : un navigateur refait les parcours principaux de l'admin, contre le
// Supabase LOCAL (npm run db:start à la racine). Lancement : npm run test:e2e
//
// En local, la passerelle de Supabase répond elle-même aux requêtes CORS vers les fonctions
// (toutes origines acceptées) : les règles CORS de la fonction « equipe » ne sont testées que
// par supabase/functions/equipe/cors.test.ts (job « Fonctions serveur » des garde-fous).

import { defineConfig, devices } from "@playwright/test"

import { localSupabase } from "./e2e/support/local-supabase.ts"

const supabase = localSupabase()
const isCI = Boolean(process.env.CI)

// Serveur propre aux tests, distinct du serveur de dev (5173) : il est construit avec les
// clés du Supabase local, quelles que soient celles de web/.env.
const port = 4173
const baseURL = `http://127.0.0.1:${port}`
const outDir = "node_modules/.e2e/dist"

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Une seule base partagée : les tests passent l'un après l'autre.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx vite build --outDir ${outDir} --emptyOutDir && npx vite preview --outDir ${outDir} --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    // Jamais un serveur déjà lancé : il pourrait viser un autre Supabase.
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: supabase.apiUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      // Pas d'alerte Sentry pendant les tests.
      VITE_SENTRY_DSN: "",
      // Le contrôle des lectures non préparées (e2e/navigation.spec.ts).
      VITE_PREPARATION_CHECK: "1",
      // L'admin en français, comme les textes que lisent les parcours (texts/fr.ts).
      VITE_DEFAULT_LANGUAGE: "fr",
    },
  },
})

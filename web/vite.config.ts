import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { configDefaults } from "vitest/config"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Même adresse que site_url dans supabase/config.toml : les liens des e-mails
  // (invitation) et la session restent sur une seule origine.
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Les tests de parcours (e2e/) tournent avec Playwright, pas avec Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    // Valeurs fictives : les tests remplacent les appels à Supabase, rien ne part sur le réseau.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_tests",
    },
  },
})

import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  globalIgnores(["dist", "playwright-report", "test-results", "blob-report"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Tests de parcours (Playwright) : du code Node, pas des composants React.
    // « use » y est la fonction des fixtures de Playwright, pas le hook de React.
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Une fixture sans dépendance s'écrit « async ({}, use) => … ».
      "no-empty-pattern": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Les composants de shadcn/ui exportent aussi leurs variantes et leurs hooks.
    files: ["src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
])

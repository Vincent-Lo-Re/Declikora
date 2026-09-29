import js from "@eslint/js"
import { defineConfig, globalIgnores } from "eslint/config"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig([
  // src/blocks/generated : tiré de blocks/ par npm run blocks:generate (ne pas modifier).
  globalIgnores([
    "dist",
    "playwright-report",
    "test-results",
    "blob-report",
    "src/blocks/generated",
  ]),
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
    // Règles de l'interface (docs/BONNES-PRATIQUES.md, § 2). Les composants de shadcn/ui
    // (components/ui) gardent leur code d'origine. Une exception autorisée (valeur qui change en
    // direct : position d'un glisser-déposer, proportions d'un fichier) se marque sur sa ligne :
    // « eslint-disable-next-line no-restricted-syntax -- la raison ».
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name=/^([a-z]|Badge$|Button$)/] > JSXAttribute[name.name='title']",
          message:
            "Pas d'infobulle du navigateur (title) : le composant Tooltip (components/ui/tooltip).",
        },
        {
          selector: "JSXAttribute[name.name='style']",
          message:
            "Pas de style en ligne : une classe Tailwind, un jeton ou un utilitaire de index.css.",
        },
        {
          selector:
            "Literal[value=/(^|[\\s:])[a-z][a-z0-9-]*-\\[[^\\]]*\\d[^\\]]*\\]/]",
          message:
            "Pas de valeur arbitraire chiffrée (w-[390px]) : un jeton ou un utilitaire nommé dans index.css.",
        },
        {
          selector:
            "Literal[value=/(^|[\\s:])(bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\\d/]",
          message:
            "Pas de couleur de la palette Tailwind : un jeton du thème (text-warning, bg-status-live…).",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s:])[a-z][a-z0-9-]*-\\[[^\\]]*\\d[^\\]]*\\]/]",
          message:
            "Pas de valeur arbitraire chiffrée (w-[390px]) : un jeton ou un utilitaire nommé dans index.css.",
        },
        {
          selector:
            "TemplateElement[value.raw=/(^|[\\s:])(bg|text|border|ring|outline|fill|stroke|from|via|to|decoration|divide|shadow)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\\d/]",
          message:
            "Pas de couleur de la palette Tailwind : un jeton du thème (text-warning, bg-status-live…).",
        },
      ],
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

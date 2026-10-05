// Variables d'environnement lues par l'administration (voir .env.example).
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENVIRONMENT?: string
  // "1" : le contrôle des lectures non préparées est actif (parcours Playwright).
  readonly VITE_PREPARATION_CHECK?: string
}

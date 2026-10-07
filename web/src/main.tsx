import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { AuthProvider } from "@/auth/auth-provider"
import { AppProviders } from "@/components/app-providers"
import { startPreparation } from "@/lib/preparation"
import { adminBrandRead } from "@/lib/reads"
import { createQueryClient } from "@/lib/query-client"
import { initSentry } from "@/lib/sentry"
import { routes } from "@/routes"

const rootOptions = initSentry()
const queryClient = createQueryClient()
// Le contrôle des lectures non préparées : en développement et pendant les parcours Playwright
// (docs/BONNES-PRATIQUES.md, § 2).
const checked =
  import.meta.env.DEV || import.meta.env.VITE_PREPARATION_CHECK === "1"
startPreparation(queryClient, routes, {
  warmUp: true,
  warn: checked ? (message) => console.warn(message) : undefined,
})
// Le nom de la marque, lu tout de suite : le menu, la connexion et le titre de l'onglet l'attendent.
void queryClient.prefetchQuery(adminBrandRead())
const router = createBrowserRouter(routes)

createRoot(document.getElementById("root")!, rootOptions).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProviders>
  </StrictMode>
)

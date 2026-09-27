import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { AuthProvider } from "@/auth/auth-provider"
import { AppProviders } from "@/components/app-providers"
import { createQueryClient } from "@/lib/query-client"
import { initSentry } from "@/lib/sentry"
import { routes } from "@/routes"

const rootOptions = initSentry()
const router = createBrowserRouter(routes)
const queryClient = createQueryClient()

createRoot(document.getElementById("root")!, rootOptions).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProviders>
  </StrictMode>
)

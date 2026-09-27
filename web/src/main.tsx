import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter } from "react-router"
import { RouterProvider } from "react-router/dom"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { initSentry } from "@/lib/sentry"
import { routes } from "@/routes"

const rootOptions = initSentry()
const router = createBrowserRouter(routes)

createRoot(document.getElementById("root")!, rootOptions).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
)

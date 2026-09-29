import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

/** Ce dont toute l'admin a besoin : données, thème, infobulles, messages. */
export function AppProviders({
  queryClient,
  children,
}: {
  queryClient: QueryClient
  children: ReactNode
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          {children}
          {/*
            Au-dessus de la fenêtre des envois quand elle est ouverte (--upload-window-space,
            index.css). Sonner n'accepte cet écart qu'en réglage : --spacing × 6 = ses 24 px.
          */}
          <Toaster
            position="bottom-right"
            offset={{
              bottom: "calc(var(--spacing) * 6 + var(--upload-window-space))",
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

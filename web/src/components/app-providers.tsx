import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UPLOAD_WINDOW_SPACE } from "@/lib/media/constants"

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
          {/* Au-dessus de la fenêtre des envois quand elle est ouverte (24 px : écart de Sonner). */}
          <Toaster
            position="bottom-right"
            offset={{
              bottom: `calc(24px + var(${UPLOAD_WINDOW_SPACE}, 0px))`,
            }}
          />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

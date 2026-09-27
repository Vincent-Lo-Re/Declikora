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
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

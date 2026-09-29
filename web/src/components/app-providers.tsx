import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { LucideProvider } from "lucide-react"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

/** Ce dont toute l'admin a besoin : données, thème, icônes, infobulles, messages. */
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
        {/*
          Toutes les icônes Lucide : un trait d'un pixel à l'écran, quelle que soit leur taille
          (nonScalingStroke : le trait ne grossit ni ne s'affine avec l'icône).
        */}
        <LucideProvider strokeWidth={1} nonScalingStroke>
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
        </LucideProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

import { QueryClient } from "@tanstack/react-query"

/** Mémoire des données chargées (TanStack Query), commune à toute l'admin. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Les données restent fraîches 30 secondes, puis sont relues au besoin.
        staleTime: 30_000,
        retry: 1,
      },
    },
  })
}

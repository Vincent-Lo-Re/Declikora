import type { ReactNode } from "react"
import { useSearchParams } from "react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { previewFromSearch } from "@/lib/editor/preview"
import { texts } from "@/texts"

/** Des lignes grises, l'une sous l'autre. */
function Lines({ count, className }: { count: number; className: string }) {
  return Array.from({ length: count }, (_, index) => (
    <Skeleton key={index} className={className} />
  ))
}

/**
 * L'écran d'attente de l'éditeur, à sa forme (ADMIN § 7, « Une navigation sans à-coups ») : le
 * plan à gauche, le téléphone de l'adresse au centre, les cartes à droite, en lignes grises. Le
 * menu de l'admin reste caché, et le retour marche déjà.
 */
export function EditorSkeleton({ back }: { back: ReactNode }) {
  const [searchParams] = useSearchParams()
  const { device, theme } = previewFromSearch(searchParams)
  return (
    <div className="flex h-svh" aria-busy>
      <aside className="flex w-feed-column shrink-0 flex-col border-r bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
          {back}
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex-1 space-y-2 p-3">
          <Lines count={6} className="h-8 w-full" />
        </div>
        <div className="flex h-feed-footer shrink-0 items-center border-t px-4">
          <Skeleton className="h-9 w-full" />
        </div>
      </aside>
      <main
        aria-label={texts.editor.loading}
        className="flex min-w-0 flex-1 flex-col bg-dot-grid"
      >
        <div
          data-device={device}
          className="blocks-preview-layout min-h-0 flex-1 gap-x-4 px-3 py-4 wide:gap-x-9 wide:px-4"
        >
          <div className="blocks-preview-frame flex min-h-0 flex-col items-center">
            <div
              className="blocks-device"
              data-device={device}
              data-blocks-theme={theme}
            >
              <div className="blocks-screen">
                <div className="space-y-4 px-6 pt-16">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-40 w-full" />
                  <Lines count={4} className="h-4 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <aside className="flex w-feed-column shrink-0 flex-col border-l bg-background">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <Skeleton className="size-5" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 space-y-3 p-3">
          <Lines count={3} className="h-28 w-full rounded-xl" />
        </div>
        <div className="flex h-feed-footer shrink-0 items-center justify-end gap-2 border-t px-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </aside>
    </div>
  )
}

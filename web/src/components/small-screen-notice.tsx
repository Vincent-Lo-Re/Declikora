import { Monitor } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { texts } from "@/texts"

/** Affiché à la place de l'admin sur un écran de moins de 1 024 px de large. */
export function SmallScreenNotice() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6 lg:hidden">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Monitor />
          </EmptyMedia>
          <EmptyTitle>{texts.smallScreen.title}</EmptyTitle>
          <EmptyDescription>{texts.smallScreen.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}

import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { HelpFiche } from "@/help/types"
import { texts } from "@/texts"

const labels = texts.help

/** Une fiche d'aide, dans une glissière à droite (Sheet de shadcn) : on la lit sans quitter la page. */
export function HelpSheet({
  fiche,
  open,
  onOpenChange,
}: {
  // La dernière fiche ouverte : elle reste affichée le temps que la glissière se referme.
  fiche: HelpFiche | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {fiche && (
          <>
            <SheetHeader className="pr-12">
              <Badge variant="secondary">{labels.themes[fiche.theme]}</Badge>
              <SheetTitle>{fiche.title}</SheetTitle>
              <SheetDescription>{fiche.summary}</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6 text-sm">
              {fiche.steps && fiche.steps.length > 0 && (
                <section aria-labelledby="aide-etapes" className="space-y-2">
                  <h3 id="aide-etapes" className="font-medium">
                    {labels.steps}
                  </h3>
                  <ol className="list-decimal space-y-2 pl-5">
                    {fiche.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              )}
              {fiche.notes && fiche.notes.length > 0 && (
                <section aria-labelledby="aide-notes" className="space-y-2">
                  <h3 id="aide-notes" className="font-medium">
                    {labels.notes}
                  </h3>
                  <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                    {fiche.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

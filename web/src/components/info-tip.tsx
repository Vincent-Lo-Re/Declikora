import { Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Une icône Info : une précision qui ne prend pas de place, lue dans son infobulle (au survol
 * ou au clavier) ; les lecteurs d'écran la lisent comme nom du bouton.
 */
export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={text}
            className="text-muted-foreground"
          />
        }
      >
        <Info aria-hidden />
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}

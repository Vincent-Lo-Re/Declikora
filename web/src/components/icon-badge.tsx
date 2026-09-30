import type { LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Une pastille avec une icône seule, dont le sens est dans l'infobulle (et lu par les lecteurs
 * d'écran).
 */
export function IconBadge({
  icon: Icon,
  label,
  variant = "outline",
}: {
  icon: LucideIcon
  label: string
  variant?: "secondary" | "outline" | "destructive"
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Badge variant={variant} role="img" aria-label={label} />}
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

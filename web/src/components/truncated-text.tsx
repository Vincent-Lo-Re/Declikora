import { cn } from "cn"
import { useRef, useState } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Un titre sur une ligne, coupé par « … » s'il est trop long : il s'affiche alors en entier dans
 * une infobulle (jamais quand il tient en entier).
 */
export function TruncatedText({
  text,
  id,
  className,
}: {
  text: string
  id?: string
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [open, setOpen] = useState(false)
  const cut = () => {
    const element = ref.current
    return element !== null && element.scrollWidth > element.clientWidth
  }
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && cut())}>
      <TooltipTrigger
        render={
          <h2
            ref={ref}
            id={id}
            // Reçoit le focus quand la glissière du bloc se ferme.
            tabIndex={-1}
            className={cn("min-w-0 truncate", className)}
          />
        }
      >
        {text}
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

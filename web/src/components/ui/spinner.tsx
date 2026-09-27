import { cn } from "cn"
import { Loader2Icon } from "lucide-react"

import { texts } from "@/texts"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label={texts.common.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

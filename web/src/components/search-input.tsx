import { cn } from "cn"
import { Search, X } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { texts } from "@/texts"

/**
 * Un champ de recherche : la loupe, et notre bouton pour effacer (à la place de la croix du
 * navigateur, qui n'existe pas partout et ne suit pas le thème). Échap efface aussi.
 */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  autoFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  autoFocus?: boolean
  className?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const clear = () => {
    onChange("")
    input.current?.focus()
  }
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={input}
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Échap vide d'abord la recherche ; une fenêtre ne se ferme qu'au second appui.
          if (event.key === "Escape" && value !== "") {
            event.preventDefault()
            event.stopPropagation()
            clear()
          }
        }}
        placeholder={placeholder}
        aria-label={label}
        className="pr-8 pl-8 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value !== "" && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-1 size-6 -translate-y-1/2"
          aria-label={texts.common.clearSearch}
          onClick={clear}
        >
          <X />
        </Button>
      )}
    </div>
  )
}

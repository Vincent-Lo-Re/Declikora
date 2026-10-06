import { Search, X } from "lucide-react"
import { useRef } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { texts } from "@/texts"

/**
 * Un champ de recherche (l'`InputGroup` de shadcn) : la loupe, et notre bouton pour effacer (à la place de la croix du
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
    <InputGroup className={className}>
      <InputGroupInput
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
        className="[&::-webkit-search-cancel-button]:appearance-none"
      />
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      {value !== "" && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={texts.common.clearSearch}
            onClick={clear}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

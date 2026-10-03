import { cn } from "cn"
import { Plus } from "lucide-react"

/**
 * Éditeur du Fil : « Ajouter un bloc » (ou « Ajouter dans la section »), en pointillés, à la
 * largeur de ce qui l'entoure : dans le téléphone, le plan vide et le bas de la colonne de gauche.
 * Il ouvre l'onglet Blocs (ADMIN § 4).
 */
export function AddBlockButton({
  label,
  onClick,
  id,
  large = false,
  disabled = false,
  className,
}: {
  label: string
  onClick: () => void
  id?: string
  disabled?: boolean
  // Le téléphone vide : plus haut.
  large?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed font-sans text-sm font-medium text-muted-foreground outline-none enabled:hover:border-foreground/40 enabled:hover:bg-muted/40 enabled:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        large ? "py-5" : "py-2.5",
        className
      )}
      onClick={onClick}
    >
      <Plus aria-hidden className="size-4" />
      {label}
    </button>
  )
}

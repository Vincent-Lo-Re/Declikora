import { cn } from "cn"
import { Plus } from "lucide-react"
import type { ComponentProps, MouseEventHandler } from "react"

/**
 * Éditeur du Fil : « Ajouter un bloc » (ou « Ajouter dans la section »), en pointillés, à la
 * largeur de ce qui l'entoure : dans le téléphone, le plan vide et le bas de la colonne de gauche.
 * Il ouvre les Blocs (ADMIN § 4). La page d'une méthode s'en sert pour ajouter un chapitre, une
 * leçon ou un exercice.
 */
export function AddBlockButton({
  label,
  ariaLabel,
  onClick,
  id,
  large = false,
  disabled = false,
  className,
  ...rest
}: Omit<ComponentProps<"button">, "children" | "onClick"> & {
  label: string
  // Le nom complet, s'il en dit plus que le texte (« Nouvelle leçon dans le chapitre 1 … »).
  ariaLabel?: string
  // Absent quand un menu l'ouvre (les points de départ d'une partie de méthode) : le menu donne
  // alors le sien.
  onClick?: MouseEventHandler<HTMLButtonElement>
  id?: string
  disabled?: boolean
  // Le téléphone vide : plus haut.
  large?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      {...rest}
      id={id}
      aria-label={ariaLabel}
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

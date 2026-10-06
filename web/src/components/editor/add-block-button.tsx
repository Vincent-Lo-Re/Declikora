import { cn } from "cn"
import { Plus } from "lucide-react"
import type { ComponentProps, MouseEventHandler } from "react"

import { Button } from "@/components/ui/button"

/**
 * Éditeur du Fil : « Ajouter un bloc » (ou « Ajouter dans la section »), en pointillés, à la
 * largeur de ce qui l'entoure : dans le téléphone, le plan vide et le bas de la colonne de gauche.
 * Il ouvre les Blocs (ADMIN § 4).
 */
export function AddBlockButton({
  label,
  onClick,
  id,
  large = false,
  disabled = false,
  className,
  ...rest
}: Omit<ComponentProps<"button">, "children" | "onClick"> & {
  label: string
  onClick: MouseEventHandler<HTMLButtonElement>
  id?: string
  disabled?: boolean
  // Le téléphone vide : plus haut.
  large?: boolean
  className?: string
}) {
  return (
    // Le Button « contour » de shadcn, en pointillés (une place à remplir).
    <Button
      variant="outline"
      {...rest}
      id={id}
      disabled={disabled}
      className={cn(
        "w-full border-dashed font-sans",
        large && "h-auto py-5",
        className
      )}
      onClick={onClick}
    >
      <Plus aria-hidden />
      {label}
    </Button>
  )
}

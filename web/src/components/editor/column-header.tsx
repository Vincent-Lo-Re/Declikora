import { cn } from "cn"
import { X, type LucideIcon } from "lucide-react"
import type { ComponentType, ReactNode, SVGProps } from "react"

import { TruncatedText } from "@/components/truncated-text"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Éditeur du Fil : l'en-tête d'une colonne ou d'une glissière (Plan, Blocs, réglages du bloc,
 * Article), toujours de la même hauteur : le retour s'il y a lieu (sur toute sa hauteur, à
 * gauche), son icône, son titre (coupé par « … », en entier dans l'infobulle), puis ses actions et
 * « Fermer » (×) s'il y a lieu.
 */
export function ColumnHeader({
  icon: Icon,
  title,
  titleId,
  large = false,
  close,
  back,
  className,
  children,
}: {
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>
  title: string
  // Le titre reçoit le focus quand une glissière se ferme (colonne de droite).
  titleId?: string
  // La colonne de droite : le titre de l'article, en plus grand.
  large?: boolean
  close?: { label: string; onClick: () => void }
  // Le plan : la flèche de retour, avant l'icône (BackLink de l'éditeur).
  back?: ReactNode
  className?: string
  // Les actions, après le titre (« Choisir des blocs » du plan).
  children?: ReactNode
}) {
  return (
    <div className={cn("flex h-12 shrink-0 items-stretch border-b", className)}>
      {back}
      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <Icon
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground",
            large ? "size-5" : "size-4"
          )}
        />
        <TruncatedText
          id={titleId}
          text={title}
          className={cn(
            "flex-1 font-medium outline-none",
            large ? "text-base" : "text-sm"
          )}
        />
        {children}
        {close && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mr-1.5"
                  aria-label={close.label}
                  onClick={close.onClick}
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipContent>{close.label}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

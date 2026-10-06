import { useQuery } from "@tanstack/react-query"
import { Plus } from "lucide-react"

import { AddBlockButton } from "@/components/editor/add-block-button"
import { useMethodPage } from "@/components/methods/method-page-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { startersRead } from "@/lib/reads"
import { texts } from "@/texts"

type PartKind = "chapter" | "lesson" | "exercise"

/** Les points de départ d'une sorte de partie (vides tant qu'ils ne sont pas lus). */
function useStarters(kind: PartKind) {
  return useQuery(startersRead(kind)).data ?? []
}

/** « Chapitre vide », puis chaque point de départ de cette sorte. */
function StarterItems({
  kind,
  starters,
  onPick,
}: {
  kind: PartKind
  starters: readonly { id: string; title: string }[]
  onPick: (starterId: string | null) => void
}) {
  return (
    <>
      <DropdownMenuItem onClick={() => onPick(null)}>
        {texts.methods.create.blank[kind]}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {starters.map((starter) => (
        <DropdownMenuItem key={starter.id} onClick={() => onPick(starter.id)}>
          {starter.title.trim() || texts.templates.list.untitled}
        </DropdownMenuItem>
      ))}
    </>
  )
}

/**
 * « Nouveau chapitre », « Nouvelle leçon » ou « Nouvel exercice », dans le plan et dans le
 * téléphone : la partie est créée aussitôt (vide), ou, s'il existe des points de départ de cette
 * sorte, d'après celui qu'on choisit dans le menu ([D42]).
 */
export function NewPartButton({
  kind,
  parentId,
  label,
  ariaLabel,
  disabled = false,
  className,
}: {
  kind: PartKind
  parentId: string
  label: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
}) {
  const { createPart, creating } = useMethodPage()
  const starters = useStarters(kind)
  const button = (
    <AddBlockButton
      label={label}
      ariaLabel={ariaLabel}
      disabled={disabled || creating}
      className={className}
    />
  )
  if (starters.length === 0) {
    return (
      <AddBlockButton
        label={label}
        ariaLabel={ariaLabel}
        disabled={disabled || creating}
        className={className}
        onClick={() => createPart(kind, parentId, null)}
      />
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={button} />
      <DropdownMenuContent align="start" className="w-auto min-w-56">
        <StarterItems
          kind={kind}
          starters={starters}
          onPick={(starterId) => createPart(kind, parentId, starterId)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Dans un menu ⋯ du plan : « Nouvel exercice » d'une leçon (et ses points de départ, s'il y en a,
 * dans un sous-menu).
 */
export function NewPartMenuItem({
  kind,
  parentId,
  label,
}: {
  kind: PartKind
  parentId: string
  label: string
}) {
  const { createPart } = useMethodPage()
  const starters = useStarters(kind)
  if (starters.length === 0) {
    return (
      <DropdownMenuItem
        data-new-part={kind}
        onClick={() => createPart(kind, parentId, null)}
      >
        <Plus />
        {label}
      </DropdownMenuItem>
    )
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger data-new-part={kind}>
        <Plus />
        {label}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-56">
        <StarterItems
          kind={kind}
          starters={starters}
          onPick={(starterId) => createPart(kind, parentId, starterId)}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

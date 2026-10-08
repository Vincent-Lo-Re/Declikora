import { useQuery } from "@tanstack/react-query"
import { Unlink } from "lucide-react"
import { useState } from "react"

import { IconBadge } from "@/components/icon-badge"
import { useCategoryRemoval } from "@/components/categories/use-category-removal"
import { UsesBadgeButton, UsesDialog } from "@/components/uses-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/auth/auth-context"
import {
  categoryKeys,
  getCategoryUses,
  type Category,
  type CategoryUse,
} from "@/lib/categories"
import {
  removalOf,
  type Removal,
  type UseState,
} from "@/lib/contents/category-removal"
import { cn } from "cn"
import { texts } from "@/texts"

const labels = texts.categories
const words = labels.uses

// La pastille de l'état : un point de couleur pour ce que l'app montre, comme LiveBadge.
const stateDots: Record<UseState, string | null> = {
  draft: null,
  withdrawn: null,
  live: "bg-status-live",
  modified: "bg-status-modified",
  scheduled: "bg-status-new",
  writing: "bg-warning",
  trash: null,
}

/** Ce que dit l'infobulle de l'état : ce que « Retirer » fera, ou pourquoi il est indisponible. */
function tipOf(use: CategoryUse, removal: Removal, myId: string): string {
  const { state } = removal
  if (state === "writing")
    return use.writer?.id === myId
      ? words.tips.writingSelf
      : words.tips.writing(use.writer?.name ?? texts.editor.lock.someone)
  if (removal.notInDraft && state !== "trash") return words.tips.notInDraft
  return words.tips[state]
}

/** L'état d'un contenu, son sens dans l'infobulle. */
function StateBadge({ use, myId }: { use: CategoryUse; myId: string }) {
  const removal = removalOf(use)
  const dot = stateDots[removal.state]
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            tabIndex={0}
            variant="outline"
            data-use-state={removal.state}
          />
        }
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            dot ?? "bg-muted-foreground"
          )}
        />
        {words.states[removal.state]}
        <span className="sr-only">{` : ${tipOf(use, removal, myId)}`}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        {tipOf(use, removal, myId)}
      </TooltipContent>
    </Tooltip>
  )
}

/** « Retirer » sur une ligne ; grisé, il dit pourquoi dans son infobulle. */
function RemoveButton({
  use,
  myId,
  disabled,
  onRemove,
}: {
  use: CategoryUse
  myId: string
  disabled: boolean
  onRemove: () => void
}) {
  const removal = removalOf(use)
  const unavailable = removal.plan === null
  return (
    // Un bouton grisé ne reçoit pas la souris : l'infobulle se pose sur son contenant.
    <Tooltip disabled={!unavailable}>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Button
          variant="outline"
          size="sm"
          aria-label={words.removeFrom(
            use.title?.trim() || texts.common.untitled
          )}
          disabled={disabled || unavailable}
          onClick={onRemove}
        >
          <Unlink />
          {words.remove}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        {tipOf(use, removal, myId)}
      </TooltipContent>
    </Tooltip>
  )
}

/** La confirmation : combien de contenus perdent la catégorie, et ce qui arrive à chacun. */
function RemoveDialog({
  uses,
  pending,
  onCancel,
  onConfirm,
}: {
  uses: CategoryUse[] | null
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const count = (plan: Removal["plan"]) =>
    (uses ?? []).filter((use) => removalOf(use).plan === plan).length
  const lines = [
    count("draft") > 0 ? words.confirm.draft(count("draft")) : null,
    count("republish") > 0 ? words.confirm.republish(count("republish")) : null,
    count("draftOnly") > 0 ? words.confirm.draftOnly(count("draftOnly")) : null,
  ].filter((line): line is string => line !== null)
  return (
    <AlertDialog
      open={uses !== null}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel()
      }}
    >
      {uses && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {words.confirm.title(uses.length)}
            </AlertDialogTitle>
            <AlertDialogDescription className="flex flex-col gap-2">
              {lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {texts.common.cancel}
            </AlertDialogCancel>
            <Button disabled={pending} onClick={onConfirm}>
              {pending ? <Spinner /> : <Unlink />}
              {words.confirm.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}

/**
 * La pastille « État » d'une catégorie : un lien coupé si aucun brouillon ne la cite, sinon un
 * lien qui ouvre la liste des
 * contenus qui l'utilisent, avec l'état de chacun, son export, et « Retirer » (une ligne, ou les
 * lignes cochées), comme la pastille « Utilisé » d'un fichier de la Médiathèque.
 */
export function CategoryUsesButton({ category }: { category: Category }) {
  const [open, setOpen] = useState(false)
  const myId = useAuth().session?.user.id ?? ""
  const uses = useQuery({
    queryKey: categoryKeys.uses(category.id),
    queryFn: () => getCategoryUses(category.id),
    enabled: open,
  })
  const removal = useCategoryRemoval(category)
  const { selected, setSelected, confirming, setConfirming, remove } = removal
  // Les lignes cochées encore là (relues après un retrait) et qu'on peut retirer.
  const chosen = (uses.data ?? []).filter(
    (use) => selected.has(use.content_id) && removalOf(use).plan !== null
  )
  return (
    <>
      {/* Sans brouillon qui la cite, un lien coupé ; la fenêtre reste montée : elle ne disparaît
          pas quand on vient d'en retirer le dernier contenu. */}
      {category.uses > 0 ? (
        <UsesBadgeButton
          label={labels.uses.open(category.name)}
          tooltip={labels.usesCount(category.uses)}
          onClick={() => setOpen(true)}
        />
      ) : (
        <IconBadge icon={Unlink} label={labels.usesCount(0)} />
      )}
      <UsesDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setSelected(new Set())
        }}
        title={labels.uses.title}
        subject={category.name}
        query={uses}
        fileName={labels.uses.fileName(category.name)}
        failed={labels.loadFailed}
        empty={labels.usesCount(0)}
        status={{
          head: words.columns.status,
          cell: (use) => <StateBadge use={use} myId={myId} />,
        }}
        action={(use) => (
          <RemoveButton
            use={use}
            myId={myId}
            disabled={remove.isPending}
            onRemove={() => setConfirming([use])}
          />
        )}
        selection={{
          selected,
          onSelectedChange: setSelected,
          selectable: (use) => removalOf(use).plan !== null,
        }}
        footer={
          chosen.length > 0 && (
            <Button
              variant="outline"
              className="sm:mr-auto"
              disabled={remove.isPending}
              onClick={() => setConfirming(chosen)}
            >
              {remove.isPending ? <Spinner /> : <Unlink />}
              {words.removeMany(chosen.length)}
            </Button>
          )
        }
      />
      <RemoveDialog
        uses={confirming}
        pending={remove.isPending}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && remove.mutate(confirming)}
      />
    </>
  )
}

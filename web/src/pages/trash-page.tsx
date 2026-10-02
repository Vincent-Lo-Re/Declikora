import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Eraser,
  FileText,
  GalleryHorizontalEnd,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { SelectAllHead } from "@/components/bulk-selection"
import { LoadState } from "@/components/load-state"
import { kindIcons } from "@/components/media/media-kinds"
import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { formatDateTime } from "@/lib/dates"
import {
  emptyTrash,
  kickFiles,
  listTrash,
  mediaKeys,
  restoreTrashItem,
  trashKey,
  type TrashItem,
} from "@/lib/media/api"
import { isMediaKind } from "@/lib/media/constants"
import { contentEditorPath, sections } from "@/navigation"
import {
  filterTrash,
  groupTrash,
  trashFilters,
  trashTitle,
  trashTypeLabel,
  type TrashEntry,
  type TrashFilter,
} from "@/lib/trash"
import { texts } from "@/texts"

// Ce qui attend une confirmation : tout vider, effacer la sélection, ou un seul élément.
type Confirmation =
  | { scope: "all"; entries: TrashEntry[] }
  | { scope: "selection"; entries: TrashEntry[] }
  | { scope: "item"; entry: TrashEntry }

const keyOf = (item: TrashItem) => `${item.item_type}-${item.id}`

/**
 * Corbeille commune à toute l'admin : contenus et fichiers, filtre par type, restaurer (en
 * brouillon pour un contenu, [D18]), effacer un élément ou une sélection, vider. Ce qui est
 * effacé est toujours la liste affichée, jamais « tout ce qu'il y a » côté serveur.
 */
export function TrashPage() {
  const { title, description } = texts.sections.trash
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<TrashFilter>("all")
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const trash = useQuery({ queryKey: trashKey, queryFn: listTrash })
  useEffect(() => {
    if (trash.error) checkAccess(trash.error)
  }, [trash.error, checkAccess])

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
      queryClient.invalidateQueries({ queryKey: contentKeys.all }),
    ])

  const restore = useMutation({
    mutationFn: restoreTrashItem,
    onSuccess: ({ addressRemoved }, item) => {
      const name = trashTitle(item)
      // Un contenu restauré s'ouvre depuis le message (méthode, chapitre, leçon compris).
      const path =
        item.item_type === "content"
          ? contentEditorPath(item.kind, item.id)
          : null
      const action = path
        ? { label: texts.trash.open, onClick: () => void navigate(path) }
        : undefined
      if (addressRemoved) {
        toast.warning(texts.trash.restoredWithoutAddress(name), { action })
      } else {
        toast.success(texts.trash.restored(name), {
          description:
            item.item_type === "content"
              ? texts.trash.restoredDraft
              : undefined,
          action,
        })
      }
    },
    onError: (error) => {
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
      checkAccess(error)
    },
    onSettled: refresh,
  })

  const erase = useMutation({
    // Les têtes de lot suffisent : effacer une méthode efface ce qui est parti avec elle.
    mutationFn: (entries: TrashEntry[]) =>
      emptyTrash(
        entries.map(({ item }) => ({ type: item.item_type, id: item.id }))
      ),
    onSuccess: (count) => {
      toast.success(texts.trash.emptied(count))
      setSelected(new Set())
      // Effacement des fichiers tout de suite, sans attendre la tâche planifiée, mais sans
      // bloquer la fenêtre : la demande est enregistrée, la liste est relue une fois
      // l'effacement fait.
      void kickFiles().then(refresh)
    },
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: () => {
      setConfirmation(null)
      void refresh()
    },
  })

  const items = trash.data ?? []
  const entries = groupTrash(items)
  const filters = trashFilters(items)
  // Un filtre dont le dernier élément vient de partir revient à « Tout ».
  const activeFilter = filters.includes(filter) ? filter : "all"
  const shown = filterTrash(entries, activeFilter)
  const shownKeys = new Set(shown.map(({ item }) => keyOf(item)))
  const selection = shown.filter(({ item }) => selected.has(keyOf(item)))
  const busy = restore.isPending || erase.isPending

  const toggle = (item: TrashItem, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(keyOf(item))
      else next.delete(keyOf(item))
      return next
    })
  const allChecked = shown.length > 0 && selection.length === shown.length

  const confirm = () => {
    if (!confirmation) return
    erase.mutate(
      confirmation.scope === "item"
        ? [confirmation.entry]
        : confirmation.entries
    )
  }

  return (
    <>
      <PageHeader
        icon={sections.trash.icon}
        title={title}
        description={description}
        actions={
          <>
            {selection.length > 0 && (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() =>
                  setConfirmation({ scope: "selection", entries: selection })
                }
              >
                <Eraser />
                {texts.trash.eraseSelection(selection.length)}
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={entries.length === 0 || busy}
              onClick={() => setConfirmation({ scope: "all", entries })}
            >
              <Trash2 />
              {texts.trash.empty}
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="outline"
          aria-label={texts.trash.filters.label}
          value={[activeFilter]}
          onValueChange={(value: string[]) => {
            const next = filters.find((option) => option === value[0])
            if (next) setFilter(next)
          }}
        >
          {filters.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {option === "all" && <GalleryHorizontalEnd />}
              {texts.trash.filters[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {trash.data === undefined ? (
        <LoadState query={trash} failed={texts.trash.loadFailed} />
      ) : (
        <div className="space-y-4">
          {trash.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription className="flex flex-wrap items-center gap-x-2">
                {texts.trash.refreshFailed}
                <Button
                  variant="link"
                  className="h-auto p-0"
                  onClick={() => trash.refetch()}
                >
                  {texts.common.retry}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {entries.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Trash2 />
                </EmptyMedia>
                <EmptyTitle>{texts.trash.emptyState.title}</EmptyTitle>
                <EmptyDescription>
                  {texts.trash.emptyState.description}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {texts.trash.emptyFilter}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SelectAllHead
                    all={allChecked}
                    some={selection.length > 0 && !allChecked}
                    disabled={busy}
                    onToggleAll={(checked) =>
                      setSelected((current) => {
                        const next = new Set(
                          [...current].filter((key) => !shownKeys.has(key))
                        )
                        if (checked) {
                          for (const key of shownKeys) next.add(key)
                        }
                        return next
                      })
                    }
                  />
                  <TableHead>{texts.trash.columns.name}</TableHead>
                  <TableHead>{texts.trash.columns.type}</TableHead>
                  <TableHead>{texts.trash.columns.deletedAt}</TableHead>
                  <TableHead>{texts.trash.columns.purgeAt}</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">{texts.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((entry) => (
                  <TrashRow
                    key={keyOf(entry.item)}
                    entry={entry}
                    checked={selected.has(keyOf(entry.item))}
                    disabled={busy}
                    onCheck={(checked) => toggle(entry.item, checked)}
                    onRestore={() => restore.mutate(entry.item)}
                    onErase={() => setConfirmation({ scope: "item", entry })}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !erase.isPending) setConfirmation(null)
        }}
      >
        {confirmation && (
          <AlertDialogContent>
            <ConfirmationText confirmation={confirmation} />
            <AlertDialogFooter>
              <AlertDialogCancel disabled={erase.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={confirm}
                disabled={erase.isPending}
              >
                {erase.isPending && <Spinner />}
                {confirmation.scope === "all"
                  ? texts.trash.confirmEmpty.confirm
                  : confirmation.scope === "selection"
                    ? texts.trash.confirmSelection.confirm
                    : texts.trash.confirmErase.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

function ConfirmationText({ confirmation }: { confirmation: Confirmation }) {
  let title: string
  let description: string
  if (confirmation.scope === "all") {
    title = texts.trash.confirmEmpty.title
    description = texts.trash.confirmEmpty.description(
      confirmation.entries.length
    )
  } else if (confirmation.scope === "selection") {
    title = texts.trash.confirmSelection.title(confirmation.entries.length)
    description = texts.trash.confirmSelection.description(
      confirmation.entries.length
    )
  } else {
    title = texts.trash.confirmErase.title
    description = texts.trash.confirmErase.description(
      trashTitle(confirmation.entry.item)
    )
  }
  return (
    <AlertDialogHeader>
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>{description}</AlertDialogDescription>
    </AlertDialogHeader>
  )
}

function TrashRow({
  entry,
  checked,
  disabled,
  onCheck,
  onRestore,
  onErase,
}: {
  entry: TrashEntry
  checked: boolean
  disabled: boolean
  onCheck: (checked: boolean) => void
  onRestore: () => void
  onErase: () => void
}) {
  const { item, batch } = entry
  const name = trashTitle(item)
  const Icon =
    item.item_type === "file" && isMediaKind(item.kind)
      ? kindIcons[item.kind]
      : FileText
  return (
    <TableRow data-state={checked ? "selected" : undefined}>
      <TableCell>
        <Checkbox
          aria-label={texts.selection.select(name)}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(value) => onCheck(value)}
        />
      </TableCell>
      <TableCell className="max-w-80">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <Tooltip>
            <TooltipTrigger render={<span className="truncate font-medium" />}>
              {name}
            </TooltipTrigger>
            <TooltipContent>{name}</TooltipContent>
          </Tooltip>
          {item.parent_title && (
            <span className="truncate text-muted-foreground">
              ({item.parent_title})
            </span>
          )}
        </div>
        {batch.length > 0 && (
          <Tooltip>
            <TooltipTrigger
              render={
                <p className="truncate pl-6 text-xs text-muted-foreground" />
              }
            >
              {texts.trash.batch(batch.length)}
            </TooltipTrigger>
            <TooltipContent>
              {texts.trash.batchList(batch.map(trashTitle).join(", "))}
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell>{trashTypeLabel(item)}</TableCell>
      <TableCell>
        <div>{formatDateTime(item.deleted_at)}</div>
        {item.deleted_by_name && (
          <div className="text-muted-foreground">
            {texts.trash.deletedBy(item.deleted_by_name)}
          </div>
        )}
      </TableCell>
      <TableCell>
        {item.purge_error ? (
          <div className="max-w-72 space-y-1 whitespace-normal">
            <Badge variant="destructive">
              <TriangleAlert />
              {texts.trash.purgeRefused}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {texts.trash.purgeRefusedHint}
            </p>
          </div>
        ) : (
          texts.trash.purgeOn(formatDateTime(item.purge_at))
        )}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={texts.trash.restoreItem(name)}
            onClick={onRestore}
          >
            <RotateCcw />
            {texts.trash.restore}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  disabled={disabled}
                  aria-label={texts.trash.eraseItem(name)}
                  onClick={onErase}
                />
              }
            >
              <Eraser />
            </TooltipTrigger>
            <TooltipContent>{texts.trash.erase}</TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  )
}

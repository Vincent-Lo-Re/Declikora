import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Eraser, RotateCcw, Trash2, TriangleAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
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
import { texts } from "@/texts"

// Filtre par type : « Fichiers » à l'étape 3 ; les contenus arriveront à l'étape 5.
type Filter = "all" | "file"
const filterItems: Filter[] = ["all", "file"]

// Ce qui attend une confirmation : tout vider, ou effacer un seul élément.
type Confirmation = { scope: "all" } | { scope: "item"; item: TrashItem }

/** Type d'un élément : « Fichier · Image ». */
function typeLabel(item: TrashItem): string {
  const type = texts.trash.itemTypes[item.item_type]
  if (item.item_type === "file" && isMediaKind(item.kind)) {
    return `${type} · ${texts.media.kinds[item.kind]}`
  }
  return type
}

/** Corbeille commune à toute l'admin : restaurer, effacer, vider. */
export function TrashPage() {
  const { title, description } = texts.sections.trash
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [filter, setFilter] = useState<Filter>("all")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const trash = useQuery({ queryKey: trashKey, queryFn: listTrash })
  useEffect(() => {
    if (trash.error) checkAccess(trash.error)
  }, [trash.error, checkAccess])

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: mediaKeys.all }),
    ])

  const restore = useMutation({
    mutationFn: restoreTrashItem,
    onSuccess: (_, item) => toast.success(texts.trash.restored(item.title)),
    onError: (error) => {
      toast.error(error.message)
      checkAccess(error)
    },
    onSettled: refresh,
  })

  const erase = useMutation({
    // Toujours la liste des éléments affichés (et confirmés), jamais « tout ce qu'il y a » :
    // un élément mis à la corbeille entre-temps par quelqu'un d'autre n'est pas effacé sans
    // avoir été vu.
    mutationFn: (items: TrashItem[]) =>
      emptyTrash(items.map((item) => ({ type: item.item_type, id: item.id }))),
    onSuccess: (count) => {
      toast.success(texts.trash.emptied(count))
      // Effacement tout de suite, sans attendre la tâche planifiée, mais sans bloquer la
      // fenêtre : la demande est enregistrée, la place occupée est relue une fois l'effacement
      // fait.
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

  const all = trash.data ?? []
  const shown =
    filter === "all" ? all : all.filter((item) => item.item_type === filter)
  const busy = restore.isPending || erase.isPending

  const confirm = () => {
    if (!confirmation) return
    // « Vider » efface exactement ce que montre la liste (et que la confirmation annonce).
    erase.mutate(confirmation.scope === "item" ? [confirmation.item] : shown)
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            variant="destructive"
            disabled={shown.length === 0 || busy}
            onClick={() => setConfirmation({ scope: "all" })}
          >
            <Eraser />
            {texts.trash.empty}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          variant="outline"
          aria-label={texts.trash.filters.label}
          value={[filter]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next === "all" || next === "file") setFilter(next)
          }}
        >
          {filterItems.map((item) => (
            <ToggleGroupItem key={item} value={item}>
              {texts.trash.filters[item]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">{texts.trash.retention}</p>
      </div>

      {trash.data === undefined ? (
        trash.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {texts.trash.loadFailed} {trash.error.message}
            </p>
            <Button variant="outline" onClick={() => trash.refetch()}>
              {texts.trash.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )
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
                  {texts.trash.retry}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {all.length === 0 ? (
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
                  <TableHead>{texts.trash.columns.name}</TableHead>
                  <TableHead>{texts.trash.columns.type}</TableHead>
                  <TableHead>{texts.trash.columns.deletedAt}</TableHead>
                  <TableHead>{texts.trash.columns.purgeAt}</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">
                      {texts.trash.columns.actions}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((item) => (
                  <TrashRow
                    key={`${item.item_type}-${item.id}`}
                    item={item}
                    disabled={busy}
                    onRestore={() => restore.mutate(item)}
                    onErase={() => setConfirmation({ scope: "item", item })}
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
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmation.scope === "all"
                  ? texts.trash.confirmEmpty.title
                  : texts.trash.confirmErase.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation.scope === "all"
                  ? texts.trash.confirmEmpty.description(shown.length)
                  : texts.trash.confirmErase.description(
                      confirmation.item.title
                    )}
              </AlertDialogDescription>
            </AlertDialogHeader>
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
                  : texts.trash.confirmErase.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

function TrashRow({
  item,
  disabled,
  onRestore,
  onErase,
}: {
  item: TrashItem
  disabled: boolean
  onRestore: () => void
  onErase: () => void
}) {
  const Icon =
    item.item_type === "file" && isMediaKind(item.kind)
      ? kindIcons[item.kind]
      : Trash2
  return (
    <TableRow>
      <TableCell className="max-w-80">
        <div className="flex items-center gap-2">
          <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium" title={item.title}>
            {item.title}
          </span>
          {item.parent_title && (
            <span className="truncate text-muted-foreground">
              ({item.parent_title})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>{typeLabel(item)}</TableCell>
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
            aria-label={texts.trash.restoreItem(item.title)}
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
                  aria-label={texts.trash.eraseItem(item.title)}
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

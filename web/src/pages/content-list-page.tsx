import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  FilePlus2,
  FileText,
  SquarePen,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { LiveBadge, ScheduleBadge } from "@/components/editor/publication"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import {
  ContentError,
  contentKeys,
  createContent,
  listContents,
  type ContentKind,
  type ContentListItem,
} from "@/lib/contents/api"
import {
  publicationStatus,
  restoreContent,
  trashContent,
} from "@/lib/contents/publication"
import { formatDateTime } from "@/lib/dates"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import { editorPath, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.contentList

/**
 * Liste des contenus d'une section : créer, ouvrir dans l'éditeur, état de publication de
 * chacun (brouillon, en ligne, modifié, programmé, échec), mettre à la corbeille. L'étape 7 la
 * complétera (catégories, filtres…).
 */
export function ContentListPage({
  section,
  kind,
}: {
  section: SectionKey
  kind: ContentKind
}) {
  const { title, description } = texts.sections[section]
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const list = useQuery({
    queryKey: contentKeys.list(kind),
    queryFn: () => listContents(kind),
    // Qui écrit quoi, et les publications programmées : relu toutes les 30 secondes.
    refetchInterval: 30_000,
  })
  const [toTrash, setToTrash] = useState<ContentListItem | null>(null)

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: contentKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: [...mediaKeys.all, "uses"] }),
    ])

  // « Annuler » dans le message : la page revient en brouillon, sans être republiée.
  const undo = async (item: ContentListItem) => {
    const name = item.title.trim() || labels.untitled
    try {
      const { addressRemoved } = await restoreContent(item.id)
      if (addressRemoved)
        toast.warning(texts.trash.restoredWithoutAddress(name))
      else toast.success(labels.restored(name))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : texts.common.unexpected
      )
    } finally {
      await refresh()
    }
  }

  const trash = useMutation({
    mutationFn: (item: ContentListItem) => trashContent(item.id),
    onSuccess: (result, item) => {
      setToTrash(null)
      toast.success(labels.trashed(item.title.trim() || labels.untitled), {
        action: { label: labels.undo, onClick: () => void undo(item) },
      })
      // Ses fichiers redeviennent peut-être protégés : tout de suite.
      if (result.needsFileSync) void kickFiles()
    },
    onError: (error) => {
      setToTrash(null)
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
  useEffect(() => {
    if (list.error) checkAccess(list.error)
  }, [list.error, checkAccess])

  const create = useMutation({
    mutationFn: () => createContent(kind),
    onSuccess: (content) => {
      queryClient.setQueryData(contentKeys.detail(content.id), content)
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) })
      void navigate(editorPath(section, content.id))
    },
    onError: (error) => {
      checkAccess(error)
      toast.error(`${labels.createFailed} ${error.message}`)
    },
  })

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            {create.isPending ? <Spinner /> : <FilePlus2 />}
            {labels.create}
          </Button>
        }
      />

      {list.data === undefined ? (
        list.isError ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {labels.loadFailed} {list.error.message}
            </p>
            <Button variant="outline" onClick={() => list.refetch()}>
              {labels.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {list.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{labels.refreshFailed}</AlertDescription>
            </Alert>
          )}
          {list.data.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>{labels.empty.title}</EmptyTitle>
                <EmptyDescription>{labels.empty.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.columns.title}</TableHead>
                  <TableHead>{labels.columns.publication}</TableHead>
                  <TableHead>{labels.columns.savedAt}</TableHead>
                  <TableHead>{labels.columns.status}</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">{labels.columns.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={editorPath(section, item.id)}
                        className="underline-offset-4 hover:underline"
                      >
                        {item.title.trim() || labels.untitled}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PublicationCell item={item} now={list.dataUpdatedAt} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(item.draft_saved_at)}
                      {item.saved_by_name && (
                        <> {labels.savedBy(item.saved_by_name)}</>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.editing_name && (
                        <Badge variant="secondary">
                          {labels.beingEdited(item.editing_name)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        title={item.title.trim() || labels.untitled}
                        editPath={editorPath(section, item.id)}
                        disabled={trash.isPending}
                        onTrash={() => setToTrash(item)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <AlertDialog
        open={toTrash !== null}
        onOpenChange={(open) => {
          if (!open && !trash.isPending) setToTrash(null)
        }}
      >
        {toTrash && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.confirmTrash.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.confirmTrash.description(
                  toTrash.title.trim() || labels.untitled
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={trash.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={trash.isPending}
                onClick={() => trash.mutate(toTrash)}
              >
                {trash.isPending ? <Spinner /> : <Trash2 />}
                {labels.confirmTrash.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

/** État de publication d'une ligne : en ligne ou non, modifié, programmation. */
function PublicationCell({
  item,
  now,
}: {
  item: ContentListItem
  now: number
}) {
  const status = publicationStatus(
    {
      live:
        item.live_draft_rev === null
          ? null
          : { draft_rev: item.live_draft_rev },
      first_published_at: item.first_published_at,
      scheduled_at: item.scheduled_at,
      schedule_error: item.schedule_error,
    },
    item.draft_rev,
    now
  )
  return (
    <div className="flex flex-wrap gap-1.5">
      <LiveBadge live={status.live} />
      <ScheduleBadge schedule={status.schedule} />
    </div>
  )
}

function RowActions({
  title,
  editPath,
  disabled,
  onTrash,
}: {
  title: string
  editPath: string
  disabled: boolean
  onTrash: () => void
}) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={labels.actions(title)}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => void navigate(editPath)}>
          <SquarePen />
          {labels.open}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onTrash}>
          <Trash2 />
          {labels.trash}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

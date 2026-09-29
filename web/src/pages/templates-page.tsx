import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  LayoutTemplate,
  Plus,
  SquarePen,
  Trash2,
  TriangleAlert,
  Unlink,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TemplateDialog } from "@/components/templates/template-dialog"
import { UsesList } from "@/components/templates/uses-list"
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
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { restoreContent, trashContent } from "@/lib/contents/publication"
import {
  createTemplate,
  detachTemplateEverywhere,
  listTemplates,
  listTemplateUses,
  templateKeys,
  templateSorts,
  type NewTemplate,
  type TemplateItem,
  type TemplateSort,
} from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import { editorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.templates.list

function nameOf(item: { title: string }) {
  return item.title.trim() || labels.untitled
}

/**
 * La section Modèles : les modèles rangés par sorte (ADMIN § 5), « Nouveau modèle » (nom,
 * sorte, section d'un point de départ), ouvrir, supprimer (corbeille ; un bloc identique partout
 * utilisé montre ses brouillons et « Détacher partout »).
 */
export function TemplatesPage() {
  const { title, description } = texts.sections.templates
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [creating, setCreating] = useState(false)
  const [toTrash, setToTrash] = useState<TemplateItem | null>(null)

  const list = useQuery({
    queryKey: templateKeys.list,
    queryFn: listTemplates,
    // Qui modifie quoi : relu toutes les 30 secondes.
    refetchInterval: 30_000,
  })
  const uses = useQuery({
    queryKey: templateKeys.uses,
    queryFn: () => listTemplateUses(),
    refetchInterval: 30_000,
  })
  useEffect(() => {
    if (list.error) checkAccess(list.error)
  }, [list.error, checkAccess])

  // Nombre de brouillons (corbeille comprise) qui citent chaque modèle.
  const useCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const use of uses.data ?? []) {
      for (const id of use.templateIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
    return counts
  }, [uses.data])

  const create = useMutation({
    mutationFn: (template: NewTemplate) => createTemplate(template),
    onSuccess: (content) => {
      queryClient.setQueryData(contentKeys.detail(content.id), content)
      void queryClient.invalidateQueries({ queryKey: templateKeys.all })
      setCreating(false)
      void navigate(editorPath("templates", content.id))
    },
    onError: (error) => checkAccess(error),
  })

  const bySort = (sort: TemplateSort) =>
    (list.data ?? []).filter((item) => item.sort === sort)

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            {labels.create}
          </Button>
        }
      />

      {list.data === undefined ? (
        <LoadState
          query={list}
          failed={labels.loadFailed}
          rows={3}
          rowClassName="h-12 w-full"
        />
      ) : list.data.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutTemplate />
            </EmptyMedia>
            <EmptyTitle>{labels.empty.title}</EmptyTitle>
            <EmptyDescription>{labels.empty.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-10">
          {list.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{labels.refreshFailed}</AlertDescription>
            </Alert>
          )}
          {templateSorts.map((sort) => (
            <SortSection
              key={sort}
              sort={sort}
              items={bySort(sort)}
              useCount={uses.data ? useCount : null}
              onTrash={setToTrash}
            />
          ))}
        </div>
      )}

      <TemplateDialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open)
          if (!open) create.reset()
        }}
        title={texts.templates.create.title}
        description={texts.templates.create.description}
        submitLabel={texts.templates.create.submit}
        defaultSection="page"
        pending={create.isPending}
        error={
          create.error ? `${labels.createFailed} ${create.error.message}` : null
        }
        onSubmit={(values) =>
          create.mutate({
            name: values.name,
            sort: values.sort,
            templateFor: values.templateFor,
          })
        }
      />

      {toTrash && (
        <TrashTemplateDialog
          template={toTrash}
          onClose={() => setToTrash(null)}
        />
      )}
    </>
  )
}

/** Les modèles d'une sorte, avec sa présentation. */
function SortSection({
  sort,
  items,
  useCount,
  onTrash,
}: {
  sort: TemplateSort
  items: TemplateItem[]
  // null tant que les brouillons qui citent les modèles ne sont pas lus.
  useCount: Map<string, number> | null
  onTrash: (item: TemplateItem) => void
}) {
  const sortTexts = texts.templates.sorts[sort]
  const headingId = `modeles-${sort}`
  return (
    <section aria-labelledby={headingId} data-template-sort={sort}>
      <div className="mb-3 space-y-1">
        <h2 id={headingId} className="text-lg font-semibold">
          {sortTexts.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {sortTexts.description} {sortTexts.example}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {labels.emptySort}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.columns.name}</TableHead>
              {sort === "shared" && (
                <TableHead>{labels.columns.uses}</TableHead>
              )}
              {sort === "starter" && (
                <TableHead>{labels.columns.section}</TableHead>
              )}
              <TableHead>{labels.columns.savedAt}</TableHead>
              <TableHead>{labels.columns.status}</TableHead>
              <TableHead className="w-0">
                <span className="sr-only">{texts.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} data-template={item.id}>
                <TableCell className="font-medium">
                  <Link
                    to={editorPath("templates", item.id)}
                    className="underline-offset-4 hover:underline"
                  >
                    {nameOf(item)}
                  </Link>
                </TableCell>
                {sort === "shared" && (
                  <TableCell className="text-muted-foreground">
                    {useCount
                      ? labels.uses(useCount.get(item.id) ?? 0)
                      : labels.usesLoading}
                  </TableCell>
                )}
                {sort === "starter" && (
                  <TableCell>
                    {item.templateFor
                      ? texts.templates.sections[item.templateFor]
                      : null}
                  </TableCell>
                )}
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
                  <RowActions item={item} onTrash={() => onTrash(item)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

function RowActions({
  item,
  onTrash,
}: {
  item: TemplateItem
  onTrash: () => void
}) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.actions(nameOf(item))}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          onClick={() => void navigate(editorPath("templates", item.id))}
        >
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

/**
 * Supprimer un modèle : il part à la corbeille. Un bloc identique partout encore utilisé ne le
 * peut pas (ADMIN § 5) : la fenêtre montre ses brouillons et propose « Détacher partout ».
 */
function TrashTemplateDialog({
  template,
  onClose,
}: {
  template: TemplateItem
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const name = nameOf(template)
  const shared = template.sort === "shared"

  const uses = useQuery({
    queryKey: templateKeys.usesOf(template.id),
    queryFn: () => listTemplateUses([template.id]),
    enabled: shared,
    // Toujours relue à l'ouverture : un brouillon a pu l'insérer entre-temps.
    staleTime: 0,
  })
  const blocking = shared ? (uses.data ?? null) : []

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: contentKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: [...mediaKeys.all, "uses"] }),
    ])

  const undo = async () => {
    try {
      await restoreContent(template.id)
      toast.success(labels.restored(name))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      await refresh()
    }
  }

  const detach = useMutation({
    mutationFn: () => detachTemplateEverywhere(template.id),
    onSuccess: (count) => toast.success(labels.used.detached(count)),
    onError: (error) => {
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
      checkAccess(error)
    },
    onSettled: () =>
      Promise.all([
        refresh(),
        queryClient.invalidateQueries({
          queryKey: templateKeys.usesOf(template.id),
        }),
      ]),
  })

  const trash = useMutation({
    mutationFn: () => trashContent(template.id),
    onSuccess: (result) => {
      onClose()
      toast.success(labels.trashed(name), {
        action: { label: labels.undo, onClick: () => void undo() },
      })
      if (result.needsFileSync) void kickFiles()
    },
    onError: (error) => {
      // Inséré entre-temps : la liste des brouillons est relue.
      if (error instanceof ContentError && error.code === "modele_utilise") {
        void queryClient.invalidateQueries({
          queryKey: templateKeys.usesOf(template.id),
        })
      } else {
        onClose()
      }
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

  const busy = detach.isPending || trash.isPending
  const used = blocking !== null && blocking.length > 0

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {used ? labels.used.title : labels.confirmTrash.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {used
              ? labels.used.description
              : labels.confirmTrash.description(name)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {shared && uses.isError && (
          <p role="alert" className="text-sm text-destructive">
            {labels.used.checkFailed}
          </p>
        )}
        {shared && uses.isPending && (
          <p className="text-sm text-muted-foreground">{labels.usesLoading}</p>
        )}
        {used && <UsesList uses={blocking} />}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {texts.common.cancel}
          </AlertDialogCancel>
          {used ? (
            <Button disabled={busy} onClick={() => detach.mutate()}>
              {detach.isPending ? <Spinner /> : <Unlink />}
              {labels.used.detachAll}
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={busy || blocking === null}
              onClick={() => trash.mutate()}
            >
              {trash.isPending ? <Spinner /> : <Trash2 />}
              {labels.confirmTrash.confirm}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

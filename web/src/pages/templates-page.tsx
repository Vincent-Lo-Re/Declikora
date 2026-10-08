import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  Layers,
  LayoutTemplate,
  type LucideIcon,
  Plus,
  SquarePen,
  Trash2,
  TriangleAlert,
  Unlink,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import {
  BulkTrashButton,
  KeptNotice,
  SelectAllHead,
  type SelectAll,
} from "@/components/bulk-selection"
import { ListCard, ListEmpty } from "@/components/list-card"
import { SavedCell } from "@/components/contents/row-cells"
import { useContentsSelection } from "@/components/contents/use-contents-selection"
import { LoadState } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TemplateDialog } from "@/components/templates/template-dialog"
import { templateSortIcons } from "@/components/templates/sort-icons"
import { TemplateStatus } from "@/components/templates/template-uses"
import { UsesList } from "@/components/templates/uses-list"
import { TrashDialog } from "@/components/trash-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAddressState } from "@/hooks/use-address-state"
import { templateTabFromAddress, writeTemplateTab } from "@/lib/address"
import { ContentError, contentKeys } from "@/lib/contents/api"
import { restoreContent, trashContent } from "@/lib/contents/publication"
import {
  createTemplate,
  detachTemplateEverywhere,
  listTemplateUses,
  templateKeys,
  templateSorts,
  templateUsage,
  type NewTemplate,
  type TemplateItem,
  type TemplateSort,
} from "@/lib/contents/templates"
import { errorMessage } from "@/lib/errors"
import { kickFiles } from "@/lib/media/api"
import { templateListRead } from "@/lib/reads"
import { refreshAfterContentTrash } from "@/lib/refresh"
import { editorPath, sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.templates.list

// Les onglets : « Tous les blocs », une sorte de modèle par onglet, puis « Non utilisés ».
const ALL = "all"
const UNUSED = "unused"
type TemplateTab = typeof ALL | TemplateSort | typeof UNUSED
const tabs: TemplateTab[] = [ALL, ...templateSorts, UNUSED]
const tabIcons: Record<TemplateTab, LucideIcon> = {
  all: Layers, // comme Modèles de bloc dans le menu
  ...templateSortIcons,
  unused: Unlink, // comme « Non utilisés » de la Médiathèque
}

function nameOf(item: { title: string }) {
  return item.title.trim() || labels.untitled
}

/**
 * La section Modèles : les modèles rangés par sorte (ADMIN § 5), « Nouveau modèle » (nom,
 * sorte, section d'un point de départ), ouvrir, supprimer (corbeille ; un bloc identique partout
 * utilisé montre ses brouillons et « Détacher partout »), et sélection en masse vers la corbeille
 * (un bloc identique partout encore utilisé est gardé).
 */
export function TemplatesPage() {
  const { title, description } = texts.sections.templates
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const [creating, setCreating] = useState(false)
  const [toTrash, setToTrash] = useState<TemplateItem | null>(null)

  const list = useQuery({
    ...templateListRead(),
    refetchInterval: 30_000,
  })
  useEffect(() => {
    if (list.error) checkAccess(list.error)
  }, [list.error, checkAccess])

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

  // L'onglet ouvert : « Tous les blocs », ou une sorte de modèle.
  // Gardé dans l'adresse : on retrouve l'onglet en revenant d'un modèle.
  const [tab, setTab] = useAddressState(
    templateTabFromAddress,
    writeTemplateTab
  )
  // Le nombre d'endroits où chaque modèle sert : colonne « État » et onglet « Non utilisés ».
  const usage = useQuery({
    queryKey: templateKeys.usage,
    queryFn: templateUsage,
  })
  const usesOf = (item: TemplateItem) => usage.data?.get(item.id) ?? 0
  const shown = useMemo(
    () =>
      (list.data ?? []).filter((item) =>
        tab === ALL
          ? true
          : tab === UNUSED
            ? usage.data !== undefined && !usage.data.has(item.id)
            : item.sort === tab
      ),
    [list.data, tab, usage.data]
  )

  // Sélection en masse ; un bloc identique partout encore utilisé est gardé et listé.
  const bulk = useContentsSelection({
    shown,
    words: labels,
    nameOf,
  })
  const { selection } = bulk

  return (
    <>
      <PageHeader
        icon={sections.templates.icon}
        title={title}
        description={description}
        actions={
          <>
            <BulkTrashButton
              count={selection.items.length}
              pending={bulk.pending}
              onClick={bulk.askConfirm}
            />
            <Button onClick={() => setCreating(true)}>
              <Plus />
              {labels.create}
            </Button>
          </>
        }
      />

      {list.data === undefined ? (
        <ListCard>
          <LoadState
            query={list}
            failed={labels.loadFailed}
            rows={3}
            rowClassName="h-12 w-full"
          />
        </ListCard>
      ) : list.data.length === 0 ? (
        <ListEmpty
          icon={LayoutTemplate}
          title={labels.empty.title}
          description={labels.empty.description}
        />
      ) : (
        <div className="space-y-4">
          {list.isError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertDescription>{labels.refreshFailed}</AlertDescription>
            </Alert>
          )}
          <KeptNotice
            kept={bulk.kept}
            nameOf={nameOf}
            words={labels}
            onClose={bulk.closeKept}
          />
          <Tabs
            value={tab}
            onValueChange={(value: TemplateTab) => setTab(value)}
          >
            <TabsList aria-label={labels.tabs.label}>
              {tabs.map((value) => {
                const Icon = tabIcons[value]
                return (
                  <TabsTrigger key={value} value={value}>
                    <Icon />
                    {value === ALL || value === UNUSED
                      ? labels.tabs[value]
                      : texts.templates.sorts[value].tab}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {tabs.map((value) => (
              <TabsContent
                key={value}
                value={value}
                className="space-y-4"
                data-template-tab={value}
              >
                {value === UNUSED ? (
                  <p className="text-sm text-muted-foreground">
                    {labels.unusedDescription}
                  </p>
                ) : (
                  value !== ALL && (
                    <p className="text-sm text-muted-foreground">
                      {texts.templates.sorts[value].description}{" "}
                      {texts.templates.sorts[value].example}
                    </p>
                  )
                )}
                <TemplateTable
                  items={shown}
                  withType={value === ALL || value === UNUSED}
                  usesOf={usage.data ? usesOf : null}
                  emptyTitle={
                    value === UNUSED ? labels.noUnused : labels.emptySort
                  }
                  selectAll={bulk.selectAll}
                  selected={bulk.checkedIds}
                  onSelect={bulk.toggle}
                  selectionDisabled={bulk.pending}
                  onTrash={setToTrash}
                />
              </TabsContent>
            ))}
          </Tabs>
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

      <TrashDialog
        open={bulk.confirming && selection.items.length > 0}
        title={
          selection.items.length === 1
            ? labels.confirmTrash.title
            : labels.confirmTrashManyTitle(selection.items.length)
        }
        description={
          selection.items.length === 1
            ? labels.confirmTrash.description(nameOf(selection.items[0]))
            : labels.confirmTrashMany
        }
        confirmLabel={labels.confirmTrash.confirm}
        pending={bulk.pending}
        onCancel={bulk.cancel}
        onConfirm={bulk.confirm}
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

/** Les modèles d'un onglet ; dans « Tous les blocs », avec leur sorte (colonne Type). */
function TemplateTable({
  items,
  withType,
  usesOf,
  emptyTitle,
  selectAll,
  selected,
  onSelect,
  selectionDisabled,
  onTrash,
}: {
  items: TemplateItem[]
  withType: boolean
  // Le nombre d'endroits où sert un modèle (null : pas encore lu).
  usesOf: ((item: TemplateItem) => number) | null
  emptyTitle: string
  // Sélection en masse : « Tout sélectionner » et les modèles cochés.
  selectAll: SelectAll
  selected: ReadonlySet<string>
  onSelect: (item: TemplateItem, checked: boolean) => void
  selectionDisabled: boolean
  onTrash: (item: TemplateItem) => void
}) {
  if (items.length === 0) {
    return <ListEmpty icon={LayoutTemplate} title={emptyTitle} />
  }
  return (
    <ListCard>
      <Table>
        <TableHeader>
          <TableRow>
            <SelectAllHead {...selectAll} />
            <TableHead>{labels.columns.name}</TableHead>
            {withType && <TableHead>{labels.columns.type}</TableHead>}
            <TableHead>{labels.columns.status}</TableHead>
            <TableHead>{labels.columns.savedAt}</TableHead>
            <TableHead className="w-0">
              <span className="sr-only">{texts.common.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              data-content-row={item.id}
              data-template={item.id}
              data-state={selected.has(item.id) ? "selected" : undefined}
            >
              <TableCell>
                <Checkbox
                  aria-label={texts.selection.select(nameOf(item))}
                  checked={selected.has(item.id)}
                  disabled={selectionDisabled}
                  onCheckedChange={(value) => onSelect(item, value)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  to={editorPath("templates", item.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {nameOf(item)}
                </Link>
              </TableCell>
              {withType && (
                <TableCell>
                  <Badge variant="outline">
                    {texts.templates.sorts[item.sort].title}
                  </Badge>
                </TableCell>
              )}
              <TableCell>
                {usesOf && (
                  <TemplateStatus
                    template={item}
                    name={nameOf(item)}
                    count={usesOf(item)}
                  />
                )}
              </TableCell>
              <SavedCell savedAt={item.draft_saved_at} />
              <TableCell>
                <RowActions item={item} onTrash={() => onTrash(item)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ListCard>
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

  const refresh = () => refreshAfterContentTrash(queryClient)

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
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>{labels.used.checkFailed}</AlertTitle>
          </Alert>
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

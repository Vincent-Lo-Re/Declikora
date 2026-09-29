import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  Ellipsis,
  File,
  FilePlus2,
  FileText,
  FilterX,
  LayoutTemplate,
  Search,
  SquarePen,
  Tags,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { LiveBadge, ScheduleBadge } from "@/components/editor/publication"
import { LoadState } from "@/components/load-state"
import { useMethodPending } from "@/components/methods/use-method-pending"
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
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  accessLevelsKey,
  listAccessLevels,
  type AccessLevel,
} from "@/lib/access-levels"
import {
  categoryNames,
  categorySectionOf,
  type Category,
} from "@/lib/categories"
import {
  ContentError,
  contentKeys,
  createContent,
  listContents,
  type ContentListItem,
} from "@/lib/contents/api"
import {
  ALL_CATEGORIES,
  filterContents,
  isStateFilter,
  itemStatus,
  NO_CATEGORY,
  noFilters,
  stateFilters,
  type ListFilters,
} from "@/lib/contents/list-filters"
import {
  listMethodCounts,
  methodKeys,
  type MethodCounts,
} from "@/lib/contents/methods"
import { restoreContent, trashContent } from "@/lib/contents/publication"
import { listStarters, templateKeys } from "@/lib/contents/templates"
import { useCategories } from "@/hooks/use-categories"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatDateTime } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import { categoriesPath, editorPath, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.contentList

/** Les sortes de contenu qui ont une liste. */
type ListKind = "page" | "article" | "episode" | "method"

/**
 * Liste des contenus d'une section (Pages, Blog, Podcasts, Méthodes) : recherche, filtres par
 * état de publication et par catégorie, créer (vide ou depuis un point de départ, [D42]), ouvrir
 * dans l'éditeur, mettre à la corbeille. Pour une page, son adresse ; pour un article ou un
 * épisode, ses catégories ; pour une méthode, son niveau d'accès et la taille de son plan.
 */
export function ContentListPage({
  section,
  kind,
}: {
  section: SectionKey
  kind: ListKind
}) {
  const { title, description } = texts.sections[section]
  const kindLabels = labels.kinds[kind]
  const categorySection = categorySectionOf(kind)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()

  const list = useQuery({
    queryKey: contentKeys.list(kind),
    queryFn: () => listContents(kind),
    // Qui écrit quoi, et les publications programmées : relu toutes les 30 secondes.
    refetchInterval: 30_000,
  })
  const categories = useCategories(categorySection)
  const isMethod = kind === "method"
  // Méthodes : les formules (niveau d'accès), le nombre de chapitres et de leçons, et, pour
  // celles qui sont en ligne, s'il y a quelque chose à publier (la fiche ne suffit pas : une
  // leçon modifiée ne change pas la fiche, [D29]).
  const levels = useQuery({
    queryKey: accessLevelsKey,
    queryFn: listAccessLevels,
    enabled: isMethod,
  })
  const counts = useQuery({
    queryKey: methodKeys.counts,
    queryFn: listMethodCounts,
    enabled: isMethod,
    refetchInterval: 30_000,
  })
  const pendingById = useMethodPending(isMethod ? list.data : undefined, true)
  const items =
    isMethod && list.data
      ? list.data.map((item) =>
          pendingById.has(item.id)
            ? { ...item, pending_changes: pendingById.get(item.id) }
            : item
        )
      : list.data
  const [toTrash, setToTrash] = useState<ContentListItem | null>(null)
  const [filters, setFilters] = useState<ListFilters>(noFilters)
  const search = useDebouncedValue(filters.search, 150)

  const known = useMemo(
    () =>
      categories.data
        ? new Set(categories.data.map((category) => category.id))
        : undefined,
    [categories.data]
  )
  // Une catégorie choisie dans le filtre, puis supprimée : le filtre revient à « Toutes ».
  const category =
    filters.category === ALL_CATEGORIES ||
    filters.category === NO_CATEGORY ||
    !known ||
    known.has(filters.category)
      ? filters.category
      : ALL_CATEGORIES
  const shown = useMemo(
    () =>
      items
        ? filterContents(
            items,
            { ...filters, search, category },
            list.dataUpdatedAt,
            known
          )
        : [],
    [items, list.dataUpdatedAt, filters, search, category, known]
  )
  const filtering =
    filters.search.trim() !== "" ||
    filters.state !== "all" ||
    category !== ALL_CATEGORIES

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: contentKeys.all }),
      queryClient.invalidateQueries({ queryKey: trashKey }),
      queryClient.invalidateQueries({ queryKey: [...mediaKeys.all, "uses"] }),
    ])

  // « Annuler » dans le message : le contenu revient en brouillon, sans être republié.
  const undo = async (item: ContentListItem) => {
    const name = item.title.trim() || texts.common.untitled
    try {
      const { addressRemoved } = await restoreContent(item.id)
      if (addressRemoved)
        toast.warning(texts.trash.restoredWithoutAddress(name))
      else toast.success(kindLabels.restored(name))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      await refresh()
    }
  }

  const trash = useMutation({
    mutationFn: (item: ContentListItem) => trashContent(item.id),
    onSuccess: (result, item) => {
      setToTrash(null)
      toast.success(
        labels.trashed(item.title.trim() || texts.common.untitled),
        {
          action: { label: labels.undo, onClick: () => void undo(item) },
        }
      )
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

  // Les points de départ de cette sorte ([D42]) : « Nouvel article » propose « Article vide »
  // ou l'un d'eux. Sans point de départ (ou si la liste ne se lit pas), un contenu vide.
  const starters = useQuery({
    queryKey: templateKeys.starters(kind),
    queryFn: () => listStarters(kind),
    // Il n'y a pas de point de départ pour une méthode ([D42] : chapitres et leçons seulement).
    enabled: !isMethod,
  })

  const create = useMutation({
    mutationFn: (fromTemplateId: string | null) =>
      createContent(kind, "", fromTemplateId),
    onSuccess: (content) => {
      queryClient.setQueryData(contentKeys.detail(content.id), content)
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) })
      void navigate(editorPath(section, content.id))
    },
    onError: (error) => {
      checkAccess(error)
      toast.error(`${kindLabels.createFailed} ${error.message}`)
    },
  })

  const createButton =
    starters.data && starters.data.length > 0 ? (
      <DropdownMenu>
        <DropdownMenuTrigger disabled={create.isPending} render={<Button />}>
          {create.isPending ? <Spinner /> : <FilePlus2 />}
          {kindLabels.create}
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={() => create.mutate(null)}>
            <File />
            {kindLabels.blank}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>{labels.starters}</DropdownMenuLabel>
            {starters.data.map((starter) => (
              <DropdownMenuItem
                key={starter.id}
                onClick={() => create.mutate(starter.id)}
              >
                <LayoutTemplate />
                {starter.title.trim() || texts.templates.list.untitled}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button onClick={() => create.mutate(null)} disabled={create.isPending}>
        {create.isPending ? <Spinner /> : <FilePlus2 />}
        {kindLabels.create}
      </Button>
    )

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            {categorySection && (
              <Link
                to={categoriesPath(categorySection)}
                className={buttonVariants({ variant: "outline" })}
              >
                <Tags />
                {labels.manageCategories}
              </Link>
            )}
            {createButton}
          </>
        }
      />

      {list.data === undefined ? (
        <LoadState
          query={list}
          failed={labels.loadFailed}
          rows={3}
          rowClassName="h-12 w-full"
        />
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
                <EmptyTitle>{kindLabels.emptyTitle}</EmptyTitle>
                <EmptyDescription>
                  {kindLabels.emptyDescription}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <ListFiltersBar
                kind={kind}
                filters={{ ...filters, category }}
                categories={categorySection ? categories.data : undefined}
                filtering={filtering}
                count={labels.count(shown.length, list.data.length)}
                onChange={setFilters}
              />
              {shown.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {kindLabels.noResults}
                </p>
              ) : (
                <ContentTable
                  kind={kind}
                  section={section}
                  items={shown}
                  now={list.dataUpdatedAt}
                  categories={categories.data}
                  levels={levels.data}
                  counts={counts.data}
                  trashing={trash.isPending}
                  onTrash={setToTrash}
                />
              )}
            </>
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
              <AlertDialogTitle>
                {kindLabels.confirmTrashTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {kindLabels.confirmTrash(
                  toTrash.title.trim() || texts.common.untitled
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

/** Recherche, filtre par état et, pour le Blog et les Podcasts, par catégorie. */
function ListFiltersBar({
  kind,
  filters,
  categories,
  filtering,
  count,
  onChange,
}: {
  kind: ListKind
  filters: ListFilters
  // Les catégories de la section (undefined : pas de filtre par catégorie, ou pas encore lues).
  categories: Category[] | undefined
  filtering: boolean
  count: string
  onChange: (next: ListFilters) => void
}) {
  const filterLabels = labels.filters
  const stateItems = stateFilters.map((value) => ({
    value,
    label: filterLabels.states[value],
  }))
  const categoryItems = [
    { value: ALL_CATEGORIES, label: filterLabels.allCategories },
    { value: NO_CATEGORY, label: filterLabels.noCategory },
    ...(categories ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-72">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
          placeholder={labels.searchPlaceholder}
          aria-label={labels.kinds[kind].search}
          className="pl-8"
        />
      </div>
      <Select
        items={stateItems}
        value={filters.state}
        onValueChange={(value) => {
          if (isStateFilter(value)) onChange({ ...filters, state: value })
        }}
      >
        <SelectTrigger aria-label={filterLabels.state} className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stateItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {categories && (
        <Select
          items={categoryItems}
          value={filters.category}
          onValueChange={(value) => {
            if (typeof value === "string")
              onChange({ ...filters, category: value })
          }}
        >
          <SelectTrigger
            aria-label={filterLabels.category}
            className="min-w-48"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categoryItems.slice(0, 2).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
            {categoryItems.length > 2 && <SelectSeparator />}
            {categoryItems.slice(2).map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {filtering && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...noFilters })}
        >
          <FilterX />
          {filterLabels.reset}
        </Button>
      )}
      <p
        role="status"
        className="ml-auto text-sm text-muted-foreground tabular-nums"
      >
        {count}
      </p>
    </div>
  )
}

function ContentTable({
  kind,
  section,
  items,
  now,
  categories,
  levels,
  counts,
  trashing,
  onTrash,
}: {
  kind: ListKind
  section: SectionKey
  items: ContentListItem[]
  now: number
  categories: Category[] | undefined
  // Méthodes : les formules, et la taille du plan de chacune (undefined : pas encore lus).
  levels: AccessLevel[] | undefined
  counts: MethodCounts | undefined
  trashing: boolean
  onTrash: (item: ContentListItem) => void
}) {
  const withCategories = kind === "article" || kind === "episode"
  const isMethod = kind === "method"
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labels.columns.title}</TableHead>
          {isMethod ? (
            <>
              <TableHead>{labels.columns.level}</TableHead>
              <TableHead>{labels.columns.outline}</TableHead>
            </>
          ) : (
            <TableHead>
              {withCategories
                ? labels.columns.categories
                : labels.columns.address}
            </TableHead>
          )}
          <TableHead>{labels.columns.publication}</TableHead>
          <TableHead>{labels.columns.savedAt}</TableHead>
          <TableHead>{labels.columns.status}</TableHead>
          <TableHead className="w-0">
            <span className="sr-only">{texts.common.actions}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const status = itemStatus(item, now)
          const name = item.title.trim() || texts.common.untitled
          return (
            <TableRow key={item.id}>
              <TableCell className="max-w-80 font-medium">
                <Link
                  to={editorPath(section, item.id)}
                  className="line-clamp-2 underline-offset-4 hover:underline"
                >
                  {name}
                </Link>
              </TableCell>
              {isMethod ? (
                <MethodCells
                  item={item}
                  levels={levels}
                  count={counts?.get(item.id) ?? (counts ? EMPTY_COUNT : null)}
                />
              ) : (
                <TableCell className="max-w-64 text-muted-foreground">
                  {withCategories ? (
                    <CategoriesCell ids={item.category_ids} all={categories} />
                  ) : item.slug ? (
                    <code className="font-mono text-xs break-all">
                      {item.slug}
                    </code>
                  ) : (
                    <span className="text-xs">{labels.noAddress}</span>
                  )}
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <LiveBadge live={status.live} />
                  <ScheduleBadge schedule={status.schedule} />
                </div>
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
                  title={name}
                  editPath={editorPath(section, item.id)}
                  disabled={trashing}
                  onTrash={() => onTrash(item)}
                />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

const EMPTY_COUNT = { chapters: 0, lessons: 0 }

/** Une méthode : son niveau d'accès ([D41] : « Pas encore choisi ») et la taille de son plan. */
function MethodCells({
  item,
  levels,
  count,
}: {
  item: ContentListItem
  levels: AccessLevel[] | undefined
  // null tant que les nombres ne sont pas lus.
  count: { chapters: number; lessons: number } | null
}) {
  const level = !item.access_chosen
    ? labels.levelNotChosen
    : item.access_level_id === null
      ? texts.publication.settings.access.free
      : levels
        ? (levels.find((entry) => entry.id === item.access_level_id)?.name ??
          texts.publication.settings.access.deleted)
        : null
  return (
    <>
      <TableCell className="text-muted-foreground">
        {level === null ? (
          <Skeleton className="h-4 w-20" />
        ) : item.access_chosen ? (
          <Badge variant="outline">{level}</Badge>
        ) : (
          <span className="text-xs">{level}</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {count ? (
          labels.outlineCount(count.chapters, count.lessons)
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
      </TableCell>
    </>
  )
}

/** Les catégories d'une ligne, dans l'ordre de la section ; les supprimées sont ignorées. */
function CategoriesCell({
  ids,
  all,
}: {
  ids: string[]
  all: Category[] | undefined
}) {
  if (ids.length === 0 || !all) {
    return (
      <span className="text-xs">
        {ids.length === 0 ? labels.noCategory : ""}
      </span>
    )
  }
  const names = categoryNames(ids, all)
  if (names.length === 0) {
    return <span className="text-xs">{labels.noCategory}</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {names.map((name) => (
        <Badge key={name} variant="outline">
          {name}
        </Badge>
      ))}
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

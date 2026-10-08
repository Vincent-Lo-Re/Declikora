import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Ellipsis,
  FilterX,
  Link as LinkIcon,
  Search,
  SquarePen,
  Tags,
  Trash2,
  Unlink,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { SelectAllHead } from "@/components/bulk-selection"
import { CategoryDialog } from "@/components/categories/category-dialog"
import type { CategoriesBulk } from "@/components/categories/use-categories-bulk"
import { SortableRow } from "@/components/contents/sortable-rows"
import { IconBadge } from "@/components/icon-badge"
import { ListCard, ListEmpty } from "@/components/list-card"
import { SortableList } from "@/components/list-sorting"
import { LoadState } from "@/components/load-state"
import { SearchInput } from "@/components/search-input"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TrashDialog } from "@/components/trash-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  categoryKeys,
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
  type Category,
  type CategorySection,
} from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { normalizeSearch } from "@/lib/contents/list-filters"
import { formatDateTime } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { categoriesRead, REREAD_MS } from "@/lib/reads"
import { texts } from "@/texts"

const labels = texts.categories

/**
 * L'onglet « Catégories » du Blog et des Podcasts, comme la liste des contenus : recherche, filtre
 * par état (utilisées ou non), cases (« Supprimer définitivement (n) » est en tête de page,
 * useCategoriesBulk), rangement dans l'ordre de l'app (glisser-déposer, sur
 * la liste complète), une ligne par catégorie (nom, brouillons qui la citent, date de création)
 * et son menu « … » (Modifier, Supprimer définitivement). « Nouvelle catégorie » (en tête de
 * page) et « Modifier » ouvrent la même fenêtre. Supprimer est définitif ([D28]) ; ces changements
 * sont dans l'app tout de suite, sans publier.
 */
export function CategoriesTab({
  section,
  creating,
  onCreatingChange,
  bulk,
}: {
  section: CategorySection
  creating: boolean
  onCreatingChange: (open: boolean) => void
  bulk: CategoriesBulk
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const key = categoryKeys.list(section)
  // Relue à chaque ouverture : le nombre de brouillons de chaque catégorie change dans l'éditeur.
  const categories = useQuery({
    ...categoriesRead(section),
    staleTime: REREAD_MS,
  })
  useEffect(() => {
    if (categories.error) checkAccess(categories.error)
  }, [categories.error, checkAccess])

  const [search, setSearch] = useState("")
  const [usage, setUsage] = useState<UsageFilter>("all")
  const [editing, setEditing] = useState<Category | null>(null)
  const [toRemove, setToRemove] = useState<Category | null>(null)
  const { selected, setSelected } = bulk

  const all = categories.data
  const shown = useMemo(() => {
    const wanted = normalizeSearch(search)
    return (all ?? []).filter(
      (category) =>
        normalizeSearch(category.name).includes(wanted) &&
        (usage === "all" || (usage === "used") === category.uses > 0)
    )
  }, [all, search, usage])
  const filtering = search.trim() !== "" || usage !== "all"
  // Une recherche ou un filtre décoche ce qu'ils cachent : « Supprimer définitivement (n) » ne
  // compte que les lignes affichées.
  useEffect(() => {
    const visible = new Set(shown.map((category) => category.id))
    if ([...selected].some((id) => !visible.has(id)))
      setSelected(new Set([...selected].filter((id) => visible.has(id))))
  }, [shown, selected, setSelected])
  const checked = shown.filter((category) => selected.has(category.id))

  // Les listes du Blog ou des Podcasts montrent les noms : relues aussi.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
      queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
    ])
  const onError = (error: Error) => {
    toast.error(error.message)
    checkAccess(error)
  }

  // Créer ou modifier : la fenêtre se ferme, la catégorie arrive dans la liste.
  const dialogOpen = creating || editing !== null
  const closeDialog = () => {
    onCreatingChange(false)
    setEditing(null)
    save.reset()
  }
  const save = useMutation({
    mutationFn: (name: string) =>
      editing
        ? renameCategory(editing.id, name)
        : createCategory(section, name),
    onSuccess: (category) => {
      toast.success(editing ? labels.renamed : labels.added(category.name))
      closeDialog()
    },
    onError: (error) => checkAccess(error),
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: (category: Category) => deleteCategory(category.id),
    onSuccess: (_, category) => {
      toast.success(labels.removed(category.name))
      setSelected((previous) => without(previous, [category.id]))
    },
    onError,
    onSettled: async () => {
      setToRemove(null)
      await refresh()
    },
  })

  // L'ordre change tout de suite à l'écran ; il revient en arrière si la base refuse.
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderCategories(section, ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Category[]>(key)
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]))
        queryClient.setQueryData(
          key,
          ids.flatMap((id) => byId.get(id) ?? [])
        )
      }
      return { previous }
    },
    onSuccess: () => toast.success(labels.reordered),
    onError: (error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
      onError(error)
    },
    onSettled: refresh,
  })

  const busy =
    remove.isPending || bulk.removeMany.isPending || reorder.isPending
  const toggle = (category: Category, on: boolean) =>
    setSelected((previous) =>
      on
        ? new Set([...previous, category.id])
        : without(previous, [category.id])
    )

  const dialog = (
    <CategoryDialog
      open={dialogOpen}
      onOpenChange={(open) => !open && closeDialog()}
      name={editing?.name ?? null}
      pending={save.isPending}
      error={save.error ? errorMessage(save.error) : null}
      onSubmit={(name) => save.mutate(name)}
    />
  )

  if (all === undefined) {
    return (
      <>
        <ListCard>
          <LoadState
            query={categories}
            failed={labels.loadFailed}
            rows={3}
            rowClassName="h-12 w-full"
          />
        </ListCard>
        {dialog}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {labels.description[section]}
      </p>
      {all.length === 0 ? (
        <ListEmpty
          icon={Tags}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              label={labels.search}
              placeholder={labels.searchPlaceholder}
              className="w-72"
            />
            <Select
              items={usageItems}
              value={usage}
              onValueChange={(value) => {
                if (isUsageFilter(value)) setUsage(value)
              }}
            >
              <SelectTrigger aria-label={labels.filters.label} className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usageItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setUsage("all")
                }}
              >
                <FilterX />
                {texts.contentList.filters.reset}
              </Button>
            )}
            <p
              role="status"
              className="ml-auto text-sm text-muted-foreground tabular-nums"
            >
              {labels.count(shown.length, all.length)}
            </p>
          </div>
          {shown.length === 0 ? (
            <ListEmpty icon={Search} title={labels.noResults} />
          ) : (
            <>
              {filtering && (
                <p className="text-sm text-muted-foreground">
                  {labels.orderFiltering}
                </p>
              )}
              <CategoryTable
                items={shown}
                selected={selected}
                checkedCount={checked.length}
                disabled={busy}
                reorderDisabled={filtering || busy}
                onToggle={toggle}
                onToggleAll={(on) =>
                  setSelected(
                    on
                      ? new Set(shown.map((category) => category.id))
                      : without(
                          selected,
                          shown.map((category) => category.id)
                        )
                  )
                }
                onReorder={(ids) => reorder.mutate(ids)}
                onEdit={setEditing}
                onRemove={(category) => {
                  setToRemove(category)
                  // Le nombre de brouillons qui la perdent est relu avant de confirmer ([D28]).
                  void categories.refetch()
                }}
              />
            </>
          )}
        </>
      )}

      {dialog}
      <TrashDialog
        open={toRemove !== null}
        title={labels.confirmRemove.title}
        description={
          toRemove
            ? `${labels.confirmRemove.description(toRemove.name)} ${labels.confirmRemove.uses(
                all.find((item) => item.id === toRemove.id)?.uses ??
                  toRemove.uses
              )}`
            : ""
        }
        confirmLabel={labels.confirmRemove.confirm}
        pending={remove.isPending || categories.isFetching}
        onCancel={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove)}
      />
      <TrashDialog
        open={bulk.confirming && checked.length > 0}
        title={labels.confirmRemoveMany.title(checked.length)}
        description={labels.confirmRemoveMany.description}
        confirmLabel={labels.confirmRemove.confirm}
        pending={bulk.removeMany.isPending}
        onCancel={() => bulk.setConfirming(false)}
        onConfirm={() => bulk.removeMany.mutate(checked)}
      />
    </div>
  )
}

// Filtre par état : toutes, celles que des brouillons citent, les autres.
const usageFilters = ["all", "used", "unused"] as const
type UsageFilter = (typeof usageFilters)[number]
const usageItems = usageFilters.map((value) => ({
  value,
  label: labels.filters[value],
}))
function isUsageFilter(value: unknown): value is UsageFilter {
  return usageFilters.includes(value as UsageFilter)
}

/**
 * « Utilisée dans », comme l'utilisation d'un fichier dans la Médiathèque : un lien si des
 * brouillons la citent, un lien coupé sinon ; leur nombre dans l'infobulle.
 */
function UsesCell({ uses }: { uses: number }) {
  return (
    <IconBadge
      icon={uses > 0 ? LinkIcon : Unlink}
      label={labels.usesCount(uses)}
    />
  )
}

function without(set: ReadonlySet<string>, ids: string[]): Set<string> {
  const next = new Set(set)
  for (const id of ids) next.delete(id)
  return next
}

function CategoryTable({
  items,
  selected,
  checkedCount,
  disabled,
  reorderDisabled,
  onToggle,
  onToggleAll,
  onReorder,
  onEdit,
  onRemove,
}: {
  items: Category[]
  selected: ReadonlySet<string>
  checkedCount: number
  disabled: boolean
  // On ne range que la liste complète : pas pendant une recherche.
  reorderDisabled: boolean
  onToggle: (category: Category, on: boolean) => void
  onToggleAll: (on: boolean) => void
  onReorder: (ids: string[]) => void
  onEdit: (category: Category) => void
  onRemove: (category: Category) => void
}) {
  return (
    <SortableList
      items={items.map((item) => ({ id: item.id, name: item.name }))}
      words={labels.dnd}
      onReorder={onReorder}
    >
      <ListCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-0">
                <span className="sr-only">
                  {texts.contentList.order.column}
                </span>
              </TableHead>
              <SelectAllHead
                all={checkedCount > 0 && checkedCount === items.length}
                some={checkedCount > 0 && checkedCount < items.length}
                disabled={disabled}
                onToggleAll={onToggleAll}
              />
              <TableHead>{labels.columns.name}</TableHead>
              <TableHead>{labels.columns.uses}</TableHead>
              <TableHead>{labels.columns.createdAt}</TableHead>
              <TableHead className="w-0">
                <span className="sr-only">{texts.common.actions}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((category) => (
              <SortableRow
                key={category.id}
                id={category.id}
                name={category.name}
                disabled={reorderDisabled}
                data-item={category.name}
                data-state={selected.has(category.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={texts.selection.select(category.name)}
                    checked={selected.has(category.id)}
                    disabled={disabled}
                    onCheckedChange={(value) => onToggle(category, value)}
                  />
                </TableCell>
                <TableCell className="max-w-80 font-medium">
                  <button
                    type="button"
                    className="line-clamp-2 cursor-pointer text-left underline-offset-4 hover:underline"
                    onClick={() => onEdit(category)}
                  >
                    {category.name}
                  </button>
                </TableCell>
                <TableCell>
                  <UsesCell uses={category.uses} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(category.created_at)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      disabled={disabled}
                      aria-label={labels.actions(category.name)}
                      render={<Button variant="ghost" size="icon-sm" />}
                    >
                      <Ellipsis />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <SquarePen />
                        {labels.edit}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRemove(category)}
                      >
                        <Trash2 />
                        {labels.remove}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </SortableRow>
            ))}
          </TableBody>
        </Table>
      </ListCard>
    </SortableList>
  )
}

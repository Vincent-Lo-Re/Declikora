import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Link } from "react-router"
import { toast } from "sonner"

import { PageHeader } from "@/components/page-header"
import { useAccessCheck } from "@/components/team/use-access-check"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  categoryKeys,
  createCategory,
  deleteCategory,
  listCategories,
  renameCategory,
  reorderCategories,
  type Category,
  type CategorySection,
} from "@/lib/categories"
import { contentKeys } from "@/lib/contents/api"
import { categoryNameSchema } from "@/lib/schemas"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.categories

const NEW_CATEGORY_INPUT = "categorie-nouvelle"

// Temps laissé à l'élément pour pouvoir prendre le focus (la fenêtre de confirmation peut mettre
// un moment à se refermer).
const FOCUS_PATIENCE_MS = 2000

/**
 * Met le focus sur un élément dès qu'il peut le prendre : la fenêtre de confirmation a disparu,
 * l'élément existe et n'est plus grisé. Réessaie à chaque image, pendant FOCUS_PATIENCE_MS.
 */
function focusSoon(
  find: () => HTMLElement | null,
  until = performance.now() + FOCUS_PATIENCE_MS
) {
  if (!document.querySelector('[role="alertdialog"]')) {
    const element = find()
    element?.focus()
    if (element && document.activeElement === element) return
  }
  if (performance.now() < until) {
    requestAnimationFrame(() => focusSoon(find, until))
  }
}

/** Le bouton « Renommer » d'une catégorie (là où le focus revient après un geste). */
function renameButtonOf(categoryId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-category-id="${categoryId}"] [data-rename]`
  )
}

/**
 * Les catégories d'une section (Blog ou Podcasts) : ajouter, renommer, ranger dans l'ordre de
 * l'app (glisser-déposer à la souris ou au clavier), supprimer. La suppression est définitive
 * ([D28]) : la confirmation le dit, avec le nombre de brouillons qui la perdent.
 */
export function CategoriesPage({ section }: { section: CategorySection }) {
  const sectionTitle = texts.sections[section].title
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const key = categoryKeys.list(section)
  // Relue à chaque ouverture : le nombre de brouillons de chaque catégorie change dans l'éditeur,
  // sans que cette liste le sache.
  const categories = useQuery({
    queryKey: key,
    queryFn: () => listCategories(section),
    staleTime: 0,
  })
  useEffect(() => {
    if (categories.error) checkAccess(categories.error)
  }, [categories.error, checkAccess])
  const [toRemove, setToRemove] = useState<Category | null>(null)
  // Après une suppression, le focus va à la catégorie suivante (ou précédente), sinon au champ
  // du nom. undefined : la fenêtre rend le focus comme d'habitude (Annuler, Échap).
  const focusAfterRemove = useRef<string | null | undefined>(undefined)

  // Les listes du Blog ou des Podcasts montrent les noms : relues aussi.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
    ])

  const onError = (error: Error) => {
    toast.error(error.message)
    checkAccess(error)
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderCategories(section, ids),
    // L'ordre change tout de suite à l'écran ; il revient en arrière si la base refuse.
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<Category[]>(key)
      if (before) {
        const byId = new Map(before.map((category) => [category.id, category]))
        queryClient.setQueryData(
          key,
          ids.flatMap((id, index) => {
            const category = byId.get(id)
            return category ? [{ ...category, position: index }] : []
          })
        )
      }
      return { before }
    },
    onSuccess: () => toast.success(labels.reordered),
    onError: (error, _ids, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before)
      onError(error)
    },
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: (category: Category) => deleteCategory(category.id),
    onSuccess: (_, category) => {
      toast.success(labels.removed(category.name))
      const list = categories.data ?? []
      const index = list.findIndex((item) => item.id === category.id)
      const neighbour = list[index + 1] ?? list[index - 1] ?? null
      focusAfterRemove.current = neighbour?.id ?? null
    },
    onError,
    onSettled: async () => {
      setToRemove(null)
      await refresh()
      const target = focusAfterRemove.current
      if (target === undefined) return
      focusSoon(() =>
        target
          ? renameButtonOf(target)
          : document.getElementById(NEW_CATEGORY_INPUT)
      )
    },
  })

  return (
    <>
      <div className="mb-2">
        <Link
          to={sections[section].path}
          aria-label={labels.back(sectionTitle)}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "-ml-2"
          )}
        >
          <ArrowLeft />
          {sectionTitle}
        </Link>
      </div>
      <PageHeader
        title={labels.title(sectionTitle)}
        description={labels.description[section]}
      />
      <Card className="max-w-2xl">
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">{labels.order}</p>
          {categories.data === undefined ? (
            categories.isError ? (
              <div className="space-y-3">
                <p role="alert" className="text-sm text-destructive">
                  {labels.loadFailed} {categories.error.message}
                </p>
                <Button variant="outline" onClick={() => categories.refetch()}>
                  {labels.retry}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            )
          ) : categories.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            <SortableCategories
              sectionTitle={sectionTitle}
              categories={categories.data}
              disabled={reorder.isPending || remove.isPending}
              onReorder={(ids) => reorder.mutate(ids)}
              onRemove={(category) => {
                // Le nombre de brouillons qui la perdent est relu avant de confirmer ([D28]).
                void categories.refetch()
                focusAfterRemove.current = undefined
                setToRemove(category)
              }}
            />
          )}
          <AddCategoryForm section={section} />
        </CardContent>
      </Card>

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setToRemove(null)
        }}
      >
        {toRemove && (
          <AlertDialogContent
            finalFocus={() => focusAfterRemove.current === undefined}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.confirmRemove.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.confirmRemove.description(toRemove.name)}{" "}
                {labels.confirmRemove.uses(
                  categories.data?.find((item) => item.id === toRemove.id)
                    ?.uses ?? toRemove.uses
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={remove.isPending || categories.isFetching}
                onClick={() => remove.mutate(toRemove)}
              >
                {remove.isPending && <Spinner />}
                {labels.confirmRemove.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  )
}

/** Annonces du glisser-déposer, en français, pour les lecteurs d'écran. */
function makeAnnouncements(categories: Category[]): Announcements {
  const dnd = labels.dnd
  const nameOf = (id: UniqueIdentifier) =>
    categories.find((category) => category.id === id)?.name ?? ""
  const placeOf = (id: UniqueIdentifier) =>
    categories.findIndex((category) => category.id === id) + 1
  return {
    onDragStart: ({ active }) => dnd.start(nameOf(active.id)),
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? dnd.over(nameOf(active.id), placeOf(over.id), categories.length)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? dnd.end(nameOf(active.id), placeOf(over.id), categories.length)
        : dnd.cancel(nameOf(active.id)),
    onDragCancel: ({ active }) => dnd.cancel(nameOf(active.id)),
  }
}

function SortableCategories({
  sectionTitle,
  categories,
  disabled,
  onReorder,
  onRemove,
}: {
  sectionTitle: string
  categories: Category[]
  disabled: boolean
  onReorder: (ids: string[]) => void
  onRemove: (category: Category) => void
}) {
  const [renaming, setRenaming] = useState<string | null>(null)
  // Fin d'un renommage : le focus revient sur le bouton « Renommer » de la ligne.
  const endRename = (categoryId: string) => {
    setRenaming(null)
    focusSoon(() => renameButtonOf(categoryId))
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const ids = categories.map((category) => category.id)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements: makeAnnouncements(categories),
        screenReaderInstructions: { draggable: labels.dnd.instructions },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label={labels.listLabel(sectionTitle)}>
          {categories.map((category) => (
            <SortableCategory
              key={category.id}
              category={category}
              disabled={disabled}
              renaming={renaming === category.id}
              onRename={(open) =>
                open ? setRenaming(category.id) : endRename(category.id)
              }
              onRemove={() => onRemove(category)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function SortableCategory({
  category,
  disabled,
  renaming,
  onRename,
  onRemove,
}: {
  category: Category
  disabled: boolean
  renaming: boolean
  onRename: (open: boolean) => void
  onRemove: () => void
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: category.id,
    disabled: disabled || renaming,
    attributes: { roleDescription: labels.dnd.roleDescription },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-2 py-1.5",
        isDragging && "relative z-10 shadow-md"
      )}
      data-category={category.name}
      data-category-id={category.id}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={labels.handle(category.name)}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      {renaming ? (
        <RenameForm category={category} onDone={() => onRename(false)} />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">
            {category.name}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            {labels.uses(category.uses)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={labels.renameItem(category.name)}
            data-rename
            onClick={() => onRename(true)}
          >
            <Pencil />
            {labels.rename}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={disabled}
            aria-label={labels.removeItem(category.name)}
            onClick={onRemove}
          >
            <Trash2 />
            {labels.remove}
          </Button>
        </>
      )}
    </li>
  )
}

function RenameForm({
  category,
  onDone,
}: {
  category: Category
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: category.name },
  })
  const rename = useMutation({
    mutationFn: (name: string) => renameCategory(category.id, name),
    onSuccess: () => {
      toast.success(labels.renamed)
      onDone()
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: categoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
      ]),
  })
  const inputId = `categorie-${category.id}`
  return (
    <form
      noValidate
      className="flex min-w-0 flex-1 items-start gap-2"
      onSubmit={form.handleSubmit(({ name }) => {
        if (name === category.name) onDone()
        else rename.mutate(name)
      })}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          onDone()
        }
      }}
    >
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="min-w-0 flex-1">
            <FieldLabel htmlFor={inputId} className="sr-only">
              {labels.renameLabel(category.name)}
            </FieldLabel>
            <Input
              {...field}
              id={inputId}
              autoFocus
              autoComplete="off"
              maxLength={100}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Button type="submit" size="sm" disabled={rename.isPending}>
        {rename.isPending && <Spinner />}
        {labels.save}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={rename.isPending}
        onClick={onDone}
      >
        {texts.common.cancel}
      </Button>
    </form>
  )
}

function AddCategoryForm({ section }: { section: CategorySection }) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: "" },
  })
  const create = useMutation({
    mutationFn: (name: string) => createCategory(section, name),
    onSuccess: (category) => {
      toast.success(labels.added(category.name))
      form.reset({ name: "" })
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: categoryKeys.list(section) }),
  })
  return (
    <form
      noValidate
      className="flex items-start gap-2"
      onSubmit={form.handleSubmit(({ name }) => create.mutate(name))}
    >
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-sm">
            <FieldLabel htmlFor={NEW_CATEGORY_INPUT}>{labels.name}</FieldLabel>
            <div className="flex gap-2">
              <Input
                {...field}
                id={NEW_CATEGORY_INPUT}
                autoComplete="off"
                maxLength={100}
                placeholder={labels.namePlaceholder}
                aria-invalid={fieldState.invalid}
              />
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Spinner /> : <Plus />}
                {labels.add}
              </Button>
            </div>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </form>
  )
}

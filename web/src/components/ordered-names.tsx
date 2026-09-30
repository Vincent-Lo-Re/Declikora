import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseQueryResult,
} from "@tanstack/react-query"
import { cn } from "cn"
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { SortableList } from "@/components/list-sorting"
import { LoadState } from "@/components/load-state"
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
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { focusSoon } from "@/lib/focus"
import { MAX_NAME_LENGTH } from "@/lib/schemas"
import { texts } from "@/texts"

type Named = { id: string; name: string }

/** Les textes d'une liste de noms rangée (Catégories, Formules), tirés de texts.ts. */
type OrderedNamesLabels = {
  listLabel: string
  empty: string
  name: string
  namePlaceholder: string
  add: string
  added: (name: string) => string
  rename: string
  renameItem: (name: string) => string
  renameLabel: (name: string) => string
  renamed: string
  remove: string
  removeItem: (name: string) => string
  confirmRemove: {
    title: string
    description: (name: string) => string
    confirm: string
  }
  removed: (name: string) => string
  handle: (name: string) => string
  reordered: string
  loadFailed: string
  dnd: {
    roleDescription: string
    instructions: string
    start: (name: string) => string
    over: (name: string, position: number, count: number) => string
    end: (name: string, position: number, count: number) => string
    cancel: (name: string) => string
  }
}

type OrderedNamesProps<T extends Named> = {
  labels: OrderedNamesLabels
  query: UseQueryResult<T[]>
  // La clé de la liste : l'ordre change tout de suite à l'écran, avant la réponse de la base.
  queryKey: QueryKey
  schema: z.ZodType<{ name: string }, { name: string }>
  // Préfixe des identifiants des champs (« categorie », « formule »).
  inputId: string
  create: (name: string) => Promise<T>
  rename: (id: string, name: string) => Promise<unknown>
  remove: (id: string) => Promise<unknown>
  reorder: (ids: string[]) => Promise<unknown>
  // Après chaque changement : relire la liste (et ce qui en dépend).
  refresh: () => Promise<unknown>
  // Ce qui s'affiche avant ou après le nom de chaque ligne (rang, nombre de brouillons…).
  before?: (item: T, position: number) => ReactNode
  after?: (item: T) => ReactNode
  // Ce que la confirmation de suppression ajoute, et ce qui la prépare (relire un compte).
  confirmDetail?: (item: T) => ReactNode
  onAskRemove?: (item: T) => void
  confirmBusy?: boolean
}

/** Le bouton « Renommer » d'une ligne (là où le focus revient après un geste sur la ligne). */
function renameButtonOf(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-item-id="${id}"] [data-rename]`
  )
}

/**
 * Une liste de noms qu'on range (glisser-déposer à la souris ou au clavier), renomme, complète
 * et dont on supprime des éléments, avec confirmation. Sert aux Catégories et aux Formules.
 */
export function OrderedNames<T extends Named>({
  labels,
  query,
  queryKey,
  schema,
  inputId,
  create,
  rename,
  remove: removeItem,
  reorder: reorderItems,
  refresh,
  before,
  after,
  confirmDetail,
  onAskRemove,
  confirmBusy = false,
}: OrderedNamesProps<T>) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  useEffect(() => {
    if (query.error) checkAccess(query.error)
  }, [query.error, checkAccess])
  const [toRemove, setToRemove] = useState<T | null>(null)
  // Après une suppression, le bouton qui avait ouvert la confirmation disparaît avec sa ligne :
  // le focus va à la ligne suivante (ou précédente), sinon au champ du nouveau nom. undefined :
  // la fenêtre rend le focus comme d'habitude (Annuler, Échap).
  const focusAfterRemove = useRef<string | null | undefined>(undefined)
  const newInputId = `${inputId}-nouvelle`

  const onError = (error: Error) => {
    toast.error(error.message)
    checkAccess(error)
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderItems(ids),
    // L'ordre change tout de suite à l'écran ; il revient en arrière si la base refuse.
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]))
        queryClient.setQueryData(
          queryKey,
          ids.flatMap((id) => byId.get(id) ?? [])
        )
      }
      return { previous }
    },
    onSuccess: () => toast.success(labels.reordered),
    onError: (error, _ids, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous)
      onError(error)
    },
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: (item: T) => removeItem(item.id),
    onSuccess: (_, item) => {
      toast.success(labels.removed(item.name))
      const list = query.data ?? []
      const index = list.findIndex((other) => other.id === item.id)
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
        target ? renameButtonOf(target) : document.getElementById(newInputId)
      )
    },
  })

  return (
    <>
      {query.data === undefined ? (
        <LoadState
          query={query}
          failed={labels.loadFailed}
          rows={2}
          rowClassName="h-11 w-full"
        />
      ) : query.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <SortableNames
          labels={labels}
          items={query.data}
          disabled={reorder.isPending || remove.isPending}
          schema={schema}
          inputId={inputId}
          rename={rename}
          refresh={refresh}
          before={before}
          after={after}
          onReorder={(ids) => reorder.mutate(ids)}
          onRemove={(item) => {
            onAskRemove?.(item)
            focusAfterRemove.current = undefined
            setToRemove(item)
          }}
        />
      )}
      <AddForm
        labels={labels}
        schema={schema}
        inputId={newInputId}
        create={create}
        refresh={refresh}
      />

      <AlertDialog
        open={toRemove !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setToRemove(null)
        }}
      >
        {toRemove && (
          <AlertDialogContent
            finalFocus={() =>
              // Après une suppression, le focus est placé ci-dessus, une fois la liste relue.
              focusAfterRemove.current === undefined
            }
          >
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.confirmRemove.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.confirmRemove.description(toRemove.name)}
                {confirmDetail && <> {confirmDetail(toRemove)}</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={remove.isPending || confirmBusy}
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

type RowOptions<T extends Named> = Pick<
  OrderedNamesProps<T>,
  "labels" | "schema" | "inputId" | "rename" | "refresh" | "before" | "after"
>

function SortableNames<T extends Named>({
  items,
  disabled,
  onReorder,
  onRemove,
  ...options
}: RowOptions<T> & {
  items: T[]
  disabled: boolean
  onReorder: (ids: string[]) => void
  onRemove: (item: T) => void
}) {
  const { labels } = options
  const [renaming, setRenaming] = useState<string | null>(null)
  // Fin d'un renommage (Entrée, Enregistrer, Échap, Annuler) : le formulaire disparaît avec le
  // focus ; il revient sur le bouton « Renommer » de la ligne.
  const endRename = (id: string) => {
    setRenaming(null)
    focusSoon(() => renameButtonOf(id))
  }
  return (
    <SortableList items={items} words={labels.dnd} onReorder={onReorder}>
      <ol className="space-y-2" aria-label={labels.listLabel}>
        {items.map((item, index) => (
          <SortableName
            key={item.id}
            {...options}
            item={item}
            position={index + 1}
            disabled={disabled}
            renaming={renaming === item.id}
            onRename={(open) =>
              open ? setRenaming(item.id) : endRename(item.id)
            }
            onRemove={() => onRemove(item)}
          />
        ))}
      </ol>
    </SortableList>
  )
}

function SortableName<T extends Named>({
  item,
  position,
  disabled,
  renaming,
  onRename,
  onRemove,
  before,
  after,
  ...options
}: RowOptions<T> & {
  item: T
  position: number
  disabled: boolean
  renaming: boolean
  onRename: (open: boolean) => void
  onRemove: () => void
}) {
  const { labels } = options
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: disabled || renaming,
    attributes: { roleDescription: labels.dnd.roleDescription },
  })

  return (
    <li
      ref={setNodeRef}
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-lg border bg-card px-2 py-1.5",
        isDragging && "relative z-10 shadow-md"
      )}
      data-item={item.name}
      data-item-id={item.id}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={labels.handle(item.name)}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      {before?.(item, position)}
      {renaming ? (
        <RenameForm {...options} item={item} onDone={() => onRename(false)} />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">
            {item.name}
          </span>
          {after?.(item)}
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={labels.renameItem(item.name)}
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
            aria-label={labels.removeItem(item.name)}
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

function RenameForm<T extends Named>({
  item,
  onDone,
  labels,
  schema,
  inputId,
  rename: renameItem,
  refresh,
}: RowOptions<T> & { item: T; onDone: () => void }) {
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: item.name },
  })
  const rename = useMutation({
    mutationFn: (name: string) => renameItem(item.id, name),
    onSuccess: () => {
      toast.success(labels.renamed)
      onDone()
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: refresh,
  })
  const fieldId = `${inputId}-${item.id}`
  return (
    <form
      noValidate
      className="flex min-w-0 flex-1 items-start gap-2"
      onSubmit={form.handleSubmit(({ name }) => {
        if (name === item.name) onDone()
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
            <FieldLabel htmlFor={fieldId} className="sr-only">
              {labels.renameLabel(item.name)}
            </FieldLabel>
            <Input
              {...field}
              id={fieldId}
              autoFocus
              autoComplete="off"
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Button type="submit" size="sm" disabled={rename.isPending}>
        {rename.isPending && <Spinner />}
        {texts.common.save}
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

function AddForm<T extends Named>({
  labels,
  schema,
  inputId,
  create: createItem,
  refresh,
}: Pick<
  OrderedNamesProps<T>,
  "labels" | "schema" | "inputId" | "create" | "refresh"
>) {
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })
  const create = useMutation({
    mutationFn: (name: string) => createItem(name),
    onSuccess: (item) => {
      toast.success(labels.added(item.name))
      form.reset({ name: "" })
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: refresh,
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
            <FieldLabel htmlFor={inputId}>{labels.name}</FieldLabel>
            <div className="flex gap-2">
              <Input
                {...field}
                id={inputId}
                autoComplete="off"
                maxLength={MAX_NAME_LENGTH}
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

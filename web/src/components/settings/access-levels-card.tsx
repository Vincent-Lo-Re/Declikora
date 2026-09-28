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
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  accessLevelsKey,
  createAccessLevel,
  deleteAccessLevel,
  listAccessLevels,
  renameAccessLevel,
  reorderAccessLevels,
  type AccessLevel,
} from "@/lib/access-levels"
import { accessLevelNameSchema } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.settings.accessLevels

const NEW_LEVEL_INPUT = "formule-nouvelle"

// Temps laissé à l'élément pour pouvoir prendre le focus : sur une machine lente, la fenêtre de
// confirmation peut mettre plus d'une demi-seconde à se refermer.
const FOCUS_PATIENCE_MS = 2000

/**
 * Met le focus sur un élément dès qu'il peut le prendre : la fenêtre de confirmation a disparu
 * (tant qu'elle est là, elle garde le focus pour elle et le reprendrait), l'élément existe et
 * n'est plus grisé. Réessaie à chaque image, pendant FOCUS_PATIENCE_MS au plus.
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

/** Le bouton « Renommer » d'une formule (là où le focus revient après un geste sur la ligne). */
function renameButtonOf(levelId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-level-id="${levelId}"] [data-rename]`
  )
}

/**
 * Les formules d'abonnement (admins) : ajouter, renommer, ranger de la moins complète à la
 * plus complète (glisser-déposer à la souris ou au clavier), supprimer une formule inutilisée
 * ([D32]). Changer l'ordre change aussitôt ce que chaque abonné peut lire ([D2]).
 */
export function AccessLevelsCard() {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const levels = useQuery({
    queryKey: accessLevelsKey,
    queryFn: listAccessLevels,
  })
  useEffect(() => {
    if (levels.error) checkAccess(levels.error)
  }, [levels.error, checkAccess])
  const [toRemove, setToRemove] = useState<AccessLevel | null>(null)
  // Après une suppression, le bouton qui avait ouvert la confirmation disparaît avec sa ligne :
  // le focus va à la formule suivante (ou précédente), sinon au champ « Nom de la nouvelle
  // formule ». undefined : la fenêtre rend le focus comme d'habitude (Annuler, Échap).
  const focusAfterRemove = useRef<string | null | undefined>(undefined)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: accessLevelsKey })

  const onError = (error: Error) => {
    toast.error(error.message)
    checkAccess(error)
  }

  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderAccessLevels(ids),
    // L'ordre change tout de suite à l'écran ; il revient en arrière si la base refuse.
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: accessLevelsKey })
      const before = queryClient.getQueryData<AccessLevel[]>(accessLevelsKey)
      if (before) {
        const byId = new Map(before.map((level) => [level.id, level]))
        queryClient.setQueryData(
          accessLevelsKey,
          ids.flatMap((id, index) => {
            const level = byId.get(id)
            return level ? [{ ...level, rank: index + 1 }] : []
          })
        )
      }
      return { before }
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(accessLevelsKey, saved)
      toast.success(labels.reordered)
    },
    onError: (error, _ids, context) => {
      if (context?.before) {
        queryClient.setQueryData(accessLevelsKey, context.before)
      }
      onError(error)
    },
    onSettled: refresh,
  })

  const remove = useMutation({
    mutationFn: (level: AccessLevel) => deleteAccessLevel(level.id),
    onSuccess: (_, level) => {
      toast.success(labels.removed(level.name))
      const list = levels.data ?? []
      const index = list.findIndex((item) => item.id === level.id)
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
          : document.getElementById(NEW_LEVEL_INPUT)
      )
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {levels.data === undefined ? (
          levels.isError ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-destructive">
                {labels.loadFailed} {levels.error.message}
              </p>
              <Button variant="outline" onClick={() => levels.refetch()}>
                {labels.retry}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )
        ) : levels.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <SortableLevels
            levels={levels.data}
            disabled={reorder.isPending || remove.isPending}
            onReorder={(ids) => reorder.mutate(ids)}
            onRemove={(level) => {
              focusAfterRemove.current = undefined
              setToRemove(level)
            }}
          />
        )}
        <AddLevelForm />
      </CardContent>

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
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(toRemove)}
              >
                {remove.isPending && <Spinner />}
                {labels.confirmRemove.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </Card>
  )
}

/** Annonces du glisser-déposer, en français, pour les lecteurs d'écran. */
function makeAnnouncements(levels: AccessLevel[]): Announcements {
  const dnd = labels.dnd
  const nameOf = (id: UniqueIdentifier) =>
    levels.find((level) => level.id === id)?.name ?? ""
  const placeOf = (id: UniqueIdentifier) =>
    levels.findIndex((level) => level.id === id) + 1
  return {
    onDragStart: ({ active }) => dnd.start(nameOf(active.id)),
    // Au-dessus de sa propre place (au début du déplacement) : rien de neuf à dire, et « Tu
    // as pris… » n'est pas écrasé.
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? dnd.over(nameOf(active.id), placeOf(over.id), levels.length)
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? dnd.end(nameOf(active.id), placeOf(over.id), levels.length)
        : dnd.cancel(nameOf(active.id)),
    onDragCancel: ({ active }) => dnd.cancel(nameOf(active.id)),
  }
}

function SortableLevels({
  levels,
  disabled,
  onReorder,
  onRemove,
}: {
  levels: AccessLevel[]
  disabled: boolean
  onReorder: (ids: string[]) => void
  onRemove: (level: AccessLevel) => void
}) {
  const [renaming, setRenaming] = useState<string | null>(null)
  // Fin d'un renommage (Entrée, Enregistrer, Échap, Annuler) : le formulaire disparaît avec le
  // focus ; il revient sur le bouton « Renommer » de la ligne.
  const endRename = (levelId: string) => {
    setRenaming(null)
    focusSoon(() => renameButtonOf(levelId))
  }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const ids = levels.map((level) => level.id)

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
        announcements: makeAnnouncements(levels),
        screenReaderInstructions: { draggable: labels.dnd.instructions },
      }}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2" aria-label={labels.listLabel}>
          {levels.map((level, index) => (
            <SortableLevel
              key={level.id}
              level={level}
              position={index + 1}
              disabled={disabled}
              renaming={renaming === level.id}
              onRename={(open) =>
                open ? setRenaming(level.id) : endRename(level.id)
              }
              onRemove={() => onRemove(level)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function SortableLevel({
  level,
  position,
  disabled,
  renaming,
  onRename,
  onRemove,
}: {
  level: AccessLevel
  position: number
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
    id: level.id,
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
      data-level={level.name}
      data-level-id={level.id}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={labels.handle(level.name)}
        className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-50 active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-4" />
      </button>
      <span className="w-10 shrink-0 text-sm text-muted-foreground tabular-nums">
        {labels.rank(position)}
      </span>
      {renaming ? (
        <RenameForm level={level} onDone={() => onRename(false)} />
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate font-medium">
            {level.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label={labels.renameItem(level.name)}
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
            aria-label={labels.removeItem(level.name)}
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
  level,
  onDone,
}: {
  level: AccessLevel
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(accessLevelNameSchema),
    defaultValues: { name: level.name },
  })
  const rename = useMutation({
    mutationFn: (name: string) => renameAccessLevel(level.id, name),
    onSuccess: () => {
      toast.success(labels.renamed)
      onDone()
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accessLevelsKey }),
  })
  const inputId = `formule-${level.id}`
  return (
    <form
      noValidate
      className="flex min-w-0 flex-1 items-start gap-2"
      onSubmit={form.handleSubmit(({ name }) => {
        if (name === level.name) onDone()
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
              {labels.renameLabel(level.name)}
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

function AddLevelForm() {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const form = useForm({
    resolver: zodResolver(accessLevelNameSchema),
    defaultValues: { name: "" },
  })
  const create = useMutation({
    mutationFn: (name: string) => createAccessLevel(name),
    onSuccess: (level) => {
      toast.success(labels.added(level.name))
      form.reset({ name: "" })
    },
    onError: (error) => {
      form.setError("name", { message: error.message })
      checkAccess(error)
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: accessLevelsKey }),
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
            <FieldLabel htmlFor={NEW_LEVEL_INPUT}>{labels.name}</FieldLabel>
            <div className="flex gap-2">
              <Input
                {...field}
                id={NEW_LEVEL_INPUT}
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

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import {
  ArrowDown,
  ArrowUp,
  CircleOff,
  Ellipsis,
  GripVertical,
  ListTree,
  Plus,
  SquarePen,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { LoadState } from "@/components/load-state"
import {
  ElementStateBadge,
  ElementStateHint,
} from "@/components/methods/element-state-badge"
import {
  NewElementDialog,
  type NewElement,
} from "@/components/methods/new-element-dialog"
import { useAccessCheck } from "@/components/team/use-access-check"
import { editorsClosed } from "@/hooks/use-edit-lock"
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
  ContentError,
  contentProblemText,
  contentKeys,
  createContent,
  lockReleaseCreated,
} from "@/lib/contents/api"
import {
  getMethodTree,
  methodKeys,
  reorderOutline,
  setElementFlags,
  type ElementFlags,
} from "@/lib/contents/methods"
import {
  canDropOutline,
  elementState,
  findInTree,
  lessonZoneId,
  liveIds,
  moveOnDropOutline,
  moveOverOutline,
  previewByElement,
  sameOrder,
  shiftInTree,
  type LiveOutline,
  type MethodTree,
  type OutlineChapter,
  type OutlineDropData,
  type OutlineElement,
  type PreviewRow,
} from "@/lib/contents/outline"
import {
  restoreContent,
  trashContent,
  unpublishContent,
} from "@/lib/contents/publication"
import { templateKeys } from "@/lib/contents/templates"
import { formatDateTime } from "@/lib/dates"
import { errorMessage } from "@/lib/errors"
import { focusSoon } from "@/lib/focus"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import type { OutlineElementValues } from "@/lib/schemas"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.outline
const dnd = texts.methods.dnd

// ---------------------------------------------------------------------------------------------
// Noms des éléments (boutons, annonces, cases à cocher)
// ---------------------------------------------------------------------------------------------

function titleOf(element: OutlineElement): string {
  return element.title.trim() || texts.common.untitled
}

/** « chapitre 2 « Respirer » », « leçon 3 « Le souffle » » : la place dans l'arbre et le titre. */
function labelIn(tree: MethodTree, id: UniqueIdentifier): string {
  const place = findInTree(tree, String(id))
  if (!place) return ""
  return place.kind === "chapter"
    ? labels.chapterLabel(place.chapterIndex + 1, titleOf(place.element))
    : labels.lessonLabel(place.lessonIndex + 1, titleOf(place.element))
}

/** La place d'un élément après un déplacement (« leçon 2 sur 3, dans le chapitre 1 « … » »). */
function placeIn(tree: MethodTree, id: string): string {
  const place = findInTree(tree, id)
  if (!place) return ""
  if (place.kind === "chapter") {
    return labels.chapterPlace(place.chapterIndex + 1, tree.length)
  }
  return labels.lessonPlace(
    place.lessonIndex + 1,
    place.chapter.lessons.length,
    labels.chapterLabel(place.chapterIndex + 1, titleOf(place.chapter))
  )
}

/** Annonces en français pour les lecteurs d'écran. */
function makeAnnouncements(tree: MethodTree): Announcements {
  return {
    onDragStart: ({ active }) => dnd.start(labelIn(tree, active.id)),
    onDragOver: ({ active, over }) => {
      const label = labelIn(tree, active.id)
      if (over?.id === active.id) return undefined
      if (!over || !canDropOutline(tree, active.id, over.id)) {
        return dnd.outside(label)
      }
      const data = over.data.current as OutlineDropData | undefined
      if (data?.type === "zone") {
        const chapter = findInTree(tree, data.chapterId)
        return chapter?.kind === "chapter"
          ? dnd.overChapter(
              label,
              labels.chapterLabel(
                chapter.chapterIndex + 1,
                titleOf(chapter.element)
              )
            )
          : dnd.outside(label)
      }
      return dnd.over(label, labelIn(tree, over.id))
    },
    onDragEnd: ({ active, over }) => {
      const label = labelIn(tree, active.id)
      if (!over) return dnd.endOutside(label)
      // La place après le dépôt (l'arbre affiché ne l'a pas encore prise).
      const dropped = canDropOutline(tree, active.id, over.id)
        ? (moveOnDropOutline(tree, active.id, over.id) ?? tree)
        : tree
      return dnd.end(label, placeIn(dropped, String(active.id)))
    },
    onDragCancel: ({ active }) => dnd.cancel(labelIn(tree, active.id)),
  }
}

// ---------------------------------------------------------------------------------------------
// Détection des cibles
// ---------------------------------------------------------------------------------------------

/**
 * Un chapitre ne vise que les chapitres ; une leçon vise les leçons (de n'importe quel chapitre)
 * et la zone d'un chapitre vide. Au pointeur, la leçon survolée gagne, puis la zone.
 */
const outlineCollision: CollisionDetection = (args) => {
  const activeType = (args.active.data.current as OutlineDropData | undefined)
    ?.type
  const allowed = args.droppableContainers.filter((container) => {
    const data = container.data.current as OutlineDropData | undefined
    if (!data) return false
    return activeType === "chapter"
      ? data.type === "chapter"
      : data.type === "lesson" || data.type === "zone"
  })
  if (args.pointerCoordinates) {
    const within = pointerWithin({ ...args, droppableContainers: allowed })
    const typeOf = (id: UniqueIdentifier) =>
      (
        allowed.find((container) => container.id === id)?.data.current as
          OutlineDropData | undefined
      )?.type
    if (activeType === "chapter") return within
    const lesson = within.find((collision) => typeOf(collision.id) === "lesson")
    if (lesson) return [lesson]
    const zone = within.find((collision) => typeOf(collision.id) === "zone")
    return zone ? [zone] : within
  }
  return closestCenter({ ...args, droppableContainers: allowed })
}

// Ce qui est déplacé en ce moment : les cibles d'une autre sorte se désactivent.
const DraggingContext = createContext<"chapter" | "lesson" | null>(null)

// ---------------------------------------------------------------------------------------------
// Le plan
// ---------------------------------------------------------------------------------------------

type Confirmation = {
  action: "unpublish" | "trash"
  element: OutlineElement
  label: string
}

/** Ce que chaque ligne sait faire, fourni par le plan. */
type RowActions = {
  editable: boolean
  myId: string
  live: ReadonlySet<string>
  preview: ReadonlyMap<string, PreviewRow> | undefined
  // Les cases en cours d'enregistrement (valeur voulue), par élément.
  pendingFlags: ReadonlyMap<string, ElementFlags>
  setFlags: (element: OutlineElement, flags: ElementFlags) => void
  shift: (element: OutlineElement, offset: -1 | 1) => void
  confirm: (confirmation: Confirmation) => void
  newLesson: (chapter: OutlineChapter, label: string) => void
}

const RowContext = createContext<RowActions | null>(null)

function useRow(): RowActions {
  const value = useContext(RowContext)
  if (!value) throw new Error("RowContext manquant")
  return value
}

/**
 * Le plan d'une méthode, dans son écran : les chapitres et leurs leçons, rangés par
 * glisser-déposer (souris et clavier, annonces en français) ou par « Monter » / « Descendre »,
 * avec l'état de chacun dans l'app, les cases « Montrer dans l'app » et « Leçon gratuite », et
 * « Nouveau chapitre », « Nouvelle leçon », « Retirer de l'app », « Supprimer ». Ranger et
 * créer demandent de tenir la main sur la méthode (outline_reorder) ; les cases sont des
 * réglages de chaque élément, enregistrés sous son propre verrou.
 */
export function MethodOutline({
  methodId,
  editable,
  session,
  myId,
  live,
  preview,
}: {
  methodId: string
  // On tient la main sur la méthode (depuis cette ouverture de l'éditeur).
  editable: boolean
  session: string
  myId: string
  // Le plan en ligne (null : méthode pas en ligne).
  live: LiveOutline | null
  // publish_preview (undefined tant qu'il n'est pas lu).
  preview: PreviewRow[] | undefined
}) {
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  const navigate = useNavigate()
  const tree = useQuery({
    queryKey: methodKeys.tree(methodId),
    queryFn: () => getMethodTree(methodId),
    // Qui écrit quoi, et ce que les autres ont ajouté : relu régulièrement.
    refetchInterval: 30_000,
  })
  // Ouvert juste après un chapitre ou une leçon (« ← méthode ») : son éditeur rend la main en se
  // fermant ; le plan est relu ensuite, sinon il le montrerait « ouvert dans un autre onglet ».
  useEffect(() => {
    void editorsClosed().then((waited) => {
      if (waited) {
        void queryClient.invalidateQueries({
          queryKey: methodKeys.tree(methodId),
        })
        void queryClient.invalidateQueries({
          queryKey: methodKeys.preview(methodId),
        })
      }
    })
  }, [queryClient, methodId])

  // L'ordre affiché pendant un déplacement, puis jusqu'à la réponse de la base.
  const [local, setLocal] = useState<MethodTree | null>(null)
  const shown = local ?? tree.data
  const [activeId, setActiveId] = useState<string | null>(null)
  const before = useRef<MethodTree | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [newTarget, setNewTarget] = useState<NewElement | null>(null)
  const [pendingFlags, setPendingFlags] = useState<
    ReadonlyMap<string, ElementFlags>
  >(() => new Map())

  const liveSet = useMemo(() => liveIds(live), [live])
  const previewMap = useMemo(
    () => (preview ? previewByElement(preview) : undefined),
    [preview]
  )

  const refresh = useCallback(
    () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: methodKeys.all }),
        queryClient.invalidateQueries({
          queryKey: contentKeys.publication(methodId),
        }),
        queryClient.invalidateQueries({
          queryKey: contentKeys.versions(methodId),
        }),
        queryClient.invalidateQueries({ queryKey: contentKeys.lists }),
        // Un élément retiré de l'app ou mis à la corbeille ne compte plus parmi les contenus en
        // ligne à mettre à jour (modèles, fichiers remplacés).
        queryClient.invalidateQueries({ queryKey: templateKeys.allOutdated }),
        queryClient.invalidateQueries({
          queryKey: mediaKeys.allOutdated,
        }),
      ]),
    [queryClient, methodId]
  )

  /**
   * « Retirer de l'app », « Supprimer », « Annuler » et les cases changent l'élément (et, pour un
   * chapitre, ses leçons) sans toujours changer son brouillon : leur lecture en mémoire est
   * marquée périmée, pour que leur éditeur, rouvert, relise les cases enregistrées.
   */
  const forgetDetails = useCallback(
    (element: OutlineElement) => {
      const ids = [
        element.id,
        ...("lessons" in element
          ? (element as OutlineChapter).lessons.map((lesson) => lesson.id)
          : []),
      ]
      for (const id of ids) {
        void queryClient.invalidateQueries({
          queryKey: contentKeys.detail(id),
          refetchType: "none",
        })
      }
    },
    [queryClient]
  )

  // --- Ranger --------------------------------------------------------------------------------

  // Plusieurs rangements à la suite : l'ordre affiché reste le dernier voulu jusqu'au dernier.
  const reorders = useRef(0)
  const reorder = useMutation({
    mutationFn: async (next: MethodTree) => {
      reorders.current += 1
      setLocal(next)
      await reorderOutline(methodId, next, session)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: methodKeys.tree(methodId),
      })
      void queryClient.invalidateQueries({
        queryKey: methodKeys.preview(methodId),
      })
    },
    onError: (error) => {
      if (error instanceof ContentError && error.code === "plan_perime") {
        toast.error(labels.stale)
      } else {
        toast.error(labels.reorderFailed, { description: error.message })
      }
      checkAccess(error)
      void queryClient.invalidateQueries({
        queryKey: methodKeys.tree(methodId),
      })
    },
    onSettled: () => {
      reorders.current -= 1
      if (reorders.current === 0) setLocal(null)
    },
  })

  const shift = (element: OutlineElement, offset: -1 | 1) => {
    if (!shown || !editable) return
    const next = shiftInTree(shown, element.id, offset)
    if (!next) return
    reorder.mutate(next)
    setAnnouncement(
      labels.moved(labelIn(shown, element.id), placeIn(next, element.id))
    )
    // La ligne change de place (une leçon, parfois de chapitre) : le focus la suit, une fois le
    // menu fermé et la ligne à sa nouvelle place.
    focusSoon(() => movedActionsButton(next, element.id))
  }

  // --- Cases « Montrer dans l'app » et « Leçon gratuite » -------------------------------------

  const flags = useMutation({
    mutationFn: ({
      element,
      flags: wanted,
    }: {
      element: OutlineElement
      flags: ElementFlags
    }) => setElementFlags(element.id, wanted, myId),
    onMutate: ({ element, flags: wanted }) =>
      setPendingFlags((current) =>
        new Map(current).set(element.id, {
          ...current.get(element.id),
          ...wanted,
        })
      ),
    onError: (error) => {
      toast.error(labels.flagsFailed, {
        description:
          error instanceof ContentError
            ? (error.detail ?? error.message)
            : error.message,
      })
      checkAccess(error)
    },
    onSettled: async (_data, _error, { element }) => {
      forgetDetails(element)
      await refresh()
      setPendingFlags((current) => {
        const next = new Map(current)
        next.delete(element.id)
        return next
      })
    },
  })

  // --- Retirer de l'app, supprimer -------------------------------------------------------------

  const undoTrash = async (element: OutlineElement, label: string) => {
    try {
      await restoreContent(element.id)
      toast.success(labels.restored(label))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      forgetDetails(element)
      await refresh()
      void queryClient.invalidateQueries({ queryKey: trashKey })
      // Il revient en fin de liste : le focus va à son bouton « Actions ».
      focusSoon(() => actionsButtonOf(element.id))
    }
  }

  // Après « Retirer de l'app » ou « Supprimer » : où mettre le focus une fois la fenêtre fermée
  // et le plan relu (le bouton qui l'avait ouverte disparaît avec sa ligne). undefined : la
  // fenêtre rend le focus comme d'habitude (Annuler, Échap, échec).
  const focusAfterAct = useRef<(() => HTMLElement | null) | undefined>(
    undefined
  )

  const act = useMutation({
    mutationFn: async ({ action, element }: Confirmation) => {
      if (action === "unpublish") {
        return { needsFileSync: await unpublishContent(element.id) }
      }
      return trashContent(element.id)
    },
    onSuccess: (result, { action, element, label }) => {
      if (action === "unpublish") {
        focusAfterAct.current = () => actionsButtonOf(element.id)
      } else {
        focusAfterAct.current = shown
          ? focusTargetAfterRemove(shown, element.id)
          : undefined
      }
      setConfirmation(null)
      if (action === "unpublish") {
        toast.success(labels.unpublished(label))
      } else {
        toast.success(labels.trashed(label), {
          action: {
            label: labels.undo,
            onClick: () => void undoTrash(element, label),
          },
        })
      }
      // Ses fichiers redeviennent peut-être protégés : tout de suite.
      if (result.needsFileSync) void kickFiles()
    },
    onError: (error) => {
      setConfirmation(null)
      toast.error(error.message, {
        description:
          error instanceof ContentError
            ? (error.detail ?? undefined)
            : undefined,
      })
      checkAccess(error)
    },
    onSettled: async (_data, _error, { element }) => {
      forgetDetails(element)
      void queryClient.invalidateQueries({ queryKey: trashKey })
      void queryClient.invalidateQueries({
        queryKey: mediaKeys.allUses,
      })
      await refresh()
      const find = focusAfterAct.current
      if (find) focusSoon(find)
    },
  })

  // --- Nouveau chapitre, nouvelle leçon ----------------------------------------------------------

  // Vrai après une création : le focus va au nouvel élément, et non au bouton qui a ouvert la
  // fenêtre.
  const focusAfterCreate = useRef(false)
  const openNew = (target: NewElement) => {
    focusAfterCreate.current = false
    setNewTarget(target)
  }

  const create = useMutation({
    mutationFn: async ({
      target,
      values,
      open,
    }: {
      target: NewElement
      values: OutlineElementValues
      open: boolean
    }) => {
      const kind = target.kind
      const created = await createContent(
        kind,
        values.title.trim(),
        values.starter || null,
        kind === "chapter" ? methodId : target.chapterId
      )
      // On reste sur le plan : le verrou que content_create donne à son auteur est rendu.
      if (!open) await lockReleaseCreated(created.id).catch(() => false)
      return created
    },
    onSuccess: (created, { target, open }) => {
      // La fenêtre ne rend pas le focus à « Nouveau chapitre » : il va au nouvel élément.
      focusAfterCreate.current = true
      setNewTarget(null)
      queryClient.setQueryData(contentKeys.detail(created.id), created)
      const path = contentEditorPath(target.kind, created.id)
      if (open && path) {
        void navigate(path)
        return
      }
      const name = created.title.trim() || texts.common.untitled
      toast.success(texts.methods.create.created[target.kind](name), {
        action: path
          ? {
              label: texts.methods.create.open,
              onClick: () => void navigate(path),
            }
          : undefined,
      })
      // Le focus va au titre du nouvel élément, une fois le plan relu et la fenêtre fermée.
      void queryClient
        .invalidateQueries({ queryKey: methodKeys.tree(methodId) })
        .then(() => focusSoon(() => titleLinkOf(created.id)))
    },
    onError: (error) => checkAccess(error),
    onSettled: () => void refresh(),
  })

  // --- Glisser-déposer -------------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const announcements = useMemo(() => makeAnnouncements(shown ?? []), [shown])
  // Dernière cible, gardée le temps qu'une leçon change de chapitre (sinon elle repartirait).
  const lastOver = useRef<UniqueIdentifier | null>(null)
  const justMoved = useRef(false)
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (justMoved.current && lastOver.current !== null) {
      return [{ id: lastOver.current }]
    }
    const found = outlineCollision(args)
    if (found.length > 0) {
      lastOver.current = found[0].id
      return found
    }
    return lastOver.current !== null ? [{ id: lastOver.current }] : []
  }, [])

  const onDragStart = ({ active }: DragStartEvent) => {
    before.current = shown ?? null
    lastOver.current = null
    setActiveId(String(active.id))
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !shown) return
    const translated = active.rect.current.translated
    const below = translated
      ? translated.top + translated.height / 2 >
        over.rect.top + over.rect.height / 2
      : false
    const moved = moveOverOutline(shown, active.id, over.id, below)
    if (!moved) return
    justMoved.current = true
    lastOver.current = active.id
    requestAnimationFrame(() => {
      justMoved.current = false
    })
    setLocal(moved)
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    lastOver.current = null
    const start = before.current
    before.current = null
    const current = shown
    if (!start || !current) return
    const dropped =
      over && canDropOutline(current, active.id, over.id)
        ? (moveOnDropOutline(current, active.id, over.id) ?? current)
        : over
          ? current
          : start
    if (sameOrder(dropped, start)) {
      if (reorders.current === 0) setLocal(null)
      return
    }
    reorder.mutate(dropped)
  }

  const onDragCancel = () => {
    setActiveId(null)
    lastOver.current = null
    before.current = null
    if (reorders.current === 0) setLocal(null)
  }

  const active = activeId && shown ? findInTree(shown, activeId) : null

  const row: RowActions = {
    editable,
    myId,
    live: liveSet,
    preview: previewMap,
    pendingFlags,
    setFlags: (element, wanted) => flags.mutate({ element, flags: wanted }),
    shift,
    confirm: (wanted) => {
      focusAfterAct.current = undefined
      setConfirmation(wanted)
    },
    newLesson: (chapter, label) =>
      openNew({
        kind: "lesson",
        chapterId: chapter.id,
        chapterLabel: label,
      }),
  }

  return (
    <section
      aria-labelledby="plan-methode-titre"
      className="flex flex-col gap-4 p-6"
      data-method-outline
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl space-y-1">
          <h2 id="plan-methode-titre" className="text-base font-semibold">
            {labels.title}
          </h2>
          <p className="text-sm text-muted-foreground">{labels.description}</p>
        </div>
        {editable && (
          <Button data-new-chapter onClick={() => openNew({ kind: "chapter" })}>
            <Plus />
            {labels.newChapter}
          </Button>
        )}
      </div>
      {!editable && (
        <p className="text-sm text-muted-foreground">{labels.readOnly}</p>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {shown === undefined ? (
        <LoadState
          query={tree}
          failed={labels.loadFailed}
          rowClassName="h-20 w-full"
        />
      ) : shown.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListTree />
            </EmptyMedia>
            <EmptyTitle>{labels.emptyTitle}</EmptyTitle>
            <EmptyDescription>{labels.emptyDescription}</EmptyDescription>
          </EmptyHeader>
          {editable && (
            <Button
              variant="outline"
              onClick={() => openNew({ kind: "chapter" })}
            >
              <Plus />
              {labels.newChapter}
            </Button>
          )}
        </Empty>
      ) : (
        <>
          {tree.isError && (
            <p className="text-sm text-muted-foreground">
              {labels.refreshFailed}
            </p>
          )}
          <RowContext value={row}>
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              accessibility={{
                announcements,
                screenReaderInstructions: { draggable: dnd.instructions },
              }}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              onDragCancel={onDragCancel}
            >
              <TreeContext value={shown}>
                <DraggingContext value={active?.kind ?? null}>
                  <SortableContext
                    id="chapitres"
                    items={shown.map((chapter) => chapter.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ol aria-label={labels.label} className="space-y-3">
                      {shown.map((chapter, index) => (
                        <ChapterItem
                          key={chapter.id}
                          chapter={chapter}
                          position={index + 1}
                          count={shown.length}
                          isFirst={index === 0}
                          isLast={index === shown.length - 1}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DraggingContext>
              </TreeContext>
              <DragOverlay dropAnimation={null}>
                {active && shown ? (
                  <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
                    <GripVertical
                      aria-hidden
                      className="size-4 text-muted-foreground"
                    />
                    {labelIn(shown, active.element.id)}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </RowContext>
        </>
      )}

      <NewElementDialog
        target={newTarget}
        finalFocus={() => !focusAfterCreate.current}
        onOpenChange={(open) => {
          if (!open) {
            setNewTarget(null)
            create.reset()
          }
        }}
        pending={create.isPending}
        error={
          create.error
            ? `${texts.methods.create.failed} ${create.error.message}`
            : null
        }
        onSubmit={(values, open) => {
          if (newTarget) create.mutate({ target: newTarget, values, open })
        }}
      />

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !act.isPending) setConfirmation(null)
        }}
      >
        {confirmation && (
          <AlertDialogContent
            // Après le geste, le focus est placé ci-dessus, une fois le plan relu.
            finalFocus={() => focusAfterAct.current === undefined}
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmation.action === "unpublish"
                  ? labels.confirmUnpublish.title(confirmation.label)
                  : labels.confirmTrash.title(confirmation.label)}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation.action === "unpublish"
                  ? labels.confirmUnpublish[confirmation.element.kind]
                  : labels.confirmTrash[confirmation.element.kind]}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={act.isPending}>
                {texts.common.cancel}
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={act.isPending}
                onClick={() => act.mutate(confirmation)}
              >
                {act.isPending ? (
                  <Spinner />
                ) : confirmation.action === "unpublish" ? (
                  <CircleOff />
                ) : (
                  <Trash2 />
                )}
                {confirmation.action === "unpublish"
                  ? labels.confirmUnpublish.confirm
                  : labels.confirmTrash.confirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </section>
  )
}

/** Le bouton « Actions pour … » d'un élément du plan. */
function actionsButtonOf(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-outline-actions="${id}"]`)
}

/** Le titre (lien vers son éditeur) d'un élément du plan. */
function titleLinkOf(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-outline-id="${id}"] [data-outline-title]`
  )
}

/**
 * Le bouton « Actions » d'un élément rangé, seulement une fois sa ligne à la place qu'elle a
 * dans `tree` (avant, React la déplacera encore, et le focus serait perdu).
 */
function movedActionsButton(tree: MethodTree, id: string): HTMLElement | null {
  const place = findInTree(tree, id)
  if (!place) return null
  const rows =
    place.kind === "chapter"
      ? document.querySelectorAll<HTMLElement>('[data-outline-kind="chapter"]')
      : document.querySelectorAll<HTMLElement>(
          `[data-outline-id="${place.chapter.id}"] [data-outline-kind="lesson"]`
        )
  const index =
    place.kind === "chapter" ? place.chapterIndex : place.lessonIndex
  return rows[index]?.dataset.outlineId === id ? actionsButtonOf(id) : null
}

/**
 * Où va le focus quand un élément quitte le plan : l'élément suivant, sinon le précédent ; sinon
 * « Nouvelle leçon » de son chapitre (ou le chapitre), ou « Nouveau chapitre ».
 */
function focusTargetAfterRemove(
  tree: MethodTree,
  id: string
): () => HTMLElement | null {
  const place = findInTree(tree, id)
  if (!place) return () => null
  if (place.kind === "chapter") {
    const neighbour =
      tree[place.chapterIndex + 1] ?? tree[place.chapterIndex - 1]
    return () =>
      neighbour
        ? actionsButtonOf(neighbour.id)
        : document.querySelector<HTMLElement>("[data-new-chapter]")
  }
  const lessons = place.chapter.lessons
  const neighbour =
    lessons[place.lessonIndex + 1] ?? lessons[place.lessonIndex - 1]
  const chapterId = place.chapter.id
  return () =>
    neighbour
      ? actionsButtonOf(neighbour.id)
      : (document.querySelector<HTMLElement>(
          `[data-new-lesson="${chapterId}"]`
        ) ?? actionsButtonOf(chapterId))
}

// ---------------------------------------------------------------------------------------------
// Un chapitre et ses leçons
// ---------------------------------------------------------------------------------------------

function ChapterItem({
  chapter,
  position,
  count,
  isFirst,
  isLast,
}: {
  chapter: OutlineChapter
  position: number
  count: number
  isFirst: boolean
  isLast: boolean
}) {
  const { editable, newLesson } = useRow()
  const dragging = useContext(DraggingContext)
  const data: OutlineDropData = { type: "chapter" }
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: chapter.id,
    data,
    attributes: { roleDescription: dnd.roleDescription },
    disabled: { draggable: !editable, droppable: dragging === "lesson" },
  })
  const { setNodeRef: setZoneRef, isOver: overZone } = useDroppable({
    id: lessonZoneId(chapter.id),
    data: { type: "zone", chapterId: chapter.id } satisfies OutlineDropData,
    disabled: chapter.lessons.length > 0 || dragging !== "lesson",
  })
  const label = labels.chapterLabel(position, titleOf(chapter))
  return (
    <li
      ref={setNodeRef}
      data-outline-id={chapter.id}
      data-outline-kind="chapter"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-xs",
        isDragging && "opacity-40"
      )}
    >
      <ElementRow
        element={chapter}
        number={labels.chapterNumber(position)}
        label={label}
        chapterInApp
        handle={
          editable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={labels.handle(label)}
              title={labels.handle(label)}
              className={HANDLE_CLASS}
            >
              <GripVertical className="size-4" />
            </button>
          )
        }
        isFirst={isFirst}
        isLast={isLast}
        canGoFurther={count > 1}
      />
      <SortableContext
        id={chapter.id}
        items={chapter.lessons.map((lesson) => lesson.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol
          ref={setZoneRef}
          aria-label={label}
          className={cn(
            "space-y-2 border-t bg-muted/40 px-3 py-3 pl-9",
            overZone && "bg-accent"
          )}
        >
          {chapter.lessons.length === 0 && (
            <li className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {labels.noLessons}
            </li>
          )}
          {chapter.lessons.map((lesson, index) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              chapter={chapter}
              position={index + 1}
            />
          ))}
          {editable && (
            <li>
              <Button
                variant="ghost"
                size="sm"
                aria-label={labels.newLessonIn(label)}
                data-new-lesson={chapter.id}
                onClick={() => newLesson(chapter, label)}
              >
                <Plus />
                {labels.newLesson}
              </Button>
            </li>
          )}
        </ol>
      </SortableContext>
    </li>
  )
}

function LessonItem({
  lesson,
  chapter,
  position,
}: {
  lesson: OutlineElement
  chapter: OutlineChapter
  position: number
}) {
  const { editable, pendingFlags } = useRow()
  const dragging = useContext(DraggingContext)
  const data: OutlineDropData = { type: "lesson", chapterId: chapter.id }
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lesson.id,
    data,
    attributes: { roleDescription: dnd.roleDescription },
    disabled: { draggable: !editable, droppable: dragging === "chapter" },
  })
  const tree = useContext(TreeContext)
  const place = tree ? findInTree(tree, lesson.id) : null
  const isFirst =
    place?.kind === "lesson" &&
    place.chapterIndex === 0 &&
    place.lessonIndex === 0
  const isLast =
    place?.kind === "lesson" &&
    tree !== null &&
    place.chapterIndex === tree.length - 1 &&
    place.lessonIndex === place.chapter.lessons.length - 1
  const chapterInApp = pendingFlags.get(chapter.id)?.in_app ?? chapter.inApp
  const label = labels.lessonLabel(position, titleOf(lesson))
  return (
    <li
      ref={setNodeRef}
      data-outline-id={lesson.id}
      data-outline-kind="lesson"
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(
        "rounded-md border bg-background",
        isDragging && "opacity-40"
      )}
    >
      <ElementRow
        element={lesson}
        number={labels.lessonNumber(position)}
        label={label}
        chapterInApp={chapterInApp}
        handle={
          editable && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={labels.handle(label)}
              title={labels.handle(label)}
              className={HANDLE_CLASS}
            >
              <GripVertical className="size-4" />
            </button>
          )
        }
        isFirst={isFirst}
        isLast={isLast}
        canGoFurther
        compact
      />
    </li>
  )
}

const HANDLE_CLASS =
  "mt-0.5 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"

// L'arbre affiché, pour « Monter » et « Descendre » d'une leçon (qui peut changer de chapitre).
const TreeContext = createContext<MethodTree | null>(null)

/** Une ligne du plan : poignée, numéro, titre, état, cases à cocher, actions. */
function ElementRow({
  element,
  number,
  label,
  chapterInApp,
  handle,
  isFirst,
  isLast,
  canGoFurther,
  compact = false,
}: {
  element: OutlineElement
  number: string
  label: string
  chapterInApp: boolean
  // La poignée du glisser-déposer (rien en lecture seule).
  handle: ReactNode
  isFirst: boolean
  isLast: boolean
  canGoFurther: boolean
  compact?: boolean
}) {
  const {
    editable,
    myId,
    live,
    preview,
    pendingFlags,
    setFlags,
    shift,
    confirm,
  } = useRow()
  const pending = pendingFlags.get(element.id)
  const inApp = pending?.in_app ?? element.inApp
  const isFree = pending?.is_free ?? element.isFree
  const state = elementState({ ...element, inApp }, chapterInApp, live, preview)
  const row = preview?.get(element.id)
  const path = contentEditorPath(element.kind, element.id)
  const editing =
    element.editingId === null
      ? null
      : element.editingId === myId
        ? labels.openElsewhere
        : labels.editing(element.editingName ?? texts.editor.lock.someone)
  return (
    <div className={cn("flex items-start gap-2", compact ? "p-2" : "p-3")}>
      {handle || <span className="w-2 shrink-0" />}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-xs text-muted-foreground">
            {number}
          </span>
          {path ? (
            <Link
              to={path}
              data-outline-title
              className={cn(
                "min-w-0 truncate underline-offset-4 hover:underline",
                compact ? "text-sm font-medium" : "font-semibold"
              )}
            >
              {titleOf(element)}
            </Link>
          ) : (
            <span data-outline-title className="truncate font-medium">
              {titleOf(element)}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <ElementStateBadge state={state} />
          {element.kind === "lesson" && isFree && (
            <Badge variant="outline">{labels.free}</Badge>
          )}
          {row?.problem && (
            <Badge
              variant="destructive"
              title={contentProblemText(row.problem, row.problemDetail)}
              data-element-problem={row.problem}
            >
              <TriangleAlert aria-hidden />
              {labels.problem}
            </Badge>
          )}
          {editing && <Badge variant="secondary">{editing}</Badge>}
          <span className="text-xs text-muted-foreground">
            {labels.savedAt(formatDateTime(element.draftSavedAt))}
            {element.savedByName &&
              ` ${texts.common.savedBy(element.savedByName)}`}
          </span>
        </div>
        <ElementStateHint state={state} />
        {row?.problem && (
          <p className="text-xs text-destructive">
            {contentProblemText(row.problem, row.problemDetail)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-0.5">
          <FlagCheckbox
            label={labels.inApp}
            ariaLabel={labels.inAppFor(label)}
            checked={inApp}
            pending={pending?.in_app !== undefined}
            onChange={(checked) => setFlags(element, { in_app: checked })}
          />
          {element.kind === "lesson" && (
            <FlagCheckbox
              label={labels.isFree}
              ariaLabel={labels.isFreeFor(label)}
              checked={isFree}
              pending={pending?.is_free !== undefined}
              onChange={(checked) => setFlags(element, { is_free: checked })}
            />
          )}
        </div>
      </div>
      <ElementMenu
        element={element}
        label={label}
        path={path}
        inLive={live.has(element.id)}
        canMoveUp={editable && canGoFurther && !isFirst}
        canMoveDown={editable && canGoFurther && !isLast}
        onShift={(offset) => shift(element, offset)}
        onConfirm={(action) => confirm({ action, element, label })}
      />
    </div>
  )
}

function FlagCheckbox({
  label,
  ariaLabel,
  checked,
  pending,
  onChange,
}: {
  label: string
  // Le nom complet, avec l'élément (plusieurs cases portent le même mot à l'écran).
  ariaLabel: string
  checked: boolean
  pending: boolean
  onChange: (checked: boolean) => void
}) {
  const nameId = useId()
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        aria-labelledby={nameId}
        checked={checked}
        disabled={pending}
        onCheckedChange={(value) => onChange(value)}
      />
      {label}
      <span id={nameId} className="sr-only">
        {ariaLabel}
      </span>
      {pending && <Spinner className="size-3" />}
    </label>
  )
}

function ElementMenu({
  element,
  label,
  path,
  inLive,
  canMoveUp,
  canMoveDown,
  onShift,
  onConfirm,
}: {
  element: OutlineElement
  label: string
  path: string | null
  inLive: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onShift: (offset: -1 | 1) => void
  onConfirm: (action: "unpublish" | "trash") => void
}): ReactNode {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.actions(label)}
        data-outline-actions={element.id}
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {path && (
          <DropdownMenuItem onClick={() => void navigate(path)}>
            <SquarePen />
            {labels.open}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={!canMoveUp} onClick={() => onShift(-1)}>
          <ArrowUp />
          {labels.moveUp}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMoveDown} onClick={() => onShift(1)}>
          <ArrowDown />
          {labels.moveDown}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {inLive && (
          <DropdownMenuItem onClick={() => onConfirm("unpublish")}>
            <CircleOff />
            {labels.unpublish}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          variant="destructive"
          onClick={() => onConfirm("trash")}
          data-element-kind={element.kind}
        >
          <Trash2 />
          {labels.trash}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

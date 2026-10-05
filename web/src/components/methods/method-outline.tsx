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
  ChevronDown,
  ChevronRight,
  CircleOff,
  Ellipsis,
  Eye,
  GripVertical,
  ListTree,
  LockOpen,
  PenLine,
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
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { AddBlockButton } from "@/components/editor/add-block-button"
import { ColumnHeader } from "@/components/editor/column-header"
import { InfoTip } from "@/components/info-tip"
import { LoadState } from "@/components/load-state"
import { ElementStateDot } from "@/components/methods/element-state-badge"
import {
  NewElementDialog,
  type NewElement,
} from "@/components/methods/new-element-dialog"
import { useAccessCheck } from "@/components/team/use-access-check"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  exerciseCount,
  exerciseZoneId,
  findInTree,
  lessonCount,
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
  type OutlineLesson,
  type ParentsInApp,
  type PreviewRow,
} from "@/lib/contents/outline"
import {
  restoreContent,
  trashContent,
  unpublishContent,
} from "@/lib/contents/publication"
import { templateKeys } from "@/lib/contents/templates"
import { errorMessage } from "@/lib/errors"
import { focusSoon } from "@/lib/focus"
import { kickFiles, mediaKeys, trashKey } from "@/lib/media/api"
import type { OutlineElementValues } from "@/lib/schemas"
import { contentEditorPath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.outline
const dnd = texts.methods.dnd

// « Nouveau chapitre », en bas de la colonne (le focus y revient après une création annulée).
const NEW_CHAPTER_ID = "plan-nouveau-chapitre"

// ---------------------------------------------------------------------------------------------
// Noms des éléments (boutons, annonces, cases à cocher)
// ---------------------------------------------------------------------------------------------

function titleOf(element: OutlineElement): string {
  return element.title.trim() || texts.common.untitled
}

/**
 * « chapitre 2 « Respirer » », « leçon 3 « Le souffle » », « exercice 1 « Inspirer » » : la place
 * dans son parent et le titre.
 */
function labelIn(tree: MethodTree, id: UniqueIdentifier): string {
  const place = findInTree(tree, String(id))
  if (!place) return ""
  switch (place.kind) {
    case "chapter":
      return labels.chapterLabel(place.chapterIndex + 1, titleOf(place.element))
    case "lesson":
      return labels.lessonLabel(place.lessonIndex + 1, titleOf(place.element))
    case "exercise":
      return labels.exerciseLabel(
        place.exerciseIndex + 1,
        titleOf(place.element)
      )
  }
}

/**
 * La place d'un élément après un déplacement (« leçon 2 sur 3, dans le chapitre 1 « … » »,
 * « exercice 1 sur 2, dans la leçon 3 « … » »).
 */
function placeIn(tree: MethodTree, id: string): string {
  const place = findInTree(tree, id)
  if (!place) return ""
  switch (place.kind) {
    case "chapter":
      return labels.chapterPlace(place.chapterIndex + 1, tree.length)
    case "lesson":
      return labels.lessonPlace(
        place.lessonIndex + 1,
        place.chapter.lessons.length,
        labels.chapterLabel(place.chapterIndex + 1, titleOf(place.chapter))
      )
    case "exercise":
      return labels.exercisePlace(
        place.exerciseIndex + 1,
        place.lesson.exercises.length,
        labels.lessonLabel(place.lessonIndex + 1, titleOf(place.lesson))
      )
  }
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
      if (data?.type === "exerciseZone") {
        return findInTree(tree, data.lessonId)?.kind === "lesson"
          ? dnd.overLesson(label, labelIn(tree, data.lessonId))
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

// Les cibles de chaque sorte d'élément déplacé : l'élément visé d'abord, puis la zone d'un
// parent vide.
const TARGETS: Record<
  OutlineElement["kind"],
  readonly [OutlineDropData["type"], OutlineDropData["type"] | null]
> = {
  chapter: ["chapter", null],
  lesson: ["lesson", "zone"],
  exercise: ["exercise", "exerciseZone"],
}

/**
 * Un chapitre ne vise que les chapitres ; une leçon vise les leçons (de n'importe quel chapitre)
 * et la zone d'un chapitre vide ; un exercice, les exercices (de n'importe quelle leçon) et la
 * zone d'une leçon vide. Au pointeur, l'élément survolé gagne, puis la zone.
 */
const outlineCollision: CollisionDetection = (args) => {
  const activeType = (args.active.data.current as OutlineDropData | undefined)
    ?.type
  const [item, zone] =
    activeType === "chapter" || activeType === "exercise"
      ? TARGETS[activeType]
      : TARGETS.lesson
  const allowed = args.droppableContainers.filter((container) => {
    const data = container.data.current as OutlineDropData | undefined
    return data?.type === item || (zone !== null && data?.type === zone)
  })
  if (args.pointerCoordinates) {
    const within = pointerWithin({ ...args, droppableContainers: allowed })
    const typeOf = (id: UniqueIdentifier) =>
      (
        allowed.find((container) => container.id === id)?.data.current as
          OutlineDropData | undefined
      )?.type
    if (zone === null) return within
    const element = within.find((collision) => typeOf(collision.id) === item)
    if (element) return [element]
    const empty = within.find((collision) => typeOf(collision.id) === zone)
    return empty ? [empty] : within
  }
  return closestCenter({ ...args, droppableContainers: allowed })
}

// Ce qui est déplacé en ce moment : les cibles d'une autre sorte se désactivent.
const DraggingContext = createContext<OutlineElement["kind"] | null>(null)

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
  newExercise: (lesson: OutlineLesson, label: string) => void
  // Les leçons dont les exercices sont repliés.
  folded: ReadonlySet<string>
  toggleFold: (lesson: OutlineLesson) => void
}

const RowContext = createContext<RowActions | null>(null)

function useRow(): RowActions {
  const value = useContext(RowContext)
  if (!value) throw new Error("RowContext manquant")
  return value
}

/**
 * Le plan d'une méthode, dans la colonne de gauche de son écran (ADMIN § 4) : les chapitres, leurs
 * leçons et les exercices de chaque leçon (une flèche les replie), rangés par glisser-déposer
 * (souris et clavier, annonces en français) ou par « Monter » / « Descendre », l'état de chacun
 * dans l'app en pastille ; dans le menu ⋯ de chaque ligne, « Montrer dans l'app », « Leçon
 * gratuite », « Nouvel exercice » (une leçon), « Retirer de l'app » et « Mettre à la corbeille » ;
 * « Nouvelle leçon » dans chaque chapitre et « Nouveau chapitre » en bas. Ranger et créer
 * demandent de tenir la main sur la méthode (outline_reorder) ; les cases sont des réglages de
 * chaque élément, enregistrés sous son propre verrou.
 */
export function MethodOutline({
  methodId,
  editable,
  session,
  myId,
  live,
  preview,
  back,
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
  // Le retour, dans l'en-tête du plan (la flèche vers la liste des méthodes).
  back: ReactNode
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
  const [folded, setFolded] = useState<ReadonlySet<string>>(() => new Set())

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
   * « Retirer de l'app », « Supprimer », « Annuler » et les cases changent l'élément (et ce qu'il
   * contient) sans toujours changer son brouillon : leur lecture en mémoire est marquée périmée,
   * pour que leur éditeur, rouvert, relise les cases enregistrées.
   */
  const forgetDetails = useCallback(
    (element: OutlineElement) => {
      const lessons =
        element.kind === "chapter"
          ? (element as OutlineChapter).lessons
          : element.kind === "lesson"
            ? [element as OutlineLesson]
            : []
      const ids = [
        element.id,
        ...lessons.flatMap((lesson) => [
          lesson.id,
          ...lesson.exercises.map((exercise) => exercise.id),
        ]),
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
      const created = await createContent(
        target.kind,
        values.title.trim(),
        values.starter || null,
        target.kind === "chapter"
          ? methodId
          : target.kind === "lesson"
            ? target.chapterId
            : target.lessonId
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
    newExercise: (lesson, label) => {
      // Ses exercices se déplient : le nouveau y sera visible.
      setFolded((current) => {
        const next = new Set(current)
        next.delete(lesson.id)
        return next
      })
      openNew({ kind: "exercise", lessonId: lesson.id, lessonLabel: label })
    },
    folded,
    toggleFold: (lesson) =>
      setFolded((current) => {
        const next = new Set(current)
        if (!next.delete(lesson.id)) next.add(lesson.id)
        return next
      }),
  }

  const lessons = shown ? lessonCount(shown) : 0
  const exercises = shown ? exerciseCount(shown) : 0
  return (
    <div className="flex h-full flex-col">
      <section
        aria-labelledby="plan-methode-titre"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-3"
        data-method-outline
      >
        {/* Le haut du plan reste en haut de la colonne quand les lignes défilent, sur un fond
            plein qui couvre aussi la marge. */}
        <div className="sticky top-0 z-10 -mx-4 bg-background px-4">
          <ColumnHeader
            icon={ListTree}
            title={labels.title}
            titleId="plan-methode-titre"
            back={back}
            className="-mx-4 mb-2"
          >
            <InfoTip text={labels.description} />
          </ColumnHeader>
          {shown && shown.length > 0 && (
            <p className="px-2 pb-2 text-xs text-muted-foreground">
              {labels.count(shown.length, lessons, exercises)}
            </p>
          )}
          {!editable && (
            <p className="px-2 pb-2 text-xs text-muted-foreground">
              {labels.readOnly}
            </p>
          )}
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>

        {shown === undefined ? (
          <LoadState
            query={tree}
            failed={labels.loadFailed}
            rowClassName="h-8 w-full"
          />
        ) : shown.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <>
            {tree.isError && (
              <p className="px-2 pb-2 text-xs text-muted-foreground">
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
                      <ol aria-label={labels.label} className="grid gap-1">
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
      </section>

      {/* En bas, de la même hauteur que le bas de la colonne de droite : « Nouveau chapitre » sur
          toute la largeur (le retour est en haut, dans l'en-tête du plan). */}
      <div className="flex h-feed-footer shrink-0 items-stretch border-t">
        <div className="flex min-w-0 flex-1 items-center px-4">
          <AddBlockButton
            id={NEW_CHAPTER_ID}
            label={labels.newChapter}
            disabled={!editable}
            onClick={() => openNew({ kind: "chapter" })}
          />
        </div>
      </div>

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
    </div>
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
  const [rows, index] =
    place.kind === "chapter"
      ? [
          document.querySelectorAll<HTMLElement>(
            '[data-outline-kind="chapter"]'
          ),
          place.chapterIndex,
        ]
      : place.kind === "lesson"
        ? [
            document.querySelectorAll<HTMLElement>(
              `[data-outline-id="${place.chapter.id}"] [data-outline-kind="lesson"]`
            ),
            place.lessonIndex,
          ]
        : [
            document.querySelectorAll<HTMLElement>(
              `[data-outline-id="${place.lesson.id}"] [data-outline-kind="exercise"]`
            ),
            place.exerciseIndex,
          ]
  return rows[index]?.dataset.outlineId === id ? actionsButtonOf(id) : null
}

/**
 * Où va le focus quand un élément quitte le plan : l'élément suivant, sinon le précédent ; sinon
 * « Nouvelle leçon » de son chapitre (ou le chapitre), sa leçon pour un exercice, ou « Nouveau
 * chapitre ».
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
  if (place.kind === "exercise") {
    const siblings = place.lesson.exercises
    const neighbour =
      siblings[place.exerciseIndex + 1] ?? siblings[place.exerciseIndex - 1]
    const lessonId = place.lesson.id
    return () => actionsButtonOf(neighbour?.id ?? lessonId)
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
    disabled: {
      draggable: !editable,
      droppable: dragging !== null && dragging !== "chapter",
    },
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
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn("grid gap-0.5", isDragging && "opacity-40")}
    >
      <ElementRow
        element={chapter}
        number={labels.chapterNumber(position)}
        label={label}
        parents={{ chapter: true, lesson: true }}
        handle={
          editable && (
            <OutlineHandle
              label={label}
              sortable={{
                setActivatorNodeRef,
                attributes,
                listeners,
                isDragging,
              }}
            />
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
        {/* Le trait part du début des lignes (après la place des poignées), comme les blocs d'une
            section dans le plan du Fil. */}
        <ol
          ref={setZoneRef}
          aria-label={label}
          className={cn(
            "ml-5 grid min-h-2 gap-0.5 rounded-md border-l pl-1.5",
            overZone && "bg-accent"
          )}
        >
          {chapter.lessons.length === 0 && (
            <li className="px-2 py-1.5 text-xs text-muted-foreground">
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
            <li className="py-1 pl-5">
              <AddBlockButton
                label={labels.newLesson}
                ariaLabel={labels.newLessonIn(label)}
                className="py-1.5 text-xs"
                onClick={() => newLesson(chapter, label)}
              />
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
  lesson: OutlineLesson
  chapter: OutlineChapter
  position: number
}) {
  const { editable, pendingFlags, folded, toggleFold } = useRow()
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
    disabled: {
      draggable: !editable,
      droppable: dragging !== null && dragging !== "lesson",
    },
  })
  const { setNodeRef: setZoneRef, isOver: overZone } = useDroppable({
    id: exerciseZoneId(lesson.id),
    data: {
      type: "exerciseZone",
      lessonId: lesson.id,
    } satisfies OutlineDropData,
    disabled: lesson.exercises.length > 0 || dragging !== "exercise",
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
  const lessonInApp = pendingFlags.get(lesson.id)?.in_app ?? lesson.inApp
  const label = labels.lessonLabel(position, titleOf(lesson))
  // Ses exercices, sauf repliés ; tous se déplient pendant qu'un exercice est déplacé (il peut
  // changer de leçon).
  const hasExercises = lesson.exercises.length > 0
  const open = !folded.has(lesson.id) || dragging === "exercise"
  const listId = `exercices-${lesson.id}`
  return (
    <li
      ref={setNodeRef}
      data-outline-id={lesson.id}
      data-outline-kind="lesson"
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn("grid gap-0.5", isDragging && "opacity-40")}
    >
      <ElementRow
        element={lesson}
        number={labels.lessonNumber(position)}
        label={label}
        parents={{ chapter: chapterInApp, lesson: true }}
        handle={
          editable && (
            <OutlineHandle
              label={label}
              sortable={{
                setActivatorNodeRef,
                attributes,
                listeners,
                isDragging,
              }}
            />
          )
        }
        fold={
          hasExercises && (
            <FoldButton
              open={open}
              controls={listId}
              label={open ? labels.fold(label) : labels.unfold(label)}
              onClick={() => toggleFold(lesson)}
            />
          )
        }
        isFirst={isFirst}
        isLast={isLast}
        canGoFurther
      />
      {(open || !hasExercises) && (
        <SortableContext
          id={lesson.id}
          items={lesson.exercises.map((exercise) => exercise.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Comme les leçons sous leur chapitre : un trait, décalé d'un cran. Sans exercice, la
              liste n'est que la zone où en déposer un, visible pendant le déplacement. */}
          <ol
            ref={setZoneRef}
            id={listId}
            aria-label={labels.exercisesOf(label)}
            className={cn(
              "ml-5 grid gap-0.5 rounded-md border-l pl-1.5",
              !hasExercises && dragging !== "exercise" && "hidden",
              overZone && "bg-accent"
            )}
          >
            {!hasExercises && (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">
                {labels.noExercises}
              </li>
            )}
            {lesson.exercises.map((exercise, index) => (
              <ExerciseItem
                key={exercise.id}
                exercise={exercise}
                lesson={lesson}
                parents={{ chapter: chapterInApp, lesson: lessonInApp }}
                position={index + 1}
              />
            ))}
          </ol>
        </SortableContext>
      )}
    </li>
  )
}

function ExerciseItem({
  exercise,
  lesson,
  parents,
  position,
}: {
  exercise: OutlineElement
  lesson: OutlineLesson
  parents: ParentsInApp
  position: number
}) {
  const { editable } = useRow()
  const dragging = useContext(DraggingContext)
  const data: OutlineDropData = { type: "exercise", lessonId: lesson.id }
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: exercise.id,
    data,
    attributes: { roleDescription: dnd.roleDescription },
    disabled: {
      draggable: !editable,
      droppable: dragging !== null && dragging !== "exercise",
    },
  })
  // Le premier et le dernier exercice de tout le plan ne vont pas plus loin.
  const tree = useContext(TreeContext)
  const all = tree
    ? tree.flatMap((chapter) =>
        chapter.lessons.flatMap((item) => item.exercises)
      )
    : []
  const label = labels.exerciseLabel(position, titleOf(exercise))
  return (
    <li
      ref={setNodeRef}
      data-outline-id={exercise.id}
      data-outline-kind="exercise"
      // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer (dnd-kit)
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-40")}
    >
      <ElementRow
        element={exercise}
        number={labels.exerciseNumber(position)}
        label={label}
        parents={parents}
        handle={
          editable && (
            <OutlineHandle
              label={label}
              sortable={{
                setActivatorNodeRef,
                attributes,
                listeners,
                isDragging,
              }}
            />
          )
        }
        isFirst={all[0]?.id === exercise.id}
        isLast={all.at(-1)?.id === exercise.id}
        canGoFurther
      />
    </li>
  )
}

/** La flèche d'une leçon qui a des exercices : les replie ou les déplie. */
function FoldButton({
  open,
  controls,
  label,
  onClick,
}: {
  open: boolean
  controls: string
  label: string
  onClick: () => void
}) {
  const Icon = open ? ChevronDown : ChevronRight
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-expanded={open}
            aria-controls={controls}
            aria-label={label}
            onClick={onClick}
            className="shrink-0 text-muted-foreground"
          />
        }
      >
        <Icon aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** La poignée d'un élément du plan, au début de sa ligne : à la souris ou au clavier. */
function OutlineHandle({
  label,
  sortable: { setActivatorNodeRef, attributes, listeners, isDragging },
}: {
  label: string
  sortable: Pick<
    ReturnType<typeof useSortable>,
    "setActivatorNodeRef" | "attributes" | "listeners" | "isDragging"
  >
}) {
  return (
    // Pendant un déplacement, l'infobulle se ferme : Échap doit annuler le déplacement.
    <Tooltip disabled={isDragging}>
      <TooltipTrigger
        render={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={labels.handle(label)}
            // Au début de la ligne, centrée sur elle ; toujours devinée (pâle), franche au survol.
            className="absolute top-1/2 left-0 flex h-7 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-sm text-muted-foreground opacity-40 group-hover/row:text-foreground group-hover/row:opacity-100 hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
          />
        }
      >
        <GripVertical aria-hidden className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{labels.handle(label)}</TooltipContent>
    </Tooltip>
  )
}

// L'arbre affiché, pour « Monter » et « Descendre » d'une leçon (qui peut changer de chapitre) ou
// d'un exercice (de leçon).
const TreeContext = createContext<MethodTree | null>(null)

/**
 * Une ligne du plan : la poignée, la flèche d'une leçon qui a des exercices, le numéro et le titre
 * (un clic ouvre son éditeur), puis en petites icônes ce qu'il faut savoir (gratuite, quelqu'un
 * l'écrit, à corriger) et son état dans l'app en pastille ; le menu ⋯ porte « Montrer dans
 * l'app », « Leçon gratuite », « Nouvel exercice » et les gestes.
 */
function ElementRow({
  element,
  number,
  label,
  parents,
  handle,
  fold,
  isFirst,
  isLast,
  canGoFurther,
}: {
  element: OutlineElement
  number: string
  label: string
  // « Montrer dans l'app » de son chapitre et de sa leçon.
  parents: ParentsInApp
  // La poignée du glisser-déposer (rien en lecture seule).
  handle: ReactNode
  // Une leçon qui a des exercices : la flèche qui les replie.
  fold?: ReactNode
  isFirst: boolean
  isLast: boolean
  canGoFurther: boolean
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
    newExercise,
  } = useRow()
  const pending = pendingFlags.get(element.id)
  const inApp = pending?.in_app ?? element.inApp
  const isFree = pending?.is_free ?? element.isFree
  const state = elementState({ ...element, inApp }, parents, live, preview)
  const row = preview?.get(element.id)
  const path = contentEditorPath(element.kind, element.id)
  const editing =
    element.editingId === null
      ? null
      : element.editingId === myId
        ? labels.openElsewhere
        : labels.editing(element.editingName ?? texts.editor.lock.someone)
  const title = titleOf(element)
  return (
    <div
      className={cn(
        "group/row relative flex min-w-0 items-center gap-0.5 rounded-md hover:bg-accent/60",
        // La place de la poignée, au début de la ligne.
        editable && "pl-5"
      )}
    >
      {handle}
      {fold}
      {path ? (
        <Link to={path} data-outline-title className={rowLink}>
          <RowText number={number} title={title} kind={element.kind} />
        </Link>
      ) : (
        <span data-outline-title className={rowLink}>
          <RowText number={number} title={title} kind={element.kind} />
        </span>
      )}
      {element.kind === "lesson" && isFree && (
        <RowIcon icon={LockOpen} text={labels.free} />
      )}
      {editing && <RowIcon icon={PenLine} text={editing} />}
      {row?.problem && (
        <RowIcon
          icon={TriangleAlert}
          text={`${labels.problem} : ${contentProblemText(row.problem, row.problemDetail)}`}
          className="text-destructive"
          data-element-problem={row.problem}
        />
      )}
      {pending ? (
        <Spinner aria-label={texts.common.loading} className="mx-1 size-3" />
      ) : (
        <ElementStateDot state={state} />
      )}
      <ElementMenu
        element={element}
        label={label}
        path={path}
        inApp={inApp}
        isFree={isFree}
        flagsPending={pending !== undefined}
        inLive={live.has(element.id)}
        canMoveUp={editable && canGoFurther && !isFirst}
        canMoveDown={editable && canGoFurther && !isLast}
        onFlags={(flags) => setFlags(element, flags)}
        onShift={(offset) => shift(element, offset)}
        onConfirm={(action) => confirm({ action, element, label })}
        onNewExercise={
          editable && element.kind === "lesson"
            ? () => newExercise(element as OutlineLesson, label)
            : undefined
        }
      />
    </div>
  )
}

// scroll-mt-20 : une ligne amenée sous les yeux ne passe pas sous le haut collé du plan.
const rowLink =
  "flex min-w-0 flex-1 scroll-mt-20 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"

/** Le numéro, puis le titre (coupé par « … ») ; un chapitre en gras. */
function RowText({
  number,
  title,
  kind,
}: {
  number: string
  title: string
  kind: OutlineElement["kind"]
}) {
  return (
    <>
      <span
        aria-hidden
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
      >
        {number}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          kind === "chapter" && "font-medium"
        )}
      >
        {title}
      </span>
    </>
  )
}

/** Une petite icône d'une ligne, son sens dans l'infobulle et pour les lecteurs d'écran. */
function RowIcon({
  icon: Icon,
  text,
  className,
  ...props
}: {
  icon: typeof LockOpen
  text: string
  className?: string
  "data-element-problem"?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            {...props}
            className={cn(
              "flex size-5 shrink-0 items-center justify-center text-muted-foreground",
              className
            )}
          />
        }
      >
        <Icon aria-hidden className="size-3.5" />
        <span className="sr-only">{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{text}</TooltipContent>
    </Tooltip>
  )
}

function ElementMenu({
  element,
  label,
  path,
  inApp,
  isFree,
  flagsPending,
  inLive,
  canMoveUp,
  canMoveDown,
  onFlags,
  onShift,
  onConfirm,
  onNewExercise,
}: {
  element: OutlineElement
  label: string
  path: string | null
  inApp: boolean
  isFree: boolean
  flagsPending: boolean
  inLive: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onFlags: (flags: ElementFlags) => void
  onShift: (offset: -1 | 1) => void
  onConfirm: (action: "unpublish" | "trash") => void
  // Une leçon, quand on tient la main sur la méthode : « Nouvel exercice ».
  onNewExercise?: () => void
}): ReactNode {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={labels.actions(label)}
        data-outline-actions={element.id}
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground"
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {path && (
          <DropdownMenuItem onClick={() => void navigate(path)}>
            <SquarePen />
            {labels.open}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {/* Des réglages de l'élément, enregistrés sous son propre verrou ([D29], [D43]). */}
        <DropdownMenuCheckboxItem
          checked={inApp}
          disabled={flagsPending}
          aria-label={labels.inAppFor(label)}
          onCheckedChange={(checked) => onFlags({ in_app: checked })}
        >
          <Eye />
          {labels.inApp}
        </DropdownMenuCheckboxItem>
        {element.kind === "lesson" && (
          <DropdownMenuCheckboxItem
            checked={isFree}
            disabled={flagsPending}
            aria-label={labels.isFreeFor(label)}
            onCheckedChange={(checked) => onFlags({ is_free: checked })}
          >
            <LockOpen />
            {labels.isFree}
          </DropdownMenuCheckboxItem>
        )}
        {onNewExercise && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNewExercise} data-new-exercise>
              <Plus />
              {labels.newExercise}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { ListTree } from "lucide-react"
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useBlocker, useParams } from "react-router"
import { toast } from "sonner"

import "@/blocks/components/preview.css"

import type { Draft } from "@/blocks/types"
import { ArticleFooter } from "@/components/editor/article-panel"
import { LIBRARY_FIRST_ID } from "@/components/editor/blocks-library"
import {
  BackLink,
  EditorNotFound,
  FocusPill,
  LeaveDialog,
  LibraryDrawer,
} from "@/components/editor/editor-chrome"
import { EditorSkeleton } from "@/components/editor/editor-skeleton"
import { FeedPreview, ReadAppBar } from "@/components/editor/feed-preview"
import {
  LockBanner,
  LockButton,
  LockDialog,
} from "@/components/editor/lock-banner"
import { SaveStatus } from "@/components/editor/save-status"
import { useFocusMode } from "@/components/editor/use-focus-mode"
import { usePhoneView } from "@/components/editor/use-phone-view"
import { copyDrafts } from "@/components/editor/use-part-draft"
import { MethodElementPart } from "@/components/methods/method-element-part"
import { MethodFiche } from "@/components/methods/method-fiche"
import { MethodOutline } from "@/components/methods/method-outline"
import {
  MethodPageContext,
  type MethodPageSlots,
  type MethodPageValue,
  type PartHandle,
  type PartReport,
} from "@/components/methods/method-page-context"
import { NewPartButton } from "@/components/methods/new-part-button"
import { GoToPartContext } from "@/components/methods/go-to-part"
import { useAccessCheck } from "@/components/team/use-access-check"
import { useEditLock } from "@/hooks/use-edit-lock"
import { useLockDialog } from "@/hooks/use-lock-dialog"
import { contentKeys, createContent, type Content } from "@/lib/contents/api"
import { methodKeys } from "@/lib/contents/methods"
import {
  methodParts,
  methodSaveState,
  pageItems,
  currentPart,
  partAbove,
  partFromAddress,
  withPart,
  withShown,
  type ShownElement,
} from "@/lib/contents/method-page"
import {
  exerciseCount,
  lessonCount,
  liveIds,
  parseLiveOutline,
  previewByElement,
} from "@/lib/contents/outline"
import {
  publicationStatus,
  type ScheduleState,
} from "@/lib/contents/publication"
import { templateKeys } from "@/lib/contents/templates"
import { lockSituation } from "@/lib/editor/lock-view"
import { focusSoon } from "@/lib/focus"
import { mediaKeys } from "@/lib/media/api"
import {
  accessLevelsRead,
  contentRead,
  methodPartsRead,
  methodPreviewRead,
  methodTreeRead,
  publicationRead,
  REREAD_MS,
} from "@/lib/reads"
import { rememberOpened } from "@/lib/scroll-memory"
import { texts } from "@/texts"

const labels = texts.methods.outline

// Un peu d'air au-dessus d'une partie amenée en haut du téléphone.
const PART_MARGIN = 16
// Au plus, le temps d'un défilement voulu (un clic dans le plan) : la partie en cours ne suit pas.
const STEERING_MS = 1500

/** Défilement doux, sauf si l'ordinateur demande moins d'animations. */
function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth"
}

/**
 * La page d'une méthode : /methodes/<id> (ADMIN § 4, « Une méthode sur une seule page »). Le menu
 * de l'admin se cache. Un chapitre, une leçon ou un exercice ouvert d'ailleurs y mène, déjà sur
 * sa partie (method-element-page.tsx).
 */
export function MethodPage() {
  const { contentId = "" } = useParams()
  // Une autre méthode ouverte par la même adresse : tout repart de zéro.
  return <MethodLoader key={contentId} methodId={contentId} />
}

function MethodLoader({ methodId }: { methodId: string }) {
  const checkAccess = useAccessCheck()
  const method = useQuery({
    ...contentRead(methodId),
    refetchOnWindowFocus: false,
  })
  const tree = useQuery(methodTreeRead(methodId))
  const parts = useQuery(methodPartsRead(methodId))
  const error = method.error ?? tree.error ?? parts.error
  useEffect(() => {
    if (error) checkAccess(error)
  }, [error, checkAccess])

  // En attendant (premier chargement, ou au-delà des 2 secondes de préparation) : l'écran a
  // déjà la forme de l'éditeur.
  if (method.isPending || tree.isPending || parts.isPending) {
    return <EditorSkeleton back={<BackLink section="methods" compact />} />
  }
  // Seule la première lecture compte ici : la page relit ensuite chaque partie elle-même.
  if (
    !method.data ||
    method.data.deleted_at ||
    method.data.kind !== "method" ||
    !tree.data ||
    !parts.data
  ) {
    const failed = method.isError || tree.isError || parts.isError
    return (
      <EditorNotFound
        section="methods"
        message={failed ? (error?.message ?? null) : null}
        retry={
          failed
            ? () => {
                void method.refetch()
                void tree.refetch()
                void parts.refetch()
              }
            : null
        }
      />
    )
  }
  return <MethodEditor initial={method.data} />
}

function MethodEditor({ initial }: { initial: Content }) {
  const methodId = initial.id
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  // Au retour à la liste des méthodes, sa ligne s'allume un instant (lib/scroll-memory.ts).
  useEffect(() => rememberOpened(methodId), [methodId])
  // Cette ouverture de la page : le verrou de la méthode est tenu par elle.
  const [session] = useState(() => crypto.randomUUID())
  const [announcement, setAnnouncement] = useState("")

  // Le téléphone montré (Édition ou Lecture, thème…) et la partie en cours : dans l'adresse.
  const {
    phoneView,
    setPhoneView,
    reading,
    toEdit,
    searchParams,
    setSearchParams,
  } = usePhoneView()
  const { focusMode, setFocusMode, apple, toggle, tool } =
    useFocusMode(setAnnouncement)

  // --- Les parties -------------------------------------------------------------------------

  const handles = useRef(new Map<string, PartHandle>())
  const [reports, setReports] = useState<ReadonlyMap<string, PartReport>>(
    () => new Map()
  )
  const register = useCallback((id: string, handle: PartHandle) => {
    handles.current.set(id, handle)
    return () => {
      if (handles.current.get(id) !== handle) return
      handles.current.delete(id)
      setReports((current) => {
        const next = new Map(current)
        next.delete(id)
        return next
      })
    }
  }, [])
  const report = useCallback(
    (id: string, partReport: PartReport) =>
      setReports((current) => new Map(current).set(id, partReport)),
    []
  )
  /** Enregistre tout de suite ce qui attend dans chaque partie ; vrai si tout est enregistré. */
  const flushAll = useCallback(async () => {
    const results = await Promise.all(
      [...handles.current.values()].map((handle) => handle.flush())
    )
    return results.every(Boolean)
  }, [])

  // --- Le verrou de toute la méthode ------------------------------------------------------

  const lock = useEditLock(
    methodId,
    session,
    async () => {
      await flushAll()
    },
    !reading
  )
  const [resumeSignal, setResumeSignal] = useState(0)
  const { take: takeLock, notifyLost } = lock
  const take = useCallback(
    (force: boolean) => {
      setResumeSignal((signal) => signal + 1)
      void takeLock(force)
    },
    [takeLock]
  )
  const holderIsMe = lock.state.holderId === lock.myId
  const lockView = reading ? null : lockSituation(lock.state, holderIsMe)
  const lockDialog = useLockDialog(lockView)
  const mine = lock.state.phase === "mine"

  // --- Ce que la page lit ------------------------------------------------------------------

  const tree = useQuery({
    ...methodTreeRead(methodId),
    // Ce que les autres ont ajouté ou rangé : relu régulièrement.
    refetchInterval: 30_000,
  })
  const partsQuery = useQuery(methodPartsRead(methodId))
  const preview = useQuery({
    ...methodPreviewRead(methodId),
    staleTime: REREAD_MS,
    refetchInterval: 30_000,
  })
  const publication = useQuery({
    ...publicationRead(methodId),
    staleTime: REREAD_MS,
    refetchInterval: 30_000,
  })
  const levels = useQuery(accessLevelsRead())

  // Quelqu'un d'autre écrit la méthode : à chaque changement (Realtime), on relit ce qui en
  // dépend ; chaque partie relit ensuite son brouillon s'il a changé.
  const methodRev = lock.state.methodRev
  useEffect(() => {
    if (methodRev === null || mine) return
    for (const queryKey of [
      methodKeys.tree(methodId),
      methodKeys.parts(methodId),
      methodKeys.preview(methodId),
      contentKeys.publication(methodId),
    ]) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }, [methodRev, mine, methodId, queryClient])

  const contents = useMemo(
    () =>
      new Map((partsQuery.data ?? []).map((content) => [content.id, content])),
    [partsQuery.data]
  )
  // La révision de chaque partie dans la base, pour qui ne tient pas la main ; la fiche suit le
  // verrou de la méthode, comme l'éditeur d'un contenu.
  const partRev = useCallback(
    (id: string) =>
      id === methodId
        ? lock.state.draftRev
        : mine
          ? null
          : (contents.get(id)?.draft_rev ?? null),
    [methodId, lock.state.draftRev, mine, contents]
  )

  // L'arbre tel qu'il est à l'écran : les cases cochées (pour les parties), et en plus les titres
  // tapés (pour le plan, relu à chaque frappe sans redessiner les parties).
  const { flags, titles } = useMemo(() => {
    const flagsById = new Map<string, ShownElement>()
    const titlesById = new Map<string, ShownElement>()
    for (const [id, partReport] of reports) {
      if (partReport.flags) flagsById.set(id, partReport.flags)
      titlesById.set(id, { ...partReport.flags, title: partReport.title })
    }
    return { flags: flagsById, titles: titlesById }
  }, [reports])
  const shownTree = useMemo(
    () => (tree.data ? withShown(tree.data, flags) : undefined),
    [tree.data, flags]
  )
  const planTree = useMemo(
    () => (shownTree ? withShown(shownTree, titles) : undefined),
    [shownTree, titles]
  )
  const parts = useMemo(
    () => methodParts(methodId, shownTree ?? []),
    [methodId, shownTree]
  )
  const live = useMemo(
    () => parseLiveOutline(publication.data?.live?.outline),
    [publication.data]
  )
  const liveSet = useMemo(() => liveIds(live), [live])
  const changesById = useMemo(
    () => (preview.data ? previewByElement(preview.data) : undefined),
    [preview.data]
  )
  const publicationData = publication.data
  const publicationAt = publication.dataUpdatedAt
  const schedule = useMemo<ScheduleState>(
    () =>
      publicationData
        ? publicationStatus(
            publicationData,
            publicationData.draft_rev,
            publicationAt
          ).schedule
        : { kind: "none" },
    [publicationData, publicationAt]
  )

  // La fiche telle qu'elle est à l'écran (titre, niveau d'accès), pour ses éléments.
  const [fiche, setFiche] = useState(() => ({
    title: initial.title,
    access: {
      accessChosen: initial.access_chosen,
      accessLevelId: initial.access_level_id,
    },
  }))

  const afterPartSave = useCallback(() => {
    for (const queryKey of [
      methodKeys.tree(methodId),
      methodKeys.preview(methodId),
      mediaKeys.allUses,
      templateKeys.uses,
      templateKeys.allOutdated,
    ]) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient, methodId])

  // --- La partie en cours ------------------------------------------------------------------

  const [currentId, setCurrentId] = useState(
    () => partFromAddress(searchParams) ?? methodId
  )
  // Une partie partie à la corbeille (ou inconnue) : la fiche.
  const shownId = parts.some((part) => part.id === currentId)
    ? currentId
    : methodId
  // Gardée dans l'adresse : recharger la page y ramène.
  useEffect(() => {
    setSearchParams(
      (params) => withPart(params, shownId === methodId ? null : shownId),
      { replace: true }
    )
  }, [shownId, methodId, setSearchParams])

  // Les Blocs, en glissière par-dessus le plan : ils ajoutent à la partie en cours.
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const openLibrary = useCallback(() => {
    setFocusMode(false)
    setLibraryOpen(true)
    setSavedOpen(false)
    focusSoon(() => document.getElementById(LIBRARY_FIRST_ID))
  }, [setFocusMode])
  const closeLibrary = useCallback(() => {
    setLibraryOpen(false)
    setSavedOpen(false)
  }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  // Pendant un défilement voulu, le défilement ne change pas la partie en cours.
  const steering = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollToPart = useCallback((id: string, behavior: ScrollBehavior) => {
    const container = scrollRef.current
    const target = container?.querySelector<HTMLElement>(`[data-part="${id}"]`)
    if (!container || !target) return
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      PART_MARGIN
    // Jusqu'à la fin du défilement (scrollend), au plus STEERING_MS s'il ne bouge pas ou si le
    // navigateur ne le dit pas.
    const done = () => {
      if (steering.current) clearTimeout(steering.current)
      steering.current = null
      container.removeEventListener("scrollend", done)
    }
    if (steering.current) clearTimeout(steering.current)
    steering.current = setTimeout(done, STEERING_MS)
    container.addEventListener("scrollend", done)
    container.scrollTo({ top: Math.max(0, top), behavior })
  }, [])
  const measuring = useRef(false)
  const onScroll = () => {
    // Les Blocs ouverts ajoutent à la partie pour laquelle on les a ouverts : le défilement ne
    // la change pas.
    if (
      reading ||
      libraryOpen ||
      steering.current !== null ||
      measuring.current
    ) {
      return
    }
    measuring.current = true
    requestAnimationFrame(() => {
      measuring.current = false
      const container = scrollRef.current
      if (!container || steering.current !== null) return
      const box = container.getBoundingClientRect()
      const boxes = [
        ...container.querySelectorAll<HTMLElement>("[data-part]"),
      ].map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          id: element.dataset.part ?? "",
          top: rect.top - box.top,
          bottom: rect.bottom - box.top,
        }
      })
      const focused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement.closest<HTMLElement>("[data-part]")
          : null
      const id = currentPart({
        boxes,
        height: box.height,
        focusedId: focused?.dataset.part ?? null,
        atBottom:
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 2,
      })
      if (id) setCurrentId(id)
    })
  }

  // À l'arrivée, et à chaque passage d'Édition à Lecture : la partie en cours en haut du
  // téléphone (en Lecture, le haut de son écran). Ensuite, c'est le défilement qui mène.
  const placedFor = useRef<boolean | null>(null)
  useLayoutEffect(() => {
    if (placedFor.current === reading) return
    placedFor.current = reading
    if (reading) {
      scrollRef.current?.scrollTo({ top: 0 })
      return
    }
    if (shownId !== methodId) scrollToPart(shownId, "auto")
  }, [reading, shownId, methodId, scrollToPart])

  /** Un clic dans le plan : la partie vient en haut du téléphone (en Lecture, son écran). */
  const goTo = useCallback(
    (id: string) => {
      setCurrentId(id)
      if (reading) {
        scrollRef.current?.scrollTo({ top: 0 })
        return
      }
      scrollToPart(id, scrollBehavior())
    },
    [reading, scrollToPart]
  )

  // --- Ajouter une partie ------------------------------------------------------------------

  // La partie qu'on vient d'ajouter : dès qu'elle est dans la page, elle devient la partie en
  // cours, le téléphone y défile et le curseur va dans son titre.
  const created = useRef<string | null>(null)
  const create = useMutation({
    mutationFn: ({
      kind,
      parentId,
      starterId,
    }: {
      kind: "chapter" | "lesson" | "exercise"
      parentId: string
      starterId: string | null
    }) => createContent(kind, "", starterId, parentId),
    onSuccess: async (content, { kind }) => {
      created.current = content.id
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: methodKeys.tree(methodId) }),
        queryClient.invalidateQueries({
          queryKey: methodKeys.parts(methodId),
        }),
      ])
      void queryClient.invalidateQueries({
        queryKey: methodKeys.preview(methodId),
      })
      setAnnouncement(texts.methods.page.added[kind])
    },
    onError: (error) => {
      toast.error(texts.methods.create.failed, { description: error.message })
      checkAccess(error)
    },
  })
  useEffect(() => {
    const id = created.current
    const handle = id ? handles.current.get(id) : undefined
    if (!id || !handle) return
    created.current = null
    setCurrentId(id)
    scrollToPart(id, scrollBehavior())
    handle.focusTitle()
  }, [contents, parts, scrollToPart])
  const { mutate: createMutate } = create
  const createPart = useCallback(
    (
      kind: "chapter" | "lesson" | "exercise",
      parentId: string,
      starterId: string | null
    ) => {
      // Le bouton (ou le menu) rend le curseur : une frappe pendant la création n'ajoute pas
      // une autre partie ; il ira dans le titre de la nouvelle partie dès qu'elle apparaîtra.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      createMutate({ kind, parentId, starterId })
    },
    [createMutate]
  )

  // --- Les places de la page (portails) ---------------------------------------------------

  const [slots, setSlots] = useState<MethodPageSlots>({
    toolbar: null,
    right: null,
    footer: null,
    planBlocks: null,
    library: null,
    notices: null,
  })
  // Chaque place reçoit son élément une fois montée (la partie en cours y fait ses portails).
  const placeSlot = useCallback(
    (key: keyof MethodPageSlots, element: HTMLElement | null) =>
      setSlots((current) =>
        current[key] === element ? current : { ...current, [key]: element }
      ),
    []
  )
  const toolbarSlot = useCallback(
    (element: HTMLElement | null) => placeSlot("toolbar", element),
    [placeSlot]
  )
  const rightSlot = useCallback(
    (element: HTMLElement | null) => placeSlot("right", element),
    [placeSlot]
  )
  const footerSlot = useCallback(
    (element: HTMLElement | null) => placeSlot("footer", element),
    [placeSlot]
  )
  const planBlocksSlot = useCallback(
    (element: HTMLElement | null) => placeSlot("planBlocks", element),
    [placeSlot]
  )
  const librarySlot = useCallback(
    (element: HTMLElement | null) => placeSlot("library", element),
    [placeSlot]
  )
  const noticesSlot = useCallback(
    (element: HTMLElement | null) => placeSlot("notices", element),
    [placeSlot]
  )

  // --- L'historique ---------------------------------------------------------------------------

  const [historyFor, setHistoryFor] = useState<string | null>(null)

  // --- L'enregistrement de toute la méthode ------------------------------------------------

  const saveState = methodSaveState(
    [...reports.values()].map((partReport) => partReport.save)
  )
  const canCopy = [...reports.values()].some((partReport) => partReport.canCopy)
  const copyAll = () =>
    copyDrafts(
      [...handles.current.values()].flatMap((handle): Draft[] => {
        const draft = handle.unsavedDraft()
        return draft ? [draft] : []
      })
    )
  const eachHandle = (act: (handle: PartHandle) => void) => {
    for (const handle of handles.current.values()) act(handle)
  }
  const risky =
    saveState.unsaved &&
    (saveState.status === "offline" ||
      saveState.status === "failed" ||
      saveState.status === "stopped")
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      risky && currentLocation.pathname !== nextLocation.pathname
  )

  // --- Ce que la page donne aux parties -----------------------------------------------------

  const lockForParts = useMemo(
    () => ({
      phase: lock.state.phase,
      lost: lock.state.lost,
      notifyLost,
    }),
    [lock.state.phase, lock.state.lost, notifyLost]
  )
  const method = useMemo(
    () => ({ id: methodId, title: fiche.title, access: fiche.access }),
    [methodId, fiche]
  )
  const {
    data: levelsData,
    isError: levelsFailed,
    refetch: retryLevels,
  } = levels
  const levelsValue = useMemo(
    () => ({
      data: levelsData,
      failed: levelsFailed,
      retry: () => void retryLevels(),
    }),
    [levelsData, levelsFailed, retryLevels]
  )
  const anyUnsaved = saveState.unsaved
  const creating = create.isPending
  // Le même objet tant que rien de ce qu'il contient ne change : taper dans une partie ne
  // redessine pas les autres.
  const value = useMemo<MethodPageValue>(
    () => ({
      methodId,
      session,
      lock: lockForParts,
      partRev,
      resumeSignal,
      take,
      flushAll,
      anyUnsaved,
      reading,
      preview: phoneView,
      currentId: shownId,
      setCurrent: setCurrentId,
      parts,
      tree: shownTree,
      live,
      liveSet,
      changes: preview.data,
      changesById,
      method,
      reportFiche: setFiche,
      schedule,
      afterPartSave,
      levels: levelsValue,
      slots,
      register,
      report,
      announce: setAnnouncement,
      libraryOpen,
      openLibrary,
      closeLibrary,
      savedOpen,
      setSavedOpen,
      toEdit,
      createPart,
      creating,
      historyFor,
      setHistoryFor,
    }),
    [
      methodId,
      session,
      lockForParts,
      partRev,
      resumeSignal,
      take,
      flushAll,
      anyUnsaved,
      reading,
      phoneView,
      shownId,
      parts,
      shownTree,
      live,
      liveSet,
      preview.data,
      changesById,
      method,
      schedule,
      afterPartSave,
      levelsValue,
      slots,
      register,
      report,
      libraryOpen,
      openLibrary,
      closeLibrary,
      savedOpen,
      toEdit,
      createPart,
      creating,
      historyFor,
    ]
  )

  // --- La Lecture : les écrans de l'app, dans le téléphone ----------------------------------

  const shownPart = parts.find((part) => part.id === shownId) ?? parts[0]
  const above = partAbove(shownPart)
  const untitled = texts.common.untitled
  const methodTitle = fiche.title.trim() || untitled

  // --- Rendu -------------------------------------------------------------------------------

  const backLink = <BackLink section="methods" compact />
  const saveVisible = mine || saveState.unsaved
  const lockButton = lockView && (
    <LockButton
      expanded={lockDialog.open}
      onClick={() => lockDialog.setOpen(true)}
    />
  )
  const plan = shownTree
  return (
    <MethodPageContext value={value}>
      <GoToPartContext value={goTo}>
        <div className="flex h-svh flex-col bg-muted/40">
          <title>{`${methodTitle} — ${texts.app.name}`}</title>
          <p role="status" className="sr-only">
            {announcement}
          </p>

          <div className="flex min-h-0 flex-1">
            <aside
              id="editeur-plan"
              aria-label={labels.title}
              // Caché (et non retiré) en Concentration : les Blocs restent ouverts.
              className={cn(
                "flex w-feed-column shrink-0 flex-col border-r bg-background",
                focusMode && "hidden"
              )}
            >
              <div className="relative min-h-0 flex-1">
                {/* Sous la glissière des Blocs : hors du clavier et des lecteurs d'écran. */}
                <div inert={libraryOpen} className="h-full">
                  <MethodOutline
                    methodId={methodId}
                    methodTitle={fiche.title}
                    tree={planTree}
                    treeQuery={tree}
                    currentId={shownId}
                    onGo={goTo}
                    blocksSlot={planBlocksSlot}
                    editable={mine}
                    reading={reading}
                    session={session}
                    myId={lock.myId}
                    live={live}
                    preview={preview.data}
                    setFlags={(element, wanted) =>
                      handles.current.get(element.id)?.setFlags?.(wanted)
                    }
                    reloadPart={(id) => handles.current.get(id)?.reload()}
                    flushAll={flushAll}
                    back={backLink}
                  />
                </div>
                {libraryOpen && (
                  <LibraryDrawer
                    back={backLink}
                    onClose={() => {
                      closeLibrary()
                      focusSoon(() =>
                        document.getElementById(`ajouter-bloc-${shownId}`)
                      )
                    }}
                  >
                    <div ref={librarySlot} className="h-full" />
                  </LibraryDrawer>
                )}
              </div>
            </aside>

            <main
              className="flex min-w-0 flex-1 flex-col overflow-x-auto bg-dot-grid"
              data-backdrop
              // Un clic sur le fond autour du téléphone : les Blocs se referment.
              onClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.hasAttribute("data-backdrop")
                )
                  closeLibrary()
              }}
            >
              <FeedPreview
                preview={phoneView}
                onPreviewChange={(next) => setPhoneView(() => next)}
                toolbar={<div ref={toolbarSlot} />}
                focus={tool}
                notices={
                  <>
                    <LockBanner
                      lock={lock.state}
                      autosave={saveState}
                      canCopy={canCopy}
                      onTake={take}
                      onCopy={() => void copyAll()}
                      onReload={() => eachHandle((handle) => handle.reload())}
                      onDismissCopy={() =>
                        eachHandle((handle) => handle.dismissStash())
                      }
                    />
                    <div ref={noticesSlot} className="contents" />
                    {saveState.status === "failed" && saveState.error && (
                      <p role="alert" className="text-sm text-destructive">
                        {saveState.error.message} {saveState.error.detail}
                      </p>
                    )}
                  </>
                }
                appBar={
                  reading ? (
                    <ReadAppBar
                      section={methodTitle}
                      back={
                        above === null
                          ? null
                          : above === "method"
                            ? {
                                title: methodTitle,
                                onClick: () => goTo(methodId),
                              }
                            : {
                                title: above.title.trim() || untitled,
                                onClick: () => goTo(above.id),
                              }
                      }
                    />
                  ) : undefined
                }
                scrollRef={scrollRef}
                onScroll={onScroll}
              >
                {/* Toutes les parties restent montées (elles gardent ce qui n'est pas encore
                    enregistré) ; en Lecture, seule celle qu'on lit montre son écran. */}
                <div className={cn(!reading && "blocks-phone blocks-method")}>
                  {pageItems(parts).map((item) => {
                    if (item.type === "part") {
                      const { part } = item
                      if (part.kind === "method") {
                        return <MethodFiche key={part.id} initial={initial} />
                      }
                      const content = contents.get(part.id)
                      return content ? (
                        <MethodElementPart
                          key={part.id}
                          part={part}
                          initial={content}
                        />
                      ) : null
                    }
                    if (reading || !mine) return null
                    return (
                      <Fragment key={addKey(item)}>
                        {item.type === "newExercise" ? (
                          <NewPartButton
                            kind="exercise"
                            parentId={item.lesson.id}
                            label={labels.newExercise}
                            ariaLabel={texts.methods.page.newExerciseIn(
                              item.lessonNumber,
                              item.lesson.title.trim() || untitled
                            )}
                          />
                        ) : item.type === "newLesson" ? (
                          <NewPartButton
                            kind="lesson"
                            parentId={item.chapter.id}
                            label={texts.methods.page.newLessonIn(
                              item.chapterNumber
                            )}
                            ariaLabel={labels.newLessonIn(
                              labels.chapterLabel(
                                item.chapterNumber,
                                item.chapter.title.trim() || untitled
                              )
                            )}
                          />
                        ) : (
                          <NewPartButton
                            kind="chapter"
                            parentId={methodId}
                            label={labels.newChapter}
                          />
                        )}
                      </Fragment>
                    )
                  })}
                </div>
              </FeedPreview>
            </main>

            <aside
              aria-label={texts.editor.columns.right.method}
              className={cn(
                "flex w-feed-column shrink-0 flex-col border-l bg-background",
                focusMode && "hidden"
              )}
            >
              {/* La colonne de la partie en cours (ses options, les réglages du bloc choisi). */}
              <div ref={rightSlot} className="flex min-h-0 flex-1 flex-col" />
              {/* En bas, toujours : l'enregistrement de toute la méthode, la taille de son plan,
                  le cadenas, son état et « Publier ». */}
              <ArticleFooter
                stats={{ words: 0, minutes: 0 }}
                audio={null}
                measure={
                  plan
                    ? {
                        Icon: ListTree,
                        short: texts.editor.article.stats.lessons(
                          lessonCount(plan)
                        ),
                        tip: texts.editor.article.stats.planTip(
                          labels.count(
                            plan.length,
                            lessonCount(plan),
                            exerciseCount(plan)
                          )
                        ),
                      }
                    : undefined
                }
                savedAt={saveState.savedAt}
                saveStatus={
                  <SaveStatus state={saveState} visible={saveVisible} compact />
                }
              >
                {lockButton}
                <div ref={footerSlot} className="contents" />
              </ArticleFooter>
            </aside>
          </div>

          {focusMode && (
            <FocusPill
              apple={apple}
              saveStatus={
                <SaveStatus state={saveState} visible={saveVisible} />
              }
              lockButton={lockButton}
              onExit={toggle}
            />
          )}
          <LockDialog
            situation={lockView}
            holderName={lock.state.holderName}
            open={lockDialog.open}
            onOpenChange={lockDialog.setOpen}
            canCopy={canCopy}
            onTake={take}
            onCopy={() => void copyAll()}
          />
          <LeaveDialog blocker={blocker} />
        </div>
      </GoToPartContext>
    </MethodPageContext>
  )
}

/** La clé d'un bouton d'ajout du téléphone. */
function addKey(
  item: Exclude<ReturnType<typeof pageItems>[number], { type: "part" }>
): string {
  switch (item.type) {
    case "newExercise":
      return `exercice-${item.lesson.id}`
    case "newLesson":
      return `lecon-${item.chapter.id}`
    case "newChapter":
      return "chapitre"
  }
}

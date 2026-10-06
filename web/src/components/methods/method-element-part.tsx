import { cn } from "cn"
import { EyeOff } from "lucide-react"
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import { BlocksEditorContext } from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import { findBlock, TITLE_MAX } from "@/blocks/draft"
import type { InsertableType } from "@/blocks/registry"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { BlockSettings } from "@/components/editor/block-settings"
import { BlocksLibrary } from "@/components/editor/blocks-library"
import { ColumnHeader } from "@/components/editor/column-header"
import { ReadView } from "@/components/editor/feed-preview"
import { FormatToolbar } from "@/components/editor/format-toolbar"
import { HistorySheet } from "@/components/editor/history-sheet"
import { MediaPicker } from "@/components/editor/media-picker"
import {
  OutlineBlocks,
  type FeedOutline,
} from "@/components/editor/outline-panel"
import { CoverPreview } from "@/components/editor/presentation"
import { SaveAsDialog } from "@/components/editor/save-as-dialog"
import { useBlockEditing } from "@/components/editor/use-block-editing"
import { usePartDraft } from "@/components/editor/use-part-draft"
import { usePhoneDrop } from "@/components/editor/use-phone-drop"
import { useRevert } from "@/components/editor/use-revert"
import { ElementPanel } from "@/components/methods/element-panel"
import { useMethodPage } from "@/components/methods/method-page-context"
import {
  ChapterLessons,
  LessonExercises,
  NextScreen,
} from "@/components/methods/method-preview"
import { useMethodPart } from "@/components/methods/use-method-part"
import { contentProblemText, type Content } from "@/lib/contents/api"
import {
  elementContextOf,
  partPath,
  partPlace,
  type ElementPart,
} from "@/lib/contents/method-page"
import {
  elementAccess,
  elementState,
  findInTree,
  nextScreen,
  notInAppReason,
  parentsInApp,
  screenReserved,
} from "@/lib/contents/outline"
import { previewLocked } from "@/lib/editor/preview"
import { contentProfile } from "@/lib/editor/profile"
import { focusSoon } from "@/lib/focus"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.methods.page
const MethodIcon = sections.methods.icon

/**
 * Un chapitre, une leçon ou un exercice dans la page de sa méthode (ADMIN § 4, « Une méthode sur
 * une seule page ») : dans le téléphone, à sa place, sa place et son titre, son image si elle
 * est choisie, ses blocs écrits sur place et « Ajouter un bloc ». Son brouillon s'enregistre de
 * lui-même sous le verrou de la méthode. Quand c'est la partie en cours, il montre ce qui le
 * concerne aux places de la page : sa colonne de droite (« Dans la méthode », niveau d'accès,
 * image ; les réglages du bloc choisi par-dessus), ses blocs sous sa ligne du plan, la barre de
 * mise en forme et les Blocs. En Lecture, son écran comme dans l'app, quand c'est celui qu'on lit.
 */
export const MethodElementPart = memo(function MethodElementPart({
  part,
  initial,
}: {
  part: ElementPart
  initial: Content
}) {
  const page = useMethodPage()
  const { id, kind } = part
  const [profile] = useState(() => contentProfile(kind))
  const current = page.currentId === id
  const place = partPlace(part) ?? ""
  // Le nom complet, unique dans la méthode, pour les lecteurs d'écran.
  const path = partPath(part) ?? place
  const titleId = `titre-${id}`
  const addId = `ajouter-bloc-${id}`

  const sync = usePartDraft({
    initial,
    session: page.session,
    lock: { ...page.lock, serverRev: page.partRev(id) },
    resumeSignal: page.resumeSignal,
    afterSave: page.afterPartSave,
  })
  const { draft, setDraft, settings, setSettings, editable } = sync
  useMethodPart(id, sync, titleId, {
    inApp: settings.inApp,
    isFree: settings.isFree,
  })

  // --- Les blocs ---------------------------------------------------------------------------

  // « Ajouter un bloc » ou « Ajouter dans la section » : cette partie devient la partie en cours,
  // et les Blocs s'ouvrent pour elle (openHere, plus bas).
  const openHere = useRef<(box: string | null) => void>(() => {})
  const onAddInBox = useCallback((box: string) => openHere.current(box), [])
  const editing = useBlockEditing({
    contentId: id,
    draft,
    setDraft,
    editable,
    reading: page.reading,
    profile,
    templateSort: null,
    prepare: sync.prepare,
    announce: page.announce,
    // Plus aucun bloc : le focus va à « Ajouter un bloc » de cette partie.
    emptyFocus: () => document.getElementById(addId),
    onAddInBox,
  })
  const { selectedId, setSelectedId, setBoxTarget, mediaFor } = editing
  const { templateName, resolveLinked } = editing.linked
  useEffect(() => {
    openHere.current = (box) => {
      page.setCurrent(id)
      setBoxTarget(box)
      if (box) setSelectedId(box)
      page.openLibrary()
    }
  })
  // Une autre partie devient la partie en cours : plus de bloc choisi ici.
  useEffect(() => {
    if (!current) setSelectedId(null)
  }, [current, setSelectedId])

  // Un bloc des Blocs glissé dans cette partie : à la place montrée par un trait.
  const {
    phoneRef,
    lineTop: dropLineTop,
    handlers: dropHandlers,
  } = usePhoneDrop<HTMLElement>(editable && !page.reading, (drag, index) => {
    page.setCurrent(id)
    editing.dropFromLibrary(drag, index)
  })

  const addFromLibrary = (type: InsertableType) => {
    page.toEdit()
    setBoxTarget(null)
    editing.addBlock(type, editing.targetBox ?? undefined)
  }

  // --- Le titre ------------------------------------------------------------------------------

  const title = draft.title
  const untitled = texts.common.untitled
  const label = labels.part(place, title.trim() || untitled)
  const titleRef = useAutoHeight(title)
  const onTitle = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = singleLine(event.target.value).slice(0, TITLE_MAX)
    setDraft((currentDraft) => ({ ...currentDraft, title: value }))
  }

  // --- Sa place dans la méthode, son état, son niveau d'accès -------------------------------

  const treePlace = useMemo(
    () => (page.tree ? findInTree(page.tree, id) : null),
    [page.tree, id]
  )
  const state = treePlace
    ? elementState(
        { ...treePlace.element, inApp: settings.inApp },
        parentsInApp(treePlace),
        page.liveSet,
        page.changesById
      )
    : undefined
  const problemRow = page.changesById?.get(id)
  const problem = problemRow?.problem
    ? contentProblemText(problemRow.problem, problemRow.problemDetail)
    : null
  const context = elementContextOf(part, page.method)
  const methodReserved =
    page.method.access.accessChosen && page.method.access.accessLevelId !== null
  // Le niveau d'accès de cette partie à la prochaine publication ([D43]) : celui de la méthode,
  // sauf leçon gratuite (et ses exercices), ou introduction d'un chapitre dont une leçon l'est.
  const ownAccess = elementAccess(
    page.method.access,
    {
      kind,
      isFree:
        treePlace?.kind === "exercise"
          ? treePlace.lesson.isFree
          : settings.isFree,
    },
    treePlace?.kind === "chapter" ? treePlace.element.lessons : []
  )
  const ownReserved = ownAccess.accessChosen && ownAccess.accessLevelId !== null

  // --- L'historique --------------------------------------------------------------------------

  const historyOpen = page.historyFor === id
  const onRevert = useRevert({
    contentId: id,
    session: page.session,
    prepare: sync.prepare,
    reload: sync.reload,
    notifyLost: page.lock.notifyLost,
    onDone: () => page.setHistoryFor(null),
  })

  // --- Dans le téléphone ---------------------------------------------------------------------

  const cover = draft.cover ? mediaFor(draft.cover.mediaId) : null
  let phone: ReactNode = null
  if (page.reading) {
    // En Lecture : son écran, comme dans l'app, quand c'est celui qu'on lit.
    if (current) {
      const visitor = page.preview.reader === "visitor"
      const next =
        kind !== "exercise" && page.tree ? nextScreen(page.tree, id) : null
      phone = (
        <BlocksEditorContext value={editing.readOnlyBlocks}>
          <ReadView
            draft={draft}
            title={title.trim() || untitled}
            cover={cover}
            audio={null}
            meta={null}
            locked={
              previewLocked(page.preview, ownAccess)
                ? {
                    kind,
                    level:
                      page.levels.data?.find(
                        (level) => level.id === ownAccess.accessLevelId
                      )?.name ?? null,
                  }
                : false
            }
            resolve={resolveLinked}
            after={
              <>
                {treePlace?.kind === "chapter" && (
                  <ChapterLessons
                    lessons={treePlace.element.lessons}
                    reserved={methodReserved}
                    subscriber={!visitor}
                  />
                )}
                {treePlace?.kind === "lesson" && (
                  <LessonExercises
                    exercises={treePlace.element.exercises}
                    locked={visitor && ownReserved}
                  />
                )}
                {next && (
                  <NextScreen
                    screen={next}
                    locked={visitor && screenReserved(next, methodReserved)}
                  />
                )}
              </>
            }
          />
        </BlocksEditorContext>
      )
    }
  } else {
    phone = (
      <section
        ref={phoneRef}
        data-part={id}
        data-part-kind={kind}
        aria-label={labels.part(path, title.trim() || untitled)}
        className={cn("blocks-part relative", !editable && "cursor-default")}
        // Un geste dans cette partie en fait la partie en cours (plan, colonne de droite).
        onFocusCapture={() => page.setCurrent(id)}
        onPointerDownCapture={() => page.setCurrent(id)}
        // Un clic hors d'un bloc ferme ses réglages.
        onClick={(event) => {
          if (
            event.target instanceof Element &&
            !event.target.closest("[data-block-id]")
          ) {
            setSelectedId(null)
          }
        }}
        // Le bloc survolé dans l'aperçu l'est aussi dans le plan.
        onPointerOver={(event) => {
          const block =
            event.target instanceof Element
              ? event.target.closest<HTMLElement>("[data-block-id]")
              : null
          editing.setHoveredId(block?.dataset.blockId ?? null)
        }}
        onPointerLeave={() => editing.setHoveredId(null)}
        {...dropHandlers}
      >
        {dropLineTop !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 h-0.5 -translate-y-1/2 rounded-full bg-primary"
            // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer
            style={{ top: dropLineTop }}
          />
        )}
        <p aria-hidden className="blocks-part-place">
          {place}
        </p>
        {/* L'image est facultative : seulement une fois choisie (la colonne de droite propose de
            la choisir). */}
        {cover && (
          <CoverPreview
            media={cover}
            editable={editable}
            onChoose={() => editing.openPresentationPicker("cover")}
            onSelect={() => setSelectedId(null)}
          />
        )}
        <textarea
          ref={titleRef}
          id={titleId}
          rows={1}
          className="blocks-title"
          value={title}
          maxLength={TITLE_MAX}
          readOnly={!editable}
          placeholder={texts.editor.title.placeholder}
          aria-label={labels.titleOf(path)}
          onChange={onTitle}
          onFocus={() => setSelectedId(null)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault()
          }}
        />
        <BlocksEditorContext value={editing.blocksValue}>
          <BlockCanvas key={sync.viewKey} draft={draft} />
        </BlocksEditorContext>
        {editable && editing.canAddRoot && (
          <AddBlockButton
            id={addId}
            className="mt-4"
            label={texts.editor.add.label}
            ariaLabel={labels.addBlockIn(path)}
            onClick={() => openHere.current(null)}
          />
        )}
      </section>
    )
  }

  // --- Aux places de la page, quand c'est la partie en cours ---------------------------------

  const { slots } = page
  const selectedBlock = selectedId
    ? (findBlock(draft, selectedId)?.block ?? null)
    : null
  const closeBlockPanel = () => {
    setSelectedId(null)
    focusSoon(() => document.getElementById(`colonne-${id}`))
  }
  const feed: FeedOutline = {
    mediaFor,
    hoveredId: editing.hoveredId,
    onHover: editing.setHoveredId,
    warningOf: editing.warningOf,
    onMove: editable ? setDraft : undefined,
    onAdd: editable ? () => openHere.current(null) : undefined,
    onAddInBox: editable ? onAddInBox : undefined,
    actions: editable
      ? {
          onDuplicate: editing.onDuplicate,
          onSaveToMine: (blockId) => editing.saveAs.openFor([blockId]),
          onLeaveBox: editing.onLeaveBox,
          onRemove: editing.onRemove,
          removeBlocked: () => null,
          rootFull: !editing.canAddRoot,
        }
      : undefined,
  }
  const hiddenReason =
    page.reading && treePlace ? notInAppReason(treePlace, settings.inApp) : null

  return (
    <>
      {phone}
      {current && (
        <>
          {slots.toolbar &&
            !page.reading &&
            createPortal(
              <FormatToolbar
                editor={editing.toolbarEditor}
                editable={editable}
              />,
              slots.toolbar
            )}
          {slots.planBlocks &&
            createPortal(
              <OutlineBlocks
                draft={draft}
                selectedId={selectedId}
                onSelect={editing.selectAndShow}
                templateName={templateName}
                feed={feed}
              />,
              slots.planBlocks
            )}
          {slots.library &&
            page.libraryOpen &&
            createPortal(
              <BlocksLibrary
                open={page.savedOpen}
                onOpenChange={page.setSavedOpen}
                editable={editable}
                canAdd={editing.canAddRoot}
                inBox={editing.targetBox !== null}
                onCancelTarget={() => setBoxTarget(null)}
                onAdd={addFromLibrary}
                onInsert={(template) => {
                  page.toEdit()
                  editing.onInsertTemplate(template)
                }}
              />,
              slots.library
            )}
          {slots.notices &&
            hiddenReason &&
            createPortal(
              <p
                role="status"
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <EyeOff aria-hidden className="size-4 shrink-0" />
                {texts.editor.preview.notInApp[hiddenReason]}
              </p>,
              slots.notices
            )}
          {slots.right &&
            createPortal(
              <>
                <ColumnHeader
                  icon={MethodIcon}
                  title={label}
                  titleId={`colonne-${id}`}
                  large
                />
                <div className="relative min-h-0 flex-1">
                  <section
                    aria-label={labels.options(label)}
                    // Sous la glissière du bloc : hors du clavier et des lecteurs d'écran.
                    inert={selectedBlock !== null}
                    className="h-full overflow-y-auto px-4 py-3"
                  >
                    <ElementPanel
                      kind={kind}
                      draft={draft}
                      editable={editable}
                      reading={page.reading}
                      settings={settings}
                      onSettingsChange={setSettings}
                      context={context}
                      place={treePlace}
                      state={state}
                      problem={problem}
                      schedule={page.schedule}
                      levels={page.levels.data}
                      levelsFailed={page.levels.failed}
                      retryLevels={page.levels.retry}
                      cover={mediaFor(draft.cover?.mediaId ?? null)}
                      onChooseCover={() =>
                        editing.openPresentationPicker("cover")
                      }
                      onRemoveCover={() =>
                        editing.removePresentationFile("cover")
                      }
                      onHistory={() => page.setHistoryFor(id)}
                    />
                  </section>
                  {/* Les réglages du bloc choisi, en glissière par-dessus. */}
                  {selectedBlock && (
                    <div className="absolute inset-0 z-10 bg-background motion-safe:animate-in motion-safe:slide-in-from-right-4">
                      <BlockSettings
                        {...editing.blockSettings}
                        onClose={closeBlockPanel}
                        onSaveAsTemplate={(blockId) =>
                          editing.saveAs.openFor([blockId])
                        }
                      />
                    </div>
                  )}
                </div>
              </>,
              slots.right
            )}
        </>
      )}
      <MediaPicker
        kind={editing.isAudioPicker ? "audio" : "image"}
        open={editing.pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) editing.setPickerFor(null)
        }}
        onChoose={editing.onChooseImage}
        finalFocus={editing.pickerFinalFocus}
      />
      <SaveAsDialog saveAs={editing.saveAs} kind={kind} />
      {historyOpen && (
        <HistorySheet
          open
          onOpenChange={(open) => {
            if (!open) page.setHistoryFor(null)
          }}
          contentId={id}
          kind={kind}
          liveVersionId={null}
          canRevert={editable}
          onRevert={onRevert}
        />
      )}
    </>
  )
})

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import { Info } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react"
import { Link, useBlocker, useParams } from "react-router"

import "@/blocks/components/preview.css"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import { BlocksEditorContext } from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import {
  DRAFT_WARN_BYTES,
  draftBytes,
  findBlock,
  readingStats,
  TITLE_MAX,
} from "@/blocks/draft"
import type { InsertableType } from "@/blocks/registry"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { BlockSettings } from "@/components/editor/block-settings"
import { EditorSkeleton } from "@/components/editor/editor-skeleton"
import { SaveAsDialog } from "@/components/editor/save-as-dialog"
import { useBlockEditing } from "@/components/editor/use-block-editing"
import { useDraftSync } from "@/components/editor/use-draft-sync"
import { usePhoneView } from "@/components/editor/use-phone-view"
import { useFocusMode } from "@/components/editor/use-focus-mode"
import { usePhoneDrop } from "@/components/editor/use-phone-drop"
import { ColumnHeader } from "@/components/editor/column-header"
import {
  BackLink,
  EditorNotFound,
  FocusPill,
  LeaveDialog,
  LibraryDrawer,
} from "@/components/editor/editor-chrome"
import {
  FeedPreview,
  ReadAppBar,
  ReadView,
} from "@/components/editor/feed-preview"
import { FormatToolbar } from "@/components/editor/format-toolbar"
import { HistorySheet } from "@/components/editor/history-sheet"
import {
  LockBanner,
  LockButton,
  LockDialog,
} from "@/components/editor/lock-banner"
import { MediaPicker } from "@/components/editor/media-picker"
import {
  OutlinePanel,
  type FeedOutline,
} from "@/components/editor/outline-panel"
import { ArticleFooter, ArticlePanel } from "@/components/editor/article-panel"
import {
  BlocksLibrary,
  LIBRARY_FIRST_ID,
} from "@/components/editor/blocks-library"
import { AudioPreview, CoverPreview } from "@/components/editor/presentation"
import {
  PublicationDialogs,
  PublicationBadge,
  PublishButton,
  ScheduleBanner,
} from "@/components/editor/publication"
import { SaveStatus } from "@/components/editor/save-status"
import { usePublication } from "@/components/editor/use-publication"
import { useRevert } from "@/components/editor/use-revert"
import { useAccessCheck } from "@/components/team/use-access-check"
import {
  TemplateSortBadge,
  TemplateSortCard,
  TemplateUsesCard,
} from "@/components/templates/template-cards"
import { buttonVariants } from "@/components/ui/button"
import { useCategories } from "@/hooks/use-categories"
import { useLockDialog } from "@/hooks/use-lock-dialog"
import { categoryNames } from "@/lib/categories"
import { contentKeys, type Content, type ContentKind } from "@/lib/contents/api"
import { publishChecks, readyItems } from "@/lib/contents/requirements"
import {
  isTemplateFor,
  isTemplateSort,
  templateKeys,
} from "@/lib/contents/templates"
import { previewLocked, type PreviewSettings } from "@/lib/editor/preview"
import { focusOnceShown } from "@/lib/editor/block-focus"
import { contentProfile, isListedKind } from "@/lib/editor/profile"
import { lockSituation } from "@/lib/editor/lock-view"
import { CONTENT_TITLE_ID, showReadySetting } from "@/lib/editor/ready-targets"
import { focusSoon, highlightSoon } from "@/lib/focus"
import { mediaKeys } from "@/lib/media/api"
import { formatDuration } from "@/lib/media/format"
import { accessLevelsRead, contentRead } from "@/lib/reads"
import {
  rememberOpened,
  RETURN_STATE,
  returnAddress,
} from "@/lib/scroll-memory"
import { sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

/** L'éditeur plein écran d'un contenu : /pages/<id>. Le menu de l'admin se cache. */
export function EditorPage({
  section,
  kind,
}: {
  section: SectionKey
  // La sorte de contenu de cette section : un autre contenu ne s'ouvre pas ici.
  kind: ContentKind
}) {
  const { contentId = "" } = useParams()
  // Un autre contenu ouvert par la même adresse : tout repart de zéro.
  return (
    <EditorLoader
      key={contentId}
      contentId={contentId}
      section={section}
      kind={kind}
    />
  )
}

function EditorLoader({
  contentId,
  section,
  kind,
}: {
  contentId: string
  section: SectionKey
  kind: ContentKind
}) {
  const checkAccess = useAccessCheck()
  const queryClient = useQueryClient()
  // Un contenu changé ailleurs sans que son brouillon change (« Restaurer » de la Corbeille) : sa
  // lecture en mémoire est marquée périmée. L'éditeur ne lit son état de départ qu'une fois, à
  // son ouverture : il attend alors la relecture au lieu de partir de l'ancienne.
  const [mustWaitFresh] = useState(
    () =>
      queryClient.getQueryState(contentKeys.detail(contentId))?.isInvalidated ??
      false
  )
  const content = useQuery({
    ...contentRead(contentId),
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (content.error) checkAccess(content.error)
  }, [content.error, checkAccess])

  const waitingFresh =
    mustWaitFresh && !content.isFetchedAfterMount && !content.isError
  // En attendant le brouillon (au premier chargement, ou au-delà des 2 secondes de préparation) :
  // l'écran a déjà la forme de l'éditeur.
  if (content.isPending || waitingFresh) {
    return <EditorSkeleton back={<BackLink section={section} compact />} />
  }

  // Seule la première lecture compte ici : l'éditeur relit ensuite le brouillon lui-même, et
  // un échec de ces relectures ne doit jamais le fermer (le texte à l'écran serait perdu).
  if (!content.data || content.data.deleted_at || content.data.kind !== kind) {
    const failed = content.isError && content.data === undefined
    return (
      <EditorNotFound
        section={section}
        message={failed ? content.error.message : null}
        retry={failed ? () => void content.refetch() : null}
      />
    )
  }

  return (
    <ContentEditor
      key={contentId}
      initial={content.data}
      section={section}
      kind={kind}
    />
  )
}

// « Ajouter un bloc » en bas de la colonne de gauche (le focus y revient quand la glissière des
// blocs se ferme).
const LEFT_ADD_ID = "colonne-gauche-ajouter"
// Le titre de la colonne de droite (le focus y revient quand la glissière du bloc se ferme).
const ARTICLE_TITLE_ID = "colonne-article-titre"

function ContentEditor({
  initial,
  section,
  kind,
}: {
  initial: Content
  section: SectionKey
  kind: ContentKind
}) {
  const contentId = initial.id
  const queryClient = useQueryClient()
  // Au retour à sa liste, la ligne de ce contenu s'allume un instant (lib/scroll-memory.ts).
  useEffect(() => rememberOpened(contentId), [contentId])
  // Un modèle : le même éditeur, sans publication ni réglages d'accès (ADMIN § 5) ; son nom et sa
  // liste sont les siens.
  const isTemplate = kind === "template"
  const templateSort =
    isTemplate && isTemplateSort(initial.template_sort)
      ? initial.template_sort
      : null
  const isShared = templateSort === "shared"
  // Ce que demande cette sorte de contenu et ce que montre son éditeur (lib/editor/profile.ts).
  const [profile] = useState(() => contentProfile(kind, templateSort))
  const categorySection = profile.categories
  // Pas d'onglets. À gauche, le Plan, et les Blocs en glissière par-dessus ; à droite, l'Article,
  // et les réglages du bloc choisi en glissière par-dessus.
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Le téléphone montré, gardé dans l'adresse ; en Lecture, on ne prend pas la main.
  const { phoneView, setPhoneView, reading, toEdit } = usePhoneView()
  // Le panneau « Mes blocs », par-dessus les Blocs.
  const [savedOpen, setSavedOpen] = useState(false)
  // Annonce pour les lecteurs d'écran (bloc monté ou descendu).
  const [announcement, setAnnouncement] = useState("")
  // Le mode Concentration cache les deux colonnes (⌘ . ou Ctrl + ., Échap).
  const {
    focusMode,
    setFocusMode,
    apple,
    toggle: toggleFocusMode,
    tool,
  } = useFocusMode(setAnnouncement)

  // Le brouillon et ses réglages, tenus à jour avec la base (enregistrement, verrou, relecture).
  // Après chaque enregistrement : ce qui en dépend ailleurs est relu.
  const {
    editorSession,
    draft,
    setDraft,
    settings,
    setSettings,
    refusedSlug,
    setRefusedSlug,
    loadedRev,
    viewKey,
    autosave,
    lock,
    editable,
    mustReload,
    reloadFailed,
    reload,
    take,
    prepare,
    applySettings,
    canCopy,
    copy: onCopy,
    dismissStash,
  } = useDraftSync({
    initial,
    writing: !reading,
    afterSave: () => {
      // « Utilisé dans » de la médiathèque et liste des pages.
      void queryClient.invalidateQueries({ queryKey: mediaKeys.allUses })
      void queryClient.invalidateQueries({ queryKey: contentKeys.list(kind) })
      // Un modèle : sa liste, les contenus à mettre à jour dans l'app, les brouillons qui le
      // montrent (bloc lié). Un contenu : les brouillons qui utilisent chaque modèle, et ce qui
      // est à mettre à jour dans l'app (un bloc lié ajouté, retiré ou détaché).
      if (isTemplate) {
        void queryClient.invalidateQueries({ queryKey: templateKeys.all })
      } else {
        void queryClient.invalidateQueries({ queryKey: templateKeys.uses })
        void queryClient.invalidateQueries({
          queryKey: templateKeys.allOutdated,
        })
      }
    },
  })
  const phase = lock.state.phase
  const serverRev = lock.state.draftRev
  const holderIsMe = lock.state.holderId === lock.myId
  // La lecture seule passe par le cadenas et sa fenêtre (ADMIN § 4) ; pas en Lecture, où l'on
  // ne prend pas la main.
  const lockView = reading ? null : lockSituation(lock.state, holderIsMe)
  const lockDialog = useLockDialog(lockView)

  // --- Les blocs ---------------------------------------------------------------------------

  // « Ajouter dans la section » ouvre les Blocs pour elle (openLibrary, plus bas).
  const openLibraryRef = useRef<(box: string | null) => void>(() => {})
  const onAddInBox = useCallback(
    (boxId: string) => openLibraryRef.current(boxId),
    []
  )
  const editing = useBlockEditing({
    contentId,
    draft,
    setDraft,
    editable,
    reading,
    profile,
    templateSort,
    prepare,
    announce: setAnnouncement,
    // Plus aucun bloc : le focus va à « Ajouter un bloc », toujours là en bas à gauche.
    emptyFocus: () => document.getElementById(LEFT_ADD_ID),
    onAddInBox,
  })
  const {
    selectedId,
    setSelectedId,
    setBoxTarget,
    targetBox,
    hoveredId,
    setHoveredId,
    setPickerFor,
    mediaFor,
    addBlock,
    selectAndShow,
    warnedIds,
    onInsertTemplate,
    removePresentationFile,
    openPresentationPicker,
    canAddRoot,
    keepsBlock,
    saveAs,
  } = editing
  const { linkedIds, templateName, resolveLinked } = editing.linked

  const onPreviewChange = (next: PreviewSettings) => {
    if (next.mode === "read") setSelectedId(null)
    setPhoneView(() => next)
  }

  // Un bloc des Blocs glissé dans l'aperçu, à la place montrée par un trait.
  const {
    phoneRef,
    lineTop: dropLineTop,
    handlers: dropHandlers,
  } = usePhoneDrop(
    editable && phoneView.mode === "edit",
    editing.dropFromLibrary
  )

  // Ajouter un bloc ouvre les Blocs, le curseur sur le premier ; depuis une section, elle devient
  // le bloc choisi et un bandeau le dit (ADMIN § 4).
  const openLibrary = (box: string | null = null) => {
    setFocusMode(false)
    setLibraryOpen(true)
    setSavedOpen(false)
    setBoxTarget(box)
    if (box) setSelectedId(box)
    focusSoon(() => document.getElementById(LIBRARY_FIRST_ID))
  }
  useEffect(() => {
    openLibraryRef.current = openLibrary
  })
  // Un bloc des Blocs : à la fin de la section visée, sinon sous le bloc choisi (ou à la fin).
  const addFromLibrary = (type: InsertableType) => {
    toEdit()
    setBoxTarget(null)
    addBlock(type, targetBox ?? undefined)
  }
  // La glissière des Blocs refermée : le Plan, sans cible.
  const closeLibrary = () => {
    setLibraryOpen(false)
    setSavedOpen(false)
    setBoxTarget(null)
  }
  // Un clic sur le fond autour du téléphone : aucun bloc choisi, le Plan, l'Article.
  const resetFeedEditor = () => {
    setSelectedId(null)
    closeLibrary()
  }
  // La glissière du bloc fermée : plus de bloc choisi, le focus au titre de la colonne.
  const closeBlockPanel = () => {
    setSelectedId(null)
    focusSoon(() => document.getElementById(ARTICLE_TITLE_ID))
  }

  // --- Réglages du contenu, publication, historique -----------------------------------------

  const levels = useQuery(accessLevelsRead())
  const [historyOpen, setHistoryOpen] = useState(false)

  /** « Revenir à cette version » : recopiée dans le brouillon par la base, puis relue. */
  const onRevert = useRevert({
    contentId,
    session: editorSession,
    prepare,
    reload,
    notifyLost: lock.notifyLost,
    onDone: () => setHistoryOpen(false),
  })

  // Les catégories de la section (article ou épisode) : réglages et présentation.
  const categories = useCategories(categorySection)
  const chosenCategoryNames = useMemo(
    () =>
      categories.data
        ? categoryNames(settings.categoryIds, categories.data)
        : undefined,
    [categories.data, settings.categoryIds]
  )

  // Ce qui manque pour publier ([D45], audio) et le conseil [D46] : expliqués avant l'envoi.
  const checks = useMemo(
    () =>
      profile.titleRequired ? publishChecks(kind, draft, mediaFor) : undefined,
    [profile, kind, draft, mediaFor]
  )

  const pub = usePublication({
    contentId,
    kind,
    enabled: profile.publication === "own",
    draftRev: Math.max(autosave.rev, serverRev ?? 0, loadedRev),
    unsaved: autosave.unsaved,
    editable,
    settings,
    levels: levels.data,
    levelsFailed: levels.isError,
    retryLevels: () => void levels.refetch(),
    prepare,
    applySettings,
    takeLock: () => take(true),
    checks,
    // Le titre : le curseur y va ; une image ou un audio : le choix du fichier s'ouvre ; l'adresse
    // d'une page : sa carte s'allume (colonnes montrées, glissière du bloc fermée).
    onFix: (key) => {
      if (key === "title") {
        setSelectedId(null)
        focusOnceShown(() => document.getElementById(CONTENT_TITLE_ID))
      } else if (key === "address") {
        setSelectedId(null)
        setFocusMode(false)
        showReadySetting("address")
      } else openPresentationPicker(key)
    },
  })

  const openSaveAs = saveAs.openFor

  // --- Quitter -----------------------------------------------------------------------------

  const risky =
    autosave.unsaved &&
    (autosave.status === "offline" ||
      autosave.status === "failed" ||
      autosave.status === "stopped")
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      risky && currentLocation.pathname !== nextLocation.pathname
  )

  const title = draft.title
  const titleRef = useAutoHeight(title)
  const onTitle = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = singleLine(event.target.value).slice(0, TITLE_MAX)
    setDraft((current) => ({ ...current, title: value }))
  }

  const nearLimit = useMemo(() => draftBytes(draft) > DRAFT_WARN_BYTES, [draft])
  // Temps de lecture et nombre de mots (blocs partagés compris).
  const stats = useMemo(
    () => readingStats(draft, resolveLinked),
    [draft, resolveLinked]
  )

  // En tête de l'aperçu : l'image de présentation, le titre et l'audio, comme dans l'app.
  const phoneTop = (
    <>
      {profile.cover === "required" && (
        <CoverPreview
          media={mediaFor(draft.cover?.mediaId ?? null)}
          editable={editable}
          onChoose={() => openPresentationPicker("cover")}
          onSelect={() => setSelectedId(null)}
        />
      )}
      <textarea
        ref={titleRef}
        id={CONTENT_TITLE_ID}
        rows={1}
        className="blocks-title"
        value={title}
        maxLength={TITLE_MAX}
        readOnly={!editable}
        placeholder={
          isTemplate
            ? texts.templates.editor.namePlaceholder
            : texts.editor.title.placeholder
        }
        aria-label={
          isTemplate
            ? texts.templates.editor.nameLabel
            : texts.editor.title.label
        }
        onChange={onTitle}
        onFocus={profile.cover !== null ? () => setSelectedId(null) : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault()
        }}
      />
      {profile.audio && (
        <AudioPreview
          media={mediaFor(draft.audio?.mediaId ?? null)}
          editable={editable}
          onChoose={() => openPresentationPicker("audio")}
          onSelect={() => setSelectedId(null)}
        />
      )}
    </>
  )

  // Un épisode : son audio (carte Audio, téléphone, Lecture, bas de la colonne de droite).
  const audio = profile.audio ? mediaFor(draft.audio?.mediaId ?? null) : null
  // En Lecture, sous le titre d'un contenu des listes de l'app : la première catégorie, puis le
  // temps de lecture (un épisode : la durée de son audio, une fois connue). Une page n'en a pas.
  const length = audio
    ? audio.state === "ready" && audio.media.duration_s !== null
      ? formatDuration(audio.media.duration_s)
      : null
    : texts.editor.preview.minutes(stats.minutes)
  const readMeta = isListedKind(kind)
    ? [
        ...(chosenCategoryNames ?? []).slice(0, 1),
        ...(length ? [length] : []),
      ].join(" · ")
    : null
  const onSettingsChange = (next: typeof settings) => {
    if (next.slug !== settings.slug) setRefusedSlug(null)
    setSettings(next)
  }
  // La colonne de droite, tout ce qui concerne l'article (l'épisode, la page) ; un modèle de bloc
  // ne se publie pas : sa sorte et, pour un bloc partagé, où il est utilisé.
  const articlePanel =
    kind === "template" ? (
      <div className="space-y-3">
        {!editable && (
          <p className="text-sm text-muted-foreground">
            {reading
              ? texts.editor.preview.reading
              : texts.editor.settings.readOnly}
          </p>
        )}
        {templateSort && (
          <TemplateSortCard
            sort={templateSort}
            templateFor={
              isTemplateFor(initial.template_for) ? initial.template_for : null
            }
          />
        )}
        {isShared && <TemplateUsesCard templateId={contentId} />}
      </div>
    ) : (
      <ArticlePanel
        kind={kind}
        contentId={contentId}
        draft={draft}
        editable={editable}
        reading={reading}
        settings={settings}
        onSettingsChange={onSettingsChange}
        refusedSlug={refusedSlug}
        levels={levels.data}
        levelsFailed={levels.isError}
        retryLevels={() => void levels.refetch()}
        live={pub.publication?.live ?? null}
        categories={
          categorySection
            ? {
                section: categorySection,
                list: categories.data,
                failed: categories.isError,
                retry: () => void categories.refetch(),
              }
            : null
        }
        cover={mediaFor(draft.cover?.mediaId ?? null)}
        audio={audio}
        ready={readyItems(
          kind,
          checks ?? { missing: [], advice: [] },
          settings
        )}
        warnings={{
          count: warnedIds.length,
          // Le premier point à vérifier, choisi et montré dans le plan.
          onShow: () => {
            const first = warnedIds[0]
            if (!first) return
            closeLibrary()
            selectAndShow(first)
            // Sa ligne s'allume dans le plan, une fois les Blocs refermés.
            highlightSoon(() =>
              document.querySelector<HTMLElement>(
                `[data-outline-id="${first}"]`
              )
            )
          },
        }}
        onChooseCover={() => openPresentationPicker("cover")}
        onRemoveCover={() => removePresentationFile("cover")}
        onChooseAudio={() => openPresentationPicker("audio")}
        onRemoveAudio={() => removePresentationFile("audio")}
      />
    )
  // Le bloc choisi, dont les réglages glissent par-dessus l'Article.
  const selectedBlock = selectedId
    ? (findBlock(draft, selectedId)?.block ?? null)
    : null
  const blockSettings = (
    <BlockSettings
      {...editing.blockSettings}
      onClose={closeBlockPanel}
      onSaveAsTemplate={
        profile.savedBlocks ? (id) => openSaveAs([id]) : undefined
      }
    />
  )

  // Le plan, dans la colonne de gauche : le contenu de chaque bloc (première ligne d'un texte,
  // vignette d'une image) et ce qui manque, avec un menu ⋮ par ligne.
  const feedOutline: FeedOutline = {
    mediaFor,
    hoveredId,
    onHover: setHoveredId,
    warningOf: editing.warningOf,
    onMove: editable ? setDraft : undefined,
    onAdd: editable ? () => openLibrary() : undefined,
    onAddInBox: editable ? onAddInBox : undefined,
    actions: editable
      ? {
          onDuplicate: editing.onDuplicate,
          onSaveToMine: profile.savedBlocks
            ? (id) => openSaveAs([id])
            : undefined,
          onLeaveBox: editing.onLeaveBox,
          onRemove: editing.onRemove,
          removeBlocked: (id) =>
            keepsBlock && id === draft.blocks[0]?.id
              ? texts.templates.editor.keepBlock
              : null,
          rootFull: !canAddRoot,
        }
      : undefined,
    rootLimit: profile.rootLimit,
  }
  // La sortie en haut à gauche (ADMIN § 4, « Le retour en haut ») : dans l'en-tête du plan, et dans
  // celui des Blocs quand leur glissière le couvre.
  const backLink = <BackLink section={section} compact />
  const outlinePanel = (
    <OutlinePanel
      draft={draft}
      selectedId={selectedId}
      onSelect={selectAndShow}
      templateName={templateName}
      feed={feedOutline}
      selection={profile.savedBlocks && editable ? saveAs.selection : undefined}
      // Une seule flèche à la fois : sous la glissière des Blocs, c'est la leur.
      back={libraryOpen ? undefined : backLink}
    />
  )

  // Au-dessus du téléphone, à sa largeur (la grille de l'aperçu les espace elle-même) : brouillon
  // trop lourd, échec d'enregistrement.
  const notices = (
    <>
      {nearLimit && (
        <p role="status" className="text-sm text-warning">
          {texts.editor.save.nearLimit}
        </p>
      )}
      {reloadFailed && mustReload && (
        <p role="status" className="text-sm text-warning">
          {texts.editor.save.rereadFailed}
        </p>
      )}
      {autosave.status === "failed" && autosave.error && (
        <p role="alert" className="text-sm text-destructive">
          {autosave.error.message} {autosave.error.detail}
        </p>
      )}
    </>
  )
  // Le téléphone en Édition : la présentation et les blocs, modifiables sur place. Le cadre du
  // téléphone l'entoure (FeedPreview) ; le trait d'un bloc glissé se place par rapport à lui.
  const phone = (
    <div
      ref={phoneRef}
      className={cn("blocks-phone relative", !editable && "cursor-default")}
      // Un clic hors d'un bloc ferme ses réglages (l'Article revient).
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
        setHoveredId(block?.dataset.blockId ?? null)
      }}
      onPointerLeave={() => setHoveredId(null)}
      {...dropHandlers}
    >
      {dropLineTop !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-5 z-10 h-0.5 -translate-y-1/2 rounded-full bg-primary"
          // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer
          style={{ top: dropLineTop }}
        />
      )}
      {phoneTop}
      <BlocksEditorContext value={editing.blocksValue}>
        <BlockCanvas key={viewKey} draft={draft} />
      </BlocksEditorContext>
      {/* Un seul bouton, qui ouvre les Blocs. */}
      {editable && draft.blocks.length === 0 && (
        <AddBlockButton
          large
          label={texts.editor.add.label}
          onClick={() => openLibrary()}
        />
      )}
      {editable && draft.blocks.length > 0 && canAddRoot && (
        <AddBlockButton
          className="mt-6"
          label={texts.editor.add.label}
          onClick={() => openLibrary()}
        />
      )}
    </div>
  )

  const sectionTitle = texts.sections[section].title
  const SectionIcon = sections[section].icon
  const untitled = isTemplate
    ? texts.templates.list.untitled
    : texts.common.untitled

  const publishDisabled = phase === "taking" || phase === "error"
  // Au-dessus du téléphone, à sa largeur.
  const lockBanner = (
    <LockBanner
      lock={lock.state}
      autosave={autosave}
      canCopy={canCopy}
      onTake={take}
      onCopy={() => void onCopy()}
      onReload={reload}
      onDismissCopy={dismissStash}
    />
  )
  const scheduleBanner = (
    <ScheduleBanner
      pub={pub}
      leave={
        <Link
          to={returnAddress(sections[section].path)}
          state={RETURN_STATE}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {texts.publication.banner.leave}
        </Link>
      }
    />
  )
  // L'état de l'enregistrement : dans la pastille de la Concentration, et en icône seule en bas de
  // la colonne de droite.
  const saveVisible = phase === "mine" || autosave.unsaved
  const saveStatus = <SaveStatus state={autosave} visible={saveVisible} />
  const feedSaveStatus = (
    <SaveStatus state={autosave} visible={saveVisible} compact />
  )
  const lockButton = lockView && (
    <LockButton
      expanded={lockDialog.open}
      onClick={() => lockDialog.setOpen(true)}
    />
  )

  return (
    <div className="flex h-svh flex-col bg-muted/40">
      <title>{`${title.trim() || untitled} — ${texts.app.name}`}</title>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {/* La mise en page du Fil (ADMIN § 4) : à gauche le plan des blocs, au centre le téléphone,
          à droite tout ce qui concerne le contenu. */}
      <div className="flex min-h-0 flex-1">
        <aside
          id="editeur-plan"
          aria-label={texts.editor.columns.left}
          // Caché (et non retiré) en Concentration : les Blocs et « Mes blocs » restent ouverts.
          className={cn(
            "flex w-feed-column shrink-0 flex-col border-r bg-background",
            focusMode && "hidden"
          )}
        >
          <div className="relative min-h-0 flex-1">
            {/* Sous la glissière des Blocs : hors du clavier et des lecteurs d'écran. */}
            <div inert={libraryOpen} className="h-full">
              {outlinePanel}
            </div>
            {/* Les Blocs, en glissière par-dessus le Plan : × ou Échap la referment. */}
            {libraryOpen && (
              <LibraryDrawer
                back={backLink}
                onClose={() => {
                  closeLibrary()
                  focusSoon(() => document.getElementById(LEFT_ADD_ID))
                }}
              >
                <BlocksLibrary
                  open={savedOpen}
                  onOpenChange={setSavedOpen}
                  editable={editable}
                  canAdd={canAddRoot}
                  inBox={targetBox !== null}
                  onCancelTarget={() => setBoxTarget(null)}
                  onAdd={addFromLibrary}
                  onInsert={
                    profile.savedBlocks
                      ? (template) => {
                          toEdit()
                          onInsertTemplate(template)
                        }
                      : undefined
                  }
                />
              </LibraryDrawer>
            )}
          </div>
          {/* Un bloc partagé : la règle d'un seul bloc ([D11]), qui grise « Ajouter un bloc ».
              L'icône orange la signale (la couleur des avertissements). */}
          {isShared && (
            <p className="flex shrink-0 items-start gap-2 px-4 pb-3 text-xs text-muted-foreground">
              <Info aria-hidden className="size-4 shrink-0 text-warning" />
              <span>{texts.templates.editor.sharedLimit}</span>
            </p>
          )}
          {/* En bas, de la même hauteur que le bas de la colonne de droite : « Ajouter un bloc »
              sur toute la largeur (le retour est en haut, dans l'en-tête du plan). */}
          <div className="flex h-feed-footer shrink-0 items-stretch border-t">
            <div className="flex min-w-0 flex-1 items-center px-4">
              {/* Le même bouton que dans le téléphone ; en Lecture, il repasse en Édition. */}
              <AddBlockButton
                id={LEFT_ADD_ID}
                label={texts.editor.add.label}
                disabled={(!editable && !reading) || !canAddRoot}
                onClick={() => {
                  if (reading) toEdit()
                  openLibrary()
                }}
              />
            </div>
          </div>
        </aside>

        <main
          className="flex min-w-0 flex-1 flex-col overflow-x-auto bg-dot-grid"
          data-backdrop
          // Un clic sur le fond autour du téléphone (data-backdrop) remet l'éditeur à son état de
          // base. La souris seulement : au clavier, Échap et « Fermer ».
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.hasAttribute("data-backdrop")
            )
              resetFeedEditor()
          }}
        >
          <FeedPreview
            preview={phoneView}
            onPreviewChange={onPreviewChange}
            readers={profile.access !== null}
            toolbar={
              <FormatToolbar
                editor={editing.toolbarEditor}
                editable={editable}
              />
            }
            focus={tool}
            notices={
              <>
                {lockBanner}
                {profile.publication === "own" && scheduleBanner}
                {notices}
              </>
            }
            appBar={reading ? <ReadAppBar section={sectionTitle} /> : undefined}
          >
            {phoneView.mode === "read" ? (
              // Les images lisent l'éditeur (fichier, aperçu), en lecture seule.
              <BlocksEditorContext value={editing.readOnlyBlocks}>
                <ReadView
                  draft={draft}
                  title={title.trim() || untitled}
                  cover={
                    profile.cover === "required"
                      ? mediaFor(draft.cover?.mediaId ?? null)
                      : null
                  }
                  audio={audio}
                  meta={readMeta}
                  locked={
                    kind !== "template" && previewLocked(phoneView, settings)
                      ? {
                          kind,
                          level:
                            levels.data?.find(
                              (level) => level.id === settings.accessLevelId
                            )?.name ?? null,
                        }
                      : false
                  }
                  resolve={resolveLinked}
                />
              </BlocksEditorContext>
            ) : (
              phone
            )}
          </FeedPreview>
        </main>

        <aside
          aria-label={texts.editor.columns.right[kind]}
          className={cn(
            "flex w-feed-column shrink-0 flex-col border-l bg-background",
            focusMode && "hidden"
          )}
        >
          {/* En tête, l'icône de la section et le titre du contenu (en entier dans l'infobulle
              s'il est coupé). */}
          <ColumnHeader
            icon={SectionIcon}
            title={title.trim() || untitled}
            titleId={ARTICLE_TITLE_ID}
            large
          />
          <div className="relative min-h-0 flex-1">
            <section
              aria-label={texts.editor.columns.content[kind]}
              // Sous la glissière du bloc : hors du clavier et des lecteurs d'écran.
              inert={selectedBlock !== null}
              className="h-full overflow-y-auto px-4 py-3"
            >
              {articlePanel}
            </section>
            {/* Les réglages du bloc choisi, en glissière par-dessus l'Article. */}
            {selectedBlock && (
              <div className="absolute inset-0 z-10 bg-background motion-safe:animate-in motion-safe:slide-in-from-right-4">
                {blockSettings}
              </div>
            )}
          </div>
          {/* En bas, toujours : la lecture (un épisode : la durée de son audio), la dernière
              modification, puis le cadenas (en lecture seule), l'état de publication et
              « Publier ». */}
          <ArticleFooter
            stats={stats}
            audio={audio}
            savedAt={autosave.savedAt}
            saveStatus={feedSaveStatus}
          >
            {lockButton}
            {templateSort ? (
              // Un modèle ne se publie pas : sa sorte, à la place.
              <TemplateSortBadge sort={templateSort} />
            ) : (
              <>
                <PublicationBadge pub={pub} />
                <span className="flex-1" />
                <PublishButton
                  pub={pub}
                  disabled={publishDisabled}
                  alwaysPublishable={linkedIds.length > 0}
                  onHistory={() => setHistoryOpen(true)}
                />
              </>
            )}
          </ArticleFooter>
        </aside>
      </div>

      {focusMode && (
        <FocusPill
          apple={apple}
          saveStatus={saveStatus}
          lockButton={lockButton}
          onExit={toggleFocusMode}
        />
      )}
      <LockDialog
        situation={lockView}
        holderName={lock.state.holderName}
        open={lockDialog.open}
        onOpenChange={lockDialog.setOpen}
        canCopy={canCopy}
        onTake={take}
        onCopy={() => void onCopy()}
      />

      {!isTemplate && (
        <>
          <HistorySheet
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            contentId={contentId}
            kind={kind}
            liveVersionId={pub.publication?.live?.id ?? null}
            canRevert={editable}
            onRevert={onRevert}
          />
          <PublicationDialogs pub={pub} />
          <SaveAsDialog saveAs={saveAs} kind={kind} />
        </>
      )}

      <MediaPicker
        kind={editing.isAudioPicker ? "audio" : "image"}
        open={editing.pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) setPickerFor(null)
        }}
        onChoose={editing.onChooseImage}
        finalFocus={editing.pickerFinalFocus}
      />

      <LeaveDialog blocker={blocker} />
    </div>
  )
}

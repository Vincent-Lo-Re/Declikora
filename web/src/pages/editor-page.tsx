import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { Editor } from "@tiptap/react"
import { cn } from "cn"
import {
  ArrowLeft,
  Blocks,
  EyeOff,
  FileQuestion,
  Focus,
  Info,
  ListTree,
} from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { Link, useBlocker, useParams, useSearchParams } from "react-router"
import { toast } from "sonner"

import "@/blocks/components/preview.css"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import {
  BlocksEditorContext,
  type BlocksEditorValue,
} from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import {
  blocksOf,
  DRAFT_WARN_BYTES,
  draftBytes,
  findBlock,
  flattenBlocks,
  insertBlock,
  insertionPoint,
  moveBlock,
  readingStats,
  removeBlock,
  shiftBlock,
  TITLE_MAX,
  updateBlock,
} from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry, type InsertableType } from "@/blocks/registry"
import {
  canAddRootBlock,
  detachLinked,
  insertTemplate,
  linkedBlock,
} from "@/blocks/templates"
import { ROOT, type Block, type ImageBlock } from "@/blocks/types"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { BlockSettings } from "@/components/editor/block-settings"
import { EditorSkeleton } from "@/components/editor/editor-skeleton"
import { useDraftMedia } from "@/components/editor/use-draft-media"
import { useDraftSync } from "@/components/editor/use-draft-sync"
import { useLinkedTemplates } from "@/components/editor/use-linked-templates"
import { useMethodContext } from "@/components/editor/use-method-context"
import { usePhoneDrop } from "@/components/editor/use-phone-drop"
import { useSaveAsTemplate } from "@/components/editor/use-save-as-template"
import { ColumnHeader } from "@/components/editor/column-header"
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
import { ElementPanel, MethodButton } from "@/components/methods/element-panel"
import { MethodChangesCard } from "@/components/methods/method-changes"
import {
  ChapterLessons,
  LessonExercises,
  MethodAppPlan,
  NextScreen,
} from "@/components/methods/method-preview"
import { ElementStateBadge } from "@/components/methods/element-state-badge"
import { MethodOutline } from "@/components/methods/method-outline"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TemplateDialog } from "@/components/templates/template-dialog"
import {
  TemplateSortBadge,
  TemplateSortCard,
  TemplateUsesCard,
} from "@/components/templates/template-cards"
import { useTemplateUses } from "@/components/templates/use-template-uses"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCategories } from "@/hooks/use-categories"
import { useEditorLink } from "@/hooks/use-editor-link"
import { useLockDialog } from "@/hooks/use-lock-dialog"
import { categoryNames } from "@/lib/categories"
import {
  ContentError,
  contentKeys,
  contentProblemText,
  type Content,
  type ContentKind,
} from "@/lib/contents/api"
import { methodKeys, screenAbove } from "@/lib/contents/methods"
import {
  appPlan,
  elementAccess,
  exerciseCount,
  lessonCount,
  nextScreen,
  notInAppReason,
  parseLiveOutline,
  screenReserved,
} from "@/lib/contents/outline"
import { revertToVersion, type VersionItem } from "@/lib/contents/publication"
import { publishChecks, readyItems } from "@/lib/contents/requirements"
import {
  isTemplateFor,
  isTemplateSort,
  templateKeys,
  type TemplateItem,
} from "@/lib/contents/templates"
import {
  previewFromSearch,
  previewLocked,
  withPreview,
  type PreviewSettings,
} from "@/lib/editor/preview"
import {
  blockAnchor,
  focusBlockSoon,
  focusOnceShown,
  scrollToReadBlock,
} from "@/lib/editor/block-focus"
import { isApple, isFocusShortcut } from "@/lib/editor/focus-mode"
import {
  contentProfile,
  isElementKind,
  isFeedKind,
  isListedKind,
} from "@/lib/editor/profile"
import { lockSituation } from "@/lib/editor/lock-view"
import { CONTENT_TITLE_ID, showReadySetting } from "@/lib/editor/ready-targets"
import { blockWarning, duplicateBlock } from "@/lib/editor/outline"
import type { LibraryDrag } from "@/lib/editor/library-drag"
import { liveBoxTarget } from "@/lib/editor/library-target"
import { errorMessage } from "@/lib/errors"
import { focusSoon, highlightSoon } from "@/lib/focus"
import type { Media } from "@/lib/media/constants"
import { mediaKeys } from "@/lib/media/api"
import { formatDuration } from "@/lib/media/format"
import { accessLevelsRead, contentRead, methodTreeRead } from "@/lib/reads"
import {
  rememberOpened,
  RETURN_STATE,
  returnAddress,
} from "@/lib/scroll-memory"
import {
  contentEditorPath,
  editorPath,
  sections,
  type SectionKey,
} from "@/navigation"
import { texts } from "@/texts"

// Le choix d'un fichier pour la présentation (et non pour un bloc Image, dont l'id est un uuid).
const COVER_PICKER = "presentation:cover"
const AUDIO_PICKER = "presentation:audio"

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
  // Un contenu changé ailleurs sans que son brouillon change (« Retirer de l'app » ou
  // « Supprimer » un chapitre ou une leçon depuis le plan, « Restaurer » de la Corbeille) : sa
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
      <EditorFrame section={section}>
        <Empty className="m-10 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <EmptyTitle>{texts.editor.notFound.title}</EmptyTitle>
            <EmptyDescription>
              {failed
                ? content.error.message
                : texts.editor.notFound.description}
            </EmptyDescription>
          </EmptyHeader>
          {failed && (
            <Button variant="outline" onClick={() => content.refetch()}>
              {texts.common.retry}
            </Button>
          )}
        </Empty>
      </EditorFrame>
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

/** En-tête minimal (chargement, contenu introuvable). */
function EditorFrame({
  section,
  children,
}: {
  section: SectionKey
  children: ReactNode
}) {
  return (
    <div className="flex h-svh flex-col bg-muted/40">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <BackLink section={section} />
      </header>
      {children}
    </div>
  )
}

function BackLink({
  section,
  method,
  compact = false,
}: {
  section: SectionKey
  // Un chapitre ou une leçon : le retour mène à sa méthode (son nom dans l'infobulle).
  method?: { id: string; title: string } | null
  // Éditeur du Fil : la flèche seule, à gauche de l'en-tête du plan (sur toute sa hauteur), le nom
  // de la section (ou de la méthode) dans l'infobulle.
  compact?: boolean
}) {
  const editorLink = useEditorLink()
  const title = method
    ? method.title.trim() || texts.common.untitled
    : texts.sections[section].title
  // Vers la méthode, les réglages du téléphone restent (Lecture comprise) ; pas vers une liste.
  const to = method
    ? editorLink(editorPath("methods", method.id))
    : returnAddress(sections[section].path)
  // Vers la liste : elle retrouve ses réglages et sa place, et la ligne de ce contenu s'allume
  // un instant.
  const state = method ? undefined : RETURN_STATE
  const label = method
    ? texts.methods.element.back(title)
    : texts.editor.back(title)
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={to}
              state={state}
              aria-label={label}
              className="flex h-full w-12 shrink-0 items-center justify-center border-r text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset [&_svg]:size-4"
            />
          }
        >
          <ArrowLeft />
        </TooltipTrigger>
        <TooltipContent>{title}</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Link
      to={to}
      state={state}
      aria-label={label}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <ArrowLeft />
      {title}
    </Link>
  )
}

/** « Choisir… » ou « Changer… » de l'image de présentation ou de l'audio, dans le panneau. */
function presentationChooseButton(key: "cover" | "audio"): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-presentation-choose="${key}"]`
  )
}

// Éditeur du Fil : « Ajouter un bloc » en bas de la colonne de gauche (le focus y revient quand
// la glissière des blocs se ferme).
const LEFT_ADD_ID = "colonne-gauche-ajouter"
// Éditeur du Fil : le titre de la colonne de droite (le focus y revient quand la glissière du bloc
// se ferme).
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
  const checkAccess = useAccessCheck()
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
  // Une méthode : sa fiche et son plan, sans blocs ([D4]).
  const isMethod = profile.layout === "method"
  // L'éditeur du Fil (ADMIN § 4) : le Plan à gauche, l'Article (l'Épisode, la Leçon…) à droite,
  // sans onglets ni barre du haut ; toutes les sortes, sauf l'écran d'une méthode.
  const feedKind = isFeedKind(kind) ? kind : null
  const feed = feedKind !== null
  // Un chapitre ou une leçon : publié avec sa méthode, sans « Publier » ([D29]).
  const elementKind = isElementKind(kind) ? kind : null
  const isElement = elementKind !== null
  const categorySection = profile.categories
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Éditeur du Fil : pas d'onglets. À gauche, le Plan, et les Blocs en glissière par-dessus ; à
  // droite, l'Article, et les réglages du bloc choisi en glissière par-dessus.
  const [libraryOpen, setLibraryOpen] = useState(false)
  // Éditeur du Fil : après « Ajouter dans la section », la section où les Blocs ajouteront ;
  // valable tant qu'elle est le bloc choisi (liveBoxTarget).
  const [boxTarget, setBoxTarget] = useState<string | null>(null)
  // Le texte qui a eu le curseur en dernier, avec son bloc.
  const [activeText, setActiveText] = useState<{
    blockId: string
    editor: Editor
  } | null>(null)
  // Éditeur du Fil : le téléphone montré, Édition ou Lecture, thème, taille du texte, lecteur ;
  // gardé dans l'adresse, d'un écran à l'autre et après un rechargement (QCM du 04/10/2026).
  const [searchParams, setSearchParams] = useSearchParams()
  const phoneView = useMemo(
    () => previewFromSearch(searchParams),
    [searchParams]
  )
  const setPhoneView = useCallback(
    (change: (current: PreviewSettings) => PreviewSettings) =>
      setSearchParams(
        (params) => withPreview(params, change(previewFromSearch(params))),
        { replace: true }
      ),
    [setSearchParams]
  )
  // En Lecture, rien ne se modifie : on ne prend pas la main (QCM du 04/10/2026).
  const reading = phoneView.mode === "read"
  // Les liens vers un autre écran de la méthode gardent ces réglages.
  const editorLink = useEditorLink()
  // Éditeur du Fil : le panneau « Mes blocs », par-dessus les Blocs.
  const [savedOpen, setSavedOpen] = useState(false)
  // Éditeur du Fil : le bloc survolé, dans le plan ou dans l'aperçu (montré dans les deux).
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  useEffect(() => {
    if (!hoveredId) return
    const element = document.querySelector(`[data-block-id="${hoveredId}"]`)
    element?.setAttribute("data-hovered", "")
    return () => element?.removeAttribute("data-hovered")
  }, [hoveredId])
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  // Le choix de l'image de présentation ou de l'audio : ce qui avait le focus à l'ouverture. Si
  // ce bouton a disparu à la fermeture (« Choisir… » de l'aperçu, remplacé par l'image, ou la
  // fenêtre Publier, refermée), le focus va au bouton du panneau.
  const presentationPicker = useRef<{
    key: "cover" | "audio"
    returnTo: Element | null
  } | null>(null)
  // Annonce pour les lecteurs d'écran (bloc monté ou descendu).
  const [announcement, setAnnouncement] = useState("")
  // Éditeur du Fil : le mode Concentration cache les deux colonnes (⌘ . ou Ctrl + ., Échap).
  const [focusMode, setFocusMode] = useState(false)
  const [apple] = useState(() => isApple(navigator.platform))
  const showColumns = (on: boolean) => {
    setFocusMode(!on)
    setAnnouncement(on ? texts.editor.focusMode.off : texts.editor.focusMode.on)
  }
  const toggleFocusMode = () => showColumns(focusMode)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isFocusShortcut(event, apple)) {
        event.preventDefault()
        setFocusMode(!focusMode)
        setAnnouncement(
          focusMode ? texts.editor.focusMode.off : texts.editor.focusMode.on
        )
      } else if (
        focusMode &&
        event.key === "Escape" &&
        !event.defaultPrevented &&
        // Échap ferme d'abord une fenêtre ou un menu ouvert.
        !document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
        )
      ) {
        setFocusMode(false)
        setAnnouncement(texts.editor.focusMode.off)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [apple, focusMode])

  // Méthode : le moment (dans ce navigateur) où sa fiche a été enregistrée pour la dernière fois.
  const [ficheSavedAt, setFicheSavedAt] = useState(0)

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
      // Une méthode, un chapitre ou une leçon : le plan (titres, dernières modifications) et ce
      // qui changera dans l'app (état de l'élément, ce qui ferait refuser la publication).
      if (isMethod || isElement) {
        void queryClient.invalidateQueries({ queryKey: methodKeys.allTrees })
        void queryClient.invalidateQueries({
          queryKey: methodKeys.allPreviews,
        })
      }
      // La fiche d'une méthode vient de changer : « Modifié depuis la publication ».
      if (isMethod) setFicheSavedAt(Date.now())
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
  // Éditeur du Fil : la section où les Blocs ajouteront, tant qu'elle est le bloc choisi.
  const targetBox = liveBoxTarget(draft, boxTarget, selectedId)

  // --- Blocs liés (blocs partagés) et fichiers ----------------------------------------------

  const {
    linkedIds,
    linkedBlocks,
    templateFor,
    templateName,
    resolveLinked,
    rememberShared,
  } = useLinkedTemplates(draft)
  const { mediaFor, rememberMedia } = useDraftMedia(draft, linkedBlocks)

  // --- Actions sur les blocs ---------------------------------------------------------------

  // Les messages avec « Annuler » agissent sur ce brouillon : ils partent avec l'éditeur (un clic
  // après sa fermeture ne ferait rien, la suppression est déjà enregistrée).
  const undoToasts = useRef(new Set<string | number>())
  useEffect(() => {
    const shown = undoToasts.current
    return () => {
      for (const id of shown) toast.dismiss(id)
    }
  }, [])
  const undoToast = (message: string, undo: () => void) => {
    const id = toast(message, {
      action: { label: texts.editor.settings.undo, onClick: undo },
      onDismiss: () => undoToasts.current.delete(id),
      onAutoClose: () => undoToasts.current.delete(id),
    })
    undoToasts.current.add(id)
  }

  const onUpdateBlock = useCallback(
    <T extends Block>(id: string, update: (block: T) => T) =>
      setDraft((current) => updateBlock(current, id, update)),
    [setDraft]
  )

  const onActiveText = useCallback(
    (blockId: string, editor: Editor, active: boolean) => {
      setActiveText((current) =>
        active
          ? { blockId, editor }
          : current?.editor === editor
            ? null
            : current
      )
    },
    []
  )

  // La barre de mise en forme n'agit que sur le texte du bloc choisi : grisée pour une image,
  // une section ou un bloc partagé, même si un texte a eu le curseur juste avant.
  const toolbarEditor =
    activeText && activeText.blockId === selectedId ? activeText.editor : null

  const addBlock = (type: InsertableType, container?: string) => {
    const block = blockRegistry[type].create()
    setDraft((current) => {
      const point = container
        ? { container, index: Number.MAX_SAFE_INTEGER }
        : insertionPoint(current, type, selectedId)
      return (
        insertBlock(current, block, point.container, point.index) ?? current
      )
    })
    setSelectedId(block.id)
    requestAnimationFrame(() => focusBlockSoon(block.id))
    if (type === "image") setPickerFor(block.id)
  }

  // En Lecture, rien ne se choisit : on repasse en Édition pour ajouter un bloc.
  const toEdit = () =>
    setPhoneView((current) =>
      current.mode === "edit" ? current : { ...current, mode: "edit" }
    )
  const onPreviewChange = (next: PreviewSettings) => {
    if (next.mode === "read") setSelectedId(null)
    setPhoneView(() => next)
  }

  // Un bloc choisi dans le plan : en Lecture, le téléphone défile seulement jusqu'à lui.
  const selectAndShow = (id: string) => {
    if (reading) {
      scrollToReadBlock(id)
      return
    }
    setSelectedId(id)
    requestAnimationFrame(() => focusBlockSoon(id, 0, true))
  }

  // Un bloc partagé n'a qu'un bloc au premier niveau ([D11]).
  const { rootLimit } = profile
  const onShift = (id: string, offset: -1 | 1) => {
    const next = shiftBlock(draft, id, offset, rootLimit)
    if (!next) return
    setDraft(next)
    // Le bouton garde le focus ; la nouvelle place est annoncée.
    const place = findBlock(next, id)
    if (place) {
      setAnnouncement(
        texts.editor.settings.moved(
          place.index + 1,
          place.siblings,
          place.container === ROOT
            ? texts.editor.dnd.page
            : texts.editor.settings.inBox
        )
      )
    }
  }

  // Éditeur du Fil : les blocs qui ont un point à vérifier (plan, « Prêt à publier ? »).
  const warnedIds = feed
    ? flattenBlocks(draft)
        .filter(
          ({ block }) => blockWarning(block, mediaFor, templateFor) !== null
        )
        .map(({ block }) => block.id)
    : []

  // « Sortir de la section » (plan de l'éditeur du Fil) : le bloc se place juste après elle (pas
  // dans un bloc partagé, qui n'a qu'un bloc au premier niveau).
  const onLeaveBox = (id: string) => {
    if (!canAddRootBlock(draft, templateSort)) return
    const place = findBlock(draft, id)
    const box = place && findBlock(draft, place.container)
    const next = box && moveBlock(draft, id, ROOT, box.index + 1)
    if (!place || !next) return
    setDraft(next)
    setSelectedId(id)
    setAnnouncement(
      texts.editor.outline.left(
        blockLabel(place.block, templateName(place.block))
      )
    )
  }

  // « Dupliquer » (plan de l'éditeur du Fil) : la copie juste après, choisie (au premier niveau,
  // s'il a de la place).
  const onDuplicate = (id: string) => {
    const place = findBlock(draft, id)
    const result = duplicateBlock(draft, id)
    if (!place || !result) return
    if (place.container === ROOT && !canAddRootBlock(draft, templateSort))
      return
    setDraft(result.draft)
    setSelectedId(result.id)
    setAnnouncement(
      texts.editor.outline.duplicated(
        blockLabel(place.block, templateName(place.block))
      )
    )
  }

  const onRemove = (id: string) => {
    const place = findBlock(draft, id)
    if (!place) return
    // Le focus va au bloc voisin (le suivant, sinon le précédent, sinon la section qui le
    // contenait), ou à « Ajouter un bloc » s'il n'en reste aucun (dans l'éditeur du Fil, celui du
    // bas de la colonne de gauche, toujours là, même en Lecture).
    const siblings = blocksOf(draft, place.container)
    const neighbor =
      siblings[place.index + 1]?.id ??
      siblings[place.index - 1]?.id ??
      (place.container === ROOT ? null : place.container)
    setDraft((current) => removeBlock(current, id))
    setSelectedId(neighbor)
    // Une fois fermé le menu ⋮ du plan, s'il a servi (il rendrait sinon le focus à son bouton,
    // parti avec la ligne).
    focusSoon(() =>
      neighbor ? blockAnchor(neighbor) : document.getElementById(LEFT_ADD_ID)
    )
    undoToast(texts.editor.settings.removed(blockLabel(place.block)), () =>
      setDraft(
        (current) =>
          insertBlock(current, place.block, place.container, place.index) ??
          insertBlock(current, place.block, ROOT, current.blocks.length) ??
          current
      )
    )
  }

  const onChooseImage = (media: Media) => {
    const blockId = pickerFor
    setPickerFor(null)
    if (!blockId) return
    rememberMedia(media)
    if (blockId === COVER_PICKER) {
      setDraft((current) => ({ ...current, cover: { mediaId: media.id } }))
      return
    }
    if (blockId === AUDIO_PICKER) {
      setDraft((current) => ({ ...current, audio: { mediaId: media.id } }))
      return
    }
    onUpdateBlock<ImageBlock>(blockId, (block) => ({
      ...block,
      mediaId: media.id,
    }))
  }

  /** Retire l'image de présentation ou l'audio, avec « Annuler » dans le message. */
  const removePresentationFile = (key: "cover" | "audio") => {
    const previous = draft[key] ?? null
    if (!previous) return
    setDraft((current) => ({ ...current, [key]: null }))
    undoToast(
      key === "cover"
        ? texts.editor.presentation.cover.removed
        : texts.editor.presentation.audio.removed,
      () => setDraft((current) => ({ ...current, [key]: previous }))
    )
  }

  /** Ouvre le choix de l'image de présentation ou de l'audio (s'il manque pour publier). */
  const openPresentationPicker = useCallback(
    (key: "cover" | "audio") => {
      if (!editable) return
      presentationPicker.current = { key, returnTo: document.activeElement }
      setSelectedId(null)
      setPickerFor(key === "cover" ? COVER_PICKER : AUDIO_PICKER)
    },
    [editable]
  )

  const openPicker = useCallback((blockId: string) => {
    presentationPicker.current = null
    setPickerFor(blockId)
  }, [])

  /** Où va le focus quand le choix d'un fichier se ferme (règle de Base UI : true = habituel). */
  const pickerFinalFocus = useCallback((): HTMLElement | true => {
    const picker = presentationPicker.current
    if (!picker) return true
    const { returnTo } = picker
    if (
      returnTo instanceof HTMLElement &&
      returnTo.isConnected &&
      returnTo !== document.body
    ) {
      return returnTo
    }
    return presentationChooseButton(picker.key) ?? true
  }, [])

  // « Détacher » : le bloc lié devient une copie ordinaire du bloc de son modèle, à la même
  // place (même id ; nouveaux id dans une section), enregistrée comme toute modification.
  const detachRef = useRef<(blockId: string) => void>(() => {})
  useEffect(() => {
    detachRef.current = (blockId: string) => {
      const linked = draft.blocks.find((block) => block.id === blockId)
      if (!linked || linked.type !== "linked") return
      const state = templateFor(linked.templateId)
      if (state.state !== "ready") return
      const name = state.name.trim() || texts.templates.list.untitled
      setDraft((current) => detachLinked(current, blockId, state.block))
      setSelectedId(blockId)
      focusSoon(() => blockAnchor(blockId))
      undoToast(texts.templates.linked.detached(name), () =>
        setDraft((current) => ({
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === blockId ? linked : block
          ),
        }))
      )
    }
  })
  const detachBlock = useCallback(
    (blockId: string) => detachRef.current(blockId),
    []
  )

  // « Mes blocs » : une mise en forme devient une copie (nouveaux id), un bloc partagé un bloc
  // lié, au premier niveau, après le bloc choisi ; at : la place d'un bloc glissé dans l'aperçu.
  const onInsertTemplate = (template: TemplateItem, at?: number) => {
    const result = insertTemplate(draft, template, selectedId, at)
    if (!result) return
    if (template.sort === "shared") rememberShared(template)
    setDraft(result.draft)
    setSelectedId(result.firstId)
    // Le plan est caché sous les Blocs : le bloc vient sous les yeux dans le téléphone, le
    // curseur dans son texte s'il en a un (comme un bloc ajouté des Blocs).
    requestAnimationFrame(() => focusBlockSoon(result.firstId))
    const name = template.title.trim() || texts.templates.list.untitled
    toast.success(texts.editor.library.mine.added(name))
  }

  // Éditeur du Fil : un bloc des Blocs glissé dans l'aperçu, à la place montrée par un trait.
  const onLibraryDrop = (drag: LibraryDrag, index: number) => {
    if (drag.kind === "template") {
      const template = queryClient
        .getQueryData<TemplateItem[]>(templateKeys.list)
        ?.find((item) => item.id === drag.id)
      if (template) onInsertTemplate(template, index)
      return
    }
    const block = blockRegistry[drag.type].create()
    setDraft((current) => insertBlock(current, block, ROOT, index) ?? current)
    setSelectedId(block.id)
    if (drag.type === "image") setPickerFor(block.id)
    else requestAnimationFrame(() => focusBlockSoon(block.id))
  }
  const {
    phoneRef,
    lineTop: dropLineTop,
    handlers: dropHandlers,
  } = usePhoneDrop(feed && editable && phoneView.mode === "edit", onLibraryDrop)

  // Éditeur du Fil : ajouter un bloc ouvre les Blocs, le curseur sur le premier ; depuis une
  // section, elle devient le bloc choisi et un bandeau le dit (ADMIN § 4).
  const openLibrary = (box: string | null = null) => {
    setFocusMode(false)
    setLibraryOpen(true)
    setSavedOpen(false)
    setBoxTarget(box)
    if (box) setSelectedId(box)
    focusSoon(() => document.getElementById(LIBRARY_FIRST_ID))
  }
  const openLibraryRef = useRef(openLibrary)
  useEffect(() => {
    openLibraryRef.current = openLibrary
  })
  const onAddInBox = useCallback(
    (boxId: string) => openLibraryRef.current(boxId),
    []
  )
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

  const blocksValue = useMemo<BlocksEditorValue>(
    () => ({
      editable,
      selectedId,
      selectBlock: setSelectedId,
      updateBlock: onUpdateBlock,
      setActiveText: onActiveText,
      mediaFor,
      openPicker,
      templateFor,
      onAddInBox,
    }),
    [
      onAddInBox,
      editable,
      selectedId,
      onUpdateBlock,
      onActiveText,
      mediaFor,
      openPicker,
      templateFor,
    ]
  )

  // La Lecture (éditeur du Fil) : les mêmes fichiers et modèles, rien de modifiable.
  const readOnlyBlocks = useMemo<BlocksEditorValue>(
    () => ({
      ...blocksValue,
      editable: false,
      onAddInBox: undefined,
    }),
    [blocksValue]
  )

  // --- Réglages du contenu, publication, historique -----------------------------------------

  const levels = useQuery(accessLevelsRead())
  const [historyOpen, setHistoryOpen] = useState(false)

  /** « Revenir à cette version » : recopiée dans le brouillon par la base, puis relue. */
  const onRevert = async (version: VersionItem) => {
    try {
      if ((await prepare()) === null) return
      const result = await revertToVersion(version.id, editorSession)
      setHistoryOpen(false)
      toast.success(texts.publication.history.reverted(version.number))
      for (const warning of result.warnings) {
        toast.warning(texts.publication.history.warnings[warning])
      }
      // La version est dans le brouillon : on le relit. Un échec de cette relecture n'annule pas
      // le retour à la version (il est dit, et la révision en retard sera relue d'elle-même).
      reload()
    } catch (error) {
      checkAccess(error)
      toast.error(errorMessage(error))
      if (error instanceof ContentError && error.code === "verrou_perdu") {
        lock.notifyLost()
      }
    } finally {
      void queryClient.invalidateQueries({
        queryKey: contentKeys.publication(contentId),
      })
      void queryClient.invalidateQueries({
        queryKey: contentKeys.versions(contentId),
      })
      void queryClient.invalidateQueries({ queryKey: contentKeys.lists })
    }
  }

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

  // --- Méthodes : ce qui changera dans l'app, la méthode d'un élément -----------------------

  const {
    element: elementContext,
    tree: elementTree,
    place: elementPlace,
    preview: methodPreview,
    ownState,
    methodSchedule,
    ownProblem,
    methodBridge,
  } = useMethodContext({
    contentId,
    role: isMethod ? "method" : isElement ? "element" : null,
    inApp: settings.inApp,
    ficheSavedAt,
  })

  const pub = usePublication({
    contentId,
    kind,
    enabled: profile.publication === "own",
    method: methodBridge,
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

  // --- « Enregistrer comme modèle » (contenus) ----------------------------------------------

  const saveAs = useSaveAsTemplate({
    contentId,
    draft,
    editable,
    prepare,
    // Le bloc devenu bloc partagé : remplacé par son bloc lié.
    onLinked: (created, blockId) => {
      rememberShared(created)
      setDraft((current) => ({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === blockId ? linkedBlock(created.id, blockId) : block
        ),
      }))
    },
  })
  const openSaveAs = saveAs.openFor

  // Un bloc partagé garde son bloc tant qu'un brouillon l'utilise ([D11]).
  const templateUses = useTemplateUses(contentId, isShared)
  const keepsBlock =
    isShared &&
    (templateUses.data?.length ?? 0) > 0 &&
    draft.blocks.length === 1
  const removeBlocked =
    keepsBlock && selectedId === draft.blocks[0].id
      ? texts.templates.editor.keepBlock
      : null
  const canAddRoot = canAddRootBlock(draft, templateSort)

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
  // Éditeur du Fil : temps de lecture et nombre de mots (blocs partagés compris).
  const stats = useMemo(
    () => readingStats(draft, resolveLinked),
    [draft, resolveLinked]
  )

  // En tête de l'aperçu : l'image de présentation, le titre et l'audio, comme dans l'app.
  const phoneTop = (
    <>
      {/* Un chapitre ou une leçon : l'image est facultative, montrée seulement une fois choisie
          (le panneau propose de la choisir). */}
      {(profile.cover === "required" ||
        (profile.cover === "optional" && draft.cover)) && (
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

  // Une méthode : son plan (le même que celui de la colonne de gauche, relu avec lui), montré
  // dans le téléphone tel que l'app le montrera, et sa taille en bas de la colonne de droite.
  const methodTree = useQuery({
    ...methodTreeRead(contentId),
    enabled: isMethod,
  })
  const shownPlan = methodTree.data ? appPlan(methodTree.data) : undefined
  const planCount = shownPlan
    ? texts.methods.outline.count(
        shownPlan.length,
        lessonCount(shownPlan),
        exerciseCount(shownPlan)
      )
    : null
  // Une méthode réservée : ses leçons non gratuites le sont aussi ([D43]).
  const reserved = settings.accessChosen && settings.accessLevelId !== null
  // Un épisode : son audio (carte Audio, téléphone, Lecture, bas de la colonne de droite).
  const audio = profile.audio ? mediaFor(draft.audio?.mediaId ?? null) : null
  // En Lecture, sous le titre d'un contenu des listes de l'app : la première catégorie, puis le
  // temps de lecture (un épisode : la durée de son audio, une fois connue). Une page n'en a pas.
  const length = audio
    ? audio.state === "ready" && audio.media.duration_s !== null
      ? formatDuration(audio.media.duration_s)
      : null
    : texts.editor.preview.minutes(stats.minutes)
  const readMeta = isMethod
    ? planCount
    : isListedKind(kind)
      ? [
          ...(chosenCategoryNames ?? []).slice(0, 1),
          ...(length ? [length] : []),
        ].join(" · ")
      : null
  // Un élément d'une méthode : le niveau d'accès de sa méthode, sauf leçon gratuite (et ses
  // exercices) ou introduction d'un chapitre dont une leçon l'est ([D43]) ; la Lecture le suit.
  const methodAccess = elementContext?.method.access
  const ownAccess =
    elementKind && methodAccess
      ? elementAccess(
          methodAccess,
          {
            kind: elementKind,
            isFree:
              elementKind === "exercise"
                ? (elementContext?.lesson?.isFree ?? false)
                : settings.isFree,
          },
          elementPlace?.kind === "chapter" ? elementPlace.element.lessons : []
        )
      : settings
  // Une leçon : ses exercices, montrés en bas comme dans l'app ; un chapitre : ses leçons, sous
  // son introduction ; un chapitre ou une leçon : « Suivant » (QCM du 04/10/2026).
  const lessonExercises =
    elementPlace?.kind === "lesson" ? elementPlace.element.exercises : null
  const chapterLessons =
    elementPlace?.kind === "chapter" ? elementPlace.element.lessons : null
  const next =
    elementTree && elementKind !== null && elementKind !== "exercise"
      ? nextScreen(elementTree, contentId)
      : null
  const methodReserved =
    methodAccess !== undefined &&
    methodAccess.accessChosen &&
    methodAccess.accessLevelId !== null
  const ownReserved = ownAccess.accessChosen && ownAccess.accessLevelId !== null
  // Sous le contenu d'un élément, comme dans l'app : en Édition (inEdit), les listes vides le
  // disent, et ce qui est réservé l'est comme pour une personne sans la formule (comme le plan
  // de la méthode) ; en Lecture, selon le lecteur choisi.
  const belowContent = (inEdit: boolean) => {
    const visitor = inEdit || phoneView.reader === "visitor"
    return (
      <>
        {chapterLessons && (
          <ChapterLessons
            lessons={chapterLessons}
            reserved={methodReserved}
            editable={inEdit}
            subscriber={!visitor}
          />
        )}
        {lessonExercises && (
          <LessonExercises
            exercises={lessonExercises}
            locked={visitor && ownReserved}
            editable={inEdit}
          />
        )}
        {next && (
          <NextScreen
            screen={next}
            locked={visitor && screenReserved(next, methodReserved)}
          />
        )}
      </>
    )
  }
  // En Lecture, la flèche de la barre de l'app : l'écran du dessus (la leçon d'un exercice, la
  // méthode d'un chapitre ou d'une leçon) ; rien pour les autres sortes.
  const above =
    elementKind !== null && elementContext
      ? screenAbove(elementKind, elementContext)
      : null
  const abovePath = above ? contentEditorPath(above.kind, above.id) : null
  // En Lecture, un élément qui ne sera pas dans l'app se lit quand même, avec un bandeau.
  const hiddenReason =
    reading && elementPlace
      ? notInAppReason(elementPlace, settings.inApp)
      : null
  const problemText = ownProblem?.problem
    ? contentProblemText(ownProblem.problem, ownProblem.problemDetail)
    : null
  const onSettingsChange = (next: typeof settings) => {
    if (next.slug !== settings.slug) setRefusedSlug(null)
    setSettings(next)
  }
  // Éditeur du Fil : la colonne de droite, tout ce qui concerne l'article (l'épisode, la page) ;
  // un chapitre ou une leçon : sa place dans la méthode ; un modèle de bloc ne se publie pas : sa
  // sorte et, pour un bloc partagé, où il est utilisé.
  const articlePanel =
    feedKind && isElementKind(feedKind) ? (
      <ElementPanel
        kind={feedKind}
        draft={draft}
        editable={editable}
        reading={reading}
        settings={settings}
        onSettingsChange={onSettingsChange}
        context={elementContext}
        place={elementPlace}
        state={ownState}
        problem={problemText}
        schedule={methodSchedule}
        levels={levels.data}
        levelsFailed={levels.isError}
        retryLevels={() => void levels.refetch()}
        cover={mediaFor(draft.cover?.mediaId ?? null)}
        onChooseCover={() => openPresentationPicker("cover")}
        onRemoveCover={() => removePresentationFile("cover")}
      />
    ) : feedKind === "template" ? (
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
        kind={feedKind ?? "method"}
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
      >
        {methodBridge && <MethodChangesCard method={methodBridge} />}
      </ArticlePanel>
    )
  // Éditeur du Fil : le bloc choisi, dont les réglages glissent par-dessus l'Article.
  const selectedBlock = selectedId
    ? (findBlock(draft, selectedId)?.block ?? null)
    : null
  const blockSettings = (
    <BlockSettings
      onClose={closeBlockPanel}
      draft={draft}
      selectedId={selectedId}
      editable={editable}
      mediaFor={mediaFor}
      onUpdate={onUpdateBlock}
      onShift={onShift}
      onRemove={onRemove}
      onChooseImage={openPicker}
      templateFor={templateFor}
      onDetach={detachBlock}
      removeBlocked={removeBlocked}
      onSaveAsTemplate={
        profile.savedBlocks ? (id) => openSaveAs([id]) : undefined
      }
      onDuplicate={onDuplicate}
      rootLimit={rootLimit}
    />
  )

  // Le plan, dans la colonne de gauche : le contenu de chaque bloc (première ligne d'un texte,
  // vignette d'une image) et ce qui manque, avec un menu ⋮ par ligne.
  const feedOutline: FeedOutline = {
    mediaFor,
    hoveredId,
    onHover: setHoveredId,
    warningOf: (block) => blockWarning(block, mediaFor, templateFor),
    onMove: editable ? setDraft : undefined,
    onAdd: editable ? () => openLibrary() : undefined,
    onAddInBox: editable ? onAddInBox : undefined,
    actions: editable
      ? {
          onDuplicate,
          onSaveToMine: profile.savedBlocks
            ? (id) => openSaveAs([id])
            : undefined,
          onLeaveBox,
          onRemove,
          removeBlocked: (id) =>
            keepsBlock && id === draft.blocks[0]?.id
              ? texts.templates.editor.keepBlock
              : null,
          rootFull: !canAddRoot,
        }
      : undefined,
    rootLimit,
  }
  // La sortie en haut à gauche (ADMIN § 4, « Le retour en haut ») : dans l'en-tête du plan, et dans
  // celui des Blocs quand leur glissière le couvre.
  const backLink = (
    <BackLink section={section} method={elementContext?.method} compact />
  )
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
  const phone = isMethod ? (
    // Une méthode : sa fiche, modifiable sur place, puis son plan tel que l'app le montrera ; un
    // chapitre ou une leçon y ouvre son éditeur.
    <div className={cn("blocks-phone", !editable && "cursor-default")}>
      {phoneTop}
      {planCount && <p className="blocks-meta">{planCount}</p>}
      {methodTree.data && (
        <MethodAppPlan
          tree={methodTree.data}
          reserved={reserved}
          editable
          subscriber={false}
        />
      )}
    </div>
  ) : (
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
      <BlocksEditorContext value={blocksValue}>
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
      {/* Un chapitre : ses leçons ; une leçon : ses exercices, comme dans l'app (ils se gèrent
          dans le plan de la méthode) ; puis « Suivant ». */}
      {belowContent(true)}
    </div>
  )

  const sectionTitle = texts.sections[section].title
  const SectionIcon = sections[section].icon
  const untitled = isTemplate
    ? texts.templates.list.untitled
    : texts.common.untitled

  const publishDisabled = phase === "taking" || phase === "error"
  // Une méthode dont on ne sait pas encore ce qui a changé : « Publier » reste possible (la
  // fenêtre le montrera).
  const alwaysPublishable =
    linkedIds.length > 0 || (isMethod && methodBridge?.pending === undefined)
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

      {/* La mise en page du Fil, pour toutes les sortes (ADMIN § 4) : à gauche le plan (des blocs,
          ou les chapitres et les leçons d'une méthode), au centre le téléphone, à droite tout ce
          qui concerne le contenu. */}
      <div className="flex min-h-0 flex-1">
        <aside
          id="editeur-plan"
          aria-label={
            isMethod ? texts.methods.outline.title : texts.editor.columns.left
          }
          // Caché (et non retiré) en Concentration : les Blocs et « Mes blocs » restent ouverts.
          className={cn(
            "flex w-feed-column shrink-0 flex-col border-r bg-background",
            focusMode && "hidden"
          )}
        >
          {isMethod ? (
            // Une méthode : le plan de ses chapitres et de ses leçons, « Nouveau chapitre » en bas.
            <MethodOutline
              methodId={contentId}
              editable={editable}
              reading={reading}
              session={editorSession}
              myId={lock.myId ?? ""}
              live={parseLiveOutline(pub.publication?.live?.outline)}
              preview={methodPreview}
              back={<BackLink section={section} compact />}
            />
          ) : (
            <>
              <div className="relative min-h-0 flex-1">
                {/* Sous la glissière des Blocs : hors du clavier et des lecteurs d'écran. */}
                <div inert={libraryOpen} className="h-full">
                  {outlinePanel}
                </div>
                {/* Les Blocs, en glissière par-dessus le Plan : × ou Échap la referment. */}
                {libraryOpen && (
                  <section
                    aria-labelledby="colonne-blocs-titre"
                    className="absolute inset-0 z-20 flex flex-col bg-background motion-safe:animate-in motion-safe:slide-in-from-left-4"
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && !event.defaultPrevented) {
                        event.preventDefault()
                        closeLibrary()
                        focusSoon(() => document.getElementById(LEFT_ADD_ID))
                      }
                    }}
                  >
                    <ColumnHeader
                      icon={Blocks}
                      title={texts.editor.columns.blocks}
                      titleId="colonne-blocs-titre"
                      back={backLink}
                      close={{
                        label: texts.editor.library.close,
                        onClick: () => {
                          closeLibrary()
                          focusSoon(() => document.getElementById(LEFT_ADD_ID))
                        },
                      }}
                    />
                    <div className="min-h-0 flex-1">
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
                    </div>
                  </section>
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
            </>
          )}
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
            // Une méthode n'a pas de blocs : pas de barre de mise en forme.
            toolbar={
              isMethod ? null : (
                <FormatToolbar editor={toolbarEditor} editable={editable} />
              )
            }
            focus={{
              on: focusMode,
              shortcut: apple
                ? texts.editor.focusMode.shortcut.apple
                : texts.editor.focusMode.shortcut.other,
              keys: apple ? "Meta+." : "Control+.",
              onToggle: toggleFocusMode,
            }}
            notices={
              <>
                {lockBanner}
                {profile.publication === "own" && scheduleBanner}
                {notices}
                {hiddenReason && (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <EyeOff aria-hidden className="size-4 shrink-0" />
                    {texts.editor.preview.notInApp[hiddenReason]}
                  </p>
                )}
              </>
            }
            appBar={
              reading ? (
                <ReadAppBar
                  section={
                    // Un chapitre, une leçon ou un exercice : sa méthode, comme dans l'app.
                    elementContext?.method.title.trim() || sectionTitle
                  }
                  back={
                    above && abovePath
                      ? {
                          to: editorLink(abovePath),
                          title: above.title.trim() || untitled,
                        }
                      : null
                  }
                />
              ) : undefined
            }
          >
            {phoneView.mode === "read" ? (
              // Les images lisent l'éditeur (fichier, aperçu), en lecture seule.
              <BlocksEditorContext value={readOnlyBlocks}>
                <ReadView
                  draft={draft}
                  title={title.trim() || untitled}
                  // Une image facultative (chapitre, leçon) : seulement une fois choisie, comme
                  // dans l'app.
                  cover={
                    profile.cover === "required" ||
                    (profile.cover === "optional" && draft.cover)
                      ? mediaFor(draft.cover?.mediaId ?? null)
                      : null
                  }
                  audio={audio}
                  meta={readMeta}
                  // Une méthode : son plan, dont chaque leçon dit si elle est réservée.
                  locked={
                    feedKind !== null &&
                    feedKind !== "template" &&
                    previewLocked(phoneView, ownAccess)
                      ? {
                          kind: feedKind,
                          level:
                            levels.data?.find(
                              (level) => level.id === ownAccess.accessLevelId
                            )?.name ?? null,
                        }
                      : false
                  }
                  resolve={resolveLinked}
                  after={belowContent(false)}
                >
                  {methodTree.data && (
                    <MethodAppPlan
                      tree={methodTree.data}
                      reserved={reserved}
                      editable={false}
                      subscriber={phoneView.reader === "subscriber"}
                    />
                  )}
                </ReadView>
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
          {/* En tête, l'icône de la section et le titre du contenu (en entier dans
                  l'infobulle s'il est coupé). */}
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
            measure={
              // Une méthode : la taille de son plan au lieu du temps de lecture.
              isMethod && methodTree.data
                ? {
                    Icon: ListTree,
                    short: texts.editor.article.stats.lessons(
                      lessonCount(methodTree.data)
                    ),
                    tip: texts.editor.article.stats.planTip(
                      texts.methods.outline.count(
                        methodTree.data.length,
                        lessonCount(methodTree.data),
                        exerciseCount(methodTree.data)
                      )
                    ),
                  }
                : undefined
            }
            savedAt={autosave.savedAt}
            saveStatus={feedSaveStatus}
          >
            {lockButton}
            {templateSort ? (
              // Un modèle ne se publie pas : sa sorte, à la place.
              <TemplateSortBadge sort={templateSort} />
            ) : isElement ? (
              // Un chapitre ou une leçon part avec sa méthode : son état dans l'app, puis
              // « Ouvrir la méthode », d'où elle se publie ([D29]).
              <>
                {ownState && <ElementStateBadge state={ownState} />}
                <span className="flex-1" />
                <MethodButton
                  method={elementContext?.method}
                  schedule={methodSchedule}
                  holding={editable}
                  onHistory={() => setHistoryOpen(true)}
                />
              </>
            ) : (
              <>
                <PublicationBadge pub={pub} />
                <span className="flex-1" />
                <PublishButton
                  pub={pub}
                  disabled={publishDisabled}
                  alwaysPublishable={alwaysPublishable}
                  onHistory={() => setHistoryOpen(true)}
                />
              </>
            )}
          </ArticleFooter>
        </aside>
      </div>

      {focusMode && (
        <div className="fixed top-3 right-4 z-20 flex items-center gap-2 rounded-full border bg-background py-1 pr-1 pl-3 shadow-sm">
          {saveStatus}
          {lockButton}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            aria-label={texts.editor.focusMode.exit}
            aria-keyshortcuts={apple ? "Meta+." : "Control+."}
            onClick={toggleFocusMode}
          >
            <Focus />
            {texts.editor.focusMode.exit}
            <Kbd>
              {apple
                ? texts.editor.focusMode.shortcut.apple
                : texts.editor.focusMode.shortcut.other}
            </Kbd>
          </Button>
        </div>
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
          <TemplateDialog
            open={saveAs.dialog.open}
            onOpenChange={(open) => {
              if (!open) saveAs.dialog.onClose()
            }}
            title={texts.templates.saveAs.title}
            description={texts.templates.saveAs.description(
              saveAs.dialog.count
            )}
            submitLabel={texts.templates.saveAs.submit}
            defaultSection={isTemplateFor(kind) ? kind : null}
            sharedDisabled={
              saveAs.dialog.count > 1 ? texts.templates.saveAs.sharedOne : null
            }
            pending={saveAs.dialog.pending}
            error={saveAs.dialog.error}
            onSubmit={saveAs.dialog.submit}
          />
        </>
      )}

      <MediaPicker
        kind={pickerFor === AUDIO_PICKER ? "audio" : "image"}
        open={pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) setPickerFor(null)
        }}
        onChoose={onChooseImage}
        finalFocus={pickerFinalFocus}
      />

      <AlertDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.editor.save.leave.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {texts.editor.save.leave.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {texts.editor.save.leave.stay}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => blocker.state === "blocked" && blocker.proceed()}
            >
              {texts.editor.save.leave.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

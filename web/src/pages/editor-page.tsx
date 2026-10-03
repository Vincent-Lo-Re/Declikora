import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { Editor } from "@tiptap/react"
import { cn } from "cn"
import {
  ArrowLeft,
  FileQuestion,
  Focus,
  History,
  LayoutGrid,
  LayoutTemplate,
  ListTree,
  PanelTop,
  Plus,
  Settings2,
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
import { Link, useBlocker, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import "@/blocks/components/preview.css"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import {
  BlocksEditorContext,
  type BlockMedia,
  type BlocksEditorValue,
  type LinkedTemplateState,
} from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import {
  blocksOf,
  DRAFT_WARN_BYTES,
  draftBytes,
  draftToPlainText,
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
import {
  blockRegistry,
  insertableBlocks,
  type InsertableType,
} from "@/blocks/registry"
import {
  canAddRootBlock,
  detachLinked,
  insertTemplate,
  linkedBlock,
  linkedTemplateIds,
  selectedRootIds,
  SHARED_ROOT_LIMIT,
  singleBlock,
} from "@/blocks/templates"
import { ROOT, type Block, type Draft, type ImageBlock } from "@/blocks/types"
import { BlockSettings } from "@/components/editor/block-settings"
import {
  ContentSettingsSheet,
  type RefusedSlug,
  type SettingsFocus,
} from "@/components/editor/content-settings-sheet"
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
import { BlocksLibrary } from "@/components/editor/blocks-library"
import {
  CONTENT_TITLE_ID,
  AudioPreview,
  CoverPreview,
  PresentationPanel,
  SummaryPreview,
} from "@/components/editor/presentation"
import {
  PublicationDialogs,
  PublicationBadge,
  PublishBar,
  PublishButton,
  ScheduleBanner,
} from "@/components/editor/publication"
import { SaveStatus } from "@/components/editor/save-status"
import {
  usePublication,
  type MethodPublication,
} from "@/components/editor/use-publication"
import { ElementBanner } from "@/components/methods/element-banner"
import { MethodOutline } from "@/components/methods/method-outline"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import { useAccessCheck } from "@/components/team/use-access-check"
import { TemplateDialog } from "@/components/templates/template-dialog"
import {
  SharedTemplateBar,
  TemplateSortBadge,
} from "@/components/templates/template-editor-bar"
import { useTemplateUses } from "@/components/templates/use-template-uses"
import { TemplatePicker } from "@/components/templates/template-picker"
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
import { Separator } from "@/components/ui/separator"
import { Kbd } from "@/components/ui/kbd"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  saveCheckedDraft,
  useAutosave,
  type EditorValue,
} from "@/hooks/use-autosave"
import { useCategories } from "@/hooks/use-categories"
import { useEditLock } from "@/hooks/use-edit-lock"
import { useLockDialog } from "@/hooks/use-lock-dialog"
import { accessLevelsKey, listAccessLevels } from "@/lib/access-levels"
import {
  categoryKeys,
  categoryNames,
  categorySectionOf,
} from "@/lib/categories"
import {
  ContentError,
  contentKeys,
  contentProblemText,
  getContent,
  getMediaByIds,
  sameCategories,
  settingsDiff,
  settingsOf,
  type Content,
  type ContentKind,
  type ContentSettings,
  type SettingsPayload,
} from "@/lib/contents/api"
import {
  getElementContext,
  getMethodPreview,
  getMethodTree,
  methodKeys,
} from "@/lib/contents/methods"
import {
  elementState,
  liveIds,
  parseLiveOutline,
  previewByElement,
} from "@/lib/contents/outline"
import {
  getPublication,
  publicationStatus,
  revertToVersion,
  type ScheduleState,
  type VersionItem,
} from "@/lib/contents/publication"
import {
  coverRequired,
  hasPresentation,
  publishChecks,
  readyItems,
  titleRequired,
} from "@/lib/contents/requirements"
import {
  createTemplateFrom,
  getTemplatesByIds,
  isTemplateFor,
  isTemplateSort,
  templateKeys,
  type LinkedTemplate,
  type TemplateItem,
} from "@/lib/contents/templates"
import {
  defaultPreview,
  previewLocked,
  type PreviewSettings,
} from "@/lib/editor/preview"
import { isApple, isFocusShortcut } from "@/lib/editor/focus-mode"
import { lockSituation } from "@/lib/editor/lock-view"
import { blockWarning, duplicateBlock } from "@/lib/editor/outline"
import {
  decodeLibraryDrag,
  dropIndex,
  LIBRARY_DRAG_TYPE,
  type LibraryDrag,
} from "@/lib/editor/library-drag"
import {
  isEmptyText,
  replaceBlock,
  slashChoices,
  type SlashChoice,
} from "@/lib/editor/slash"
import { errorMessage } from "@/lib/errors"
import { highlightSoon } from "@/lib/focus"
import type { Media } from "@/lib/media/constants"
import { mediaKeys } from "@/lib/media/api"
import type { TemplateValues } from "@/lib/schemas"
import { editorPath, sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

// Nouvel essai de relecture du brouillon après un échec (réseau).
const RELOAD_RETRY_MS = 3000

// Refus de save_draft qui viennent d'un réglage (et non du brouillon).
const SLUG_REFUSALS = new Set(["adresse_prise", "adresse_invalide"])

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
    queryKey: contentKeys.detail(contentId),
    queryFn: () => getContent(contentId),
    // L'éditeur relit le brouillon lui-même quand il change (verrou et Realtime).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (content.error) checkAccess(content.error)
  }, [content.error, checkAccess])

  const waitingFresh =
    mustWaitFresh && !content.isFetchedAfterMount && !content.isError
  if (content.isPending || waitingFresh) {
    return (
      <EditorFrame section={section}>
        <div className="flex flex-1 justify-center p-10">
          <div
            className="w-(--blocks-phone-width) space-y-4"
            aria-label={texts.editor.loading}
          >
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </EditorFrame>
    )
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
  // Un chapitre ou une leçon : « ← nom de la méthode ».
  method?: { id: string; title: string } | null
  // Éditeur du Fil : la flèche seule, le nom de la section dans l'infobulle.
  compact?: boolean
}) {
  if (method) {
    const title = method.title.trim() || texts.common.untitled
    return (
      <Link
        to={editorPath("methods", method.id)}
        aria-label={texts.methods.element.back(title)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "max-w-64"
        )}
      >
        <ArrowLeft />
        <span className="truncate">{title}</span>
      </Link>
    )
  }
  const title = texts.sections[section].title
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              to={sections[section].path}
              aria-label={texts.editor.back(title)}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
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
      to={sections[section].path}
      aria-label={texts.editor.back(title)}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <ArrowLeft />
      {title}
    </Link>
  )
}

/**
 * Met le focus sur un élément dès qu'il apparaît (dans les prochains rendus), même si un panneau
 * est ouvert : contrairement à focusSoon (lib/focus.ts), qui attend qu'aucune fenêtre ne le soit.
 */
function focusOnceShown(find: () => HTMLElement | null, attempts = 20) {
  const element = find()
  if (element) {
    element.focus()
    return
  }
  if (attempts > 0) {
    requestAnimationFrame(() => focusOnceShown(find, attempts - 1))
  }
}

/** La poignée d'un bloc (et non celle d'un bloc de son encadré). */
function blockHandle(id: string): HTMLElement | null {
  return (
    document
      .querySelector(`[data-block-id="${id}"]`)
      ?.querySelector<HTMLElement>(
        ":scope > .blocks-handle-rail [data-block-handle]"
      ) ?? null
  )
}

/** « Choisir… » ou « Changer… » de l'image de présentation ou de l'audio, dans le panneau. */
function presentationChooseButton(key: "cover" | "audio"): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-presentation-choose="${key}"]`
  )
}

const ADD_BLOCK_ID = "editeur-ajouter"

// Les onglets des colonnes de l'éditeur du Fil.
type LeftTab = "plan" | "blocks"
type RightTab = "article" | "block"

/**
 * Met le curseur dans un bloc qui vient d'apparaître (l'éditeur Tiptap se crée juste après).
 * `top` : le bloc monte en haut de l'écran du téléphone (choisi dans le plan du Fil) ; sinon,
 * l'écran ne défile que s'il le faut.
 */
function focusBlockSoon(id: string, attempts = 20, top = false) {
  const element = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
  const found = element?.querySelector<HTMLElement>('[contenteditable="true"]')
  // Le texte du bloc lui-même : pas celui d'un bloc de sa section, qui deviendrait le bloc
  // choisi en recevant le curseur.
  const editable =
    found && found.closest("[data-block-id]") === element ? found : null
  const scroll = () =>
    element?.scrollIntoView({
      block: top ? "start" : "nearest",
      behavior: "smooth",
    })
  if (editable) {
    // D'abord le curseur, puis le défilement : le navigateur ramène l'écran au curseur quand il
    // le pose, ce qui interromprait un défilement déjà commencé.
    editable.focus({ preventScroll: true })
    requestAnimationFrame(scroll)
    return
  }
  scroll()
  if (attempts > 0) {
    requestAnimationFrame(() => focusBlockSoon(id, attempts - 1, top))
  }
}

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
  const navigate = useNavigate()
  // Un modèle : le même éditeur, sans publication ni réglages d'accès (ADMIN § 5).
  const isTemplate = kind === "template"
  const templateSort =
    isTemplate && isTemplateSort(initial.template_sort)
      ? initial.template_sort
      : null
  const isShared = templateSort === "shared"
  // Une méthode : sa fiche et son plan, sans blocs ([D4]). Un chapitre ou une leçon : l'éditeur
  // de blocs, sans barre de publication (tout part avec la méthode, [D29]).
  const isMethod = kind === "method"
  // L'éditeur du Fil (ADMIN § 4) : plan et blocs à gauche, ouverts d'office ; « Article » et
  // « Bloc choisi » à droite. Les autres éditeurs gardent leur mise en page.
  const feed = kind === "article"
  const elementKind = kind === "chapter" || kind === "lesson" ? kind : null
  const isElement = elementKind !== null
  // Image de présentation et résumé (article, épisode, méthode, chapitre, leçon) ; catégories
  // pour un article ou un épisode, audio pour un épisode.
  const presentationKind = hasPresentation(kind) ? kind : null
  const categorySection = categorySectionOf(kind)
  // Cette ouverture de l'éditeur : le verrou est tenu par elle, pas seulement par le membre.
  const [editorSession] = useState(() => crypto.randomUUID())

  const [draft, setDraft] = useState<Draft>(initial.draft)
  // Réglages du contenu (niveau d'accès, adresse) : enregistrés avec le brouillon.
  const [initialSettings] = useState(() => settingsOf(initial))
  const [settings, setSettings] = useState<ContentSettings>(initialSettings)
  // Les réglages tels qu'ils sont dans la base : seuls ceux qui changent partent.
  const savedSettings = useRef<ContentSettings>(initialSettings)
  // Les réglages du dernier envoi (pour reconnaître le refus d'un réglage).
  const sentSettings = useRef<SettingsPayload | null>(null)
  const [refusedSlug, setRefusedSlug] = useState<RefusedSlug | null>(null)
  // Révision du brouillon affiché (celle de la base au dernier chargement ou enregistrement).
  const [loadedRev, setLoadedRev] = useState(initial.draft_rev)
  // Change à chaque rechargement depuis la base : les blocs repartent du nouveau brouillon.
  const [viewKey, setViewKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(feed)
  // Éditeur du Fil : l'onglet de gauche, et celui de droite. Celui de droite suit le bloc choisi
  // (« Bloc choisi » dès qu'un bloc l'est, « Article » sinon), sauf si on a changé d'onglet à la
  // main depuis ce choix.
  const [leftTab, setLeftTab] = useState<LeftTab>("plan")
  const [rightChoice, setRightChoice] = useState<{
    tab: RightTab
    selectedId: string | null
  } | null>(null)
  // Le texte qui a eu le curseur en dernier, avec son bloc.
  const [activeText, setActiveText] = useState<{
    blockId: string
    editor: Editor
  } | null>(null)
  // Éditeur du Fil : le téléphone montré, Édition ou Lecture, thème, taille du texte, lecteur.
  const [phoneView, setPhoneView] = useState<PreviewSettings>(defaultPreview)
  // Éditeur du Fil : le panneau « Mes blocs » de l'onglet Blocs.
  const [savedOpen, setSavedOpen] = useState(false)
  // Éditeur du Fil : le bloc survolé, dans le plan ou dans l'aperçu (montré dans les deux).
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  useEffect(() => {
    if (!hoveredId) return
    const element = document.querySelector(`[data-block-id="${hoveredId}"]`)
    element?.setAttribute("data-hovered", "")
    return () => element?.removeAttribute("data-hovered")
  }, [hoveredId])
  const rightTab: RightTab =
    rightChoice && rightChoice.selectedId === selectedId
      ? rightChoice.tab
      : selectedId
        ? "block"
        : "article"
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  // Le choix de l'image de présentation ou de l'audio : ce qui avait le focus à l'ouverture. Si
  // ce bouton a disparu à la fermeture (« Choisir… » de l'aperçu, remplacé par l'image, ou la
  // fenêtre Publier, refermée), le focus va au bouton du panneau.
  const presentationPicker = useRef<{
    key: "cover" | "audio"
    returnTo: Element | null
  } | null>(null)
  // Ce qui n'était pas enregistré quand on a perdu la main (« Copier mon texte »).
  const [stash, setStash] = useState<Draft | null>(null)
  // Fichiers choisis à l'instant : affichés sans attendre la relecture de la base.
  const [picked, setPicked] = useState<Record<string, Media>>({})
  // La dernière valeur venue de la base ou confiée à l'enregistrement : un rendu qui ne la
  // change pas n'est pas une modification à enregistrer.
  const synced = useRef<EditorValue>({
    draft: initial.draft,
    settings: initialSettings,
  })
  // Vrai après « Reprendre la main » ou « Modifier » : l'enregistrement reprend.
  const resume = useRef(false)
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
    if (!feed) return
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
  }, [feed, apple, focusMode])

  // Méthode : le moment (dans ce navigateur) où sa fiche a été enregistrée pour la dernière fois.
  const [ficheSavedAt, setFicheSavedAt] = useState(0)

  const autosave = useAutosave(
    { rev: initial.draft_rev, savedAt: initial.draft_saved_at },
    {
      onSaved: (result, saved) => {
        setLoadedRev(result.rev)
        savedSettings.current = saved.settings
        queryClient.setQueryData<Content | null>(
          contentKeys.detail(contentId),
          (old) =>
            old && {
              ...old,
              draft: saved.draft,
              title: saved.draft.title,
              draft_rev: result.rev,
              draft_saved_at: result.savedAt,
              access_chosen: saved.settings.accessChosen,
              access_level_id: saved.settings.accessLevelId,
              slug: saved.settings.slug,
              category_ids: saved.settings.categoryIds,
              // Un chapitre ou une leçon : rouvert plus tard, il montre les cases enregistrées.
              in_app: saved.settings.inApp,
              is_free: saved.settings.isFree,
            }
        )
        // « Utilisé dans » de la médiathèque et liste des pages.
        void queryClient.invalidateQueries({
          queryKey: mediaKeys.allUses,
        })
        // Une méthode, un chapitre ou une leçon : le plan (titres, dernières modifications) et ce
        // qui changera dans l'app (état de l'élément, ce qui ferait refuser la publication).
        if (isMethod || isElement) {
          void queryClient.invalidateQueries({
            queryKey: methodKeys.allTrees,
          })
          void queryClient.invalidateQueries({
            queryKey: methodKeys.allPreviews,
          })
        }
        // La fiche d'une méthode vient de changer : « Modifié depuis la publication ».
        if (isMethod) setFicheSavedAt(Date.now())
        void queryClient.invalidateQueries({
          queryKey: contentKeys.list(kind),
        })
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
      onStopped: (error) => checkAccess(error),
    },
    // Les réglages envoyés sont ceux qui diffèrent de la base au moment de l'envoi : une
    // valeur rejouée après une réponse perdue repart avec les mêmes.
    (value, baseRev) => {
      const payload = settingsDiff(savedSettings.current, value.settings)
      sentSettings.current = payload
      return saveCheckedDraft(
        contentId,
        editorSession,
        value.draft,
        baseRev,
        payload
      )
    }
  )
  const saving = autosave.controller
  const lock = useEditLock(contentId, editorSession, () => saving.flush())
  const { notifyLost } = lock
  const phase = lock.state.phase
  const serverRev = lock.state.draftRev
  const holderIsMe = lock.state.holderId === lock.myId
  // Éditeur du Fil : la lecture seule passe par le cadenas et sa fenêtre (ADMIN § 4).
  const lockView = feed ? lockSituation(lock.state, holderIsMe) : null
  const lockDialog = useLockDialog(lockView)

  // serverRev ne suit que les autres (edit-lock.ts) : nos propres enregistrements, vus par
  // Realtime avant leur réponse, ne rendent pas l'aperçu non modifiable.
  const editable =
    phase === "mine" &&
    autosave.state.status !== "stopped" &&
    (serverRev ?? loadedRev) <= loadedRev

  // Chaque modification du brouillon ou des réglages part à l'enregistrement automatique.
  useEffect(() => {
    const last = synced.current
    if (draft === last.draft && settings === last.settings) return
    synced.current = { draft, settings }
    saving.change(synced.current)
  }, [draft, settings, saving])

  // Un réglage refusé (adresse prise ou invalide, formule supprimée) : la base refuse tout
  // l'envoi. Le réglage revient à sa valeur enregistrée et le brouillon repart sans lui ;
  // sinon chaque enregistrement suivant le renverrait et serait refusé à son tour.
  const failedError =
    autosave.state.status === "failed" ? autosave.state.error : null
  useEffect(() => {
    const sent = sentSettings.current
    const code = failedError?.code
    if (!failedError || !sent || !code) return
    const saved = savedSettings.current
    const latest = synced.current.settings
    let next = latest
    if (SLUG_REFUSALS.has(code) && sent.slug !== undefined) {
      setRefusedSlug({ slug: sent.slug, message: failedError.message })
      if (latest.slug === sent.slug) next = { ...latest, slug: saved.slug }
    } else if (
      code === "categorie_invalide" &&
      sent.category_ids !== undefined
    ) {
      // Une catégorie a été supprimée entre-temps ([D28]) : la liste est relue, et le choix
      // revient à celui de la base (qui l'a déjà perdue).
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all })
      if (sameCategories(latest.categoryIds, sent.category_ids)) {
        next = { ...latest, categoryIds: saved.categoryIds }
      }
    } else if (
      code === "niveau_invalide" &&
      sent.access_level_id !== undefined
    ) {
      void queryClient.invalidateQueries({ queryKey: accessLevelsKey })
      if (
        latest.accessChosen &&
        latest.accessLevelId === sent.access_level_id
      ) {
        next = {
          ...latest,
          accessChosen: saved.accessChosen,
          accessLevelId: saved.accessLevelId,
        }
      }
    } else {
      return
    }
    sentSettings.current = null
    toast.error(failedError.message, {
      description: texts.publication.settings.refused,
    })
    // Le réglage revient en arrière : l'effet ci-dessus renvoie le brouillon. Sinon, un réglage
    // plus récent attend déjà : on le renvoie.
    if (next !== latest) setSettings(next)
    else saving.change(synced.current)
  }, [failedError, queryClient, saving])

  // La base a refusé l'enregistrement parce qu'un autre a pris la main.
  useEffect(() => {
    if (autosave.state.error?.code === "verrou_perdu") notifyLost()
  }, [autosave.state.error, notifyLost])

  // Main perdue : plus d'enregistrement ; ce qui est à l'écran reste copiable.
  useEffect(() => {
    if (lock.state.lost) saving.stop()
  }, [lock.state.lost, saving])

  /**
   * Relit le brouillon dans la base. Une vraie lecture à chaque appel (jamais celle d'une
   * relecture déjà en cours, qui peut être plus ancienne), hors de la requête observée par
   * EditorPage : son échec ne ferme pas l'éditeur.
   */
  const fetchFresh = useCallback(async () => {
    const fresh = await getContent(contentId)
    if (fresh && !fresh.deleted_at) {
      queryClient.setQueryData(contentKeys.detail(contentId), fresh)
    }
    return fresh
  }, [queryClient, contentId])

  /** Remplace le brouillon affiché par celui de la base. */
  const applyFresh = useCallback(
    (fresh: Content | null) => {
      // Une lecture plus ancienne que la révision affichée (arrivée en retard) : sans effet.
      if (!fresh || fresh.draft_rev < saving.state.rev) return
      const pending = saving.unsavedValue
      if (pending) setStash(pending.draft)
      const freshSettings = settingsOf(fresh)
      savedSettings.current = freshSettings
      synced.current = { draft: fresh.draft, settings: freshSettings }
      saving.reset(fresh.draft_rev, fresh.draft_saved_at)
      setDraft(fresh.draft)
      setSettings(freshSettings)
      setRefusedSlug(null)
      setLoadedRev(fresh.draft_rev)
      setViewKey((key) => key + 1)
    },
    [saving]
  )

  const reload = () => {
    void fetchFresh()
      .then(applyFresh)
      .catch((error: unknown) => {
        checkAccess(error)
        toast.error(texts.editor.lock.reloadFailed)
      })
  }

  // Le brouillon a changé dans la base (quelqu'un d'autre écrit) : on le relit.
  const mustReload =
    serverRev !== null &&
    serverRev > loadedRev &&
    !(
      phase === "mine" &&
      autosave.state.status !== "stopped" &&
      autosave.state.unsaved
    )
  // Relu tant que la révision affichée (loadedRev) est en retard ; nouvel essai après un échec.
  const [reloadAttempt, setReloadAttempt] = useState(0)
  useEffect(() => {
    if (!mustReload) return
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    fetchFresh()
      .then((fresh) => {
        if (!cancelled) applyFresh(fresh)
      })
      .catch(() => {
        if (!cancelled) {
          retry = setTimeout(
            () => setReloadAttempt((attempt) => attempt + 1),
            RELOAD_RETRY_MS
          )
        }
      })
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [mustReload, serverRev, loadedRev, reloadAttempt, fetchFresh, applyFresh])

  // Main reprise sans que personne n'ait écrit entre-temps : l'enregistrement reprend là où
  // il s'était arrêté, avec ce qui est à l'écran.
  useEffect(() => {
    if (phase !== "mine" || !resume.current) return
    if (autosave.state.status !== "stopped") {
      resume.current = false
      return
    }
    if ((serverRev ?? loadedRev) > loadedRev) return
    resume.current = false
    const pending = saving.unsavedValue
    saving.reset(loadedRev, autosave.state.savedAt)
    if (pending) saving.change(pending)
  }, [
    phase,
    serverRev,
    loadedRev,
    autosave.state.status,
    autosave.state.savedAt,
    saving,
  ])

  const take = (force: boolean) => {
    resume.current = true
    void lock.take(force)
  }

  // --- Blocs liés (blocs identiques partout) -----------------------------------------------

  const linkedIds = useMemo(() => linkedTemplateIds(draft), [draft])
  // Modèles insérés ou créés à l'instant : montrés sans attendre la relecture de la base.
  const [pickedTemplates, setPickedTemplates] = useState<
    Record<string, LinkedTemplate>
  >({})
  const linkedQuery = useQuery({
    queryKey: templateKeys.byIds(linkedIds),
    queryFn: () => getTemplatesByIds(linkedIds),
    enabled: linkedIds.length > 0,
    placeholderData: keepPreviousData,
    // Un autre membre peut corriger le modèle pendant qu'on écrit : relu régulièrement.
    refetchInterval: 30_000,
  })
  const templatesById = useMemo(() => {
    const map = new Map<string, LinkedTemplate>(Object.entries(pickedTemplates))
    for (const template of linkedQuery.data ?? [])
      map.set(template.id, template)
    return map
  }, [linkedQuery.data, pickedTemplates])
  const linkedLoading =
    (linkedQuery.isPending || linkedQuery.isPlaceholderData) &&
    linkedIds.length > 0
  const linkedFailed = linkedQuery.isError
  const { refetch: refetchLinked } = linkedQuery

  const templateFor = useCallback(
    (templateId: string): LinkedTemplateState => {
      const template = templatesById.get(templateId)
      if (!template) {
        if (linkedLoading) return { state: "loading" }
        if (linkedFailed) {
          return { state: "error", retry: () => void refetchLinked() }
        }
        return { state: "missing" }
      }
      if (template.inTrash || template.sort !== "shared") {
        return { state: "missing" }
      }
      const block = singleBlock(template.draft)
      return block
        ? { state: "ready", name: template.title, block }
        : { state: "empty", name: template.title }
    },
    [templatesById, linkedLoading, linkedFailed, refetchLinked]
  )
  const templateName = useCallback(
    (block: Block) => {
      if (block.type !== "linked") return null
      const state = templateFor(block.templateId)
      return state.state === "ready" || state.state === "empty"
        ? state.name
        : null
    },
    [templateFor]
  )

  // Les blocs des modèles cités (et ceux de leurs encadrés), pour leurs images.
  const linkedBlocks = useMemo(
    () =>
      linkedIds.flatMap((id): Block[] => {
        const template = templatesById.get(id)
        const block = template ? singleBlock(template.draft) : null
        if (!block) return []
        return block.type === "box" ? [block, ...block.blocks] : [block]
      }),
    [linkedIds, templatesById]
  )

  // --- Fichiers des blocs Image -----------------------------------------------------------

  const mediaIds = useMemo(
    () =>
      [
        ...new Set([
          ...[
            ...flattenBlocks(draft).map(({ block }) => block),
            ...linkedBlocks,
          ].flatMap((block) =>
            block.type === "image" && block.mediaId ? [block.mediaId] : []
          ),
          // L'image de présentation et l'audio d'un épisode.
          ...(draft.cover?.mediaId ? [draft.cover.mediaId] : []),
          ...(draft.audio?.mediaId ? [draft.audio.mediaId] : []),
        ]),
      ].sort(),
    [draft, linkedBlocks]
  )
  const mediaQuery = useQuery({
    queryKey: contentKeys.media(mediaIds),
    queryFn: () => getMediaByIds(mediaIds),
    enabled: mediaIds.length > 0,
    placeholderData: keepPreviousData,
    // Un texte alternatif ou une transcription ajoutés dans la Médiathèque (autre onglet) :
    // relus au retour dans l'éditeur.
    refetchOnWindowFocus: "always",
  })
  const mediaById = useMemo(() => {
    const map = new Map<string, Media>(Object.entries(picked))
    for (const media of mediaQuery.data ?? []) map.set(media.id, media)
    return map
  }, [mediaQuery.data, picked])
  const readyMedia = useMemo(
    () =>
      [...mediaById.values()].filter(
        (media) => media.status === "ready" && !media.deleted_at
      ),
    [mediaById]
  )
  const urlFor = usePreviewUrls(readyMedia)
  // keepPreviousData : pendant la lecture d'une nouvelle liste, les anciennes données restent
  // affichées (isPlaceholderData) ; un fichier absent n'est pas encore « supprimé ».
  const mediaLoading =
    (mediaQuery.isPending || mediaQuery.isPlaceholderData) &&
    mediaIds.length > 0
  const mediaFailed = mediaQuery.isError
  const { refetch: refetchMedia } = mediaQuery
  const retryMedia = useCallback(() => void refetchMedia(), [refetchMedia])

  const mediaFor = useCallback(
    (mediaId: string | null): BlockMedia => {
      if (!mediaId) return { state: "none" }
      const media = mediaById.get(mediaId)
      if (!media) {
        if (mediaLoading) return { state: "loading" }
        if (mediaFailed) return { state: "error", retry: retryMedia }
        return { state: "missing" }
      }
      if (media.deleted_at) return { state: "missing" }
      if (media.status !== "ready") return { state: "not_ready", media }
      return { state: "ready", media, url: urlFor(media) }
    },
    [mediaById, mediaLoading, mediaFailed, retryMedia, urlFor]
  )

  // --- Actions sur les blocs ---------------------------------------------------------------

  const onUpdateBlock = useCallback(
    <T extends Block>(id: string, update: (block: T) => T) =>
      setDraft((current) => updateBlock(current, id, update)),
    []
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
  const addRef = useRef(addBlock)
  useEffect(() => {
    addRef.current = addBlock
  })
  const addToBox = useCallback(
    (boxId: string, type: "text" | "image") => addRef.current(type, boxId),
    []
  )

  // En Lecture, rien ne se choisit : on repasse en Édition pour montrer un bloc ou en ajouter un.
  const toEdit = () =>
    setPhoneView((current) =>
      current.mode === "edit" ? current : { ...current, mode: "edit" }
    )
  const onPreviewChange = (next: PreviewSettings) => {
    if (next.mode === "read") setSelectedId(null)
    setPhoneView(next)
  }

  const selectAndShow = (id: string) => {
    toEdit()
    setSelectedId(id)
    requestAnimationFrame(() => focusBlockSoon(id, 0, feed))
  }

  // Un bloc partagé n'a qu'un bloc au premier niveau ([D11]).
  const rootLimit = isShared ? SHARED_ROOT_LIMIT : undefined
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

  // « Sortir de la section » (plan de l'éditeur du Fil) : le bloc se place juste après elle.
  const onLeaveBox = (id: string) => {
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

  // « Dupliquer » (plan de l'éditeur du Fil) : la copie juste après, choisie.
  const onDuplicate = (id: string) => {
    const place = findBlock(draft, id)
    const result = duplicateBlock(draft, id)
    if (!place || !result) return
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
    // Le focus va au bloc voisin (le suivant, sinon le précédent, sinon l'encadré qui le
    // contenait), ou à « Ajouter un bloc » s'il n'en reste aucun.
    const siblings = blocksOf(draft, place.container)
    const neighbor =
      siblings[place.index + 1]?.id ??
      siblings[place.index - 1]?.id ??
      (place.container === ROOT ? null : place.container)
    setDraft((current) => removeBlock(current, id))
    setSelectedId(neighbor)
    focusOnceShown(() =>
      neighbor ? blockHandle(neighbor) : document.getElementById(ADD_BLOCK_ID)
    )
    toast(texts.editor.settings.removed(blockLabel(place.block)), {
      action: {
        label: texts.editor.settings.undo,
        onClick: () =>
          setDraft(
            (current) =>
              insertBlock(current, place.block, place.container, place.index) ??
              insertBlock(current, place.block, ROOT, current.blocks.length) ??
              current
          ),
      },
    })
  }

  const onChooseImage = (media: Media) => {
    const blockId = pickerFor
    setPickerFor(null)
    if (!blockId) return
    setPicked((current) => ({ ...current, [media.id]: media }))
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
    toast(
      key === "cover"
        ? texts.editor.presentation.cover.removed
        : texts.editor.presentation.audio.removed,
      {
        action: {
          label: texts.editor.settings.undo,
          onClick: () =>
            setDraft((current) => ({ ...current, [key]: previous })),
        },
      }
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

  /** « Voir la présentation » disparaît au clic : le focus va au titre du panneau. */
  const showPresentation = () => {
    setSelectedId(null)
    focusOnceShown(() =>
      document.querySelector<HTMLElement>("[data-presentation-title]")
    )
  }

  // « Détacher » : le bloc lié devient une copie ordinaire du bloc de son modèle, à la même
  // place (même id ; nouveaux id dans un encadré), enregistrée comme toute modification.
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
      focusOnceShown(() => blockHandle(blockId))
      toast(texts.templates.linked.detached(name), {
        action: {
          label: texts.editor.settings.undo,
          onClick: () =>
            setDraft((current) => ({
              ...current,
              blocks: current.blocks.map((block) =>
                block.id === blockId ? linked : block
              ),
            })),
        },
      })
    }
  })
  const detachBlock = useCallback(
    (blockId: string) => detachRef.current(blockId),
    []
  )

  // « Ajouter un bloc » › « Un modèle… » : une mise en forme devient une copie (nouveaux id),
  // un bloc identique partout un bloc lié, au premier niveau, après le bloc choisi.
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)
  // at : la place au premier niveau d'un bloc glissé dans l'aperçu.
  const onInsertTemplate = (template: TemplateItem, at?: number) => {
    setTemplatePickerOpen(false)
    const result = insertTemplate(draft, template, selectedId, at)
    if (!result) return
    // Venu de « / » : le bloc enregistré prend la place du texte resté vide.
    const target = slashTarget.current
    slashTarget.current = null
    if (target && target === selectedId && isEmptyText(result.draft, target)) {
      result.draft = removeBlock(result.draft, target)
    }
    if (template.sort === "shared") {
      setPickedTemplates((current) => ({
        ...current,
        [template.id]: {
          id: template.id,
          title: template.title,
          sort: "shared",
          inTrash: false,
          draft: template.draft,
        },
      }))
    }
    setDraft(result.draft)
    setSelectedId(result.firstId)
    requestAnimationFrame(() =>
      focusOnceShown(() => blockHandle(result.firstId))
    )
    toast.success(
      texts.templates.insert.inserted(
        template.title.trim() || texts.templates.list.untitled
      )
    )
  }

  // Éditeur du Fil : un bloc de l'onglet Blocs glissé dans l'aperçu, et le trait qui montre où
  // il tombera (seulement au premier niveau, entre deux blocs).
  const phoneRef = useRef<HTMLDivElement>(null)
  const [dropLine, setDropLine] = useState<{
    index: number
    top: number
  } | null>(null)
  const dropPlace = (clientY: number) => {
    const phone = phoneRef.current
    const list = phone?.querySelector(".blocks-list")
    if (!phone || !list) return null
    const rows = [...list.children].map((row) => row.getBoundingClientRect())
    const index = dropIndex(
      rows.map((row) => row.top + row.height / 2),
      clientY
    )
    const origin = phone.getBoundingClientRect().top
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0
    const top =
      rows.length === 0
        ? list.getBoundingClientRect().top - origin
        : index < rows.length
          ? rows[index].top - origin - gap / 2
          : rows[rows.length - 1].bottom - origin + gap / 2
    return { index, top }
  }
  const libraryDrop = feed && editable && phoneView.mode === "edit"
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

  // Éditeur du Fil : les modèles s'insèrent depuis « Mes blocs », dans la colonne de gauche
  // (pas dans une fenêtre) ; ailleurs, la fenêtre des modèles.
  const openMine = () => {
    setFocusMode(false)
    setOutlineOpen(true)
    setLeftTab("blocks")
    setSavedOpen(true)
  }
  const openTemplates = feed ? openMine : () => setTemplatePickerOpen(true)

  // « / » au début d'un texte vide (éditeur du Fil) : le texte devient le bloc choisi, ou
  // « Mes blocs » s'ouvre à gauche (le bloc enregistré prendra alors la place du texte vide).
  const slashTarget = useRef<string | null>(null)
  const onSlash = (blockId: string, choice: SlashChoice) => {
    if (choice === "text") return
    if (choice === "mine") {
      slashTarget.current = blockId
      setSelectedId(blockId)
      openMine()
      return
    }
    const block = blockRegistry[choice].create()
    setDraft((current) => replaceBlock(current, blockId, block) ?? current)
    setSelectedId(block.id)
    if (choice === "image") setPickerFor(block.id)
    else
      requestAnimationFrame(() => focusOnceShown(() => blockHandle(block.id)))
  }
  const slashRef = useRef(onSlash)
  useEffect(() => {
    slashRef.current = onSlash
  })
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  })
  const slash = useMemo(
    () => ({
      choices: (blockId: string) => slashChoices(draftRef.current, blockId),
      choose: (blockId: string, choice: SlashChoice) =>
        slashRef.current(blockId, choice),
    }),
    []
  )

  const blocksValue = useMemo<BlocksEditorValue>(
    () => ({
      editable,
      selectedId,
      selectBlock: setSelectedId,
      updateBlock: onUpdateBlock,
      setActiveText: onActiveText,
      mediaFor,
      openPicker,
      addToBox,
      templateFor,
      detachBlock,
      slash: feed ? slash : undefined,
      withoutHandles: feed,
      linkedWithoutBar: feed,
    }),
    [
      feed,
      slash,
      editable,
      selectedId,
      onUpdateBlock,
      onActiveText,
      mediaFor,
      openPicker,
      addToBox,
      templateFor,
      detachBlock,
    ]
  )

  // La Lecture (éditeur du Fil) : les mêmes fichiers et modèles, rien de modifiable.
  const readOnlyBlocks = useMemo<BlocksEditorValue>(
    () => ({ ...blocksValue, editable: false, slash: undefined }),
    [blocksValue]
  )

  // --- Réglages du contenu, publication, historique -----------------------------------------

  const levels = useQuery({
    queryKey: accessLevelsKey,
    queryFn: listAccessLevels,
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const openSettings = useCallback((focus: SettingsFocus) => {
    setSettingsFocus(focus)
    setSettingsOpen(true)
  }, [])

  /**
   * Avant de publier : termine l'enregistrement en attente et renvoie la révision enregistrée.
   * En lecture seule, la révision affichée (la base refuse si elle a changé, ou si quelqu'un
   * d'autre écrit : [D14]).
   */
  const prepare = async (): Promise<number | null> => {
    if (phase !== "mine") return loadedRev
    await saving.flush()
    const state = saving.state
    if (
      state.unsaved ||
      state.status === "failed" ||
      state.status === "stopped" ||
      state.status === "offline"
    ) {
      toast.error(texts.publication.needsSaved, {
        description: state.error?.message,
      })
      return null
    }
    return state.rev
  }

  /** Enregistre des réglages avec le brouillon (sous le verrou), puis comme prepare. */
  const applySettings = async (next: ContentSettings) => {
    if (!editable) {
      toast.error(texts.publication.levelNeedsLock)
      return null
    }
    setSettings(next)
    synced.current = { draft, settings: next }
    saving.change(synced.current)
    return prepare()
  }

  /** « Revenir à cette version » : recopiée dans le brouillon par la base, puis relue. */
  const onRevert = async (version: VersionItem) => {
    try {
      if ((await prepare()) === null) return
      const result = await revertToVersion(version.id, editorSession)
      applyFresh(await fetchFresh())
      setHistoryOpen(false)
      toast.success(texts.publication.history.reverted(version.number))
      for (const warning of result.warnings) {
        toast.warning(texts.publication.history.warnings[warning])
      }
    } catch (error) {
      checkAccess(error)
      toast.error(errorMessage(error))
      if (error instanceof ContentError && error.code === "verrou_perdu") {
        notifyLost()
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
      titleRequired(kind) ? publishChecks(kind, draft, mediaFor) : undefined,
    [kind, draft, mediaFor]
  )

  // --- Méthodes : le plan, ce qui changera dans l'app, la méthode d'un élément ----------------

  // Un chapitre ou une leçon : sa méthode (et son chapitre), pour « ← méthode » et le rappel.
  const elementContext = useQuery({
    queryKey: methodKeys.context(contentId),
    queryFn: () => getElementContext(contentId),
    enabled: isElement,
  })
  const methodId = isMethod
    ? contentId
    : (elementContext.data?.method.id ?? null)
  const methodInTrash = elementContext.data?.method.deleted ?? false
  // Ce qui changera dans l'app si l'on publie la méthode ([D29]) : relu régulièrement (les
  // autres écrivent ses leçons), après chaque geste du plan, et à l'ouverture de « Publier ».
  const preview = useQuery({
    queryKey: methodKeys.preview(methodId ?? ""),
    queryFn: () => getMethodPreview(methodId ?? ""),
    enabled: methodId !== null && !methodInTrash,
    // Relue à chaque ouverture d'un éditeur (on revient souvent d'une leçon modifiée).
    staleTime: 0,
    refetchInterval: 30_000,
  })
  // Un chapitre ou une leçon : la publication de sa méthode (plan en ligne, programmation) et
  // son plan (le chapitre d'une leçon est-il montré ?).
  const methodPublication = useQuery({
    queryKey: contentKeys.publication(methodId ?? ""),
    queryFn: () => getPublication(methodId ?? ""),
    enabled: isElement && methodId !== null,
    refetchInterval: 30_000,
  })
  const methodTree = useQuery({
    queryKey: methodKeys.tree(methodId ?? ""),
    queryFn: () => getMethodTree(methodId ?? ""),
    enabled: isElement && methodId !== null,
  })
  const ownState = useMemo(() => {
    if (!isElement || !methodPublication.data || !methodTree.data) {
      return undefined
    }
    const place = methodTree.data
      .flatMap((chapter) => [
        { element: chapter, chapterInApp: true },
        ...chapter.lessons.map((lesson) => ({
          element: lesson,
          chapterInApp: chapter.inApp,
        })),
      ])
      .find((entry) => entry.element.id === contentId)
    if (!place) return undefined
    return elementState(
      { ...place.element, inApp: settings.inApp },
      place.chapterInApp,
      liveIds(parseLiveOutline(methodPublication.data.live?.outline)),
      preview.data ? previewByElement(preview.data) : undefined
    )
  }, [
    isElement,
    methodPublication.data,
    methodTree.data,
    contentId,
    settings.inApp,
    preview.data,
  ])

  // La programmation de la méthode, vue depuis cet élément ([D31]).
  const methodSchedule: ScheduleState = methodPublication.data
    ? publicationStatus(
        methodPublication.data,
        methodPublication.data.draft_rev,
        methodPublication.dataUpdatedAt
      ).schedule
    : { kind: "none" }

  // Ce qui ferait refuser la publication de la méthode à cause de cet élément.
  const ownProblem = isElement
    ? (preview.data?.find(
        (row) => row.elementId === contentId && row.problem !== null
      ) ?? null)
    : null

  const methodBridge: MethodPublication | undefined = isMethod
    ? {
        preview: preview.data,
        // La fiche enregistrée après la dernière lecture de la liste compte aussi.
        pending:
          preview.data === undefined
            ? undefined
            : preview.data.length > 0 || ficheSavedAt > preview.dataUpdatedAt,
        fetching: preview.isFetching,
        failed: preview.isError,
        refresh: () => preview.refetch(),
      }
    : undefined

  const pub = usePublication({
    contentId,
    kind,
    enabled: !isTemplate && !isElement,
    method: methodBridge,
    draftRev: Math.max(autosave.state.rev, serverRev ?? 0, loadedRev),
    unsaved: autosave.state.unsaved,
    editable,
    settings,
    levels: levels.data,
    levelsFailed: levels.isError,
    retryLevels: () => void levels.refetch(),
    prepare,
    applySettings,
    takeLock: () => take(true),
    openSettings,
    checks,
    // Le titre : le curseur y va ; une image ou un audio : le choix du fichier s'ouvre.
    onFix: (key) => {
      if (key === "title") {
        setSelectedId(null)
        focusOnceShown(() => document.getElementById(CONTENT_TITLE_ID))
      } else openPresentationPicker(key)
    },
  })

  // --- « Enregistrer comme modèle » (contenus) ----------------------------------------------

  // Les blocs cochés dans le plan (ou le bloc choisi), puis la fenêtre du nouveau modèle.
  const [choosing, setChoosing] = useState(false)
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set())
  const [saveAsIds, setSaveAsIds] = useState<string[] | null>(null)
  const saveAs = useMutation({
    mutationFn: async ({
      ids,
      values,
    }: {
      ids: string[]
      values: TemplateValues
    }) => {
      // Le modèle est fait du brouillon ENREGISTRÉ : l'enregistrement en attente part d'abord.
      if ((await prepare()) === null) return null
      return createTemplateFrom(contentId, ids, values)
    },
    onSuccess: (created, { ids, values }) => {
      if (!created) return
      setSaveAsIds(null)
      setChoosing(false)
      setChosen(new Set())
      void queryClient.invalidateQueries({ queryKey: templateKeys.all })
      const name = created.title.trim() || texts.templates.list.untitled
      const open = {
        label: texts.templates.saveAs.open,
        onClick: () => void navigate(editorPath("templates", created.id)),
      }
      if (values.sort === "shared" && ids.length === 1 && editable) {
        // Le bloc devient lié à son modèle : on le corrige désormais dans le modèle.
        setPickedTemplates((current) => ({
          ...current,
          [created.id]: {
            id: created.id,
            title: created.title,
            sort: "shared",
            inTrash: false,
            draft: created.draft,
          },
        }))
        setDraft((current) => ({
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === ids[0] ? linkedBlock(created.id, ids[0]) : block
          ),
        }))
        toast.success(texts.templates.saveAs.saved(name), {
          description: texts.templates.saveAs.sharedReplaced,
          action: open,
        })
      } else {
        toast.success(texts.templates.saveAs.saved(name), { action: open })
      }
    },
    onError: (error) => checkAccess(error),
  })
  const openSaveAs = (ids: string[]) => {
    saveAs.reset()
    setSaveAsIds(ids)
  }

  // Un bloc identique partout garde son bloc tant qu'un brouillon l'utilise ([D11]).
  const templateUses = useTemplateUses(contentId, isShared)
  const removeBlocked =
    isShared &&
    (templateUses.data?.length ?? 0) > 0 &&
    draft.blocks.length === 1 &&
    selectedId === draft.blocks[0].id
      ? texts.templates.editor.keepBlock
      : null
  const canAddRoot = canAddRootBlock(draft, templateSort)

  // --- Copier mon texte, quitter -----------------------------------------------------------

  const lostOrStopped = lock.state.lost || autosave.state.status === "stopped"
  // Après une perte de main : ce qui n'était pas enregistré (encore à l'écran, ou mis de côté
  // quand le brouillon a été relu).
  const canCopy =
    stash !== null || (lostOrStopped && saving.unsavedValue !== null)

  const onCopy = async () => {
    const value = saving.unsavedValue?.draft ?? stash ?? draft
    try {
      await navigator.clipboard.writeText(draftToPlainText(value))
      toast.success(texts.editor.lock.copied)
    } catch {
      toast.error(texts.editor.lock.copyFailed)
    }
  }

  const risky =
    autosave.state.unsaved &&
    (autosave.state.status === "offline" ||
      autosave.state.status === "failed" ||
      autosave.state.status === "stopped")
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
  // Le bloc d'un modèle partagé, tel qu'il est aujourd'hui (Lecture, temps de lecture).
  const resolveLinked = useCallback(
    (block: Block) => {
      if (block.type !== "linked") return null
      const state = templateFor(block.templateId)
      return state.state === "ready" ? state.block : null
    },
    [templateFor]
  )
  const stats = useMemo(
    () => readingStats(draft, resolveLinked),
    [draft, resolveLinked]
  )

  // En tête de l'aperçu : l'image de présentation, le titre, le résumé et l'audio, comme dans
  // l'app (et, pour une méthode, toute sa fiche).
  const phoneTop = (
    <>
      {/* Un chapitre ou une leçon : l'image est facultative, montrée seulement une fois choisie
          (le panneau propose de la choisir). */}
      {presentationKind && (coverRequired(kind) || draft.cover) && (
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
        onFocus={presentationKind ? () => setSelectedId(null) : undefined}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault()
        }}
      />
      {presentationKind && !feed && (
        <SummaryPreview
          summary={draft.summary ?? ""}
          editable={editable}
          onChange={(summary) =>
            setDraft((current) => ({ ...current, summary }))
          }
          onFocus={() => setSelectedId(null)}
        />
      )}
      {presentationKind === "episode" && (
        <AudioPreview
          media={mediaFor(draft.audio?.mediaId ?? null)}
          editable={editable}
          onChoose={() => openPresentationPicker("audio")}
          onSelect={() => setSelectedId(null)}
        />
      )}
    </>
  )

  // La présentation dans un panneau : image (changer, retirer, texte alternatif), résumé,
  // catégories, audio.
  const presentationPanel = presentationKind ? (
    <PresentationPanel
      kind={presentationKind}
      draft={draft}
      editable={editable}
      mediaFor={mediaFor}
      urlFor={(media) => (media.state === "ready" ? media.url : undefined)}
      categoryNames={chosenCategoryNames}
      onChooseCover={() => openPresentationPicker("cover")}
      onRemoveCover={() => removePresentationFile("cover")}
      onChooseAudio={() => openPresentationPicker("audio")}
      onRemoveAudio={() => removePresentationFile("audio")}
      onEditCategories={() => openSettings("categories")}
    />
  ) : undefined
  // Éditeur du Fil : l'onglet « Article » (tout ce qui concerne l'article) et « Bloc choisi ».
  const articlePanel =
    feed && categorySection ? (
      <ArticlePanel
        draft={draft}
        editable={editable}
        settings={settings}
        onSettingsChange={setSettings}
        onSummaryChange={(summary) =>
          setDraft((current) => ({ ...current, summary }))
        }
        levels={levels.data}
        levelsFailed={levels.isError}
        live={pub.publication?.live ?? null}
        categories={{
          section: categorySection,
          list: categories.data,
          failed: categories.isError,
          retry: () => void categories.refetch(),
        }}
        cover={mediaFor(draft.cover?.mediaId ?? null)}
        coverUrl={(() => {
          const cover = mediaFor(draft.cover?.mediaId ?? null)
          return cover.state === "ready" ? cover.url : undefined
        })()}
        ready={readyItems(
          checks ?? { missing: [], advice: [] },
          settings.accessChosen
        )}
        warnings={{
          count: warnedIds.length,
          // Le premier point à vérifier, choisi et montré dans le plan.
          onShow: () => {
            const first = warnedIds[0]
            if (!first) return
            setLeftTab("plan")
            selectAndShow(first)
            // Sa ligne s'allume dans le plan, une fois l'onglet ouvert.
            highlightSoon(() =>
              document.querySelector<HTMLElement>(
                `[data-outline-id="${first}"]`
              )
            )
          },
        }}
        onChooseCover={() => openPresentationPicker("cover")}
        onRemoveCover={() => removePresentationFile("cover")}
      />
    ) : null
  const blockSettings = (
    <BlockSettings
      empty={
        <p className="text-sm text-muted-foreground">
          {texts.editor.columns.noBlock}
        </p>
      }
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
      onSaveAsTemplate={(id) => openSaveAs([id])}
      onDuplicate={onDuplicate}
      rootLimit={rootLimit}
      actionBar
    />
  )

  // Le plan : la colonne de gauche (onglet « Plan » de l'éditeur du Fil).
  // Éditeur du Fil : le plan montre le contenu de chaque bloc (vignettes, intertitre qui ouvre
  // un texte) et ce qui manque, avec un menu « … » par ligne.
  const feedOutline: FeedOutline | undefined = feed
    ? {
        mediaFor,
        hoveredId,
        onHover: setHoveredId,
        warningOf: (block) => blockWarning(block, mediaFor, templateFor),
        onMove: editable ? setDraft : undefined,
        actions: editable
          ? {
              onDuplicate,
              onSaveToMine: (id) => openSaveAs([id]),
              onLeaveBox,
              onRemove,
              removeBlocked: () => null,
            }
          : undefined,
      }
    : undefined
  const outlinePanel = (
    <OutlinePanel
      draft={draft}
      selectedId={selectedId}
      onSelect={selectAndShow}
      templateName={templateName}
      feed={feedOutline}
      selection={
        !isTemplate && editable
          ? {
              active: choosing,
              chosen,
              onToggleActive: () => {
                setChoosing((active) => !active)
                setChosen(new Set())
              },
              onChoose: (id, checked) =>
                setChosen((current) => {
                  const next = new Set(current)
                  if (checked) next.add(id)
                  else next.delete(id)
                  return next
                }),
              onSave: () => {
                const ids = selectedRootIds(draft, new Set(chosen))
                if (ids.length > 0) openSaveAs(ids)
              },
            }
          : undefined
      }
    />
  )

  // Au-dessus du téléphone : brouillon trop lourd, échec d'enregistrement.
  const notices = (
    <>
      {nearLimit && (
        <p
          role="status"
          className="mx-auto mb-3 max-w-(--blocks-phone-width) text-sm text-warning"
        >
          {texts.editor.save.nearLimit}
        </p>
      )}
      {autosave.state.status === "failed" && autosave.state.error && (
        <p
          role="alert"
          className="mx-auto mb-3 max-w-(--blocks-phone-width) text-sm text-destructive"
        >
          {autosave.state.error.message} {autosave.state.error.detail}
        </p>
      )}
    </>
  )
  // Le téléphone en Édition : la présentation et les blocs, modifiables sur place.
  const phone = (
    <div
      ref={phoneRef}
      className={cn(
        "blocks-phone",
        // Éditeur du Fil : le cadre du téléphone l'entoure (FeedPreview) ; le trait d'un bloc
        // glissé se place par rapport à lui.
        feed ? "relative" : "rounded-4xl border shadow-sm",
        !editable && "cursor-default"
      )}
      data-editable={editable || undefined}
      // Éditeur du Fil : un clic hors d'un bloc revient sur l'onglet « Article ».
      onClick={
        feed
          ? (event) => {
              if (
                event.target instanceof Element &&
                !event.target.closest("[data-block-id]")
              ) {
                setSelectedId(null)
              }
            }
          : undefined
      }
      // Éditeur du Fil : le bloc survolé dans l'aperçu l'est aussi dans le plan.
      onPointerOver={
        feed
          ? (event) => {
              const block =
                event.target instanceof Element
                  ? event.target.closest<HTMLElement>("[data-block-id]")
                  : null
              setHoveredId(block?.dataset.blockId ?? null)
            }
          : undefined
      }
      onPointerLeave={feed ? () => setHoveredId(null) : undefined}
      // En capture : le texte (Tiptap) ne reçoit pas un bloc glissé depuis l'onglet Blocs.
      onDragOverCapture={
        libraryDrop
          ? (event) => {
              if (!event.dataTransfer.types.includes(LIBRARY_DRAG_TYPE)) return
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = "copy"
              setDropLine(dropPlace(event.clientY))
            }
          : undefined
      }
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setDropLine(null)
        }
      }}
      onDropCapture={
        libraryDrop
          ? (event) => {
              const drag = decodeLibraryDrag(
                event.dataTransfer.getData(LIBRARY_DRAG_TYPE)
              )
              if (!drag) return
              event.preventDefault()
              event.stopPropagation()
              const place = dropPlace(event.clientY)
              setDropLine(null)
              if (place) onLibraryDrop(drag, place.index)
            }
          : undefined
      }
    >
      {dropLine && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-5 z-10 h-0.5 -translate-y-1/2 rounded-full bg-primary"
          // eslint-disable-next-line no-restricted-syntax -- position pendant un glisser-déposer
          style={{ top: dropLine.top }}
        />
      )}
      {phoneTop}
      <BlocksEditorContext value={blocksValue}>
        <BlockCanvas
          key={viewKey}
          draft={draft}
          onChange={setDraft}
          rootLimit={rootLimit}
        />
      </BlocksEditorContext>
      {draft.blocks.length === 0 && (
        <Empty className="border border-dashed font-sans">
          <EmptyHeader>
            <EmptyTitle>
              {isTemplate
                ? texts.templates.editor.empty.title
                : texts.editor.emptyPage.title}
            </EmptyTitle>
            <EmptyDescription>
              {isShared
                ? texts.templates.editor.empty.sharedDescription
                : isTemplate
                  ? texts.templates.editor.empty.description
                  : texts.editor.emptyPage.description}
            </EmptyDescription>
          </EmptyHeader>
          {editable && (
            <div className="flex flex-wrap justify-center gap-2">
              {insertableBlocks.map((definition, index) => (
                <Button
                  key={definition.type}
                  // Éditeur du Fil (sans « Ajouter un bloc » en haut) : là où va le
                  // focus quand le dernier bloc est supprimé.
                  id={feed && index === 0 ? ADD_BLOCK_ID : undefined}
                  variant="outline"
                  size="sm"
                  onClick={() => addBlock(definition.type)}
                >
                  <definition.icon />
                  {definition.label}
                </Button>
              ))}
              {!isTemplate && (
                <Button variant="outline" size="sm" onClick={openTemplates}>
                  <LayoutTemplate />
                  {texts.templates.insert.menu}
                </Button>
              )}
            </div>
          )}
        </Empty>
      )}
      {editable && draft.blocks.length > 0 && canAddRoot && (
        <div className="mt-6 flex justify-center font-sans">
          <AddBlockMenu
            variant="ghost"
            onAdd={(type) => addBlock(type, undefined)}
            onTemplate={isTemplate ? undefined : openTemplates}
          />
        </div>
      )}
      {editable && isShared && !canAddRoot && (
        <p className="mt-6 text-center font-sans text-xs text-muted-foreground">
          {texts.templates.editor.sharedLimit}
        </p>
      )}
    </div>
  )

  const sectionTitle = texts.sections[section].title
  const untitled = isTemplate
    ? texts.templates.list.untitled
    : texts.common.untitled

  const publishDisabled = phase === "taking" || phase === "error"
  // Une méthode dont on ne sait pas encore ce qui a changé : « Publier » reste possible (la
  // fenêtre le montrera).
  const alwaysPublishable =
    linkedIds.length > 0 || (isMethod && methodBridge?.pending === undefined)
  // Éditeur du Fil : au-dessus du téléphone, à sa largeur ; ailleurs, sous l'en-tête.
  const lockBanner = (
    <LockBanner
      lock={lock.state}
      holderIsMe={holderIsMe}
      autosave={autosave.state}
      canCopy={canCopy}
      onTake={take}
      onCopy={() => void onCopy()}
      onReload={reload}
      onDismissCopy={() => setStash(null)}
      lockInDialog={feed}
      inline={feed}
    />
  )
  const scheduleBanner = (
    <ScheduleBanner
      pub={pub}
      inline={feed}
      leave={
        <Link
          to={sections[section].path}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {texts.publication.banner.leave}
        </Link>
      }
    />
  )
  const saveStatus = (
    <SaveStatus
      state={autosave.state}
      visible={phase === "mine" || autosave.state.unsaved}
    />
  )
  const feedSaveStatus = (
    <SaveStatus
      state={autosave.state}
      visible={phase === "mine" || autosave.state.unsaved}
      compact
    />
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
      {!feed && (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <BackLink
            section={section}
            method={isElement ? (elementContext.data?.method ?? null) : null}
          />
          {!isMethod && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <Button
                variant={outlineOpen ? "secondary" : "ghost"}
                size="sm"
                aria-expanded={outlineOpen}
                aria-controls="editeur-plan"
                aria-label={
                  outlineOpen
                    ? texts.editor.outline.hide
                    : texts.editor.outline.show
                }
                onClick={() => setOutlineOpen((open) => !open)}
              >
                <ListTree />
                {texts.editor.outline.toggle}
              </Button>
            </>
          )}
          <p
            className="min-w-0 flex-1 truncate text-sm font-medium"
            aria-hidden
          >
            {title.trim() || untitled}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {elementKind ? texts.methods.kinds[elementKind] : sectionTitle}
            </span>
          </p>
          {templateSort && (
            <TemplateSortBadge
              sort={templateSort}
              templateFor={
                isTemplateFor(initial.template_for)
                  ? initial.template_for
                  : null
              }
            />
          )}
          <SaveStatus
            state={autosave.state}
            visible={phase === "mine" || autosave.state.unsaved}
          />
          {isTemplate ? (
            isShared && <SharedTemplateBar templateId={contentId} />
          ) : (
            <>
              <HeaderIconButton
                label={texts.publication.actions.settings}
                expanded={settingsOpen}
                onClick={() => openSettings(null)}
              >
                <Settings2 />
              </HeaderIconButton>
              <HeaderIconButton
                label={texts.publication.actions.history}
                expanded={historyOpen}
                onClick={() => setHistoryOpen(true)}
              >
                <History />
              </HeaderIconButton>
            </>
          )}
          {!isMethod && (
            <AddBlockMenu
              id={ADD_BLOCK_ID}
              variant="outline"
              disabled={!editable || !canAddRoot}
              onAdd={(type) => addBlock(type)}
              onTemplate={
                isTemplate ? undefined : () => setTemplatePickerOpen(true)
              }
            />
          )}
          {!isTemplate && !isElement && (
            <>
              <Separator orientation="vertical" className="h-6" />
              <PublishBar
                pub={pub}
                disabled={publishDisabled}
                alwaysPublishable={alwaysPublishable}
              />
            </>
          )}
        </header>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {!feed && lockBanner}
      {elementKind && (
        <ElementBanner
          kind={elementKind}
          context={elementContext.data}
          state={ownState}
          isFree={settings.isFree}
          problem={
            ownProblem?.problem
              ? contentProblemText(ownProblem.problem, ownProblem.problemDetail)
              : null
          }
          schedule={methodSchedule}
          holding={editable}
          onOpenSettings={() => openSettings(null)}
        />
      )}
      {!feed && !isTemplate && !isElement && scheduleBanner}

      {isMethod ? (
        // Une méthode : sa fiche (dans l'aperçu du téléphone, puis son panneau) et son plan.
        <div className="flex min-h-0 flex-1">
          <main className="w-md shrink-0 overflow-y-auto xl:w-lg">
            <div className="flex flex-col items-center gap-6 px-4 py-6">
              <div
                className={cn(
                  "blocks-phone rounded-4xl border shadow-sm",
                  !editable && "cursor-default"
                )}
                // La fiche d'une méthode n'a pas de blocs : pas la hauteur d'un écran (preview.css).
                data-compact
                data-editable={editable || undefined}
              >
                {phoneTop}
              </div>
              <div className="w-full max-w-(--blocks-phone-width) rounded-xl border bg-background p-4">
                {presentationPanel}
              </div>
            </div>
          </main>
          <aside className="min-w-0 flex-1 overflow-y-auto border-l bg-background">
            <MethodOutline
              methodId={contentId}
              editable={editable}
              session={editorSession}
              myId={lock.myId ?? ""}
              live={parseLiveOutline(pub.publication?.live?.outline)}
              preview={preview.data}
            />
          </aside>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {outlineOpen && feed && (
            <aside
              id="editeur-plan"
              aria-label={texts.editor.columns.left}
              // Caché (et non retiré) en Concentration : onglet et « Mes blocs » restent ouverts.
              className={cn(
                "flex w-feed-column shrink-0 flex-col border-r bg-background",
                focusMode && "hidden"
              )}
            >
              {/* Une ligne, de la même hauteur que l'en-tête de droite : le retour, le titre,
                  l'état de l'enregistrement en icône. */}
              <div className="flex h-12 shrink-0 items-center gap-1 border-b px-4">
                {/* La flèche alignée sur la marge de 16 px (son bouton déborde dans la marge). */}
                <span className="-ml-1.5 flex">
                  <BackLink section={section} compact />
                </span>
                <p
                  className="min-w-0 flex-1 truncate font-semibold"
                  aria-hidden
                >
                  {title.trim() || untitled}
                </p>
                {feedSaveStatus}
              </div>
              <Tabs
                value={leftTab}
                onValueChange={(value: LeftTab) => setLeftTab(value)}
                className="min-h-0 flex-1 gap-0"
              >
                <div className="px-4 pt-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="plan">
                      <ListTree />
                      {texts.editor.columns.plan}
                    </TabsTrigger>
                    <TabsTrigger value="blocks">
                      <LayoutGrid />
                      {texts.editor.columns.blocks}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="plan" className="min-h-0">
                  {outlinePanel}
                </TabsContent>
                <TabsContent value="blocks" className="min-h-0">
                  <BlocksLibrary
                    open={savedOpen}
                    onOpenChange={setSavedOpen}
                    editable={editable}
                    canAdd={canAddRoot}
                    onAdd={(type) => {
                      toEdit()
                      addBlock(type)
                    }}
                    onInsert={(template) => {
                      toEdit()
                      onInsertTemplate(template)
                    }}
                  />
                </TabsContent>
              </Tabs>
            </aside>
          )}
          {outlineOpen && !feed && (
            <aside
              id="editeur-plan"
              className="w-60 shrink-0 border-r bg-background"
            >
              {outlinePanel}
            </aside>
          )}

          <main
            className={
              feed
                ? "flex min-w-0 flex-1 flex-col overflow-x-auto"
                : "min-w-0 flex-1 overflow-y-auto"
            }
          >
            {feed ? (
              <FeedPreview
                preview={phoneView}
                onPreviewChange={onPreviewChange}
                toolbar={
                  <FormatToolbar
                    editor={toolbarEditor}
                    editable={editable}
                    orientation="vertical"
                  />
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
                    {scheduleBanner}
                    {notices}
                  </>
                }
                appBar={
                  phoneView.mode === "read" ? (
                    <ReadAppBar section={sectionTitle} />
                  ) : undefined
                }
              >
                {phoneView.mode === "read" ? (
                  // Les images lisent l'éditeur (fichier, aperçu), en lecture seule.
                  <BlocksEditorContext value={readOnlyBlocks}>
                    <ReadView
                      draft={draft}
                      title={title.trim() || untitled}
                      cover={mediaFor(draft.cover?.mediaId ?? null)}
                      meta={[
                        ...(chosenCategoryNames ?? []).slice(0, 1),
                        texts.editor.preview.minutes(stats.minutes),
                      ].join(" · ")}
                      locked={
                        previewLocked(phoneView, settings)
                          ? (levels.data?.find(
                              (level) => level.id === settings.accessLevelId
                            )?.name ?? null)
                          : false
                      }
                      resolve={resolveLinked}
                    />
                  </BlocksEditorContext>
                ) : (
                  phone
                )}
              </FeedPreview>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex justify-center bg-muted/40 px-6 py-3 backdrop-blur">
                  <FormatToolbar editor={toolbarEditor} editable={editable} />
                </div>
                {notices}
                <div className="flex justify-center px-6 pb-16">{phone}</div>
              </>
            )}
          </main>

          {feed ? (
            <aside
              aria-label={texts.editor.columns.right}
              className={cn(
                "flex w-feed-column shrink-0 flex-col border-l bg-background",
                focusMode && "hidden"
              )}
            >
              <Tabs
                value={rightTab}
                onValueChange={(value: RightTab) =>
                  setRightChoice({ tab: value, selectedId })
                }
                className="min-h-0 flex-1 gap-0"
              >
                {/* Les onglets en tête de la colonne, à la hauteur de l'en-tête de gauche. */}
                <div className="flex h-12 shrink-0 items-center border-b px-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="article">
                      {texts.editor.columns.article}
                    </TabsTrigger>
                    <TabsTrigger value="block">
                      {texts.editor.columns.block}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="article"
                  className="min-h-0 overflow-y-auto px-4 py-3"
                >
                  {articlePanel}
                </TabsContent>
                <TabsContent value="block" className="min-h-0">
                  {blockSettings}
                </TabsContent>
              </Tabs>
              {/* En bas, dans les deux onglets : la lecture, la dernière modification, puis le
                  cadenas (en lecture seule), l'état de publication et « Publier ». */}
              <ArticleFooter stats={stats} savedAt={autosave.state.savedAt}>
                {lockButton}
                <PublicationBadge pub={pub} />
                <span className="flex-1" />
                <PublishButton
                  pub={pub}
                  disabled={publishDisabled}
                  alwaysPublishable={alwaysPublishable}
                  onHistory={() => setHistoryOpen(true)}
                />
              </ArticleFooter>
            </aside>
          ) : (
            <aside className="w-72 shrink-0 border-l bg-background">
              <BlockSettings
                header={
                  presentationKind && selectedId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={showPresentation}
                    >
                      <PanelTop />
                      {texts.editor.presentation.show}
                    </Button>
                  ) : null
                }
                emptyLabel={
                  presentationKind
                    ? texts.editor.presentation.panelTitle[presentationKind]
                    : undefined
                }
                empty={presentationPanel}
                draft={draft}
                selectedId={selectedId}
                editable={editable}
                mediaFor={mediaFor}
                onUpdate={onUpdateBlock}
                onShift={onShift}
                rootLimit={rootLimit}
                onRemove={onRemove}
                onChooseImage={openPicker}
                templateFor={templateFor}
                onDetach={detachBlock}
                removeBlocked={removeBlocked}
                onSaveAsTemplate={
                  isTemplate ? undefined : (id) => openSaveAs([id])
                }
              />
            </aside>
          )}
        </div>
      )}

      {feed && focusMode && (
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
      {feed && (
        <LockDialog
          situation={lockView}
          holderName={lock.state.holderName}
          open={lockDialog.open}
          onOpenChange={lockDialog.setOpen}
          canCopy={canCopy}
          onTake={take}
          onCopy={() => void onCopy()}
        />
      )}

      {!isTemplate && (
        <>
          <ContentSettingsSheet
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            focus={settingsFocus}
            kind={kind}
            contentId={contentId}
            title={title}
            onTitleChange={(value) =>
              setDraft((current) => ({ ...current, title: value }))
            }
            settings={settings}
            editable={editable}
            levels={levels.data}
            levelsFailed={levels.isError}
            live={pub.publication?.live ?? null}
            refusedSlug={refusedSlug}
            categories={
              categorySection
                ? {
                    section: categorySection,
                    list: categories.data,
                    failed: categories.isError,
                    retry: () => void categories.refetch(),
                  }
                : undefined
            }
            onChange={(next) => {
              if (next.slug !== settings.slug) setRefusedSlug(null)
              setSettings(next)
            }}
          />
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
          <TemplatePicker
            open={templatePickerOpen}
            onOpenChange={setTemplatePickerOpen}
            onChoose={onInsertTemplate}
          />
          <TemplateDialog
            open={saveAsIds !== null}
            onOpenChange={(open) => {
              if (!open) setSaveAsIds(null)
            }}
            title={texts.templates.saveAs.title}
            description={texts.templates.saveAs.description(
              saveAsIds?.length ?? 1
            )}
            submitLabel={texts.templates.saveAs.submit}
            defaultSection={isTemplateFor(kind) ? kind : null}
            sharedDisabled={
              (saveAsIds?.length ?? 0) > 1
                ? texts.templates.saveAs.sharedOne
                : null
            }
            pending={saveAs.isPending}
            error={saveAs.error ? saveAs.error.message : null}
            onSubmit={(values) => {
              if (saveAsIds) saveAs.mutate({ ids: saveAsIds, values })
            }}
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

/** Bouton d'icône de l'en-tête (Réglages, Historique), avec son nom en infobulle. */
function HeaderIconButton({
  label,
  expanded,
  onClick,
  children,
}: {
  label: string
  expanded: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={expanded}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * « Ajouter un bloc » : Texte, Image, Encadré (après le bloc choisi, ou à la fin), et, dans un
 * contenu, « Un modèle… » (mise en forme ou bloc identique partout).
 */
function AddBlockMenu({
  onAdd,
  onTemplate,
  id,
  disabled = false,
  variant = "default",
}: {
  onAdd: (type: InsertableType) => void
  onTemplate?: () => void
  id?: string
  disabled?: boolean
  variant?: "default" | "ghost" | "outline"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        render={<Button size="sm" variant={variant} />}
      >
        <Plus />
        {texts.editor.add.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {insertableBlocks.map((definition) => (
          <DropdownMenuItem
            key={definition.type}
            onClick={() => onAdd(definition.type)}
          >
            <definition.icon />
            {definition.label}
          </DropdownMenuItem>
        ))}
        {onTemplate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onTemplate}>
              <LayoutTemplate />
              {texts.templates.insert.menu}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

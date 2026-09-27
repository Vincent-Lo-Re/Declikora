import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { Editor } from "@tiptap/react"
import { cn } from "cn"
import { ArrowLeft, FileQuestion, ListTree, Plus } from "lucide-react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { Link, useBlocker, useParams } from "react-router"
import { toast } from "sonner"

import "@/blocks/components/preview.css"

import { BlockCanvas } from "@/blocks/components/block-canvas"
import {
  BlocksEditorContext,
  type BlockMedia,
  type BlocksEditorValue,
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
import { ROOT, type Block, type Draft, type ImageBlock } from "@/blocks/types"
import { BlockSettings } from "@/components/editor/block-settings"
import { FormatToolbar } from "@/components/editor/format-toolbar"
import { LockBanner } from "@/components/editor/lock-banner"
import { MediaPicker } from "@/components/editor/media-picker"
import { OutlinePanel } from "@/components/editor/outline-panel"
import { SaveStatus } from "@/components/editor/save-status"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Skeleton } from "@/components/ui/skeleton"
import { useAutosave } from "@/hooks/use-autosave"
import { useEditLock } from "@/hooks/use-edit-lock"
import {
  contentKeys,
  getContent,
  getMediaByIds,
  type Content,
  type ContentKind,
} from "@/lib/contents/api"
import type { Media } from "@/lib/media/constants"
import { mediaKeys } from "@/lib/media/api"
import { sections, type SectionKey } from "@/navigation"
import { texts } from "@/texts"

// Nouvel essai de relecture du brouillon après un échec (réseau).
const RELOAD_RETRY_MS = 3000

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
  const checkAccess = useAccessCheck()
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

  if (content.isPending) {
    return (
      <EditorFrame section={section}>
        <div className="flex flex-1 justify-center p-10">
          <div
            className="w-[390px] space-y-4"
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
              {texts.editor.lock.retry}
            </Button>
          )}
        </Empty>
      </EditorFrame>
    )
  }

  return (
    <ContentEditor key={contentId} initial={content.data} section={section} />
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

function BackLink({ section }: { section: SectionKey }) {
  const title = texts.sections[section].title
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

/** Met le focus sur un élément dès qu'il apparaît (au prochain rendu). */
function focusSoon(find: () => HTMLElement | null, attempts = 20) {
  const element = find()
  if (element) {
    element.focus()
    return
  }
  if (attempts > 0) {
    requestAnimationFrame(() => focusSoon(find, attempts - 1))
  }
}

/** La poignée d'un bloc (et non celle d'un bloc de son encadré). */
function blockHandle(id: string): HTMLElement | null {
  return (
    document
      .querySelector(`[data-block-id="${id}"]`)
      ?.querySelector<HTMLElement>(":scope > [data-block-handle]") ?? null
  )
}

const ADD_BLOCK_ID = "editeur-ajouter"

/** Met le curseur dans un bloc qui vient d'apparaître (l'éditeur Tiptap se crée juste après). */
function focusBlockSoon(id: string, attempts = 20) {
  const element = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`)
  const editable = element?.querySelector<HTMLElement>(
    '[contenteditable="true"]'
  )
  if (element) element.scrollIntoView({ block: "nearest", behavior: "smooth" })
  if (editable) {
    editable.focus()
    return
  }
  if (attempts > 0) {
    requestAnimationFrame(() => focusBlockSoon(id, attempts - 1))
  }
}

function ContentEditor({
  initial,
  section,
}: {
  initial: Content
  section: SectionKey
}) {
  const contentId = initial.id
  const queryClient = useQueryClient()
  const checkAccess = useAccessCheck()
  // Cette ouverture de l'éditeur : le verrou est tenu par elle, pas seulement par le membre.
  const [editorSession] = useState(() => crypto.randomUUID())

  const [draft, setDraft] = useState<Draft>(initial.draft)
  // Révision du brouillon affiché (celle de la base au dernier chargement ou enregistrement).
  const [loadedRev, setLoadedRev] = useState(initial.draft_rev)
  // Change à chaque rechargement depuis la base : les blocs repartent du nouveau brouillon.
  const [viewKey, setViewKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [activeText, setActiveText] = useState<Editor | null>(null)
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  // Ce qui n'était pas enregistré quand on a perdu la main (« Copier mon texte »).
  const [stash, setStash] = useState<Draft | null>(null)
  // Fichiers choisis à l'instant : affichés sans attendre la relecture de la base.
  const [picked, setPicked] = useState<Record<string, Media>>({})
  // Le dernier brouillon venu de la base : ce n'est pas une modification à enregistrer.
  const synced = useRef<Draft>(initial.draft)
  // Vrai après « Reprendre la main » ou « Modifier » : l'enregistrement reprend.
  const resume = useRef(false)
  // Annonce pour les lecteurs d'écran (bloc monté ou descendu).
  const [announcement, setAnnouncement] = useState("")

  const autosave = useAutosave(
    contentId,
    editorSession,
    { rev: initial.draft_rev, savedAt: initial.draft_saved_at },
    {
      onSaved: (result, saved) => {
        setLoadedRev(result.rev)
        queryClient.setQueryData<Content | null>(
          contentKeys.detail(contentId),
          (old) =>
            old && {
              ...old,
              draft: saved,
              title: saved.title,
              draft_rev: result.rev,
              draft_saved_at: result.savedAt,
            }
        )
        // « Utilisé dans » de la médiathèque et liste des pages.
        void queryClient.invalidateQueries({
          queryKey: [...mediaKeys.all, "uses"],
        })
        void queryClient.invalidateQueries({
          queryKey: contentKeys.list("page"),
        })
      },
      onStopped: (error) => checkAccess(error),
    }
  )
  const saving = autosave.controller
  const lock = useEditLock(contentId, editorSession, () => saving.flush())
  const { notifyLost } = lock
  const phase = lock.state.phase
  const serverRev = lock.state.draftRev

  // serverRev ne suit que les autres (edit-lock.ts) : nos propres enregistrements, vus par
  // Realtime avant leur réponse, ne rendent pas l'aperçu non modifiable.
  const editable =
    phase === "mine" &&
    autosave.state.status !== "stopped" &&
    (serverRev ?? loadedRev) <= loadedRev

  // Chaque modification du brouillon part à l'enregistrement automatique.
  useEffect(() => {
    if (draft !== synced.current) saving.change(draft)
  }, [draft, saving])

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
      if (pending) setStash(pending)
      synced.current = fresh.draft
      saving.reset(fresh.draft_rev, fresh.draft_saved_at)
      setDraft(fresh.draft)
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

  // --- Fichiers des blocs Image -----------------------------------------------------------

  const mediaIds = useMemo(
    () =>
      [
        ...new Set(
          flattenBlocks(draft).flatMap(({ block }) =>
            block.type === "image" && block.mediaId ? [block.mediaId] : []
          )
        ),
      ].sort(),
    [draft]
  )
  const mediaQuery = useQuery({
    queryKey: contentKeys.media(mediaIds),
    queryFn: () => getMediaByIds(mediaIds),
    enabled: mediaIds.length > 0,
    placeholderData: keepPreviousData,
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

  const onActiveText = useCallback((editor: Editor, active: boolean) => {
    setActiveText((current) =>
      active ? editor : current === editor ? null : current
    )
  }, [])

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

  const selectAndShow = (id: string) => {
    setSelectedId(id)
    requestAnimationFrame(() => focusBlockSoon(id, 0))
  }

  const onShift = (id: string, offset: -1 | 1) => {
    const next = shiftBlock(draft, id, offset)
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
    focusSoon(() =>
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
    onUpdateBlock<ImageBlock>(blockId, (block) => ({
      ...block,
      mediaId: media.id,
    }))
  }

  const openPicker = useCallback((blockId: string) => setPickerFor(blockId), [])

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
    }),
    [
      editable,
      selectedId,
      onUpdateBlock,
      onActiveText,
      mediaFor,
      openPicker,
      addToBox,
    ]
  )

  // --- Copier mon texte, quitter -----------------------------------------------------------

  const lostOrStopped = lock.state.lost || autosave.state.status === "stopped"
  // Après une perte de main : ce qui n'était pas enregistré (encore à l'écran, ou mis de côté
  // quand le brouillon a été relu).
  const canCopy =
    stash !== null || (lostOrStopped && saving.unsavedValue !== null)

  const onCopy = async () => {
    const value = saving.unsavedValue ?? stash ?? draft
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
  const sectionTitle = texts.sections[section].title

  return (
    <div className="flex h-svh flex-col bg-muted/40">
      <title>{`${title.trim() || texts.editor.untitled} — ${texts.app.name}`}</title>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
        <BackLink section={section} />
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={outlineOpen ? "secondary" : "ghost"}
          size="sm"
          aria-expanded={outlineOpen}
          aria-controls="editeur-plan"
          aria-label={
            outlineOpen ? texts.editor.outline.hide : texts.editor.outline.show
          }
          onClick={() => setOutlineOpen((open) => !open)}
        >
          <ListTree />
          {texts.editor.outline.toggle}
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium" aria-hidden>
          {title.trim() || texts.editor.untitled}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {sectionTitle}
          </span>
        </p>
        <SaveStatus
          state={autosave.state}
          visible={phase === "mine" || autosave.state.unsaved}
        />
        <AddBlockMenu
          id={ADD_BLOCK_ID}
          disabled={!editable}
          onAdd={(type) => addBlock(type)}
        />
      </header>

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <LockBanner
        lock={lock.state}
        holderIsMe={lock.state.holderId === lock.myId}
        autosave={autosave.state}
        canCopy={canCopy}
        onTake={take}
        onCopy={() => void onCopy()}
        onReload={reload}
        onDismissCopy={() => setStash(null)}
      />

      <div className="flex min-h-0 flex-1">
        {outlineOpen && (
          <aside
            id="editeur-plan"
            className="w-60 shrink-0 border-r bg-background"
          >
            <OutlinePanel
              draft={draft}
              selectedId={selectedId}
              onSelect={selectAndShow}
            />
          </aside>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 flex justify-center bg-muted/40 px-6 py-3 backdrop-blur">
            <FormatToolbar editor={activeText} editable={editable} />
          </div>
          {nearLimit && (
            <p
              role="status"
              className="mx-auto mb-3 max-w-[390px] text-sm text-amber-700 dark:text-amber-400"
            >
              {texts.editor.save.nearLimit}
            </p>
          )}
          {autosave.state.status === "failed" && autosave.state.error && (
            <p
              role="alert"
              className="mx-auto mb-3 max-w-[390px] text-sm text-destructive"
            >
              {autosave.state.error.message} {autosave.state.error.detail}
            </p>
          )}
          <div className="flex justify-center px-6 pb-16">
            <div
              className={cn(
                "blocks-phone rounded-[2rem] border shadow-sm",
                !editable && "cursor-default"
              )}
              data-editable={editable || undefined}
            >
              <textarea
                ref={titleRef}
                rows={1}
                className="blocks-title"
                value={title}
                maxLength={TITLE_MAX}
                readOnly={!editable}
                placeholder={texts.editor.title.placeholder}
                aria-label={texts.editor.title.label}
                onChange={onTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault()
                }}
              />
              <BlocksEditorContext value={blocksValue}>
                <BlockCanvas key={viewKey} draft={draft} onChange={setDraft} />
              </BlocksEditorContext>
              {draft.blocks.length === 0 && (
                <Empty className="border border-dashed font-sans">
                  <EmptyHeader>
                    <EmptyTitle>{texts.editor.emptyPage.title}</EmptyTitle>
                    <EmptyDescription>
                      {texts.editor.emptyPage.description}
                    </EmptyDescription>
                  </EmptyHeader>
                  {editable && (
                    <div className="flex gap-2">
                      {insertableBlocks.map((definition) => (
                        <Button
                          key={definition.type}
                          variant="outline"
                          size="sm"
                          onClick={() => addBlock(definition.type)}
                        >
                          <definition.icon />
                          {definition.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </Empty>
              )}
              {editable && draft.blocks.length > 0 && (
                <div className="mt-6 flex justify-center font-sans">
                  <AddBlockMenu
                    variant="ghost"
                    onAdd={(type) => addBlock(type, undefined)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        <aside className="w-72 shrink-0 border-l bg-background">
          <BlockSettings
            draft={draft}
            selectedId={selectedId}
            editable={editable}
            mediaFor={mediaFor}
            onUpdate={onUpdateBlock}
            onShift={onShift}
            onRemove={onRemove}
            onChooseImage={openPicker}
          />
        </aside>
      </div>

      <MediaPicker
        open={pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) setPickerFor(null)
        }}
        onChoose={onChooseImage}
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

/** « Ajouter un bloc » : Texte, Image, Encadré (après le bloc choisi, ou à la fin). */
function AddBlockMenu({
  onAdd,
  id,
  disabled = false,
  variant = "default",
}: {
  onAdd: (type: InsertableType) => void
  id?: string
  disabled?: boolean
  variant?: "default" | "ghost"
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

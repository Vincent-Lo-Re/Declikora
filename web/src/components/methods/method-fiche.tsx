import { useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router"
import { toast } from "sonner"

import { BlocksEditorContext } from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import { TITLE_MAX } from "@/blocks/draft"
import { ArticlePanel } from "@/components/editor/article-panel"
import { ColumnHeader } from "@/components/editor/column-header"
import { ReadView } from "@/components/editor/feed-preview"
import { HistorySheet } from "@/components/editor/history-sheet"
import { MediaPicker } from "@/components/editor/media-picker"
import { CoverPreview } from "@/components/editor/presentation"
import {
  PublicationBadge,
  PublicationDialogs,
  PublishButton,
  ScheduleBanner,
} from "@/components/editor/publication"
import { useBlockEditing } from "@/components/editor/use-block-editing"
import { usePartDraft } from "@/components/editor/use-part-draft"
import {
  usePublication,
  type MethodPublication,
} from "@/components/editor/use-publication"
import { useRevert } from "@/components/editor/use-revert"
import { MethodChangesCard } from "@/components/methods/method-changes"
import { useMethodPage } from "@/components/methods/method-page-context"
import { MethodAppPlan } from "@/components/methods/method-preview"
import { useMethodPart } from "@/components/methods/use-method-part"
import { buttonVariants } from "@/components/ui/button"
import { contentKeys, type Content } from "@/lib/contents/api"
import { exerciseCount, lessonCount } from "@/lib/contents/outline"
import { publishChecks, readyItems } from "@/lib/contents/requirements"
import { focusOnceShown } from "@/lib/editor/block-focus"
import { contentProfile } from "@/lib/editor/profile"
import { CONTENT_TITLE_ID } from "@/lib/editor/ready-targets"
import { methodPreviewRead, REREAD_MS } from "@/lib/reads"
import { RETURN_STATE, returnAddress } from "@/lib/scroll-memory"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const MethodIcon = sections.methods.icon

// Rien à ajouter dans une section : la fiche n'a pas de blocs ([D4]).
const noBox = () => {}

/**
 * La fiche d'une méthode, en tête de sa page (ADMIN § 4, « Une méthode sur une seule page ») :
 * dans le téléphone, son image et son titre, écrits sur place. Quand c'est la partie en cours, sa
 * colonne de droite : « Prêt à publier ? », « Dans la liste des Méthodes », le niveau d'accès et
 * « Ce qui changera dans l'app ». Toujours, en bas de la colonne de droite, l'état de la méthode
 * et « Publier » (la méthode se publie d'un seul geste, [D29]), et au-dessus du téléphone le
 * bandeau de sa programmation. En Lecture, son écran comme dans l'app : la fiche et le plan.
 */
export const MethodFiche = memo(function MethodFiche({
  initial,
}: {
  initial: Content
}) {
  const page = useMethodPage()
  const queryClient = useQueryClient()
  const id = initial.id
  const current = page.currentId === id
  const [profile] = useState(() => contentProfile("method"))
  // Le moment (dans ce navigateur) où la fiche a été enregistrée pour la dernière fois : elle
  // est alors « modifiée depuis la publication » jusqu'à la relecture des changements.
  const [ficheSavedAt, setFicheSavedAt] = useState(0)

  const sync = usePartDraft({
    initial,
    session: page.session,
    lock: { ...page.lock, serverRev: page.partRev(id) },
    resumeSignal: page.resumeSignal,
    afterSave: () => {
      page.afterPartSave()
      void queryClient.invalidateQueries({
        queryKey: contentKeys.list("method"),
      })
      setFicheSavedAt(Date.now())
    },
  })
  const { draft, setDraft, settings, setSettings, editable } = sync
  useMethodPart(id, sync, CONTENT_TITLE_ID)

  // Son titre et son niveau d'accès, tels qu'ils sont à l'écran, pour ses éléments.
  const { reportFiche } = page
  useEffect(() => {
    reportFiche({
      title: draft.title,
      access: {
        accessChosen: settings.accessChosen,
        accessLevelId: settings.accessLevelId,
      },
    })
  }, [reportFiche, draft.title, settings.accessChosen, settings.accessLevelId])

  // L'image de présentation (la fiche n'a pas de blocs).
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
    emptyFocus: () => null,
    onAddInBox: noBox,
  })
  const { mediaFor } = editing
  const cover = mediaFor(draft.cover?.mediaId ?? null)

  // --- Publier --------------------------------------------------------------------------------

  // Ce qui changera dans l'app si l'on publie la méthode : relu régulièrement (et après chaque
  // enregistrement d'une partie).
  const preview = useQuery({
    ...methodPreviewRead(id),
    staleTime: REREAD_MS,
    refetchInterval: 30_000,
  })
  const bridge: MethodPublication = {
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
  const checks = useMemo(
    () => publishChecks("method", draft, mediaFor),
    [draft, mediaFor]
  )
  const pub = usePublication({
    contentId: id,
    kind: "method",
    method: bridge,
    draftRev: Math.max(
      sync.autosave.rev,
      page.partRev(id) ?? 0,
      sync.loadedRev
    ),
    unsaved: page.anyUnsaved,
    editable,
    settings,
    levels: page.levels.data,
    levelsFailed: page.levels.failed,
    retryLevels: page.levels.retry,
    // Toute la méthode part : chaque partie termine d'abord son enregistrement.
    prepare: async () => {
      if (!(await page.flushAll())) {
        toast.error(texts.publication.needsSaved)
        return null
      }
      return sync.prepare()
    },
    applySettings: sync.applySettings,
    takeLock: () => page.take(true),
    checks,
    // Le titre : le curseur y va ; l'image : son choix s'ouvre.
    onFix: (key) => {
      page.setCurrent(id)
      if (key === "title") {
        focusOnceShown(() => document.getElementById(CONTENT_TITLE_ID))
      } else if (key === "cover") {
        editing.openPresentationPicker("cover")
      }
    },
  })
  const phase = page.lock.phase
  const publishDisabled = phase === "taking" || phase === "error"

  // --- L'historique --------------------------------------------------------------------------

  const onRevert = useRevert({
    contentId: id,
    session: page.session,
    prepare: sync.prepare,
    reload: sync.reload,
    notifyLost: page.lock.notifyLost,
    onDone: () => page.setHistoryFor(null),
  })

  // --- Le titre, la taille du plan -----------------------------------------------------------

  const title = draft.title
  const untitled = texts.common.untitled
  const titleRef = useAutoHeight(title)
  const onTitle = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = singleLine(event.target.value).slice(0, TITLE_MAX)
    setDraft((currentDraft) => ({ ...currentDraft, title: value }))
  }
  const tree = page.tree
  const planCount = tree
    ? texts.methods.outline.count(
        tree.length,
        lessonCount(tree),
        exerciseCount(tree)
      )
    : null
  const reserved = settings.accessChosen && settings.accessLevelId !== null

  // --- Dans le téléphone ---------------------------------------------------------------------

  let phone: ReactNode = null
  if (page.reading) {
    // En Lecture : l'écran de la méthode, sa fiche et son plan, comme dans l'app.
    if (current) {
      phone = (
        <BlocksEditorContext value={editing.readOnlyBlocks}>
          <ReadView
            draft={draft}
            title={title.trim() || untitled}
            cover={cover}
            audio={null}
            meta={planCount}
            locked={false}
            resolve={editing.linked.resolveLinked}
          >
            {tree && (
              <MethodAppPlan
                tree={tree}
                reserved={reserved}
                subscriber={page.preview.reader === "subscriber"}
              />
            )}
          </ReadView>
        </BlocksEditorContext>
      )
    }
  } else {
    phone = (
      <section
        data-part={id}
        data-part-kind="method"
        aria-label={texts.methods.page.fiche}
        className={cn(
          "blocks-part blocks-part-fiche",
          !editable && "cursor-default"
        )}
        onFocusCapture={() => page.setCurrent(id)}
        onPointerDownCapture={() => page.setCurrent(id)}
      >
        <CoverPreview
          media={cover}
          editable={editable}
          onChoose={() => editing.openPresentationPicker("cover")}
          onSelect={() => undefined}
        />
        <textarea
          ref={titleRef}
          id={CONTENT_TITLE_ID}
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
        {planCount && <p className="blocks-meta">{planCount}</p>}
      </section>
    )
  }

  const { slots } = page
  return (
    <>
      {phone}
      {current &&
        slots.right &&
        createPortal(
          <>
            <ColumnHeader
              icon={MethodIcon}
              title={title.trim() || untitled}
              titleId={`colonne-${id}`}
              large
            />
            <section
              aria-label={texts.methods.page.options(texts.methods.page.fiche)}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
            >
              <ArticlePanel
                kind="method"
                contentId={id}
                draft={draft}
                editable={editable}
                reading={page.reading}
                settings={settings}
                onSettingsChange={setSettings}
                refusedSlug={null}
                levels={page.levels.data}
                levelsFailed={page.levels.failed}
                retryLevels={page.levels.retry}
                live={pub.publication?.live ?? null}
                categories={null}
                cover={cover}
                audio={null}
                ready={readyItems("method", checks, settings)}
                warnings={{ count: 0, onShow: () => undefined }}
                onChooseCover={() => editing.openPresentationPicker("cover")}
                onRemoveCover={() => editing.removePresentationFile("cover")}
                onChooseAudio={() => undefined}
                onRemoveAudio={() => undefined}
              >
                <MethodChangesCard method={bridge} />
              </ArticlePanel>
            </section>
          </>,
          slots.right
        )}
      {slots.footer &&
        createPortal(
          <>
            <PublicationBadge pub={pub} />
            <span className="flex-1" />
            <PublishButton
              pub={pub}
              disabled={publishDisabled}
              alwaysPublishable={bridge.pending === undefined}
              onHistory={() => page.setHistoryFor(id)}
            />
          </>,
          slots.footer
        )}
      {slots.notices &&
        createPortal(
          <ScheduleBanner
            pub={pub}
            leave={
              <Link
                to={returnAddress(sections.methods.path)}
                state={RETURN_STATE}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {texts.publication.banner.leave}
              </Link>
            }
          />,
          slots.notices
        )}
      <PublicationDialogs pub={pub} />
      <MediaPicker
        kind="image"
        open={editing.pickerFor !== null}
        onOpenChange={(open) => {
          if (!open) editing.setPickerFor(null)
        }}
        onChoose={editing.onChooseImage}
        finalFocus={editing.pickerFinalFocus}
      />
      {page.historyFor === id && (
        <HistorySheet
          open
          onOpenChange={(open) => {
            if (!open) page.setHistoryFor(null)
          }}
          contentId={id}
          kind="method"
          liveVersionId={pub.publication?.live?.id ?? null}
          canRevert={editable}
          onRevert={onRevert}
        />
      )}
    </>
  )
})

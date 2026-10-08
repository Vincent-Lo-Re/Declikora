import { useQueryClient } from "@tanstack/react-query"
import type { Editor } from "@tiptap/react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { toast } from "sonner"

import type { BlocksEditorValue } from "@/blocks/components/context"
import {
  blocksOf,
  findBlock,
  flattenBlocks,
  insertBlock,
  insertionPoint,
  moveBlock,
  removeBlock,
  shiftBlock,
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
import { ROOT, type Block, type Draft, type ImageBlock } from "@/blocks/types"
import { useDraftMedia } from "@/components/editor/use-draft-media"
import { useLinkedTemplates } from "@/components/editor/use-linked-templates"
import { useSaveAsTemplate } from "@/components/editor/use-save-as-template"
import { useTemplateUses } from "@/components/templates/use-template-uses"
import {
  templateKeys,
  type TemplateItem,
  type TemplateSort,
} from "@/lib/contents/templates"
import { recordTemplateCopy } from "@/lib/contents/template-copies"
import {
  blockAnchor,
  focusBlockSoon,
  scrollToReadBlock,
} from "@/lib/editor/block-focus"
import type { LibraryDrag } from "@/lib/editor/library-drag"
import { liveBoxTarget } from "@/lib/editor/library-target"
import { blockWarning, duplicateBlock } from "@/lib/editor/outline"
import type { ContentProfile } from "@/lib/editor/profile"
import { focusSoon } from "@/lib/focus"
import type { Media } from "@/lib/media/constants"
import { texts } from "@/texts"

// Le choix d'un fichier pour la présentation (et non pour un bloc Image, dont l'id est un uuid).
const COVER_PICKER = "presentation:cover"
const AUDIO_PICKER = "presentation:audio"

/** « Choisir… » ou « Changer… » de l'image de présentation ou de l'audio, dans le panneau. */
function presentationChooseButton(key: "cover" | "audio"): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-presentation-choose="${key}"]`
  )
}

/**
 * L'édition des blocs d'un brouillon dans l'éditeur du Fil : le bloc choisi, le texte qui a le curseur, le survol partagé avec le plan,
 * l'ajout, le rangement, la suppression (avec « Annuler »), les images (blocs, présentation),
 * les blocs partagés et « Enregistrer comme modèle ». emptyFocus : où va le focus quand plus
 * aucun bloc ne reste ; onAddInBox : « Ajouter dans la section » (ouvre les Blocs).
 */
export function useBlockEditing({
  contentId,
  draft,
  setDraft,
  editable,
  reading,
  profile,
  templateSort,
  prepare,
  announce,
  emptyFocus,
  onAddInBox,
}: {
  contentId: string
  draft: Draft
  setDraft: Dispatch<SetStateAction<Draft>>
  editable: boolean
  reading: boolean
  profile: ContentProfile
  templateSort: TemplateSort | null
  prepare: () => Promise<number | null>
  announce: (message: string) => void
  emptyFocus: () => HTMLElement | null
  onAddInBox: (boxId: string) => void
}) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Après « Ajouter dans la section », la section où les Blocs ajouteront ; valable tant qu'elle
  // est le bloc choisi (liveBoxTarget).
  const [boxTarget, setBoxTarget] = useState<string | null>(null)
  const targetBox = liveBoxTarget(draft, boxTarget, selectedId)
  // Le texte qui a eu le curseur en dernier, avec son bloc.
  const [activeText, setActiveText] = useState<{
    blockId: string
    editor: Editor
  } | null>(null)
  // Le bloc survolé, dans le plan ou dans l'aperçu (montré dans les deux).
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

  // --- Blocs liés (blocs partagés) et fichiers ----------------------------------------------

  const linked = useLinkedTemplates(draft)
  const { linkedBlocks, templateFor, templateName, rememberShared } = linked
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
      announce(
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

  // Ce qu'il faut vérifier dans un bloc (une image sans fichier…), et les blocs qui ont un point
  // à vérifier (plan, « Prêt à publier ? »).
  const warningOf = useCallback(
    (block: Block) => blockWarning(block, mediaFor, templateFor),
    [mediaFor, templateFor]
  )
  const warnedIds = flattenBlocks(draft)
    .filter(({ block }) => warningOf(block) !== null)
    .map(({ block }) => block.id)

  // « Sortir de la section » (plan) : le bloc se place juste après elle (pas dans un bloc
  // partagé, qui n'a qu'un bloc au premier niveau).
  const onLeaveBox = (id: string) => {
    if (!canAddRootBlock(draft, templateSort)) return
    const place = findBlock(draft, id)
    const box = place && findBlock(draft, place.container)
    const next = box && moveBlock(draft, id, ROOT, box.index + 1)
    if (!place || !next) return
    setDraft(next)
    setSelectedId(id)
    announce(
      texts.editor.outline.left(
        blockLabel(place.block, templateName(place.block))
      )
    )
  }

  // « Dupliquer » (plan) : la copie juste après, choisie (au premier niveau, s'il a de la place).
  const onDuplicate = (id: string) => {
    const place = findBlock(draft, id)
    const result = duplicateBlock(draft, id)
    if (!place || !result) return
    if (place.container === ROOT && !canAddRootBlock(draft, templateSort))
      return
    setDraft(result.draft)
    setSelectedId(result.id)
    announce(
      texts.editor.outline.duplicated(
        blockLabel(place.block, templateName(place.block))
      )
    )
  }

  const onRemove = (id: string) => {
    const place = findBlock(draft, id)
    if (!place) return
    // Le focus va au bloc voisin (le suivant, sinon le précédent, sinon la section qui le
    // contenait), ou à « Ajouter un bloc » s'il n'en reste aucun (emptyFocus).
    const siblings = blocksOf(draft, place.container)
    const neighbor =
      siblings[place.index + 1]?.id ??
      siblings[place.index - 1]?.id ??
      (place.container === ROOT ? null : place.container)
    setDraft((current) => removeBlock(current, id))
    setSelectedId(neighbor)
    // Une fois fermé le menu ⋮ du plan, s'il a servi (il rendrait sinon le focus à son bouton,
    // parti avec la ligne).
    focusSoon(() => (neighbor ? blockAnchor(neighbor) : emptyFocus()))
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
      const linkedOne = draft.blocks.find((block) => block.id === blockId)
      if (!linkedOne || linkedOne.type !== "linked") return
      const state = templateFor(linkedOne.templateId)
      if (state.state !== "ready") return
      const name = state.name.trim() || texts.templates.list.untitled
      setDraft((current) => detachLinked(current, blockId, state.block))
      setSelectedId(blockId)
      focusSoon(() => blockAnchor(blockId))
      undoToast(texts.templates.linked.detached(name), () =>
        setDraft((current) => ({
          ...current,
          blocks: current.blocks.map((block) =>
            block.id === blockId ? linkedOne : block
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
    // Une mise en forme est copiée sans lien : notée, pour la colonne « État » des Modèles de bloc.
    else void recordTemplateCopy(template.id, contentId)
    setDraft(result.draft)
    setSelectedId(result.firstId)
    // Le plan est caché sous les Blocs : le bloc vient sous les yeux dans le téléphone, le
    // curseur dans son texte s'il en a un (comme un bloc ajouté des Blocs).
    requestAnimationFrame(() => focusBlockSoon(result.firstId))
    const name = template.title.trim() || texts.templates.list.untitled
    toast.success(texts.editor.library.mine.added(name))
  }

  // Un bloc des Blocs (ou de « Mes blocs ») glissé dans le téléphone, à la place montrée par un
  // trait (index au premier niveau).
  const dropFromLibrary = (drag: LibraryDrag, index: number) => {
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

  // La Lecture : les mêmes fichiers et modèles, rien de modifiable.
  const readOnlyBlocks = useMemo<BlocksEditorValue>(
    () => ({
      ...blocksValue,
      editable: false,
      onAddInBox: undefined,
    }),
    [blocksValue]
  )

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

  // Un bloc partagé garde son bloc tant qu'un brouillon l'utilise ([D11]).
  const isShared = templateSort === "shared"
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

  // Les réglages du bloc choisi (BlockSettings), sauf sa fermeture et « Enregistrer comme
  // modèle », propres à chaque éditeur.
  const blockSettings = {
    draft,
    selectedId,
    editable,
    mediaFor,
    onUpdate: onUpdateBlock,
    onShift,
    onRemove,
    onChooseImage: openPicker,
    templateFor,
    onDetach: detachBlock,
    removeBlocked,
    onDuplicate,
    rootLimit,
  }

  return {
    selectedId,
    setSelectedId,
    boxTarget,
    setBoxTarget,
    targetBox,
    hoveredId,
    setHoveredId,
    toolbarEditor,
    pickerFor,
    setPickerFor,
    isAudioPicker: pickerFor === AUDIO_PICKER,
    linked,
    mediaFor,
    addBlock,
    selectAndShow,
    onShift,
    warningOf,
    warnedIds,
    onLeaveBox,
    onDuplicate,
    onRemove,
    onUpdateBlock,
    onChooseImage,
    removePresentationFile,
    openPresentationPicker,
    openPicker,
    pickerFinalFocus,
    detachBlock,
    onInsertTemplate,
    dropFromLibrary,
    blocksValue,
    readOnlyBlocks,
    saveAs,
    keepsBlock,
    canAddRoot,
    blockSettings,
  }
}

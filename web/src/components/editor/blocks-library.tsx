import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import { cn } from "cn"
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Copy,
  ExternalLink,
  ImageIcon,
  SquareDashed,
  X,
} from "lucide-react"
import { useId, useMemo, useRef, useState, type DragEvent } from "react"
import { Link } from "react-router"

import type { BlockMedia } from "@/blocks/components/context"
import { MediaImage } from "@/blocks/components/media-state"
import { StaticBlock } from "@/blocks/components/static-block"
import { insertableBlocks, type InsertableType } from "@/blocks/registry"
import { templateInsertable } from "@/blocks/templates"
import type { Block } from "@/blocks/types"
import { LoadState } from "@/components/load-state"
import { usePreviewUrls } from "@/components/media/use-preview-urls"
import { SearchInput } from "@/components/search-input"
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Empty, EmptyDescription } from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  encodeLibraryDrag,
  LIBRARY_DRAG_TYPE,
  type LibraryDrag,
} from "@/lib/editor/library-drag"
import { contentKeys, getMediaByIds } from "@/lib/contents/api"
import { focusSoon } from "@/lib/focus"
import {
  countUses,
  savedBlocks,
  savedImageIds,
  type SavedFilter,
} from "@/lib/contents/saved-blocks"
import {
  listTemplateUses,
  listTemplates,
  templateKeys,
  type TemplateItem,
} from "@/lib/contents/templates"
import type { Media } from "@/lib/media/constants"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.library
const mine = labels.mine

const filters: SavedFilter[] = ["all", "style", "shared"]

// L'image prête d'un bloc de l'aperçu réduit, ou null (son icône à la place).
type ImageFor = (
  mediaId: string | null
) => Extract<BlockMedia, { state: "ready" }> | null

/** Les images des blocs enregistrés montrés : leurs fichiers, puis leurs adresses d'aperçu. */
function useSavedImages(templates: TemplateItem[]): ImageFor {
  const ids = savedImageIds(templates)
  const files = useQuery({
    queryKey: contentKeys.media(ids),
    queryFn: () => getMediaByIds(ids),
    enabled: ids.length > 0,
  })
  const ready = useMemo(
    () =>
      (files.data ?? []).filter(
        (media) => media.status === "ready" && !media.deleted_at
      ),
    [files.data]
  )
  const urlFor = usePreviewUrls(ready)
  return (mediaId) => {
    const media: Media | undefined = ready.find((item) => item.id === mediaId)
    const url = media ? urlFor(media) : undefined
    return media && url ? { state: "ready", media, url } : null
  }
}

/** Glisser un bloc vers l'aperçu (qui le dépose à la place montrée). */
function startDrag(event: DragEvent, drag: LibraryDrag) {
  event.dataTransfer.setData(LIBRARY_DRAG_TYPE, encodeLibraryDrag(drag))
  event.dataTransfer.effectAllowed = "copy"
}

// Le premier bloc des Blocs : il reçoit le curseur quand un « Ajouter » les ouvre.
export const LIBRARY_FIRST_ID = "blocs-premier"

/**
 * Les Blocs de l'éditeur du Fil (ADMIN § 4), en glissière par-dessus le Plan : Texte, Image et
 * Section, puis « Mes blocs » (mises en forme et blocs partagés), qui glisse à son tour
 * par-dessus. Un clic ajoute le bloc sous le bloc choisi (ou à la fin de la section visée), ou à
 * la fin.
 */
export function BlocksLibrary({
  editable,
  canAdd,
  inBox,
  onCancelTarget,
  onAdd,
  onInsert,
  open,
  onOpenChange,
}: {
  editable: boolean
  // Faux : on ne peut plus rien ajouter au premier niveau.
  canAdd: boolean
  // Après « Ajouter dans la section » : un bandeau le dit, et seuls Texte et Image y vont.
  inBox: boolean
  onCancelTarget: () => void
  onAdd: (type: InsertableType) => void
  // « Mes blocs » ; absent dans un modèle de bloc (la base y refuse un bloc partagé).
  onInsert?: (template: TemplateItem) => void
  // Le panneau « Mes blocs », par-dessus les Blocs.
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const opener = useRef<HTMLButtonElement>(null)
  const templates = useQuery({
    queryKey: templateKeys.list,
    queryFn: listTemplates,
    enabled: onInsert !== undefined,
  })
  const count = templates.data
    ? savedBlocks(templates.data, "all", "").length
    : null
  const disabled = !editable || (!canAdd && !inBox)

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="h-full space-y-4 overflow-y-auto px-4 py-3"
        // Caché (et hors du clavier) pendant que « Mes blocs » le recouvre.
        inert={open}
      >
        {inBox && (
          // L'Alert de shadcn (un état, pas une erreur : annoncé sans interrompre).
          <Alert role="status">
            <SquareDashed aria-hidden className="text-warning" />
            <AlertTitle>{labels.target.box}</AlertTitle>
            <AlertAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={labels.target.cancel}
                      onClick={onCancelTarget}
                    />
                  }
                >
                  <X />
                </TooltipTrigger>
                <TooltipContent>{labels.target.cancel}</TooltipContent>
              </Tooltip>
            </AlertAction>
          </Alert>
        )}
        {/* Dans une section, le bandeau dit déjà où va le bloc (et il ne se glisse pas). */}
        {!inBox && (
          <p className="text-sm text-muted-foreground">{labels.hint}</p>
        )}
        <section aria-labelledby="blocs-de-base" className="space-y-2">
          <h3 id="blocs-de-base" className="text-sm font-medium">
            {labels.basics}
          </h3>
          <ul className="grid grid-cols-3 gap-2">
            {insertableBlocks.map((definition, index) => (
              <li key={definition.type}>
                <Button
                  variant="outline"
                  id={index === 0 ? LIBRARY_FIRST_ID : undefined}
                  disabled={disabled || (inBox && !definition.allowedInBox)}
                  draggable={!disabled && !inBox}
                  onDragStart={(event) =>
                    startDrag(event, { kind: "block", type: definition.type })
                  }
                  aria-label={labels.addLabel(definition.label)}
                  // Une tuile : l'icône sur son nom, en petit (trois par ligne).
                  className="h-auto w-full flex-col gap-1.5 px-1 py-3 text-xs"
                  onClick={() => onAdd(definition.type)}
                >
                  <definition.icon aria-hidden className="size-5" />
                  {definition.label}
                </Button>
              </li>
            ))}
          </ul>
        </section>
        {onInsert && (
          // L'Item de shadcn, en contour, rendu en bouton.
          <Item
            variant="outline"
            className="text-left enabled:hover:bg-muted disabled:opacity-50"
            render={
              <button
                ref={opener}
                type="button"
                aria-expanded={open}
                aria-controls="mes-blocs"
                // Dans une section, pas de bloc enregistré.
                disabled={inBox}
                onClick={() => onOpenChange(true)}
              />
            }
          >
            <ItemMedia variant="icon" aria-hidden>
              <Bookmark />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{mine.title}</ItemTitle>
              {count !== null && (
                <ItemDescription>{mine.count(count)}</ItemDescription>
              )}
            </ItemContent>
            <ItemActions aria-hidden className="text-muted-foreground">
              <ChevronRight className="size-4" />
            </ItemActions>
          </Item>
        )}
      </div>
      {open && onInsert && (
        <SavedBlocksPanel
          templates={templates}
          disabled={disabled}
          onBack={() => {
            onOpenChange(false)
            focusSoon(() => opener.current)
          }}
          onInsert={onInsert}
        />
      )}
    </div>
  )
}

/** Le panneau « Mes blocs », par-dessus la colonne : recherche, filtres, aperçu de chaque bloc. */
function SavedBlocksPanel({
  templates,
  disabled,
  onBack,
  onInsert,
}: {
  templates: UseQueryResult<TemplateItem[]>
  disabled: boolean
  onBack: () => void
  onInsert: (template: TemplateItem) => void
}) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<SavedFilter>("all")
  // Le nombre de contenus qui citent chaque bloc partagé.
  const uses = useQuery({
    queryKey: templateKeys.allUses,
    queryFn: () => listTemplateUses(),
  })
  const counts = uses.data ? countUses(uses.data) : null
  const shown = templates.data
    ? savedBlocks(templates.data, filter, search)
    : []
  const none = templates.data
    ? savedBlocks(templates.data, "all", "").length === 0
    : false
  const imageFor = useSavedImages(shown)

  return (
    <section
      id="mes-blocs"
      aria-labelledby="mes-blocs-titre"
      className="absolute inset-0 flex flex-col bg-background motion-safe:animate-in motion-safe:slide-in-from-left-4"
      onKeyDown={(event) => {
        // Échap referme « Mes blocs » seulement, pas la glissière des Blocs.
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault()
          onBack()
        }
      }}
    >
      <div className="flex items-center gap-1 px-2.5 pt-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={mine.back}
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <h3 id="mes-blocs-titre" className="text-sm font-medium">
          {mine.title}
        </h3>
      </div>
      <div className="space-y-2 px-4 pt-3 pb-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          label={mine.searchLabel}
          placeholder={mine.search}
          autoFocus
        />
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label={mine.filters.label}
          value={[filter]}
          onValueChange={(value: string[]) => {
            const next = value[0]
            if (next === "all" || next === "style" || next === "shared") {
              setFilter(next)
            }
          }}
        >
          {filters.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {mine.filters[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {templates.data === undefined ? (
          <LoadState
            query={templates}
            failed={texts.templates.insert.loadFailed}
            rowClassName="h-24 w-full"
          />
        ) : none ? (
          <Empty className="p-4">
            <EmptyDescription>{mine.empty}</EmptyDescription>
          </Empty>
        ) : shown.length === 0 ? (
          <Empty role="status" className="p-4">
            <EmptyDescription>{mine.noResult}</EmptyDescription>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {shown.map((template) => (
              <li key={template.id}>
                <SavedBlock
                  template={template}
                  uses={counts?.get(template.id) ?? 0}
                  imageFor={imageFor}
                  disabled={disabled}
                  onInsert={() => onInsert(template)}
                />
              </li>
            ))}
          </ul>
        )}
        {/* Dans un nouvel onglet, comme la fiche d'un fichier : l'éditeur reste ouvert. */}
        <Link
          to={sections.templates.path}
          target="_blank"
          rel="noopener"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mt-2"
          )}
        >
          <sections.templates.icon />
          {mine.manage}
          <ExternalLink aria-hidden />
          <span className="sr-only">
            {" "}
            {texts.editor.presentation.openFileHint}
          </span>
        </Link>
      </div>
    </section>
  )
}

/** Un bloc enregistré : un aperçu réduit, son nom, et ce qu'il devient une fois ajouté. */
function SavedBlock({
  template,
  uses,
  imageFor,
  disabled,
  onInsert,
}: {
  template: TemplateItem
  uses: number
  imageFor: ImageFor
  disabled: boolean
  onInsert: () => void
}) {
  const name = template.title.trim() || texts.templates.list.untitled
  const describedBy = useId()
  const empty = templateInsertable(template) === "empty"
  const shared = template.sort === "shared"
  // Un bloc partagé : l'icône de Modèles de bloc, dans le menu.
  const Icon = shared ? sections.templates.icon : Copy
  return (
    // L'Item de shadcn, en contour, rendu en bouton : l'aperçu en tête, puis le nom.
    <Item
      variant="outline"
      className="text-left enabled:hover:bg-muted disabled:opacity-50"
      render={
        <button
          type="button"
          disabled={disabled || empty}
          draggable={!disabled && !empty}
          onDragStart={(event) =>
            startDrag(event, { kind: "template", id: template.id })
          }
          aria-label={mine.insertLabel(name)}
          // Ce qu'il devient une fois ajouté (copie, bloc partagé, vide) : lu après son nom.
          aria-describedby={describedBy}
          onClick={onInsert}
        />
      }
    >
      <ItemHeader aria-hidden className="blocks-mini items-stretch">
        {template.draft.blocks.map((block) => (
          <MiniBlock key={block.id} block={block} imageFor={imageFor} />
        ))}
      </ItemHeader>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full min-w-0">
          <Icon aria-hidden className="size-4 shrink-0" />
          <span className="truncate">{name}</span>
        </ItemTitle>
        <ItemDescription id={describedBy}>
          {empty
            ? texts.templates.insert.emptyTemplate
            : shared
              ? mine.shared(uses)
              : mine.style}
        </ItemDescription>
      </ItemContent>
    </Item>
  )
}

/**
 * Un bloc dans l'aperçu réduit : le texte tel qu'il est (sans éditeur), une image comme dans
 * l'aperçu (son icône tant qu'elle n'est pas lue), une section avec ses blocs.
 */
function MiniBlock({ block, imageFor }: { block: Block; imageFor: ImageFor }) {
  switch (block.type) {
    case "text":
      return <StaticBlock block={block} />
    case "image": {
      const media = imageFor(block.mediaId)
      return media ? (
        <figure className="blocks-image">
          <MediaImage media={media} alt="" naturalSvg />
        </figure>
      ) : (
        <div className="blocks-image-placeholder">
          <ImageIcon className="size-6" />
        </div>
      )
    }
    case "box":
      return (
        <div className="blocks-box" data-look={block.look}>
          <div className="blocks-box-list">
            {block.blocks.map((child) => (
              <MiniBlock key={child.id} block={child} imageFor={imageFor} />
            ))}
          </div>
        </div>
      )
    case "linked":
      return null
  }
}

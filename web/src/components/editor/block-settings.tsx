import { cn } from "cn"
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Copy,
  ImageIcon,
  SquarePen,
  Trash2,
  Unlink,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import {
  templateNameOf,
  type BlockMedia,
  type LinkedTemplateState,
} from "@/blocks/components/context"
import {
  ALT_MAX,
  canShift,
  findBlock,
  shiftLeavesBox,
  type BlockPlace,
} from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import { blockRegistry } from "@/blocks/registry"
import {
  ROOT,
  type Block,
  type BoxBlock,
  type Draft,
  type ImageBlock,
} from "@/blocks/types"
import { LoadState } from "@/components/load-state"
import { ColumnHeader } from "@/components/editor/column-header"
import { MediaFileLink } from "@/components/media/media-file-link"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { editorPath, sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.settings

type Props = {
  draft: Draft
  selectedId: string | null
  editable: boolean
  mediaFor: (mediaId: string | null) => BlockMedia
  onUpdate: <T extends Block>(id: string, update: (block: T) => T) => void
  onShift: (id: string, offset: -1 | 1) => void
  onRemove: (id: string) => void
  onChooseImage: (id: string) => void
  // Blocs liés : le modèle cité, et « Détacher ».
  templateFor: (templateId: string) => LinkedTemplateState
  onDetach: (id: string) => void
  // Pourquoi le bloc choisi ne peut pas être supprimé (le bloc d'un modèle utilisé), sinon null.
  removeBlocked?: string | null
  // « Enregistrer comme modèle… » pour un bloc de premier niveau (absent : pas proposé).
  onSaveAsTemplate?: (id: string) => void
  // « Dupliquer » (comme dans le menu « … » du plan).
  onDuplicate?: (id: string) => void
  // Nombre maximal de blocs au premier niveau (un bloc partagé : 1) : « Monter » ne fait alors
  // pas sortir un bloc de sa section.
  rootLimit?: number
  // « Fermer » (×), en tête de la glissière, et Échap.
  onClose: () => void
}

/** « Monter » ou « Descendre » : possible ou non, et son nom (il peut sortir de la section). */
function shiftAction(
  { draft, rootLimit }: Pick<Props, "draft" | "rootLimit">,
  place: BlockPlace,
  offset: -1 | 1
) {
  const leaves = shiftLeavesBox(place, offset)
  return {
    disabled: !canShift(draft, place.block.id, offset, rootLimit),
    label:
      offset === -1
        ? leaves
          ? labels.moveUpOut
          : labels.moveUp
        : leaves
          ? labels.moveDownOut
          : labels.moveDown,
  }
}

/**
 * Les réglages du bloc choisi, en glissière par-dessus la colonne de droite : en tête son icône,
 * son nom et « Fermer » ; en bas, ses actions en icônes (monter, descendre, dupliquer, modèle,
 * supprimer).
 */
export function BlockSettings(props: Props) {
  const place = props.selectedId
    ? findBlock(props.draft, props.selectedId)
    : null
  if (!place) return null
  const { onClose } = props
  return (
    <section
      aria-label={labels.label}
      data-side-panel
      className="flex h-full flex-col"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault()
          onClose()
        }
      }}
    >
      <PanelHeader
        block={place.block}
        templateFor={props.templateFor}
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
        <SelectedBlock place={place} {...props} />
      </div>
      {props.editable && <ActionBar place={place} {...props} />}
    </section>
  )
}

/** En tête de la glissière du bloc : son icône, son nom (celui du modèle d'un bloc partagé), ×. */
function PanelHeader({
  block,
  templateFor,
  onClose,
}: {
  block: Block
  templateFor: Props["templateFor"]
  onClose: () => void
}) {
  const icon =
    block.type === "linked"
      ? sections.templates.icon
      : blockRegistry[block.type].icon
  const name =
    block.type === "linked"
      ? templateNameOf(templateFor(block.templateId))?.trim() ||
        texts.editor.blockLabel.linked(null)
      : blockRegistry[block.type].label
  return (
    <ColumnHeader
      icon={icon}
      title={name}
      close={{ label: texts.common.close, onClick: onClose }}
    />
  )
}

function SelectedBlock({
  place,
  editable,
  mediaFor,
  onUpdate,
  onChooseImage,
  templateFor,
  removeBlocked = null,
}: Props & { place: BlockPlace }) {
  const { block } = place
  const linkedState =
    block.type === "linked" ? templateFor(block.templateId) : null
  const label = blockLabel(block, linkedState && templateNameOf(linkedState))
  return (
    <>
      {/* Le nom est dans l'en-tête de la glissière. */}
      <h2 className="sr-only">{labels.title(label)}</h2>
      {!editable && (
        <p className="text-sm text-muted-foreground">{labels.readOnly}</p>
      )}
      {block.type === "text" && editable && (
        <p className="text-sm text-muted-foreground">{labels.text}</p>
      )}
      {block.type === "image" && (
        <ImageSettings
          block={block}
          media={mediaFor(block.mediaId)}
          editable={editable}
          onUpdate={onUpdate}
          onChooseImage={onChooseImage}
        />
      )}
      {block.type === "box" && (
        <BoxSettings block={block} editable={editable} onUpdate={onUpdate} />
      )}
      {linkedState && (
        <LinkedSettings state={linkedState} editable={editable} />
      )}
      {/* La barre d'icônes porte les actions ; dessus, ce qui empêche de supprimer. */}
      {editable && removeBlocked && (
        <p className="text-sm text-muted-foreground">{removeBlocked}</p>
      )}
    </>
  )
}

/**
 * Un bloc lié : d'où il vient et ce que fait « Détacher », en deux points courts. « Modifier le
 * modèle » et « Détacher » sont dans la barre d'icônes du bas.
 */
function LinkedSettings({
  state,
  editable,
}: {
  state: LinkedTemplateState
  editable: boolean
}) {
  const linked = texts.templates.linked
  const name = templateNameOf(state)?.trim() || texts.templates.list.untitled
  if (state.state === "missing") {
    return <p className="text-sm text-muted-foreground">{linked.missing}</p>
  }
  // La lecture du modèle a échoué (réseau) : le dire, avec « Réessayer », plutôt qu'un
  // « Chargement… » sans fin.
  if (state.state === "error") {
    return (
      <LoadState
        query={{ isError: true, error: null, refetch: state.retry }}
        failed={linked.loadFailed}
      />
    )
  }
  if (state.state === "loading") {
    return <p className="text-sm text-muted-foreground">{linked.loading}</p>
  }
  return (
    <ul className="grid list-disc gap-1.5 pl-4 text-sm text-muted-foreground">
      <li>{linked.settings(name)}</li>
      {editable && state.state === "ready" && <li>{linked.detachHint}</li>}
    </ul>
  )
}

/** « Enregistrer comme modèle… » : un bloc de premier niveau, qui n'est pas déjà partagé. */
function canSaveAs(
  place: BlockPlace,
  onSaveAsTemplate: Props["onSaveAsTemplate"]
): boolean {
  return (
    onSaveAsTemplate !== undefined &&
    place.container === ROOT &&
    place.block.type !== "linked"
  )
}

/**
 * Éditeur du Fil : les actions du bloc choisi en icônes (leur nom dans l'infobulle), fixées en
 * bas de sa glissière : la place (Monter, Descendre), la copie (Dupliquer, Enregistrer comme
 * modèle…), Modifier le modèle et Détacher pour un bloc partagé, et à l'écart, Supprimer. Mêmes icônes que le menu du plan.
 * Désactivées sans perdre le focus (aria-disabled) : on peut appuyer plusieurs fois de suite au
 * clavier, et la nouvelle place est annoncée.
 */
function ActionBar({
  place,
  onShift,
  onRemove,
  onDuplicate,
  removeBlocked = null,
  onSaveAsTemplate,
  templateFor,
  onDetach,
  ...props
}: Props & { place: BlockPlace }) {
  const { block } = place
  // Un bloc partagé : « Modifier le modèle » (s'il existe encore) et « Détacher » (s'il est lu).
  const linkedState =
    block.type === "linked" ? templateFor(block.templateId) : null
  const linkedName =
    linkedState &&
    (templateNameOf(linkedState)?.trim() || texts.templates.list.untitled)
  const up = shiftAction(props, place, -1)
  const down = shiftAction(props, place, 1)
  return (
    <div
      role="toolbar"
      aria-label={labels.actions}
      className="flex shrink-0 items-center gap-1 border-t bg-background px-2.5 py-2"
    >
      <IconAction
        label={up.label}
        disabled={up.disabled}
        onClick={() => onShift(block.id, -1)}
      >
        <ArrowUp />
      </IconAction>
      <IconAction
        label={down.label}
        disabled={down.disabled}
        onClick={() => onShift(block.id, 1)}
      >
        <ArrowDown />
      </IconAction>
      <Separator orientation="vertical" className="mx-1 h-5" />
      {onDuplicate && (
        <IconAction
          label={texts.editor.outline.duplicate}
          // Le premier niveau est plein (un bloc partagé n'a qu'un bloc) : pas de copie à côté.
          disabled={
            place.container === ROOT &&
            props.rootLimit !== undefined &&
            props.draft.blocks.length >= props.rootLimit
          }
          onClick={() => onDuplicate(block.id)}
        >
          <Copy />
        </IconAction>
      )}
      {canSaveAs(place, onSaveAsTemplate) && (
        <IconAction
          label={texts.templates.saveAs.action}
          onClick={() => onSaveAsTemplate?.(block.id)}
        >
          <BookmarkPlus />
        </IconAction>
      )}
      {block.type === "linked" &&
        linkedName &&
        linkedState.state !== "missing" && (
          <IconAction
            label={texts.templates.linked.editLabel(linkedName)}
            to={editorPath("templates", block.templateId)}
          >
            <SquarePen />
          </IconAction>
        )}
      {block.type === "linked" &&
        linkedName &&
        linkedState.state === "ready" && (
          <IconAction
            label={texts.templates.linked.detachLabel(linkedName)}
            onClick={() => onDetach(block.id)}
          >
            <Unlink />
          </IconAction>
        )}
      <span className="flex-1" />
      <IconAction
        label={labels.remove}
        disabled={removeBlocked !== null}
        destructive
        onClick={() => onRemove(block.id)}
      >
        <Trash2 />
      </IconAction>
    </div>
  )
}

/** Une action en icône, son nom dans l'infobulle : un bouton, ou un lien (`to`). */
function IconAction({
  label,
  disabled = false,
  destructive = false,
  onClick,
  to,
  children,
}: {
  label: string
  disabled?: boolean
  destructive?: boolean
  onClick?: () => void
  to?: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          to ? (
            <Link
              to={to}
              aria-label={label}
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            />
          ) : (
            <Button
              variant={destructive ? "destructive" : "ghost"}
              size="icon-sm"
              aria-label={label}
              className="aria-disabled:opacity-50"
              disabled={disabled}
              focusableWhenDisabled
              onClick={onClick}
            />
          )
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function ImageSettings({
  block,
  media,
  editable,
  onUpdate,
  onChooseImage,
}: {
  block: ImageBlock
  media: BlockMedia
  editable: boolean
  onUpdate: Props["onUpdate"]
  onChooseImage: (id: string) => void
}) {
  const image = labels.image
  const libraryAlt =
    media.state === "ready" || media.state === "not_ready"
      ? (media.media.alt ?? "").trim()
      : ""
  const followsLibrary = block.alt === null
  const setAlt = (alt: string | null) =>
    onUpdate<ImageBlock>(block.id, (previous) => ({ ...previous, alt }))

  return (
    <div className="grid gap-5">
      <Field>
        <FieldLabel>{image.file}</FieldLabel>
        {media.state === "ready" || media.state === "not_ready" ? (
          // Le fichier choisi : sa vignette, son nom, et sa fiche dans la Médiathèque (nouvel
          // onglet : l'éditeur reste ouvert).
          <Item variant="muted" size="sm">
            <ItemMedia>
              {media.state === "ready" && media.url ? (
                <img
                  src={media.url}
                  alt=""
                  className={cn(
                    "size-14 shrink-0 rounded-md bg-muted",
                    media.media.kind === "svg"
                      ? "object-contain"
                      : "object-cover"
                  )}
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ImageIcon aria-hidden className="size-5" />
                </span>
              )}
            </ItemMedia>
            <ItemContent className="min-w-0">
              <ItemTitle className="block w-full truncate">
                {media.media.name}
              </ItemTitle>
              <MediaFileLink mediaId={media.media.id} />
            </ItemContent>
          </Item>
        ) : (
          <p className="truncate text-sm">
            {media.state === "missing"
              ? texts.editor.image.missing
              : media.state === "error"
                ? texts.editor.image.loadFailed
                : media.state === "loading"
                  ? texts.common.loading
                  : texts.editor.image.none}
          </p>
        )}
        {editable && (
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => onChooseImage(block.id)}
          >
            {block.mediaId
              ? texts.editor.image.replace
              : texts.editor.image.choose}
          </Button>
        )}
      </Field>

      <Field>
        <FieldLabel>{image.alt}</FieldLabel>
        <Label className="font-normal">
          <Switch
            aria-label={image.altFromLibrary}
            checked={followsLibrary}
            disabled={!editable}
            onCheckedChange={(checked) => setAlt(checked ? null : libraryAlt)}
          />
          {image.altFromLibrary}
        </Label>
        {followsLibrary ? (
          <FieldDescription>
            {libraryAlt ? image.libraryAlt(libraryAlt) : image.noLibraryAlt}
          </FieldDescription>
        ) : (
          <>
            <Textarea
              aria-label={image.alt}
              value={block.alt ?? ""}
              maxLength={ALT_MAX}
              readOnly={!editable}
              onChange={(event) => setAlt(event.target.value)}
            />
            <FieldDescription>{image.altHint}</FieldDescription>
          </>
        )}
      </Field>
    </div>
  )
}

function BoxSettings({
  block,
  editable,
  onUpdate,
}: {
  block: BoxBlock
  editable: boolean
  onUpdate: Props["onUpdate"]
}) {
  const box = labels.box
  return (
    <Field>
      <FieldLabel>{box.look}</FieldLabel>
      <ToggleGroup
        variant="outline"
        aria-label={box.look}
        value={[block.look]}
        disabled={!editable}
        onValueChange={(value: string[]) => {
          const look = value[0]
          if (look === "fill" || look === "border") {
            onUpdate<BoxBlock>(block.id, (previous) => ({ ...previous, look }))
          }
        }}
      >
        <ToggleGroupItem value="fill">{box.fill}</ToggleGroupItem>
        <ToggleGroupItem value="border">{box.border}</ToggleGroupItem>
      </ToggleGroup>
      {/* Le choix Fond/Bordure porte data-horizontal : sans ce réglage, la phrase serait
          « équilibrée » (text-balance) sur la moitié de la colonne. */}
      <FieldDescription className="group-has-data-horizontal/field:text-wrap">
        {box.hint}
      </FieldDescription>
    </Field>
  )
}

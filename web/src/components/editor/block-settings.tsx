import { cn } from "cn"
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Copy,
  ExternalLink,
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
import {
  ROOT,
  type Block,
  type BoxBlock,
  type Draft,
  type ImageBlock,
  type LinkedBlock,
} from "@/blocks/types"
import { Button, buttonVariants } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { editorPath, mediaFilePath } from "@/navigation"
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
  // Au-dessus des réglages d'un bloc (par exemple « Voir la présentation »).
  header?: ReactNode
  // À la place du message « Choisis un bloc… » quand aucun bloc n'est choisi (la présentation
  // d'un article ou d'un épisode).
  empty?: ReactNode
  // Le nom du panneau quand il montre `empty` (par défaut « Réglages du bloc »).
  emptyLabel?: string
  // Éditeur du Fil : les actions (monter, descendre, dupliquer, modèle, supprimer) en icônes,
  // dans une barre fixe en bas du panneau.
  actionBar?: boolean
  // « Dupliquer » (éditeur du Fil, comme dans le menu « … » du plan).
  onDuplicate?: (id: string) => void
  // Nombre maximal de blocs au premier niveau (un bloc partagé : 1) : « Monter » ne fait alors
  // pas sortir un bloc de sa section.
  rootLimit?: number
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

/** Panneau de droite : les réglages du bloc choisi dans l'aperçu. */
export function BlockSettings(props: Props) {
  const place = props.selectedId
    ? findBlock(props.draft, props.selectedId)
    : null
  if (place && props.actionBar) {
    return (
      <section
        aria-label={labels.label}
        data-side-panel
        className="flex h-full flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
          {props.header}
          <SelectedBlock place={place} {...props} />
        </div>
        {props.editable && <ActionBar place={place} {...props} />}
      </section>
    )
  }
  return (
    <section
      aria-label={place ? labels.label : (props.emptyLabel ?? labels.label)}
      data-side-panel
      className="flex h-full flex-col gap-4 overflow-y-auto p-4"
    >
      {place ? (
        <>
          {props.header}
          <SelectedBlock place={place} {...props} />
        </>
      ) : (
        (props.empty ?? (
          <p className="text-sm text-muted-foreground">{labels.none}</p>
        ))
      )}
    </section>
  )
}

function SelectedBlock({
  place,
  editable,
  mediaFor,
  onUpdate,
  onShift,
  onRemove,
  onChooseImage,
  templateFor,
  onDetach,
  removeBlocked = null,
  onSaveAsTemplate,
  actionBar = false,
  ...props
}: Props & { place: BlockPlace }) {
  const { block } = place
  const up = shiftAction(props, place, -1)
  const down = shiftAction(props, place, 1)
  const linkedState =
    block.type === "linked" ? templateFor(block.templateId) : null
  const label = blockLabel(block, linkedState && templateNameOf(linkedState))
  return (
    <>
      <h2 className="text-sm font-semibold">{labels.title(label)}</h2>
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
      {block.type === "linked" && linkedState && (
        <LinkedSettings
          block={block}
          state={linkedState}
          editable={editable}
          actionBar={actionBar}
          onDetach={() => onDetach(block.id)}
        />
      )}
      {/* La barre d'icônes porte les actions ; dessus, ce qui empêche de supprimer. */}
      {actionBar && editable && removeBlocked && (
        <p className="text-sm text-muted-foreground">{removeBlocked}</p>
      )}
      {!actionBar && editable && canSaveAs(place, onSaveAsTemplate) && (
        <>
          <Separator />
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={() => onSaveAsTemplate?.(block.id)}
          >
            <BookmarkPlus />
            {texts.templates.saveAs.action}
          </Button>
        </>
      )}
      {!actionBar && editable && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {/* Désactivés sans perdre le focus (aria-disabled) : on peut appuyer plusieurs
                fois de suite au clavier, et la nouvelle place est annoncée. */}
            <Button
              variant="outline"
              size="sm"
              className="aria-disabled:opacity-50"
              disabled={up.disabled}
              focusableWhenDisabled
              onClick={() => onShift(block.id, -1)}
            >
              <ArrowUp />
              {up.label}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="aria-disabled:opacity-50"
              disabled={down.disabled}
              focusableWhenDisabled
              onClick={() => onShift(block.id, 1)}
            >
              <ArrowDown />
              {down.label}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive aria-disabled:opacity-50"
              disabled={removeBlocked !== null}
              focusableWhenDisabled
              onClick={() => onRemove(block.id)}
            >
              <Trash2 />
              {labels.remove}
            </Button>
          </div>
          {removeBlocked && (
            <p className="text-sm text-muted-foreground">{removeBlocked}</p>
          )}
        </>
      )}
    </>
  )
}

/**
 * Un bloc lié : d'où il vient et ce que fait « Détacher », en deux points courts ; puis
 * « Modifier le modèle » et « Détacher », sauf dans l'éditeur du Fil, où ils sont dans la barre
 * d'icônes du bas (actionBar).
 */
function LinkedSettings({
  block,
  state,
  editable,
  actionBar,
  onDetach,
}: {
  block: LinkedBlock
  state: LinkedTemplateState
  editable: boolean
  actionBar: boolean
  onDetach: () => void
}) {
  const linked = texts.templates.linked
  const name = templateNameOf(state)?.trim() || texts.templates.list.untitled
  if (state.state === "missing") {
    return <p className="text-sm text-muted-foreground">{linked.missing}</p>
  }
  if (state.state === "loading" || state.state === "error") {
    return <p className="text-sm text-muted-foreground">{linked.loading}</p>
  }
  const canDetach = editable && state.state === "ready"
  return (
    <div className="grid gap-3">
      <ul className="grid list-disc gap-1.5 pl-4 text-sm text-muted-foreground">
        <li>{linked.settings(name)}</li>
        {canDetach && <li>{linked.detachHint}</li>}
      </ul>
      {!actionBar && (
        <div className="flex flex-wrap gap-2">
          <Link
            to={editorPath("templates", block.templateId)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {linked.edit}
          </Link>
          {canDetach && (
            <Button variant="outline" size="sm" onClick={onDetach}>
              <Unlink />
              {linked.detach}
            </Button>
          )}
        </div>
      )}
    </div>
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
 * bas de l'onglet « Bloc choisi » : la place (Monter, Descendre), la copie (Dupliquer,
 * Enregistrer comme modèle…), et à l'écart, Supprimer. Mêmes icônes que le menu du plan.
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
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              className={cn(
                "aria-disabled:opacity-50",
                destructive && "text-destructive hover:text-destructive"
              )}
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
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
            {media.state === "ready" && media.url ? (
              <img
                src={media.url}
                alt=""
                className={cn(
                  "size-14 shrink-0 rounded-md bg-muted",
                  media.media.kind === "svg" ? "object-contain" : "object-cover"
                )}
              />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ImageIcon aria-hidden className="size-5" />
              </span>
            )}
            <div className="grid min-w-0 gap-0.5">
              <p className="truncate text-sm font-medium">{media.media.name}</p>
              <a
                href={mediaFilePath(media.media.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <ExternalLink aria-hidden className="size-3" />
                {image.openInLibrary}
              </a>
            </div>
          </div>
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
        <label className="flex items-center gap-2 text-sm">
          <Switch
            aria-label={image.altFromLibrary}
            checked={followsLibrary}
            disabled={!editable}
            onCheckedChange={(checked) => setAlt(checked ? null : libraryAlt)}
          />
          {image.altFromLibrary}
        </label>
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

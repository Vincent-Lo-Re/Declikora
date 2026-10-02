import { cn } from "cn"
import {
  ArrowDown,
  ArrowUp,
  LayoutTemplate,
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
import { ALT_MAX, findBlock, type BlockPlace } from "@/blocks/draft"
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
import { editorPath } from "@/navigation"
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
  // Éditeur du Fil : les actions (modèle, monter, descendre, supprimer) en icônes, dans une
  // barre fixe en bas du panneau.
  actionBar?: boolean
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
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
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
}: Props & { place: BlockPlace }) {
  const { block } = place
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
            <LayoutTemplate />
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
              disabled={place.index === 0}
              focusableWhenDisabled
              onClick={() => onShift(block.id, -1)}
            >
              <ArrowUp />
              {labels.moveUp}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="aria-disabled:opacity-50"
              disabled={place.index >= place.siblings - 1}
              focusableWhenDisabled
              onClick={() => onShift(block.id, 1)}
            >
              <ArrowDown />
              {labels.moveDown}
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

/** Un bloc lié : d'où il vient, « Modifier le modèle » et « Détacher ». */
function LinkedSettings({
  block,
  state,
  editable,
  onDetach,
}: {
  block: LinkedBlock
  state: LinkedTemplateState
  editable: boolean
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
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">{linked.settings(name)}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          to={editorPath("templates", block.templateId)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          {linked.edit}
        </Link>
        {editable && state.state === "ready" && (
          <Button variant="outline" size="sm" onClick={onDetach}>
            <Unlink />
            {linked.detach}
          </Button>
        )}
      </div>
      {editable && state.state === "ready" && (
        <p className="text-xs text-muted-foreground">{linked.detachHint}</p>
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
 * bas de l'onglet « Bloc choisi ». Désactivées sans perdre le focus (aria-disabled) : on peut
 * appuyer plusieurs fois de suite au clavier, et la nouvelle place est annoncée.
 */
function ActionBar({
  place,
  onShift,
  onRemove,
  removeBlocked = null,
  onSaveAsTemplate,
}: Props & { place: BlockPlace }) {
  const { block } = place
  return (
    <div
      role="toolbar"
      aria-label={labels.actions}
      className="flex shrink-0 items-center gap-1 border-t bg-background p-2"
    >
      {canSaveAs(place, onSaveAsTemplate) && (
        <IconAction
          label={texts.templates.saveAs.action}
          onClick={() => onSaveAsTemplate?.(block.id)}
        >
          <LayoutTemplate />
        </IconAction>
      )}
      <IconAction
        label={labels.moveUp}
        disabled={place.index === 0}
        onClick={() => onShift(block.id, -1)}
      >
        <ArrowUp />
      </IconAction>
      <IconAction
        label={labels.moveDown}
        disabled={place.index >= place.siblings - 1}
        onClick={() => onShift(block.id, 1)}
      >
        <ArrowDown />
      </IconAction>
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

function IconAction({
  label,
  disabled = false,
  destructive = false,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  destructive?: boolean
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
            className={cn(
              "aria-disabled:opacity-50",
              destructive && "text-destructive hover:text-destructive"
            )}
            disabled={disabled}
            focusableWhenDisabled
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
        <p className="truncate text-sm">
          {media.state === "ready" || media.state === "not_ready"
            ? media.media.name
            : media.state === "missing"
              ? texts.editor.image.missing
              : media.state === "error"
                ? texts.editor.image.loadFailed
                : media.state === "loading"
                  ? texts.common.loading
                  : texts.editor.image.none}
        </p>
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
      <FieldDescription>{box.hint}</FieldDescription>
    </Field>
  )
}

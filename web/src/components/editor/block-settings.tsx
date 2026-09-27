import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"

import type { BlockMedia } from "@/blocks/components/context"
import { ALT_MAX, findBlock, type BlockPlace } from "@/blocks/draft"
import { blockLabel } from "@/blocks/labels"
import type { Block, BoxBlock, Draft, ImageBlock } from "@/blocks/types"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
}

/** Panneau de droite : les réglages du bloc choisi dans l'aperçu. */
export function BlockSettings(props: Props) {
  const place = props.selectedId
    ? findBlock(props.draft, props.selectedId)
    : null
  return (
    <section
      aria-label={labels.label}
      className="flex h-full flex-col gap-4 overflow-y-auto p-4"
    >
      {place ? (
        <SelectedBlock place={place} {...props} />
      ) : (
        <p className="text-sm text-muted-foreground">{labels.none}</p>
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
}: Props & { place: BlockPlace }) {
  const { block } = place
  const label = blockLabel(block)
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
      {block.type === "linked" && (
        <p className="text-sm text-muted-foreground">{labels.linked}</p>
      )}
      {editable && (
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
              className="text-destructive"
              onClick={() => onRemove(block.id)}
            >
              <Trash2 />
              {labels.remove}
            </Button>
          </div>
        </>
      )}
    </>
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

      <Field>
        <FieldLabel>{image.caption}</FieldLabel>
        <FieldDescription>
          {image.captionHint}{" "}
          {image.captionCount([...(block.caption ?? "")].length)}
        </FieldDescription>
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

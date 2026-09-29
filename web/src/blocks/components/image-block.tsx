import { ImageIcon, TriangleAlert } from "lucide-react"
import { memo, type ChangeEvent } from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import { CAPTION_MAX } from "@/blocks/draft"
import type { ImageBlock } from "@/blocks/types"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

/**
 * Un bloc Image : le fichier de la médiathèque (dans un <img>, qui n'exécute jamais de
 * script), et sa légende, écrite directement sous l'image.
 */
export const ImageBlockView = memo(function ImageBlockView({
  block,
}: {
  block: ImageBlock
}) {
  const { editable, updateBlock, mediaFor, openPicker } = useBlocksEditor()
  const media = mediaFor(block.mediaId)
  const caption = block.caption ?? ""
  const captionRef = useAutoHeight(caption)

  const onCaption = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = singleLine(event.target.value).slice(0, CAPTION_MAX)
    updateBlock<ImageBlock>(block.id, (previous) => ({
      ...previous,
      caption: value === "" ? null : value,
    }))
  }

  const altText =
    media.state === "ready" ? (block.alt ?? media.media.alt ?? "") : ""
  const missingAlt =
    media.state === "ready" && altText.trim() === "" && editable

  return (
    <figure className="blocks-image">
      {media.state === "ready" && media.url ? (
        <img
          src={media.url}
          alt={altText}
          style={
            media.media.width && media.media.height
              ? { aspectRatio: `${media.media.width} / ${media.media.height}` }
              : undefined
          }
        />
      ) : (
        <div className="blocks-image-placeholder flex flex-col items-center justify-center gap-3 p-4 text-center">
          {media.state === "missing" ||
          media.state === "not_ready" ||
          media.state === "error" ? (
            <TriangleAlert aria-hidden className="size-6" />
          ) : (
            <ImageIcon aria-hidden className="size-6" />
          )}
          <span>
            {media.state === "missing"
              ? texts.editor.image.missing
              : media.state === "error"
                ? texts.editor.image.loadFailed
                : media.state === "not_ready"
                  ? texts.editor.image.notReady
                  : media.state === "none"
                    ? texts.editor.image.none
                    : texts.common.loading}
          </span>
          {media.state === "error" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={media.retry}
            >
              {texts.editor.image.retry}
            </Button>
          ) : (
            editable &&
            media.state !== "loading" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openPicker(block.id)}
              >
                {texts.editor.image.choose}
              </Button>
            )
          )}
        </div>
      )}
      {missingAlt && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {texts.editor.image.altWarning}
        </p>
      )}
      {(editable || caption) && (
        <textarea
          ref={captionRef}
          rows={1}
          className="blocks-caption"
          value={caption}
          maxLength={CAPTION_MAX}
          readOnly={!editable}
          placeholder={editable ? texts.editor.image.captionPlaceholder : ""}
          aria-label={texts.editor.image.captionLabel}
          onChange={onCaption}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault()
          }}
        />
      )}
    </figure>
  )
})

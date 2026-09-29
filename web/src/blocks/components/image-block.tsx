import { ImageIcon, TriangleAlert } from "lucide-react"
import { memo, type ChangeEvent } from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import { MediaImage, MediaUnavailable } from "@/blocks/components/media-state"
import { CAPTION_MAX } from "@/blocks/draft"
import type { ImageBlock } from "@/blocks/types"
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
        <MediaImage media={media} alt={altText} />
      ) : (
        <MediaUnavailable
          media={media}
          words={texts.editor.image}
          icon={ImageIcon}
          editable={editable}
          onChoose={() => openPicker(block.id)}
          className="blocks-image-placeholder flex flex-col items-center justify-center gap-3 p-4 text-center"
          iconClassName="size-6"
        />
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

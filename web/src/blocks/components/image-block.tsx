import { ImageIcon } from "lucide-react"
import { memo } from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { MediaImage, MediaUnavailable } from "@/blocks/components/media-state"
import type { ImageBlock } from "@/blocks/types"
import { texts } from "@/texts"

/**
 * Un bloc Image : le fichier de la médiathèque, dans un <img> (qui n'exécute jamais de script).
 * Pas de légende (retirée le 02/10/2026, ADMIN § 4) : le champ reste dans la forme des blocs,
 * toujours vide.
 */
export const ImageBlockView = memo(function ImageBlockView({
  block,
}: {
  block: ImageBlock
}) {
  const { editable, mediaFor, openPicker } = useBlocksEditor()
  const media = mediaFor(block.mediaId)
  const altText =
    media.state === "ready" ? (block.alt ?? media.media.alt ?? "") : ""

  return (
    <figure className="blocks-image">
      {media.state === "ready" && media.url ? (
        <MediaImage media={media} alt={altText} naturalSvg />
      ) : (
        <MediaUnavailable
          media={media}
          words={texts.editor.image}
          icon={ImageIcon}
          editable={editable}
          onChoose={() => openPicker(block.id)}
          className="blocks-image-placeholder"
          iconClassName="size-6"
        />
      )}
    </figure>
  )
})

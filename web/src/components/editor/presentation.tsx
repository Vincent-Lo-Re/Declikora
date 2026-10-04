import { AudioLines, ImageIcon } from "lucide-react"

import type { BlockMedia } from "@/blocks/components/context"
import { MediaImage, MediaUnavailable } from "@/blocks/components/media-state"
import { AudioPlayer } from "@/components/media/audio-player"
import { texts } from "@/texts"

const labels = texts.editor.presentation

// ---------------------------------------------------------------------------------------------
// Dans l'aperçu du téléphone : ce que l'app montre en tête d'un article ou d'un épisode.
// ---------------------------------------------------------------------------------------------

/**
 * L'image de présentation, en tête de l'aperçu, comme dans l'app. Cliquer dessus montre la
 * présentation dans le panneau de droite ; le bouton ouvre le choix d'une image.
 */
export function CoverPreview({
  media,
  editable,
  onChoose,
  onSelect,
}: {
  media: BlockMedia
  editable: boolean
  onChoose: () => void
  onSelect: () => void
}) {
  return (
    <figure
      className="blocks-image blocks-cover"
      data-presentation="cover"
      onClick={onSelect}
    >
      {media.state === "ready" && media.url ? (
        <MediaImage media={media} alt={media.media.alt ?? ""} />
      ) : (
        <MediaUnavailable
          media={media}
          words={{ ...labels.cover, loadFailed: texts.editor.image.loadFailed }}
          icon={ImageIcon}
          editable={editable}
          onChoose={(event) => {
            event.stopPropagation()
            onChoose()
          }}
          className="blocks-image-placeholder font-sans"
          iconClassName="size-6"
        />
      )}
    </figure>
  )
}

/**
 * L'audio d'un épisode, sous le titre, comme dans l'app : son lecteur (ADMIN § 4). Le fichier, sa
 * durée et la transcription se règlent dans la carte Audio de la colonne de droite.
 */
export function AudioPreview({
  media,
  editable,
  onChoose,
  onSelect,
}: {
  media: BlockMedia
  editable: boolean
  onChoose: () => void
  onSelect: () => void
}) {
  return (
    <div
      className="blocks-audio font-sans"
      data-presentation="audio"
      onClick={onSelect}
    >
      {media.state === "ready" && media.url ? (
        <AudioPlayer
          key={media.url}
          src={media.url}
          name={media.media.name}
          durationHint={media.media.duration_s}
          preload="none"
        />
      ) : (
        <MediaUnavailable
          // Prêt, mais son adresse d'écoute n'est pas encore là.
          media={media.state === "ready" ? { state: "loading" } : media}
          words={labels.audio}
          icon={AudioLines}
          editable={editable}
          onChoose={(event) => {
            event.stopPropagation()
            onChoose()
          }}
          className="flex flex-col items-center gap-3 py-2 text-center text-sm"
          iconClassName="size-5"
        />
      )}
    </div>
  )
}

/**
 * Le texte alternatif de l'image de présentation (médiathèque), s'il y en a un : il n'est plus
 * réclamé (02/10/2026, [D15]).
 */
export function CoverAlt({ cover }: { cover: BlockMedia }) {
  if (cover.state !== "ready") return null
  const alt = cover.media.alt?.trim()
  return alt ? (
    <p className="text-xs text-muted-foreground">{labels.cover.alt(alt)}</p>
  ) : null
}

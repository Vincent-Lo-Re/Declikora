import { AudioLines, ImageIcon, X } from "lucide-react"
import { useRef } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { MediaImage, MediaUnavailable } from "@/blocks/components/media-state"
import type { Draft } from "@/blocks/types"
import { AudioPlayer } from "@/components/media/audio-player"
import { MediaThumbnail } from "@/components/media/media-visuals"
import { Button } from "@/components/ui/button"
import { contentProfile, type PresentationKind } from "@/lib/editor/profile"
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

// ---------------------------------------------------------------------------------------------
// Panneau de droite : la présentation quand aucun bloc n'est choisi.
// ---------------------------------------------------------------------------------------------

/**
 * La présentation d'une méthode, d'un chapitre ou d'une leçon, quand aucun bloc n'est choisi :
 * l'image de présentation (changer, retirer, texte alternatif). L'éditeur du Fil la règle dans sa
 * colonne de droite.
 */
export function PresentationPanel({
  kind,
  draft,
  editable,
  mediaFor,
  onChooseCover,
  onRemoveCover,
}: {
  kind: PresentationKind
  draft: Draft
  editable: boolean
  mediaFor: (mediaId: string | null) => BlockMedia
  onChooseCover: () => void
  onRemoveCover: () => void
}) {
  const profile = contentProfile(kind)
  const cover = mediaFor(draft.cover?.mediaId ?? null)
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        {/* Reçoit le focus après « Voir la présentation » (le bouton disparaît). */}
        <h2
          tabIndex={-1}
          data-presentation-title
          className="text-sm font-semibold outline-none"
        >
          {labels.panelTitle[kind]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {kind === "method" ? labels.methodPanelHint : labels.panelHint}
        </p>
      </div>
      {!editable && (
        <p className="text-sm text-muted-foreground">
          {texts.editor.settings.readOnly}
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">{labels.cover.label}</h3>
        <p className="text-xs text-muted-foreground">
          {profile.cover === "required"
            ? labels.cover.hint
            : labels.cover.optionalHint}
        </p>
        <CoverChoice
          media={cover}
          editable={editable}
          onChoose={onChooseCover}
          onRemove={onRemoveCover}
        />
        <CoverAlt cover={cover} />
      </section>
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

/** L'image de présentation choisie : vignette, nom, changer, retirer. */
function CoverChoice({
  media,
  editable,
  onChoose,
  onRemove,
}: {
  media: BlockMedia
  editable: boolean
  onChoose: () => void
  onRemove: () => void
}) {
  const chooseRef = useRef<HTMLButtonElement>(null)
  const chosen = media.state !== "none"
  const file =
    media.state === "ready" || media.state === "not_ready" ? media.media : null
  return (
    <div className="space-y-2">
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          <MediaThumbnail
            media={file}
            url={media.state === "ready" ? media.url : undefined}
            className="size-12 shrink-0 rounded-md"
            iconClassName="size-5"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            {media.state === "not_ready" && (
              <p className="text-xs text-destructive">
                {labels.cover.notReady}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p
          className={
            media.state === "missing"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {media.state === "missing"
            ? labels.cover.missing
            : media.state === "none"
              ? labels.cover.none
              : texts.common.loading}
        </p>
      )}
      {editable && (
        <div className="flex flex-wrap gap-2">
          {/* data-presentation-choose : là où revient le focus quand le bouton utilisé a
              disparu (choix fait depuis l'aperçu ou depuis la fenêtre Publier). */}
          <Button
            ref={chooseRef}
            type="button"
            size="sm"
            variant="outline"
            data-presentation-choose="cover"
            onClick={onChoose}
          >
            {chosen ? labels.cover.replace : labels.cover.choose}
          </Button>
          {chosen && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                onRemove()
                // « Retirer » disparaît : le focus passe à « Choisir… », juste à côté.
                chooseRef.current?.focus()
              }}
            >
              <X />
              {labels.cover.remove}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

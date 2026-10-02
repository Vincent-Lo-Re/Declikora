import {
  AudioLines,
  ExternalLink,
  ImageIcon,
  Tags,
  TriangleAlert,
  X,
} from "lucide-react"
import { useRef, type ChangeEvent, type ReactNode } from "react"
import { Link } from "react-router"

import type { BlockMedia } from "@/blocks/components/context"
import { MediaImage, MediaUnavailable } from "@/blocks/components/media-state"
import { singleLine, useAutoHeight } from "@/blocks/components/fields"
import { SUMMARY_MAX } from "@/blocks/draft"
import type { Draft } from "@/blocks/types"
import { AudioPlayer } from "@/components/media/audio-player"
import { MediaThumbnail } from "@/components/media/media-visuals"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  coverRequired,
  hasAudio,
  hasCategories,
  type PresentationKind,
} from "@/lib/contents/requirements"
import { formatDuration } from "@/lib/media/format"
import { mediaFilePath } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.presentation

// Le titre du contenu, en tête de l'aperçu : « Prêt à publier ? » et « Écrire le titre » y mènent.
export const CONTENT_TITLE_ID = "contenu-titre"

// Nombres en français (« 1 000 »).
const integer = new Intl.NumberFormat("fr-FR")

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
          className="blocks-image-placeholder flex flex-col items-center justify-center gap-3 p-4 text-center font-sans"
          iconClassName="size-6"
        />
      )}
    </figure>
  )
}

/** Le résumé, écrit sous le titre (texte simple, facultatif). */
export function SummaryPreview({
  summary,
  editable,
  onChange,
  onFocus,
}: {
  summary: string
  editable: boolean
  onChange: (value: string | null) => void
  onFocus: () => void
}) {
  const ref = useAutoHeight(summary)
  if (!editable && !summary) return null
  const onInput = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = singleLine(event.target.value).slice(0, SUMMARY_MAX)
    onChange(value === "" ? null : value)
  }
  return (
    <textarea
      ref={ref}
      rows={1}
      className="blocks-summary"
      value={summary}
      maxLength={SUMMARY_MAX}
      readOnly={!editable}
      placeholder={editable ? labels.summary.placeholder : ""}
      aria-label={labels.summary.label}
      onChange={onInput}
      onFocus={onFocus}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.preventDefault()
      }}
    />
  )
}

/** L'audio d'un épisode, sous le résumé : un lecteur, sa durée, et l'avertissement [D46]. */
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
      {media.state === "ready" ? (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <AudioLines aria-hidden className="size-4 shrink-0" />
            <span>
              {media.media.duration_s !== null
                ? labels.audio.duration(formatDuration(media.media.duration_s))
                : labels.audio.noDuration}
            </span>
          </p>
          {media.url && (
            <AudioPlayer
              key={media.url}
              src={media.url}
              name={media.media.name}
              durationHint={media.media.duration_s}
              preload="none"
            />
          )}
          {!media.media.transcript?.trim() && editable && (
            <TranscriptWarning mediaId={media.media.id} />
          )}
        </div>
      ) : (
        <MediaUnavailable
          media={media}
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
 * [D46] : l'audio n'a pas de transcription. Conseillée, pas obligatoire, comme le texte
 * alternatif d'une image ([D15]). Le lien ouvre sa fiche dans la Médiathèque, dans un nouvel
 * onglet (l'éditeur reste ouvert).
 */
function TranscriptWarning({ mediaId }: { mediaId: string }) {
  return (
    <div className="space-y-1 text-xs text-warning" data-warning="transcript">
      <p className="flex items-start gap-1.5">
        <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
        {labels.audio.transcriptMissing}
      </p>
      <MediaFileLink mediaId={mediaId} />
    </div>
  )
}

/** « Ouvrir sa fiche dans la Médiathèque » (nouvel onglet). */
function MediaFileLink({ mediaId }: { mediaId: string }) {
  return (
    <Link
      to={mediaFilePath(mediaId)}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
      onClick={(event) => event.stopPropagation()}
    >
      {labels.audio.openFile}
      <ExternalLink aria-hidden className="size-3" />
      <span className="sr-only">{labels.openFileHint}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------------------------
// Panneau de droite : la présentation quand aucun bloc n'est choisi.
// ---------------------------------------------------------------------------------------------

export function PresentationPanel({
  kind,
  draft,
  editable,
  mediaFor,
  urlFor,
  categoryNames,
  onChooseCover,
  onRemoveCover,
  onChooseAudio,
  onRemoveAudio,
  onEditCategories,
}: {
  kind: PresentationKind
  draft: Draft
  editable: boolean
  mediaFor: (mediaId: string | null) => BlockMedia
  // Adresse de la vignette d'un fichier prêt (celle de l'aperçu).
  urlFor: (media: BlockMedia) => string | undefined
  // Les noms des catégories choisies (undefined : pas encore lues).
  categoryNames: string[] | undefined
  onChooseCover: () => void
  onRemoveCover: () => void
  onChooseAudio: () => void
  onRemoveAudio: () => void
  onEditCategories: () => void
}) {
  const cover = mediaFor(draft.cover?.mediaId ?? null)
  const audio = mediaFor(draft.audio?.mediaId ?? null)
  const summary = draft.summary ?? ""
  return (
    <div className="space-y-5" data-presentation-panel>
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

      <PanelSection
        title={labels.cover.label}
        hint={
          coverRequired(kind) ? labels.cover.hint : labels.cover.optionalHint
        }
      >
        <FileChoice
          media={cover}
          url={urlFor(cover)}
          texts={labels.cover}
          focusKey="cover"
          editable={editable}
          onChoose={onChooseCover}
          onRemove={onRemoveCover}
        />
        <CoverAlt cover={cover} />
      </PanelSection>

      <Separator />
      <PanelSection title={labels.summary.label} hint={labels.summary.hint}>
        <p className="text-xs text-muted-foreground tabular-nums">
          {labels.summary.count(integer.format(summary.length))}
        </p>
      </PanelSection>

      {hasAudio(kind) && (
        <>
          <Separator />
          <PanelSection title={labels.audio.label} hint={labels.audio.hint}>
            <FileChoice
              media={audio}
              url={undefined}
              texts={labels.audio}
              focusKey="audio"
              editable={editable}
              onChoose={onChooseAudio}
              onRemove={onRemoveAudio}
            />
            {audio.state === "ready" &&
              (audio.media.transcript?.trim() ? (
                <p className="text-xs text-muted-foreground">
                  {labels.audio.transcriptOk}
                </p>
              ) : (
                <TranscriptWarning mediaId={audio.media.id} />
              ))}
          </PanelSection>
        </>
      )}

      {hasCategories(kind) && (
        <>
          <Separator />
          <PanelSection title={labels.categories.label}>
            {categoryNames === undefined ? null : categoryNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {labels.categories.none}
              </p>
            ) : (
              <p className="text-sm">{categoryNames.join(", ")}</p>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-haspopup="dialog"
              onClick={onEditCategories}
            >
              <Tags />
              {labels.categories.edit}
            </Button>
          </PanelSection>
        </>
      )}
    </div>
  )
}

/** Le texte alternatif de l'image de présentation (médiathèque), ou l'avertissement s'il manque. */
export function CoverAlt({ cover }: { cover: BlockMedia }) {
  if (cover.state !== "ready") return null
  const alt = cover.media.alt?.trim()
  return alt ? (
    <p className="text-xs text-muted-foreground">{labels.cover.alt(alt)}</p>
  ) : (
    <div className="space-y-1 text-xs text-warning">
      <p className="flex items-start gap-1.5">
        <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
        {labels.cover.noAlt}
      </p>
      <MediaFileLink mediaId={cover.media.id} />
    </div>
  )
}

function PanelSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </section>
  )
}

/** Le fichier choisi (image de présentation ou audio) : vignette, nom, durée, changer, retirer. */
function FileChoice({
  media,
  url,
  texts: fileTexts,
  focusKey,
  editable,
  onChoose,
  onRemove,
}: {
  media: BlockMedia
  url: string | undefined
  texts: {
    choose: string
    replace: string
    remove: string
    none: string
    missing: string
    notReady: string
  }
  focusKey: "cover" | "audio"
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
            url={url}
            className="size-12 shrink-0 rounded-md"
            iconClassName="size-5"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            {file.duration_s !== null && (
              <p className="text-xs text-muted-foreground">
                {formatDuration(file.duration_s)}
              </p>
            )}
            {media.state === "not_ready" && (
              <p className="text-xs text-destructive">{fileTexts.notReady}</p>
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
            ? fileTexts.missing
            : media.state === "none"
              ? fileTexts.none
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
            data-presentation-choose={focusKey}
            onClick={onChoose}
          >
            {chosen ? fileTexts.replace : fileTexts.choose}
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
              {fileTexts.remove}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

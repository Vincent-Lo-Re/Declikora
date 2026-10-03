import { TriangleAlert, type LucideIcon } from "lucide-react"
import type { MouseEvent } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

/** Les textes d'un fichier choisi qui ne s'affiche pas (bloc Image, présentation). */
type UnavailableWords = {
  none: string
  missing: string
  notReady: string
  loadFailed: string
  choose: string
}

/**
 * Une image prête, à ses proportions : la place est gardée avant qu'elle arrive. Dans un bloc
 * Image, un SVG (logo, pictogramme) garde sa taille réelle, sans dépasser la largeur, centré
 * (preview.css) : il n'est pas agrandi à toute la largeur comme une photo.
 */
export function MediaImage({
  media,
  alt,
  naturalSvg = false,
}: {
  media: Extract<BlockMedia, { state: "ready" }>
  alt: string
  naturalSvg?: boolean
}) {
  const { width, height, kind } = media.media
  const natural = naturalSvg && kind === "svg" && width !== null
  return (
    <img
      src={media.url ?? undefined}
      alt={alt}
      data-natural={natural || undefined}
      // eslint-disable-next-line no-restricted-syntax -- proportions et taille réelle du fichier
      style={{
        ...(width && height && { aspectRatio: `${width} / ${height}` }),
        ...(natural && { maxWidth: `${width}px` }),
      }}
    />
  )
}

/**
 * À la place d'un fichier qui ne s'affiche pas : pourquoi (pas choisi, supprimé, pas prêt,
 * lecture ratée, chargement), puis « Réessayer » ou le bouton pour en choisir un autre.
 */
export function MediaUnavailable({
  media,
  words,
  icon: Icon,
  editable,
  onChoose,
  className,
  iconClassName,
}: {
  media: BlockMedia
  words: UnavailableWords
  icon: LucideIcon
  editable: boolean
  onChoose: (event: MouseEvent<HTMLButtonElement>) => void
  className: string
  iconClassName: string
}) {
  const problem =
    media.state === "missing" ||
    media.state === "not_ready" ||
    media.state === "error"
  const message =
    media.state === "none"
      ? words.none
      : media.state === "missing"
        ? words.missing
        : media.state === "not_ready"
          ? words.notReady
          : media.state === "error"
            ? words.loadFailed
            : texts.common.loading
  return (
    <div className={className}>
      {problem ? (
        <TriangleAlert aria-hidden className={iconClassName} />
      ) : (
        <Icon aria-hidden className={iconClassName} />
      )}
      <span>{message}</span>
      {media.state === "error" ? (
        <Button type="button" size="sm" variant="outline" onClick={media.retry}>
          {texts.common.retry}
        </Button>
      ) : (
        editable &&
        media.state !== "loading" && (
          <Button type="button" size="sm" variant="outline" onClick={onChoose}>
            {words.choose}
          </Button>
        )
      )}
    </div>
  )
}

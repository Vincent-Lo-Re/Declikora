import { cn } from "cn"
import {
  Check,
  Hourglass,
  Link,
  TriangleAlert,
  Unlink,
  Upload,
  X,
} from "lucide-react"

import { IconBadge } from "@/components/icon-badge"
import { MediaUsesButton } from "@/components/media/media-uses"
import { kindIcons, rejectedText } from "@/components/media/media-kinds"
import { INTERRUPTED_AFTER_MS, type Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/**
 * Vignette : l'image ou le SVG (dans un <img>, qui n'exécute jamais de script), sinon l'icône
 * (celle d'une image quand il n'y a pas de fichier : une image de présentation pas choisie).
 */
export function MediaThumbnail({
  media,
  url,
  className,
  iconClassName,
}: {
  media: Media | undefined
  url: string | undefined
  className?: string
  iconClassName?: string
}) {
  const Icon = kindIcons[media?.kind ?? "image"]
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className
      )}
    >
      {url && (media?.kind === "image" || media?.kind === "svg") ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          // La vignette est remplie (image recadrée) ; la fiche montre l'image entière.
          className="size-full object-cover"
        />
      ) : (
        <Icon aria-hidden className={cn("size-8", iconClassName)} />
      )}
    </div>
  )
}

/** Un envoi commencé il y a trop longtemps : « Envoi interrompu ». */
function isInterrupted(media: Media, now: number): boolean {
  return (
    media.status === "pending" &&
    now - new Date(media.status_changed_at).getTime() > INTERRUPTED_AFTER_MS
  )
}

/**
 * État d'un fichier (grille et liste) : une coche s'il est prêt, un sablier pendant sa
 * vérification, une flèche pendant son envoi (un triangle s'il est interrompu), une croix s'il est
 * refusé ; l'infobulle dit l'état exact (ou la raison du refus).
 */
export function MediaStatusIcon({ media, now }: { media: Media; now: number }) {
  switch (media.status) {
    case "ready":
      return (
        <IconBadge
          icon={Check}
          label={texts.media.status.ready}
          variant="secondary"
        />
      )
    case "rejected":
      return (
        <IconBadge icon={X} label={rejectedText(media)} variant="destructive" />
      )
    case "checking":
      return <IconBadge icon={Hourglass} label={texts.media.status.checking} />
    case "pending":
      return isInterrupted(media, now) ? (
        <IconBadge
          icon={TriangleAlert}
          label={texts.media.status.interrupted}
        />
      ) : (
        <IconBadge icon={Upload} label={texts.media.status.pending} />
      )
  }
}

/**
 * Utilisation d'un fichier : un lien s'il sert, un lien coupé sinon. openable (grille et liste) :
 * le lien ouvre la liste des endroits où il sert, avec son export (MediaUsesButton).
 */
export function MediaUseIcon({
  media,
  openable = false,
}: {
  media: Media
  openable?: boolean
}) {
  // Seule la liste lit media_in_use : absent (fiche) ou null (hors équipe), rien à montrer.
  if (media.media_in_use == null) return null
  if (!media.media_in_use)
    return <IconBadge icon={Unlink} label={texts.media.unused} />
  return openable ? (
    <MediaUsesButton media={media} />
  ) : (
    <IconBadge icon={Link} label={texts.media.used} />
  )
}

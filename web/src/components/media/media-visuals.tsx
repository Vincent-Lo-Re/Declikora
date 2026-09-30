import { cn } from "cn"
import { Check, Link, Unlink, X } from "lucide-react"

import { IconHint } from "@/components/icon-hint"
import { kindIcons, rejectedText } from "@/components/media/media-kinds"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
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

/** État d'un fichier : Envoi en cours…, Vérification…, Prêt ou Refusé. */
export function MediaStatusBadge({
  media,
  now,
}: {
  media: Media
  // Heure de la liste chargée : l'affichage ne dépend pas de l'heure du rendu.
  now: number
}) {
  switch (media.status) {
    case "pending":
      return (
        <Badge variant="outline">
          {isInterrupted(media, now)
            ? texts.media.status.interrupted
            : texts.media.status.pending}
        </Badge>
      )
    case "checking":
      return (
        <Badge variant="secondary">
          <Spinner />
          {texts.media.status.checking}
        </Badge>
      )
    case "ready":
      return <Badge variant="secondary">{texts.media.status.ready}</Badge>
    case "rejected":
      return <Badge variant="destructive">{texts.media.status.rejected}</Badge>
  }
}

/**
 * État d'un fichier dans la liste : une coche s'il est prêt, sinon une croix ; l'infobulle dit
 * l'état exact (Envoi en cours…, Vérification…, ou la raison du refus).
 */
export function MediaStatusIcon({ media, now }: { media: Media; now: number }) {
  if (media.status === "ready") {
    return <IconHint icon={Check} label={texts.media.status.ready} />
  }
  const label =
    media.status === "rejected"
      ? rejectedText(media)
      : media.status === "checking"
        ? texts.media.status.checking
        : isInterrupted(media, now)
          ? texts.media.status.interrupted
          : texts.media.status.pending
  return (
    <IconHint
      icon={X}
      label={label}
      className={media.status === "rejected" ? "text-destructive" : undefined}
    />
  )
}

/** Utilisation d'un fichier dans la liste : un lien s'il sert, un lien coupé sinon. */
export function MediaUseIcon({ media }: { media: Media }) {
  // Seule la liste lit media_in_use : absent (fiche) ou null (hors équipe), rien à montrer.
  if (media.media_in_use == null) return null
  return media.media_in_use ? (
    <IconHint icon={Link} label={texts.media.used} />
  ) : (
    <IconHint icon={Unlink} label={texts.media.unused} />
  )
}

/** « Non utilisé » : le fichier n'est dans aucun brouillon ni aucune version en ligne. */
export function MediaUnusedBadge({ media }: { media: Media }) {
  // Seule la liste lit media_in_use : absent (fiche) ou null (hors équipe), rien à montrer.
  if (media.media_in_use !== false) return null
  return (
    <Badge variant="outline">
      <Unlink aria-hidden />
      {texts.media.unused}
    </Badge>
  )
}

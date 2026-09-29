import { cn } from "cn"
import { Unlink } from "lucide-react"

import { kindIcons } from "@/components/media/media-kinds"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { INTERRUPTED_AFTER_MS, type Media } from "@/lib/media/constants"
import { texts } from "@/texts"

/** Vignette : l'image ou le SVG (dans un <img>, qui n'exécute jamais de script), sinon l'icône. */
export function MediaThumbnail({
  media,
  url,
  className,
  iconClassName,
}: {
  media: Media
  url: string | undefined
  className?: string
  iconClassName?: string
}) {
  const Icon = kindIcons[media.kind]
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        className
      )}
    >
      {url && (media.kind === "image" || media.kind === "svg") ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      ) : (
        <Icon aria-hidden className={cn("size-8", iconClassName)} />
      )}
    </div>
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
    case "pending": {
      const interrupted =
        now - new Date(media.status_changed_at).getTime() > INTERRUPTED_AFTER_MS
      return (
        <Badge variant="outline">
          {interrupted
            ? texts.media.status.interrupted
            : texts.media.status.pending}
        </Badge>
      )
    }
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

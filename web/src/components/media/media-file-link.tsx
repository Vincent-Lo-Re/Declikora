import { ExternalLink } from "lucide-react"

import { mediaFilePath } from "@/navigation"
import { texts } from "@/texts"

/**
 * « Ouvrir sa fiche dans la Médiathèque », dans un nouvel onglet : l'éditeur reste ouvert (une
 * image d'un bloc, l'audio d'un épisode).
 */
export function MediaFileLink({ mediaId }: { mediaId: string }) {
  return (
    <a
      href={mediaFilePath(mediaId)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      <ExternalLink aria-hidden className="size-3" />
      {texts.editor.presentation.openInLibrary}{" "}
      <span className="sr-only">{texts.editor.presentation.openFileHint}</span>
    </a>
  )
}

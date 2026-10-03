import { cn } from "cn"
import { GripVertical } from "lucide-react"
import type { ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { blockRegistry } from "@/blocks/registry"
import type { Block } from "@/blocks/types"
import { textOutline } from "@/lib/editor/outline"
import { sections } from "@/navigation"
import { texts } from "@/texts"

const labels = texts.editor.outline
const SharedIcon = sections.templates.icon

/**
 * Un bloc résumé sur une ligne (plan de l'éditeur du Fil, bloc qu'on glisse) : le contenu
 * plutôt que le type (l'icône le dit) ; l'intertitre qui ouvre un texte ou son début, la
 * vignette et le nom du fichier d'une image, l'aspect et le nombre de blocs d'un
 * encadré, le nom d'un bloc partagé. Le nom complet (« Texte « … » ») reste celui des lecteurs
 * d'écran, là où la ligne est un bouton.
 */
export function BlockSummary({
  block,
  media,
  templateName,
  warning = null,
}: {
  block: Block
  // Le fichier d'une image (sa vignette et son nom), sinon null.
  media: BlockMedia | null
  templateName: string | null
  // Ce qui manque : une icône devant le libellé (le détail dans son infobulle).
  warning?: ReactNode
}) {
  const outline = block.type === "text" ? textOutline(block.doc) : null
  const icon = "size-4 shrink-0 text-muted-foreground"
  // Le libellé, précédé de ce qui manque.
  const lines = (main: ReactNode) => (
    <span className="flex min-w-0 flex-1 items-center gap-1.5">
      {warning}
      {main}
    </span>
  )
  if (block.type === "text" && outline) {
    const Icon = blockRegistry.text.icon
    return (
      <>
        <Icon aria-hidden className={icon} />
        {lines(
          outline.lead === "empty" ? (
            <span className="truncate text-muted-foreground italic">
              {texts.editor.blockLabel.text("")}
            </span>
          ) : (
            <span
              className={cn(
                "truncate",
                outline.lead === "heading" && "font-medium"
              )}
            >
              {outline.text}
            </span>
          )
        )}
      </>
    )
  }
  if (block.type === "image") {
    const file = media && "media" in media ? media.media.name : ""
    return (
      <>
        <Thumbnail media={media} />
        {lines(
          <span className="truncate">
            {file || texts.editor.blockLabel.image}
          </span>
        )}
      </>
    )
  }
  if (block.type === "box") {
    const count = block.blocks.length
    // Vide : pas de nombre, ce qui manque est écrit dessous (« Vide : … »).
    return lines(
      <span className="truncate">
        {labels.box[block.look]}
        {count > 0 && (
          <span className="text-muted-foreground">
            {" "}
            · {labels.boxCount(count)}
          </span>
        )}
      </span>
    )
  }
  return (
    <>
      {/* Un bloc partagé : l'icône de Modèles de bloc, dans le menu (pas de pastille : « Bloc
          choisi » dit d'où il vient). */}
      <SharedIcon aria-hidden className={icon} />
      {lines(
        <span className="truncate">
          {templateName?.trim() || texts.editor.blockLabel.linked(null)}
        </span>
      )}
    </>
  )
}

/** La vignette d'une image : son fichier, ou un cadre en pointillés s'il n'y en a pas encore. */
function Thumbnail({ media }: { media: BlockMedia | null }) {
  if (media?.state === "ready" && media.url) {
    return (
      <img
        src={media.url}
        alt=""
        className="h-5 w-7 shrink-0 rounded-sm object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "h-5 w-7 shrink-0 rounded-sm",
        !media || media.state === "none"
          ? "border border-dashed border-muted-foreground"
          : "bg-muted"
      )}
    />
  )
}

/** Ce qu'on tient sous la souris pendant un glisser-déposer (aperçu ou plan). */
export function DragChip({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-72 min-w-0 items-center gap-2 rounded-md border bg-popover px-3 py-1.5 font-sans text-sm text-popover-foreground shadow-md">
      <GripVertical
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
      {children}
    </div>
  )
}

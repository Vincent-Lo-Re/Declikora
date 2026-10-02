import { cn } from "cn"
import {
  GripVertical,
  Heading2,
  Heading3,
  Link2,
  List,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

import type { BlockMedia } from "@/blocks/components/context"
import { blockRegistry } from "@/blocks/registry"
import type { Block } from "@/blocks/types"
import { textOutline, type TextOutline } from "@/lib/editor/outline"
import { texts } from "@/texts"

const labels = texts.editor.outline

const leadIcons: Record<TextOutline["lead"], LucideIcon> = {
  h2: Heading2,
  h3: Heading3,
  list: List,
  paragraph: blockRegistry.text.icon,
  empty: blockRegistry.text.icon,
}

/**
 * Un bloc résumé sur une ligne (plan de l'éditeur du Fil, bloc qu'on glisse) : le contenu
 * plutôt que le type (l'icône le dit) ; l'intertitre qui ouvre un texte ou son début, la
 * vignette et la légende (ou le nom du fichier) d'une image, l'aspect et le nombre de blocs d'un
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
  // Ce qui manque, écrit en clair sous le libellé.
  warning?: ReactNode
}) {
  const outline = block.type === "text" ? textOutline(block.doc) : null
  const icon = "size-4 shrink-0 text-muted-foreground"
  // Le libellé, et dessous ce qui manque.
  const lines = (main: ReactNode) => (
    <span className="grid min-w-0 flex-1">
      {main}
      {warning}
    </span>
  )
  if (block.type === "text" && outline) {
    const Icon = leadIcons[outline.lead]
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
                (outline.lead === "h2" || outline.lead === "h3") &&
                  "font-medium"
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
            {block.caption?.trim() || file || texts.editor.blockLabel.image("")}
          </span>
        )}
      </>
    )
  }
  if (block.type === "box") {
    return (
      <span className="truncate">
        {labels.box[block.look]}{" "}
        <span className="text-muted-foreground">
          · {labels.boxCount(block.blocks.length)}
        </span>
      </span>
    )
  }
  return (
    <>
      <Link2 aria-hidden className={icon} />
      {lines(
        <span className="truncate">
          {templateName?.trim() || texts.editor.blockLabel.linked(null)}
        </span>
      )}
      <span className="ml-auto shrink-0 rounded-full border px-1.5 text-xs text-muted-foreground">
        {labels.shared}
      </span>
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

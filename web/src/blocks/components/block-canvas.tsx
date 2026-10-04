import { cn } from "cn"
import { memo, useMemo } from "react"

import {
  BlocksEditorContext,
  useBlocksEditor,
} from "@/blocks/components/context"
import { ImageBlockView } from "@/blocks/components/image-block"
import { StaticBlock } from "@/blocks/components/static-block"
import { TextBlockView } from "@/blocks/components/text-block"
import type { Block, BoxBlock, Draft, LinkedBlock } from "@/blocks/types"
import { AddBlockButton } from "@/components/editor/add-block-button"
import { Button } from "@/components/ui/button"
import { texts } from "@/texts"

/**
 * Les blocs du téléphone, en Édition : chacun se choisit (clic, curseur) et se modifie sur place.
 * Ils se rangent dans le plan, qui a le glisser-déposer : le téléphone n'a pas de poignée
 * (ADMIN § 4).
 */
export function BlockCanvas({ draft }: { draft: Draft }) {
  return (
    <div className="blocks-list">
      {draft.blocks.map((block) => (
        <CanvasBlock key={block.id} block={block} />
      ))}
    </div>
  )
}

/** Un bloc du téléphone : choisi au clic ou quand il prend le curseur, entouré quand il l'est. */
const CanvasBlock = memo(function CanvasBlock({ block }: { block: Block }) {
  const { selectedId, selectBlock } = useBlocksEditor()
  const selected = selectedId === block.id
  return (
    <div
      data-block-id={block.id}
      data-block-type={block.type}
      data-selected={selected || undefined}
      className={cn(
        "relative rounded-sm outline-offset-4 outline-ring/70",
        selected && "outline-2"
      )}
      onPointerDownCapture={() => selectBlock(block.id)}
      onFocusCapture={() => selectBlock(block.id)}
    >
      <BlockBody block={block} />
    </div>
  )
})

function BlockBody({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <TextBlockView block={block} />
    case "image":
      return <ImageBlockView block={block} />
    case "box":
      return <BoxBlockView block={block} />
    case "linked":
      return <LinkedBlockView block={block} />
  }
}

/**
 * Un bloc lié (bloc partagé) : le bloc de son modèle tel quel, encadré d'un liseré, non
 * modifiable sur place. Son nom est dans le plan ; « Modifier le modèle » et « Détacher », dans
 * ses réglages.
 */
const LinkedBlockView = memo(function LinkedBlockView({
  block,
}: {
  block: LinkedBlock
}) {
  const editor = useBlocksEditor()
  const template = editor.templateFor(block.templateId)
  // Le bloc du modèle se lit ici sans pouvoir s'y modifier.
  const readOnly = useMemo(() => ({ ...editor, editable: false }), [editor])
  const labels = texts.templates.linked

  return (
    <div
      className="rounded-md outline-1 outline-offset-4 outline-primary/40 outline-dashed"
      data-linked-template={block.templateId}
    >
      {template.state === "ready" ? (
        <BlocksEditorContext value={readOnly}>
          <StaticBlock block={template.block} />
        </BlocksEditorContext>
      ) : template.state === "error" ? (
        <div className="flex flex-wrap items-center gap-2 font-sans text-sm text-destructive">
          {labels.loadFailed}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={template.retry}
          >
            {texts.common.retry}
          </Button>
        </div>
      ) : (
        <p className="font-sans text-sm text-muted-foreground">
          {template.state === "missing"
            ? labels.missing
            : template.state === "empty"
              ? labels.empty
              : labels.loading}
        </p>
      )}
    </div>
  )
})

/** Une section : ses blocs (Texte et Image), et « Ajouter dans la section », qui ouvre les Blocs. */
const BoxBlockView = memo(function BoxBlockView({
  block,
}: {
  block: BoxBlock
}) {
  const { editable, onAddInBox } = useBlocksEditor()
  return (
    <div className="blocks-box" data-look={block.look}>
      <div className="blocks-box-list rounded-sm">
        {block.blocks.map((child) => (
          <CanvasBlock key={child.id} block={child} />
        ))}
        {block.blocks.length === 0 && (
          <p className="font-sans text-sm text-muted-foreground">
            {texts.editor.emptyBox}
          </p>
        )}
      </div>
      {editable && onAddInBox && (
        <AddBlockButton
          label={texts.editor.add.inBox}
          className="mt-2"
          onClick={() => onAddInBox(block.id)}
        />
      )}
    </div>
  )
})

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import { memo, useEffect, useRef } from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { textExtensions } from "@/blocks/text/extensions"
import type { Doc, TextBlock } from "@/blocks/types"
import { texts } from "@/texts"

const extensions = textExtensions(texts.editor.textPlaceholder)

/**
 * Un bloc Texte : une instance Tiptap, écrite directement dans l'aperçu. Le document part de
 * block.doc, puis c'est Tiptap qui le tient : chaque frappe remonte le JSON à l'éditeur, qui
 * le nettoie (cleanTextDoc) seulement avant l'enregistrement.
 */
export const TextBlockView = memo(function TextBlockView({
  block,
}: {
  block: TextBlock
}) {
  const { editable, updateBlock, setActiveText } = useBlocksEditor()
  const blockId = block.id
  // Les rappels de Tiptap lisent toujours les dernières valeurs.
  const latest = useRef({ updateBlock, setActiveText })
  useEffect(() => {
    latest.current = { updateBlock, setActiveText }
  })

  const editor = useEditor({
    extensions,
    content: block.doc as JSONContent,
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        "aria-label": texts.editor.blocks.text,
        "aria-multiline": "true",
        role: "textbox",
        "data-block-text": blockId,
      },
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as Doc
      latest.current.updateBlock<TextBlock>(blockId, (previous) => ({
        ...previous,
        doc,
      }))
    },
    onFocus: ({ editor: current }) =>
      latest.current.setActiveText(blockId, current, true),
  })

  // Un texte supprimé ou déplacé ailleurs ne reste pas la cible de la barre de mise en forme.
  useEffect(() => {
    if (!editor) return
    return () => latest.current.setActiveText(blockId, editor, false)
  }, [editor, blockId])

  useEffect(() => {
    // Sans événement « update » : changer de mode n'est pas une modification du texte.
    if (editor && editor.isEditable !== editable)
      editor.setEditable(editable, false)
  }, [editor, editable])

  return <EditorContent editor={editor} className="blocks-text" />
})

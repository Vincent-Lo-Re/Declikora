import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react"
import { cn } from "cn"
import { Bookmark, type LucideIcon } from "lucide-react"
import { memo, useEffect, useRef, useState } from "react"

import { useBlocksEditor } from "@/blocks/components/context"
import { blockRegistry } from "@/blocks/registry"
import { textExtensions } from "@/blocks/text/extensions"
import type { Doc, TextBlock } from "@/blocks/types"
import type { SlashChoice } from "@/lib/editor/slash"
import { texts } from "@/texts"

const extensions = textExtensions(texts.editor.textPlaceholder)
// Éditeur du Fil : le texte vide dit qu'on peut taper « / ».
const slashExtensions = textExtensions(texts.editor.slash.placeholder)

const slashItems: Record<SlashChoice, { label: string; icon: LucideIcon }> = {
  text: blockRegistry.text,
  image: blockRegistry.image,
  box: blockRegistry.box,
  mine: { label: texts.editor.slash.mine, icon: Bookmark },
}

/**
 * Un bloc Texte : une instance Tiptap, écrite directement dans l'aperçu. Le document part de
 * block.doc, puis c'est Tiptap qui le tient : chaque frappe remonte le JSON à l'éditeur, qui
 * le nettoie (cleanTextDoc) seulement avant l'enregistrement. Dans l'éditeur du Fil, « / » tapé
 * dans un texte vide ouvre la liste des blocs (flèches, Entrée, Échap).
 */
export const TextBlockView = memo(function TextBlockView({
  block,
}: {
  block: TextBlock
}) {
  const { editable, updateBlock, setActiveText, slash } = useBlocksEditor()
  const blockId = block.id
  // La ligne choisie de la liste « / », ou null quand elle est fermée.
  const [active, setActive] = useState<number | null>(null)
  const choices = active !== null && slash ? slash.choices(blockId) : []
  // Les rappels de Tiptap lisent toujours les dernières valeurs.
  const latest = useRef({ updateBlock, setActiveText, slash, active, choices })
  useEffect(() => {
    latest.current = { updateBlock, setActiveText, slash, active, choices }
  })

  const editorRef = useRef<Editor | null>(null)
  const choose = (choice: SlashChoice) => {
    setActive(null)
    editorRef.current?.commands.clearContent(true)
    latest.current.slash?.choose(blockId, choice)
  }
  const chooseRef = useRef(choose)
  useEffect(() => {
    chooseRef.current = choose
  })

  const editor = useEditor({
    extensions: slash ? slashExtensions : extensions,
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
      handleKeyDown: (_view, event) => {
        const { active: current, choices: shown } = latest.current
        if (current === null || shown.length === 0) return false
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const step = event.key === "ArrowDown" ? 1 : -1
          setActive((current + step + shown.length) % shown.length)
          return true
        }
        if (event.key === "Enter") {
          chooseRef.current(shown[current])
          return true
        }
        if (event.key === "Escape") {
          setActive(null)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as Doc
      latest.current.updateBlock<TextBlock>(blockId, (previous) => ({
        ...previous,
        doc,
      }))
      if (latest.current.slash) {
        setActive(current.getText() === "/" ? 0 : null)
      }
    },
    onFocus: ({ editor: current }) =>
      latest.current.setActiveText(current, true),
    onBlur: () => setActive(null),
  })
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Un texte supprimé ou déplacé ailleurs ne reste pas la cible de la barre de mise en forme.
  useEffect(() => {
    if (!editor) return
    return () => latest.current.setActiveText(editor, false)
  }, [editor])

  useEffect(() => {
    // Sans événement « update » : changer de mode n'est pas une modification du texte.
    if (editor && editor.isEditable !== editable)
      editor.setEditable(editable, false)
  }, [editor, editable])

  // La liste « / » est rattachée au texte (lecteurs d'écran : la ligne choisie est annoncée).
  const listId = `slash-${blockId}`
  const open = choices.length > 0 && active !== null
  useEffect(() => {
    const dom = editor?.isDestroyed === false ? editor.view.dom : null
    if (!dom || !slash) return
    dom.setAttribute("aria-expanded", String(open))
    if (open) {
      dom.setAttribute("aria-controls", listId)
      dom.setAttribute("aria-activedescendant", `${listId}-${active}`)
    } else {
      dom.removeAttribute("aria-controls")
      dom.removeAttribute("aria-activedescendant")
    }
  }, [editor, slash, open, listId, active])

  return (
    <div className="relative">
      <EditorContent editor={editor} className="blocks-text" />
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={texts.editor.slash.title}
          className="absolute top-full left-0 z-20 mt-1 w-56 rounded-lg border bg-popover p-1 font-sans text-sm text-popover-foreground shadow-md"
        >
          <p aria-hidden className="px-2 py-1 text-xs text-muted-foreground">
            {texts.editor.slash.title}
          </p>
          {choices.map((choice, index) => {
            const { label, icon: Icon } = slashItems[choice]
            return (
              <div
                key={choice}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={cn(
                  "flex cursor-default items-center gap-2 rounded-md px-2 py-1.5",
                  index === active && "bg-accent text-accent-foreground"
                )}
                // Le curseur reste dans le texte.
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(choice)}
              >
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                {label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

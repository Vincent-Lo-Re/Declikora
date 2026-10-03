import type { Editor } from "@tiptap/react"
import { cn } from "cn"
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useReducer, useState } from "react"

import { LinkDialog } from "@/components/editor/link-dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Toggle } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { texts } from "@/texts"

const labels = texts.editor.toolbar

type Formats = {
  paragraph: boolean
  h2: boolean
  h3: boolean
  bulletList: boolean
  orderedList: boolean
  bold: boolean
  italic: boolean
  link: boolean
  // Des mots sont sélectionnés : un lien peut s'y poser.
  selection: boolean
  canUndo: boolean
  canRedo: boolean
}

const none: Formats = {
  paragraph: false,
  h2: false,
  h3: false,
  bulletList: false,
  orderedList: false,
  bold: false,
  italic: false,
  link: false,
  selection: false,
  canUndo: false,
  canRedo: false,
}

function readFormats(editor: Editor): Formats {
  return {
    paragraph: editor.isActive("paragraph"),
    h2: editor.isActive("heading", { level: 2 }),
    h3: editor.isActive("heading", { level: 3 }),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    link: editor.isActive("link"),
    selection: !editor.state.selection.empty,
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  }
}

/**
 * L'état du texte, relu à chaque rendu : à chaque transaction du texte, et dès qu'on passe à un
 * autre texte (useEditorState ne relisait le nouveau texte qu'à sa prochaine transaction : la
 * barre montrait l'état du texte d'avant).
 */
function useFormats(editor: Editor | null): Formats {
  const [, refresh] = useReducer((count: number) => count + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on("transaction", refresh)
    return () => {
      editor.off("transaction", refresh)
    }
  }, [editor])
  return editor && !editor.isDestroyed ? readFormats(editor) : none
}

/**
 * Barre de mise en forme, au-dessus du téléphone (verticale à sa gauche dans l'éditeur du Fil) :
 * elle agit sur le texte du bloc choisi. Désactivée en lecture seule, ou quand le bloc choisi
 * n'est pas un texte.
 */
export function FormatToolbar({
  editor,
  editable,
  orientation = "horizontal",
}: {
  editor: Editor | null
  editable: boolean
  orientation?: "horizontal" | "vertical"
}) {
  const vertical = orientation === "vertical"
  // Verticale : les infobulles s'ouvrent à droite, loin du texte qu'on met en forme.
  const side = vertical ? "right" : "top"
  const separator = (
    <Separator
      orientation={vertical ? "horizontal" : "vertical"}
      className={vertical ? "my-1 w-5" : "mx-1 h-5"}
    />
  )
  const [linkOpen, setLinkOpen] = useState(false)
  const formats = useFormats(editor)

  const usable = editable && editor !== null && !editor.isDestroyed
  const chain = () => editor!.chain().focus()

  const toggle = (
    key: keyof Formats,
    label: string,
    Icon: LucideIcon,
    run: () => void,
    disabled = false
  ) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="sm"
            aria-label={label}
            pressed={formats[key]}
            disabled={!usable || disabled}
            onPressedChange={run}
            // La barre ne prend pas le focus : le curseur reste dans le texte.
            onMouseDown={(event) => event.preventDefault()}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  )

  return (
    <div
      role="toolbar"
      aria-label={labels.label}
      aria-orientation={orientation}
      className={cn(
        "flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-xs",
        vertical ? "flex-col" : "flex-wrap"
      )}
    >
      {toggle("paragraph", labels.paragraph, Pilcrow, () =>
        chain().setParagraph().run()
      )}
      {toggle("h2", labels.h2, Heading2, () =>
        chain().toggleHeading({ level: 2 }).run()
      )}
      {toggle("h3", labels.h3, Heading3, () =>
        chain().toggleHeading({ level: 3 }).run()
      )}
      {separator}
      {toggle("bulletList", labels.bulletList, List, () =>
        chain().toggleBulletList().run()
      )}
      {toggle("orderedList", labels.orderedList, ListOrdered, () =>
        chain().toggleOrderedList().run()
      )}
      {separator}
      {toggle("bold", labels.bold, Bold, () => chain().toggleBold().run())}
      {toggle("italic", labels.italic, Italic, () =>
        chain().toggleItalic().run()
      )}
      {/* Un lien se pose sur des mots sélectionnés (ou se modifie là où il est déjà). */}
      {toggle(
        "link",
        labels.link,
        Link2,
        () => setLinkOpen(true),
        !formats.link && !formats.selection
      )}
      {separator}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.undo}
              disabled={!usable || !formats.canUndo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chain().undo().run()}
            />
          }
        >
          <Undo2 />
        </TooltipTrigger>
        <TooltipContent side={side}>{labels.undo}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={labels.redo}
              disabled={!usable || !formats.canRedo}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chain().redo().run()}
            />
          }
        >
          <Redo2 />
        </TooltipTrigger>
        <TooltipContent side={side}>{labels.redo}</TooltipContent>
      </Tooltip>
      {!usable && editable && (
        <span
          className={cn(
            "px-2 text-xs text-muted-foreground",
            vertical && "sr-only"
          )}
        >
          {labels.unavailable}
        </span>
      )}
      {editor && (
        <LinkDialog
          editor={editor}
          open={linkOpen}
          onOpenChange={setLinkOpen}
        />
      )}
    </div>
  )
}

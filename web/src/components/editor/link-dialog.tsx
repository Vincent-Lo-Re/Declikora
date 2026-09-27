import type { Editor } from "@tiptap/react"
import { useState, type FormEvent } from "react"

import { normalizeHref } from "@/blocks/text/clean-text-doc"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { texts } from "@/texts"

const labels = texts.editor.link

/** Ajouter, modifier ou retirer un lien (https:// ou mailto: seulement, [D10]). */
export function LinkDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <LinkForm editor={editor} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current =
    (editor.getAttributes("link").href as string | undefined) ?? ""
  const [value, setValue] = useState(current)
  const [invalid, setInvalid] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const href = normalizeHref(value)
    if (!href) {
      setInvalid(true)
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
    onDone()
  }

  const onRemove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    onDone()
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{labels.title}</DialogTitle>
        <DialogDescription>{labels.description}</DialogDescription>
      </DialogHeader>
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="link-href">{labels.url}</FieldLabel>
        <Input
          id="link-href"
          type="url"
          autoFocus
          value={value}
          placeholder={labels.placeholder}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setValue(event.target.value)
            setInvalid(false)
          }}
        />
        {invalid && <FieldError>{labels.invalid}</FieldError>}
      </Field>
      <DialogFooter>
        {current && (
          <Button type="button" variant="outline" onClick={onRemove}>
            {labels.remove}
          </Button>
        )}
        <Button type="submit">{labels.apply}</Button>
      </DialogFooter>
    </form>
  )
}

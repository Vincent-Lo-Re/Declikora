import { Editor } from "@tiptap/react"
import { afterEach, describe, expect, it } from "vitest"

import { validateDraft } from "@/blocks/generated/validators"
import { cleanTextDoc } from "@/blocks/text/clean-text-doc"
import { textExtensions } from "@/blocks/text/extensions"
import type { Doc } from "@/blocks/types"

// Le contenu collé est nettoyé par le schéma de Tiptap (extensions du bloc Texte), sans rien
// d'autre : le JSON obtenu doit déjà avoir la forme exigée par la base.

let editor: Editor | null = null

afterEach(() => {
  editor?.destroy()
  editor = null
})

function createEditor() {
  const element = document.createElement("div")
  document.body.append(element)
  editor = new Editor({ element, extensions: textExtensions() })
  return editor
}

function paste(html: string): Doc {
  const current = createEditor()
  // jsdom ne connaît pas ClipboardEvent : un simple événement « paste » suffit.
  current.view.pasteHTML(html, new window.Event("paste") as ClipboardEvent)
  return current.getJSON() as Doc
}

function accepted(doc: Doc) {
  return validateDraft({
    v: 1,
    title: "",
    blocks: [{ id: "00000000-0000-4000-8000-000000000001", type: "text", doc }],
  })
}

describe("contenu collé dans un bloc Texte", () => {
  it("ne garde que les nœuds et les marques permis", () => {
    const doc = paste(
      [
        "<h1>Grand titre</h1>",
        "<h2>Titre</h2>",
        "<h4>Petit titre</h4>",
        "<blockquote><p>Citation</p></blockquote>",
        "<pre><code>du code</code></pre>",
        "<table><tr><td>case</td></tr></table>",
        "<hr>",
        '<p><img src="https://exemple.fr/a.png">Texte <u>souligné</u> <s>barré</s> <code>code</code> <mark>surligné</mark> <strong>gras</strong> <em>italique</em></p>',
      ].join("")
    )
    const types = doc.content.map((node) => node.type)
    expect(types).not.toContain("blockquote")
    expect(types).not.toContain("codeBlock")
    expect(types).not.toContain("horizontalRule")
    expect(JSON.stringify(doc)).not.toMatch(
      /"image"|"underline"|"strike"|"code"|"highlight"/
    )
    // h1 et h4 deviennent des paragraphes ; h2 reste un titre.
    expect(doc.content[0]).toMatchObject({ type: "paragraph" })
    expect(doc.content[1]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
    })
    expect(accepted(doc)).toBe(true)
    // cleanTextDoc n'a plus rien à changer.
    expect(cleanTextDoc(doc)).toEqual(doc)
  })

  it("ne garde des liens que l'adresse, et seulement https:// ou mailto:", () => {
    const doc = paste(
      '<p><a href="https://declikora.app" target="_blank" rel="nofollow" class="x" title="t">bon</a> ' +
        '<a href="javascript:alert(1)">piège</a> <a href="http://pas-sur.fr">http</a> ' +
        '<a href="mailto:bonjour@declikora.app">e-mail</a></p>'
    )
    const marks = JSON.stringify(doc)
    expect(marks).toContain(
      '{"type":"link","attrs":{"href":"https://declikora.app"}}'
    )
    expect(marks).toContain(
      '{"type":"link","attrs":{"href":"mailto:bonjour@declikora.app"}}'
    )
    expect(marks).not.toContain("javascript:")
    expect(marks).not.toContain("http://")
    expect(marks).not.toMatch(/target|rel|class|title/)
    expect(accepted(doc)).toBe(true)
  })

  it("ne garde que start sur une liste numérotée, et pas de titre dans une liste", () => {
    const doc = paste(
      '<ol start="3" type="a"><li><h2>Titre dans une liste</h2></li><li>deux</li></ol>'
    )
    const list = doc.content.find((node) => node.type === "orderedList")
    expect(list).toBeDefined()
    expect(list && "attrs" in list ? list.attrs : null).toEqual({ start: 3 })
    expect(JSON.stringify(list)).not.toContain('"heading"')
    expect(accepted(cleanTextDoc(doc))).toBe(true)
  })

  it("n'ajoute pas de paragraphe vide à la fin (trailingNode)", () => {
    const doc = paste("<p>un</p><ul><li>deux</li></ul>")
    expect(doc.content.at(-1)?.type).toBe("bulletList")
  })

  it("refuse de poser un lien javascript: par la commande", () => {
    const current = createEditor()
    current.commands.setContent("<p>mot</p>")
    current.commands.selectAll()
    expect(current.commands.setLink({ href: "javascript:alert(1)" })).toBe(
      false
    )
    expect(current.commands.setLink({ href: "https://declikora.app" })).toBe(
      true
    )
  })
})

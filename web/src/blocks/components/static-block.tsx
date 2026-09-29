import { Fragment, type ReactNode } from "react"

import { ImageBlockView } from "@/blocks/components/image-block"
import type { Block, Doc } from "@/blocks/types"

// Un nœud du texte restreint (docs/ARCHITECTURE-CONTENUS.md, § 2.3), lu sans Tiptap.
type TextNode = {
  type: string
  attrs?: { level?: number; start?: number }
  content?: TextNode[]
  text?: string
  marks?: { type: string; attrs?: { href?: string } }[]
}

function inline(node: TextNode, key: number): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />
  if (node.type !== "text" || !node.text) return null
  let element: ReactNode = node.text
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") element = <strong>{element}</strong>
    else if (mark.type === "italic") element = <em>{element}</em>
    else if (mark.type === "link" && mark.attrs?.href) {
      // Dans un nouvel onglet : un clic ne quitte jamais l'éditeur.
      element = (
        <a href={mark.attrs.href} target="_blank" rel="noreferrer noopener">
          {element}
        </a>
      )
    }
  }
  return <Fragment key={key}>{element}</Fragment>
}

function block(node: TextNode, key: number): ReactNode {
  const children = node.content ?? []
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{children.map(inline)}</p>
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key}>{children.map(inline)}</h3>
      ) : (
        <h2 key={key}>{children.map(inline)}</h2>
      )
    case "bulletList":
      return <ul key={key}>{children.map(block)}</ul>
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start}>
          {children.map(block)}
        </ol>
      )
    case "listItem":
      return <li key={key}>{children.map(block)}</li>
    default:
      return null
  }
}

/**
 * Un texte affiché tel quel, sans éditeur (bloc d'un modèle montré dans un contenu). Mêmes
 * classes que Tiptap : l'aperçu reste identique.
 */
function StaticText({ doc }: { doc: Doc }) {
  const root = doc as unknown as TextNode
  return (
    <div className="blocks-text">
      <div className="ProseMirror">{(root.content ?? []).map(block)}</div>
    </div>
  )
}

/**
 * Un bloc affiché tel quel, non modifiable sur place : le bloc d'un modèle identique partout,
 * dans un contenu. Pas d'identifiant de bloc dans la page (le même modèle peut y être deux fois),
 * pas de glisser-déposer. Les images lisent l'éditeur (fichier, aperçu), en lecture seule.
 */
export function StaticBlock({ block: shown }: { block: Block }) {
  switch (shown.type) {
    case "text":
      return <StaticText doc={shown.doc} />
    case "image":
      return <ImageBlockView block={shown} />
    case "box":
      return (
        <div className="blocks-box" data-look={shown.look}>
          <div className="blocks-box-list">
            {shown.blocks.map((child) => (
              <StaticBlock key={child.id} block={child} />
            ))}
          </div>
        </div>
      )
    case "linked":
      return null
  }
}

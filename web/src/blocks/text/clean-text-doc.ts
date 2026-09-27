// Filet de sécurité avant l'enregistrement : ramène le JSON de Tiptap à la forme exacte du
// schéma (blocks/blocks.schema.json, bloc « text »). La configuration de Tiptap
// (./extensions.ts) produit déjà cette forme ; cleanTextDoc rattrape le reste (contenu collé
// dans une ancienne version, attributs ajoutés par une extension, liste vidée…).

import type {
  BulletList,
  Doc,
  DocChild,
  Heading,
  InlineNode,
  ListChild,
  ListItem,
  Mark,
  OrderedList,
  Paragraph,
} from "@/blocks/generated/blocks"

/** Un nœud JSON quelconque, tel que Tiptap (ou un copier-coller) peut le produire. */
type AnyNode = {
  type?: unknown
  text?: unknown
  attrs?: Record<string, unknown> | null
  marks?: unknown
  content?: unknown
}

const MAX_HREF = 2048
const MAX_START = 99999

/** Liens acceptés : https:// et mailto: seulement, sensible à la casse, sans espace ([D10]). */
export function isAllowedHref(href: unknown): href is string {
  return (
    typeof href === "string" &&
    href.length <= MAX_HREF &&
    /^(https:\/\/|mailto:)[^\s]+$/.test(href)
  )
}

/**
 * Adresse saisie à la main : espaces retirés, « HTTPS:// » ou « MailTo: » ramenés en
 * minuscules. Renvoie null si l'adresse reste refusée.
 */
export function normalizeHref(input: string): string | null {
  const trimmed = input.trim()
  const fixed = trimmed.replace(/^(https:\/\/|mailto:)/i, (scheme) =>
    scheme.toLowerCase()
  )
  return isAllowedHref(fixed) ? fixed : null
}

function isNode(value: unknown): value is AnyNode {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function children(node: AnyNode): AnyNode[] {
  return Array.isArray(node.content) ? node.content.filter(isNode) : []
}

function cleanMarks(value: unknown): Mark[] {
  if (!Array.isArray(value)) return []
  const marks: Mark[] = []
  const seen = new Set<string>()
  for (const mark of value) {
    if (!isNode(mark) || typeof mark.type !== "string") continue
    if (seen.has(mark.type)) continue
    if (mark.type === "bold" || mark.type === "italic") {
      marks.push({ type: mark.type })
      seen.add(mark.type)
    } else if (mark.type === "link" && isAllowedHref(mark.attrs?.href)) {
      marks.push({ type: "link", attrs: { href: mark.attrs.href } })
      seen.add(mark.type)
    }
  }
  return marks
}

/** Texte et retours à la ligne d'un nœud en ligne ; tout autre nœud est retiré. */
function cleanInline(nodes: AnyNode[]): InlineNode[] {
  const inline: InlineNode[] = []
  for (const node of nodes) {
    if (node.type === "text") {
      if (typeof node.text !== "string" || node.text.length === 0) continue
      const marks = cleanMarks(node.marks)
      inline.push(
        marks.length > 0
          ? { type: "text", text: node.text, marks }
          : { type: "text", text: node.text }
      )
    } else if (node.type === "hardBreak") {
      inline.push({ type: "hardBreak" })
    } else if (Array.isArray(node.content)) {
      // Un nœud en ligne inconnu qui contient du texte : on garde le texte.
      inline.push(...cleanInline(children(node)))
    }
  }
  return inline
}

function paragraph(content: InlineNode[]): Paragraph {
  return content.length > 0
    ? { type: "paragraph", content }
    : { type: "paragraph" }
}

function heading(level: unknown, content: InlineNode[]): Heading {
  const value = typeof level === "number" && level >= 3 ? 3 : 2
  return content.length > 0
    ? { type: "heading", attrs: { level: value }, content }
    : { type: "heading", attrs: { level: value } }
}

function cleanListItem(node: AnyNode): ListItem {
  const content: ListChild[] = []
  for (const child of children(node)) {
    for (const cleaned of cleanBlock(child)) {
      // Pas de titre dans une liste : il devient un paragraphe.
      content.push(
        cleaned.type === "heading"
          ? paragraph(cleaned.content ?? [])
          : (cleaned as ListChild)
      )
    }
  }
  // Le premier enfant d'un élément de liste est un paragraphe.
  if (content.length === 0 || content[0].type !== "paragraph") {
    content.unshift({ type: "paragraph" })
  }
  return { type: "listItem", content: content as ListItem["content"] }
}

function cleanList(node: AnyNode): BulletList | OrderedList | null {
  const items = children(node)
    .filter((child) => child.type === "listItem")
    .map(cleanListItem)
  if (items.length === 0) return null
  if (node.type === "bulletList") return { type: "bulletList", content: items }
  const start = node.attrs?.start
  if (typeof start === "number" && Number.isFinite(start)) {
    const value = Math.min(MAX_START, Math.max(1, Math.round(start)))
    return { type: "orderedList", attrs: { start: value }, content: items }
  }
  return { type: "orderedList", content: items }
}

/** Un nœud de bloc, ramené à zéro, un ou plusieurs nœuds permis. */
function cleanBlock(node: AnyNode): DocChild[] {
  switch (node.type) {
    case "paragraph":
      return [paragraph(cleanInline(children(node)))]
    case "heading":
      return [heading(node.attrs?.level, cleanInline(children(node)))]
    case "bulletList":
    case "orderedList": {
      const list = cleanList(node)
      return list ? [list] : []
    }
    case "listItem":
      // Un élément de liste isolé : ses paragraphes.
      return cleanListItem(node).content
    case "text":
    case "hardBreak":
      return [paragraph(cleanInline([node]))]
    default: {
      // Nœud inconnu (citation, bloc de code…) : ses blocs s'il en contient, sinon son texte.
      const inner = children(node)
      if (inner.length === 0) return []
      const isInline = inner.every(
        (child) => child.type === "text" || child.type === "hardBreak"
      )
      return isInline
        ? [paragraph(cleanInline(inner))]
        : inner.flatMap(cleanBlock)
    }
  }
}

/** Ramène un document Tiptap à la forme du schéma (bloc Texte). */
export function cleanTextDoc(value: unknown): Doc {
  const nodes = isNode(value) ? children(value) : []
  const content = nodes.flatMap(cleanBlock)
  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  }
}

/** Texte brut d'un document (plan, annonces, « Copier mon texte »). */
export function textDocToPlainText(doc: Doc): string {
  const lines: string[] = []
  const inlineText = (content: InlineNode[] | undefined) =>
    (content ?? [])
      .map((node) => (node.type === "text" ? node.text : "\n"))
      .join("")
  const walk = (nodes: DocChild[], prefix: string) => {
    for (const node of nodes) {
      if (node.type === "paragraph" || node.type === "heading") {
        lines.push(prefix + inlineText(node.content))
      } else {
        node.content.forEach((item, index) => {
          const marker =
            node.type === "bulletList"
              ? "• "
              : `${(node.attrs?.start ?? 1) + index}. `
          const [first, ...rest] = item.content
          lines.push(prefix + marker + inlineText(first.content))
          walk(rest, `${prefix}   `)
        })
      }
    }
  }
  walk(doc.content, "")
  return lines.join("\n")
}

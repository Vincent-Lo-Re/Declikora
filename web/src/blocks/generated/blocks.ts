// Généré par web/scripts/blocks-generate.mjs (npm run blocks:generate) depuis blocks/. Ne pas modifier.

/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "mediaRef".
 */
export type MediaRef = {
  mediaId: Uuid
} | null
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "uuid".
 */
export type Uuid = string
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "topBlock".
 */
export type TopBlock = TextBlock | ImageBlock | BoxBlock | LinkedBlock
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "templateBlock".
 */
export type TemplateBlock = TextBlock | ImageBlock | BoxBlock
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedTopBlock".
 */
export type PublishedTopBlock =
  PublishedTextBlock | PublishedTopImageBlock | PublishedBoxBlock
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "nullableUuid".
 */
export type NullableUuid = string | null
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "href".
 */
export type Href = string
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "mark".
 */
export type Mark = BasicMark | LinkMark
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "marks".
 */
export type Marks = Mark[]
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "inlineNode".
 */
export type InlineNode = TextNode | HardBreak
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "inline".
 */
export type Inline = InlineNode[]
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "listChild".
 */
export type ListChild = Paragraph | BulletList | OrderedList
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "docChild".
 */
export type DocChild = Paragraph | Heading | BulletList | OrderedList
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "boxChild".
 */
export type BoxChild = TextBlock | ImageBlock
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedBoxChild".
 */
export type PublishedBoxChild = TextBlock | PublishedImageBlock

export interface BlocksVariants {
  draft?: Draft
  template?: TemplateDraft
  published?: PublishedBody
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "draft".
 */
export interface Draft {
  v: 1
  title: string
  cover?: MediaRef
  audio?: MediaRef
  blocks: TopBlock[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "template".
 */
export interface TemplateDraft {
  v: 1
  title: string
  cover?: MediaRef
  audio?: MediaRef
  blocks: TemplateBlock[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "published".
 */
export interface PublishedBody {
  v: 1
  title: string
  cover?: MediaRef
  audio?: MediaRef
  blocks: PublishedTopBlock[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "basicMark".
 */
export interface BasicMark {
  type: "bold" | "italic"
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "linkMark".
 */
export interface LinkMark {
  type: "link"
  attrs: {
    href: Href
  }
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "textNode".
 */
export interface TextNode {
  type: "text"
  text: string
  marks?: Marks
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "hardBreak".
 */
export interface HardBreak {
  type: "hardBreak"
  marks?: Marks
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "paragraph".
 */
export interface Paragraph {
  type: "paragraph"
  content?: Inline
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "heading".
 */
export interface Heading {
  type: "heading"
  attrs: {
    level: 2 | 3
  }
  content?: Inline
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "bulletList".
 */
export interface BulletList {
  type: "bulletList"
  /**
   * @minItems 1
   */
  content: ListItem[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "listItem".
 */
export interface ListItem {
  type: "listItem"
  /**
   * @minItems 1
   */
  content: [Paragraph, ...ListChild[]]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "orderedList".
 */
export interface OrderedList {
  type: "orderedList"
  attrs?: {
    start?: number
  }
  /**
   * @minItems 1
   */
  content: ListItem[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "doc".
 */
export interface Doc {
  type: "doc"
  /**
   * @minItems 1
   */
  content: DocChild[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "textBlock".
 */
export interface TextBlock {
  id: Uuid
  type: "text"
  doc: Doc
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "imageBlock".
 */
export interface ImageBlock {
  id: Uuid
  type: "image"
  mediaId: NullableUuid
  caption: string | null
  alt: string | null
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "boxBlock".
 */
export interface BoxBlock {
  id: Uuid
  type: "box"
  look: "fill" | "border"
  blocks: BoxChild[]
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "linkedBlock".
 */
export interface LinkedBlock {
  id: Uuid
  type: "linked"
  templateId: Uuid
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedImageBlock".
 */
export interface PublishedImageBlock {
  id: Uuid
  type: "image"
  mediaId: Uuid
  caption: string | null
  alt: string
  altFromLibrary?: true
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedTextBlock".
 */
export interface PublishedTextBlock {
  id: Uuid
  type: "text"
  doc: Doc
  templateId?: Uuid
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedTopImageBlock".
 */
export interface PublishedTopImageBlock {
  id: Uuid
  type: "image"
  mediaId: Uuid
  caption: string | null
  alt: string
  altFromLibrary?: true
  templateId?: Uuid
}
/**
 * This interface was referenced by `BlocksVariants`'s JSON-Schema
 * via the `definition` "publishedBoxBlock".
 */
export interface PublishedBoxBlock {
  id: Uuid
  type: "box"
  look: "fill" | "border"
  blocks: PublishedBoxChild[]
  templateId?: Uuid
}

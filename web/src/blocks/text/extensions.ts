// Configuration de Tiptap pour le bloc Texte : seulement ce que permet le schéma
// (docs/ARCHITECTURE-CONTENUS.md, § 2.3 et « Contrat » de l'étape 4). Le schéma de Tiptap
// nettoie ainsi le contenu collé : un h1, un h4, une citation ou un tableau deviennent des
// paragraphes, les images disparaissent, un lien javascript: ou http: perd son lien (le texte
// reste).

import { Link } from "@tiptap/extension-link"
import { ListItem, OrderedList } from "@tiptap/extension-list"
import { Placeholder } from "@tiptap/extensions"
import type { Attribute, Extensions } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { isAllowedHref } from "@/blocks/text/clean-text-doc"

// Un lien ne garde que son adresse : target, rel, class et title (venus d'un collé) sont des
// choix d'affichage, refusés par le schéma.
const HrefOnlyLink = Link.extend({
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("href"),
      },
    }
  },
})

// Une liste numérotée ne garde que son numéro de départ (pas le type « a », « i »…).
const StartOnlyOrderedList = OrderedList.extend({
  addAttributes() {
    const parent = (this.parent?.() ?? {}) as Record<string, Attribute>
    return { start: parent.start }
  },
})

// Pas de titre dans une liste : le premier enfant est un paragraphe, puis des paragraphes ou
// des listes.
const ParagraphFirstListItem = ListItem.extend({
  content: "paragraph (paragraph | bulletList | orderedList)*",
})

/** Extensions d'un bloc Texte (éditeur de l'admin et tests). */
export function textExtensions(placeholder?: string): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      // Sinon Tiptap ajoute un paragraphe vide à la fin de chaque texte.
      trailingNode: false,
      heading: { levels: [2, 3] },
      link: false,
      orderedList: false,
      listItem: false,
    }),
    HrefOnlyLink.configure({
      openOnClick: false,
      protocols: [],
      defaultProtocol: "https",
      isAllowedUri: (url) => isAllowedHref(url),
      shouldAutoLink: (url) => isAllowedHref(url),
    }),
    StartOnlyOrderedList,
    ParagraphFirstListItem,
  ]
  if (placeholder) {
    extensions.push(Placeholder.configure({ placeholder }))
  }
  return extensions
}

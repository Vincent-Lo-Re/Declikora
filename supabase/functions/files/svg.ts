// Vérification d'un SVG côté serveur (docs/ARCHITECTURE-CONTENUS.md, § 4.3).
//
// L'admin nettoie les SVG avec DOMPurify avant l'envoi, mais la base ne fait pas confiance au
// navigateur : ici, on REFUSE (sans réécrire) tout SVG qui pourrait exécuter du code ou charger
// une ressource extérieure. Analyse XML réelle (@xmldom/xmldom), avec une liste BLANCHE
// d'éléments : les références de caractères (« &#x6A;avascript: ») sont décodées avant la
// vérification, et une entité déclarée ou inconnue fait refuser le fichier.

import {
  type Attr,
  type Document,
  type DocumentType,
  DOMParser,
  type Element,
  type Node,
  type ProcessingInstruction,
} from "@xmldom/xmldom"

export type CheckResult = { ok: true } | { ok: false; reason: string; detail: string }

// Codes des raisons de refus (colonne media.reject_reason), traduits par l'interface.
export const svgReasons = {
  unreadable: "svg_illisible",
  forbiddenElement: "svg_element_interdit",
  forbiddenAttribute: "svg_attribut_interdit",
  externalLink: "svg_lien_externe",
} as const

const SVG_NS = "http://www.w3.org/2000/svg"
const XLINK_NS = "http://www.w3.org/1999/xlink"
const XML_NS = "http://www.w3.org/XML/1998/namespace"
const XMLNS_NS = "http://www.w3.org/2000/xmlns/"

// Éléments permis (espace de noms SVG seulement). Pas de script, foreignObject, animate, set,
// animateMotion, animateTransform, a, iframe, embed, object…
const allowedElements = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "image",
  "title",
  "desc",
  "metadata",
  "style",
  "switch",
  "view",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
])

// Éléments dont href peut viser une image intégrée (data:image/png|jpeg|webp;base64).
const rasterHrefElements = new Set(["image", "feImage"])

const localReference = /^#[^\s"'()<>]+$/
const rasterDataUrl = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]*$/i

// Adresses dans le CSS : seules les références locales « url(#id) » sont permises.
const cssUrl = /url\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi

// Fonctions CSS qui chargent une image sans passer par url() : image-set("…" 1x) (et
// -webkit-image-set) prend une simple chaîne comme adresse ; image(), cross-fade(), element()
// et src() aussi (ou le feront). Toutes refusées (« image-set( » couvre -webkit-image-set).
const cssLoadingFunctions = ["image-set(", "image(", "cross-fade(", "element(", "src("]

// Caractères hors de la grammaire XML 1.0 (Char) : caractères de contrôle C0 sauf tabulation,
// retour à la ligne et retour chariot, et U+FFFE / U+FFFF. Un XML valide n'en contient pas ;
// ESC (0x1B) sert aux encodages à états (ISO-2022-JP) qui feraient lire au navigateur autre
// chose que ce que le serveur a vérifié.
// deno-lint-ignore no-control-regex
const forbiddenCharacters = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/

// Déclaration XML en tête du fichier, et son encodage éventuel.
const xmlDeclaration = /^<\?xml(?=[\s?])[^>]*?\?>/
const declaredEncoding = /\sencoding\s*=\s*(["'])([^"']*)\1/

function refuse(reason: string, detail: string): CheckResult {
  return { ok: false, reason, detail }
}

// Valeur débarrassée des blancs et caractères de contrôle, que le navigateur ignore dans un
// schéma d'adresse (« java\tscript: »).
function compact(value: string): string {
  // deno-lint-ignore no-control-regex
  return value.replace(/[\u0000- \u007f-\u009f]+/g, "").toLowerCase()
}

/** Chaînes du CSS ('…' ou "…"), sans les guillemets. */
function cssStrings(css: string): string[] {
  const strings: string[] = []
  let index = 0
  while (index < css.length) {
    const quote = css[index]
    if (quote === "'" || quote === '"') {
      const end = css.indexOf(quote, index + 1)
      strings.push(css.slice(index + 1, end === -1 ? css.length : end))
      index = end === -1 ? css.length : end + 1
    } else {
      index++
    }
  }
  return strings
}

// Vérifie du CSS (élément <style> ou attribut style) : pas d'import, pas d'adresse extérieure
// (ni dans url(), ni dans une chaîne, ni par image-set() et ses cousines), pas d'échappement
// (qui permettrait de masquer « url( »), pas de vieilles extensions actives.
function checkCss(css: string, where: string): CheckResult {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
  const flat = compact(withoutComments)
  if (withoutComments.includes("\\")) {
    return refuse(svgReasons.forbiddenAttribute, `${where} : échappement CSS`)
  }
  if (flat.includes("@import") || flat.includes("@font-face")) {
    return refuse(svgReasons.externalLink, `${where} : @import ou @font-face`)
  }
  if (
    flat.includes("expression(") || flat.includes("javascript:") ||
    flat.includes("-moz-binding") || flat.includes("behavior:")
  ) {
    return refuse(svgReasons.forbiddenAttribute, `${where} : CSS actif`)
  }
  const loading = cssLoadingFunctions.find((name) => flat.includes(name))
  if (loading) {
    return refuse(svgReasons.externalLink, `${where} : ${loading})`)
  }
  // Une chaîne qui ressemble à une adresse (« https:… », « //… », « data:… ») : refusée,
  // quelle que soit la propriété qui la porte.
  for (const text of cssStrings(withoutComments)) {
    if (/^([a-z][a-z0-9+.-]*:|\/\/)/.test(compact(text))) {
      return refuse(svgReasons.externalLink, `${where} : "${text.slice(0, 80)}"`)
    }
  }
  for (const match of withoutComments.matchAll(cssUrl)) {
    if (!localReference.test(match[2].trim())) {
      return refuse(svgReasons.externalLink, `${where} : url(${match[2]})`)
    }
  }
  // Un « url( » que l'expression n'a pas reconnu (mal formé) est refusé par prudence.
  const urlCount = (flat.match(/url\(/g) ?? []).length
  if (urlCount !== [...withoutComments.matchAll(cssUrl)].length) {
    return refuse(svgReasons.externalLink, `${where} : url() mal formé`)
  }
  return { ok: true }
}

function checkAttribute(element: Element, attribute: Attr): CheckResult {
  const namespace = attribute.namespaceURI
  const localName = (attribute.localName ?? attribute.name).toString()
  const value = attribute.value ?? ""
  const where = `<${element.localName} ${attribute.name}>`

  // Déclarations d'espaces de noms : de simples déclarations, sans effet.
  if (namespace === XMLNS_NS || attribute.name === "xmlns" || attribute.name.startsWith("xmlns:")) {
    return { ok: true }
  }
  if (namespace !== null && namespace !== XLINK_NS && namespace !== XML_NS) {
    return refuse(svgReasons.forbiddenAttribute, `${where} : espace de noms ${namespace}`)
  }
  if (localName.toLowerCase().startsWith("on")) {
    return refuse(svgReasons.forbiddenAttribute, `${where} : gestionnaire d'événement`)
  }

  if (localName === "href" && (namespace === null || namespace === XLINK_NS)) {
    const target = value.trim()
    if (localReference.test(target)) return { ok: true }
    if (rasterHrefElements.has(element.localName ?? "") && rasterDataUrl.test(target)) {
      return { ok: true }
    }
    return refuse(svgReasons.externalLink, `${where} : ${target.slice(0, 80)}`)
  }

  const flat = compact(value)
  if (/^(javascript|vbscript|data|livescript):/.test(flat) || flat.includes("javascript:")) {
    return refuse(svgReasons.forbiddenAttribute, `${where} : adresse active`)
  }
  if (localName === "style") return checkCss(value, where)
  if (flat.includes("url(")) return checkCss(value, where)
  return { ok: true }
}

/**
 * Le texte a été lu en UTF-8 : le navigateur doit le lire pareil. Storage sert le fichier en
 * « image/svg+xml » sans charset, donc le navigateur suit la déclaration <?xml encoding?>.
 * Refuse un autre encodage que UTF-8, une déclaration ailleurs qu'au tout début (le navigateur
 * ne la lirait pas, xmldom si), et les caractères hors XML 1.0.
 */
function checkEncoding(text: string): CheckResult | null {
  const bad = forbiddenCharacters.exec(text)
  if (bad) {
    const code = bad[0].charCodeAt(0).toString(16).padStart(4, "0")
    return refuse(svgReasons.unreadable, `caractère interdit U+${code}`)
  }
  const declaration = xmlDeclaration.exec(text)
  if (declaration) {
    const encoding = declaredEncoding.exec(declaration[0])
    if (encoding && encoding[2].trim().toLowerCase() !== "utf-8") {
      return refuse(svgReasons.unreadable, `encodage déclaré : ${encoding[2].slice(0, 40)}`)
    }
  }
  const rest = declaration ? text.slice(declaration[0].length) : text
  if (/<\?xml(?=[\s?])/i.test(rest)) {
    return refuse(svgReasons.unreadable, "déclaration <?xml?> ailleurs qu'au début")
  }
  return null
}

/** Vérifie un SVG (texte UTF-8). Refuse au premier problème trouvé. */
export function checkSvg(text: string): CheckResult {
  const encodingProblem = checkEncoding(text)
  if (encodingProblem) return encodingProblem
  let document: Document
  try {
    const parser = new DOMParser({
      onError: (level: string, message: string) => {
        if (level !== "warning") throw new Error(message)
      },
    })
    // « text/xml » et non « image/svg+xml » : xmldom donnerait sinon l'espace de noms SVG à
    // un <svg> qui n'en déclare pas, alors que le navigateur ne l'affiche pas.
    document = parser.parseFromString(text, "text/xml")
  } catch (error) {
    return refuse(
      svgReasons.unreadable,
      `analyse : ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`,
    )
  }

  const root = document.documentElement
  if (!root || root.localName !== "svg" || root.namespaceURI !== SVG_NS) {
    return refuse(svgReasons.unreadable, "la racine n'est pas un élément <svg> SVG")
  }

  // Parcours sans récursion (un SVG peut avoir des dizaines de milliers d'éléments).
  const stack: Node[] = [...Array.from(document.childNodes)]
  while (stack.length > 0) {
    const node = stack.pop()!
    switch (node.nodeType) {
      case 1: {
        const element = node as Element
        const name = element.localName ?? ""
        if (element.namespaceURI !== SVG_NS || !allowedElements.has(name)) {
          return refuse(
            svgReasons.forbiddenElement,
            `<${element.tagName}> (${element.namespaceURI ?? "sans espace de noms"})`,
          )
        }
        for (const attribute of Array.from(element.attributes)) {
          const result = checkAttribute(element, attribute)
          if (!result.ok) return result
        }
        if (name === "style") {
          const result = checkCss(element.textContent ?? "", "<style>")
          if (!result.ok) return result
        }
        break
      }
      case 3: // texte
      case 4: // CDATA
      case 8: // commentaire
        break
      case 7: {
        // Instruction de traitement : seule la déclaration <?xml … ?> est permise
        // (<?xml-stylesheet?> chargerait une feuille de style extérieure).
        const target = (node as ProcessingInstruction).target
        if (target !== "xml") {
          return refuse(svgReasons.forbiddenElement, `<?${target}?>`)
        }
        break
      }
      case 10: {
        // DOCTYPE : permis seul, refusé avec des déclarations (entités, « billion laughs »).
        const internalSubset = (node as DocumentType).internalSubset
        if (internalSubset && internalSubset.trim() !== "") {
          return refuse(svgReasons.unreadable, "DOCTYPE avec des déclarations")
        }
        break
      }
      default:
        return refuse(svgReasons.forbiddenElement, `nœud de type ${node.nodeType}`)
    }
    for (const child of Array.from(node.childNodes ?? [])) stack.push(child)
  }
  return { ok: true }
}

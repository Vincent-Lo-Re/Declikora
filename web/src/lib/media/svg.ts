// Nettoyage des SVG avant l'envoi (§ 4.3), puis la même vérification que la fonction « files »
// (supabase/functions/files/svg.ts), pour qu'un SVG nettoyé ici soit toujours accepté là-bas.
//
// 1. Caractères hors XML 1.0 refusés ; prologue <?xml?> retiré (le fichier envoyé est toujours
//    en UTF-8, sans déclaration d'encodage) ; DOCTYPE à déclarations (entités) refusé, DOCTYPE
//    simple retiré.
// 2. DOMPurify 3.4.16, réglage de l'architecture : profils svg et svgFilters, ADD_TAGS ["use"],
//    FORBID_TAGS ["a"], href local ou image intégrée seulement, attribut style sans url()
//    extérieure ni @import.
// 3. Un second passage retire ce que le serveur refuserait encore (liste blanche d'éléments,
//    attributs d'autres espaces de noms, élément <style> avec @import, url() extérieure,
//    image-set(), chaîne en forme d'adresse ou échappement…), puis le résultat est vérifié
//    avec ses règles.
//
// Un <style> sans adresse extérieure est GARDÉ (le serveur l'accepte) : les exports
// d'Illustrator y mettent leurs couleurs (.st0 { fill: … }). Sinon, il est retiré entier.

import DOMPurify, { type DOMPurify as Purifier } from "dompurify"

export type SvgReason =
  | "svg_illisible"
  | "svg_element_interdit"
  | "svg_attribut_interdit"
  | "svg_lien_externe"

export type SvgCheck = { ok: true } | { ok: false; reason: SvgReason }

export class SvgError extends Error {
  readonly reason: SvgReason

  constructor(reason: SvgReason) {
    super(reason)
    this.name = "SvgError"
    this.reason = reason
  }
}

const SVG_NS = "http://www.w3.org/2000/svg"
const XLINK_NS = "http://www.w3.org/1999/xlink"
const XML_NS = "http://www.w3.org/XML/1998/namespace"
const XMLNS_NS = "http://www.w3.org/2000/xmlns/"

// Même liste blanche que la fonction « files ».
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
const rasterHrefElements = new Set(["image", "feImage"])

const localReference = /^#[^\s"'()<>]+$/
const rasterDataUrl = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]*$/i
const cssUrl = /url\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi
// Fonctions CSS qui chargent une image sans url() (image-set("…" 1x), -webkit-image-set…).
const cssLoadingFunctions = [
  "image-set(",
  "image(",
  "cross-fade(",
  "element(",
  "src(",
]
// Caractères hors de XML 1.0 (contrôles C0 sauf tabulation et retours, U+FFFE, U+FFFF).
const forbiddenCharacters =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/
const xmlDeclaration = /^<\?xml(?=[\s?])[^>]*?\?>/
const declaredEncoding = /\sencoding\s*=\s*(["'])([^"']*)\1/

function compact(value: string): string {
  // eslint-disable-next-line no-control-regex
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

/** Même règle que le serveur pour du CSS (élément <style> ou attribut style). */
function checkCss(css: string): SvgCheck {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "")
  const flat = compact(withoutComments)
  if (withoutComments.includes("\\")) {
    return { ok: false, reason: "svg_attribut_interdit" }
  }
  if (flat.includes("@import") || flat.includes("@font-face")) {
    return { ok: false, reason: "svg_lien_externe" }
  }
  if (
    flat.includes("expression(") ||
    flat.includes("javascript:") ||
    flat.includes("-moz-binding") ||
    flat.includes("behavior:")
  ) {
    return { ok: false, reason: "svg_attribut_interdit" }
  }
  if (cssLoadingFunctions.some((name) => flat.includes(name))) {
    return { ok: false, reason: "svg_lien_externe" }
  }
  // Une chaîne qui ressemble à une adresse (« https:… », « //… », « data:… »).
  if (
    cssStrings(withoutComments).some((text) =>
      /^([a-z][a-z0-9+.-]*:|\/\/)/.test(compact(text))
    )
  ) {
    return { ok: false, reason: "svg_lien_externe" }
  }
  const urls = [...withoutComments.matchAll(cssUrl)]
  if (urls.some((match) => !localReference.test(match[2].trim()))) {
    return { ok: false, reason: "svg_lien_externe" }
  }
  if ((flat.match(/url\(/g) ?? []).length !== urls.length) {
    return { ok: false, reason: "svg_lien_externe" }
  }
  return { ok: true }
}

/** Même règle que le serveur pour un attribut. */
function checkAttribute(element: Element, attribute: Attr): SvgCheck {
  const namespace = attribute.namespaceURI
  const localName = attribute.localName
  const value = attribute.value

  if (
    namespace === XMLNS_NS ||
    attribute.name === "xmlns" ||
    attribute.name.startsWith("xmlns:")
  ) {
    return { ok: true }
  }
  if (namespace !== null && namespace !== XLINK_NS && namespace !== XML_NS) {
    return { ok: false, reason: "svg_attribut_interdit" }
  }
  if (localName.toLowerCase().startsWith("on")) {
    return { ok: false, reason: "svg_attribut_interdit" }
  }
  if (localName === "href" && (namespace === null || namespace === XLINK_NS)) {
    const target = value.trim()
    if (localReference.test(target)) return { ok: true }
    if (
      rasterHrefElements.has(element.localName) &&
      rasterDataUrl.test(target)
    ) {
      return { ok: true }
    }
    return { ok: false, reason: "svg_lien_externe" }
  }
  const flat = compact(value)
  if (
    /^(javascript|vbscript|data|livescript):/.test(flat) ||
    flat.includes("javascript:")
  ) {
    return { ok: false, reason: "svg_attribut_interdit" }
  }
  if (localName === "style" || flat.includes("url(")) return checkCss(value)
  return { ok: true }
}

/**
 * Même règle que le serveur pour l'encodage : le texte est lu en UTF-8, le navigateur doit le
 * lire pareil (Storage sert le fichier sans charset, le navigateur suit <?xml encoding?>).
 */
function checkEncoding(text: string): SvgCheck {
  if (forbiddenCharacters.test(text))
    return { ok: false, reason: "svg_illisible" }
  const declaration = xmlDeclaration.exec(text)
  const encoding = declaration && declaredEncoding.exec(declaration[0])
  if (encoding && encoding[2].trim().toLowerCase() !== "utf-8") {
    return { ok: false, reason: "svg_illisible" }
  }
  const rest = declaration ? text.slice(declaration[0].length) : text
  if (/<\?xml(?=[\s?])/i.test(rest))
    return { ok: false, reason: "svg_illisible" }
  return { ok: true }
}

/** Même vérification que la fonction « files », sur le texte d'un SVG. */
export function checkSvgMarkup(markup: string): SvgCheck {
  const encoding = checkEncoding(markup)
  if (!encoding.ok) return encoding
  const document = new DOMParser().parseFromString(markup, "image/svg+xml")
  if (document.getElementsByTagName("parsererror").length > 0) {
    return { ok: false, reason: "svg_illisible" }
  }
  const root = document.documentElement
  if (root.localName !== "svg" || root.namespaceURI !== SVG_NS) {
    return { ok: false, reason: "svg_illisible" }
  }
  const stack: Node[] = [...Array.from(document.childNodes)]
  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      if (
        element.namespaceURI !== SVG_NS ||
        !allowedElements.has(element.localName)
      ) {
        return { ok: false, reason: "svg_element_interdit" }
      }
      for (const attribute of Array.from(element.attributes)) {
        const result = checkAttribute(element, attribute)
        if (!result.ok) return result
      }
      if (element.localName === "style") {
        const result = checkCss(element.textContent ?? "")
        if (!result.ok) return result
      }
    } else if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
      if ((node as ProcessingInstruction).target !== "xml") {
        return { ok: false, reason: "svg_element_interdit" }
      }
    } else if (node.nodeType === Node.DOCUMENT_TYPE_NODE) {
      return { ok: false, reason: "svg_illisible" }
    } else if (
      node.nodeType !== Node.TEXT_NODE &&
      node.nodeType !== Node.CDATA_SECTION_NODE &&
      node.nodeType !== Node.COMMENT_NODE
    ) {
      return { ok: false, reason: "svg_element_interdit" }
    }
    stack.push(...Array.from(node.childNodes))
  }
  return { ok: true }
}

let purifier: Purifier | null = null

/** DOMPurify avec le réglage de l'admin (créé une fois, avec ses règles pour href et style). */
function getPurifier(): Purifier {
  if (purifier) return purifier
  const instance = DOMPurify(window)
  instance.addHook("uponSanitizeAttribute", (node, data) => {
    const name = data.attrName.toLowerCase()
    const value = data.attrValue.trim()
    if (name === "href" || name === "xlink:href") {
      const keep =
        localReference.test(value) ||
        (rasterHrefElements.has(node.localName) && rasterDataUrl.test(value))
      if (!keep) data.keepAttr = false
      return
    }
    if (name === "style" || compact(value).includes("url(")) {
      if (!checkCss(value).ok) data.keepAttr = false
    }
  })
  purifier = instance
  return instance
}

/** Retire ce que le serveur refuserait encore après DOMPurify. */
function removeForbidden(root: Element) {
  const stack: Element[] = [root]
  while (stack.length > 0) {
    const element = stack.pop()!
    for (const child of Array.from(element.children)) {
      if (
        child.namespaceURI !== SVG_NS ||
        !allowedElements.has(child.localName) ||
        (child.localName === "style" && !checkCss(child.textContent ?? "").ok)
      ) {
        child.remove()
      } else {
        stack.push(child)
      }
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!checkAttribute(element, attribute).ok) {
        element.removeAttributeNode(attribute)
      }
    }
  }
}

function readLength(value: string | null): number | null {
  if (!value) return null
  const match = /^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$/.exec(value)
  if (!match) return null
  const number = Math.round(Number(match[1]))
  return number >= 1 && number <= 100_000 ? number : null
}

/** Dimensions d'un SVG : ses attributs width et height en pixels, sinon sa viewBox. */
function readDimensions(svg: Element): {
  width: number | null
  height: number | null
} {
  const width = readLength(svg.getAttribute("width"))
  const height = readLength(svg.getAttribute("height"))
  if (width !== null && height !== null) return { width, height }
  const box = (svg.getAttribute("viewBox") ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (box.length === 4 && box.every(Number.isFinite)) {
    const boxWidth = readLength(String(box[2]))
    const boxHeight = readLength(String(box[3]))
    if (boxWidth !== null && boxHeight !== null) {
      return { width: boxWidth, height: boxHeight }
    }
  }
  return { width: null, height: null }
}

export type CleanSvg = {
  markup: string
  width: number | null
  height: number | null
}

/**
 * Nettoie un SVG. Lève une SvgError si le fichier n'est pas un SVG lisible, s'il déclare des
 * entités, ou si le résultat serait encore refusé par la fonction « files ».
 */
export function cleanSvg(text: string): CleanSvg {
  let source = text.replace(/^\uFEFF/, "").trimStart()
  // Caractères de contrôle (ESC des encodages à états comme ISO-2022-JP…) : refusés, comme
  // par le serveur, plutôt que retirés en silence.
  if (forbiddenCharacters.test(source)) throw new SvgError("svg_illisible")
  // Prologue <?xml … ?> (et d'éventuels commentaires avant la racine, retirés par DOMPurify).
  source = source.replace(/^<\?xml[\s\S]*?\?>/, "")
  if (/<!ENTITY/i.test(source) || /<!DOCTYPE[^>[]*\[/i.test(source)) {
    throw new SvgError("svg_illisible")
  }
  source = source.replace(/<!DOCTYPE[^>]*>/i, "")

  const fragment = getPurifier().sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    FORBID_TAGS: ["a"],
    RETURN_DOM_FRAGMENT: true,
  })
  const svg = Array.from(fragment.children).find(
    (element) => element.localName === "svg" && element.namespaceURI === SVG_NS
  )
  if (!svg) throw new SvgError("svg_illisible")

  removeForbidden(svg)
  // XMLSerializer (et non le HTML) : un XML bien formé, avec ses espaces de noms, que le
  // serveur relit avec un vrai analyseur XML.
  const markup = new XMLSerializer().serializeToString(svg)
  const check = checkSvgMarkup(markup)
  if (!check.ok) throw new SvgError(check.reason)
  return { markup, ...readDimensions(svg) }
}

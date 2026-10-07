// Les couleurs d'un logo SVG (Paramètres, logotype et monogramme ; ADMIN § 7) : savoir si elles
// sont modifiables, trouver la couleur principale et la couleur d'accent, puis décliner le logo
// aux couleurs d'une palette. Sans React ; le SVG arrive déjà nettoyé (cleanSvg).

const SVG_NS = "http://www.w3.org/2000/svg"

/** Les couleurs d'un SVG modifiable, en #rrggbb ; l'une des deux peut manquer. */
export type SvgColors = { main: string | null; accent: string | null }

// Au-delà, le dessin est trop riche pour qu'on le recolore sans le trahir.
const MAX_COLORS = 4
// Ce qui rend un SVG non modifiable : une image, un dégradé ou un motif.
const UNSUPPORTED = ["image", "linearGradient", "radialGradient", "pattern"]
// Les formes qui se remplissent en noir quand rien ne dit leur couleur.
const SHAPES = ["path", "rect", "circle", "ellipse", "polygon", "text"]
const COLOR_PROPERTIES = ["fill", "stroke", "stop-color", "color"]
const NO_COLOR = new Set(["none", "transparent", "currentcolor", "inherit"])
const NAMED: Record<string, string> = { black: "#000000", white: "#ffffff" }

const hex2 = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0")

/**
 * Une couleur oklch (celles des thèmes de shadcn, que portent les logos déclinés par palette) en
 * sRGB, chaque canal de 0 à 255.
 */
function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ]
  return linear.map((value) => {
    const v = Math.min(1, Math.max(0, value))
    return (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255
  }) as [number, number, number]
}

/** Une couleur CSS en #rrggbb ; null si on ne la reconnaît pas (le SVG n'est alors pas modifiable). */
export function normalizeColor(value: string): string | null {
  const color = value.trim().toLowerCase()
  if (NAMED[color]) return NAMED[color]
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/.exec(color)
  if (short)
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
  const long = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(color)
  if (long) return `#${long[1]}`
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color)
  if (rgb) return `#${hex2(+rgb[1])}${hex2(+rgb[2])}${hex2(+rgb[3])}`
  const oklch = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(color)
  if (oklch) {
    const lightness = +oklch[1] / (oklch[2] ? 100 : 1)
    const [r, g, b] = oklchToRgb(lightness, +oklch[3], +oklch[4])
    return `#${hex2(r)}${hex2(g)}${hex2(b)}`
  }
  return null
}

/** Saturation et luminosité (0 à 1) d'une couleur #rrggbb. */
function saturationLightness(hex: string): { s: number; l: number } {
  const [r, g, b] = [1, 3, 5].map(
    (at) => parseInt(hex.slice(at, at + 2), 16) / 255
  )
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1))
  return { s, l }
}

/** Une couleur vive : ni gris, ni presque noire, ni presque blanche. */
function isVivid(hex: string): boolean {
  const { s, l } = saturationLightness(hex)
  return s >= 0.2 && l > 0.1 && l < 0.92
}

function parse(markup: string): SVGSVGElement | null {
  const root = new DOMParser().parseFromString(
    markup,
    "image/svg+xml"
  ).documentElement
  return root.localName === "svg" && root.namespaceURI === SVG_NS
    ? (root as unknown as SVGSVGElement)
    : null
}

/** Les couleurs d'une déclaration style="fill: …; stroke: …". */
function styleColors(style: string): string[] {
  return style
    .split(";")
    .map((declaration) => declaration.split(":"))
    .filter(([name]) => COLOR_PROPERTIES.includes(name?.trim().toLowerCase()))
    .map(([, value]) => value?.trim() ?? "")
}

/** Toutes les couleurs écrites dans le SVG (attributs, style, feuille <style>), une par emploi. */
function writtenColors(svg: SVGSVGElement): string[] {
  const colors: string[] = []
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    for (const name of COLOR_PROPERTIES) {
      const value = element.getAttribute(name)
      if (value) colors.push(value)
    }
    const style = element.getAttribute("style")
    if (style) colors.push(...styleColors(style))
    if (element.localName === "style") {
      for (const match of (element.textContent ?? "").matchAll(
        /(?:fill|stroke|stop-color|color)\s*:\s*([^;}]+)/gi
      )) {
        colors.push(match[1])
      }
    }
  }
  return colors
}

/** Les formes qui n'ont de couleur nulle part (ni elles ni leurs parents) : elles sont noires. */
function defaultBlackShapes(svg: SVGSVGElement): number {
  // Une feuille <style> peut colorer par classe : on ne devine pas.
  if (svg.querySelector("style")) return 0
  let count = 0
  for (const shape of svg.querySelectorAll(SHAPES.join(","))) {
    let colored = false
    for (let node: Element | null = shape; node; node = node.parentElement) {
      const style = node.getAttribute("style") ?? ""
      if (node.hasAttribute("fill") || /(^|;)\s*fill\s*:/i.test(style)) {
        colored = true
        break
      }
    }
    if (!colored) count++
  }
  return count
}

/**
 * Les couleurs d'un SVG, s'il est modifiable : seulement des couleurs pleines qu'on reconnaît, au
 * plus quatre, sans image, dégradé ni motif. La couleur principale est le gris (noir, blanc…) le
 * plus employé ; l'accent, la couleur vive la plus employée. null : pas modifiable.
 */
export function analyzeSvgColors(markup: string): SvgColors | null {
  const svg = parse(markup)
  if (!svg) return null
  if (UNSUPPORTED.some((name) => svg.getElementsByTagName(name).length > 0)) {
    return null
  }
  const uses = new Map<string, number>()
  for (const written of writtenColors(svg)) {
    if (NO_COLOR.has(written.trim().toLowerCase())) continue
    const color = normalizeColor(written)
    if (!color) return null
    uses.set(color, (uses.get(color) ?? 0) + 1)
  }
  const black = defaultBlackShapes(svg)
  if (black > 0) uses.set("#000000", (uses.get("#000000") ?? 0) + black)
  if (uses.size === 0 || uses.size > MAX_COLORS) return null

  const ranked = [...uses].sort((a, b) => b[1] - a[1]).map(([color]) => color)
  return {
    main: ranked.find((color) => !isVivid(color)) ?? null,
    accent: ranked.find(isVivid) ?? null,
  }
}

/**
 * Le SVG aux couleurs demandées : la couleur principale et l'accent sont remplacés partout où ils
 * sont écrits ; les autres couleurs (un détail blanc…) restent. Les formes noires par défaut
 * prennent la couleur principale si le noir l'était.
 */
export function recolorSvg(
  markup: string,
  from: SvgColors,
  to: { main: string; accent: string }
): string {
  const svg = parse(markup)
  if (!svg) return markup
  const replace = (value: string) => {
    const color = normalizeColor(value)
    if (color && color === from.main) return to.main
    if (color && color === from.accent) return to.accent
    return value
  }
  for (const element of [svg, ...svg.querySelectorAll("*")]) {
    for (const name of COLOR_PROPERTIES) {
      const value = element.getAttribute(name)
      if (value) element.setAttribute(name, replace(value))
    }
    const style = element.getAttribute("style")
    if (style) {
      element.setAttribute(
        "style",
        style.replace(
          /((?:fill|stroke|stop-color|color)\s*:\s*)([^;]+)/gi,
          (_, name: string, value: string) => `${name}${replace(value)}`
        )
      )
    }
    if (element.localName === "style" && element.textContent) {
      element.textContent = element.textContent.replace(
        /((?:fill|stroke|stop-color|color)\s*:\s*)([^;}]+)/gi,
        (_, name: string, value: string) => `${name}${replace(value)}`
      )
    }
  }
  // Les formes sans couleur héritent de la racine : elle prend la nouvelle couleur du noir.
  if (from.main === "#000000" && !svg.hasAttribute("fill")) {
    svg.setAttribute("fill", to.main)
  }
  return new XMLSerializer().serializeToString(svg)
}

/** Une image data: d'un SVG, pour un aperçu avant l'envoi. */
export function svgDataUrl(markup: string): string {
  return `data:image/svg+xml,${encodeURIComponent(markup)}`
}

// Le monogramme animé de l'écran de connexion (ADMIN § 2, « La connexion en slides ») : trois
// animations qui s'enchaînent, séparées par des pauses (le tracé, la lueur de l'accent, la
// respiration). Un SVG aux couleurs modifiables (lib/brand-colors.ts) est préparé pour être
// montré en ligne, ses formes marquées pour le CSS (index.css, data-motion) ; un autre fichier
// (PNG, WebP, SVG non modifiable) ne fait que respirer. Sans React.

import { analyzeSvgColors, normalizeColor } from "@/lib/brand-colors"
import { cleanSvg } from "@/lib/media/svg"

/** Une étape de la boucle : une animation, ou une pause. */
export type MotionPhase = "trace" | "glint" | "breathe" | "rest"

/** La durée de chaque animation (index.css) et des pauses, en millisecondes. */
const PHASE_MS: Record<MotionPhase, number> = {
  trace: 2_800,
  glint: 2_400,
  breathe: 3_000,
  rest: 4_000,
}

const SHAPES = "path, rect, circle, ellipse, line, polyline, polygon, text"

/** Un SVG prêt à animer : son texte nettoyé et marqué, et ce qu'il sait faire. */
export type AnimatedSvg = { markup: string; glint: boolean }

/** La couleur d'une propriété (fill, stroke) d'une forme, héritée de ses parents. */
function paintOf(element: Element, property: "fill" | "stroke"): string | null {
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = node.getAttribute("style") ?? ""
    const inline = new RegExp(
      `(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`,
      "i"
    ).exec(style)
    const value = inline?.[1] ?? node.getAttribute(property)
    if (value) return value.trim().toLowerCase()
  }
  return null
}

const painted = (value: string | null) =>
  value !== null && value !== "none" && value !== "transparent"

/**
 * Prépare un SVG pour l'animation, s'il est compatible (couleurs modifiables) ; null sinon. Les
 * formes tracées (un contour) se dessinent l'une après l'autre (data-motion="trace", pathLength),
 * puis les formes pleines apparaissent (data-motion="reveal") ; celles de la couleur d'accent
 * portent data-accent (la lueur). La taille vient du cadre : largeur et hauteur retirées.
 */
export function prepareAnimatedSvg(text: string): AnimatedSvg | null {
  let markup: string
  try {
    markup = cleanSvg(text).markup
  } catch {
    return null
  }
  const colors = analyzeSvgColors(markup)
  if (!colors) return null
  const svg = new DOMParser().parseFromString(
    markup,
    "image/svg+xml"
  ).documentElement
  svg.removeAttribute("width")
  svg.removeAttribute("height")
  svg.setAttribute("aria-hidden", "true")
  svg.removeAttribute("role")
  svg.removeAttribute("aria-labelledby")

  const accent = colors.accent
  let order = 0
  let glint = false
  const shapes = [...svg.querySelectorAll(SHAPES)]
  // Les contours d'abord, dans l'ordre du dessin ; les formes pleines ensuite.
  const traced = shapes.filter((shape) => painted(paintOf(shape, "stroke")))
  const filled = shapes.filter((shape) => !traced.includes(shape))
  for (const shape of [...traced, ...filled]) {
    const isTraced = traced.includes(shape)
    shape.setAttribute("data-motion", isTraced ? "trace" : "reveal")
    if (isTraced) shape.setAttribute("pathLength", "1")
    // Le rang, pour décaler chaque forme (index.css).
    shape.setAttribute(
      "style",
      `${shape.getAttribute("style") ?? ""};--motion-order:${order++}`
    )
    const paint = paintOf(shape, isTraced ? "stroke" : "fill")
    if (accent && paint && normalizeColor(paint) === accent) {
      shape.setAttribute("data-accent", "")
      glint = true
    }
  }
  return { markup: new XMLSerializer().serializeToString(svg), glint }
}

/**
 * La boucle des animations : le tracé (SVG compatible), la lueur (s'il a un accent), la
 * respiration, chacune suivie d'une pause. Un fichier non compatible ne fait que respirer.
 */
export function motionLoop(
  svg: AnimatedSvg | null
): { phase: MotionPhase; ms: number }[] {
  const animations: MotionPhase[] = svg
    ? ["trace", ...(svg.glint ? (["glint"] as const) : []), "breathe"]
    : ["breathe"]
  return animations.flatMap((phase) => [
    { phase, ms: PHASE_MS[phase] },
    { phase: "rest" as const, ms: PHASE_MS.rest },
  ])
}

/** Le texte d'un SVG à son adresse (data: des logos de Ruche, ou fichier de l'espace « marque »). */
export async function fetchSvgText(url: string): Promise<string | null> {
  if (url.startsWith("data:image/svg+xml,")) {
    return decodeURIComponent(url.slice("data:image/svg+xml,".length))
  }
  if (!/\.svg(\?|$)/i.test(url)) return null
  const response = await fetch(url)
  return response.ok ? response.text() : null
}

// Le monogramme animé de l'écran de connexion (ADMIN § 2, « La connexion en slides ») : les
// animations cochées par un admin (Paramètres, section « Écran de connexion ») s'enchaînent dans
// un ordre fixe, séparées par des pauses. Un SVG aux couleurs modifiables (lib/brand-colors.ts)
// est préparé pour être montré en ligne, ses formes marquées pour le CSS (index.css, data-motion) ;
// un autre fichier (PNG, WebP, SVG non modifiable) ne joue que les animations de tout le
// monogramme. Sans React.

import { analyzeSvgColors, normalizeColor } from "@/lib/brand-colors"
import { cleanSvg } from "@/lib/media/svg"

/**
 * Les animations, dans l'ordre où elles se jouent : le tracé, la cascade, la lueur de l'accent,
 * le reflet, le halo, le balancement, la respiration (colonne login_monogram_motions).
 */
export const MOTIONS = [
  "trace",
  "cascade",
  "glint",
  "shine",
  "halo",
  "sway",
  "breathe",
] as const

export type Motion = (typeof MOTIONS)[number]

/** Celles qui animent les formes une à une : il leur faut un SVG compatible. */
const SVG_MOTIONS: readonly Motion[] = ["trace", "cascade", "glint"]

/** Le départ, et le repli quand aucune animation cochée ne convient au fichier. */
export const DEFAULT_MOTIONS: Motion[] = ["trace", "glint", "breathe"]

export const isMotion = (value: string): value is Motion =>
  (MOTIONS as readonly string[]).includes(value)

/** Une étape de la boucle : une animation, ou une pause. */
export type MotionPhase = Motion | "rest"

/** La durée de chaque animation (index.css) et des pauses, en millisecondes. */
const PHASE_MS: Record<MotionPhase, number> = {
  trace: 2_800,
  cascade: 2_400,
  glint: 2_400,
  shine: 2_000,
  halo: 2_400,
  sway: 3_000,
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
 * Ce qui empêche l'animation de se jouer sur ce fichier (null : pas un SVG compatible) : « svg »
 * (il faut un SVG compatible), « accent » (la lueur, sans couleur d'accent), ou null si rien.
 */
export function motionBlocker(
  motion: Motion,
  svg: AnimatedSvg | null
): "svg" | "accent" | null {
  if (!SVG_MOTIONS.includes(motion)) return null
  if (svg === null) return "svg"
  return motion === "glint" && !svg.glint ? "accent" : null
}

const playable = (motion: Motion, svg: AnimatedSvg | null) =>
  motionBlocker(motion, svg) === null

/**
 * La boucle des animations : celles qui sont cochées et que le fichier sait jouer (la lueur
 * demande un accent), dans l'ordre de MOTIONS, chacune suivie d'une pause. Si aucune ne convient,
 * la respiration.
 */
export function motionLoop(
  svg: AnimatedSvg | null,
  chosen: readonly Motion[]
): { phase: MotionPhase; ms: number }[] {
  const animations = MOTIONS.filter(
    (motion) => chosen.includes(motion) && playable(motion, svg)
  )
  return (animations.length > 0 ? animations : (["breathe"] as const)).flatMap(
    (phase) => [
      { phase, ms: PHASE_MS[phase] },
      { phase: "rest" as const, ms: PHASE_MS.rest },
    ]
  )
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

// Vérification d'une animation Lottie côté serveur (docs/ARCHITECTURE-CONTENUS.md, § 4.3).
//
// Référence : spécification Lottie 1.0.1 (https://lottie.github.io/lottie-spec/). On vérifie
// les champs obligatoires de l'animation (layers, w, h, fr, ip, op) et on refuse tout ce qui
// ferait charger un fichier extérieur (image non intégrée, police chargée par adresse). « v »
// (chaîne de l'ancien bodymovin) et « ver » sont acceptés sans être exigés. Les « expressions »
// ne sont pas refusées : l'app ne les exécute pas.

import type { CheckResult } from "./svg.ts"

export const MAX_CHECKED_BYTES = 5 * 1024 * 1024
const MAX_SIDE = 8192

export const lottieReasons = {
  unreadable: "lottie_illisible",
  invalid: "lottie_invalide",
  externalLink: "lottie_lien_externe",
} as const

const rasterDataUrl = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]*$/i

function refuse(reason: string, detail: string): CheckResult {
  return { ok: false, reason, detail }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/** Vérifie une animation Lottie (texte JSON). */
export function checkLottie(text: string): CheckResult {
  let animation: unknown
  try {
    animation = JSON.parse(text)
  } catch (error) {
    return refuse(
      lottieReasons.unreadable,
      `JSON : ${error instanceof Error ? error.message.slice(0, 200) : String(error)}`,
    )
  }
  if (!isObject(animation)) return refuse(lottieReasons.invalid, "pas un objet JSON")

  const { layers, w, h, fr, ip, op, v, ver, assets, fonts } = animation
  if (!Array.isArray(layers) || layers.length === 0) {
    return refuse(lottieReasons.invalid, "layers : liste vide ou absente")
  }
  for (const [name, side] of [["w", w], ["h", h]] as const) {
    if (!Number.isInteger(side) || (side as number) <= 0 || (side as number) > MAX_SIDE) {
      return refuse(lottieReasons.invalid, `${name} : entier entre 1 et ${MAX_SIDE} attendu`)
    }
  }
  if (!isFiniteNumber(fr) || fr <= 0) {
    return refuse(lottieReasons.invalid, "fr : nombre d'images par seconde attendu")
  }
  if (!isFiniteNumber(ip) || !isFiniteNumber(op) || op <= ip) {
    return refuse(lottieReasons.invalid, "ip et op : début et fin attendus (op > ip)")
  }
  if (v !== undefined && typeof v !== "string") {
    return refuse(lottieReasons.invalid, "v : chaîne attendue")
  }
  if (ver !== undefined && (!Number.isInteger(ver) || (ver as number) < 10000)) {
    return refuse(lottieReasons.invalid, "ver : entier ≥ 10000 attendu")
  }

  if (assets !== undefined) {
    if (!Array.isArray(assets)) return refuse(lottieReasons.invalid, "assets : liste attendue")
    for (const asset of assets) {
      if (!isObject(asset)) return refuse(lottieReasons.invalid, "assets : objet attendu")
      // Un asset avec « p » est un fichier (image, son) : il doit être intégré (e = 1) et être
      // une image PNG, JPEG ou WebP.
      if ("p" in asset || "u" in asset) {
        const p = asset.p
        if (asset.e !== 1 || typeof p !== "string" || !rasterDataUrl.test(p)) {
          return refuse(
            lottieReasons.externalLink,
            `asset ${String(asset.id ?? "?")} : fichier non intégré`,
          )
        }
        if (asset.u !== undefined && asset.u !== "") {
          return refuse(lottieReasons.externalLink, `asset ${String(asset.id ?? "?")} : chemin`)
        }
      }
    }
  }

  if (fonts !== undefined) {
    if (!isObject(fonts)) return refuse(lottieReasons.invalid, "fonts : objet attendu")
    const list = fonts.list
    if (list !== undefined) {
      if (!Array.isArray(list)) return refuse(lottieReasons.invalid, "fonts.list : liste attendue")
      for (const font of list) {
        if (!isObject(font)) return refuse(lottieReasons.invalid, "fonts.list : objet attendu")
        if (typeof font.fPath === "string" && font.fPath.trim() !== "") {
          return refuse(lottieReasons.externalLink, `police ${String(font.fName ?? "?")}`)
        }
        if (font.origin !== undefined && font.origin !== 0) {
          return refuse(lottieReasons.externalLink, `police ${String(font.fName ?? "?")}`)
        }
      }
    }
  }

  return { ok: true }
}

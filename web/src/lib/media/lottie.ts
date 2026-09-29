// Vérification d'une animation Lottie avant l'envoi : les mêmes règles que la fonction « files »
// (supabase/functions/files/lottie.ts, spécification Lottie 1.0.1), pour refuser tout de suite
// un fichier que le serveur refuserait, avec un message clair.

export type LottieReason =
  "lottie_illisible" | "lottie_invalide" | "lottie_lien_externe"

type LottieCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: LottieReason }

const MAX_SIDE = 8192
const rasterDataUrl = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]*$/i

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

const invalid: LottieCheck = { ok: false, reason: "lottie_invalide" }
const external: LottieCheck = { ok: false, reason: "lottie_lien_externe" }

/** Vérifie une animation Lottie (texte JSON) et renvoie ses dimensions. */
export function checkLottie(text: string): LottieCheck {
  let animation: unknown
  try {
    animation = JSON.parse(text)
  } catch {
    return { ok: false, reason: "lottie_illisible" }
  }
  if (!isObject(animation)) return invalid

  const { layers, w, h, fr, ip, op, v, ver, assets, fonts } = animation
  if (!Array.isArray(layers) || layers.length === 0) return invalid
  for (const side of [w, h]) {
    if (!Number.isInteger(side) || (side as number) <= 0) return invalid
    if ((side as number) > MAX_SIDE) return invalid
  }
  if (!isFiniteNumber(fr) || fr <= 0) return invalid
  if (!isFiniteNumber(ip) || !isFiniteNumber(op) || op <= ip) return invalid
  if (v !== undefined && typeof v !== "string") return invalid
  if (
    ver !== undefined &&
    (!Number.isInteger(ver) || (ver as number) < 10000)
  ) {
    return invalid
  }

  if (assets !== undefined) {
    if (!Array.isArray(assets)) return invalid
    for (const asset of assets) {
      if (!isObject(asset)) return invalid
      if ("p" in asset || "u" in asset) {
        const p = asset.p
        if (asset.e !== 1 || typeof p !== "string" || !rasterDataUrl.test(p)) {
          return external
        }
        if (asset.u !== undefined && asset.u !== "") return external
      }
    }
  }

  if (fonts !== undefined) {
    if (!isObject(fonts)) return invalid
    const list = fonts.list
    if (list !== undefined) {
      if (!Array.isArray(list)) return invalid
      for (const font of list) {
        if (!isObject(font)) return invalid
        if (typeof font.fPath === "string" && font.fPath.trim() !== "") {
          return external
        }
        if (font.origin !== undefined && font.origin !== 0) return external
      }
    }
  }

  return { ok: true, width: w as number, height: h as number }
}

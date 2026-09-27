import { describe, expect, it } from "vitest"

import { IMAGE_TARGET_BYTES } from "@/lib/media/constants"
import {
  fitWithin,
  isAnimatedGif,
  reduceImage,
  type Encoder,
} from "@/lib/media/image"
import { gifBytes } from "@/test/gif"

/**
 * Encodeur simulé : le poids suit le nombre de pixels et la qualité, comme un vrai encodeur.
 * `webp: false` imite Safari, qui rend du PNG quand on lui demande du WebP.
 */
function fakeEncoder({ webp = true, bytesPerPixel = 0.5 } = {}) {
  const calls: {
    width: number
    height: number
    type: string
    quality: number
  }[] = []
  const encode: Encoder = async (width, height, type, quality) => {
    calls.push({ width, height, type, quality })
    const written = type === "image/webp" && !webp ? "image/png" : type
    const size = Math.round(width * height * bytesPerPixel * quality)
    return new Blob([new Uint8Array(size)], { type: written })
  }
  return { encode, calls }
}

describe("réduction des photos", () => {
  it("ramène une grande photo à 2 000 px et à environ 300 Ko, en WebP", async () => {
    const { encode, calls } = fakeEncoder()
    const result = await reduceImage({ width: 4032, height: 3024 }, encode)

    expect(result.blob.type).toBe("image/webp")
    expect(result.blob.size).toBeLessThanOrEqual(IMAGE_TARGET_BYTES)
    expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(2000)
    // Premier essai : la taille maximale, en bonne qualité.
    expect(calls[0]).toMatchObject({ width: 2000, height: 1500, quality: 0.85 })
    // Les proportions sont gardées.
    expect(result.width / result.height).toBeCloseTo(4 / 3, 1)
  })

  it("baisse la qualité avant de réduire la taille", async () => {
    // À 2 000 × 1 500 : 0,85 → 382 Ko, 0,72 → 324 Ko, 0,6 → 270 Ko.
    const { encode, calls } = fakeEncoder({ bytesPerPixel: 0.15 })
    const result = await reduceImage({ width: 2000, height: 1500 }, encode)

    expect(calls.map((call) => call.quality)).toEqual([0.85, 0.72, 0.6])
    expect(result).toMatchObject({ width: 2000, height: 1500 })
    expect(result.blob.size).toBeLessThanOrEqual(IMAGE_TARGET_BYTES)
  })

  it("passe en JPEG quand le navigateur ne sait pas écrire le WebP (Safari)", async () => {
    const { encode, calls } = fakeEncoder({ webp: false })
    const result = await reduceImage({ width: 3000, height: 2000 }, encode)

    expect(result.blob.type).toBe("image/jpeg")
    expect(calls[0].type).toBe("image/webp")
    expect(calls.slice(1).every((call) => call.type === "image/jpeg")).toBe(
      true
    )
  })

  it("n'agrandit jamais une petite image", async () => {
    const { encode } = fakeEncoder()
    const result = await reduceImage({ width: 640, height: 480 }, encode)
    expect(result).toMatchObject({ width: 640, height: 480 })
  })

  it("garde le résultat le plus léger si la taille visée est hors d'atteinte", async () => {
    const { encode } = fakeEncoder({ bytesPerPixel: 10 })
    const result = await reduceImage({ width: 4000, height: 4000 }, encode)
    // On ne descend pas sous 800 px : la photo resterait lisible.
    expect(Math.max(result.width, result.height)).toBe(800)
  })

  it("calcule la taille à l'intérieur d'un carré", () => {
    expect(fitWithin(4000, 1000, 2000)).toEqual({ width: 2000, height: 500 })
    expect(fitWithin(1000, 4000, 2000)).toEqual({ width: 500, height: 2000 })
    expect(fitWithin(100, 50, 2000)).toEqual({ width: 100, height: 50 })
  })
})

describe("GIF animés", () => {
  it("reconnaît un GIF de plusieurs images", () => {
    expect(isAnimatedGif(gifBytes(3))).toBe(true)
  })

  it("ne se trompe pas sur un GIF d'une seule image (même avec des 0x2C ailleurs)", () => {
    expect(isAnimatedGif(gifBytes(1))).toBe(false)
  })
})

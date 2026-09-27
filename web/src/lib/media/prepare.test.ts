import { describe, expect, it, vi } from "vitest"

import type { DecodedImage, Encoder } from "@/lib/media/image"
import {
  prepareFile,
  PrepareError,
  type PrepareDeps,
} from "@/lib/media/prepare"
import { gifBytes } from "@/test/gif"
import piegeRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/piege.svg?raw"

/** Navigateur simulé : il décode (ou pas) les images, et encode en WebP. */
function fakeDeps({
  decodes = true,
  width = 1200,
  height = 900,
  duration = 12.3456,
}: {
  decodes?: boolean
  width?: number
  height?: number
  duration?: number | null
} = {}) {
  const encode: Encoder = async (w, h, type, quality) =>
    new Blob([new Uint8Array(Math.round(w * h * 0.1 * quality))], { type })
  const decodeImage = vi.fn(async (): Promise<DecodedImage> => {
    if (!decodes) throw new DOMException("format inconnu", "InvalidStateError")
    return { width, height, encode, close: () => {} }
  })
  const readAudioDuration = vi.fn(async () => duration)
  const deps: PrepareDeps = { decodeImage, readAudioDuration }
  return { deps, decodeImage, readAudioDuration }
}

const file = (parts: BlobPart[], name: string, type = "") =>
  new File(parts, name, { type })

async function failure(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(PrepareError)
  return (error as PrepareError).code
}

describe("préparation avant l'envoi", () => {
  it("convertit un GIF animé (première image) et prévient", async () => {
    const { deps, decodeImage } = fakeDeps()
    const gif = file([gifBytes(3)], "danse.gif", "image/gif")

    const prepared = await prepareFile(gif, deps)

    expect(decodeImage).toHaveBeenCalledWith(gif)
    expect(prepared).toMatchObject({
      kind: "image",
      mime: "image/webp",
      name: "danse.gif",
      width: 1200,
      height: 900,
      warnings: ["gif_anime"],
    })
    expect(prepared.blob.type).toBe("image/webp")
  })

  it("convertit un GIF fixe sans avertissement", async () => {
    const { deps } = fakeDeps()
    const prepared = await prepareFile(file([gifBytes(1)], "logo.gif"), deps)
    expect(prepared.warnings).toEqual([])
    expect(prepared.mime).toBe("image/webp")
  })

  it("explique qu'un HEIC n'est pas lisible par ce navigateur", async () => {
    const { deps } = fakeDeps({ decodes: false })
    const heic = file(
      [new Uint8Array([0, 0, 0, 0x18]), "ftypheic", new Uint8Array(20)],
      "IMG_0001.HEIC",
      "image/heic"
    )
    expect(await failure(prepareFile(heic, deps))).toBe("heic_illisible")
  })

  it("convertit un HEIC quand le navigateur sait le lire (Safari)", async () => {
    const { deps } = fakeDeps({ width: 4032, height: 3024 })
    const heic = file(
      [new Uint8Array([0, 0, 0, 0x18]), "ftypheic", new Uint8Array(20)],
      "IMG_0001.HEIC"
    )
    const prepared = await prepareFile(heic, deps)
    expect(prepared.mime).toBe("image/webp")
    expect(Math.max(prepared.width!, prepared.height!)).toBeLessThanOrEqual(
      2000
    )
  })

  it("envoie tel quel un petit PNG", async () => {
    const { deps } = fakeDeps({ width: 64, height: 64 })
    const png = file(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])],
      "icone.png"
    )
    const prepared = await prepareFile(png, deps)
    expect(prepared.mime).toBe("image/png")
    expect(prepared.blob.size).toBe(png.size)
  })

  it("met le nom d'origine en Unicode composé (NFC), comme la recherche", async () => {
    const { deps } = fakeDeps({ width: 64, height: 64 })
    // « Été à la plage » tel que le Finder le donne souvent : lettres et accents séparés.
    const decomposed = "E\u0301te\u0301 a\u0300 la plage.png"
    const png = file(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2])],
      decomposed
    )
    const prepared = await prepareFile(png, deps)
    expect(prepared.name).toBe("\u00c9t\u00e9 \u00e0 la plage.png")
    expect(prepared.name).not.toBe(decomposed)
  })

  it("normalise un M4A annoncé audio/x-m4a en audio/mp4, avec sa durée", async () => {
    const { deps } = fakeDeps()
    const m4a = file(
      [new Uint8Array([0, 0, 0, 0x20]), "ftypM4A ", new Uint8Array(40)],
      "voix.m4a",
      "audio/x-m4a"
    )
    const prepared = await prepareFile(m4a, deps)
    expect(prepared).toMatchObject({
      kind: "audio",
      mime: "audio/mp4",
      durationS: 12.346,
      width: null,
    })
    // storage-js envoie le type du Blob : c'est lui qui doit être normalisé.
    expect(prepared.blob.type).toBe("audio/mp4")
  })

  it("nettoie un SVG piégé avant l'envoi", async () => {
    const prepared = await prepareFile(
      file([piegeRaw], "piege.svg"),
      fakeDeps().deps
    )
    expect(prepared.kind).toBe("svg")
    expect(prepared.blob.type).toBe("image/svg+xml")
    const text = await prepared.blob.text()
    expect(text).not.toMatch(/script|onload|pirate\.fr/)
  })

  it("refuse une animation Lottie invalide avec sa raison", async () => {
    const lottie = file(['{"layers": []}'], "anim.json", "application/json")
    expect(await failure(prepareFile(lottie, fakeDeps().deps))).toBe(
      "lottie_invalide"
    )
  })

  it("refuse les fichiers vides, trop lourds, vidéo ou d'un autre format", async () => {
    const { deps } = fakeDeps()
    expect(await failure(prepareFile(file([], "vide.pdf"), deps))).toBe(
      "fichier_vide"
    )
    const big = file(["%PDF-1.7"], "gros.pdf")
    Object.defineProperty(big, "size", { value: 51 * 1024 * 1024 })
    expect(await failure(prepareFile(big, deps))).toBe("fichier_trop_lourd")
    const bigSvg = file(["<svg/>"], "gros.svg")
    Object.defineProperty(bigSvg, "size", { value: 6 * 1024 * 1024 })
    expect(await failure(prepareFile(bigSvg, deps))).toBe(
      "fichier_a_verifier_trop_lourd"
    )
    const video = file(
      [new Uint8Array([0, 0, 0, 0x20]), "ftypisom", new Uint8Array(8)],
      "film.mp4",
      "video/mp4"
    )
    expect(await failure(prepareFile(video, deps))).toBe("video_refusee")
    expect(
      await failure(
        prepareFile(file(["bonjour"], "notes.txt", "text/plain"), deps)
      )
    ).toBe("type_refuse")
  })
})

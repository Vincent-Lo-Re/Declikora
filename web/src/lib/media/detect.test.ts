import { describe, expect, it } from "vitest"

import { detectFormat, normalizeAudioType } from "@/lib/media/detect"

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(
    values.flatMap((value) =>
      typeof value === "string"
        ? Array.from(value, (character) => character.charCodeAt(0))
        : [value]
    )
  )

// Début d'un fichier ISO (MP4, M4A, HEIC) : taille, « ftyp », marque.
const iso = (brand: string) => bytes(0, 0, 0, 0x20, "ftyp", brand, 0, 0, 0, 0)

describe("reconnaissance des fichiers", () => {
  it("reconnaît les images d'après leurs premiers octets, pas d'après leur nom", () => {
    expect(detectFormat(bytes(0xff, 0xd8, 0xff, 0xe0), "photo.png", "")).toBe(
      "jpeg"
    )
    expect(
      detectFormat(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a), "a", "")
    ).toBe("png")
    expect(detectFormat(bytes("GIF89a"), "anim.gif", "image/gif")).toBe("gif")
    expect(detectFormat(bytes("RIFF", 0, 0, 0, 0, "WEBP"), "a.webp", "")).toBe(
      "webp"
    )
    expect(detectFormat(iso("heic"), "IMG_0001.HEIC", "image/heic")).toBe(
      "heic"
    )
    expect(detectFormat(iso("avif"), "a.avif", "image/avif")).toBe(
      "other-image"
    )
    expect(detectFormat(bytes("%PDF-1.7"), "doc.pdf", "")).toBe("pdf")
  })

  it("reconnaît SVG et Lottie d'après l'extension ou le type annoncé", () => {
    expect(detectFormat(bytes("<svg"), "logo.SVG", "")).toBe("svg")
    expect(detectFormat(bytes("<?xml"), "logo", "image/svg+xml")).toBe("svg")
    expect(detectFormat(bytes('{"v":'), "anim.json", "")).toBe("lottie")
  })

  it("refuse les vidéos et les formats inconnus", () => {
    expect(detectFormat(iso("isom"), "film.mp4", "video/mp4")).toBe("video")
    expect(detectFormat(bytes("hello"), "notes.txt", "text/plain")).toBeNull()
    expect(detectFormat(bytes("PK"), "archive.lottie", "")).toBeNull()
  })
})

describe("normalisation des types audio", () => {
  it("donne audio/mp4 pour un M4A annoncé audio/x-m4a (Safari, macOS)", () => {
    expect(normalizeAudioType(iso("M4A "), "voix.m4a", "audio/x-m4a")).toBe(
      "audio/mp4"
    )
    expect(normalizeAudioType(iso("mp42"), "voix.m4a", "audio/m4a")).toBe(
      "audio/mp4"
    )
  })

  it("donne audio/mpeg pour un MP3 annoncé audio/mp3", () => {
    expect(normalizeAudioType(bytes("ID3", 4, 0), "son.mp3", "audio/mp3")).toBe(
      "audio/mpeg"
    )
    expect(normalizeAudioType(bytes(0xff, 0xfb, 0x90), "son.mp3", "")).toBe(
      "audio/mpeg"
    )
  })

  it("refuse un fichier dont les octets ne sont pas un audio accepté", () => {
    expect(normalizeAudioType(bytes("OggS"), "son.ogg", "audio/ogg")).toBeNull()
    expect(normalizeAudioType(bytes("RIFF"), "son.wav", "audio/wav")).toBeNull()
  })
})

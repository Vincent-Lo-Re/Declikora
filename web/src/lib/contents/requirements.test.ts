import { describe, expect, it } from "vitest"

import type { BlockMedia } from "@/blocks/components/context"
import type { Media } from "@/lib/media/constants"
import {
  coverRequired,
  titleRequired,
  hasAudio,
  hasCategories,
  hasPresentation,
  publishChecks,
  readyItems,
} from "@/lib/contents/requirements"

const IMAGE = "00000000-0000-4000-8000-0000000000f1"
const AUDIO = "00000000-0000-4000-8000-0000000000f2"

function media(id: string, changes: Partial<Media>): Media {
  return {
    id,
    name: `${id}.bin`,
    status: "ready",
    deleted_at: null,
    alt: null,
    transcript: null,
    duration_s: null,
    ...changes,
  } as unknown as Media
}

/** Ce que l'éditeur sait des fichiers (comme pour les blocs Image). */
function mediaFor(files: Record<string, BlockMedia>) {
  return (id: string | null): BlockMedia =>
    id ? (files[id] ?? { state: "missing" }) : { state: "none" }
}

const readyImage: BlockMedia = {
  state: "ready",
  media: media(IMAGE, { kind: "image" }),
  url: "blob:image",
}
const readyAudio = (transcript: string | null): BlockMedia => ({
  state: "ready",
  media: media(AUDIO, { kind: "audio", transcript, duration_s: 185 }),
  url: "blob:audio",
})

describe("sortes", () => {
  it("[D45] : image de présentation pour un article, un épisode et une méthode", () => {
    expect(coverRequired("article")).toBe(true)
    expect(coverRequired("episode")).toBe(true)
    expect(coverRequired("method")).toBe(true)
    expect(coverRequired("page")).toBe(false)
    expect(coverRequired("template")).toBe(false)
    expect(hasAudio("episode")).toBe(true)
    expect(hasAudio("article")).toBe(false)
    expect(hasPresentation("article")).toBe(true)
    expect(hasPresentation("page")).toBe(false)
    // Une méthode, un chapitre, une leçon : image et résumé ; exigée pour la méthode seule.
    expect(hasPresentation("method")).toBe(true)
    expect(hasPresentation("lesson")).toBe(true)
    expect(coverRequired("chapter")).toBe(false)
    expect(coverRequired("lesson")).toBe(false)
    expect(hasCategories("article")).toBe(true)
    expect(hasCategories("method")).toBe(false)
  })
})

describe("ce qui manque pour publier", () => {
  it("une page : seulement le titre ([D49])", () => {
    expect(publishChecks("page", { title: "À propos" }, mediaFor({}))).toEqual({
      missing: [],
      advice: [],
    })
  })

  it("le titre est demandé en premier, et des espaces ne font pas un titre ([D49])", () => {
    for (const kind of [
      "page",
      "article",
      "episode",
      "method",
      "chapter",
      "lesson",
    ]) {
      expect(
        publishChecks(kind, { title: "  " }, mediaFor({})).missing[0]
      ).toEqual({ key: "title", state: "missing" })
    }
    expect(titleRequired("template")).toBe(false)
  })

  it("un article sans image de présentation (le résumé reste facultatif)", () => {
    expect(
      publishChecks("article", { title: "Titre", cover: null }, mediaFor({}))
        .missing
    ).toEqual([{ key: "cover", state: "missing" }])
    expect(
      publishChecks(
        "article",
        { title: "Titre", cover: { mediaId: IMAGE } },
        mediaFor({ [IMAGE]: readyImage })
      )
    ).toEqual({ missing: [], advice: [] })
  })

  it("une image supprimée, pas prête ou d'un autre type n'est pas disponible", () => {
    const check = (file: BlockMedia) =>
      publishChecks(
        "article",
        { title: "Titre", cover: { mediaId: IMAGE } },
        mediaFor({ [IMAGE]: file })
      ).missing
    expect(check({ state: "missing" })).toEqual([
      { key: "cover", state: "unavailable" },
    ])
    expect(
      check({ state: "not_ready", media: media(IMAGE, { kind: "image" }) })
    ).toEqual([{ key: "cover", state: "unavailable" }])
    expect(
      check({
        state: "ready",
        media: media(IMAGE, { kind: "svg" }),
        url: undefined,
      })
    ).toEqual([{ key: "cover", state: "unavailable" }])
    // Pendant la lecture, ou si elle a échoué, la base tranchera.
    expect(check({ state: "loading" })).toEqual([])
    expect(check({ state: "error", retry: () => {} })).toEqual([])
  })

  it("un épisode sans audio, puis avec un audio sans transcription ([D46])", () => {
    expect(
      publishChecks(
        "episode",
        { title: "Titre", cover: { mediaId: IMAGE }, audio: null },
        mediaFor({ [IMAGE]: readyImage })
      ).missing
    ).toEqual([{ key: "audio", state: "missing" }])
    expect(
      publishChecks(
        "episode",
        { title: "Titre", cover: null, audio: null },
        mediaFor({})
      ).missing.map((item) => item.key)
    ).toEqual(["cover", "audio"])

    const withAudio = (transcript: string | null) =>
      publishChecks(
        "episode",
        {
          title: "Titre",
          cover: { mediaId: IMAGE },
          audio: { mediaId: AUDIO },
        },
        mediaFor({ [IMAGE]: readyImage, [AUDIO]: readyAudio(transcript) })
      )
    // La transcription est conseillée, pas obligatoire.
    expect(withAudio(null)).toEqual({
      missing: [],
      advice: [{ key: "transcript", mediaId: AUDIO }],
    })
    expect(withAudio("   ").advice).toHaveLength(1)
    expect(withAudio("Bonjour et bienvenue.")).toEqual({
      missing: [],
      advice: [],
    })
  })

  it("un audio qui n'en est pas un n'est pas disponible", () => {
    expect(
      publishChecks(
        "episode",
        {
          title: "Titre",
          cover: { mediaId: IMAGE },
          audio: { mediaId: IMAGE },
        },
        mediaFor({ [IMAGE]: readyImage })
      ).missing
    ).toEqual([{ key: "audio", state: "unavailable" }])
  })
})

describe("prêt à publier (éditeur du Fil)", () => {
  it("le titre, l'image de présentation, puis le niveau d'accès", () => {
    expect(
      readyItems(
        {
          missing: [
            { key: "title", state: "missing" },
            { key: "cover", state: "missing" },
          ],
          advice: [],
        },
        false
      )
    ).toEqual([
      { key: "title", done: false },
      { key: "cover", done: false },
      { key: "access", done: false },
    ])
    expect(readyItems({ missing: [], advice: [] }, true)).toEqual([
      { key: "title", done: true },
      { key: "cover", done: true },
      { key: "access", done: true },
    ])
  })
})

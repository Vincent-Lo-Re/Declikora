import { describe, expect, it, vi } from "vitest"

import {
  restoreMany,
  selectionOf,
  toggleAll,
  toggleSelected,
  trashMany,
} from "@/lib/bulk-trash"
import { ContentError, keptContentDetail } from "@/lib/contents/api"
import { MediaError, usedFileDetail } from "@/lib/media/api"
import type { Media } from "@/lib/media/constants"

const media = (id: string) => ({ id, name: `${id}.jpg` }) as Media
const [a, b, c] = [media("a"), media("b"), media("c")]

describe("sélection", () => {
  it("coche et décoche une ligne sans toucher à l'ensemble reçu", () => {
    const start = new Set(["a"])
    expect([...toggleSelected(start, "b", true)]).toEqual(["a", "b"])
    expect([...toggleSelected(start, "a", false)]).toEqual([])
    expect([...start]).toEqual(["a"])
  })

  it("« Tout sélectionner » ne change que les lignes affichées", () => {
    const hidden = new Set(["z"])
    expect([...toggleAll(hidden, [a, b], true)].sort()).toEqual(["a", "b", "z"])
    expect([...toggleAll(new Set(["a", "z"]), [a, b], false)]).toEqual(["z"])
  })

  it("ne compte que ce qui est coché parmi les lignes affichées", () => {
    expect(selectionOf(new Set(), [a, b])).toEqual({
      items: [],
      all: false,
      some: false,
    })
    expect(selectionOf(new Set(["a", "z"]), [a, b])).toEqual({
      items: [a],
      all: false,
      some: true,
    })
    expect(selectionOf(new Set(["a", "b"]), [a, b])).toEqual({
      items: [a, b],
      all: true,
      some: false,
    })
    expect(selectionOf(new Set(["a"]), []).all).toBe(false)
  })
})

describe("trashMany", () => {
  it("garde les fichiers utilisés et continue avec les suivants", async () => {
    const trash = vi.fn(async (id: string) => {
      if (id === "b") {
        throw new MediaError(
          "fichier_utilise",
          "Ce fichier est utilisé dans : Pain."
        )
      }
      return media(id)
    })

    const result = await trashMany([a, b, c], trash, usedFileDetail)

    expect(trash.mock.calls.map(([id]) => id)).toEqual(["a", "b", "c"])
    expect(result).toEqual({
      trashed: [a, c],
      results: [a, c],
      kept: [{ item: b, detail: "Ce fichier est utilisé dans : Pain." }],
      error: null,
    })
  })

  it("s'arrête à la première autre erreur, sans toucher au reste", async () => {
    const failure = new MediaError("reserve_a_l_equipe")
    const trash = vi.fn(async (id: string) => {
      if (id === "b") throw failure
      return media(id)
    })

    const result = await trashMany([a, b, c], trash, usedFileDetail)

    expect(trash).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      trashed: [a],
      results: [a],
      kept: [],
      error: failure,
    })
  })

  it("garde un contenu que quelqu'un d'autre écrit, ou qui n'existe plus", () => {
    const writing = "Claire Martin écrit ce brouillon."
    expect(
      keptContentDetail(new ContentError("verrou_tenu", { detail: writing }))
    ).toBe(writing)
    expect(keptContentDetail(new ContentError("contenu_introuvable"))).toBe(
      new ContentError("contenu_introuvable").message
    )
    expect(keptContentDetail(new ContentError("reserve_a_l_equipe"))).toBeNull()
    expect(keptContentDetail(new Error("réseau"))).toBeNull()
  })
})

describe("restoreMany", () => {
  it("restaure chaque ligne, et s'arrête à la première erreur", async () => {
    const restore = vi.fn(async (id: string) => media(id))
    expect(await restoreMany(["a", "b"], restore)).toEqual({
      restored: [a, b],
      error: null,
    })

    const failure = new Error("réseau")
    restore.mockRejectedValueOnce(failure)
    expect(await restoreMany(["c", "a"], restore)).toEqual({
      restored: [],
      error: failure,
    })
    expect(restore).toHaveBeenCalledTimes(3)
  })
})

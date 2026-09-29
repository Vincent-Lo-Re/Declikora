import { describe, expect, it, vi } from "vitest"

import { MediaError } from "@/lib/media/api"
import {
  restoreMany,
  selectionOf,
  toggleAll,
  toggleSelected,
  trashMany,
} from "@/lib/media/bulk-trash"
import type { Media } from "@/lib/media/constants"

const media = (id: string) => ({ id, name: `${id}.jpg` }) as Media
const [a, b, c] = [media("a"), media("b"), media("c")]

describe("sélection", () => {
  it("coche et décoche un fichier sans toucher à l'ensemble reçu", () => {
    const start = new Set(["a"])
    expect([...toggleSelected(start, "b", true)]).toEqual(["a", "b"])
    expect([...toggleSelected(start, "a", false)]).toEqual([])
    expect([...start]).toEqual(["a"])
  })

  it("« Tout sélectionner » ne change que les fichiers affichés", () => {
    const hidden = new Set(["z"])
    expect([...toggleAll(hidden, [a, b], true)].sort()).toEqual(["a", "b", "z"])
    expect([...toggleAll(new Set(["a", "z"]), [a, b], false)]).toEqual(["z"])
  })

  it("ne compte que ce qui est coché parmi les fichiers affichés", () => {
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

    const result = await trashMany([a, b, c], trash)

    expect(trash.mock.calls.map(([id]) => id)).toEqual(["a", "b", "c"])
    expect(result).toEqual({
      trashed: [a, c],
      kept: [{ media: b, detail: "Ce fichier est utilisé dans : Pain." }],
      error: null,
    })
  })

  it("s'arrête à la première autre erreur, sans toucher au reste", async () => {
    const failure = new MediaError("reserve_a_l_equipe")
    const trash = vi.fn(async (id: string) => {
      if (id === "b") throw failure
      return media(id)
    })

    const result = await trashMany([a, b, c], trash)

    expect(trash).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ trashed: [a], kept: [], error: failure })
  })
})

describe("restoreMany", () => {
  it("restaure chaque fichier, et s'arrête à la première erreur", async () => {
    const restore = vi.fn(async (id: string) => media(id))
    expect(await restoreMany(["a", "b"], restore)).toEqual({
      restored: 2,
      error: null,
    })

    const failure = new Error("réseau")
    restore.mockRejectedValueOnce(failure)
    expect(await restoreMany(["c", "a"], restore)).toEqual({
      restored: 0,
      error: failure,
    })
    expect(restore).toHaveBeenCalledTimes(3)
  })
})

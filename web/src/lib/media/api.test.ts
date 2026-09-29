import { FunctionsHttpError } from "@supabase/supabase-js"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  callFiles,
  clearPreviewCache,
  confirmMedia,
  emptyTrash,
  getPreviewUrls,
  listMedia,
  MediaError,
  PREVIEW_REFRESH_MS,
  PREVIEW_URL_SECONDS,
  trashMedia,
} from "@/lib/media/api"
import { supabase } from "@/lib/supabase"
import { texts } from "@/texts"

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  clearPreviewCache()
})

type RpcResult = Awaited<ReturnType<typeof supabase.rpc>>

/** Réponse d'erreur de la base, comme PostgREST la rend pour un « raise exception ». */
function rpcFailure(message: string, details = ""): RpcResult {
  return {
    data: null,
    error: {
      message,
      details,
      hint: "",
      code: "P0001",
      name: "PostgrestError",
    },
    count: null,
    status: 400,
    statusText: "Bad Request",
  } as unknown as RpcResult
}

function mockRpc(...results: RpcResult[]) {
  const queue = [...results]
  return vi
    .spyOn(supabase, "rpc")
    .mockImplementation(
      () =>
        Promise.resolve(queue.shift()!) as unknown as ReturnType<
          typeof supabase.rpc
        >
    )
}

describe("appels de la médiathèque", () => {
  it("traduit un refus de la base, avec sa précision", async () => {
    mockRpc(
      rpcFailure("fichier_utilise", "Ce fichier est utilisé dans : Pain.")
    )

    const error = await trashMedia("id").catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(MediaError)
    expect(error).toMatchObject({
      code: "fichier_utilise",
      message: texts.media.errors.fichier_utilise,
      detail: "Ce fichier est utilisé dans : Pain.",
    })
  })

  it("donne un message général pour une erreur inconnue", async () => {
    mockRpc(rpcFailure("autre_chose"))
    await expect(trashMedia("id")).rejects.toMatchObject({
      code: null,
      message: texts.common.unexpected,
    })
  })

  it("réessaie la confirmation tant que le fichier n'est pas visible", async () => {
    const ready = { id: "id", status: "ready" }
    const rpc = mockRpc(rpcFailure("fichier_absent"), {
      data: ready,
      error: null,
    } as unknown as RpcResult)

    await expect(confirmMedia("id", { delayMs: 1 })).resolves.toEqual(ready)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenCalledWith("media_confirm", { media_id: "id" })
  })

  it("efface toujours une liste explicite d'éléments de la corbeille", async () => {
    const rpc = mockRpc({ data: 1, error: null } as unknown as RpcResult)
    expect(await emptyTrash([{ type: "file", id: "a" }])).toBe(1)
    expect(rpc).toHaveBeenCalledWith("empty_trash", {
      items: [{ type: "file", id: "a" }],
    })
  })

  it("traduit les erreurs de la fonction « files »", async () => {
    // supabase.functions crée un nouveau client à chaque lecture : on remplace sa méthode commune.
    const functionsClient = Object.getPrototypeOf(supabase.functions) as {
      invoke: typeof supabase.functions.invoke
    }
    const invoke = vi.spyOn(functionsClient, "invoke").mockResolvedValue({
      data: null,
      error: new FunctionsHttpError(
        new Response(
          JSON.stringify({
            error: { code: "reserve_a_l_equipe", message: "…" },
          }),
          { status: 403 }
        )
      ),
      response: undefined,
    })

    await expect(callFiles("clean")).rejects.toMatchObject({
      code: "reserve_a_l_equipe",
    })
    expect(invoke).toHaveBeenCalledWith("files", { body: { mode: "clean" } })
  })
})

describe("liens d'aperçu des fichiers protégés", () => {
  it("donne toujours un lien encore valable à la relecture suivante", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    const start = new Date("2026-09-27T10:00:00Z").getTime()
    vi.setSystemTime(start)
    // Heure d'expiration de chaque lien créé.
    const expiry = new Map<string, number>()
    let created = 0
    // supabase.storage crée un nouveau client à chaque lecture : on remplace sa méthode commune.
    const storageClient = Object.getPrototypeOf(supabase.storage) as {
      from: typeof supabase.storage.from
    }
    vi.spyOn(storageClient, "from").mockReturnValue({
      createSignedUrls: (paths: string[], seconds: number) => {
        const data = paths.map((path) => {
          const signedUrl = `https://lien/${path}?n=${++created}`
          expiry.set(signedUrl, Date.now() + seconds * 1000)
          return { path, signedUrl, error: null }
        })
        return Promise.resolve({ data, error: null })
      },
    } as unknown as ReturnType<typeof supabase.storage.from>)

    const key = "files-protected/a/photo.webp"
    // Relectures régulières sur trois heures, plus des changements de liste à des moments
    // quelconques (nouvelle page, nouveau filtre) : chaque lien rendu doit encore valoir au
    // moins jusqu'à la relecture suivante.
    const moments = new Set<number>()
    for (let t = 0; t <= 3 * 60 * 60 * 1000; t += PREVIEW_REFRESH_MS) {
      moments.add(t)
    }
    for (const minutes of [7, 26, 47, 49, 52, 95, 131]) {
      moments.add(minutes * 60 * 1000)
    }
    for (const t of [...moments].sort((a, b) => a - b)) {
      vi.setSystemTime(start + t)
      const url = (await getPreviewUrls([key]))[key]
      expect(expiry.get(url)! - Date.now()).toBeGreaterThan(PREVIEW_REFRESH_MS)
    }
    // Les liens sont bien réutilisés entre deux relectures (pas une demande à chaque fois).
    expect(created).toBeLessThan(moments.size)
    expect(created).toBeGreaterThanOrEqual(
      Math.floor((3 * 60 * 60) / PREVIEW_URL_SECONDS)
    )
  })
})

describe("listMedia", () => {
  /** Requête simulée : chaque appel est noté, et la réponse arrive à la fin de la chaîne. */
  function recordQuery() {
    const calls: [string, ...unknown[]][] = []
    const query: Record<string, unknown> = {}
    for (const method of ["select", "is", "order", "limit", "eq", "ilike"]) {
      query[method] = (...args: unknown[]) => {
        calls.push([method, ...args])
        return query
      }
    }
    query.then = (resolve: (value: unknown) => void) =>
      resolve({ data: [], error: null })
    vi.spyOn(supabase, "from").mockReturnValue(
      query as unknown as ReturnType<typeof supabase.from>
    )
    return calls
  }

  it("lit la colonne calculée media_in_use pour le badge « Non utilisé »", async () => {
    const calls = recordQuery()
    await listMedia({ kind: "all", search: "", unused: false })
    expect(calls).toContainEqual(["select", "*, media_in_use"])
    expect(calls.some(([method]) => method === "eq")).toBe(false)
  })

  it("« Non utilisés » filtre dans la base, avec le type et la recherche", async () => {
    const calls = recordQuery()
    await listMedia({ kind: "image", search: "chat", unused: true })
    expect(calls).toContainEqual(["eq", "kind", "image"])
    expect(calls).toContainEqual(["eq", "media_in_use", false])
    expect(calls).toContainEqual(["ilike", "name", "%chat%"])
  })
})

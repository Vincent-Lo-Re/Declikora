import { afterEach, describe, expect, it, vi } from "vitest"

import { listFailedSchedules } from "@/lib/contents/home"

// Le client Supabase est remplacé par un enregistreur de la requête construite.
const calls: [string, unknown[]][] = []

vi.mock("@/lib/supabase", () => {
  const builder: Record<string, unknown> = {}
  for (const method of ["from", "select", "is", "not", "in", "eq", "order"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push([method, args])
      return builder
    }
  }
  builder.limit = (...args: unknown[]) => {
    calls.push(["limit", args])
    return Promise.resolve({ data: [], error: null, status: 200 })
  }
  return { supabase: builder }
})

afterEach(() => {
  calls.length = 0
})

describe("programmations échouées de l'Accueil", () => {
  it("trie sur des colonnes que l'échec garde, pour un ordre stable", async () => {
    await listFailedSchedules()
    const orders = calls.filter(([method]) => method === "order")
    // private.run_due_publications remet scheduled_at et scheduled_set_at à null en
    // enregistrant l'échec : trier dessus rendrait un ordre quelconque.
    expect(orders.map(([, [column]]) => column)).toEqual([
      "draft_saved_at",
      "id",
    ])
    expect(orders[0][1][1]).toEqual({ ascending: false })
    // Seules les sortes de l'admin : pas les anciennes méthodes, en cours de refonte.
    expect(calls).toContainEqual([
      "in",
      ["kind", ["article", "episode", "page"]],
    ])
  })
})

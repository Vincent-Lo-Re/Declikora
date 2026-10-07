import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { atLeast } from "@/lib/at-least"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("atLeast", () => {
  it("attend le temps minimal quand la réponse arrive tout de suite", async () => {
    const done = vi.fn()
    void atLeast(Promise.resolve("ok"), 1000).then(done)

    await vi.advanceTimersByTimeAsync(999)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toHaveBeenCalledWith("ok")
  })

  it("n'ajoute rien à une réponse plus lente", async () => {
    const done = vi.fn()
    const slow = new Promise((resolve) =>
      setTimeout(() => resolve("lent"), 1500)
    )
    void atLeast(slow, 1000).then(done)

    await vi.advanceTimersByTimeAsync(1499)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(done).toHaveBeenCalledWith("lent")
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"

import { highlightSoon } from "@/lib/focus"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("highlightSoon", () => {
  it("amène la zone sous les yeux et l'allume, puis l'éteint à la fin de l'animation", () => {
    const zone = document.createElement("section")
    zone.scrollIntoView = vi.fn()
    document.body.append(zone)
    highlightSoon(() => zone)
    expect(zone.scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "smooth",
    })
    expect(zone).toHaveAttribute("data-highlight")
    zone.dispatchEvent(new Event("animationend"))
    expect(zone).not.toHaveAttribute("data-highlight")
  })

  it("attend que la zone existe (un onglet qui s'ouvre)", async () => {
    let zone: HTMLElement | null = null
    highlightSoon(() => zone)
    zone = document.createElement("li")
    document.body.append(zone)
    await vi.waitFor(() => expect(zone).toHaveAttribute("data-highlight"))
  })
})

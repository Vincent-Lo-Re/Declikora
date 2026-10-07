import { describe, expect, it } from "vitest"

import { motionLoop, prepareAnimatedSvg } from "@/lib/monogram-motion"

const mark =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10"><g fill="none" stroke="oklch(0.985 0 0)"><line x1="0" y1="0" x2="5" y2="5"/></g><line x1="5" y1="5" x2="9" y2="9" stroke="#f4cd48"/><path fill="oklch(0.985 0 0)" d="M1 1h2v2H1z"/></svg>'

describe("le monogramme animé de la connexion", () => {
  it("marque les contours à tracer, les formes pleines et l'accent", () => {
    const svg = prepareAnimatedSvg(mark)
    expect(svg?.glint).toBe(true)
    const root = new DOMParser().parseFromString(
      svg!.markup,
      "image/svg+xml"
    ).documentElement
    expect(root.hasAttribute("width")).toBe(false)
    const motions = [...root.querySelectorAll("[data-motion]")].map(
      (shape) =>
        `${shape.localName}:${shape.getAttribute("data-motion")}${shape.hasAttribute("data-accent") ? "*" : ""}`
    )
    expect(motions).toEqual(["line:trace", "line:trace*", "path:reveal"])
  })

  it("n'anime en entier qu'un fichier non compatible : la respiration seule", () => {
    const gradient =
      '<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="g"/><rect fill="url(#g)" width="1" height="1"/></svg>'
    expect(prepareAnimatedSvg(gradient)).toBeNull()
    expect(motionLoop(null).map((step) => step.phase)).toEqual([
      "breathe",
      "rest",
    ])
  })

  it("enchaîne le tracé, la lueur et la respiration, avec 4 secondes de pause", () => {
    const loop = motionLoop(prepareAnimatedSvg(mark))
    expect(loop.map((step) => step.phase)).toEqual([
      "trace",
      "rest",
      "glint",
      "rest",
      "breathe",
      "rest",
    ])
    expect(loop.filter((step) => step.phase === "rest")[0].ms).toBe(4000)
  })
})

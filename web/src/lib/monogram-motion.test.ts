import { describe, expect, it } from "vitest"

import {
  DEFAULT_MOTIONS,
  type Motion,
  MOTIONS,
  motionBlocker,
  motionLoop,
  prepareAnimatedSvg,
} from "@/lib/monogram-motion"

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

  it("n'anime qu'en entier un fichier non compatible", () => {
    const gradient =
      '<svg xmlns="http://www.w3.org/2000/svg"><linearGradient id="g"/><rect fill="url(#g)" width="1" height="1"/></svg>'
    expect(prepareAnimatedSvg(gradient)).toBeNull()
    const phases = (chosen: readonly Motion[]) =>
      motionLoop(null, chosen)
        .map((step) => step.phase)
        .filter((phase) => phase !== "rest")
    expect(phases(MOTIONS)).toEqual(["shine", "halo", "sway", "breathe"])
    // Rien de jouable : la respiration.
    expect(phases(["trace", "glint"])).toEqual(["breathe"])
  })

  it("enchaîne le tracé, la lueur et la respiration, avec 4 secondes de pause", () => {
    const loop = motionLoop(prepareAnimatedSvg(mark), DEFAULT_MOTIONS)
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

  it("joue les animations cochées dans l'ordre fixe, quel que soit celui du choix", () => {
    const loop = motionLoop(prepareAnimatedSvg(mark), [
      "breathe",
      "shine",
      "cascade",
    ])
    expect(loop.map((step) => step.phase)).toEqual([
      "cascade",
      "rest",
      "shine",
      "rest",
      "breathe",
      "rest",
    ])
  })

  it("dit ce qui empêche une animation : un SVG compatible, ou un accent pour la lueur", () => {
    const plain = prepareAnimatedSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="#ffffff" d="M1 1h2v2H1z"/></svg>'
    )
    expect(motionBlocker("trace", null)).toBe("svg")
    expect(motionBlocker("shine", null)).toBeNull()
    expect(motionBlocker("glint", plain)).toBe("accent")
    expect(motionBlocker("cascade", plain)).toBeNull()
  })
})

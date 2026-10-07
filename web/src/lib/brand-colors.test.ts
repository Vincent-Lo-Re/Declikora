import { describe, expect, it } from "vitest"

import {
  analyzeSvgColors,
  normalizeColor,
  recolorSvg,
} from "@/lib/brand-colors"

const svg = (body: string, attributes = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"${attributes}>${body}</svg>`

// Un logo courant : un carré orange, le nom en noir (deux lettres), un point blanc.
const logo = svg(
  '<rect fill="#F59E0B" width="4" height="4"/><path fill="#111" d="M5 0h1v4H5z"/>' +
    '<path style="fill: rgb(17, 17, 17)" d="M7 0h1v4H7z"/><circle fill="white" r="1"/>'
)

describe("les couleurs d'un logo SVG", () => {
  it("reconnaît les écritures courantes d'une couleur", () => {
    expect(normalizeColor("#F59E0B")).toBe("#f59e0b")
    expect(normalizeColor("#111")).toBe("#111111")
    expect(normalizeColor("rgb(17, 17, 17)")).toBe("#111111")
    expect(normalizeColor("white")).toBe("#ffffff")
    expect(normalizeColor("hsl(30 100% 50%)")).toBeNull()
  })

  it("trouve la couleur principale (le gris le plus employé) et l'accent (la couleur vive)", () => {
    expect(analyzeSvgColors(logo)).toEqual({
      main: "#111111",
      accent: "#f59e0b",
    })
  })

  it("compte en noir les formes sans couleur", () => {
    expect(
      analyzeSvgColors(svg('<path d="M0 0h1v1z"/><rect fill="#2563eb"/>'))
    ).toEqual({
      main: "#000000",
      accent: "#2563eb",
    })
    // Une couleur sur le groupe colore ses formes.
    expect(
      analyzeSvgColors(svg('<g fill="#2563eb"><path d="M0 0h1v1z"/></g>'))
    ).toEqual({ main: null, accent: "#2563eb" })
  })

  it("n'est pas modifiable avec une image, un dégradé, trop de couleurs ou une couleur inconnue", () => {
    expect(analyzeSvgColors(svg('<image href="logo.png"/>'))).toBeNull()
    expect(
      analyzeSvgColors(svg('<linearGradient id="d"/><rect fill="url(#d)"/>'))
    ).toBeNull()
    expect(
      analyzeSvgColors(
        svg(
          ["#111", "#f00", "#0f0", "#00f", "#ff0"]
            .map((color) => `<rect fill="${color}"/>`)
            .join("")
        )
      )
    ).toBeNull()
    expect(analyzeSvgColors(svg('<rect fill="hsl(30 100% 50%)"/>'))).toBeNull()
  })

  it("décline le logo : la principale et l'accent changent, le blanc reste", () => {
    const colors = analyzeSvgColors(logo)!
    const recolored = recolorSvg(logo, colors, {
      main: "oklch(0.985 0 0)",
      accent: "oklch(0.5 0.1 240)",
    })
    expect(recolored).toContain('fill="oklch(0.5 0.1 240)"')
    expect(recolored.match(/oklch\(0\.985 0 0\)/g)).toHaveLength(2)
    expect(recolored).toContain('fill="white"')
    expect(recolored).not.toContain("#F59E0B")
  })

  it("les formes noires par défaut prennent la nouvelle couleur principale", () => {
    const plain = svg('<path d="M0 0h1v1z"/>')
    const recolored = recolorSvg(plain, analyzeSvgColors(plain)!, {
      main: "oklch(0.985 0 0)",
      accent: "oklch(0.5 0.1 240)",
    })
    expect(recolored).toMatch(/<svg[^>]*fill="oklch\(0\.985 0 0\)"/)
  })
})

import { describe, expect, it } from "vitest"

import {
  BrandFileError,
  brandVariants,
  defaultBrandFile,
  brandFileFor,
  brandInitial,
  brandName,
  faviconHref,
  prepareBrandFile,
  prepareLoginImage,
  tabTitle,
  type AdminBrand,
} from "@/lib/admin-identity"
import { presetLogoColors } from "@/lib/palettes"
import { texts } from "@/texts"

describe("le nom de la marque", () => {
  it("affiche la marque, sinon « Ruche »", () => {
    expect(brandName("Essaim")).toBe("Essaim")
    expect(brandName(null)).toBe("Ruche")
    expect(brandName(undefined)).toBe("Ruche")
  })

  it("finit le titre de l'onglet par la marque, une fois lue", () => {
    expect(tabTitle("Mon compte", "Essaim")).toBe("Mon compte — Essaim")
    // Pas encore lue : le titre seul, plutôt que « Ruche » un instant.
    expect(tabTitle("Mon compte", "")).toBe("Mon compte")
  })

  it("dessine le favicon avec l'initiale de la marque", () => {
    expect(brandInitial("essaim")).toBe("E")
    expect(brandInitial("  Ruche")).toBe("R")
    expect(brandInitial("")).toBe("")
    expect(decodeURIComponent(faviconHref("Essaim"))).toContain(">E</text>")
    // Un caractère spécial ne casse pas l'image.
    expect(decodeURIComponent(faviconHref("<b>"))).toContain(">&lt;</text>")
  })

  it("prend la version du fond, sinon l'autre, sinon rien", () => {
    const file = (url: string) => ({ path: "x", url })
    const brand: AdminBrand = {
      name: "Essaim",
      "logotype-light": file("clair"),
      "logotype-dark": null,
      "monogram-light": null,
      "monogram-dark": null,
      loginImage: null,
      variants: {
        "logotype:zinc-blue:dark": "bleu",
        "logotype:neutral-none:dark": "origine-sombre",
        "logotype:neutral-none:light": "origine-clair",
      },
    }
    // Neutrine (ou une association libre) : le fichier envoyé pour ce fond, sinon sa déclinaison.
    expect(brandFileFor(brand, "logotype", "light")).toBe("clair")
    expect(brandFileFor(brand, "logotype", "dark")).toBe("origine-sombre")
    // La déclinaison de la palette du membre passe avant ; sans elle, le fichier envoyé.
    expect(brandFileFor(brand, "logotype", "dark", "zinc-blue")).toBe("bleu")
    expect(brandFileFor(brand, "logotype", "light", "zinc-blue")).toBe("clair")
    // Sans déclinaison, une seule version sert aussi sur fond sombre.
    expect(brandFileFor({ ...brand, variants: {} }, "logotype", "dark")).toBe(
      "clair"
    )
    expect(brandFileFor(brand, "monogram", "dark")).toBeNull()
    expect(brandFileFor(undefined, "logotype", "light")).toBeNull()
  })

  it("l'image de l'écran de connexion : une photo, pas un SVG ; illisible, refusée", async () => {
    const errors = texts.settings.adminIdentity.files.errors
    const refused = (file: File) =>
      prepareLoginImage(file).catch((error: Error) => error)

    const svg = await refused(
      new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" })
    )
    expect(svg).toBeInstanceOf(BrandFileError)
    expect(svg).toHaveProperty("message", errors.photoType)
    // jsdom ne décode pas d'image : comme une photo abîmée.
    const broken = await refused(
      new File(["x"], "photo.jpg", { type: "image/jpeg" })
    )
    expect(broken).toHaveProperty("message", errors.photo)
  })

  it("refuse un fichier d'un autre type, trop lourd ou un SVG illisible, avant l'envoi", async () => {
    const errors = texts.settings.adminIdentity.files.errors
    const refused = (file: File) =>
      prepareBrandFile(file).catch((error: Error) => error)

    const jpeg = await refused(
      new File(["x"], "logo.jpg", { type: "image/jpeg" })
    )
    expect(jpeg).toBeInstanceOf(BrandFileError)
    expect(jpeg).toHaveProperty("message", errors.type)

    const heavy = new File([new Uint8Array(1024 * 1024 + 1)], "logo.png", {
      type: "image/png",
    })
    expect(await refused(heavy)).toHaveProperty("message", errors.tooBig)

    const broken = new File(["pas un svg"], "logo.svg", {
      type: "image/svg+xml",
    })
    expect(await refused(broken)).toHaveProperty("message", errors.svg)
  })

  it("repère un SVG aux couleurs modifiables, et le décline pour les onze palettes", async () => {
    const logo = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect fill="#f59e0b" width="4" height="4"/><path fill="#111111" d="M5 0h1v4H5z"/></svg>',
      ],
      "logo.svg",
      { type: "image/svg+xml" }
    )
    const prepared = await prepareBrandFile(logo)
    expect(prepared.svg?.colors).toEqual({ main: "#111111", accent: "#f59e0b" })
    const variants = brandVariants(prepared.svg!)
    // Les onze palettes, Neutrine comprise, chacune pour fond clair et pour fond sombre.
    expect(variants).toHaveLength(11)
    // Neutrine garde l'accent du logo ; sur fond sombre, sa couleur principale passe en clair.
    const origin = variants.find(
      (variant) => variant.palette === "neutral-none"
    )!
    expect(origin.light).toContain("#f59e0b")
    expect(origin.dark).toContain("#f59e0b")
    expect(origin.dark).toContain(presetLogoColors("neutral-none").dark.main)
    const blue = variants.find((variant) => variant.palette === "zinc-blue")!
    expect(blue.light).toContain("oklch(0.488 0.243 264.376)")
    expect(blue.light).not.toContain("#f59e0b")

    // Un PNG part tel quel, sans question.
    const png = new File(["x"], "logo.png", { type: "image/png" })
    expect((await prepareBrandFile(png)).svg).toBeNull()
  })

  it("décline un logo d'une seule couleur à la couleur des boutons de chaque palette", async () => {
    const plain = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h4v4H0z"/><path d="M5 0h1v4H5z"/></svg>',
      ],
      "logo.svg",
      { type: "image/svg+xml" }
    )
    const prepared = await prepareBrandFile(plain)
    expect(prepared.svg?.colors).toEqual({ main: "#000000", accent: null })
    const blue = brandVariants(prepared.svg!).find(
      (variant) => variant.palette === "zinc-blue"
    )!
    // Le bleu des boutons de Zinbleu, en clair comme en sombre, plutôt que du noir ou du blanc.
    expect(blue.light).toContain("oklch(0.488 0.243 264.376)")
    expect(blue.dark).toContain(presetLogoColors("zinc-blue").dark.accent)
  })

  it("sans fichier ni nom de marque, les logos de Ruche, déclinés pour chaque palette", () => {
    const empty: AdminBrand = {
      name: null,
      "logotype-light": null,
      "logotype-dark": null,
      "monogram-light": null,
      "monogram-dark": null,
      loginImage: null,
      variants: {},
    }
    const origin = brandFileFor(empty, "monogram", "dark")!
    const blue = brandFileFor(empty, "monogram", "dark", "zinc-blue")!
    expect(decodeURIComponent(origin)).toContain("Symbole Ruche")
    // Neutrine garde le miel de Ruche ; Zinbleu le remplace par son bleu.
    expect(decodeURIComponent(origin).toLowerCase()).toContain("#f4cd48")
    expect(decodeURIComponent(blue).toLowerCase()).not.toContain("#f4cd48")
    expect(defaultBrandFile("logotype", "light", null)).toContain(
      "data:image/svg+xml"
    )
    // Une autre marque sans logo : son nom en texte, pas le logo de Ruche.
    expect(
      brandFileFor({ ...empty, name: "Essaim" }, "logotype", "light")
    ).toBeNull()
  })
})

import { describe, expect, it } from "vitest"

import { checkSvgMarkup, cleanSvg, SvgError } from "@/lib/media/svg"
// Fichiers types de la fonction « files » : bruts, et nettoyés par DOMPurify avec le réglage de
// l'admin (le serveur accepte ces derniers : supabase/functions/files/svg.test.ts).
import iconeRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/icone.svg?raw"
import illustratorRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/illustrator.svg?raw"
import inkscapeRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/inkscape.svg?raw"
import piegeRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/piege.svg?raw"
import encodageRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/encodage.svg?raw"
import imageSetRaw from "../../../../supabase/functions/files/fixtures/svg-bruts/image-set.svg?raw"
import iconeClean from "../../../../supabase/functions/files/fixtures/svg-nettoyes/icone.svg?raw"
import illustratorClean from "../../../../supabase/functions/files/fixtures/svg-nettoyes/illustrator.svg?raw"
import inkscapeClean from "../../../../supabase/functions/files/fixtures/svg-nettoyes/inkscape.svg?raw"
import piegeClean from "../../../../supabase/functions/files/fixtures/svg-nettoyes/piege.svg?raw"

const fixtures = {
  icone: [iconeRaw, iconeClean],
  illustrator: [illustratorRaw, illustratorClean],
  inkscape: [inkscapeRaw, inkscapeClean],
  piege: [piegeRaw, piegeClean],
} as const

/**
 * Forme comparable d'un SVG : chaque élément avec ses attributs triés et son texte, sans les
 * blancs de mise en forme ni les déclarations d'espaces de noms.
 */
function canonical(markup: string): string {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml")
  const walk = (element: Element): string => {
    const attributes = Array.from(element.attributes)
      .filter((attribute) => !attribute.name.startsWith("xmlns"))
      .map((attribute) => `${attribute.name}=${attribute.value}`)
      .sort()
      .join(" ")
    const children = Array.from(element.childNodes)
      .map((child) =>
        child.nodeType === Node.ELEMENT_NODE
          ? walk(child as Element)
          : (child.textContent ?? "").trim()
      )
      .filter(Boolean)
      .join("")
    return `<${element.localName} ${attributes}>${children}</${element.localName}>`
  }
  return walk(document.documentElement)
}

describe("nettoyage des SVG", () => {
  it("retire tout le code caché d'un SVG piégé", () => {
    const { markup } = cleanSvg(piegeRaw)

    expect(markup).not.toMatch(/script|onload|onclick|foreignObject|iframe/i)
    expect(markup).not.toMatch(/javascript:|pirate\.fr|@import|<animate|<set/i)
    expect(markup).not.toMatch(/<style|<a[\s>]/)
    // Les formes restent.
    expect(markup).toContain("<circle")
    expect(checkSvgMarkup(markup)).toEqual({ ok: true })
  })

  it.each(Object.entries(fixtures))(
    "donne pour « %s » le même résultat que les fichiers acceptés par le serveur",
    (name, [raw, clean]) => {
      const { markup } = cleanSvg(raw)
      // Seule différence voulue : un <style> sans adresse extérieure est gardé (couleurs des
      // exports Illustrator), ce que le serveur accepte aussi.
      const withoutStyle = markup.replace(/<style[\s\S]*?<\/style>/, "")
      expect(canonical(withoutStyle)).toBe(canonical(clean))
      expect(checkSvgMarkup(markup)).toEqual({ ok: true })
      expect(markup.includes("<style")).toBe(name === "illustrator")
    }
  )

  it("garde un <style> sans adresse extérieure, retire celui qui en charge une", () => {
    const svg = (css: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg"><style>${css}</style><rect class="a"/></svg>`
    expect(cleanSvg(svg(".a { fill: url(#g); }")).markup).toContain(
      ".a { fill: url(#g); }"
    )
    for (const css of [
      "@import url(https://x.fr/a.css);",
      ".a { fill: url(https://x.fr/f); }",
      ".a { fill: u\\72l(https://x.fr/f); }",
      "@font-face { src: url(a.woff) }",
    ]) {
      expect(cleanSvg(svg(css)).markup).not.toContain("<style")
    }
  })

  it("garde les références locales et les images intégrées", () => {
    const { markup } = cleanSvg(illustratorRaw)
    expect(markup).toContain("data:image/png;base64,")
    expect(cleanSvg(iconeRaw).markup).toMatch(/href="#c"/)
  })

  it("ajoute l'espace de noms SVG quand le fichier l'oublie", () => {
    const { markup, width, height } = cleanSvg(
      '<svg viewBox="0 0 48 32"><rect width="4" height="4"/></svg>'
    )
    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect({ width, height }).toEqual({ width: 48, height: 32 })
  })

  it("écrit un XML valide, même avec une entité HTML dans le texte", () => {
    const { markup } = cleanSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>a&nbsp;b</text></svg>'
    )
    expect(markup).not.toContain("&nbsp;")
    expect(checkSvgMarkup(markup)).toEqual({ ok: true })
  })

  it("refuse un DOCTYPE qui déclare des entités", () => {
    const text = `<?xml version="1.0"?>
<!DOCTYPE svg [<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;">]>
<svg xmlns="http://www.w3.org/2000/svg"><text>&b;</text></svg>`
    expect(() => cleanSvg(text)).toThrow(SvgError)
  })

  it("refuse un fichier qui n'est pas un SVG", () => {
    expect(() => cleanSvg("<html><body>bonjour</body></html>")).toThrow(
      SvgError
    )
    expect(() => cleanSvg("pas du tout du XML")).toThrow(SvgError)
  })

  it("refuse un SVG avec des caractères de contrôle (encodage à états)", () => {
    // Déclaré en ISO-2022-JP, avec des octets ESC : le navigateur le lirait autrement.
    expect(() => cleanSvg(encodageRaw)).toThrow(
      expect.objectContaining({ reason: "svg_illisible" })
    )
  })

  it("écrit toujours de l'UTF-8 sans déclaration d'encodage", () => {
    const { markup } = cleanSvg(
      '<?xml version="1.0" encoding="ISO-8859-1"?><svg xmlns="http://www.w3.org/2000/svg"><text>été</text></svg>'
    )
    expect(markup).not.toMatch(/<\?xml|encoding/)
    expect(markup).toContain("été")
    expect(checkSvgMarkup(markup)).toEqual({ ok: true })
  })

  it("retire le CSS qui charge une adresse sans url() (image-set, chaînes)", () => {
    const { markup } = cleanSvg(imageSetRaw)
    expect(markup).not.toMatch(/pirate\.fr|image-set|<style/)
    expect(markup).toContain("<rect")
    expect(markup).toContain("<circle")
    expect(checkSvgMarkup(markup)).toEqual({ ok: true })
  })

  it("retire une adresse cachée par des références de caractères", () => {
    const { markup } = cleanSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="&#x6A;avascript:alert(1)"/><rect style="fill:u\\72l(https://x.fr/a)" width="1" height="1"/></svg>'
    )
    expect(markup).not.toMatch(/javascript|x\.fr|href=|style=/)
    expect(checkSvgMarkup(markup)).toEqual({ ok: true })
  })
})

describe("vérification (mêmes règles que la fonction « files »)", () => {
  it("refuse ce que le serveur refuse", () => {
    const svg = (body: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${body}</svg>`
    expect(checkSvgMarkup(svg("<script>alert(1)</script>"))).toEqual({
      ok: false,
      reason: "svg_element_interdit",
    })
    expect(checkSvgMarkup(svg('<rect onclick="x()"/>'))).toEqual({
      ok: false,
      reason: "svg_attribut_interdit",
    })
    expect(checkSvgMarkup(svg('<image href="https://x.fr/a.png"/>'))).toEqual({
      ok: false,
      reason: "svg_lien_externe",
    })
    expect(
      checkSvgMarkup(svg("<style>@import url(https://x.fr/a.css);</style>"))
    ).toEqual({ ok: false, reason: "svg_lien_externe" })
    expect(checkSvgMarkup("<svg>")).toEqual({
      ok: false,
      reason: "svg_illisible",
    })
  })

  it("refuse un autre encodage que UTF-8 et les caractères de contrôle", () => {
    const body = '<svg xmlns="http://www.w3.org/2000/svg"><desc>a</desc></svg>'
    for (const markup of [
      `<?xml version="1.0" encoding="ISO-2022-JP"?>${body}`,
      `<?xml version="1.0" encoding='Shift_JIS'?>${body}`,
      `<?XML version="1.0"?>${body}`,
      body.replace("a", "a\u001Bb"),
      body.replace("a", "a\u0000b"),
    ]) {
      expect(checkSvgMarkup(markup), markup).toEqual({
        ok: false,
        reason: "svg_illisible",
      })
    }
    expect(
      checkSvgMarkup(`<?xml version="1.0" encoding="UTF-8"?>${body}`)
    ).toEqual({ ok: true })
  })

  it("refuse le CSS qui charge une adresse sans url()", () => {
    const svg = (body: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`
    for (const markup of [
      svg(
        "<rect style=\"background-image:image-set('https://x.fr/p.png' 1x)\"/>"
      ),
      svg(
        '<style>.a { background: -webkit-image-set("//x.fr/p.png" 1x) }</style>'
      ),
      svg("<style>.a { cursor: 'https://x.fr/c.cur' }</style>"),
      svg("<style>.a { background: cross-fade(url(#a), url(#b)) }</style>"),
    ]) {
      expect(checkSvgMarkup(markup), markup).toEqual({
        ok: false,
        reason: "svg_lien_externe",
      })
    }
    expect(
      checkSvgMarkup(
        svg("<text style=\"font-family: 'Open Sans', sans-serif\">A</text>")
      )
    ).toEqual({ ok: true })
  })
})

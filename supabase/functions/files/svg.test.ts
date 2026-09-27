import { assertEquals } from "@std/assert"
import { checkSvg } from "./svg.ts"
import { checkContent } from "./work.ts"

const open = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
  'viewBox="0 0 10 10">'

function svg(inner: string): string {
  return `${open}${inner}</svg>`
}

function reason(text: string): string | null {
  const result = checkSvg(text)
  return result.ok ? null : result.reason
}

Deno.test("SVG propres acceptés", () => {
  for (
    const text of [
      svg('<rect width="10" height="10" fill="#f00"/>'),
      `<?xml version="1.0" encoding="UTF-8"?>\n${svg('<circle cx="5" cy="5" r="4"/>')}`,
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
      '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' + svg("<g/>"),
      svg(
        '<defs><linearGradient id="d"><stop offset="0" stop-color="red"/></linearGradient>' +
          '<symbol id="s"><path d="M0 0h1"/></symbol></defs>' +
          '<rect fill="url(#d)" style="stroke: url(\'#d\'); opacity: .5"/>' +
          '<use href="#s"/><use xlink:href="#s"/>',
      ),
      svg('<style>.a { fill: url(#d) } /* commentaire */</style><path class="a" d="M0 0"/>'),
      svg("<title>Logo</title><desc>Un logo</desc><!-- commentaire --><text>A &amp; B</text>"),
      svg(
        '<image width="1" height="1" href="data:image/png;base64,iVBORw0KGgo="/>' +
          '<filter id="f"><feGaussianBlur stdDeviation="2"/>' +
          '<feImage xlink:href="data:image/webp;base64,UklGRg=="/></filter>',
      ),
      svg('<text xml:space="preserve">  a  </text>'),
      // Encodage UTF-8 déclaré (casse et guillemets libres), tabulation et retours permis.
      `<?xml version='1.0' encoding='utf-8' standalone='no'?>${svg("<desc>a\tb\r\nc</desc>")}`,
      // Police nommée entre guillemets : une chaîne qui n'est pas une adresse.
      svg("<text style=\"font-family: 'Open Sans', sans-serif\">A</text>"),
    ]
  ) {
    assertEquals(checkSvg(text), { ok: true }, text)
  }
})

Deno.test("SVG piégés refusés", () => {
  const cases: Array<[string, string]> = [
    [svg("<script>alert(1)</script>"), "svg_element_interdit"],
    [svg("<SCRIPT>alert(1)</SCRIPT>"), "svg_element_interdit"],
    [svg('<rect onload="alert(1)"/>'), "svg_attribut_interdit"],
    [svg('<rect ONCLICK="alert(1)"/>'), "svg_attribut_interdit"],
    [svg("<foreignObject><div/></foreignObject>"), "svg_element_interdit"],
    [svg('<iframe src="https://pirate.fr"/>'), "svg_element_interdit"],
    [svg('<embed src="x"/>'), "svg_element_interdit"],
    [svg('<object data="x"/>'), "svg_element_interdit"],
    [svg('<a href="javascript:alert(1)"><text>x</text></a>'), "svg_element_interdit"],
    [svg('<animate attributeName="href" to="javascript:alert(1)"/>'), "svg_element_interdit"],
    [svg('<set attributeName="onmouseover" to="alert(1)"/>'), "svg_element_interdit"],
    [svg('<use href="https://pirate.fr/sprite.svg#a"/>'), "svg_lien_externe"],
    [svg('<use xlink:href="data:image/svg+xml;base64,PHN2Zy8+#a"/>'), "svg_lien_externe"],
    [svg('<image href="https://pirate.fr/pixel.png"/>'), "svg_lien_externe"],
    [svg('<image href="data:image/svg+xml;base64,PHN2Zy8+"/>'), "svg_lien_externe"],
    [svg('<image href="&#x6A;avascript:alert(1)"/>'), "svg_lien_externe"],
    [svg('<feImage href="https://pirate.fr/x.png"/>'), "svg_lien_externe"],
    [svg('<filter><feImage href="https://pirate.fr/x.png"/></filter>'), "svg_lien_externe"],
    [svg('<rect fill="url(https://pirate.fr/x)"/>'), "svg_lien_externe"],
    [svg('<rect style="fill:url(https://pirate.fr/x)"/>'), "svg_lien_externe"],
    [svg('<rect style="fill:u\\72l(https://pirate.fr/x)"/>'), "svg_attribut_interdit"],
    [svg("<style>@import url(https://pirate.fr/a.css);</style>"), "svg_lien_externe"],
    [svg("<style>@IMPORT 'https://pirate.fr/a.css';</style>"), "svg_lien_externe"],
    [svg("<rect style=\"background:url('https://pirate.fr/x')\"/>"), "svg_lien_externe"],
    [svg('<rect fill="java&#x09;script:alert(1)"/>'), "svg_attribut_interdit"],
    [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:h="http://www.w3.org/1999/xhtml">' +
      "<h:script>alert(1)</h:script></svg>",
      "svg_element_interdit",
    ],
    [
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:e="urn:x" e:onload="alert(1)"/>',
      "svg_attribut_interdit",
    ],
    [
      '<?xml-stylesheet href="https://pirate.fr/a.css"?>' + svg("<g/>"),
      "svg_element_interdit",
    ],
    [
      '<!DOCTYPE svg [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]>' + svg("<text>&b;</text>"),
      "svg_illisible",
    ],
    [svg("<text>&inconnue;</text>"), "svg_illisible"],
    [svg("<g>"), "svg_illisible"],
    ["pas du tout du XML", "svg_illisible"],
    // Encodage : le serveur lit en UTF-8, le navigateur suivrait la déclaration.
    [`<?xml version="1.0" encoding="ISO-2022-JP"?>${svg("<g/>")}`, "svg_illisible"],
    [`<?xml version="1.0" encoding='Shift_JIS'?>${svg("<g/>")}`, "svg_illisible"],
    [`<?xml version="1.0" encoding="utf-16"?>${svg("<g/>")}`, "svg_illisible"],
    [` <?xml version="1.0" encoding="ISO-2022-JP"?>${svg("<g/>")}`, "svg_illisible"],
    [`<?XML version="1.0"?>${svg("<g/>")}`, "svg_illisible"],
    [svg("<desc>a\u001Bb</desc>"), "svg_illisible"],
    [svg("<desc>a\u0000b</desc>"), "svg_illisible"],
    [svg("<desc>a\uFFFEb</desc>"), "svg_illisible"],
    // CSS : adresses sans url().
    [
      svg("<rect style=\"background-image:image-set('https://pirate.fr/p.png' 1x)\"/>"),
      "svg_lien_externe",
    ],
    [
      svg('<style>.a { background: -webkit-image-set("//pirate.fr/p.png" 1x) }</style>'),
      "svg_lien_externe",
    ],
    [
      svg('<rect style="background:image(&quot;https://pirate.fr/p.png&quot;)"/>'),
      "svg_lien_externe",
    ],
    [
      svg("<style>.a { background: cross-fade(url(#a), url(#b), 50%) }</style>"),
      "svg_lien_externe",
    ],
    [svg("<style>.a { cursor: 'https://pirate.fr/c.cur' }</style>"), "svg_lien_externe"],
    [svg('<rect style="mask: &quot;data:image/png;base64,AAAA&quot;"/>'), "svg_lien_externe"],
    ['<html xmlns="http://www.w3.org/1999/xhtml"/>', "svg_illisible"],
    ["<svg><rect/></svg>", "svg_illisible"],
    ['<svg xmlns="urn:autre"><rect/></svg>', "svg_illisible"],
  ]
  for (const [text, expected] of cases) {
    assertEquals(reason(text), expected, text)
  }
})

Deno.test("un gros SVG (5 Mo) est analysé", () => {
  const shapes = '<rect x="1" y="1" width="2" height="2" fill="#123456"/>'.repeat(90_000)
  const text = svg(shapes)
  assertEquals(text.length > 4_900_000, true)
  assertEquals(checkSvg(text), { ok: true })
})

// Cohérence avec l'admin : les fichiers de fixtures/svg-nettoyes sont la sortie de DOMPurify
// 3.4.16 avec le réglage prévu pour l'admin (profils svg et svgFilters, ADD_TAGS ["use"],
// FORBID_TAGS ["style", "a"], href local ou image intégrée seulement, style sans url() externe
// ni @import ; prologue <?xml?> et DOCTYPE retirés avant). Tout SVG ainsi nettoyé doit passer.
Deno.test("la sortie de DOMPurify (réglage de l'admin) est acceptée", async () => {
  for await (const entry of Deno.readDir(new URL("./fixtures/svg-nettoyes/", import.meta.url))) {
    const text = await Deno.readTextFile(
      new URL(`./fixtures/svg-nettoyes/${entry.name}`, import.meta.url),
    )
    assertEquals(checkSvg(text), { ok: true }, entry.name)
  }
})

Deno.test("fichiers bruts : exports courants acceptés, fichier piégé refusé", async () => {
  const read = (name: string) =>
    Deno.readTextFile(new URL(`./fixtures/svg-bruts/${name}`, import.meta.url))
  // Illustrator : <?xml?>, commentaire, <style> avec url(#id) local.
  assertEquals(checkSvg(await read("illustrator.svg")), { ok: true })
  assertEquals(checkSvg(await read("icone.svg")), { ok: true })
  // Inkscape : éléments et attributs d'autres espaces de noms (sodipodi, inkscape, rdf).
  assertEquals(reason(await read("inkscape.svg")), "svg_attribut_interdit")
  assertEquals(checkSvg(await read("piege.svg")).ok, false)
  // CSS : image-set() et chaînes en forme d'adresse.
  assertEquals(reason(await read("image-set.svg")), "svg_lien_externe")
})

Deno.test("encodage : seuls les octets UTF-8 lus pareil par le serveur et le navigateur passent", async () => {
  const bytes = (name: string) =>
    Deno.readFile(new URL(`./fixtures/svg-bruts/${name}`, import.meta.url))
  const refused = (result: ReturnType<typeof checkContent>) => result.ok ? null : result.reason
  // Déclaré en ISO-2022-JP, avec des octets ESC : refusé.
  assertEquals(refused(checkContent("svg", await bytes("encodage.svg"))), "svg_illisible")
  // UTF-16 (avec BOM) : ce n'est pas de l'UTF-8.
  const utf16 = new Uint8Array([0xff, 0xfe, ...new TextEncoder().encode(svg("<g/>"))])
  assertEquals(refused(checkContent("svg", utf16)), "svg_illisible")
  // Latin-1 déclaré mais octets invalides en UTF-8 : refusé à la lecture.
  const latin1 = new Uint8Array([
    ...new TextEncoder().encode(`<?xml version="1.0" encoding="ISO-8859-1"?>${open}<desc>`),
    0xe9,
    ...new TextEncoder().encode("</desc></svg>"),
  ])
  assertEquals(refused(checkContent("svg", latin1)), "svg_illisible")
  // BOM UTF-8 et déclaration UTF-8 : accepté.
  const bom = new Uint8Array([
    0xef,
    0xbb,
    0xbf,
    ...new TextEncoder().encode(`<?xml version="1.0" encoding="UTF-8"?>${svg("<g/>")}`),
  ])
  assertEquals(checkContent("svg", bom), { ok: true })
})

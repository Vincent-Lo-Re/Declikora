import { assertEquals } from "@std/assert"
import { checkLottie } from "./lottie.ts"
import { checkContent } from "./work.ts"

const valid = {
  v: "5.12.2",
  fr: 30,
  ip: 0,
  op: 60,
  w: 512,
  h: 512,
  nm: "Animation",
  ddd: 0,
  assets: [
    { id: "comp_0", layers: [] },
    {
      id: "image_0",
      w: 1,
      h: 1,
      u: "",
      p: "data:image/png;base64,iVBORw0KGgo=",
      e: 1,
    },
  ],
  layers: [{ ty: 4, nm: "Forme", ip: 0, op: 60, st: 0, ks: {}, shapes: [] }],
  fonts: { list: [{ fName: "Inter", fFamily: "Inter", fStyle: "Regular", origin: 0 }] },
}

function reason(value: unknown): string | null {
  const result = checkLottie(typeof value === "string" ? value : JSON.stringify(value))
  return result.ok ? null : result.reason
}

Deno.test("Lottie valides acceptés", () => {
  assertEquals(reason(valid), null)
  // La spécification 1.0.1 n'exige pas « v » ; « ver » est accepté.
  const { v: _v, ...withoutV } = valid
  assertEquals(reason({ ...withoutV, ver: 10100 }), null)
  assertEquals(reason({ ...withoutV }), null)
  // Les expressions ne sont pas refusées (l'app ne les exécute pas).
  assertEquals(
    reason({ ...valid, layers: [{ ty: 4, ks: { o: { x: "var $bm_rt = 100;" } } }] }),
    null,
  )
})

Deno.test("Lottie invalides refusés", () => {
  const cases: Array<[unknown, string]> = [
    ["{ pas du json", "lottie_illisible"],
    ["[]", "lottie_invalide"],
    ["null", "lottie_invalide"],
    [{ ...valid, layers: [] }, "lottie_invalide"],
    [{ ...valid, layers: undefined }, "lottie_invalide"],
    [{ ...valid, w: 0 }, "lottie_invalide"],
    [{ ...valid, h: 10.5 }, "lottie_invalide"],
    [{ ...valid, w: 100000 }, "lottie_invalide"],
    [{ ...valid, fr: 0 }, "lottie_invalide"],
    [{ ...valid, fr: "30" }, "lottie_invalide"],
    [{ ...valid, ip: 10, op: 10 }, "lottie_invalide"],
    [{ ...valid, op: undefined }, "lottie_invalide"],
    [{ ...valid, v: 5 }, "lottie_invalide"],
    [{ ...valid, ver: 99 }, "lottie_invalide"],
    [{ ...valid, assets: {} }, "lottie_invalide"],
    [
      { ...valid, assets: [{ id: "i", w: 1, h: 1, u: "images/", p: "img.png", e: 0 }] },
      "lottie_lien_externe",
    ],
    [
      { ...valid, assets: [{ id: "i", w: 1, h: 1, p: "https://pirate.fr/x.png", e: 1 }] },
      "lottie_lien_externe",
    ],
    [
      {
        ...valid,
        assets: [{ id: "i", w: 1, h: 1, p: "data:image/svg+xml;base64,PHN2Zz4=", e: 1 }],
      },
      "lottie_lien_externe",
    ],
    [
      { ...valid, assets: [{ id: "i", p: "data:audio/mpeg;base64,AAAA", e: 1 }] },
      "lottie_lien_externe",
    ],
    [
      { ...valid, fonts: { list: [{ fName: "X", fPath: "https://pirate.fr/x.woff" }] } },
      "lottie_lien_externe",
    ],
    [
      { ...valid, fonts: { list: [{ fName: "X", origin: 1 }] } },
      "lottie_lien_externe",
    ],
  ]
  for (const [value, expected] of cases) {
    assertEquals(reason(value), expected, JSON.stringify(value).slice(0, 120))
  }
})

Deno.test("trop lourd ou illisible : refusé avant l'analyse", () => {
  const big = new Uint8Array(5 * 1024 * 1024 + 1)
  assertEquals(checkContent("lottie", big), {
    ok: false,
    reason: "fichier_trop_lourd",
    detail: `${big.byteLength} octets`,
  })
  const notUtf8 = new Uint8Array([0xff, 0xfe, 0x00])
  assertEquals((checkContent("lottie", notUtf8) as { reason: string }).reason, "lottie_illisible")
  assertEquals((checkContent("svg", notUtf8) as { reason: string }).reason, "svg_illisible")
  const ok = new TextEncoder().encode(JSON.stringify(valid))
  assertEquals(checkContent("lottie", ok), { ok: true })
})

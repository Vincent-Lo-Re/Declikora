import { describe, expect, it } from "vitest"

import { checkLottie } from "@/lib/media/lottie"

const animation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 512,
  h: 256,
  layers: [{ ty: 4 }],
}
const text = (value: unknown) => JSON.stringify(value)

describe("vérification des animations Lottie", () => {
  it("accepte une animation valide et donne ses dimensions", () => {
    expect(checkLottie(text(animation))).toEqual({
      ok: true,
      width: 512,
      height: 256,
    })
    // « v » n'est pas exigé par la spécification 1.0.1.
    expect(checkLottie(text({ ...animation, v: undefined })).ok).toBe(true)
  })

  it("refuse un JSON illisible ou une animation incomplète", () => {
    expect(checkLottie("{pas du json")).toEqual({
      ok: false,
      reason: "lottie_illisible",
    })
    expect(checkLottie(text({ ...animation, layers: [] }))).toEqual({
      ok: false,
      reason: "lottie_invalide",
    })
    expect(checkLottie(text({ ...animation, op: 0 })).ok).toBe(false)
    expect(checkLottie(text({ ...animation, w: 10000 })).ok).toBe(false)
  })

  it("refuse une image ou une police chargée par adresse", () => {
    expect(
      checkLottie(
        text({
          ...animation,
          assets: [{ id: "i", w: 1, h: 1, u: "images/", p: "a.png", e: 0 }],
        })
      )
    ).toEqual({ ok: false, reason: "lottie_lien_externe" })
    expect(
      checkLottie(
        text({
          ...animation,
          assets: [
            {
              id: "i",
              w: 1,
              h: 1,
              p: "data:image/png;base64,iVBORw0KGgo=",
              e: 1,
            },
          ],
        })
      ).ok
    ).toBe(true)
    expect(
      checkLottie(
        text({
          ...animation,
          fonts: { list: [{ fName: "A", fPath: "https://x.fr/a.ttf" }] },
        })
      )
    ).toEqual({ ok: false, reason: "lottie_lien_externe" })
  })
})

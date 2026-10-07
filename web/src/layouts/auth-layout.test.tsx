import { screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import * as identityApi from "@/lib/admin-identity"
import { fakeAuth, renderApp } from "@/test/render"
import { texts } from "@/texts"

vi.mock("@/lib/admin-identity", async (importOriginal) => {
  const actual = await importOriginal<typeof identityApi>()
  return { ...actual, getAdminBrand: vi.fn() }
})

const brand = (
  loginImage: identityApi.AdminBrand["loginImage"]
): identityApi.AdminBrand => ({
  name: null,
  "logotype-light": null,
  "logotype-dark": null,
  "monogram-light": null,
  "monogram-dark": null,
  loginImage,
  variants: {},
})

afterEach(() => vi.clearAllMocks())

/** Le monogramme animé, sur l'image de droite : un SVG en ligne, nommé par la marque. */
const animatedMonogram = () =>
  document.querySelector(
    `[data-monogram] [role="img"][aria-label="${texts.app.name}"]`
  )

describe("pages de connexion (modèle login-04)", () => {
  it("montre l'image de l'écran de connexion à droite du formulaire", async () => {
    const url = "https://exemple.test/marque/connexion/photo.webp"
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(
      brand({ path: "connexion/photo.webp", url })
    )
    await renderApp("/connexion", fakeAuth("signed-out"))

    expect(
      await screen.findByRole("heading", { name: texts.signIn.title })
    ).toBeVisible()
    await waitFor(() =>
      expect(document.querySelector('img[alt=""]')).toHaveAttribute("src", url)
    )
    // Par-dessus : le monogramme de Ruche (sans fichier ni nom de marque), en SVG animé.
    await waitFor(() => expect(animatedMonogram()).not.toBeNull())
  })

  it("sans image, met celle de Ruche, sous le voile et le monogramme", async () => {
    vi.mocked(identityApi.getAdminBrand).mockResolvedValue(brand(null))
    await renderApp("/connexion", fakeAuth("signed-out"))

    // Sans fichier ni nom de marque : le logotype de Ruche en haut, son monogramme à droite.
    await waitFor(() => expect(animatedMonogram()).not.toBeNull())
    // Ses contours se tracent, puis la lettre apparaît ; le segment miel a sa lueur.
    expect(
      animatedMonogram()?.querySelectorAll('[data-motion="trace"]').length
    ).toBeGreaterThan(0)
    expect(animatedMonogram()?.querySelector("[data-accent]")).not.toBeNull()
    expect(document.querySelector('img[alt=""]')).toHaveAttribute(
      "src",
      expect.stringContaining("connexion.webp")
    )
    // Sous la carte, le © de l'année en cours.
    expect(
      screen.getByText(
        texts.copyright(new Date().getFullYear(), texts.app.name)
      )
    ).toBeVisible()
  })
})

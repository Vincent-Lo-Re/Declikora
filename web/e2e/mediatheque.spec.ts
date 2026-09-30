// Parcours de la médiathèque (étape 3), contre le Supabase local complet : Storage, fonction
// « files » et tâches planifiées (pg_cron → pg_net → files).
//
// 1. Le parcours principal : connexion avec les deux codes, photo réduite dans le navigateur
//    puis « Prêt », texte alternatif, SVG piégé nettoyé dans le navigateur puis accepté par le
//    serveur, corbeille, restauration, corbeille de nouveau et « Vider la corbeille » : l'objet
//    disparaît du Storage local.
// 2. Le même SVG piégé envoyé SANS passer par l'admin : la tâche planifiée « fichiers »
//    (pg_net → files) le fait vérifier, le serveur le refuse, l'admin l'affiche.
// 3. Les autres formats : GIF animé, animation Lottie, gros audio (envoi reprenable), PDF,
//    format refusé ; filtres, recherche, « Non utilisés », mise à la corbeille en masse (cases
//    à cocher) et effacement d'un seul élément.

import { readFileSync } from "node:fs"
import type { Page } from "@playwright/test"

import { gifBytes } from "../src/test/gif.ts"
import { texts } from "../src/texts.ts"
import { expect, signIn, test } from "./support/fixtures.ts"
import {
  activeScheduledJobs,
  downloadObject,
  fakeMp3,
  lottieJson,
  photoPng,
  readMedia,
  runScheduledKick,
  sendWithoutAdmin,
  storedIn,
  webpSize,
} from "./support/media.ts"
import { accessToken } from "./support/team-api.ts"

const KB = 1024
const MB = 1024 * KB
const PROTECTED = "files-protected"

const piege = readFileSync(
  new URL(
    "../../supabase/functions/files/fixtures/svg-bruts/piege.svg",
    import.meta.url
  )
)

// Des noms uniques : la base locale peut contenir d'autres fichiers, et les tests se rejouent.
function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** La carte d'un fichier dans la grille. */
function card(page: Page, name: string) {
  return page.getByRole("button", { name: texts.media.open(name) })
}

/** La fenêtre des envois, en bas à droite. */
function uploadWindow(page: Page) {
  return page.getByRole("region", { name: texts.media.uploads.title })
}

/** Une ligne de la fenêtre des envois. */
function upload(page: Page, name: string) {
  return uploadWindow(page).getByRole("listitem").filter({ hasText: name })
}

/** Ouvre la médiathèque et se connecte (e-mail, code reçu, puis double vérification). */
async function openMediaLibrary(
  page: Page,
  account: Parameters<typeof signIn>[1]
) {
  await page.goto("/mediatheque")
  await signIn(page, account)
  await expect(page).toHaveURL(/\/mediatheque$/)
  await expect(
    page.getByRole("heading", { name: texts.sections.media.title })
  ).toBeVisible()
}

/** Met un fichier à la corbeille depuis sa fiche. */
async function trashFromSheet(page: Page, name: string) {
  await card(page, name).click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: texts.media.detail.trash })
    .click()
  await expect(page.getByText(texts.media.detail.trashed)).toBeVisible()
  await expect(card(page, name)).toHaveCount(0)
}

test("un membre envoie une photo et un SVG piégé, décrit la photo, la met à la corbeille, la restaure puis l'efface", async ({
  page,
  team,
}) => {
  test.setTimeout(150_000)
  const admin = await team.createAdmin("Mona Médias")
  const id = uniqueId()
  const photoName = `photo-${id}.png`
  const svgName = `piege-${id}.svg`

  await openMediaLibrary(page, admin)

  // Une photo de 2 600 × 1 800 (plusieurs Mo) et un SVG piégé.
  const original = photoPng(2600, 1800)
  expect(original.length).toBeGreaterThan(1 * MB)
  await page.getByLabel(texts.media.uploadInput).setInputFiles([
    { name: photoName, mimeType: "image/png", buffer: original },
    { name: svgName, mimeType: "image/svg+xml", buffer: piege },
  ])
  for (const name of [photoName, svgName]) {
    await expect(upload(page, name)).toHaveAttribute("data-stage", "done", {
      timeout: 60_000,
    })
  }

  // Les deux passent à « Prêt » (le SVG après la vérification du serveur).
  for (const name of [photoName, svgName]) {
    await expect(
      card(page, name).getByRole("img", { name: texts.media.status.ready })
    ).toBeVisible({
      timeout: 60_000,
    })
  }
  // Tout est prêt : la fenêtre des envois se ferme toute seule.
  await expect(uploadWindow(page)).toHaveCount(0)

  // La photo a été réduite dans le navigateur : WebP, 300 Ko au plus, 2 000 px au plus, mêmes
  // proportions, cache de 60 secondes. L'objet stocké est bien celui annoncé.
  const photo = await readMedia(photoName)
  expect(photo).toMatchObject({
    mime: "image/webp",
    status: "ready",
    cache_control: "max-age=60",
  })
  expect(photo!.path).toMatch(/\.webp$/)
  expect(photo!.size_bytes).toBeLessThanOrEqual(300 * KB)
  expect(Math.max(photo!.width!, photo!.height!)).toBeLessThanOrEqual(2000)
  expect(photo!.width! / photo!.height!).toBeCloseTo(2600 / 1800, 1)
  expect(await storedIn(photo!.path)).toEqual([PROTECTED])
  const stored = await downloadObject(PROTECTED, photo!.path)
  expect(stored?.length).toBe(photo!.size_bytes)
  expect(webpSize(stored!)).toEqual({
    width: photo!.width,
    height: photo!.height,
  })

  // Le SVG a été nettoyé avant l'envoi (plus rien d'actif ni d'extérieur), puis accepté par le
  // serveur.
  const svg = await readMedia(svgName)
  expect(svg).toMatchObject({
    mime: "image/svg+xml",
    status: "ready",
    reject_reason: null,
    cache_control: "max-age=60",
  })
  const cleaned = (await downloadObject(PROTECTED, svg!.path))!.toString("utf8")
  expect(cleaned).toContain("<circle")
  for (const trap of [
    "<script",
    "onload",
    "onclick",
    "javascript:",
    "pirate.fr",
    "foreignObject",
    "<iframe",
    "<animate",
    "<set",
    "@import",
  ]) {
    expect(cleaned).not.toContain(trap)
  }

  // Texte alternatif, depuis la fiche.
  await card(page, photoName).click()
  const sheet = page.getByRole("dialog")
  const preview = sheet.locator("img")
  await expect(preview).toBeVisible()
  await sheet.getByLabel(texts.media.detail.alt).fill("Un dégradé coloré")
  await sheet.getByRole("button", { name: texts.common.save }).click()
  await expect(page.getByText(texts.media.detail.saved)).toBeVisible()
  await expect(preview).toHaveAttribute("alt", "Un dégradé coloré")
  expect(await readMedia(photoName)).toMatchObject({ alt: "Un dégradé coloré" })

  // Corbeille, puis « Annuler » dans le message : le fichier revient aussitôt.
  await sheet.getByRole("button", { name: texts.media.detail.trash }).click()
  const trashed = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: texts.media.detail.trashed })
  await expect(trashed).toBeVisible()
  await expect(card(page, photoName)).toHaveCount(0)
  await trashed.getByRole("button", { name: texts.media.detail.undo }).click()
  await expect(page.getByText(texts.media.detail.restored)).toBeVisible()
  await expect(
    card(page, photoName).getByRole("img", { name: texts.media.status.ready })
  ).toBeVisible()

  // Corbeille de nouveau : le fichier quitte la médiathèque, son objet reste.
  await trashFromSheet(page, photoName)
  await expect(card(page, svgName)).toBeVisible()
  expect(await storedIn(photo!.path)).toEqual([PROTECTED])

  // Restauration depuis la page Corbeille : le fichier revient, prêt, avec son texte.
  await page.goto("/corbeille")
  const row = page.getByRole("row").filter({ hasText: photoName })
  await expect(row).toContainText("Fichier · Image")
  await expect(row).toContainText(admin.fullName)
  await row
    .getByRole("button", { name: texts.trash.restoreItem(photoName) })
    .click()
  await expect(page.getByText(texts.trash.restored(photoName))).toBeVisible()
  await expect(row).toHaveCount(0)

  await page.goto("/mediatheque")
  await expect(
    card(page, photoName).getByRole("img", { name: texts.media.status.ready })
  ).toBeVisible()
  expect(await readMedia(photoName)).toMatchObject({
    id: photo!.id,
    alt: "Un dégradé coloré",
  })

  // Corbeille de nouveau, puis « Vider la corbeille » : la ligne ET l'objet disparaissent.
  await trashFromSheet(page, photoName)
  await page.goto("/corbeille")
  await expect(
    page.getByRole("row").filter({ hasText: photoName })
  ).toBeVisible()
  await page.getByRole("button", { name: texts.trash.empty }).click()
  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toContainText(texts.trash.confirmEmpty.title)
  await confirmation
    .getByRole("button", { name: texts.trash.confirmEmpty.confirm })
    .click()
  await expect(page.getByText(texts.trash.emptyState.title)).toBeVisible()

  await expect
    .poll(() => storedIn(photo!.path), { timeout: 30_000 })
    .toEqual([])
  expect(await downloadObject(PROTECTED, photo!.path)).toBeNull()
  expect(await readMedia(photoName)).toBeNull()
  // Le SVG, lui, n'était pas à la corbeille : il est toujours là.
  expect(await storedIn(svg!.path)).toEqual([PROTECTED])
  await page.goto("/mediatheque")
  await expect(card(page, svgName)).toBeVisible()
  await expect(card(page, photoName)).toHaveCount(0)
})

test("un SVG piégé envoyé sans passer par l'admin est refusé par le serveur", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Sam Sécurité")
  const svgName = `piege-direct-${uniqueId()}.svg`

  await openMediaLibrary(page, admin)

  // Le fichier brut, avec la session du membre : la base l'accepte en « vérification ».
  const sent = await sendWithoutAdmin(await accessToken(page), {
    kind: "svg",
    name: svgName,
    mime: "image/svg+xml",
    bytes: piege,
  })
  expect(sent.status).toBe("checking")

  // Personne ne demande la vérification depuis l'admin : c'est la tâche planifiée « fichiers »
  // (pg_cron → pg_net → files, sans session de membre) qui s'en charge. Son appel est rejoué
  // ici plutôt que d'attendre la minute suivante ; le frein de la fonction (un passage toutes
  // les 20 s) peut le faire patienter.
  expect(await activeScheduledJobs()).toContain("fichiers")
  await expect
    .poll(
      async () => {
        const status = (await readMedia(svgName))?.status
        if (status === "checking") await runScheduledKick()
        return status
      },
      { timeout: 60_000, intervals: [2_000, 5_000] }
    )
    .toBe("rejected")
  const refused = await readMedia(svgName)
  expect(refused!.reject_reason).toMatch(/^svg_/)

  // L'admin l'affiche comme refusé, avec la raison (après un rechargement : la liste ne se
  // met à jour d'elle-même que pendant les envois et vérifications faits depuis cette page).
  await page.reload()
  const reason =
    texts.media.rejectReasons[
      refused!.reject_reason as keyof typeof texts.media.rejectReasons
    ]
  await expect(
    card(page, svgName).getByRole("img", {
      name: texts.media.rejectedBecause(reason),
    })
  ).toBeVisible()
})

test("un membre envoie les autres formats, filtre, cherche, en met deux à la corbeille d'un coup et efface un seul fichier", async ({
  page,
  team,
}) => {
  test.setTimeout(150_000)
  const admin = await team.createAdmin("Léo Formats")
  const id = uniqueId()
  const names = {
    gif: `danse-${id}.gif`,
    lottie: `vague-${id}.json`,
    audio: `episode-${id}.mp3`,
    pdf: `guide-${id}.pdf`,
    text: `notes-${id}.txt`,
  }

  await openMediaLibrary(page, admin)

  await page.getByLabel(texts.media.uploadInput).setInputFiles([
    {
      name: names.gif,
      mimeType: "image/gif",
      buffer: Buffer.from(gifBytes(3)),
    },
    { name: names.lottie, mimeType: "application/json", buffer: lottieJson() },
    { name: names.audio, mimeType: "audio/mpeg", buffer: fakeMp3(7 * MB) },
    {
      name: names.pdf,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF\n"),
    },
    { name: names.text, mimeType: "text/plain", buffer: Buffer.from("x") },
  ])

  // Un format refusé avant tout envoi, un avertissement pour le GIF animé, l'envoi reprenable
  // pour le gros audio.
  await expect(upload(page, names.text)).toContainText(
    texts.media.prepareErrors.type_refuse
  )
  await expect(upload(page, names.gif)).toContainText(
    texts.media.uploads.gifWarning
  )
  await expect(upload(page, names.audio)).toContainText(
    texts.media.uploads.resumable,
    { timeout: 30_000 }
  )
  for (const name of [names.gif, names.lottie, names.pdf, names.audio]) {
    await expect(upload(page, name)).toHaveAttribute("data-stage", "done", {
      timeout: 60_000,
    })
  }
  // Le .txt refusé garde la fenêtre des envois ouverte : on la ferme, car elle cacherait des
  // fichiers de la grille.
  // (Le titre attend la fin de la vérification du Lottie par le serveur.)
  await expect(uploadWindow(page)).toContainText(
    texts.media.uploads.summary.failed(1),
    { timeout: 30_000 }
  )
  await uploadWindow(page)
    .getByRole("button", { name: texts.media.uploads.close })
    .click()
  await expect(uploadWindow(page)).toHaveCount(0)
  for (const name of [names.gif, names.lottie, names.pdf, names.audio]) {
    await expect(
      card(page, name).getByRole("img", { name: texts.media.status.ready })
    ).toBeVisible({
      timeout: 60_000,
    })
  }
  await expect(card(page, names.text)).toHaveCount(0)

  // Dans la base : GIF converti, Lottie accepté par le serveur, gros audio arrivé entier.
  expect(await readMedia(names.gif)).toMatchObject({
    mime: "image/webp",
    status: "ready",
  })
  expect(await readMedia(names.lottie)).toMatchObject({
    mime: "application/json",
    status: "ready",
  })
  const audio = await readMedia(names.audio)
  expect(audio).toMatchObject({
    mime: "audio/mpeg",
    size_bytes: 7 * MB,
    status: "ready",
    cache_control: "max-age=60",
  })
  expect((await downloadObject(PROTECTED, audio!.path))?.length).toBe(7 * MB)

  // Filtre par type et recherche.
  const filters = page.getByRole("group", { name: texts.media.filters.label })
  await filters
    .getByRole("button", { name: texts.media.filters.lottie })
    .click()
  await expect(card(page, names.lottie)).toBeVisible()
  await expect(card(page, names.gif)).toHaveCount(0)
  await filters.getByRole("button", { name: texts.media.filters.all }).click()
  await page.getByLabel(texts.media.search).fill(`guide-${id}`)
  await expect(card(page, names.pdf)).toBeVisible()
  await expect(card(page, names.audio)).toHaveCount(0)
  await page.getByLabel(texts.media.search).fill("")
  await expect(card(page, names.audio)).toBeVisible()

  // Aucun de ces fichiers ne sert encore : badge « Non utilisé », et le filtre « Non utilisés »
  // (colonne calculée par la base) les garde.
  await expect(
    card(page, names.audio).getByRole("img", { name: texts.media.unused })
  ).toBeVisible()
  const unusedFilter = page.getByRole("button", {
    name: texts.media.filters.unused,
  })
  await unusedFilter.click()
  await expect(unusedFilter).toHaveAttribute("aria-pressed", "true")
  await expect(card(page, names.audio)).toBeVisible()
  await unusedFilter.click()

  // Sélection en masse : le GIF et l'animation partent ensemble à la corbeille.
  const selection = { ...texts.selection, ...texts.media.selection }
  await page
    .getByRole("checkbox", { name: selection.select(names.gif) })
    .check()
  // Pendant une sélection, un clic sur une vignette la coche au lieu d'ouvrir sa fiche.
  await page
    .getByRole("button", { name: selection.select(names.lottie) })
    .click()
  await page.getByRole("button", { name: selection.trash(2) }).click()
  await expect(page.getByText(selection.trashed(2))).toBeVisible()
  await expect(card(page, names.gif)).toHaveCount(0)
  await expect(card(page, names.lottie)).toHaveCount(0)
  await expect(card(page, names.audio)).toBeVisible()

  // Effacement d'un seul fichier depuis la corbeille : les autres restent.
  const pdf = await readMedia(names.pdf)
  await trashFromSheet(page, names.pdf)
  await page.goto("/corbeille")
  for (const name of [names.gif, names.lottie]) {
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(1)
  }
  await page
    .getByRole("row")
    .filter({ hasText: names.pdf })
    .getByRole("button", { name: texts.trash.eraseItem(names.pdf) })
    .click()
  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toContainText(
    texts.trash.confirmErase.description(names.pdf)
  )
  await confirmation
    .getByRole("button", { name: texts.trash.confirmErase.confirm })
    .click()
  await expect(
    page.getByRole("row").filter({ hasText: names.pdf })
  ).toHaveCount(0)
  await expect.poll(() => storedIn(pdf!.path), { timeout: 30_000 }).toEqual([])
  expect(await readMedia(names.pdf)).toBeNull()
  expect(await storedIn(audio!.path)).toEqual([PROTECTED])
})

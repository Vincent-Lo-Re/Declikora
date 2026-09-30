// Parcours des sections (étape 7, partie 7a), contre le Supabase local. Ce que voit l'app est lu
// par app_feed et app_categories, avec la clé publishable, comme un anonyme.
//
// 1. Blog : deux catégories, rangées au clavier ; un article que « Publier » refuse tant qu'il
//    n'a pas d'image de présentation ([D45]) ; l'image, un résumé et une catégorie, puis
//    publier ; l'app le liste avec sa vignette (publique, question 1) ; filtres par catégorie
//    (admin et app) ; la catégorie supprimée, l'app l'ignore ([D28]).
// 2. Podcasts : un épisode que « Publier » refuse sans audio ; l'audio choisi dans la
//    médiathèque, sa durée affichée, la transcription conseillée ([D46]) ; publier ; l'app le
//    liste avec sa durée ; la transcription ajoutée depuis sa fiche fait taire l'avertissement.
// 3. Pages : recherche (accents et casse ignorés, adresse comprise) et filtre par état dans la
//    liste complète.
// 4. Accueil : un brouillon récent, une publication programmée et une programmation échouée
//    (image de présentation retirée après avoir programmé) ; leurs liens ouvrent le bon éditeur.

import type { Locator, Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import {
  createBlankPage,
  createFromDialog,
  expect,
  frenchDay,
  frenchTime,
  signIn,
  test,
} from "./support/fixtures.ts"
import { photoPng, silentMp3 } from "./support/media.ts"
import {
  contentIdFromUrl,
  makeScheduleDue,
  publicFileStatus,
  readSchedule,
  runDuePublications,
} from "./support/publication.ts"
import {
  appCategories,
  appFeed,
  deleteCategoriesMarked,
} from "./support/sections.ts"

const editor = texts.editor
const words = texts.editor.presentation
const publication = texts.publication
const list = texts.contentList
const categories = texts.categories
const home = texts.home

/** La raison d'un échec de programmation, telle que l'admin l'écrit après « Raison : ». */
function scheduleErrorText(code: keyof typeof texts.editor.errors) {
  const text = texts.editor.errors[code]
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function open(page: Page, path: string, account: Account) {
  await page.goto(path)
  await signIn(page, account)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
}

function nav(page: Page, title: string) {
  return page
    .getByRole("navigation", { name: texts.nav.label })
    .getByRole("link", { name: title })
    .click()
}

async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]')).toBeVisible({
    timeout: 15_000,
  })
}

/** « Nouvel article » ou « Nouvel épisode », jusqu'à l'éditeur d'un contenu vide ([D42]). */
async function createBlank(page: Page, kind: "article" | "episode") {
  await createFromDialog(page, kind, `Essai ${kind}`)
}

/**
 * Le panneau de droite : « Présentation de l'article » (ou de l'épisode) quand aucun bloc n'est
 * choisi, « Réglages du bloc » sinon.
 */
function panel(page: Page) {
  return page.getByRole("region", {
    name: new RegExp(
      `^(${[
        editor.settings.label,
        editor.presentation.panelTitle.article,
        editor.presentation.panelTitle.episode,
      ].join("|")})$`
    ),
  })
}

/** Les noms des catégories du Blog affichées, dans l'ordre. */
function categoryOrder(page: Page) {
  return page
    .getByRole("list", {
      name: categories.listLabel(texts.sections.blog.title),
    })
    .locator("[data-item]")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-item")))
}

/** « Publier » : la fenêtre de confirmation (rien n'est encore confirmé). */
async function openPublish(page: Page): Promise<Locator> {
  await page
    .getByRole("button", { name: publication.actions.publish, exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: publication.publishDialog.title,
  })
  await expect(dialog).toBeVisible()
  return dialog
}

/** Publie avec « Gratuit » (le niveau n'a pas encore été choisi, [D41]). */
async function publishFree(page: Page) {
  const dialog = await openPublish(page)
  await dialog
    .getByRole("radio", { name: publication.settings.access.free })
    .check()
  await dialog
    .getByRole("button", { name: publication.publishDialog.confirm })
    .click()
  await expect(page.getByText(publication.published(1))).toBeVisible()
}

/** Réglages du contenu : niveau d'accès « Gratuit », adresse d'une page si donnée. */
async function settingsFree(page: Page, slug?: string) {
  await page.getByRole("button", { name: publication.actions.settings }).click()
  const settings = page.getByRole("dialog", {
    name: publication.settings.title,
  })
  if (slug) {
    const address = settings.getByLabel(publication.settings.slug.label)
    await address.fill(slug)
    await address.press("Enter")
  }
  await settings
    .getByRole("radio", { name: publication.settings.access.free })
    .check()
  await saved(page)
  await page.keyboard.press("Escape")
  await expect(settings).toHaveCount(0)
}

/** Jour et heure à Paris, dans deux jours à 8 h : { date: "2026-09-30", time: "08:00" }. */
function inTwoDaysAtEight() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 2 * 24 * 3600 * 1000))
  return { date, time: "08:00" }
}

/** « Programmer… » dans deux jours à 8 h (heure de Paris). */
async function scheduleInTwoDays(page: Page) {
  await page.getByRole("button", { name: publication.actions.more }).click()
  await page
    .getByRole("menuitem", { name: publication.actions.schedule })
    .click()
  const dialog = page.getByRole("dialog", {
    name: publication.scheduleDialog.title,
  })
  const when = inTwoDaysAtEight()
  await dialog
    .getByLabel(publication.scheduleDialog.date, { exact: true })
    .fill(frenchDay(when.date))
  await dialog
    .getByLabel(publication.scheduleDialog.time, { exact: true })
    .fill(frenchTime(when.time))
  await dialog
    .getByRole("button", { name: publication.scheduleDialog.confirm })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.locator('[data-schedule-banner="scheduled"]')
  ).toContainText("à 08h00")
}

/** Envoie une image depuis le choix d'image déjà ouvert ; il se ferme une fois l'image choisie. */
async function uploadInImagePicker(page: Page, name: string) {
  const picker = page.getByRole("dialog", { name: editor.picker.title })
  await picker
    .getByLabel(editor.picker.uploadInput)
    .setInputFiles([
      { name, mimeType: "image/png", buffer: photoPng(640, 400) },
    ])
  await expect(picker).toHaveCount(0, { timeout: 60_000 })
}

/** Choisit un fichier déjà dans la médiathèque, par son nom, dans le choix ouvert. */
async function chooseInPicker(
  page: Page,
  kind: "image" | "audio",
  name: string
) {
  const labels = kind === "image" ? editor.picker : editor.audioPicker
  const picker = page.getByRole("dialog", { name: labels.title })
  await picker.getByLabel(labels.search).fill(name)
  await picker.getByRole("button", { name: labels.choose(name) }).click()
  await expect(picker).toHaveCount(0)
}

test("Blog : catégories rangées, article refusé sans image de présentation, publié, filtré, catégorie supprimée", async ({
  page,
  team,
}) => {
  test.setTimeout(150_000)
  const id = uniqueId()
  const admin = await team.createAdmin("Béatrice Blog")
  const [sommeil, stress] = [`Sommeil ${id}`, `Stress ${id}`]
  const mine = (names: (string | null)[]) =>
    names.filter((name) => name?.endsWith(id))
  try {
    // --- Deux catégories, rangées -----------------------------------------------------
    await open(page, "/blog/categories", admin)
    const name = page.getByLabel(categories.name)
    for (const category of [sommeil, stress]) {
      await name.fill(category)
      await name.press("Enter")
      await expect(page.getByText(categories.added(category))).toBeVisible()
    }
    // Un doublon, à la casse près, est refusé par la base.
    await name.fill(sommeil.toUpperCase())
    await name.press("Enter")
    await expect(page.getByText(categories.errors.nom_en_double)).toBeVisible()
    await name.fill("")
    await expect
      .poll(async () => mine(await categoryOrder(page)))
      .toEqual([sommeil, stress])

    // Au clavier : « Stress » passe avant « Sommeil » (categories_reorder).
    const handle = page.getByRole("button", { name: categories.handle(stress) })
    const announced = page.locator('[id^="DndLiveRegion"]')
    await handle.focus()
    await page.keyboard.press("Space")
    await expect(announced).toContainText(categories.dnd.start(stress))
    // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
    await page.keyboard.press("ArrowUp")
    await expect(announced).toContainText(`${stress} est à la place n°`)
    await page.keyboard.press("Space")
    await expect(page.getByText(categories.reordered)).toBeVisible()
    await expect
      .poll(async () => mine(await categoryOrder(page)))
      .toEqual([stress, sommeil])
    // L'ordre tient après un rechargement, et l'app lit le même.
    await page.reload()
    await expect
      .poll(async () => mine(await categoryOrder(page)))
      .toEqual([stress, sommeil])
    await expect
      .poll(async () => mine((await appCategories("blog")).map((c) => c.name)))
      .toEqual([stress, sommeil])
    const categoryId = async (category: string) => {
      const found = (await appCategories("blog")).find(
        (item) => item.name === category
      )
      if (!found) throw new Error(`Catégorie ${category} introuvable`)
      return found.id
    }
    const sommeilId = await categoryId(sommeil)
    const stressId = await categoryId(stress)

    // --- Un article : titre, résumé, catégorie ------------------------------------------
    await page
      .getByRole("link", { name: categories.back(texts.sections.blog.title) })
      .click()
    await expect(page).toHaveURL(/\/blog$/)
    await createBlank(page, "article")
    const articleId = contentIdFromUrl(page.url())
    const title = `Bien dormir ${id}`
    const summary = "Cinq gestes simples pour les nuits chaudes."
    await page.getByLabel(editor.title.label).fill(title)
    await page.getByLabel(words.summary.label).fill(summary)
    await page.getByRole("button", { name: words.categories.edit }).click()
    const settings = page.getByRole("dialog", {
      name: publication.settings.title,
    })
    await settings.getByRole("checkbox", { name: sommeil }).click()
    await saved(page)
    await page.keyboard.press("Escape")
    await expect(settings).toHaveCount(0)
    await expect(panel(page).getByText(sommeil, { exact: true })).toBeVisible()

    // « Publier » sans image de présentation : refusé, avec l'explication ([D45]).
    const refused = await openPublish(page)
    await expect(refused.locator("[data-requirements]")).toContainText(
      publication.requirements.publishTitle
    )
    await expect(refused).toContainText(publication.requirements.cover)
    await expect(
      refused.getByRole("button", { name: publication.publishDialog.confirm })
    ).toBeDisabled()
    // Le bouton de la fenêtre ouvre le choix de l'image ; on l'envoie de là.
    await refused
      .getByRole("button", { name: publication.requirements.chooseCover })
      .click()
    await expect(refused).toHaveCount(0)
    await uploadInImagePicker(page, `nuit-${id}.png`)
    // L'aperçu la montre en tête, comme l'app.
    await expect(page.locator('[data-presentation="cover"] img')).toBeVisible()
    await expect(panel(page)).toContainText(`nuit-${id}`)
    await saved(page)
    expect(await appFeed("blog")).not.toContainEqual(
      expect.objectContaining({ id: articleId })
    )
    await publishFree(page)

    // --- L'app : l'article, son résumé, sa vignette (publique) et sa catégorie --------
    const feedItem = async () =>
      (await appFeed("blog")).find((item) => item.id === articleId)
    await expect.poll(feedItem).toBeDefined()
    const item = (await feedItem())!
    expect(item).toMatchObject({
      kind: "article",
      title,
      summary,
      locked: false,
      durationS: null,
      categoryIds: [sommeilId],
    })
    expect(item.cover).not.toBeNull()
    const thumbnail = item.files[item.cover!.mediaId]
    expect(thumbnail).toMatchObject({ kind: "image" })
    expect(Object.keys(item.files)).toEqual([item.cover!.mediaId])
    // La vignette devient publique (fonction « files ») : l'app la lit sans session.
    await expect
      .poll(() => publicFileStatus(thumbnail.path), { timeout: 60_000 })
      .toBe(200)

    // Filtrer dans l'app : par sa catégorie oui, par l'autre non.
    expect(
      (await appFeed("blog", sommeilId)).map((entry) => entry.id)
    ).toContain(articleId)
    expect(
      (await appFeed("blog", stressId)).map((entry) => entry.id)
    ).not.toContain(articleId)

    // --- La liste du Blog : filtrer par catégorie ---------------------------------------
    await page
      .getByRole("link", { name: editor.back(texts.sections.blog.title) })
      .click()
    await expect(page).toHaveURL(/\/blog$/)
    const row = page.getByRole("row").filter({ hasText: title })
    await expect(row).toContainText(sommeil)
    await expect(row).toContainText(publication.status.live)
    const byCategory = async (option: string) => {
      await page.getByRole("combobox", { name: list.filters.category }).click()
      await page.getByRole("option", { name: option, exact: true }).click()
    }
    await byCategory(sommeil)
    await expect(row).toBeVisible()
    await byCategory(stress)
    await expect(row).toHaveCount(0)
    await expect(page.getByText(list.kinds.article.noResults)).toBeVisible()
    await byCategory(list.filters.noCategory)
    await expect(row).toHaveCount(0)
    await page.getByRole("button", { name: list.filters.reset }).click()
    await expect(row).toBeVisible()

    // --- Supprimer la catégorie de l'article : définitif, l'app l'ignore ([D28]) -------
    await page
      .getByRole("link", { name: list.manageCategories, exact: true })
      .click()
    await expect(page).toHaveURL(/\/blog\/categories$/)
    await page
      .getByRole("button", { name: categories.removeItem(sommeil) })
      .click()
    const confirm = page.getByRole("alertdialog")
    await expect(confirm).toContainText(
      categories.confirmRemove.description(sommeil)
    )
    await expect(confirm).toContainText(categories.confirmRemove.uses(1))
    await confirm
      .getByRole("button", { name: categories.confirmRemove.confirm })
      .click()
    await expect(page.getByText(categories.removed(sommeil))).toBeVisible()
    await expect
      .poll(async () => mine(await categoryOrder(page)))
      .toEqual([stress])

    // L'app : plus dans les catégories, plus sur l'article en ligne, filtre vide.
    expect(
      mine((await appCategories("blog")).map((category) => category.name))
    ).toEqual([stress])
    expect((await feedItem())?.categoryIds).toEqual([])
    expect(await appFeed("blog", sommeilId)).toEqual([])
    // L'admin : l'article n'a plus de catégorie.
    await page
      .getByRole("link", { name: categories.back(texts.sections.blog.title) })
      .click()
    await expect(row).toContainText(list.noCategory)
    await byCategory(list.filters.noCategory)
    await expect(row).toBeVisible()
  } finally {
    await deleteCategoriesMarked(id)
  }
})

test("Podcasts : épisode refusé sans audio, audio de la médiathèque, durée, transcription conseillée ([D46]), publié", async ({
  page,
  team,
  context,
}) => {
  test.setTimeout(150_000)
  const id = uniqueId()
  const admin = await team.createAdmin("Paul Podcast")
  const audioName = `entretien-${id}.mp3`
  // 65 secondes : « 1 min 05 s ».
  const duration = texts.media.units.minutesSeconds(1, "05")

  // L'audio arrive d'abord dans la Médiathèque ; le navigateur y lit sa durée.
  await open(page, "/mediatheque", admin)
  await page
    .getByLabel(texts.media.uploadInput)
    .setInputFiles([
      { name: audioName, mimeType: "audio/mpeg", buffer: silentMp3(65) },
    ])
  const card = page.getByRole("button", { name: texts.media.open(audioName) })
  await expect(
    card.getByRole("img", { name: texts.media.status.ready })
  ).toBeVisible({
    timeout: 60_000,
  })

  // Un épisode, avec son image de présentation mais sans audio.
  await nav(page, texts.sections.podcasts.title)
  await expect(page).toHaveURL(/\/podcasts$/)
  await createBlank(page, "episode")
  const episodeId = contentIdFromUrl(page.url())
  const title = `Entretien ${id}`
  await page.getByLabel(editor.title.label).fill(title)
  await panel(page).getByRole("button", { name: words.cover.choose }).click()
  await uploadInPickerAndWait(page, `micro-${id}.png`)
  await expect(panel(page)).toContainText(words.audio.none)
  await saved(page)

  // « Publier » sans audio : refusé, avec l'explication ; seule l'audio manque.
  const refused = await openPublish(page)
  await expect(refused).toContainText(publication.requirements.audio)
  await expect(refused).not.toContainText(publication.requirements.cover)
  await expect(
    refused.getByRole("button", { name: publication.publishDialog.confirm })
  ).toBeDisabled()
  await refused
    .getByRole("button", { name: publication.requirements.chooseAudio })
    .click()
  await expect(refused).toHaveCount(0)

  // Le choix de l'audio montre la durée et l'absence de transcription.
  const picker = page.getByRole("dialog", { name: editor.audioPicker.title })
  await picker.getByLabel(editor.audioPicker.search).fill(audioName)
  const choice = picker.getByRole("button", {
    name: editor.audioPicker.choose(audioName),
  })
  await expect(choice).toContainText(duration)
  await expect(choice).toContainText(editor.audioPicker.noTranscript)
  await choice.click()
  await expect(picker).toHaveCount(0)
  await saved(page)

  // L'aperçu : la durée et le lecteur ; l'avertissement de transcription, ici et à droite.
  const preview = page.locator('[data-presentation="audio"]')
  await expect(preview).toContainText(words.audio.duration(duration))
  await expect(
    preview.getByRole("button", { name: texts.audioPlayer.play(audioName) })
  ).toBeVisible()
  await expect(preview.locator('[data-warning="transcript"]')).toContainText(
    words.audio.transcriptMissing
  )
  await expect(panel(page)).toContainText(audioName)
  await expect(panel(page)).toContainText(duration)
  await expect(
    panel(page).locator('[data-warning="transcript"]')
  ).toContainText(words.audio.transcriptMissing)

  // « Publier » : plus rien ne manque ; la transcription est conseillée, sans bloquer.
  const publish = await openPublish(page)
  await expect(publish.locator("[data-requirements]")).toHaveCount(0)
  await expect(publish.locator('[data-advice="transcript"]')).toHaveText(
    publication.requirements.transcript
  )
  await page.keyboard.press("Escape")
  await expect(publish).toHaveCount(0)
  await publishFree(page)

  // L'app : l'épisode, sa durée (figée à la publication), sans catégorie ([D44]).
  const feedItem = async () =>
    (await appFeed("podcasts")).find((item) => item.id === episodeId)
  await expect.poll(feedItem).toBeDefined()
  const episode = (await feedItem())!
  expect(episode).toMatchObject({
    kind: "episode",
    title,
    locked: false,
    categoryIds: [],
  })
  expect(episode.cover).not.toBeNull()
  expect(Math.round(episode.durationS ?? 0)).toBe(65)
  // Ni blocs ni audio dans la liste : seule la vignette.
  expect(Object.keys(episode.files)).toEqual([episode.cover!.mediaId])

  // [D46] : le lien ouvre la fiche de l'audio (nouvel onglet) ; on y écrit la transcription.
  const [file] = await Promise.all([
    context.waitForEvent("page"),
    panel(page)
      .locator('[data-warning="transcript"]')
      .getByRole("link", { name: new RegExp(words.audio.openFile) })
      .click(),
  ])
  await expect(file).toHaveURL(/\/mediatheque\?fichier=/)
  const sheet = file.getByRole("dialog")
  await expect(sheet).toContainText(audioName)
  await sheet
    .getByLabel(texts.media.detail.transcript)
    .fill("Bonjour, et bienvenue dans cet entretien.")
  await sheet.getByRole("button", { name: texts.common.save }).click()
  await expect(file.getByText(texts.media.detail.saved)).toBeVisible()
  await file.close()

  // De retour sur l'onglet de l'éditeur, ses fichiers sont relus : plus d'avertissement. Sans
  // fenêtre à l'écran, Chromium ne change pas la visibilité de l'onglet : on l'annonce.
  await page.bringToFront()
  await page.evaluate(
    'document.dispatchEvent(new Event("visibilitychange", { bubbles: true }))'
  )
  await expect(panel(page)).toContainText(words.audio.transcriptOk, {
    timeout: 15_000,
  })
  await expect(page.locator('[data-warning="transcript"]')).toHaveCount(0)
})

/** Envoie une image dans le choix d'image ouvert depuis le panneau. */
async function uploadInPickerAndWait(page: Page, name: string) {
  await uploadInImagePicker(page, name)
  await expect(page.locator('[data-presentation="cover"] img')).toBeVisible()
}

test("Pages : recherche (accents, casse, adresse) et filtre par état dans la liste complète", async ({
  page,
  team,
}) => {
  test.setTimeout(120_000)
  const id = uniqueId()
  const admin = await team.createAdmin("Paulette Pages")
  const livePage = `Été serein ${id}`
  const slug = `vacances-${id}`
  const draftPage = `Mentions légales ${id}`

  // Une page publiée (avec son adresse) et une page en brouillon.
  await open(page, "/pages", admin)
  await createBlankPage(page)
  await page.getByLabel(editor.title.label).fill(livePage)
  await settingsFree(page, slug)
  await openPublish(page).then((dialog) =>
    dialog
      .getByRole("button", { name: publication.publishDialog.confirm })
      .click()
  )
  await expect(page.getByText(publication.published(1))).toBeVisible()
  await page
    .getByRole("link", { name: editor.back(texts.sections.pages.title) })
    .click()
  await createBlankPage(page)
  await page.getByLabel(editor.title.label).fill(draftPage)
  await saved(page)
  await page
    .getByRole("link", { name: editor.back(texts.sections.pages.title) })
    .click()
  await expect(page).toHaveURL(/\/pages$/)

  const search = page.getByRole("searchbox", { name: list.kinds.page.search })
  const liveRow = page.getByRole("row").filter({ hasText: livePage })
  const draftRow = page.getByRole("row").filter({ hasText: draftPage })
  await expect(liveRow).toContainText(publication.status.live)
  await expect(draftRow).toContainText(publication.status.draft)

  // Les deux par leur repère commun.
  await search.fill(id)
  await expect(liveRow).toBeVisible()
  await expect(draftRow).toBeVisible()
  await expect(
    page.getByRole("status").filter({ hasText: /^2 (sur \d+|éléments)$/ })
  ).toBeVisible()

  // Sans accents ni majuscules : « ETE SEREIN » trouve « Été serein ».
  await search.fill(`ETE SEREIN ${id}`)
  await expect(liveRow).toBeVisible()
  await expect(draftRow).toHaveCount(0)

  // Par son adresse (le titre ne contient pas « vacances »).
  await search.fill(slug)
  await expect(liveRow).toBeVisible()
  await expect(draftRow).toHaveCount(0)

  // Filtre par état, avec la recherche.
  await search.fill(id)
  const byState = async (option: string) => {
    await page.getByRole("combobox", { name: list.filters.state }).click()
    await page.getByRole("option", { name: option, exact: true }).click()
  }
  await byState(list.filters.states.live)
  await expect(liveRow).toBeVisible()
  await expect(draftRow).toHaveCount(0)
  await byState(list.filters.states.draft)
  await expect(draftRow).toBeVisible()
  await expect(liveRow).toHaveCount(0)
  await byState(list.filters.states.scheduled)
  await expect(liveRow).toHaveCount(0)
  await expect(draftRow).toHaveCount(0)
  await expect(page.getByText(list.kinds.page.noResults)).toBeVisible()

  // « Effacer les filtres » : tout revient, la recherche comprise.
  await page.getByRole("button", { name: list.filters.reset }).click()
  await expect(search).toHaveValue("")
  await expect(liveRow).toBeVisible()
  await expect(draftRow).toBeVisible()
})

test("Accueil : brouillon récent, publication programmée et programmation échouée, avec leurs liens", async ({
  page,
  team,
}) => {
  test.setTimeout(180_000)
  const id = uniqueId()
  const admin = await team.createAdmin("Anne Accueil")
  const coverName = `accueil-${id}.png`
  const audioName = `accueil-${id}.mp3`
  const episodeTitle = `Épisode programmé ${id}`
  const articleTitle = `Article sans image ${id}`
  const pageTitle = `Brouillon récent ${id}`

  // Un épisode complet, programmé dans deux jours.
  await open(page, "/podcasts", admin)
  await createBlank(page, "episode")
  const episodeId = contentIdFromUrl(page.url())
  await page.getByLabel(editor.title.label).fill(episodeTitle)
  await panel(page).getByRole("button", { name: words.cover.choose }).click()
  await uploadInPickerAndWait(page, coverName)
  await panel(page).getByRole("button", { name: words.audio.choose }).click()
  const audioPicker = page.getByRole("dialog", {
    name: editor.audioPicker.title,
  })
  await audioPicker
    .getByLabel(editor.audioPicker.uploadInput)
    .setInputFiles([
      { name: audioName, mimeType: "audio/mpeg", buffer: silentMp3(4) },
    ])
  await expect(audioPicker).toHaveCount(0, { timeout: 60_000 })
  await expect(panel(page)).toContainText(audioName)
  await settingsFree(page)
  await scheduleInTwoDays(page)
  await page
    .getByRole("link", { name: editor.back(texts.sections.podcasts.title) })
    .click()
  await expect(page).toHaveURL(/\/podcasts$/)

  // Un article programmé, puis privé de son image de présentation : la tâche échouera ([D45]).
  await nav(page, texts.sections.blog.title)
  await createBlank(page, "article")
  const articleId = contentIdFromUrl(page.url())
  await page.getByLabel(editor.title.label).fill(articleTitle)
  await panel(page).getByRole("button", { name: words.cover.choose }).click()
  await chooseInPicker(page, "image", coverName)
  await expect(page.locator('[data-presentation="cover"] img')).toBeVisible()
  await settingsFree(page)
  await scheduleInTwoDays(page)
  await panel(page).getByRole("button", { name: words.cover.remove }).click()
  await expect(panel(page)).toContainText(words.cover.none)
  await saved(page)
  // L'éditeur quitté (verrou rendu), l'heure arrive : la tâche refuse, faute d'image.
  await page
    .getByRole("link", { name: editor.back(texts.sections.blog.title) })
    .click()
  await expect(page).toHaveURL(/\/blog$/)
  await makeScheduleDue(articleId, 1)
  await expect
    .poll(
      async () => {
        await runDuePublications()
        return readSchedule(articleId)
      },
      { timeout: 20_000 }
    )
    .toMatchObject({
      scheduled_at: null,
      schedule_error: "image_de_presentation_manquante",
      live_version_id: null,
    })

  // Une page, enregistrée en dernier.
  await nav(page, texts.sections.pages.title)
  await createBlankPage(page)
  const pageId = contentIdFromUrl(page.url())
  await page.getByLabel(editor.title.label).fill(pageTitle)
  await saved(page)
  await page
    .getByRole("link", { name: editor.back(texts.sections.pages.title) })
    .click()

  // --- L'Accueil ------------------------------------------------------------------------
  await nav(page, texts.sections.home.title)
  await expect(page).toHaveURL(/\/$/)
  const failedList = page.getByRole("list", { name: home.failed.title })
  const scheduledList = page.getByRole("list", { name: home.scheduled.title })
  const draftsList = page.getByRole("list", { name: home.drafts.title })

  // Les échecs passent en tête quand il y en a.
  await expect(page.locator("[data-home]").first()).toHaveAttribute(
    "data-home",
    "failed"
  )
  const failedRow = failedList
    .getByRole("listitem")
    .filter({ hasText: articleTitle })
  await expect(failedRow).toContainText(
    home.failed.reason(scheduleErrorText("image_de_presentation_manquante"))
  )
  await expect(failedRow).toContainText(home.failed.by(admin.fullName))
  const scheduledRow = scheduledList
    .getByRole("listitem")
    .filter({ hasText: episodeTitle })
  await expect(scheduledRow).toContainText(home.scheduled.by(admin.fullName))
  await expect(
    scheduledRow.locator('[data-schedule="scheduled"]')
  ).toBeVisible()
  // L'article échoué n'est plus programmé.
  await expect(
    scheduledList.getByRole("listitem").filter({ hasText: articleTitle })
  ).toHaveCount(0)
  // Mes brouillons : le plus récent d'abord.
  await expect(draftsList.getByRole("listitem").first()).toContainText(
    pageTitle
  )

  // Chaque lien ouvre le bon éditeur.
  const opens = async (
    link: Locator,
    path: string,
    title: string,
    check?: () => Promise<void>
  ) => {
    await expect(link).toHaveAttribute("href", path)
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByLabel(editor.title.label)).toHaveValue(title)
    await check?.()
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  }
  await opens(
    draftsList.getByRole("link", { name: pageTitle }),
    `/pages/${pageId}`,
    pageTitle
  )
  await opens(
    scheduledRow.getByRole("link", { name: episodeTitle }),
    `/podcasts/${episodeId}`,
    episodeTitle,
    () =>
      expect(page.locator('[data-schedule-banner="scheduled"]')).toContainText(
        "à 08h00"
      )
  )
  await opens(
    failedRow.getByRole("link", { name: articleTitle }),
    `/blog/${articleId}`,
    articleTitle,
    () =>
      expect(page.locator('[data-schedule-banner="failed"]')).toContainText(
        publication.banner.failedReason(
          scheduleErrorText("image_de_presentation_manquante")
        )
      )
  )
})

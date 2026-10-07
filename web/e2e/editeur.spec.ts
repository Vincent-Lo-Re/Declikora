// Parcours de l'éditeur de blocs (étape 4), contre le Supabase local (base, Realtime), avec une
// page dans l'éditeur du Fil (ADMIN § 4, « Le builder du Fil partout »).
//
// 1. Écrire une page, ranger un bloc dans le plan au clavier, recharger et retrouver son texte.
// 2. Deux navigateurs : le second voit le brouillon en lecture seule (le cadenas) et le voit
//    changer, prend la main ; le premier perd la main, sa fenêtre propose « Copier mon texte » ;
//    le second quitte, et le premier voit le verrou libéré ; puis l'inverse.
// 3. Deux onglets du même membre : le plus récent prend la main, et quitter l'ancien ne la lui
//    retire pas.
// 4. Une image de la médiathèque insérée (seule, puis dans une section) : elle apparaît dans
//    « Utilisé dans » et ne peut plus aller à la corbeille, jusqu'à ce qu'on la retire.
// 5. Une image envoyée depuis le bloc Image : réduite, envoyée, puis choisie d'elle-même.
// 6. Un bloc choisi dans le plan monte en haut de l'écran du téléphone, puis le curseur s'y pose,
//    dès le premier clic.

import type { Browser, Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import { createBlankPage, expect, signIn, test } from "./support/fixtures.ts"
import { photoPng } from "./support/media.ts"

const labels = texts.editor

/** Ouvre la liste des pages (après la connexion) et crée une page : l'éditeur s'ouvre. */
async function createPage(page: Page, account: Account): Promise<string> {
  await page.goto("/pages")
  await signIn(page, account)
  await expect(page).toHaveURL(/\/pages$/)
  await createBlankPage(page)
  return page.url()
}

/** Attend que tout soit enregistré. */
async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]')).toBeVisible({
    timeout: 15_000,
  })
}

/** Le champ éditable du n-ième bloc Texte. */
function textBlock(page: Page, index = 0) {
  return page.locator('[data-block-type="text"] [contenteditable]').nth(index)
}

/** Les Blocs, en glissière par-dessus le Plan. */
function library(page: Page) {
  return page.getByRole("region", { name: labels.columns.blocks })
}

/**
 * Ajoute un bloc par les Blocs, ouverts par « Ajouter un bloc » en bas à gauche (sous le bloc
 * choisi, ou à la fin). Un bloc Image ouvre le choix d'une image.
 */
async function addBlock(page: Page, type: "text" | "image" | "box") {
  // Celui du bas de la colonne (le plan vide a le sien).
  await page.locator("#colonne-gauche-ajouter").click()
  await library(page)
    .getByRole("button", { name: labels.library.addLabel(labels.blocks[type]) })
    .click()
}

/** Un Texte ajouté, le curseur dedans. */
async function addText(page: Page) {
  await addBlock(page, "text")
  await expect(textBlock(page).last()).toBeFocused()
}

/** La fenêtre de la lecture seule, ouverte par le cadenas. */
async function lockDialog(page: Page) {
  await page.getByRole("button", { name: labels.lock.button }).click()
  return page.getByRole("alertdialog")
}

/** Un second navigateur, avec les mêmes réglages que le premier. */
async function secondBrowser(
  browser: Browser,
  options: { baseURL?: string; locale?: string; timezoneId?: string }
) {
  const context = await browser.newContext(options)
  return { context, page: await context.newPage() }
}

test("écrire une page, ranger un bloc dans le plan au clavier, recharger et retrouver son texte", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Élise Écrit")
  await createPage(page, admin)

  // L'éditeur prend tout l'écran : le menu de l'admin est caché, « ← Pages » ramène à la liste.
  await expect(
    page.getByRole("navigation", { name: texts.nav.label })
  ).toHaveCount(0)
  await expect(
    page.getByRole("link", { name: labels.back(texts.sections.pages.title) })
  ).toBeVisible()
  // Éditeur du Fil : le plan est ouvert d'office.
  const outline = page.getByRole("navigation", { name: labels.outline.title })
  await expect(outline).toBeVisible()

  // Un titre unique : la base locale peut contenir d'autres pages.
  const title = `Mentions légales ${Date.now().toString(36)}`
  await page.getByLabel(labels.title.label).fill(title)
  await addText(page)
  await page.keyboard.type("Premier paragraphe, avec des espaces.")
  await page.keyboard.press("Enter")
  await page.keyboard.type("Deuxième paragraphe.")

  // Une section, ajoutée après le texte.
  await addBlock(page, "box")
  await library(page)
    .getByRole("button", { name: labels.library.close })
    .click()
  const box = page.locator('[data-block-type="box"]')
  await expect(box).toContainText(labels.emptyBox)
  await saved(page)

  // Au clavier, dans le plan : la section monte au-dessus du texte (Espace, flèche, Espace).
  const boxLabel = labels.blockLabel.box(labels.outline.box.fill, 0)
  const handle = outline.getByRole("button", { name: labels.handle(boxLabel) })
  const announced = page.locator('[id^="DndLiveRegion"]').first()
  await outline.getByRole("listitem").last().hover()
  await handle.focus()
  await page.keyboard.press("Space")
  await expect(announced).toContainText(labels.dnd.start(boxLabel))
  // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
  await page.keyboard.press("ArrowUp")
  await expect(announced).toContainText(labels.dnd.page)
  await page.keyboard.press("Space")
  await expect(page.locator("[data-block-id]").first()).toHaveAttribute(
    "data-block-type",
    "box"
  )
  await saved(page)

  // Recharger : tout est là, dans le nouvel ordre.
  await page.reload()
  await expect(page.getByLabel(labels.title.label)).toHaveValue(title)
  await expect(textBlock(page)).toContainText(
    "Premier paragraphe, avec des espaces."
  )
  await expect(textBlock(page)).toContainText("Deuxième paragraphe.")
  await expect(page.locator("[data-block-id]").first()).toHaveAttribute(
    "data-block-type",
    "box"
  )

  // La liste des pages montre la page.
  await page
    .getByRole("link", { name: labels.back(texts.sections.pages.title) })
    .click()
  await expect(page).toHaveURL(/\/pages$/)
  await expect(page.getByRole("link", { name: title })).toBeVisible()
})

test("deux membres : lecture seule, reprise de la main, « Copier mon texte », verrou libéré", async ({
  page,
  browser,
  baseURL,
  locale,
  timezoneId,
  team,
}) => {
  test.setTimeout(150_000)
  const alice = await team.createAdmin("Alice Martin")
  const bruno = await team.createAdmin("Bruno Petit")

  const words = labels.lock.dialog

  // Alice crée la page et écrit.
  const url = await createPage(page, alice)
  await addText(page)
  await page.keyboard.type("Texte d'Alice.")
  await saved(page)

  // Bruno ouvre la même page : lecture seule (le cadenas), avec le nom d'Alice dans sa fenêtre.
  const second = await secondBrowser(browser, { baseURL, locale, timezoneId })
  const other = second.page
  try {
    await other.goto(url)
    await signIn(other, bruno)
    await expect(other).toHaveURL(url)
    const otherDialog = await lockDialog(other)
    await expect(
      otherDialog.getByText(words.title.readOnly("Alice Martin"))
    ).toBeVisible()
    await otherDialog.getByRole("button", { name: words.stay }).click()
    await expect(otherDialog).toBeHidden()
    await expect(textBlock(other)).toHaveAttribute("contenteditable", "false")
    await expect(textBlock(other)).toContainText("Texte d'Alice.")

    // Alice écrit encore : Bruno voit le texte changer (Realtime).
    await textBlock(page).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" Suite.")
    await saved(page)
    await expect(textBlock(other)).toContainText("Texte d'Alice. Suite.")

    // Alice écrit une phrase qui ne peut pas partir (enregistrement bloqué), puis Bruno prend la
    // main (sa fenêtre le dit déjà : pas de seconde confirmation).
    await page.route("**/rest/v1/rpc/save_draft", (route) => route.abort())
    await page.keyboard.type(" Pas encore enregistré.")
    await (
      await lockDialog(other)
    )
      .getByRole("button", { name: words.take.readOnly })
      .click()
    await expect(textBlock(other)).toHaveAttribute("contenteditable", "true")

    // Alice passe en lecture seule : sa fenêtre s'ouvre, avec le nom de Bruno et « Copier mon
    // texte ».
    const dialog = page.getByRole("alertdialog")
    await expect(
      dialog.getByText(words.title.lost("Bruno Petit"))
    ).toBeVisible()
    await expect(textBlock(page)).toHaveAttribute("contenteditable", "false")
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    await dialog.getByRole("button", { name: labels.lock.copy }).click()
    await expect(page.getByText(labels.lock.copied)).toBeVisible()
    const copied = await page.evaluate(() =>
      (
        globalThis as unknown as {
          navigator: { clipboard: { readText: () => Promise<string> } }
        }
      ).navigator.clipboard.readText()
    )
    expect(copied).toContain("Pas encore enregistré.")
    await page.unroute("**/rest/v1/rpc/save_draft")
    await dialog.getByRole("button", { name: words.stay }).click()
    await expect(dialog).toBeHidden()

    // Bruno écrit, puis quitte : Alice voit son texte, puis le verrou libéré.
    await textBlock(other).click()
    await other.keyboard.press("End")
    await other.keyboard.type(" Relu par Bruno.")
    await saved(other)
    await expect(textBlock(page)).toContainText("Relu par Bruno.")
    await other
      .getByRole("link", { name: labels.back(texts.sections.pages.title) })
      .click()
    await expect(other).toHaveURL(/\/pages$/)

    // Alice voit le verrou libéré dans la fenêtre du cadenas, et reprend l'écriture.
    const freed = await lockDialog(page)
    await expect(freed.getByText(words.title.free)).toBeVisible()
    await freed.getByRole("button", { name: words.take.free }).click()
    await expect(textBlock(page)).toHaveAttribute("contenteditable", "true")
    await expect(
      page.getByRole("button", { name: labels.lock.button })
    ).toHaveCount(0)

    // Bruno revient : lecture seule. Alice quitte à son tour : Bruno voit le verrou libéré.
    await other.goto(url)
    const back = await lockDialog(other)
    await expect(
      back.getByText(words.title.readOnly("Alice Martin"))
    ).toBeVisible()
    await back.getByRole("button", { name: words.stay }).click()
    await expect(back).toBeHidden()
    await page
      .getByRole("link", { name: labels.back(texts.sections.pages.title) })
      .click()
    await expect(page).toHaveURL(/\/pages$/)
    await expect(
      (await lockDialog(other)).getByText(words.title.free)
    ).toBeVisible()
    await expect(textBlock(other)).toHaveAttribute("contenteditable", "false")
    await expect(textBlock(other)).toContainText("Relu par Bruno.")
  } finally {
    await second.context.close()
  }
})

test("deux onglets du même membre : le plus récent a la main, fermer l'ancien ne la lui retire pas", async ({
  page,
  team,
}) => {
  test.setTimeout(90_000)
  const admin = await team.createAdmin("Olivia Onglets")
  const url = await createPage(page, admin)
  await addText(page)
  await page.keyboard.type("Premier onglet.")
  await saved(page)

  // Le même membre ouvre la page dans un second onglet : c'est lui qui a la main.
  const tab = await page.context().newPage()
  await tab.goto(url)
  await expect(textBlock(tab)).toHaveAttribute("contenteditable", "true")
  const dialog = page.getByRole("alertdialog")
  await expect(
    dialog.getByText(labels.lock.dialog.title.lostSelf)
  ).toBeVisible()
  await expect(textBlock(page)).toHaveAttribute("contenteditable", "false")

  // Le premier onglet reste en lecture seule et quitte l'éditeur : le second garde la main et
  // enregistre.
  await dialog.getByRole("button", { name: labels.lock.dialog.stay }).click()
  await page
    .getByRole("link", { name: labels.back(texts.sections.pages.title) })
    .click()
  await expect(page).toHaveURL(/\/pages$/)
  await textBlock(tab).click()
  await tab.keyboard.press("End")
  await tab.keyboard.type(" Second onglet.")
  await saved(tab)
  await expect(
    tab.getByRole("button", { name: labels.lock.button })
  ).toHaveCount(0)
  await expect(textBlock(tab)).toHaveAttribute("contenteditable", "true")
  await tab.reload()
  await expect(textBlock(tab)).toContainText("Premier onglet. Second onglet.")
})

test("une image insérée apparaît dans « Utilisé dans » et ne peut plus aller à la corbeille", async ({
  page,
  team,
}) => {
  test.setTimeout(120_000)
  const admin = await team.createAdmin("Iris Image")
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const fileName = `vitrail-${id}.png`
  const title = `Le vitrail ${id}`

  // Une photo envoyée par la Médiathèque.
  await page.goto("/media")
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/media$/)
  await page
    .getByLabel(texts.media.uploadInput)
    .setInputFiles([
      { name: fileName, mimeType: "image/png", buffer: photoPng(640, 480) },
    ])
  const card = page.getByRole("button", { name: texts.media.open(fileName) })
  await expect(
    card.getByRole("img", { name: texts.media.status.ready })
  ).toBeVisible({
    timeout: 60_000,
  })

  // Une page : un texte, une image avec son texte alternatif.
  await page.goto("/pages")
  await createBlankPage(page)
  const url = page.url()
  await page.getByLabel(labels.title.label).fill(title)
  await addText(page)
  await page.keyboard.type("Un vitrail de l'église.")

  const picker = page.getByRole("dialog", { name: labels.picker.title })
  await addBlock(page, "image")
  await picker
    .getByRole("button", { name: labels.picker.choose(fileName) })
    .click()
  await expect(picker).toHaveCount(0)
  const image = page.locator('[data-block-type="image"]')
  await expect(image.locator("img")).toBeVisible()
  // Pas de texte alternatif dans la médiathèque : on l'écrit dans les réglages du bloc (l'éditeur
  // ne le réclame plus, [D15]).
  const settings = page.getByRole("region", {
    name: labels.settings.label,
  })
  await settings
    .getByRole("switch", { name: labels.settings.image.altFromLibrary })
    .click()
  await settings
    .getByRole("textbox", { name: labels.settings.image.alt })
    .fill("Un vitrail bleu et rouge")
  // Pas de légende : elle est retirée de l'admin (02/10/2026).
  await expect(image.getByRole("textbox")).toHaveCount(0)

  // Une section, avec la même image dedans (« Ajouter dans la section » ouvre les Blocs).
  await addBlock(page, "box")
  const box = page.locator('[data-block-type="box"]')
  await box.getByRole("button", { name: labels.add.inBox }).click()
  await library(page)
    .getByRole("button", { name: labels.library.addLabel(labels.blocks.image) })
    .click()
  await picker
    .getByRole("button", { name: labels.picker.choose(fileName) })
    .click()
  await expect(box.locator('[data-block-type="image"] img')).toBeVisible()
  await saved(page)

  // Recharger : l'image et son texte alternatif sont là.
  await page.reload()
  await expect(page.getByLabel(labels.title.label)).toHaveValue(title)
  await expect(page.locator('[data-block-type="image"] img')).toHaveCount(2)
  await expect(
    page.locator('[data-block-type="image"] img').first()
  ).toHaveAttribute("alt", "Un vitrail bleu et rouge")

  // La Médiathèque : « Utilisé dans » cite le brouillon, et la corbeille est refusée.
  await page
    .getByRole("link", { name: labels.back(texts.sections.pages.title) })
    .click()
  await page
    .getByRole("navigation", { name: texts.nav.label })
    .getByRole("link", { name: texts.sections.media.title })
    .click()
  await card.click()
  const sheet = page.getByRole("dialog")
  const use = sheet.getByRole("listitem").filter({ hasText: title })
  await expect(use).toBeVisible()
  await expect(use).toContainText(texts.media.detail.inDraft)
  await sheet.getByRole("button", { name: texts.media.detail.trash }).click()
  await expect(sheet.getByText(texts.media.detail.used)).toBeVisible()
  // Le fichier reste dans la médiathèque.
  await page.keyboard.press("Escape")
  await expect(sheet).toHaveCount(0)
  await expect(card).toBeVisible()

  // Depuis « Utilisé dans », retour dans l'éditeur : on retire les deux images.
  await card.click()
  await use.getByRole("link", { name: title }).click()
  await expect(page).toHaveURL(url)
  // On vient de quitter ce brouillon : on reprend bien la main en le rouvrant.
  await expect(textBlock(page)).toHaveAttribute("contenteditable", "true")
  // Chaque bloc choisi dans l'aperçu : « Supprimer » dans la barre de ses réglages.
  for (const block of [
    box,
    page.locator('[data-block-type="image"]').first(),
  ]) {
    await block.click({ position: { x: 5, y: 5 } })
    await settings
      .getByRole("toolbar", { name: labels.settings.actions })
      .getByRole("button", { name: labels.settings.remove })
      .click()
  }
  await expect(page.locator('[data-block-type="image"]')).toHaveCount(0)
  await saved(page)

  // Le fichier n'est plus utilisé : il peut aller à la corbeille.
  await page
    .getByRole("link", { name: labels.back(texts.sections.pages.title) })
    .click()
  await page
    .getByRole("navigation", { name: texts.nav.label })
    .getByRole("link", { name: texts.sections.media.title })
    .click()
  await card.click()
  await expect(sheet.getByText(texts.media.detail.notUsed)).toBeVisible()
  await sheet.getByRole("button", { name: texts.media.detail.trash }).click()
  await expect(page.getByText(texts.media.detail.trashed)).toBeVisible()
  await expect(card).toHaveCount(0)
})

test("une image envoyée depuis le bloc Image est choisie dès qu'elle est prête", async ({
  page,
  team,
}) => {
  test.setTimeout(90_000)
  const admin = await team.createAdmin("Ulysse Upload")
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const fileName = `falaise-${id}.png`

  await createPage(page, admin)
  await page.getByLabel(labels.title.label).fill(`La falaise ${id}`)
  await addText(page)
  await page.keyboard.type("Une falaise au soleil.")
  await addBlock(page, "image")

  // Une grande photo (réduite dans le navigateur avant l'envoi).
  const picker = page.getByRole("dialog", { name: labels.picker.title })
  await picker
    .getByLabel(labels.picker.uploadInput)
    .setInputFiles([
      { name: fileName, mimeType: "image/png", buffer: photoPng(2400, 1600) },
    ])
  await expect(picker).toHaveCount(0, { timeout: 60_000 })
  const image = page.locator('[data-block-type="image"]')
  await expect(image.locator("img")).toBeVisible()
  await saved(page)

  // Recharger : l'image est bien celle du brouillon.
  await page.reload()
  await expect(page.locator('[data-block-type="image"] img')).toBeVisible()
})

/**
 * Le haut du n-ième bloc dans l'écran du téléphone, moins sa marge de défilement : 0 quand il est
 * en haut. Une expression : les tests de parcours n'ont pas les types du navigateur.
 */
function blockTop(page: Page, index: number): Promise<number> {
  return page.evaluate<number>(`(() => {
    const block = document.querySelectorAll("[data-block-id]")[${index}]
    const screen = block.closest(".blocks-screen-scroll")
    const margin = parseFloat(getComputedStyle(block).scrollMarginTop)
    const top = block.getBoundingClientRect().top - screen.getBoundingClientRect().top
    return Math.round(top - margin)
  })()`)
}

test("un bloc choisi dans le plan monte en haut de l'écran, puis le curseur s'y pose, dès le premier clic", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Basile Défile")
  await createPage(page, admin)

  // Assez de texte pour que l'écran du téléphone défile.
  const sentence =
    "Trois minutes suffisent pour relâcher la pression et repartir plus clair. "
  for (let index = 0; index < 5; index += 1) {
    await addBlock(page, "text")
    await expect(textBlock(page, index)).toBeFocused()
    await page.keyboard.insertText(`Bloc ${index + 1}. ${sentence.repeat(6)}`)
  }
  await saved(page)
  await library(page)
    .getByRole("button", { name: labels.library.close })
    .click()
  // Rien de choisi (un clic sur le fond), et l'écran en bas.
  await page
    .locator("[data-backdrop]")
    .first()
    .click({ position: { x: 10, y: 10 } })
  await page.evaluate(
    'document.querySelector(".blocks-screen-scroll").scrollTop = 1e6'
  )
  await expect.poll(() => blockTop(page, 0)).toBeLessThan(-100)

  // Au premier clic dans le plan, le défilement va jusqu'au bout (le curseur posé trop tôt
  // l'arrêtait en chemin), puis le curseur est dans le bloc.
  const outline = page.getByRole("navigation", { name: labels.outline.title })
  await outline.locator("[data-outline-id]").first().click()
  await expect(textBlock(page, 0)).toBeFocused()
  expect(Math.abs(await blockTop(page, 0))).toBeLessThanOrEqual(1)
})

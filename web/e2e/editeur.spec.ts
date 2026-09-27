// Parcours de l'éditeur de blocs (étape 4), contre le Supabase local (base, Realtime).
//
// 1. Écrire une page, déplacer un bloc par sa poignée (souris, puis clavier), recharger et
//    retrouver son texte.
// 2. Deux navigateurs : le second voit le brouillon en lecture seule et le voit changer,
//    reprend la main ; le premier bascule en lecture seule avec « Copier mon texte » ; le
//    second quitte, et le premier voit le verrou libéré ; puis l'inverse.
// 3. Deux onglets du même membre : le plus récent prend la main, et quitter l'ancien ne la lui
//    retire pas.
// 4. Une image de la médiathèque insérée (seule, puis dans un encadré) : elle apparaît dans
//    « Utilisé dans » et ne peut plus aller à la corbeille, jusqu'à ce qu'on la retire.

import type { Browser, Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import { expect, signIn, test } from "./support/fixtures.ts"
import { photoPng } from "./support/media.ts"

const labels = texts.editor

/** Ouvre la liste des pages (après la connexion) et crée une page : l'éditeur s'ouvre. */
async function createPage(page: Page, account: Account): Promise<string> {
  await page.goto("/pages")
  await signIn(page, account)
  await expect(page).toHaveURL(/\/pages$/)
  await page.getByRole("button", { name: texts.contentList.create }).click()
  await expect(page).toHaveURL(/\/pages\/[0-9a-f-]{36}$/)
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

/** Un second navigateur, avec les mêmes réglages que le premier. */
async function secondBrowser(
  browser: Browser,
  options: { baseURL?: string; locale?: string; timezoneId?: string }
) {
  const context = await browser.newContext(options)
  return { context, page: await context.newPage() }
}

test("écrire une page, déplacer un bloc par sa poignée, recharger et retrouver son texte", async ({
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
  // Le plan est fermé par défaut.
  await expect(
    page.getByRole("navigation", { name: labels.outline.title })
  ).toHaveCount(0)

  // Un titre unique : la base locale peut contenir d'autres pages.
  const title = `Mentions légales ${Date.now().toString(36)}`
  await page.getByLabel(labels.title.label).fill(title)
  await page
    .getByRole("button", { name: labels.blocks.text, exact: true })
    .click()
  await expect(textBlock(page)).toBeFocused()
  await page.keyboard.type("Premier paragraphe, avec des espaces.")
  await page.keyboard.press("Enter")
  await page.keyboard.type("Deuxième paragraphe.")

  // Un encadré, ajouté après le texte.
  await page.getByRole("button", { name: labels.add.label }).first().click()
  await page.getByRole("menuitem", { name: labels.blocks.box }).click()
  const box = page.locator('[data-block-type="box"]')
  await expect(box).toContainText(labels.emptyBox)
  await saved(page)

  // Glisser-déposer à la souris, par la poignée : le texte entre dans l'encadré.
  const text = page.locator('[data-block-type="text"]').first()
  await text.hover()
  const handle = text.getByRole("button", { name: /^Déplacer : Texte/ })
  const from = (await handle.boundingBox())!
  const to = (await box.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + 20, from.y + 20, { steps: 5 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 15,
  })
  await page.mouse.up()
  await expect(box.locator('[data-block-type="text"]')).toContainText(
    "Premier paragraphe"
  )
  await saved(page)

  // Au clavier : le plan se déplie, puis le texte ressort de l'encadré (Espace, flèche, Espace).
  await page.getByRole("button", { name: labels.outline.show }).click()
  const outline = page.getByRole("navigation", { name: labels.outline.title })
  await expect(outline.getByRole("listitem")).toHaveCount(2)
  const innerHandle = box.getByRole("button", { name: /^Déplacer : Texte/ })
  const announced = page.locator('[id^="DndLiveRegion"]')
  await innerHandle.focus()
  await page.keyboard.press("Space")
  await expect(announced).toContainText("Tu as pris Texte")
  // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
  await page.keyboard.press("ArrowUp")
  await expect(announced).toContainText("dans la page")
  await page.keyboard.press("Space")
  await expect(announced).toContainText("Bloc déposé dans la page : Texte")
  await expect(box.locator('[data-block-type="text"]')).toHaveCount(0)
  await expect(page.locator("[data-block-id]").first()).toHaveAttribute(
    "data-block-type",
    "text"
  )
  await saved(page)

  // Recharger : tout est là.
  await page.reload()
  await expect(page.getByLabel(labels.title.label)).toHaveValue(title)
  await expect(textBlock(page)).toContainText(
    "Premier paragraphe, avec des espaces."
  )
  await expect(textBlock(page)).toContainText("Deuxième paragraphe.")
  await expect(page.locator('[data-block-type="box"]')).toHaveCount(1)

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

  // Alice crée la page et écrit.
  const url = await createPage(page, alice)
  await page
    .getByRole("button", { name: labels.blocks.text, exact: true })
    .click()
  await page.keyboard.type("Texte d'Alice.")
  await saved(page)

  // Bruno ouvre la même page : lecture seule, avec le nom d'Alice.
  const second = await secondBrowser(browser, { baseURL, locale, timezoneId })
  const other = second.page
  try {
    await other.goto(url)
    await signIn(other, bruno)
    await expect(other).toHaveURL(url)
    await expect(
      other.getByText(labels.lock.readOnly("Alice Martin"))
    ).toBeVisible()
    await expect(textBlock(other)).toHaveAttribute("contenteditable", "false")
    await expect(textBlock(other)).toContainText("Texte d'Alice.")

    // Alice écrit encore : Bruno voit le texte changer (Realtime).
    await textBlock(page).click()
    await page.keyboard.press("End")
    await page.keyboard.type(" Suite.")
    await saved(page)
    await expect(textBlock(other)).toContainText("Texte d'Alice. Suite.")

    // Alice écrit une phrase qui ne peut pas partir (enregistrement bloqué), puis Bruno reprend
    // la main.
    await page.route("**/rest/v1/rpc/save_draft", (route) => route.abort())
    await page.keyboard.type(" Pas encore enregistré.")
    await other.getByRole("button", { name: labels.lock.forceTake }).click()
    await other
      .getByRole("alertdialog")
      .getByRole("button", { name: labels.lock.confirmForce.confirm })
      .click()
    await expect(textBlock(other)).toHaveAttribute("contenteditable", "true")

    // Alice passe en lecture seule, avec le nom de Bruno et « Copier mon texte ».
    await expect(page.getByText(labels.lock.lost("Bruno Petit"))).toBeVisible()
    await expect(textBlock(page)).toHaveAttribute("contenteditable", "false")
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
    await page.getByRole("button", { name: labels.lock.copy }).click()
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
    await expect(page.getByText(labels.lock.free)).toBeVisible()

    // Alice reprend l'écriture.
    await page
      .getByRole("button", { name: labels.lock.take, exact: true })
      .click()
    await expect(textBlock(page)).toHaveAttribute("contenteditable", "true")
    await expect(page.getByText(labels.lock.free)).toHaveCount(0)

    // Bruno revient : lecture seule. Alice quitte à son tour : Bruno voit le verrou libéré.
    await other.goto(url)
    await expect(
      other.getByText(labels.lock.readOnly("Alice Martin"))
    ).toBeVisible()
    await page
      .getByRole("link", { name: labels.back(texts.sections.pages.title) })
      .click()
    await expect(page).toHaveURL(/\/pages$/)
    await expect(other.getByText(labels.lock.free)).toBeVisible()
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
  await page
    .getByRole("button", { name: labels.blocks.text, exact: true })
    .click()
  await page.keyboard.type("Premier onglet.")
  await saved(page)

  // Le même membre ouvre la page dans un second onglet : c'est lui qui a la main.
  const tab = await page.context().newPage()
  await tab.goto(url)
  await expect(textBlock(tab)).toHaveAttribute("contenteditable", "true")
  await expect(page.getByText(labels.lock.lostSelf)).toBeVisible()
  await expect(textBlock(page)).toHaveAttribute("contenteditable", "false")

  // Le premier onglet quitte l'éditeur : le second garde la main et enregistre.
  await page
    .getByRole("link", { name: labels.back(texts.sections.pages.title) })
    .click()
  await expect(page).toHaveURL(/\/pages$/)
  await textBlock(tab).click()
  await tab.keyboard.press("End")
  await tab.keyboard.type(" Second onglet.")
  await saved(tab)
  await expect(tab.getByText(labels.lock.free)).toHaveCount(0)
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
  await page.goto("/mediatheque")
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/mediatheque$/)
  await page
    .getByLabel(texts.media.uploadInput)
    .setInputFiles([
      { name: fileName, mimeType: "image/png", buffer: photoPng(640, 480) },
    ])
  const card = page.getByRole("button", { name: texts.media.open(fileName) })
  await expect(card).toContainText(texts.media.status.ready, {
    timeout: 60_000,
  })

  // Une page : un texte, une image avec sa légende et son texte alternatif.
  await page.goto("/pages")
  await page.getByRole("button", { name: texts.contentList.create }).click()
  await expect(page).toHaveURL(/\/pages\/[0-9a-f-]{36}$/)
  const url = page.url()
  await page.getByLabel(labels.title.label).fill(title)
  await page
    .getByRole("button", { name: labels.blocks.text, exact: true })
    .click()
  await page.keyboard.type("Un vitrail de l'église.")

  const picker = page.getByRole("dialog", { name: labels.picker.title })
  await page.getByRole("button", { name: labels.add.label }).first().click()
  await page.getByRole("menuitem", { name: labels.blocks.image }).click()
  await picker
    .getByRole("button", { name: labels.picker.choose(fileName) })
    .click()
  await expect(picker).toHaveCount(0)
  const image = page.locator('[data-block-type="image"]')
  await expect(image.locator("img")).toBeVisible()
  // Pas de texte alternatif dans la médiathèque : l'éditeur le signale.
  await expect(image).toContainText(labels.image.altWarning)
  const settings = page.getByRole("region", {
    name: labels.settings.label,
  })
  await settings
    .getByRole("switch", { name: labels.settings.image.altFromLibrary })
    .click()
  await settings
    .getByRole("textbox", { name: labels.settings.image.alt })
    .fill("Un vitrail bleu et rouge")
  await expect(image).not.toContainText(labels.image.altWarning)
  await image
    .getByRole("textbox", { name: labels.image.captionLabel })
    .fill("Le vitrail du chœur")

  // Un encadré, avec la même image dedans.
  await page.getByRole("button", { name: labels.add.label }).first().click()
  await page.getByRole("menuitem", { name: labels.blocks.box }).click()
  const box = page.locator('[data-block-type="box"]')
  await box.getByRole("button", { name: labels.add.inBox }).click()
  await page.getByRole("menuitem", { name: labels.blocks.image }).click()
  await picker
    .getByRole("button", { name: labels.picker.choose(fileName) })
    .click()
  await expect(box.locator('[data-block-type="image"] img')).toBeVisible()
  await saved(page)

  // Recharger : l'image, sa légende et son texte alternatif sont là.
  await page.reload()
  await expect(page.getByLabel(labels.title.label)).toHaveValue(title)
  await expect(page.locator('[data-block-type="image"] img')).toHaveCount(2)
  await expect(
    page.locator('[data-block-type="image"] img').first()
  ).toHaveAttribute("alt", "Un vitrail bleu et rouge")
  await expect(
    page.getByRole("textbox", { name: labels.image.captionLabel }).first()
  ).toHaveValue("Le vitrail du chœur")

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
  for (const block of [
    box,
    page.locator('[data-block-type="image"]').first(),
  ]) {
    await block.click({ position: { x: 5, y: 5 } })
    await settings.getByRole("button", { name: labels.settings.remove }).click()
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

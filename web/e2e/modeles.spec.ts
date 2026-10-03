// Parcours des modèles de blocs (étape 6), contre le Supabase local. Ce que voit l'app est lu
// par la RPC app_page, comme un anonyme.
//
// Un encadré « Contact » créé comme bloc partagé est inséré dans deux pages ; corrigé
// dans le modèle, il change dans les deux brouillons. Une des pages est publiée ; le modèle est
// corrigé encore, et « Mettre à jour ce contenu dans l'app » change l'app sans rien publier
// d'autre. Le bloc est détaché dans l'autre page, puis le modèle est supprimé après
// « Détacher partout ».

import type { Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import { createBlankPage, expect, signIn, test } from "./support/fixtures.ts"
import { appPageText, contentIdFromUrl } from "./support/publication.ts"
import { readDraftBlocks } from "./support/templates.ts"

const labels = texts.templates
const editor = texts.editor
const publication = texts.publication

function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]')).toBeVisible({
    timeout: 15_000,
  })
}

/** Un choix d'un menu ouvert par le bouton `menu` (le précédent peut encore se fermer). */
function menuItem(page: Page, menu: string, item: string) {
  return page
    .getByRole("menu", { name: menu })
    .getByRole("menuitem", { name: item })
}

function nav(page: Page, title: string) {
  return page
    .getByRole("navigation", { name: texts.nav.label })
    .getByRole("link", { name: title })
    .click()
}

/** Le bloc lié (bloc partagé) d'un brouillon ouvert dans l'éditeur. */
function linkedBlock(page: Page) {
  return page.locator('[data-block-type="linked"]')
}

/** Ouvre la section Modèles (après la connexion). */
async function openTemplates(page: Page, account: Account) {
  await page.goto("/modeles")
  await signIn(page, account)
  await expect(page).toHaveURL(/\/modeles$/)
}

/** Crée une page vide avec ce titre ; renvoie son identifiant. */
async function newPage(page: Page, title: string): Promise<string> {
  await createBlankPage(page)
  await page.getByLabel(editor.title.label).fill(title)
  return contentIdFromUrl(page.url())
}

/**
 * Éditeur du Fil : « Ajouter un bloc » (en bas de la colonne de gauche) ouvre les Blocs, puis
 * « Mes blocs » › « Ajouter <nom> ».
 */
async function insertTemplate(page: Page, name: string) {
  await page.locator("#colonne-gauche-ajouter").click()
  const library = page.getByRole("region", { name: editor.columns.blocks })
  await library
    .getByRole("button", { name: new RegExp(editor.library.mine.title) })
    .click()
  await library
    .getByRole("region", { name: editor.library.mine.title })
    .getByRole("button", { name: editor.library.mine.insertLabel(name) })
    .click()
  // Le message de l'insertion précédente peut être encore affiché.
  await expect(
    page.getByText(editor.library.mine.added(name)).first()
  ).toBeVisible()
}

/** Ouvre l'éditeur d'un contenu depuis la liste de sa section (lien du titre). */
async function openFromList(page: Page, section: string, title: string) {
  await nav(page, section)
  await page.getByRole("link", { name: title, exact: true }).click()
  await expect(page).toHaveURL(/\/[0-9a-f-]{36}$/)
}

/** Quitte l'éditeur (« ← Section »), une fois tout enregistré. */
async function leave(page: Page, section: string) {
  await saved(page)
  await page.getByRole("link", { name: editor.back(section) }).click()
}

/** Ajoute ce texte à la fin du premier bloc Texte modifiable, puis attend l'enregistrement. */
async function appendText(page: Page, text: string) {
  const field = page
    .locator('[data-block-type="text"] [contenteditable="true"]')
    .first()
  await field.click()
  await page.keyboard.press("End")
  await page.keyboard.type(text)
  await saved(page)
}

test("bloc partagé : deux pages, correction, mise à jour de l'app, détacher, supprimer", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Maud Modèle")
  const id = uniqueId()
  const name = `Contact ${id}`
  const slug = `accueil-${id}`
  const titleA = `Accueil ${id}`
  const titleB = `Aide ${id}`
  const pagesTitle = texts.sections.pages.title
  const templatesTitle = texts.sections.templates.title

  // 1. Le modèle : un encadré « Contact », bloc partagé.
  await openTemplates(page, admin)
  await page.getByRole("button", { name: labels.list.create }).click()
  const create = page.getByRole("dialog", { name: labels.create.title })
  await create.getByLabel(labels.create.name).fill(name)
  await create.getByRole("radio", { name: labels.sorts.shared.title }).check()
  await create.getByRole("button", { name: labels.create.submit }).click()
  await expect(page).toHaveURL(/\/modeles\/[0-9a-f-]{36}$/)
  const templateId = contentIdFromUrl(page.url())
  await expect(
    page.getByText(labels.editor.empty.sharedDescription)
  ).toBeVisible()
  await page
    .getByRole("button", { name: editor.blocks.box, exact: true })
    .click()
  const box = page.locator('[data-block-type="box"]')
  await box.getByRole("button", { name: editor.add.inBox }).click()
  await menuItem(page, editor.add.inBox, editor.blocks.text).click()
  await page.keyboard.type("Écris-nous à contact@exemple.fr")
  await saved(page)
  // Un seul bloc ([D11]) : on n'en ajoute plus au premier niveau.
  await expect(
    page.getByRole("button", { name: editor.add.label }).first()
  ).toBeDisabled()
  await expect(page.getByText(labels.editor.sharedLimit)).toBeVisible()
  await leave(page, templatesTitle)
  // « Tous les blocs » : le modèle, avec sa sorte.
  await expect(page.locator(`[data-template="${templateId}"]`)).toContainText(
    labels.sorts.shared.title
  )

  // 2. Le modèle inséré dans deux pages : un bloc lié, montré tel qu'il est dans le modèle, et
  //    nommé d'après lui dans le plan.
  await nav(page, pagesTitle)
  const pageA = await newPage(page, titleA)
  await insertTemplate(page, name)
  await expect(linkedBlock(page)).toContainText(
    "Écris-nous à contact@exemple.fr"
  )
  await expect(
    page.getByRole("navigation", { name: editor.outline.title })
  ).toContainText(name)
  await leave(page, pagesTitle)

  const pageB = await newPage(page, titleB)
  await insertTemplate(page, name)
  await expect(linkedBlock(page)).toContainText("contact@exemple.fr")
  await leave(page, pagesTitle)

  // 3. Corrigé dans le modèle : les deux brouillons le montrent aussitôt.
  await openFromList(page, templatesTitle, name)
  await expect(
    page.getByRole("button", { name: labels.editor.usedIn(2) })
  ).toBeVisible()
  await appendText(page, " (réponse sous 48 h)")
  await leave(page, templatesTitle)
  for (const title of [titleA, titleB]) {
    await openFromList(page, pagesTitle, title)
    await expect(linkedBlock(page)).toContainText("(réponse sous 48 h)")
    await leave(page, pagesTitle)
  }

  // 4. La première page est publiée (adresse dans sa carte, Gratuit) : l'app a le bloc corrigé.
  await openFromList(page, pagesTitle, titleA)
  const address = page
    .getByRole("region", { name: publication.settings.slug.label })
    .getByRole("textbox", { name: publication.settings.slug.label })
  await address.fill(slug)
  await address.press("Enter")
  await saved(page)
  await page
    .getByRole("button", { name: publication.actions.publish, exact: true })
    .click()
  const publish = page.getByRole("dialog")
  await publish
    .getByRole("radio", { name: publication.settings.access.free })
    .check()
  await publish
    .getByRole("button", { name: publication.publishDialog.confirm })
    .click()
  await expect(page.getByText(publication.published(1))).toBeVisible()
  expect(await appPageText(slug)).toContain("(réponse sous 48 h)")
  await leave(page, pagesTitle)

  // 5. Corrigé encore : rien ne change dans l'app avant « Mettre à jour ce contenu dans l'app ».
  await openFromList(page, templatesTitle, name)
  await appendText(page, " Merci !")
  const push = page.getByRole("button", {
    name: labels.editor.outdated.push(1),
  })
  await expect(push).toBeVisible()
  expect(await appPageText(slug)).not.toContain("Merci !")
  await push.click()
  const confirm = page.getByRole("alertdialog", {
    name: labels.editor.outdated.title(1),
  })
  await expect(confirm).toContainText(titleA)
  await confirm
    .getByRole("button", { name: labels.editor.outdated.confirm })
    .click()
  await expect(page.getByText(labels.editor.outdated.pushed(1))).toBeVisible()
  await expect(push).toHaveCount(0)
  const live = await appPageText(slug)
  expect(live).toContain("Merci !")
  expect(live).toContain(titleA)
  await leave(page, templatesTitle)

  // 6. Détaché dans la seconde page (le bloc choisi, « Détacher » dans la barre de ses
  //    réglages) : une copie ordinaire, modifiable, qui ne suit plus le modèle.
  await openFromList(page, pagesTitle, titleB)
  await linkedBlock(page).click()
  await page
    .getByRole("toolbar", { name: editor.settings.actions })
    .getByRole("button", { name: labels.linked.detachLabel(name) })
    .click()
  await expect(page.getByText(labels.linked.detached(name))).toBeVisible()
  await expect(linkedBlock(page)).toHaveCount(0)
  await appendText(page, " Détaché.")
  expect(JSON.stringify(await readDraftBlocks(pageB))).not.toContain('"linked"')
  await leave(page, pagesTitle)

  // 7. Supprimer le modèle : encore utilisé par la première page, « Détacher partout », puis
  //    la corbeille. L'app garde la page telle quelle.
  await nav(page, templatesTitle)
  const row = page.locator(`[data-template="${templateId}"]`)
  await expect(row).toBeVisible()
  await row.getByRole("button", { name: labels.list.actions(name) }).click()
  await page.getByRole("menuitem", { name: labels.list.trash }).click()
  const dialog = page.getByRole("alertdialog", { name: labels.list.used.title })
  await expect(dialog).toContainText(titleA)
  await dialog.getByRole("button", { name: labels.list.used.detachAll }).click()
  await expect(page.getByText(labels.list.used.detached(1))).toBeVisible()
  const trash = page.getByRole("alertdialog", {
    name: labels.list.confirmTrash.title,
  })
  await trash
    .getByRole("button", { name: labels.list.confirmTrash.confirm })
    .click()
  await expect(page.getByText(labels.list.trashed(name))).toBeVisible()
  await expect(row).toHaveCount(0)
  expect(JSON.stringify(await readDraftBlocks(pageA))).not.toContain('"linked"')
  expect(await appPageText(slug)).toContain("Merci !")

  // La première page s'ouvre avec une copie ordinaire du bloc, modifiable.
  await openFromList(page, pagesTitle, titleA)
  await expect(linkedBlock(page)).toHaveCount(0)
  await expect(page.locator('[data-block-type="box"]')).toContainText("Merci !")
})

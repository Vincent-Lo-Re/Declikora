// Parcours de la publication (étape 5), contre le Supabase local (base, tâches planifiées,
// fonction « files »). Ce que voit l'app est lu par les RPC app_*, comme un anonyme.
//
// 1. Une page : le niveau d'accès demandé à la première publication ([D41]), « Gratuit » et
//    l'adresse, puis publier ; l'app garde l'ancienne version pendant qu'on modifie le
//    brouillon ; republier ; historique ; « Revenir à cette version ».
// 2. Programmer : la tâche « publications » attend pendant qu'on écrit, puis publie le dernier
//    brouillon ([D16], [D31]) ; au bout d'une heure d'écriture, elle échoue.
// 3. Une page réservée à une formule créée dans Paramètres : verrouillée pour un anonyme ; son
//    image de présentation reste lisible, pas ses autres images (question 1).
// 4. Retirer de l'app, supprimer depuis la liste, restaurer (en brouillon, [D18]), vider la
//    corbeille.
// 5. Les formules : un éditeur ne voit pas Paramètres ; un admin les ajoute, les range au
//    clavier, les renomme et les supprime.
// 6. Le texte alternatif d'une image publiée : figé dans l'app, puis « Mettre à jour ce contenu
//    dans l'app » depuis la fiche du fichier ([D30], option B).

import type { Page } from "@playwright/test"

import { slugFromTitle } from "../src/lib/contents/slug.ts"
import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import {
  accountMenuButton,
  bottomMenu,
  createBlankPage,
  expect,
  frenchDay,
  frenchTime,
  signIn,
  test,
} from "./support/fixtures.ts"
import { localSupabase } from "./support/local-supabase.ts"
import { photoPng, readMedia, storedIn } from "./support/media.ts"
import {
  anonCanSignProtected,
  appContent,
  appFileLocations,
  appPage,
  appPageText,
  contentExists,
  contentIdFromUrl,
  deleteAccessLevels,
  makeScheduleDue,
  publicFileStatus,
  readSchedule,
  runDuePublications,
  setDraftCover,
} from "./support/publication.ts"
import { accessToken } from "./support/team-api.ts"

const labels = texts.publication

function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function openPages(page: Page, account: Account) {
  await page.goto("/pages")
  await signIn(page, account)
  await expect(page).toHaveURL(/\/pages$/)
}

async function newPage(page: Page, title: string) {
  await createBlankPage(page, title)
}

async function addText(page: Page, text: string) {
  await page
    .getByRole("button", { name: texts.editor.blocks.text, exact: true })
    .click()
  await page.keyboard.type(text)
}

/** Ajoute du texte à la fin du premier bloc Texte, puis attend l'enregistrement. */
async function appendText(page: Page, text: string) {
  await textBlock(page).click()
  await page.keyboard.press("End")
  await page.keyboard.type(text)
  await saved(page)
}

async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]')).toBeVisible({
    timeout: 15_000,
  })
}

function textBlock(page: Page, index = 0) {
  return page.locator('[data-block-type="text"] [contenteditable]').nth(index)
}

/** Le badge de l'état de publication, dans l'en-tête de l'éditeur. */
function liveBadge(page: Page) {
  return page.locator("header [data-publication]")
}

function backToPages(page: Page) {
  return page
    .getByRole("link", { name: texts.editor.back(texts.sections.pages.title) })
    .click()
}

function nav(page: Page, title: string) {
  return page
    .getByRole("navigation", { name: texts.nav.label })
    .getByRole("link", { name: title })
    .click()
}

/** Réglages du contenu : adresse, et niveau d'accès si demandé. */
async function setSettings(page: Page, slug: string, level?: string) {
  await page.getByRole("button", { name: labels.actions.settings }).click()
  const settings = page.getByRole("dialog", { name: labels.settings.title })
  const address = settings.getByLabel(labels.settings.slug.label)
  await address.fill(slug)
  await address.press("Enter")
  if (level) await settings.getByRole("radio", { name: level }).check()
  await saved(page)
  await page.keyboard.press("Escape")
  await expect(settings).toHaveCount(0)
}

/** « Publier », puis la fenêtre de confirmation. */
async function publish(page: Page, level?: string) {
  await page
    .getByRole("button", { name: labels.actions.publish, exact: true })
    .click()
  const dialog = page.getByRole("dialog")
  if (level) {
    // Pas de niveau par défaut : « Publier » attend qu'on en choisisse un.
    await expect(dialog.getByText(labels.levelRequired)).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: labels.publishDialog.confirm })
    ).toBeDisabled()
    await dialog.getByRole("radio", { name: level }).check()
  }
  await dialog
    .getByRole("button", { name: labels.publishDialog.confirm })
    .click()
  await expect(dialog).toHaveCount(0)
}

/** Un choix du menu « Autres actions de publication ». */
async function publicationAction(page: Page, item: string) {
  await page.getByRole("button", { name: labels.actions.more }).click()
  await page.getByRole("menuitem", { name: item }).click()
}

/** Jour et heure à Paris, dans deux jours à 8 h : { date: "2026-09-30", time: "08:00" }. */
function inTwoDaysAtEight() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + 2 * 24 * 3600 * 1000))
  return { date: parts, time: "08:00" }
}

/** « Programmer… » dans deux jours à 8 h (heure de Paris). */
async function scheduleInTwoDays(page: Page) {
  await publicationAction(page, labels.actions.schedule)
  const dialog = page.getByRole("dialog", {
    name: labels.scheduleDialog.title,
  })
  const when = inTwoDaysAtEight()
  await dialog
    .getByLabel(labels.scheduleDialog.date, { exact: true })
    .fill(frenchDay(when.date))
  await dialog
    .getByLabel(labels.scheduleDialog.time, { exact: true })
    .fill(frenchTime(when.time))
  await dialog
    .getByRole("button", { name: labels.scheduleDialog.confirm })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(
    page.locator('[data-schedule-banner="scheduled"]')
  ).toContainText("à 08h00 : ce que tu écris partira")
}

test("publier une page, la modifier sans toucher à l'app, republier, revenir à une version", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Paul Publie")
  const id = uniqueId()
  const slug = `mentions-${id}`
  const title = `Mentions légales ${id}`

  await openPages(page, admin)
  await newPage(page, title)
  await addText(page, "Première version.")
  await saved(page)
  await expect(liveBadge(page)).toHaveText(labels.status.draft)

  // L'adresse vient du titre ; sans adresse (effacée), « Publier » ouvre les réglages, sur
  // l'adresse.
  await page.getByRole("button", { name: labels.actions.settings }).click()
  const cleared = page.getByRole("dialog", { name: labels.settings.title })
  await expect(cleared.getByLabel(labels.settings.slug.label)).toHaveValue(
    slugFromTitle(title)
  )
  await cleared.getByLabel(labels.settings.slug.label).fill("")
  await cleared.getByLabel(labels.settings.slug.label).press("Enter")
  await saved(page)
  await page.keyboard.press("Escape")
  await expect(cleared).toHaveCount(0)
  await page
    .getByRole("button", { name: labels.actions.publish, exact: true })
    .click()
  const settings = page.getByRole("dialog", { name: labels.settings.title })
  await expect(settings).toBeVisible()
  const address = settings.getByLabel(labels.settings.slug.label)
  await expect(address).toBeFocused()
  await address.fill("Pas Valide")
  await address.press("Enter")
  await expect(settings.getByText(labels.settings.slug.invalid)).toBeVisible()
  await address.fill(slug)
  await address.press("Enter")
  await saved(page)
  await expect(
    settings.getByText(labels.settings.access.notChosen)
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(settings).toHaveCount(0)

  // Première publication : le niveau d'accès est demandé ([D41]), on choisit « Gratuit ».
  expect(await appPage(slug)).toBeNull()
  await publish(page, labels.settings.access.free)
  await expect(page.getByText(labels.published(1))).toBeVisible()
  await expect(liveBadge(page)).toHaveText(labels.status.live)
  const live = await appPage(slug)
  expect(live).toMatchObject({ kind: "page", title, slug, locked: false })
  expect(live?.level).toBeNull()
  expect(JSON.stringify(live)).toContain("Première version.")

  // Le brouillon change : l'app montre toujours la version publiée.
  await appendText(page, " Puis une correction.")
  await expect(liveBadge(page)).toHaveText(labels.status.modified)
  expect(await appPageText(slug)).not.toContain("Puis une correction.")

  // Republier : le niveau est déjà choisi, la fenêtre le rappelle.
  await page
    .getByRole("button", { name: labels.actions.publish, exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: labels.publishDialog.titleAgain,
  })
  await expect(dialog).toContainText(labels.settings.access.free)
  await expect(dialog).toContainText(slug)
  await dialog
    .getByRole("button", { name: labels.publishDialog.confirm })
    .click()
  await expect(page.getByText(labels.published(2))).toBeVisible()
  await expect(liveBadge(page)).toHaveText(labels.status.live)
  expect(await appPageText(slug)).toContain("Puis une correction.")

  // Historique : deux versions, la n° 2 en ligne.
  await page.getByRole("button", { name: labels.actions.history }).click()
  const history = page.getByRole("dialog", { name: labels.history.title })
  await expect(history.locator("[data-version]")).toHaveCount(2)
  const second = history.locator('[data-version="2"]')
  await expect(second).toContainText(labels.history.live)
  await expect(second).toContainText(labels.history.origins.manual)
  await expect(second).toContainText(labels.history.by(admin.fullName))
  await expect(history.locator('[data-version="1"]')).not.toContainText(
    labels.history.live
  )

  // « Revenir à cette version » change le brouillon, pas l'app.
  await history
    .getByRole("button", { name: labels.history.revertItem(1) })
    .click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: labels.history.confirm.confirm })
    .click()
  await expect(page.getByText(labels.history.reverted(1))).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(history).toHaveCount(0)
  await expect(textBlock(page)).toHaveText("Première version.")
  await expect(liveBadge(page)).toHaveText(labels.status.modified)
  expect(await appPageText(slug)).toContain("Puis une correction.")

  // Le brouillon repris est bien celui de la base (relu après rechargement).
  await page.reload()
  await expect(textBlock(page)).toHaveText("Première version.")
  await expect(liveBadge(page)).toHaveText(labels.status.modified)
})

test("programmer : la tâche attend pendant qu'on écrit, publie le dernier brouillon, échoue au bout d'une heure", async ({
  page,
  team,
}) => {
  test.setTimeout(120_000)
  const admin = await team.createAdmin("Paula Programme")
  const id = uniqueId()
  const slug = `programme-${id}`
  const title = `Page programmée ${id}`

  await openPages(page, admin)
  await newPage(page, title)
  await addText(page, "Texte programmé.")
  await saved(page)
  const contentId = contentIdFromUrl(page.url())
  // Le niveau et l'adresse se choisissent aussi dans les réglages.
  await setSettings(page, slug, labels.settings.access.free)

  // Programmer dans deux jours à 8 h (heure de Paris) : le bandeau le rappelle.
  await scheduleInTwoDays(page)
  await expect(page.locator("header [data-schedule]")).toHaveCount(0)

  // On écrit encore après avoir programmé, l'éditeur ouvert (verrou tenu).
  await appendText(page, " Ajouté après la programmation.")

  // L'heure est passée (depuis quelques minutes) pendant qu'on écrit : la tâche attend ([D31]).
  // Juste après l'heure prévue, l'admin dit seulement « Publication en cours ».
  await makeScheduleDue(contentId, 5)
  await runDuePublications()
  expect(await readSchedule(contentId)).toMatchObject({
    schedule_error: null,
    live_version_id: null,
  })
  expect((await readSchedule(contentId)).scheduled_at).not.toBeNull()
  expect(await appPage(slug)).toBeNull()

  // La liste (dans un autre onglet) le montre : en attente, quelqu'un écrit.
  const list = await page.context().newPage()
  await list.goto("/pages")
  const listRow = list.getByRole("row").filter({ hasText: title })
  await expect(listRow.locator('[data-schedule="waiting"]')).toHaveText(
    labels.status.waiting
  )
  await list.close()

  // On quitte l'éditeur (le verrou est rendu) : la tâche publie le DERNIER brouillon ([D16]).
  await backToPages(page)
  await expect
    .poll(
      async () => {
        await runDuePublications()
        return appPageText(slug)
      },
      { timeout: 20_000 }
    )
    .toContain("Ajouté après la programmation.")
  expect(await readSchedule(contentId)).toMatchObject({
    scheduled_at: null,
    schedule_error: null,
  })
  await page.reload()
  const row = page.getByRole("row").filter({ hasText: title })
  await expect(row).toContainText(labels.status.live)
  await expect(row.locator("[data-schedule]")).toHaveCount(0)

  // L'historique dit qui avait programmé et comment c'est parti.
  await row.getByRole("link", { name: title }).click()
  await expect(liveBadge(page)).toHaveText(labels.status.live)
  await page.getByRole("button", { name: labels.actions.history }).click()
  const history = page.getByRole("dialog", { name: labels.history.title })
  const version = history.locator('[data-version="1"]')
  await expect(version).toContainText(labels.history.origins.scheduled)
  await expect(version).toContainText(labels.history.by(admin.fullName))
  await page.keyboard.press("Escape")
  await expect(history).toHaveCount(0)

  // Une autre programmation, et on écrit plus d'une heure après l'heure prévue : échec.
  await scheduleInTwoDays(page)
  await appendText(page, " Jamais parti.")
  await makeScheduleDue(contentId, 61)
  await runDuePublications()
  expect(await readSchedule(contentId)).toMatchObject({
    scheduled_at: null,
    schedule_error: "brouillon_en_cours_d_ecriture",
  })
  expect(await appPageText(slug)).not.toContain("Jamais parti.")

  // L'éditeur affiche l'échec, sa raison et qui avait programmé ; on l'efface.
  await page.reload()
  const banner = page.locator('[data-schedule-banner="failed"]')
  await expect(banner).toContainText(labels.banner.failed)
  await expect(banner).toContainText(
    labels.banner.failedReason(
      labels.scheduleErrors.brouillon_en_cours_d_ecriture
    )
  )
  await expect(banner).toContainText(labels.banner.failedBy(admin.fullName))
  await banner
    .getByRole("button", { name: labels.actions.dismissFailure })
    .click()
  await expect(page.getByText(labels.failureDismissed)).toBeVisible()
  await expect(banner).toHaveCount(0)
  expect((await readSchedule(contentId)).schedule_error).toBeNull()
})

test("page réservée à une formule : verrouillée dans l'app, image de présentation lisible, autres images protégées", async ({
  page,
  team,
}) => {
  test.setTimeout(120_000)
  const admin = await team.createAdmin("Rémi Réservé")
  const id = uniqueId()
  const level = `Essentiel ${id}`
  const slug = `reservee-${id}`
  const title = `Page réservée ${id}`
  const coverName = `vitrine-${id}.png`
  const innerName = `dedans-${id}.png`
  try {
    // Une formule, créée dans Paramètres.
    await page.goto("/parametres")
    await signIn(page, admin)
    await expect(page).toHaveURL(/\/parametres$/)
    const accessLevels = texts.settings.accessLevels
    await page.getByLabel(accessLevels.name).fill(level)
    await page.getByRole("button", { name: accessLevels.add }).click()
    await expect(page.getByText(accessLevels.added(level))).toBeVisible()

    // Deux images dans la Médiathèque.
    await nav(page, texts.sections.media.title)
    await page.getByLabel(texts.media.uploadInput).setInputFiles([
      { name: coverName, mimeType: "image/png", buffer: photoPng(320, 200) },
      { name: innerName, mimeType: "image/png", buffer: photoPng(300, 240) },
    ])
    for (const name of [coverName, innerName]) {
      await expect(
        page.getByRole("button", { name: texts.media.open(name) })
      ).toBeVisible({ timeout: 30_000 })
    }

    // Une page avec une image dans ses blocs, réservée à la formule.
    await nav(page, texts.sections.pages.title)
    await newPage(page, title)
    await page
      .getByRole("button", { name: texts.editor.blocks.image, exact: true })
      .click()
    await page
      .getByRole("dialog", { name: texts.editor.picker.title })
      .getByRole("button", { name: texts.editor.picker.choose(innerName) })
      .click()
    await expect(page.locator('[data-block-type="image"] img')).toBeVisible()
    await setSettings(page, slug, level)
    const contentId = contentIdFromUrl(page.url())

    // Son image de présentation (posée dans la base : l'écran arrive à l'étape 7).
    await backToPages(page)
    const cover = await readMedia(coverName)
    const inner = await readMedia(innerName)
    if (!cover || !inner) throw new Error("Images introuvables")
    await setDraftCover(contentId, cover.id)

    // Publier : la formule est déjà choisie, la fenêtre la rappelle.
    await page
      .getByRole("row")
      .filter({ hasText: title })
      .getByRole("link", { name: title })
      .click()
    await page
      .getByRole("button", { name: labels.actions.publish, exact: true })
      .click()
    const dialog = page.getByRole("dialog", {
      name: labels.publishDialog.title,
    })
    await expect(dialog).toContainText(level)
    await dialog
      .getByRole("button", { name: labels.publishDialog.confirm })
      .click()
    await expect(page.getByText(labels.published(1))).toBeVisible()

    // Pour un anonyme : verrouillé, ni blocs ni son, seule l'image de présentation.
    const locked = await appContent(contentId)
    expect(locked).toMatchObject({
      id: contentId,
      title,
      slug,
      locked: true,
      blocks: null,
      audio: null,
      cover: { mediaId: cover.id },
      level: { name: level },
    })
    expect(Object.keys(locked!.files)).toEqual([cover.id])
    expect(await appPage(slug)).toMatchObject({ id: contentId, locked: true })

    // L'image de présentation devient publique (fonction « files ») ; l'autre reste protégée.
    await expect
      .poll(() => storedIn(cover.path), { timeout: 60_000 })
      .toEqual(["files-public"])
    expect(await appFileLocations([cover.id, inner.id])).toEqual({
      [cover.id]: "public",
    })
    expect(await publicFileStatus(cover.path)).toBe(200)
    expect(await storedIn(inner.path)).toEqual(["files-protected"])
    expect(await publicFileStatus(inner.path)).not.toBe(200)
    expect(await anonCanSignProtected(inner.path)).toBe(false)

    // Retirée de l'app : plus rien pour un anonyme, l'image de présentation redevient protégée.
    await publicationAction(page, labels.actions.unpublish)
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: labels.unpublishDialog.confirm })
      .click()
    await expect(page.getByText(labels.unpublishDialog.done)).toBeVisible()
    expect(await appContent(contentId)).toBeNull()
    expect(await appFileLocations([cover.id, inner.id])).toEqual({})
    await expect
      .poll(() => storedIn(cover.path), { timeout: 60_000 })
      .toEqual(["files-protected"])
    expect(await anonCanSignProtected(cover.path)).toBe(false)
  } finally {
    // Les formules ne sont pas liées au compte de test : on les efface ici (avec la page).
    await deleteAccessLevels(id)
  }
})

test("retirer de l'app, supprimer, restaurer en brouillon, vider la corbeille", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Coralie Corbeille")
  const id = uniqueId()
  const slug = `a-propos-${id}`
  const title = `À propos ${id}`

  await openPages(page, admin)
  await newPage(page, title)
  await addText(page, "Qui sommes-nous.")
  await saved(page)
  const contentId = contentIdFromUrl(page.url())
  await setSettings(page, slug, labels.settings.access.free)
  await publish(page)
  await expect(page.getByText(labels.published(1))).toBeVisible()
  await expect.poll(() => appPageText(slug)).toContain("Qui sommes-nous.")

  // Retirer de l'app : plus rien pour l'app, le brouillon reste.
  await publicationAction(page, labels.actions.unpublish)
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: labels.unpublishDialog.confirm })
    .click()
  await expect(page.getByText(labels.unpublishDialog.done)).toBeVisible()
  await expect(liveBadge(page)).toHaveText(labels.status.withdrawn)
  expect(await appPage(slug)).toBeNull()

  // Republier, puis supprimer depuis la liste : la corbeille retire aussi de l'app.
  await publish(page)
  await expect(page.getByText(labels.published(2))).toBeVisible()
  await expect.poll(() => appPage(slug)).not.toBeNull()
  await backToPages(page)
  const row = page.getByRole("row").filter({ hasText: title })
  await expect(row).toContainText(labels.status.live)
  await row
    .getByRole("button", { name: texts.contentList.actions(title) })
    .click()
  await page.getByRole("menuitem", { name: texts.contentList.trash }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: texts.contentList.confirmTrash.confirm })
    .click()
  await expect(page.getByText(texts.contentList.trashed(title))).toBeVisible()
  await expect(row).toHaveCount(0)
  expect(await appPage(slug)).toBeNull()

  // Restaurer depuis la Corbeille : en brouillon, sans republier ([D18]).
  await nav(page, texts.sections.trash.title)
  await page
    .getByRole("button", { name: texts.trash.filters.page, exact: true })
    .click()
  const trashRow = page.getByRole("row").filter({ hasText: title })
  await expect(trashRow).toContainText(texts.trash.contentKinds.page)
  await trashRow
    .getByRole("button", { name: texts.trash.restoreItem(title) })
    .click()
  await expect(page.getByText(texts.trash.restored(title))).toBeVisible()
  await expect(page.getByText(texts.trash.restoredDraft)).toBeVisible()
  await expect(trashRow).toHaveCount(0)
  expect(await appPage(slug)).toBeNull()
  await nav(page, texts.sections.pages.title)
  await expect(row).toContainText(labels.status.withdrawn)

  // Supprimer de nouveau, puis vider la corbeille : la page et son historique sont effacés.
  await row
    .getByRole("button", { name: texts.contentList.actions(title) })
    .click()
  await page.getByRole("menuitem", { name: texts.contentList.trash }).click()
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: texts.contentList.confirmTrash.confirm })
    .click()
  await expect(row).toHaveCount(0)
  await nav(page, texts.sections.trash.title)
  await expect(trashRow).toBeVisible()
  await page.getByRole("button", { name: texts.trash.empty }).click()
  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toContainText(texts.trash.confirmEmpty.title)
  await confirmation
    .getByRole("button", { name: texts.trash.confirmEmpty.confirm })
    .click()
  await expect(
    page.getByText(texts.trash.emptied(1), { exact: false })
  ).toBeVisible()
  await expect(trashRow).toHaveCount(0)
  expect(await contentExists(contentId)).toBe(false)
  expect(await appPage(slug)).toBeNull()
})

test("formules d'abonnement : réservées aux admins ; ajouter, ranger au clavier, renommer, supprimer", async ({
  page,
  team,
  browser,
}) => {
  test.setTimeout(120_000)
  const admin = await team.createAdmin("Fanny Formules")
  const editor = await team.createEditor("Élie Éditeur")
  const id = uniqueId()
  const first = `Essentiel ${id}`
  const second = `Intégral ${id}`
  const settings = texts.settings.accessLevels
  const editorContext = await browser.newContext()
  try {
    // Un éditeur : pas de Paramètres dans le menu, « Réservé aux admins » par l'adresse, et la
    // base refuse elle-même qu'il range les formules.
    const editorPage = await editorContext.newPage()
    await editorPage.goto("/parametres")
    await signIn(editorPage, editor)
    await expect(editorPage).toHaveURL(/\/parametres$/)
    await expect(
      editorPage.getByRole("heading", { name: texts.adminOnly.title })
    ).toBeVisible()
    await expect(editorPage.getByLabel(settings.name)).toHaveCount(0)
    await expect(accountMenuButton(editorPage)).toBeVisible()
    await expect(
      bottomMenu(editorPage).getByRole("link", {
        name: texts.sections.settings.title,
      })
    ).toHaveCount(0)
    const { apiUrl, publishableKey } = localSupabase()
    const refused = await fetch(`${apiUrl}/rest/v1/rpc/access_levels_reorder`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${await accessToken(editorPage)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: [] }),
    })
    expect(refused.status).toBe(403)
    expect(await refused.json()).toMatchObject({
      code: "42501",
      message: "reserve_aux_admins",
    })

    // Un admin.
    await page.goto("/parametres")
    await signIn(page, admin)
    await expect(page).toHaveURL(/\/parametres$/)
    await expect(
      bottomMenu(page).getByRole("link", {
        name: texts.sections.settings.title,
      })
    ).toBeVisible()

    const name = page.getByLabel(settings.name)
    for (const level of [second, first]) {
      await name.fill(level)
      await page.getByRole("button", { name: settings.add }).click()
      await expect(page.getByText(settings.added(level))).toBeVisible()
    }
    // Même nom, à la casse près : refusé.
    await name.fill(first.toUpperCase())
    await page.getByRole("button", { name: settings.add }).click()
    await expect(page.getByText(settings.errors.nom_en_double)).toBeVisible()

    // Au clavier : « Essentiel » (ajoutée en dernier) monte d'une place.
    const list = page.getByRole("list", { name: settings.listLabel })
    const names = () =>
      list
        .locator("[data-item]")
        .evaluateAll((items) =>
          items.map((item) => item.getAttribute("data-item"))
        )
    const before = await names()
    expect(before.indexOf(first)).toBe(before.indexOf(second) + 1)
    const swapped = before.map((level) =>
      level === first ? second : level === second ? first : level
    )
    const handle = page.getByRole("button", { name: settings.handle(first) })
    const announced = page.locator('[id^="DndLiveRegion"]')
    await handle.focus()
    await page.keyboard.press("Space")
    await expect(announced).toContainText(settings.dnd.start(first))
    // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
    await page.keyboard.press("ArrowUp")
    await expect(announced).toContainText(`${first} est à la place n°`)
    await page.keyboard.press("Space")
    await expect(page.getByText(settings.reordered)).toBeVisible()
    await expect.poll(names).toEqual(swapped)
    // Le nouvel ordre est bien celui de la base, et celui que lit l'app.
    await page.reload()
    await expect.poll(names).toEqual(swapped)

    // Renommer, puis supprimer (formule inutilisée).
    const renamed = `Premium ${id}`
    await page.getByRole("button", { name: settings.actions(second) }).click()
    await page.getByRole("menuitem", { name: settings.rename }).click()
    await page.getByLabel(settings.renameLabel(second)).fill(renamed)
    await page.getByRole("button", { name: texts.common.save }).click()
    await expect(page.getByText(settings.renamed)).toBeVisible()
    await page.getByRole("button", { name: settings.actions(renamed) }).click()
    await page.getByRole("menuitem", { name: settings.remove }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: settings.confirmRemove.confirm })
      .click()
    await expect(page.getByText(settings.removed(renamed))).toBeVisible()
    await expect(list.locator(`[data-item="${renamed}"]`)).toHaveCount(0)
  } finally {
    await editorContext.close()
    // Les formules ne sont pas liées au compte de test : on les efface ici.
    await deleteAccessLevels(id)
  }
})

test("texte alternatif figé dans l'app, puis mis à jour depuis la fiche du fichier", async ({
  page,
  team,
}) => {
  test.setTimeout(120_000)
  const admin = await team.createAdmin("Alice Alt")
  const id = uniqueId()
  const fileName = `plage-${id}.png`
  const slug = `plage-${id}`

  // Une image dans la Médiathèque, avec son texte alternatif.
  await page.goto("/mediatheque")
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/mediatheque$/)
  await page
    .getByLabel(texts.media.uploadInput)
    .setInputFiles([
      { name: fileName, mimeType: "image/png", buffer: photoPng(400, 300) },
    ])
  const card = page.getByRole("button", { name: texts.media.open(fileName) })
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel(texts.media.detail.alt).fill("Une plage au soleil")
  await sheet.getByRole("button", { name: texts.common.save }).click()
  await expect(page.getByText(texts.media.detail.saved)).toBeVisible()
  await page.keyboard.press("Escape")

  // Une page avec cette image (texte alternatif repris de la médiathèque), publiée.
  await nav(page, texts.sections.pages.title)
  await newPage(page, `La plage ${id}`)
  await page
    .getByRole("button", { name: texts.editor.blocks.image, exact: true })
    .click()
  await page
    .getByRole("dialog", { name: texts.editor.picker.title })
    .getByRole("button", { name: texts.editor.picker.choose(fileName) })
    .click()
  await expect(page.locator('[data-block-type="image"] img')).toBeVisible()
  await setSettings(page, slug, labels.settings.access.free)
  await publish(page)
  await expect(page.getByText(labels.published(1))).toBeVisible()
  await expect.poll(() => appPageText(slug)).toContain("Une plage au soleil")

  // L'image d'un contenu gratuit en ligne devient publique (fonction « files »).
  const mediaId = (await appPage(slug))!.blocks![0].mediaId!
  await expect
    .poll(() => appFileLocations([mediaId]), { timeout: 60_000 })
    .toEqual({ [mediaId]: "public" })

  // Nouveau texte alternatif : l'app garde l'ancien, la fiche propose la mise à jour.
  await backToPages(page)
  await nav(page, texts.sections.media.title)
  await card.click()
  await expect(sheet.getByText(texts.media.detail.usesLive)).toBeVisible()
  await expect(sheet.getByText(texts.media.detail.usesDrafts)).toBeVisible()
  await sheet.getByLabel(texts.media.detail.alt).fill("Une plage au couchant")
  await sheet.getByRole("button", { name: texts.common.save }).click()
  await expect(page.getByText(texts.media.detail.saved)).toBeVisible()
  expect(await appPageText(slug)).toContain("Une plage au soleil")
  const outdated = texts.media.detail.outdated
  await expect(sheet.getByText(outdated.title(1))).toBeVisible()
  await sheet.getByRole("button", { name: outdated.push(1) }).click()
  await expect(page.getByText(outdated.pushed(1))).toBeVisible()
  await expect(sheet.getByText(outdated.title(1))).toHaveCount(0)
  expect(await appPageText(slug)).toContain("Une plage au couchant")
})

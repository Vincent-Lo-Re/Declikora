// Parcours des méthodes (étape 7, partie 7b), contre le Supabase local. Ce que voit l'app est lu
// par app_method et app_content, avec la clé publishable, comme un anonyme.
//
// 1. Une méthode réservée à une formule : sa fiche (titre, image de présentation), deux chapitres
//    et trois leçons créés depuis le plan, cachés de l'app à la création. Tout est coché
//    « Montrer dans l'app » sauf une leçon ; une leçon est gratuite. Un chapitre est rangé au
//    clavier, puis la méthode est publiée d'un seul geste : la fenêtre liste ce qui part ([D29]).
//    L'app ne voit que les éléments cochés ; la leçon gratuite est lisible par un anonyme, les
//    autres verrouillées ; l'introduction du chapitre de la leçon gratuite aussi ([D43]).
// 2. Une leçon modifiée dans son éditeur et deux leçons échangées : rien ne change dans l'app
//    avant la publication ; la fenêtre liste la leçon modifiée et le rangement ; après la
//    publication, ce qui n'a pas changé garde sa version.
// 3. Une leçon retirée de l'app ([D26]), puis un chapitre mis à la corbeille ([D36]) : à chaque
//    fois, une nouvelle version de la méthode (origin « outline »). Le chapitre restauré depuis la
//    Corbeille revient en fin de liste, « Montrer dans l'app » décoché, sans rien republier.
// 4. Un lien de l'Accueil ouvre l'éditeur d'une leçon.

import type { Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import type { Account } from "./support/accounts.ts"
import { createFromDialog, expect, signIn, test } from "./support/fixtures.ts"
import { photoPng } from "./support/media.ts"
import {
  appMethod,
  appOutline,
  chapterOrder,
  createAccessLevel,
  lessonOrder,
  methodVersions,
} from "./support/methods.ts"
import {
  appContent,
  contentIdFromUrl,
  deleteAccessLevels,
} from "./support/publication.ts"

const editor = texts.editor
const publication = texts.publication
const outline = texts.methods.outline
const create = texts.methods.create
const changes = texts.methods.changes

function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function open(page: Page, path: string, account: Account) {
  await page.goto(path)
  await signIn(page, account)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
}

async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]')).toBeVisible({
    timeout: 15_000,
  })
}

/** La ligne d'une leçon ou d'un chapitre du plan, par son titre. */
function outlineRow(page: Page, kind: "chapter" | "lesson", title: string) {
  return page
    .locator(`[data-outline-kind="${kind}"]`)
    .filter({ has: page.getByRole("link", { name: title, exact: true }) })
}

/** L'identifiant d'un élément du plan, par son titre. */
async function elementId(
  page: Page,
  kind: "chapter" | "lesson",
  title: string
): Promise<string> {
  const id = await outlineRow(page, kind, title).getAttribute("data-outline-id")
  if (!id) throw new Error(`Élément introuvable dans le plan : ${title}`)
  return id
}

/** La colonne de gauche de l'écran d'une méthode : son plan. */
function plan(page: Page) {
  return page.getByRole("complementary", { name: outline.title })
}

/** L'état affiché d'une leçon (« new », « modified »…). */
function lessonState(page: Page, title: string) {
  return outlineRow(page, "lesson", title).locator("[data-element-state]")
}

/** Ouvre le menu ⋯ d'une ligne du plan, et donne l'une de ses cases. */
async function flagItem(page: Page, label: string, name: string) {
  await page.getByRole("button", { name: outline.actions(label) }).click()
  return page.getByRole("menuitemcheckbox", { name })
}

/** Coche une case du menu ⋯ d'une ligne du plan, et attend la fin de son enregistrement. */
async function check(page: Page, label: string, name: string) {
  const item = await flagItem(page, label, name)
  await item.click()
  await expect(item).toBeChecked()
  await expect(item).toBeEnabled()
  await closeMenu(page)
}

/** Vrai ou faux, une case du menu ⋯ d'une ligne du plan. */
async function expectFlag(
  page: Page,
  label: string,
  name: string,
  checked: boolean
) {
  const item = await flagItem(page, label, name)
  if (checked) await expect(item).toBeChecked()
  else await expect(item).not.toBeChecked()
  await closeMenu(page)
}

/** Ferme le menu ouvert, et attend qu'il ait quitté la page (il s'efface en fondu). */
async function closeMenu(page: Page) {
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toHaveCount(0)
}

/** Crée un chapitre ou une leçon depuis le plan (on reste sur le plan). */
async function createElement(
  page: Page,
  kind: "chapter" | "lesson",
  title: string,
  opener: string
) {
  await page.getByRole("button", { name: opener }).first().click()
  const dialog = page.getByRole("dialog", {
    name: kind === "chapter" ? create.chapterTitle : create.lessonTitle,
  })
  await dialog.getByLabel(create.name).fill(title)
  await dialog.getByRole("button", { name: create.submit, exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(outlineRow(page, kind, title)).toBeVisible()
}

/**
 * Ajoute un paragraphe dans l'éditeur ouvert (« Ajouter un bloc » en bas de la colonne de gauche,
 * puis Texte dans les Blocs), et attend son enregistrement.
 */
async function addText(page: Page, text: string) {
  await expect(page.getByLabel(editor.title.label)).toBeEditable()
  await page.locator("#colonne-gauche-ajouter").click()
  await page
    .getByRole("region", { name: editor.columns.blocks })
    .getByRole("button", { name: editor.library.addLabel(editor.blocks.text) })
    .click()
  await expect(
    page.locator('[data-block-type="text"] [contenteditable]').last()
  ).toBeFocused()
  await page.keyboard.type(text)
  await saved(page)
}

/** La carte « Dans la méthode » d'un chapitre ou d'une leçon, en tête de la colonne de droite. */
function elementCard(page: Page, kind: "chapter" | "lesson") {
  return page.locator(`[data-element-card="${kind}"]`)
}

/** Depuis l'éditeur d'un chapitre ou d'une leçon : le retour à la méthode, jusqu'au plan. */
async function backToMethod(page: Page, methodTitle: string) {
  await page
    .getByRole("link", { name: texts.methods.element.back(methodTitle) })
    .click()
  await expect(
    page.getByRole("complementary", { name: outline.title })
  ).toBeVisible()
  // La main sur la méthode est reprise : le plan se range de nouveau.
  await expect(page.getByLabel(editor.title.label)).toBeEditable()
}

type Change = {
  id: string
  change: "new" | "modified" | "reordered" | "removed"
  text: string
}

/** « Publier » : la fenêtre, ce qu'elle liste (exactement), puis la publication. */
async function publish(page: Page, expected: Change[], level?: string) {
  await page
    .getByRole("button", { name: publication.actions.publish, exact: true })
    .click()
  const dialog = page.getByRole("dialog")
  const list = dialog.getByRole("region", { name: changes.title })
  for (const line of expected) {
    const row = list.locator(
      `[data-element-id="${line.id}"][data-change="${line.change}"]`
    )
    await expect(row).toContainText(line.text)
  }
  await expect(list.locator("[data-change]")).toHaveCount(expected.length)
  if (level) await dialog.getByRole("radio", { name: level }).click()
  const confirm = dialog.getByRole("button", {
    name: publication.publishDialog.confirm,
  })
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(dialog).toHaveCount(0)
}

/** Ouvre le menu d'un élément du plan et choisit une action (avec sa confirmation). */
async function elementAction(
  page: Page,
  label: string,
  item: string,
  confirmLabel?: string
) {
  await expect(page.getByRole("menu")).toHaveCount(0)
  await page.getByRole("button", { name: outline.actions(label) }).click()
  await page.getByRole("menuitem", { name: item }).click()
  if (!confirmLabel) return
  const confirm = page.getByRole("alertdialog")
  await confirm.getByRole("button", { name: confirmLabel }).click()
  await expect(confirm).toHaveCount(0)
}

test("Méthodes : plan rangé au clavier, publication d'un seul geste, niveaux réels dans l'app, versions gardées, retrait, corbeille et restauration", async ({
  page,
  team,
}) => {
  test.setTimeout(240_000)
  const id = uniqueId()
  const level = `Essentiel ${id}`
  const title = `Mieux respirer ${id}`
  const breathe = `Respirer ${id}`
  const move = `Bouger ${id}`
  const admin = await team.createAdmin("Mathilde Méthode")
  await createAccessLevel(level)
  try {
    // =========================================================================================
    // 1. Créer, ranger au clavier, publier
    // =========================================================================================

    // --- La fiche -----------------------------------------------------------------------
    await open(page, "/methodes", admin)
    await createFromDialog(page, "method", title)
    await expect(
      page.getByRole("complementary", { name: outline.title })
    ).toBeVisible()
    const methodId = contentIdFromUrl(page.url())
    await expect(page.getByLabel(editor.title.label)).toBeEditable()
    await page.getByLabel(editor.title.label).fill(title)
    await page
      .locator('[data-presentation="cover"]')
      .getByRole("button", { name: editor.presentation.cover.choose })
      .click()
    const picker = page.getByRole("dialog", { name: editor.picker.title })
    await picker.getByLabel(editor.picker.uploadInput).setInputFiles([
      {
        name: `respirer-${id}.png`,
        mimeType: "image/png",
        buffer: photoPng(640, 400),
      },
    ])
    await expect(picker).toHaveCount(0, { timeout: 60_000 })
    await saved(page)

    // --- Le plan : deux chapitres, trois leçons, cachés de l'app à la création ------------
    await createElement(page, "chapter", breathe, outline.newChapter)
    await createElement(page, "chapter", move, outline.newChapter)
    for (const lesson of ["Le souffle", "Expirer"]) {
      await createElement(
        page,
        "lesson",
        lesson,
        outline.newLessonIn(outline.chapterLabel(1, breathe))
      )
    }
    await createElement(
      page,
      "lesson",
      "Marcher",
      outline.newLessonIn(outline.chapterLabel(2, move))
    )
    const ids = {
      breathe: await elementId(page, "chapter", breathe),
      move: await elementId(page, "chapter", move),
      souffle: await elementId(page, "lesson", "Le souffle"),
      expirer: await elementId(page, "lesson", "Expirer"),
      marcher: await elementId(page, "lesson", "Marcher"),
    }
    for (const lesson of ["Le souffle", "Expirer", "Marcher"]) {
      await expect(lessonState(page, lesson)).toHaveAttribute(
        "data-element-state",
        "hidden"
      )
    }

    // Tout est montré dans l'app, sauf « Marcher » ; « Le souffle » est gratuite.
    const breatheLabel = outline.chapterLabel(1, breathe)
    const moveLabel2 = outline.chapterLabel(2, move)
    const souffleLabel = outline.lessonLabel(1, "Le souffle")
    const expirerLabel = outline.lessonLabel(2, "Expirer")
    await check(page, breatheLabel, outline.inAppFor(breatheLabel))
    await check(page, moveLabel2, outline.inAppFor(moveLabel2))
    await check(page, souffleLabel, outline.inAppFor(souffleLabel))
    await check(page, souffleLabel, outline.isFreeFor(souffleLabel))
    await check(page, expirerLabel, outline.inAppFor(expirerLabel))
    await expect(lessonState(page, "Le souffle")).toHaveAttribute(
      "data-element-state",
      "new"
    )
    await expect(lessonState(page, "Marcher")).toHaveAttribute(
      "data-element-state",
      "hidden"
    )

    // --- Le texte de la leçon gratuite, dans son éditeur (« ← méthode ») -----------------
    await plan(page)
      .getByRole("link", { name: "Le souffle", exact: true })
      .click()
    await expect(page).toHaveURL(/\/methodes\/lecons\//)
    await expect(elementCard(page, "lesson")).toContainText(
      texts.methods.element.place.lesson(1)
    )
    // Un chapitre ou une leçon part avec sa méthode : pas de bouton Publier ([D29]).
    await expect(
      page.getByRole("button", {
        name: publication.actions.publish,
        exact: true,
      })
    ).toHaveCount(0)
    await addText(page, "Inspire par le nez.")
    await backToMethod(page, title)

    // --- Ranger au clavier : « Bouger » passe avant « Respirer » -----------------------------
    const moveLabel = outline.chapterLabel(2, move)
    const announced = page.locator('[id^="DndLiveRegion"]')
    await page.getByRole("button", { name: outline.handle(moveLabel) }).focus()
    await page.keyboard.press("Space")
    await expect(announced).toContainText(texts.methods.dnd.start(moveLabel))
    // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
    await page.keyboard.press("ArrowUp")
    await expect(announced).toContainText(
      texts.methods.dnd.over(moveLabel, outline.chapterLabel(1, breathe))
    )
    await page.keyboard.press("Space")
    await expect(announced).toContainText(
      texts.methods.dnd.end(moveLabel, outline.chapterPlace(1, 2))
    )
    await expect.poll(() => chapterOrder(methodId)).toEqual([move, breathe])
    await expectFlag(
      page,
      outline.chapterLabel(1, move),
      outline.inAppFor(outline.chapterLabel(1, move)),
      true
    )
    // Rien n'est encore dans l'app.
    expect(await appMethod(methodId)).toBeNull()

    // --- Publication : la fenêtre liste ce qui arrive dans l'app ([D29]) --------------------
    await publish(
      page,
      [
        { id: methodId, change: "new", text: changes.method.new },
        {
          id: ids.move,
          change: "new",
          text: `${changes.kinds.chapter} « ${move} »`,
        },
        {
          id: ids.breathe,
          change: "new",
          text: `${changes.kinds.chapter} « ${breathe} »`,
        },
        {
          id: ids.souffle,
          change: "new",
          text: `${changes.kinds.lesson} « Le souffle »`,
        },
        {
          id: ids.expirer,
          change: "new",
          text: `${changes.kinds.lesson} « Expirer »`,
        },
      ],
      level
    )
    await expect(page.getByText(publication.published(1))).toBeVisible()

    // L'app : seuls les éléments cochés, dans l'ordre rangé.
    await expect
      .poll(async () => appOutline(await appMethod(methodId)))
      .toEqual([`${move} : `, `${breathe} : Le souffle (gratuite), Expirer`])
    const first = await appMethod(methodId)
    if (!first) throw new Error("La méthode n'est pas dans l'app")
    const [appMove, appBreathe] = first.chapters
    expect(first.level?.name).toBe(level)
    expect(first.locked).toBe(true)
    // [D43] : l'introduction de « Respirer » (qui a une leçon gratuite) est gratuite, pas
    // celle de « Bouger ».
    expect(appMove.level?.name).toBe(level)
    expect(appMove.locked).toBe(true)
    expect(appBreathe.level).toBeNull()
    expect(appBreathe.locked).toBe(false)
    const [appSouffle, appExpirer] = appBreathe.lessons
    expect(appSouffle).toMatchObject({
      id: ids.souffle,
      isFree: true,
      level: null,
      locked: false,
    })
    expect(appExpirer).toMatchObject({
      id: ids.expirer,
      isFree: false,
      locked: true,
    })
    expect(appExpirer.level?.name).toBe(level)

    // Chaque élément s'ouvre par app_content, avec son niveau réel.
    const souffle = await appContent(ids.souffle)
    expect(souffle).toMatchObject({
      kind: "lesson",
      methodId,
      isFree: true,
      locked: false,
      level: null,
    })
    expect(JSON.stringify(souffle?.blocks)).toContain("Inspire par le nez.")
    const expirer = await appContent(ids.expirer)
    expect(expirer).toMatchObject({ kind: "lesson", methodId, locked: true })
    expect(expirer?.blocks).toBeNull()
    expect(await appContent(ids.breathe)).toMatchObject({
      kind: "chapter",
      methodId,
      locked: false,
      level: null,
    })
    expect(await appContent(ids.move)).toMatchObject({
      kind: "chapter",
      locked: true,
    })
    expect(await appContent(ids.marcher)).toBeNull()

    // Rien de neuf : « Publier » est grisé.
    await expect(
      page.getByRole("button", {
        name: publication.actions.publish,
        exact: true,
      })
    ).toBeDisabled()

    // =========================================================================================
    // 2. Modifier une leçon, en ranger deux : l'app ne change qu'à la publication
    // =========================================================================================

    await plan(page).getByRole("link", { name: "Expirer", exact: true }).click()
    await expect(page).toHaveURL(/\/methodes\/lecons\//)
    await addText(page, "Souffle lent.")
    await backToMethod(page, title)
    await expect(lessonState(page, "Expirer")).toHaveAttribute(
      "data-element-state",
      "modified"
    )
    await expect(lessonState(page, "Le souffle")).toHaveAttribute(
      "data-element-state",
      "live"
    )

    // « Expirer » monte avant « Le souffle » (menu de l'élément).
    await elementAction(page, outline.lessonLabel(2, "Expirer"), outline.moveUp)
    await expect
      .poll(() => lessonOrder(breathe))
      .toEqual(["Expirer", "Le souffle"])

    // Rien ne change dans l'app avant la publication.
    expect(await appMethod(methodId)).toEqual(first)
    expect((await appContent(ids.expirer))?.versionId).toBe(
      appExpirer.versionId
    )

    // La fenêtre liste la leçon modifiée et le rangement, pas ce qui n'a pas changé.
    await publish(page, [
      { id: methodId, change: "reordered", text: changes.method.reordered },
      {
        id: ids.expirer,
        change: "modified",
        text: `${changes.kinds.lesson} « Expirer »`,
      },
    ])
    await expect(page.getByText(publication.published(2))).toBeVisible()
    await expect
      .poll(async () => appOutline(await appMethod(methodId)))
      .toEqual([`${move} : `, `${breathe} : Expirer, Le souffle (gratuite)`])
    const second = await appMethod(methodId)
    if (!second) throw new Error("La méthode n'est plus dans l'app")
    expect(second.versionId).not.toBe(first.versionId)
    // Ce qui n'a pas changé garde sa version ; la leçon modifiée en a une nouvelle.
    expect(second.chapters.map((chapter) => chapter.versionId)).toEqual([
      appMove.versionId,
      appBreathe.versionId,
    ])
    const [secondExpirer, secondSouffle] = second.chapters[1].lessons
    expect(secondSouffle.versionId).toBe(appSouffle.versionId)
    expect(secondExpirer.versionId).not.toBe(appExpirer.versionId)
    expect((await appContent(ids.souffle))?.versionId).toBe(
      appSouffle.versionId
    )
    const expirerNow = await appContent(ids.expirer)
    expect(expirerNow?.versionId).toBe(secondExpirer.versionId)
    expect(expirerNow?.locked).toBe(true)
    expect((await methodVersions(methodId)).map((v) => v.origin)).toEqual([
      "manual",
      "manual",
    ])

    // =========================================================================================
    // 3. Retirer une leçon de l'app, mettre un chapitre à la corbeille, le restaurer
    // =========================================================================================

    // --- « Retirer de l'app » : tout de suite, nouvelle version de la méthode ([D26]) --------
    await elementAction(
      page,
      outline.lessonLabel(1, "Expirer"),
      outline.unpublish,
      outline.confirmUnpublish.confirm
    )
    await expect
      .poll(async () => appOutline(await appMethod(methodId)))
      .toEqual([`${move} : `, `${breathe} : Le souffle (gratuite)`])
    expect((await methodVersions(methodId)).map((v) => v.origin)).toEqual([
      "manual",
      "manual",
      "outline",
    ])
    expect(await appContent(ids.expirer)).toBeNull()
    await expect(lessonState(page, "Expirer")).toHaveAttribute(
      "data-element-state",
      "withdrawn"
    )
    await expectFlag(
      page,
      outline.lessonLabel(1, "Expirer"),
      outline.inAppFor(outline.lessonLabel(1, "Expirer")),
      false
    )

    // --- Le chapitre « Bouger » à la corbeille : il sort du plan en ligne ([D36]) ------------
    await elementAction(
      page,
      outline.chapterLabel(1, move),
      outline.trash,
      outline.confirmTrash.confirm
    )
    await expect(outlineRow(page, "chapter", move)).toHaveCount(0)
    await expect
      .poll(async () => appOutline(await appMethod(methodId)))
      .toEqual([`${breathe} : Le souffle (gratuite)`])
    const afterTrash = await methodVersions(methodId)
    expect(afterTrash.map((v) => v.origin)).toEqual([
      "manual",
      "manual",
      "outline",
      "outline",
    ])
    expect(await appContent(ids.move)).toBeNull()
    // Le reste garde sa version.
    const third = await appMethod(methodId)
    expect(third?.versionId).toBe(afterTrash[3].id)
    expect(third?.chapters[0].versionId).toBe(appBreathe.versionId)
    expect(third?.chapters[0].lessons[0].versionId).toBe(appSouffle.versionId)

    // --- La liste des méthodes : niveau d'accès -------------------------------------------
    await page.getByRole("link", { name: editor.back("Méthodes") }).click()
    const row = page.getByRole("row").filter({ hasText: title })
    await expect(row).toContainText(level)

    // --- Restaurer depuis la Corbeille : en fin de liste, caché de l'app -----------------
    await page
      .getByRole("navigation", { name: texts.nav.label })
      .getByRole("link", { name: texts.sections.trash.title })
      .click()
    await page
      .getByRole("button", { name: texts.trash.restoreItem(move) })
      .click()
    const restored = page
      .locator("[data-sonner-toast]")
      .filter({ hasText: texts.trash.restored(move) })
    await restored
      .getByRole("button", { name: texts.trash.open, exact: true })
      .click()
    await expect(page).toHaveURL(new RegExp(`/methodes/chapitres/${ids.move}$`))
    await expect(elementCard(page, "chapter")).toBeVisible()
    await backToMethod(page, title)
    await expect.poll(() => chapterOrder(methodId)).toEqual([breathe, move])
    await expectFlag(
      page,
      outline.chapterLabel(2, move),
      outline.inAppFor(outline.chapterLabel(2, move)),
      false
    )
    // Sa leçon revient avec lui.
    await expect(outlineRow(page, "lesson", "Marcher")).toBeVisible()
    // Rien n'est republié.
    expect(await methodVersions(methodId)).toHaveLength(4)
    expect(await appMethod(methodId)).toEqual(third)

    // =========================================================================================
    // 4. Un lien de l'Accueil ouvre l'éditeur d'une leçon
    // =========================================================================================

    await page.getByRole("link", { name: editor.back("Méthodes") }).click()
    await page
      .getByRole("navigation", { name: texts.nav.label })
      .getByRole("link", { name: texts.sections.home.title })
      .click()
    const drafts = page.locator('[data-home="drafts"]')
    const draft = drafts
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Expirer", exact: true }) })
    await expect(draft).toContainText(texts.home.inMethod(title))
    await draft.getByRole("link", { name: "Expirer", exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/methodes/lecons/${ids.expirer}$`))
    await expect(elementCard(page, "lesson")).toBeVisible()
    await expect(page.getByLabel(editor.title.label)).toHaveValue("Expirer")
  } finally {
    await deleteAccessLevels(id)
  }
})

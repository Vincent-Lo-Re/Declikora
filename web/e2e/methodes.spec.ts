// Parcours des méthodes, contre le Supabase local, sur la page d'une méthode (ADMIN § 4, « Une
// méthode sur une seule page ») : sa fiche, puis ses chapitres, leçons et exercices à la suite,
// écrits sur place sous un seul verrou. Ce que voit l'app est lu par app_method et app_content,
// avec la clé publishable, comme un anonyme.
//
// 1. Une méthode réservée à une formule : sa fiche (titre, image de présentation), deux chapitres
//    et trois leçons ajoutés depuis le plan (le curseur va dans leur titre), cachés de l'app à la
//    création. Tout est coché « Montrer dans l'app » sauf une leçon ; une leçon est gratuite. Un
//    chapitre est rangé au clavier, puis la méthode est publiée d'un seul geste : la fenêtre
//    liste ce qui part ([D29]). L'app ne voit que les éléments cochés ; la leçon gratuite est
//    lisible par un anonyme, les autres verrouillées ; l'introduction du chapitre de la leçon
//    gratuite aussi ([D43]).
// 2. Une leçon modifiée sur place et deux leçons échangées : rien ne change dans l'app avant la
//    publication ; la fenêtre liste la leçon modifiée et le rangement ; après la publication, ce
//    qui n'a pas changé garde sa version.
// 3. Une leçon retirée de l'app ([D26]), puis un chapitre mis à la corbeille ([D36]) : à chaque
//    fois, une nouvelle version de la méthode (origin « outline »). Le chapitre restauré depuis la
//    Corbeille revient en fin de liste, « Montrer dans l'app » décoché, sans rien republier, et
//    « Ouvrir » mène à la page de la méthode, sur lui.
// 4. Un lien de l'Accueil mène à la page de la méthode, sur la leçon.
// 5. Les exercices : ajoutés depuis le menu ⋯ d'une leçon, cachés de l'app à la création ; ceux
//    qui sont cochés partent avec la méthode. Dans l'app, une leçon donne ses exercices, le plan
//    leur nombre, et chacun a l'accès de sa leçon. Un exercice qui change de leçon prend l'accès
//    de sa nouvelle leçon ; un exercice mis à la corbeille quitte l'app.
// 6. La Lecture : les écrans de l'app, dans le téléphone (une leçon, ses exercices, la flèche de
//    retour, « Suivant »), gardés dans l'adresse ; elle ne prend pas la main : un autre membre
//    écrit la méthode pendant qu'on la lit, puis la rend.

import type { Browser, Locator, Page } from "@playwright/test"

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
const changes = texts.methods.changes
const methodPage = texts.methods.page

function uniqueId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

async function open(page: Page, path: string, account: Account) {
  await page.goto(path)
  await signIn(page, account)
  await expect(page).toHaveURL(new RegExp(`${path}$`))
}

async function saved(page: Page) {
  await expect(page.locator('[data-save-status="saved"]').first()).toBeVisible({
    timeout: 15_000,
  })
}

type ElementKind = "chapter" | "lesson" | "exercise"

/** La colonne de gauche de la page d'une méthode : son plan. */
function plan(page: Page) {
  return page.getByRole("complementary", { name: outline.title })
}

/** La ligne d'un élément du plan, par son titre. */
function outlineRow(page: Page, kind: ElementKind, title: string) {
  return page
    .locator(`[data-outline-kind="${kind}"]`)
    .filter({ has: page.getByRole("button", { name: title, exact: true }) })
}

/** L'identifiant d'un élément du plan, par son titre. */
async function elementId(
  page: Page,
  kind: ElementKind,
  title: string
): Promise<string> {
  const id = await outlineRow(page, kind, title).getAttribute("data-outline-id")
  if (!id) throw new Error(`Élément introuvable dans le plan : ${title}`)
  return id
}

/** L'état affiché d'une leçon (« new », « modified »…), sans celui de ses exercices. */
function lessonState(page: Page, title: string) {
  return outlineRow(page, "lesson", title).locator(
    ":scope > div [data-element-state]"
  )
}

/** Ouvre le menu ⋯ d'une ligne du plan, et donne l'une de ses cases. */
async function flagItem(page: Page, label: string, name: string) {
  await page.getByRole("button", { name: outline.actions(label) }).click()
  return page.getByRole("menuitemcheckbox", { name })
}

/** Coche une case du menu ⋯ d'une ligne du plan. */
async function check(page: Page, label: string, name: string) {
  const item = await flagItem(page, label, name)
  await item.click()
  await expect(item).toBeChecked()
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

/**
 * Ajoute une partie (opener : le bouton qui l'ajoute) : elle arrive à sa place, le curseur dans
 * son titre, qu'on écrit ; le plan la montre aussitôt.
 */
async function addPart(
  page: Page,
  kind: ElementKind,
  title: string,
  opener: Locator
) {
  await opener.click()
  await expect(page.locator(":focus")).toHaveAttribute(
    "aria-label",
    new RegExp(`^${methodPage.titleOf("")}`)
  )
  await page.keyboard.type(title)
  await expect(outlineRow(page, kind, title)).toBeVisible()
}

/** Ajoute un exercice dans une leçon, depuis son menu ⋯ dans le plan. */
async function addExercise(page: Page, lessonLabel: string, title: string) {
  await page.getByRole("button", { name: outline.actions(lessonLabel) }).click()
  await addPart(
    page,
    "exercise",
    title,
    page.getByRole("menuitem", { name: outline.newExercise })
  )
}

/**
 * Ajoute un paragraphe dans une partie (« Ajouter un bloc » de la partie, puis Texte dans les
 * Blocs), attend son enregistrement, et referme les Blocs.
 */
async function addText(page: Page, path: string, text: string) {
  await page.getByRole("button", { name: methodPage.addBlockIn(path) }).click()
  await page
    .getByRole("region", { name: editor.columns.blocks })
    .getByRole("button", { name: editor.library.addLabel(editor.blocks.text) })
    .click()
  await expect(
    page.locator('[data-block-type="text"] [contenteditable]:focus')
  ).toBeVisible()
  await page.keyboard.type(text)
  await saved(page)
  await page.getByRole("button", { name: editor.library.close }).click()
}

/** Va à une partie par sa ligne du plan. */
async function goTo(page: Page, title: string) {
  const line = plan(page).getByRole("button", { name: title, exact: true })
  await line.click()
  await expect(line).toHaveAttribute("aria-current", "true")
}

/** La carte « Dans la méthode » de la partie en cours, en tête de la colonne de droite. */
function elementCard(page: Page, kind: ElementKind) {
  return page.locator(`[data-element-card="${kind}"]`)
}

type Change = {
  id: string
  change: "new" | "modified" | "reordered" | "removed"
  text: string
}

/**
 * « Publier » : la fenêtre, ce qu'elle liste (exactement), ou son résumé quand la méthode entre
 * dans l'app, puis la publication.
 */
async function publish(
  page: Page,
  expected: Change[] | string,
  level?: string
) {
  await page
    .getByRole("button", { name: publication.actions.publish, exact: true })
    .click()
  const dialog = page.getByRole("dialog")
  const list = dialog.getByRole("region", { name: changes.title })
  const lines = typeof expected === "string" ? [] : expected
  if (typeof expected === "string") await expect(list).toContainText(expected)
  for (const line of lines) {
    const row = list.locator(
      `[data-element-id="${line.id}"][data-change="${line.change}"]`
    )
    await expect(row).toContainText(line.text)
  }
  await expect(list.locator("[data-change]")).toHaveCount(lines.length)
  if (level) await dialog.getByRole("radio", { name: level }).click()
  const confirm = dialog.getByRole("button", {
    name: publication.publishDialog.confirm,
  })
  await expect(confirm).toBeEnabled()
  await confirm.click()
  await expect(dialog).toHaveCount(0)
}

/**
 * « Nouvelle méthode » depuis la liste : sa page, avec la main ; sa fiche (titre, image de
 * présentation envoyée depuis le téléphone). Donne son identifiant.
 */
async function createMethod(
  page: Page,
  title: string,
  id: string
): Promise<string> {
  await createFromDialog(page, "method", title)
  await expect(plan(page)).toBeVisible()
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
  return methodId
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

test("Méthodes : une seule page, plan rangé au clavier, publication d'un seul geste, niveaux réels dans l'app, versions gardées, retrait, corbeille et restauration", async ({
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
    const methodId = await createMethod(page, title, id)

    // --- Deux chapitres, trois leçons, ajoutés à leur place, cachés de l'app ----------------
    const newChapter = plan(page).getByRole("button", {
      name: outline.newChapter,
    })
    await addPart(page, "chapter", breathe, newChapter)
    await addPart(page, "chapter", move, newChapter)
    const breatheLabel = outline.chapterLabel(1, breathe)
    const moveLabel2 = outline.chapterLabel(2, move)
    for (const lesson of ["Le souffle", "Expirer"]) {
      await addPart(
        page,
        "lesson",
        lesson,
        plan(page).getByRole("button", {
          name: outline.newLessonIn(breatheLabel),
        })
      )
    }
    // Une leçon ajoutée depuis le téléphone, à la fin du chapitre 2.
    await addPart(
      page,
      "lesson",
      "Marcher",
      page.getByRole("main").getByRole("button", {
        name: outline.newLessonIn(moveLabel2),
      })
    )
    const ids = {
      breathe: await elementId(page, "chapter", breathe),
      move: await elementId(page, "chapter", move),
      souffle: await elementId(page, "lesson", "Le souffle"),
      expirer: await elementId(page, "lesson", "Expirer"),
      marcher: await elementId(page, "lesson", "Marcher"),
    }
    // Le téléphone montre toute la méthode, à la suite.
    await expect(
      page.getByRole("region", {
        name: methodPage.part("Chapitre 2, leçon 1", "Marcher"),
      })
    ).toBeVisible()
    for (const lesson of ["Le souffle", "Expirer", "Marcher"]) {
      await expect(lessonState(page, lesson)).toHaveAttribute(
        "data-element-state",
        "hidden"
      )
    }

    // Tout est montré dans l'app, sauf « Marcher » ; « Le souffle » est gratuite.
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

    // --- Le texte de la leçon gratuite, écrit sur place --------------------------------------
    await goTo(page, "Le souffle")
    await expect(elementCard(page, "lesson")).toContainText(
      texts.methods.element.place.lesson(1)
    )
    await addText(page, "Chapitre 1, leçon 1", "Inspire par le nez.")

    // --- Ranger au clavier : « Bouger » passe avant « Respirer » -----------------------------
    const moveLabel = outline.chapterLabel(2, move)
    // Les annonces du plan (les blocs de la partie en cours ont les leurs).
    const announced = (text: string) =>
      page.locator('[id^="DndLiveRegion"]').filter({ hasText: text })
    await page.getByRole("button", { name: outline.handle(moveLabel) }).focus()
    await page.keyboard.press("Space")
    await expect(announced(texts.methods.dnd.start(moveLabel))).toHaveCount(1)
    // dnd-kit n'écoute les flèches qu'au tour suivant de la boucle d'événements.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)))
    await page.keyboard.press("ArrowUp")
    await expect(
      announced(
        texts.methods.dnd.over(moveLabel, outline.chapterLabel(1, breathe))
      )
    ).toHaveCount(1)
    await page.keyboard.press("Space")
    await expect(
      announced(texts.methods.dnd.end(moveLabel, outline.chapterPlace(1, 2)))
    ).toHaveCount(1)
    await expect.poll(() => chapterOrder(methodId)).toEqual([move, breathe])
    // Le téléphone suit : « Bouger » est le chapitre 1.
    await expect(
      page.getByRole("region", { name: methodPage.part("Chapitre 1", move) })
    ).toBeVisible()
    await expectFlag(
      page,
      outline.chapterLabel(1, move),
      outline.inAppFor(outline.chapterLabel(1, move)),
      true
    )
    // Rien n'est encore dans l'app.
    expect(await appMethod(methodId)).toBeNull()

    // --- Publication : la fenêtre résume ce qui entre dans l'app ([D29]) --------------------
    await publish(page, changes.entry(2, 2), level)
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

    await goTo(page, "Expirer")
    await addText(page, "Chapitre 2, leçon 2", "Souffle lent.")
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
    await expect(
      page.getByRole("region", { name: methodPage.part("Chapitre 1", move) })
    ).toHaveCount(0)
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
    // « Ouvrir » mène à la page de la méthode, sur le chapitre.
    await expect(page).toHaveURL(
      new RegExp(`/methodes/${methodId}\\?partie=${ids.move}$`)
    )
    await expect(elementCard(page, "chapter")).toBeVisible()
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
    // 4. Un lien de l'Accueil mène à la page de la méthode, sur la leçon
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
    await expect(page).toHaveURL(
      new RegExp(`/methodes/${methodId}\\?partie=${ids.expirer}$`)
    )
    await expect(
      plan(page).getByRole("button", { name: "Expirer", exact: true })
    ).toHaveAttribute("aria-current", "true")
    await expect(elementCard(page, "lesson")).toBeVisible()
    await expect(
      page.getByLabel(methodPage.titleOf("Chapitre 1, leçon 1"))
    ).toHaveValue("Expirer")
  } finally {
    await deleteAccessLevels(id)
  }
})

/** Les exercices d'une leçon dans l'app : « Titre » ou « Titre (réservé) », dans l'ordre. */
async function appExercises(lessonId: string): Promise<string[]> {
  const lesson = await appContent(lessonId)
  return (lesson?.exercises ?? []).map(
    (exercise) => `${exercise.title}${exercise.locked ? " (réservé)" : ""}`
  )
}

test("Méthodes : les exercices d'une leçon, publiés avec la méthode, à l'accès de leur leçon", async ({
  page,
  team,
}) => {
  test.setTimeout(180_000)
  const id = uniqueId()
  const level = `Essentiel ${id}`
  const title = `Exercices ${id}`
  const chapter = `Respirer ${id}`
  const admin = await team.createAdmin("Étienne Exercice")
  await createAccessLevel(level)
  try {
    // --- Une méthode, un chapitre, deux leçons, trois exercices --------------------------
    await open(page, "/methodes", admin)
    const methodId = await createMethod(page, title, id)
    await addPart(
      page,
      "chapter",
      chapter,
      plan(page).getByRole("button", { name: outline.newChapter })
    )
    const chapterLabel = outline.chapterLabel(1, chapter)
    for (const lesson of ["Le souffle", "Expirer"]) {
      await addPart(
        page,
        "lesson",
        lesson,
        plan(page).getByRole("button", {
          name: outline.newLessonIn(chapterLabel),
        })
      )
    }
    const souffleLabel = outline.lessonLabel(1, "Le souffle")
    const expirerLabel = outline.lessonLabel(2, "Expirer")
    await addExercise(page, souffleLabel, "Inspirer")
    await addExercise(page, souffleLabel, "Compter")
    await addExercise(page, expirerLabel, "Souffler")
    const ids = {
      souffle: await elementId(page, "lesson", "Le souffle"),
      expirer: await elementId(page, "lesson", "Expirer"),
      inspirer: await elementId(page, "exercise", "Inspirer"),
      compter: await elementId(page, "exercise", "Compter"),
      souffler: await elementId(page, "exercise", "Souffler"),
    }
    // Chaque exercice suit sa leçon dans le téléphone.
    await expect(
      page.getByRole("region", {
        name: methodPage.part("Chapitre 1, leçon 1, exercice 2", "Compter"),
      })
    ).toBeVisible()
    await expect(
      outlineRow(page, "exercise", "Inspirer").locator("[data-element-state]")
    ).toHaveAttribute("data-element-state", "hidden")

    // Tout est montré, sauf « Compter » ; « Le souffle » est gratuite.
    const inspirerLabel = outline.exerciseLabel(1, "Inspirer")
    const soufflerLabel = outline.exerciseLabel(1, "Souffler")
    await check(page, chapterLabel, outline.inAppFor(chapterLabel))
    await check(page, souffleLabel, outline.inAppFor(souffleLabel))
    await check(page, souffleLabel, outline.isFreeFor(souffleLabel))
    await check(page, expirerLabel, outline.inAppFor(expirerLabel))
    await check(page, inspirerLabel, outline.inAppFor(inspirerLabel))
    await check(page, soufflerLabel, outline.inAppFor(soufflerLabel))

    // --- La colonne d'un exercice : sa place, l'accès de sa leçon ------------------------
    await goTo(page, "Inspirer")
    await expect(elementCard(page, "exercise")).toContainText(
      texts.methods.element.place.exercise(1)
    )
    await expect(page.locator("[data-element-access]")).toHaveText(
      texts.methods.element.access.lessonFree
    )
    await addText(
      page,
      "Chapitre 1, leçon 1, exercice 1",
      "Inspire en comptant jusqu'à quatre."
    )

    // --- Publication : la méthode entre dans l'app avec ses exercices cochés -------------
    await publish(page, changes.entry(1, 2, 2), level)
    await expect(page.getByText(publication.published(1))).toBeVisible()
    await expect
      .poll(async () =>
        (await appMethod(methodId))?.chapters[0]?.lessons.map(
          (lesson) => `${lesson.title} : ${lesson.exerciseCount}`
        )
      )
      .toEqual(["Le souffle : 1", "Expirer : 1"])
    expect(await appExercises(ids.souffle)).toEqual(["Inspirer"])
    // La leçon « Expirer » est réservée : son exercice aussi, même listé.
    expect(await appExercises(ids.expirer)).toEqual(["Souffler (réservé)"])
    const inspirer = await appContent(ids.inspirer)
    expect(inspirer).toMatchObject({
      kind: "exercise",
      methodId,
      lessonId: ids.souffle,
      locked: false,
      level: null,
    })
    expect(JSON.stringify(inspirer?.blocks)).toContain(
      "Inspire en comptant jusqu'à quatre."
    )
    expect(await appContent(ids.souffler)).toMatchObject({
      lessonId: ids.expirer,
      locked: true,
      blocks: null,
    })
    expect(await appContent(ids.compter)).toBeNull()

    // --- « Souffler » monte dans « Le souffle » : il en prend l'accès à la publication -----
    await elementAction(page, soufflerLabel, outline.moveUp)
    await expect(
      page
        .locator(`[data-outline-id="${ids.souffle}"]`)
        .locator('[data-outline-kind="exercise"]')
    ).toHaveCount(3)
    await publish(page, [
      { id: methodId, change: "reordered", text: changes.method.reordered },
    ])
    await expect
      .poll(() => appExercises(ids.souffle))
      .toEqual(["Inspirer", "Souffler"])
    expect(await appExercises(ids.expirer)).toEqual([])
    expect(await appContent(ids.souffler)).toMatchObject({
      lessonId: ids.souffle,
      locked: false,
    })

    // --- « Inspirer » à la corbeille : il quitte l'app aussitôt ([D36]) ---------------------
    const before = (await methodVersions(methodId)).length
    await elementAction(
      page,
      outline.exerciseLabel(1, "Inspirer"),
      outline.trash,
      outline.confirmTrash.confirm
    )
    await expect.poll(() => appExercises(ids.souffle)).toEqual(["Souffler"])
    const versions = await methodVersions(methodId)
    expect(versions).toHaveLength(before + 1)
    expect(versions.at(-1)?.origin).toBe("outline")
    expect(await appContent(ids.inspirer)).toBeNull()
  } finally {
    await deleteAccessLevels(id)
  }
})

/** Un second navigateur, avec les mêmes réglages que le premier. */
async function secondBrowser(
  browser: Browser,
  options: { baseURL?: string; locale?: string; timezoneId?: string }
) {
  const context = await browser.newContext(options)
  return { context, page: await context.newPage() }
}

test("Méthodes : la Lecture montre les écrans de l'app dans le téléphone, sans prendre la main", async ({
  page,
  team,
  browser,
  baseURL,
  locale,
  timezoneId,
}) => {
  test.setTimeout(180_000)
  const preview = editor.preview
  const words = texts.methods.preview
  const id = uniqueId()
  const title = `Lecture ${id}`
  const chapter = `Respirer ${id}`
  const admin = await team.createAdmin("Léa Lecture")
  const oscar = await team.createAdmin("Oscar Écrit")

  // --- Une méthode, un chapitre, deux leçons et un exercice, tous montrés -------------------
  await open(page, "/methodes", admin)
  const methodId = await createMethod(page, title, id)
  await addPart(
    page,
    "chapter",
    chapter,
    plan(page).getByRole("button", { name: outline.newChapter })
  )
  const chapterLabel = outline.chapterLabel(1, chapter)
  for (const lesson of ["Le souffle", "Expirer"]) {
    await addPart(
      page,
      "lesson",
      lesson,
      plan(page).getByRole("button", {
        name: outline.newLessonIn(chapterLabel),
      })
    )
  }
  const souffleLabel = outline.lessonLabel(1, "Le souffle")
  const expirerLabel = outline.lessonLabel(2, "Expirer")
  await addExercise(page, souffleLabel, "Inspirer")
  const souffleId = await elementId(page, "lesson", "Le souffle")
  for (const label of [
    chapterLabel,
    souffleLabel,
    expirerLabel,
    outline.exerciseLabel(1, "Inspirer"),
  ]) {
    await check(page, label, outline.inAppFor(label))
  }
  await saved(page)

  // --- En Lecture : l'écran de la méthode, puis celui d'une leçon, dans le téléphone ----------
  const tools = page.getByRole("toolbar", { name: preview.tools })
  const phone = page.getByRole("region", { name: preview.screen.ios })
  await goTo(page, title)
  await tools.getByRole("button", { name: preview.mode.read }).click()
  await expect(page).toHaveURL(
    new RegExp(`/methodes/${methodId}\\?mode=lecture$`)
  )
  await phone.getByRole("button", { name: /Le souffle/ }).click()
  await expect(
    phone.getByRole("heading", { level: 1, name: "Le souffle" })
  ).toBeVisible()
  await expect(page).toHaveURL(
    new RegExp(`/methodes/${methodId}\\?mode=lecture&partie=${souffleId}$`)
  )
  // Le plan suit l'écran ; rien ne s'écrit.
  await expect(
    plan(page).getByRole("button", { name: "Le souffle", exact: true })
  ).toHaveAttribute("aria-current", "true")
  await expect(page.getByLabel(editor.title.label)).toHaveCount(0)

  // Oscar ouvre la méthode qu'on lit : personne ne la tient, il l'écrit, puis passe en Lecture
  // et rend la main.
  const second = await secondBrowser(browser, { baseURL, locale, timezoneId })
  try {
    await second.page.goto(`/methodes/${methodId}`)
    await signIn(second.page, oscar)
    await expect(second.page.getByLabel(editor.title.label)).toBeEditable()
    const released = second.page.waitForResponse(
      (response) =>
        response.url().endsWith("/rpc/lock_release") && response.ok()
    )
    await second.page
      .getByRole("toolbar", { name: preview.tools })
      .getByRole("button", { name: preview.mode.read })
      .click()
    await released
  } finally {
    await second.context.close()
  }

  // Un exercice de la leçon, puis la flèche du téléphone : retour à la leçon.
  await phone
    .getByRole("region", { name: words.lessonExercises })
    .getByRole("button", { name: /Inspirer/ })
    .click()
  await expect(
    phone.getByRole("heading", { level: 1, name: "Inspirer" })
  ).toBeVisible()
  await phone.getByRole("button", { name: preview.back("Le souffle") }).click()
  await expect(
    phone.getByRole("heading", { level: 1, name: "Le souffle" })
  ).toBeVisible()

  // « Suivant » : la leçon d'après ; rechargée, la page reste en Lecture, sur elle.
  await phone
    .getByRole("navigation", { name: words.next })
    .getByRole("button")
    .click()
  await expect(
    phone.getByRole("heading", { level: 1, name: "Expirer" })
  ).toBeVisible()
  await page.reload()
  await expect(
    phone.getByRole("heading", { level: 1, name: "Expirer" })
  ).toBeVisible()
  await expect(page.getByLabel(editor.title.label)).toHaveCount(0)

  // La flèche : la méthode ; « Édition » y reprend la main.
  await phone.getByRole("button", { name: preview.back(title) }).click()
  await expect(
    phone.getByRole("heading", { level: 1, name: title })
  ).toBeVisible()
  await tools.getByRole("button", { name: preview.mode.edit }).click()
  await expect(page.getByLabel(editor.title.label)).toBeEditable()
  await expect(page).toHaveURL(new RegExp(`/methodes/${methodId}$`))
})

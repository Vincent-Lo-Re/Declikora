// Parcours de l'équipe : invitation d'un éditeur, ce qu'il voit, retrait, invitation d'un
// admin. La fonction « equipe » est aussi appelée directement, pour vérifier qu'elle refuse
// elle-même ce que l'interface cache.
//
// Les règles CORS de la fonction (cors.ts) ne sont pas testées ici : en local, la passerelle de
// Supabase répond elle-même aux requêtes CORS. Elles sont couvertes par cors.test.ts.

import { texts } from "../src/texts.ts"
import {
  countOtherAdmins,
  readProfile,
  uniqueEmail,
} from "./support/accounts.ts"
import {
  invitationPath,
  receivedIds,
  waitForNewEmail,
} from "./support/mailpit.ts"
import {
  bottomMenu,
  expect,
  signIn,
  signInWithEmailCode,
  test,
  verifySecondFactor,
} from "./support/fixtures.ts"
import { accessToken, callTeamFunction } from "./support/team-api.ts"

test("un admin invite un éditeur, qui rejoint l'équipe sans voir Équipe", async ({
  page,
  browser,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")
  const editor = team.track({
    email: uniqueEmail("editeur"),
    fullName: "Nina Nouvelle",
  })

  await page.goto("/equipe")
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/equipe$/)

  // Invitation : e-mail, nom, rôle (Éditeur par défaut).
  const before = await receivedIds(editor.email)
  await page.getByRole("button", { name: texts.team.invite }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(texts.team.email).fill(editor.email)
  await dialog.getByLabel(texts.team.name).fill(editor.fullName)
  await expect(dialog.getByLabel(texts.team.role)).toContainText(
    texts.roles.editor
  )
  await dialog.getByRole("button", { name: texts.team.sendInvitation }).click()
  await expect(page.getByText(texts.team.invited(editor.email))).toBeVisible()

  const editorRow = page.getByRole("row").filter({ hasText: editor.email })
  await expect(editorRow).toContainText(texts.team.status.invited)
  await expect(editorRow).toContainText(texts.roles.editor)

  // L'éditeur ouvre le lien reçu, dans son propre navigateur.
  const invitation = await waitForNewEmail(editor.email, before)
  const editorContext = await browser.newContext()
  const editorPage = await editorContext.newPage()
  await editorPage.goto(invitationPath(invitation))
  // Rien n'est accepté avant le clic (les antivirus ouvrent les liens des e-mails).
  await editorPage
    .getByRole("button", { name: texts.invitation.accept })
    .click()
  await expect(editorPage).toHaveURL(/\/double-verification$/)
  await verifySecondFactor(editorPage, editor)

  // L'éditeur arrive sur l'accueil, sans Équipe ni Paramètres dans le menu.
  await expect(editorPage).toHaveURL(/\/$/)
  await expect(
    editorPage.getByRole("heading", { name: texts.sections.home.title })
  ).toBeVisible()
  const editorMenu = bottomMenu(editorPage)
  await expect(
    editorMenu.getByRole("link", { name: texts.sections.account.title })
  ).toBeVisible()
  await expect(
    editorMenu.getByRole("link", { name: texts.sections.team.title })
  ).toHaveCount(0)
  await expect(
    editorMenu.getByRole("link", { name: texts.sections.settings.title })
  ).toHaveCount(0)

  // Et s'il tape l'adresse : « Réservé aux admins ».
  await editorPage.goto("/equipe")
  await expect(
    editorPage.getByRole("heading", { name: texts.adminOnly.title })
  ).toBeVisible()

  // La fonction « equipe » refuse elle-même un éditeur, même après la double vérification.
  const editorProfile = await readProfile(editor.email)
  expect(editorProfile?.role).toBe("editor")
  const editorToken = await accessToken(editorPage)
  for (const body of [
    { action: "set_role", user_id: editorProfile!.id, role: "admin" },
    { action: "list" },
  ]) {
    expect(await callTeamFunction(editorToken, body)).toEqual({
      status: 403,
      code: "reserve_aux_admins",
    })
  }
  expect((await readProfile(editor.email))?.role).toBe("editor")

  // Côté admin : l'invitation est acceptée et la double vérification configurée.
  await page.reload()
  await expect(editorRow).toContainText(texts.team.status.active)
  await expect(editorRow).toContainText(texts.team.mfaOn)

  // Retrait de l'éditeur, après confirmation.
  await editorRow
    .getByRole("button", { name: texts.team.actions.open(editor.fullName) })
    .click()
  await page.getByRole("menuitem", { name: texts.team.actions.remove }).click()
  const confirmation = page.getByRole("alertdialog")
  await expect(confirmation).toContainText(
    texts.team.confirmRemove.description(editor.fullName)
  )
  await confirmation
    .getByRole("button", { name: texts.team.confirmRemove.confirm })
    .click()
  await expect(page.getByText(texts.team.done.removed)).toBeVisible()
  await expect(editorRow).toHaveCount(0)

  // Sans fiche, l'éditeur retiré est déconnecté à son prochain passage.
  await editorPage.goto("/")
  await expect(editorPage).toHaveURL(/\/connexion$/)
  await editorContext.close()
})

test("un admin ne change pas son propre rôle, et un admin invité ne compte pas encore", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")
  const otherAdmin = team.track({
    email: uniqueEmail("admin-invite"),
    fullName: "Paul Pending",
  })

  await page.goto("/equipe")
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/equipe$/)

  // Sur sa propre ligne : aucune action (ni « Passer éditeur », ni « Retirer »).
  const myRow = page.getByRole("row").filter({ hasText: admin.email })
  await expect(myRow).toContainText(texts.team.you)
  await expect(myRow.getByRole("button")).toHaveCount(0)

  // La fonction refuse aussi, si on l'appelle directement.
  const me = await readProfile(admin.email)
  expect(
    await callTeamFunction(await accessToken(page), {
      action: "set_role",
      user_id: me!.id,
      role: "editor",
    })
  ).toEqual({ status: 403, code: "soi_meme" })
  expect((await readProfile(admin.email))?.role).toBe("admin")

  // Invitation d'un admin : son rôle est enregistré dès l'invitation.
  await page.getByRole("button", { name: texts.team.invite }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel(texts.team.email).fill(otherAdmin.email)
  await dialog.getByLabel(texts.team.name).fill(otherAdmin.fullName)
  await dialog.getByLabel(texts.team.role).click()
  await page.getByRole("option", { name: texts.roles.admin }).click()
  await dialog.getByRole("button", { name: texts.team.sendInvitation }).click()
  await expect(
    page.getByText(texts.team.invited(otherAdmin.email))
  ).toBeVisible()

  const otherRow = page.getByRole("row").filter({ hasText: otherAdmin.email })
  await expect(otherRow).toContainText(texts.roles.admin)
  await expect(otherRow).toContainText(texts.team.status.invited)
  expect((await readProfile(otherAdmin.email))?.role).toBe("admin")

  // Tant qu'il n'a pas accepté, il ne compte pas : le conseil reste affiché (si la base locale
  // n'a pas d'autre admin que ceux des tests).
  if ((await countOtherAdmins()) === 0) {
    await expect(page.getByText(texts.team.singleAdmin)).toBeVisible()
  }
})

test("la fonction « equipe » refuse un admin avant la double vérification, et un visiteur", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")

  // Sans session : 401.
  expect(await callTeamFunction(null, { action: "list" })).toEqual({
    status: 401,
    code: "non_connecte",
  })

  // Admin qui n'a saisi que le code reçu par e-mail (session aal1) : 403.
  await page.goto("/connexion")
  await signInWithEmailCode(page, admin)
  const me = await readProfile(admin.email)
  const token = await accessToken(page)
  for (const body of [
    { action: "list" },
    { action: "set_role", user_id: me!.id, role: "editor" },
  ]) {
    expect(await callTeamFunction(token, body)).toEqual({
      status: 403,
      code: "reserve_aux_admins",
    })
  }
  expect((await readProfile(admin.email))?.role).toBe("admin")
})

// Parcours de connexion : code reçu par e-mail, double vérification, déconnexion.

import { texts } from "../src/texts.ts"
import { uniqueEmail } from "./support/accounts.ts"
import { receivedIds, signInCode, waitForNewEmail } from "./support/mailpit.ts"
import {
  accountMenuButton,
  headerMenu,
  expect,
  openAccountPage,
  secondFactorHeading,
  signIn,
  test,
} from "./support/fixtures.ts"

test("un admin se connecte avec les deux codes, se déconnecte, puis revient", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")

  // Une page de l'admin sans session mène à la connexion.
  await page.goto("/")
  await expect(page).toHaveURL(/\/connexion$/)
  await expect(
    page.getByRole("navigation", { name: texts.nav.label })
  ).toHaveCount(0)

  // Première connexion : code reçu par e-mail, puis configuration de l'app du téléphone.
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole("heading", { name: texts.sections.home.title })
  ).toBeVisible()
  await expect(
    headerMenu(page).getByRole("link", { name: texts.sections.team.title })
  ).toBeVisible()

  // Mon compte : la double vérification est configurée.
  await openAccountPage(page)
  await expect(
    page.getByText(texts.account.mfa.active, { exact: true })
  ).toBeVisible()

  // Déconnexion, par le menu de l'avatar : retour à la connexion, et la session est bien fermée.
  await accountMenuButton(page).click()
  await page.getByRole("menuitem", { name: texts.common.signOut }).click()
  await expect(page).toHaveURL(/\/connexion$/)
  await page.goto("/equipe")
  await expect(page).toHaveURL(/\/connexion$/)

  // Reconnexion : cette fois, le code de l'app suffit, et la page demandée s'ouvre.
  await signIn(page, admin)
  await expect(page).toHaveURL(/\/equipe$/)
  await expect(
    page.getByRole("heading", { name: texts.sections.team.title })
  ).toBeVisible()
})

test("une adresse inconnue reçoit le même message, sans e-mail", async ({
  page,
}) => {
  const stranger = uniqueEmail("inconnu")

  await page.goto("/connexion")
  await page.getByLabel(texts.signIn.email).fill(stranger)
  await page.getByRole("button", { name: texts.signIn.sendCode }).click()

  // Même message que pour un membre : l'interface ne dit pas qui fait partie de l'équipe.
  await expect(page.getByText(texts.signIn.codeSent(stranger))).toBeVisible()
  await page.waitForTimeout(1_000)
  expect((await receivedIds(stranger)).size).toBe(0)
})

test("un code faux est refusé", async ({ page, team }) => {
  const admin = await team.createAdmin("Bruno Admin")

  await page.goto("/connexion")
  await page.getByLabel(texts.signIn.email).fill(admin.email)
  await page.getByRole("button", { name: texts.signIn.sendCode }).click()
  await expect(page.getByText(texts.signIn.codeSent(admin.email))).toBeVisible()

  // Le 6e chiffre lance la connexion, sans clic.
  await page.getByLabel(texts.signIn.code).fill("000000")
  await expect(page.getByText(texts.signIn.wrongCode)).toBeVisible()
  await expect(page).toHaveURL(/\/connexion$/)
})

test("après un rechargement, la connexion reprend à l'étape du code", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Chloé Admin")

  await page.goto("/connexion")
  await page.getByLabel(texts.signIn.email).fill(admin.email)
  const before = await receivedIds(admin.email)
  await page.getByRole("button", { name: texts.signIn.sendCode }).click()
  await expect(page.getByText(texts.signIn.codeSent(admin.email))).toBeVisible()
  const email = await waitForNewEmail(admin.email, before)

  // La page est rechargée pendant qu'on cherche l'e-mail : pas de nouvelle demande de code
  // (en ligne, Supabase la refuserait pendant une minute), le code reçu reste utilisable.
  await page.reload()
  await expect(
    page.getByText(texts.signIn.codeStillValid(admin.email))
  ).toBeVisible()
  await page.getByLabel(texts.signIn.code).fill(signInCode(email))
  await expect(secondFactorHeading(page)).toBeVisible()
  expect((await receivedIds(admin.email)).size).toBe(before.size + 1)
})

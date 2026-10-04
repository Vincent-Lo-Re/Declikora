// Le menu de gauche, toujours ouvert : le membre en bas (avatar, nom, rôle), qui ouvre le menu du
// compte.

import { texts } from "../src/texts.ts"
import { accountMenuButton, expect, signIn, test } from "./support/fixtures.ts"

test("le membre en bas du menu : nom et rôle, son menu ; le menu ne se replie pas", async ({
  page,
  team,
}) => {
  const admin = await team.createAdmin("Alice Admin")
  await page.goto("/")
  await signIn(page, admin)

  // Le nom et, dessous, le rôle ; l'e-mail est dans le menu.
  const member = accountMenuButton(page)
  await expect(member).toContainText("Alice Admin")
  await expect(member).toContainText(texts.roles.admin)
  await expect(member).not.toContainText(admin.email)
  await member.getByText("Alice Admin").click()
  const menu = page.getByRole("menu")
  await expect(menu).toContainText(admin.email)
  await page.keyboard.press("Escape")
  await expect(menu).toHaveCount(0)

  // Ni bouton ni raccourci pour le replier : il garde sa largeur et ses noms.
  const column = page.locator('[data-slot="sidebar-inner"]')
  const width = (await column.boundingBox())?.width
  await page.keyboard.press("ControlOrMeta+b")
  await page.getByText(texts.nav.groups.contents).click()
  expect((await column.boundingBox())?.width).toBe(width)
  await expect(
    page.getByRole("link", { name: texts.sections.blog.title })
  ).toContainText(texts.sections.blog.title)
})

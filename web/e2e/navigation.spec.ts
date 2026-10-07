// Une navigation sans à-coups (ADMIN § 7, étape 2) : chaque page est préparée avant d'être
// montrée. Le contrôle des lectures non préparées (VITE_PREPARATION_CHECK, playwright.config.ts)
// écrit dans la console la lecture qu'une page fait en arrivant sans l'avoir préparée : ce
// parcours fait le tour de l'admin et n'en accepte aucune. Une nouvelle page s'ajoute à ce tour
// (docs/BONNES-PRATIQUES.md, § 2).

import type { Page } from "@playwright/test"

import { texts } from "../src/texts.ts"
import {
  createFromDialog,
  createBlankPage,
  expect,
  signIn,
  test,
} from "./support/fixtures.ts"

const sections = texts.sections

/** Ouvre une section par le menu (en haut, ou en bas pour Équipe et Paramètres). */
async function menu(page: Page, title: string) {
  await page.getByRole("link", { name: title, exact: true }).first().click()
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible()
}

/** Revient d'un éditeur à sa liste (« ← Le Fil »). */
async function back(page: Page, section: string) {
  await page.getByRole("link", { name: texts.editor.back(section) }).click()
  await expect(
    page.getByRole("heading", { level: 1, name: section })
  ).toBeVisible()
}

test("le tour de l'admin : chaque page arrive préparée, sans lecture oubliée", async ({
  page,
  team,
}) => {
  const forgotten: string[] = []
  page.on("console", (message) => {
    if (message.text().startsWith("Lecture non préparée")) {
      forgotten.push(message.text())
    }
  })
  const admin = await team.createAdmin("Alice Admin")
  await page.goto("/")
  await signIn(page, admin)
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

  // Un article et une page, pour ouvrir leurs éditeurs depuis les listes.
  await menu(page, sections.blog.title)
  const article = `Tour de l'admin ${id}`
  await createFromDialog(page, "article", article)
  await back(page, sections.blog.title)
  await menu(page, sections.pages.title)
  await createBlankPage(page)
  await back(page, sections.pages.title)

  // Toutes les sections du menu.
  for (const section of [
    sections.home,
    sections.blog,
    sections.podcasts,
    sections.pages,
    sections.templates,
    sections.media,
    sections.trash,
    sections.team,
    sections.settings,
  ]) {
    await menu(page, section.title)
  }

  // Les catégories, Mon compte.
  await menu(page, sections.blog.title)
  await page
    .getByRole("link", { name: texts.contentList.manageCategories })
    .click()
  await expect(page).toHaveURL(/\/blog\/categories$/)
  await menu(page, sections.account.title)

  // L'éditeur depuis sa liste (survolé d'abord, comme avec la souris), deux fois.
  await menu(page, sections.blog.title)
  const row = page.getByRole("link", { name: article })
  await row.hover()
  await row.click()
  await expect(page.getByLabel(texts.editor.title.label)).toHaveValue(article)
  await back(page, sections.blog.title)
  await page.getByRole("link", { name: article }).click()
  await expect(page.getByLabel(texts.editor.title.label)).toHaveValue(article)

  // Retour du navigateur : la liste, sans lecture oubliée non plus.
  await page.goBack()
  await expect(
    page.getByRole("heading", { level: 1, name: sections.blog.title })
  ).toBeVisible()

  expect(forgotten).toEqual([])
})

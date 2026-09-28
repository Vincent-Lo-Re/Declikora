// Outils communs aux tests de parcours : comptes de test (supprimés à la fin de chaque test)
// et connexion par l'interface (code reçu par e-mail, puis double vérification).

import { expect, test as base, type Page } from "@playwright/test"

import { texts } from "../../src/texts.ts"
import {
  createAdmin,
  createMember,
  deleteAccounts,
  type Account,
} from "./accounts.ts"
import {
  deleteEmails,
  receivedIds,
  signInCode,
  waitForNewEmail,
} from "./mailpit.ts"
import { totpCode } from "./totp.ts"

type Team = {
  /** Crée un admin (compte confirmé, sans double vérification). */
  createAdmin: (fullName: string) => Promise<Account>
  /** Crée un éditeur (compte confirmé, sans double vérification). */
  createEditor: (fullName: string) => Promise<Account>
  /** Retient une adresse créée par le test (invitation), pour la supprimer à la fin. */
  track: (account: Account) => Account
}

export const test = base.extend<{ team: Team }>({
  team: async ({}, use) => {
    const accounts: Account[] = []
    await use({
      createAdmin: async (fullName) => {
        const account = await createAdmin(fullName)
        accounts.push(account)
        return account
      },
      createEditor: async (fullName) => {
        const account = await createMember(fullName, "editor")
        accounts.push(account)
        return account
      },
      track: (account) => {
        accounts.push(account)
        return account
      },
    })
    // Nettoyage, même si le test a échoué.
    const emails = accounts.map((account) => account.email)
    await deleteAccounts(emails)
    await deleteEmails(emails)
  },
})

export { expect }

/** Remplit un champ de code à 6 chiffres et valide. */
async function submitCode(
  page: Page,
  label: string,
  code: string,
  submit: string
) {
  await page.getByLabel(label).fill(code)
  await page.getByRole("button", { name: submit }).click()
}

/**
 * Se connecte par l'interface depuis la page de connexion déjà ouverte : e-mail, code reçu,
 * puis double vérification (configurée la première fois, avec la clé affichée).
 */
export async function signIn(page: Page, account: Account) {
  await signInWithEmailCode(page, account)
  await verifySecondFactor(page, account)
}

/** Première moitié de la connexion : e-mail et code reçu (session « aal1 »). */
export async function signInWithEmailCode(page: Page, account: Account) {
  await expect(page).toHaveURL(/\/connexion$/)
  await page.getByLabel(texts.signIn.email).fill(account.email)
  const before = await receivedIds(account.email)
  await page.getByRole("button", { name: texts.signIn.sendCode }).click()
  await expect(
    page.getByText(texts.signIn.codeSent(account.email))
  ).toBeVisible()

  const email = await waitForNewEmail(account.email, before)
  await submitCode(
    page,
    texts.signIn.code,
    signInCode(email),
    texts.signIn.submitCode
  )

  await expect(page).toHaveURL(/\/double-verification$/)
}

/** Double vérification : configuration de l'app la première fois, sinon son code. */
export async function verifySecondFactor(page: Page, account: Account) {
  if (account.totpSecret === undefined) {
    await expect(
      page.getByRole("heading", { name: texts.mfa.setupTitle })
    ).toBeVisible()
    await expect(
      page.getByRole("img", { name: texts.mfa.qrCode })
    ).toBeVisible()
    // La clé à recopier dans l'app, pour qui n'a pas de caméra.
    const secret = (await page.locator("code").textContent())?.trim()
    if (!secret) throw new Error("Clé de double vérification introuvable")
    account.totpSecret = secret
  } else {
    await expect(
      page.getByRole("heading", { name: texts.mfa.verifyTitle })
    ).toBeVisible()
  }
  await submitCode(
    page,
    texts.mfa.code,
    await totpCode(account.totpSecret),
    texts.mfa.submit
  )
}

/** Le menu du bas (Équipe, Paramètres, Mon compte). */
export function bottomMenu(page: Page) {
  return page.getByRole("navigation", { name: texts.nav.footerLabel })
}

// Avant les tests : supprime les comptes de test laissés par une série interrompue.

import { deleteAccounts } from "./support/accounts.ts"

export default async function globalSetup() {
  await deleteAccounts("all")
}

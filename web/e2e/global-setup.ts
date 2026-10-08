// Avant les tests : supprime les comptes de test laissés par une série interrompue, et met
// l'admin en français.

import { deleteAccounts, setFrenchAdmin } from "./support/accounts.ts"

export default async function globalSetup() {
  await deleteAccounts("all")
  await setFrenchAdmin()
}

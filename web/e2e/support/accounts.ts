// Comptes de test : création avec la clé secrète LOCALE, puis suppression.

import { createClient } from "@supabase/supabase-js"
import postgres from "postgres"

import { localSupabase } from "./local-supabase.ts"

// Toutes les adresses de test finissent ainsi : on les reconnaît au nettoyage.
export const testDomain = "e2e.exemple.test"

export type Account = {
  email: string
  fullName: string
  // Clé de l'app du téléphone, connue une fois la double vérification configurée.
  totpSecret?: string
}

/** Une adresse unique, pour que les tests restent indépendants et rejouables. */
export function uniqueEmail(label: string): string {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${label}-${id}@${testDomain}`
}

function adminClient() {
  const { apiUrl, secretKey } = localSupabase()
  return createClient(apiUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Crée un admin avec la clé secrète : compte confirmé, rôle dans app_metadata (la base crée sa
 * fiche), sans double vérification. Il la configurera à sa première connexion.
 */
export async function createAdmin(fullName: string): Promise<Account> {
  const email = uniqueEmail("admin")
  const { error } = await adminClient().auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  })
  if (error) throw error
  return { email, fullName }
}

function database() {
  return postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
}

/**
 * Supprime des comptes de test (adresses exactes, ou toutes celles du domaine de test).
 *
 * La base refuse de supprimer le dernier admin : c'est voulu, et testé. Pour les comptes de
 * test seulement, le nettoyage passe outre, dans une transaction : les fiches sont supprimées
 * sans les déclencheurs (session_replication_role = replica), puis les comptes normalement.
 */
export async function deleteAccounts(emails: string[] | "all") {
  if (emails !== "all" && emails.length === 0) return
  const sql = database()
  try {
    const where =
      emails === "all"
        ? sql`email like ${`%@${testDomain}`}`
        : sql`email = any(${emails})`
    await sql.begin(async (tx) => {
      await tx`set local session_replication_role = replica`
      await tx`delete from public.profiles where ${where}`
      await tx`set local session_replication_role = origin`
      await tx`delete from auth.users where ${where}`
    })
  } finally {
    await sql.end()
  }
}

/** Rôle et identifiant d'un membre, lus dans la base (null s'il n'a pas de fiche). */
export async function readProfile(
  email: string
): Promise<{ id: string; role: "admin" | "editor" } | null> {
  const sql = database()
  try {
    const [row] = await sql<{ id: string; role: "admin" | "editor" }[]>`
      select id, role from public.profiles where email = ${email}`
    return row ?? null
  } finally {
    await sql.end()
  }
}

/** Nombre d'admins qui ne sont pas des comptes de test (base locale de développement). */
export async function countOtherAdmins(): Promise<number> {
  const sql = database()
  try {
    const [row] = await sql<{ count: number }[]>`
      select count(*)::int as count from public.profiles
      where role = 'admin' and email not like ${`%@${testDomain}`}`
    return row.count
  } finally {
    await sql.end()
  }
}

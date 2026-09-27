// Boîte aux lettres locale (Mailpit) : Supabase y dépose tous les e-mails envoyés en local.

import { localSupabase } from "./local-supabase.ts"

type MessageSummary = { ID: string; Created: string }
type Message = { ID: string; Subject: string; Text: string; HTML: string }

function api(path: string) {
  return new URL(`/api/v1/${path}`, localSupabase().mailpitUrl)
}

function searchQuery(address: string) {
  return `to:"${address}"`
}

async function request<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Mailpit : ${response.status} sur ${url.pathname}`)
  }
  return (await response.json()) as T
}

/** Identifiants des e-mails déjà reçus par cette adresse. */
export async function receivedIds(address: string): Promise<Set<string>> {
  const url = api("search")
  url.searchParams.set("query", searchQuery(address))
  const { messages } = await request<{ messages: MessageSummary[] }>(url)
  return new Set(messages.map((message) => message.ID))
}

/**
 * Attend un nouvel e-mail pour cette adresse (absent de « before ») et le renvoie.
 * On compare des identifiants plutôt que des heures : aucun souci d'horloge.
 */
export async function waitForNewEmail(
  address: string,
  before: Set<string>,
  timeout = 15_000
): Promise<Message> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const url = api("search")
    url.searchParams.set("query", searchQuery(address))
    const { messages } = await request<{ messages: MessageSummary[] }>(url)
    const fresh = messages.find((message) => !before.has(message.ID))
    if (fresh) return request<Message>(api(`message/${fresh.ID}`))
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Aucun e-mail reçu pour ${address}`)
}

/** Le code à 6 chiffres de l'e-mail de connexion. */
export function signInCode(message: Message): string {
  const code = /\b(\d{6})\b/.exec(message.Text)?.[1]
  if (!code) throw new Error(`Pas de code dans « ${message.Subject} »`)
  return code
}

/**
 * Le lien de l'e-mail d'invitation, sans son origine. Il pointe vers site_url (le serveur de
 * dev, http://127.0.0.1:5173) ; les tests ouvrent le même chemin sur leur propre serveur.
 */
export function invitationPath(message: Message): string {
  const href = /href="([^"]*\/invitation\?[^"]*)"/.exec(message.HTML)?.[1]
  if (!href)
    throw new Error(`Pas de lien d'invitation dans « ${message.Subject} »`)
  const url = new URL(href.replaceAll("&amp;", "&"))
  return url.pathname + url.search
}

/** Supprime les e-mails reçus par ces adresses. */
export async function deleteEmails(addresses: string[]) {
  for (const address of addresses) {
    const url = api("search")
    url.searchParams.set("query", searchQuery(address))
    const response = await fetch(url, { method: "DELETE" })
    if (!response.ok) {
      throw new Error(`Mailpit : ${response.status} à la suppression`)
    }
  }
}

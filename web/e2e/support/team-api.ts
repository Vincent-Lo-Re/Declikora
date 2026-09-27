// Appels directs à la fonction serveur « equipe », sans passer par l'interface : ils vérifient
// que la fonction elle-même refuse ce que l'interface se contente de cacher.

import type { Page } from "@playwright/test"

import { localSupabase } from "./local-supabase.ts"

/** Le jeton de la session ouverte dans cette page (gardé par supabase-js). */
export async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index) ?? ""
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        const session = JSON.parse(localStorage.getItem(key) ?? "null") as {
          access_token?: string
        } | null
        return session?.access_token ?? null
      }
    }
    return null
  })
  if (!token) throw new Error("Aucune session dans cette page")
  return token
}

/** Appelle la fonction « equipe » avec ce jeton (ou sans session). */
export async function callTeamFunction(
  token: string | null,
  body: object
): Promise<{ status: number; code: string | undefined }> {
  const { apiUrl, publishableKey } = localSupabase()
  const response = await fetch(`${apiUrl}/functions/v1/equipe`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = (await response.json().catch(() => null)) as {
    error?: { code?: string }
  } | null
  return { status: response.status, code: json?.error?.code }
}

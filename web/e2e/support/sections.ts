// Sections (étape 7, partie 7a) : ce que voit l'app (app_feed, app_categories, comme un
// anonyme) et nettoyage des catégories créées par les tests (elles n'ont pas d'auteur).

import postgres from "postgres"

import { localSupabase } from "./local-supabase.ts"

function database() {
  return postgres(localSupabase().dbUrl, { max: 1, onnotice: () => {} })
}

async function appRpc<T>(name: string, body: object): Promise<T> {
  const { apiUrl, publishableKey } = localSupabase()
  const response = await fetch(`${apiUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: publishableKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`${name} : ${response.status} ${await response.text()}`)
  }
  return (await response.json()) as T
}

/** Un élément de la liste de l'app (app_feed). */
type FeedItem = {
  id: string
  kind: string
  title: string
  summary: string | null
  cover: { mediaId: string } | null
  // La vignette seulement : jamais les fichiers des blocs ni l'audio.
  files: Record<
    string,
    { kind: string; mime: string; path: string; durationS: number | null }
  >
  categoryIds: string[]
  durationS: number | null
  locked: boolean
}

/** Les articles (blog) ou les épisodes (podcasts) en ligne, comme l'app les lit. */
export async function appFeed(
  section: "blog" | "podcasts",
  categoryId: string | null = null
): Promise<FeedItem[]> {
  const feed = await appRpc<{ items: FeedItem[] }>("app_feed", {
    section,
    category_id: categoryId,
    lim: 50,
  })
  return feed.items
}

/** Les catégories d'une section, dans l'ordre de l'app. */
export function appCategories(
  section: "blog" | "podcasts"
): Promise<{ id: string; name: string }[]> {
  return appRpc("app_categories", { section })
}

/** Supprime les catégories dont le nom contient ce repère (fin d'un test). */
export async function deleteCategoriesMarked(marker: string) {
  const sql = database()
  try {
    await sql`delete from public.categories where name like ${`%${marker}%`}`
  } finally {
    await sql.end()
  }
}
